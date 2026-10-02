// coleta.js — camada C1 (Coleta): ficha de contexto (CP-03), formulário de
// itens com as âncoras como opções de resposta (CP-01, ADR-06), validador
// de completude (CP-02) e guia de aplicação embutido (CP-14).

import { esc, dataBR, PORTES, num } from './ui.js';
import { ESTADOS, contarRespondidas, hojeISO } from './estado.js';
import { itensPendentes } from './nucleo.js';
import { esforcoGestor } from './validacao.js';

// ------------------------------------------------------------ CP-03 — ficha
export function renderFicha(el, { modelo, app, sugestao, aoSalvar, aoCancelar }) {
  const base = app ? { ...app.empresa, respondente: app.respondente, data: app.data } : (sugestao || {});
  const bloqueada = app?.estado === ESTADOS.ARQUIVADA;
  el.innerHTML = `
    <section class="cartao estreito">
      <p class="etapa-rotulo">Etapa 1 de 4 · cerca de 2 a 3 minutos</p>
      <h1>Ficha de contexto da empresa</h1>
      <p class="lead">Estes dados não entram no cálculo. Servem para identificar o diagnóstico e permitir comparar reaplicações. Ficam apenas neste navegador.</p>
      ${app?.anterior ? '<p class="aviso aviso-info">Esta é uma <strong>reaplicação</strong>: a ficha foi preenchida com os dados da aplicação anterior. Confira e atualize o que mudou.</p>' : ''}
      <form id="form-ficha" class="formulario" novalidate>
        <label>Nome ou identificador da empresa
          <input name="identificador" required maxlength="120" autocomplete="organization" value="${esc(base.identificador)}" placeholder="Ex.: Metalmecânica Aurora">
        </label>
        <label>Setor de atuação
          <input name="setor" required maxlength="120" value="${esc(base.setor)}" placeholder="Ex.: Indústria metalmecânica">
        </label>
        <div class="linha-2">
          <label>Porte
            <select name="porte" required>
              <option value="">Selecione…</option>
              ${PORTES.map(p => `<option value="${esc(p.valor)}" ${base.porte === p.valor ? 'selected' : ''}>${esc(p.rotulo)}</option>`).join('')}
            </select>
          </label>
          <label>Número de funcionários
            <input name="funcionarios" type="number" min="1" step="1" required inputmode="numeric" value="${esc(base.funcionarios)}">
          </label>
        </div>
        <div class="linha-2">
          <label>Responsável pelo preenchimento
            <input name="respondente" required maxlength="120" autocomplete="name" value="${esc(base.respondente)}" placeholder="Nome e função">
          </label>
          <label>Data da aplicação
            <input name="data" type="date" required value="${esc(base.data || hojeISO())}">
          </label>
        </div>
        <p class="nota">Versão do modelo que será fixada nesta aplicação: <strong>${esc(app?.versaoModelo || modelo.versao_modelo)}</strong>. Diagnósticos só são comparáveis se produzidos sob a mesma versão.</p>
        <div class="erros-form" aria-live="polite"></div>
        <div class="acoes">
          ${aoCancelar ? '<button type="button" class="btn btn-sec" data-acao="cancelar">Voltar</button>' : ''}
          <button type="submit" class="btn btn-pri" ${bloqueada ? 'disabled' : ''}>${app ? 'Salvar e ir ao questionário' : 'Iniciar aplicação'}</button>
        </div>
      </form>
    </section>`;

  const form = el.querySelector('#form-ficha');
  el.querySelector('[data-acao="cancelar"]')?.addEventListener('click', aoCancelar);
  form.addEventListener('submit', ev => {
    ev.preventDefault();
    const dados = Object.fromEntries(new FormData(form));
    dados.identificador = dados.identificador.trim();
    dados.setor = dados.setor.trim();
    dados.respondente = dados.respondente.trim();
    dados.funcionarios = Number(dados.funcionarios);
    const erros = [];
    if (!dados.identificador) erros.push('Informe o nome ou identificador da empresa.');
    if (!dados.setor) erros.push('Informe o setor.');
    if (!PORTES.some(p => p.valor === dados.porte)) erros.push('Selecione o porte.');
    if (!Number.isInteger(dados.funcionarios) || dados.funcionarios <= 0) erros.push('O número de funcionários deve ser um inteiro maior que zero.');
    if (!dados.respondente) erros.push('Informe o responsável pelo preenchimento.');
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dados.data || '')) erros.push('Informe a data da aplicação.');
    const caixa = form.querySelector('.erros-form');
    if (erros.length) {
      caixa.innerHTML = `<div class="aviso aviso-erro" role="alert"><ul>${erros.map(e => `<li>${esc(e)}</li>`).join('')}</ul></div>`;
      return;
    }
    caixa.innerHTML = '';
    aoSalvar(dados);
  });
}

// ------------------------------------------------------------ blocos do questionário
// Os itens são respondidos em três blocos (Fig. 5 / Tabela 14): D0+D1, D2+D3, D4+D5.
export function blocosDoModelo(modelo) {
  const etapas = (modelo.tempos_processo || []).filter(e => Array.isArray(e.dimensoes));
  if (etapas.length) {
    return etapas.map((e, k) => ({ indice: k, titulo: e.atividade, dimensoes: e.dimensoes, min: e.min, max: e.max }));
  }
  const dims = modelo.dimensoes.map(d => d.codigo);
  const blocos = [];
  for (let k = 0; k < dims.length; k += 2) blocos.push({ indice: blocos.length, titulo: `Responder os itens de ${dims.slice(k, k + 2).join(' e ')}`, dimensoes: dims.slice(k, k + 2) });
  return blocos;
}

// ------------------------------------------------------------ CP-01 e CP-02 — formulário
export function renderQuestionario(el, { modelo, app, blocoInicial = 0, aoResponder, aoGerar, aoEditarFicha }) {
  const blocos = blocosDoModelo(modelo);
  const total = modelo.itens.length;
  const somenteLeitura = app.estado === ESTADOS.ARQUIVADA;
  let bloco = Math.min(Math.max(blocoInicial, 0), blocos.length - 1);

  el.innerHTML = `
    <section class="questionario">
      <header class="cartao cabecalho-quest">
        <div>
          <p class="etapa-rotulo">Etapa 2 de 4 · cerca de 13 a 18 minutos</p>
          <h1>Questionário de prontidão</h1>
          <p class="lead">Para cada afirmação, escolha a descrição que <strong>corresponde ao que a empresa faz hoje</strong> — não ao que pretende fazer. Se ficar entre duas, escolha a mais baixa.</p>
          <p class="meta-app">${esc(app.empresa.identificador)} · ${dataBR(app.data)} · modelo ${esc(app.versaoModelo)} · <span class="selo selo-estado" data-estado>${esc(app.estado)}</span>
            ${somenteLeitura ? '' : ' · <button type="button" class="link" data-acao="ficha">editar ficha</button>'}</p>
        </div>
      </header>
      ${somenteLeitura ? '<p class="aviso aviso-info">Esta aplicação está <strong>Arquivada</strong>: as respostas ficam somente para consulta. Para registrar a situação atual, faça uma reaplicação a partir do diagnóstico.</p>' : ''}
      <nav class="abas-blocos" role="tablist" aria-label="Blocos do questionário">
        ${blocos.map(b => `<button type="button" role="tab" class="aba-bloco" data-bloco="${b.indice}" aria-selected="false">
            <span class="aba-num">${b.indice + 1}</span>
            <span class="aba-txt">${b.dimensoes.map(d => esc(d)).join(' + ')}<small data-contagem-bloco="${b.indice}"></small></span>
          </button>`).join('')}
      </nav>
      <div class="corpo-bloco" data-corpo></div>
      <footer class="barra-progresso cartao" aria-live="polite">
        <div class="progresso">
          <div class="progresso-texto"><strong data-respondidas></strong> de ${total} itens respondidos</div>
          <div class="trilho" aria-hidden="true"><div class="trilho-cheio" data-trilho></div></div>
          <div class="pendentes" data-pendentes></div>
        </div>
        <div class="acoes">
          <button type="button" class="btn btn-sec" data-acao="anterior">← Bloco anterior</button>
          <button type="button" class="btn btn-sec" data-acao="proximo">Próximo bloco →</button>
          <button type="button" class="btn btn-pri" data-acao="gerar">Gerar diagnóstico</button>
        </div>
      </footer>
    </section>`;

  const corpo = el.querySelector('[data-corpo]');

  function cartaoItem(item) {
    const valor = app.respostas[item.codigo];
    return `
      <fieldset class="item ${valor ? 'respondido' : ''}" id="item-${esc(item.codigo)}" data-item="${esc(item.codigo)}">
        <legend><span class="cod">${esc(item.codigo)}</span> ${esc(item.assertiva)}</legend>
        <div class="opcoes">
          ${item.ancoras.map((ancora, k) => {
            const v = k + 1;
            const desc = modelo.escala[k]?.descritor ?? '';
            return `<label class="opcao">
              <input type="radio" name="${esc(item.codigo)}" value="${v}" ${valor === v ? 'checked' : ''} ${somenteLeitura ? 'disabled' : ''}>
              <span class="opcao-cab"><span class="opcao-val">${v}</span><span class="opcao-desc">${esc(desc)}</span></span>
              <span class="opcao-txt">${esc(ancora)}</span>
            </label>`;
          }).join('')}
        </div>
      </fieldset>`;
  }

  function desenharBloco() {
    const b = blocos[bloco];
    corpo.innerHTML = b.dimensoes.map(dc => {
      const d = modelo.dimensoes.find(x => x.codigo === dc);
      const itens = modelo.itens.filter(i => i.dimensao === dc);
      return `<section class="dimensao-bloco">
        <header class="dim-cab">
          <h2><span class="cod-dim">${esc(d.codigo)}</span> ${esc(d.nome)} ${d.critica ? '<span class="selo selo-critica" title="Dimensão crítica: limita o nível global (teto de gargalo)">crítica</span>' : ''}</h2>
          <p>${esc(d.definicao)}</p>
        </header>
        ${itens.map(cartaoItem).join('')}
      </section>`;
    }).join('');
    el.querySelectorAll('.aba-bloco').forEach(a => {
      const ativo = Number(a.dataset.bloco) === bloco;
      a.classList.toggle('ativa', ativo);
      a.setAttribute('aria-selected', String(ativo));
    });
    el.querySelector('[data-acao="anterior"]').disabled = bloco === 0;
    el.querySelector('[data-acao="proximo"]').disabled = bloco === blocos.length - 1;
  }

  function atualizarProgresso() {
    const respondidas = contarRespondidas(app);
    const pendentes = itensPendentes(app.respostas, modelo);
    el.querySelector('[data-respondidas]').textContent = respondidas;
    el.querySelector('[data-trilho]').style.width = `${(respondidas / total) * 100}%`;
    el.querySelector('[data-estado]').textContent = app.estado;
    blocos.forEach(b => {
      const itens = modelo.itens.filter(i => b.dimensoes.includes(i.dimensao));
      const feitos = itens.filter(i => app.respostas[i.codigo]).length;
      const alvo = el.querySelector(`[data-contagem-bloco="${b.indice}"]`);
      alvo.textContent = ` ${feitos}/${itens.length}`;
      alvo.closest('.aba-bloco').classList.toggle('completo', feitos === itens.length);
    });
    // CP-02 — impede o cálculo enquanto houver item sem resposta e indica quais faltam
    const gerar = el.querySelector('[data-acao="gerar"]');
    gerar.disabled = pendentes.length > 0 || somenteLeitura;
    gerar.textContent = app.diagnostico ? 'Ver diagnóstico' : 'Gerar diagnóstico';
    if (app.diagnostico) gerar.disabled = false;
    const caixa = el.querySelector('[data-pendentes]');
    if (pendentes.length === 0) {
      caixa.innerHTML = '<span class="ok">Todos os itens respondidos. O diagnóstico pode ser gerado.</span>';
    } else if (pendentes.length <= 12) {
      caixa.innerHTML = `Pendentes: ${pendentes.map(c => `<button type="button" class="link" data-ir="${esc(c)}">${esc(c)}</button>`).join(' ')}`;
    } else {
      caixa.textContent = `Faltam ${pendentes.length} itens.`;
    }
  }

  function irParaItem(codigo) {
    const item = modelo.itens.find(i => i.codigo === codigo);
    const alvoBloco = blocos.findIndex(b => b.dimensoes.includes(item.dimensao));
    if (alvoBloco !== bloco) { bloco = alvoBloco; desenharBloco(); }
    const alvo = document.getElementById(`item-${codigo}`);
    alvo?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    alvo?.querySelector('input')?.focus({ preventScroll: true });
  }

  el.addEventListener('change', ev => {
    const input = ev.target;
    if (input.type !== 'radio') return;
    const codigo = input.name;
    aoResponder(codigo, Number(input.value));
    input.closest('fieldset').classList.add('respondido');
    atualizarProgresso();
  });

  el.addEventListener('click', ev => {
    const b = ev.target.closest('button');
    if (!b) return;
    if (b.dataset.bloco !== undefined) { bloco = Number(b.dataset.bloco); desenharBloco(); window.scrollTo({ top: 0, behavior: 'smooth' }); }
    if (b.dataset.ir) irParaItem(b.dataset.ir);
    switch (b.dataset.acao) {
      case 'anterior': if (bloco > 0) { bloco--; desenharBloco(); window.scrollTo({ top: 0, behavior: 'smooth' }); } break;
      case 'proximo': if (bloco < blocos.length - 1) { bloco++; desenharBloco(); window.scrollTo({ top: 0, behavior: 'smooth' }); } break;
      case 'gerar': aoGerar(); break;
      case 'ficha': aoEditarFicha(); break;
    }
  });

  desenharBloco();
  atualizarProgresso();
  return { irParaItem };
}

// ------------------------------------------------------------ CP-14 — guia de aplicação
export function renderGuia(el, modelo) {
  const tempo = esforcoGestor(modelo);
  const gestor = (modelo.tempos_processo || []).filter(e => e.raia === 'Gestor da PME');
  el.innerHTML = `
    <h2 id="guia-titulo">Guia de aplicação</h2>
    <p>O MGP-PME avalia se a sua empresa reúne as condições para adotar Inteligência Artificial com retorno — e, principalmente, <strong>o que a impede</strong>. Você mesmo aplica, sem consultoria, em ${tempo.min} a ${tempo.max} minutos.</p>

    <details open><summary>Como preencher</summary>
      <ol>
        <li>Preencha a ficha da empresa. Ela não entra no cálculo.</li>
        <li>Responda os ${modelo.itens.length} itens, em três blocos. Para cada um, escolha a descrição que <strong>corresponde ao que a empresa faz hoje</strong>.</li>
        <li>Se a prática existe só no papel, ou depende de uma pessoa, escolha a opção correspondente — não a ideal.</li>
        <li>Na dúvida entre duas opções, escolha a mais baixa: o diagnóstico só ajuda se for realista.</li>
        <li>Gere o diagnóstico, leia o perfil, o nível e o roteiro, e <strong>exporte o arquivo</strong> para guardar.</li>
      </ol>
    </details>

    <details><summary>Tempo estimado por etapa</summary>
      <table class="tabela compacta"><thead><tr><th>Etapa</th><th>Minutos</th></tr></thead><tbody>
        ${gestor.map(e => `<tr><td>${esc(e.atividade)}</td><td>${e.min === e.max ? e.min : `${e.min} a ${e.max}`}</td></tr>`).join('')}
        <tr class="total"><td>Total</td><td>${tempo.min} a ${tempo.max}</td></tr>
      </tbody></table>
    </details>

    <details><summary>A escala de resposta</summary>
      <p>Cada item tem cinco descrições próprias de prática observável. Elas seguem esta lógica geral:</p>
      <dl class="escala">${modelo.escala.map(e => `<dt>${e.valor} · ${esc(e.descritor)}</dt><dd>${esc(e.significado)}</dd>`).join('')}</dl>
    </details>

    <details><summary>As seis dimensões</summary>
      <dl>${modelo.dimensoes.map(d => `<dt>${esc(d.codigo)} · ${esc(d.nome)} — peso ${num(d.peso * 100, 0)}%${d.critica ? ', crítica' : ''}</dt><dd>${esc(d.definicao)}</dd>`).join('')}</dl>
    </details>

    <details><summary>Como ler o resultado</summary>
      <p><strong>Escore por dimensão (0 a 100):</strong> média das respostas da dimensão, convertidas para a escala de 0 a 100.</p>
      <p><strong>Teto de gargalo:</strong> as dimensões ${modelo.dimensoes.filter(d => d.critica).map(d => esc(d.codigo)).join(', ')} são críticas. O nível da empresa nunca ultrapassa o nível da dimensão crítica mais fraca — um ponto forte não compensa uma base que falta. Por isso o nível atribuído pode ser menor do que a média sugere; quando isso acontece, o relatório mostra os dois valores.</p>
      <table class="tabela compacta"><thead><tr><th>Nível</th><th>Escore</th><th>Significado</th></tr></thead><tbody>
        ${modelo.niveis.map(n => `<tr><td>${n.numero} · ${esc(n.nome)}</td><td>${n.limite_inferior} a ${n.limite_superior}</td><td>${esc(n.interpretacao)}</td></tr>`).join('')}
      </tbody></table>
      <p><strong>Faixas das dimensões</strong> (selecionam as recomendações):</p>
      <dl>${modelo.faixas.map(f => `<dt>${esc(f.nome)} (${f.limite_inferior} a ${f.limite_superior})</dt><dd>${esc(f.leitura)}</dd>`).join('')}</dl>
      <p><strong>Roteiro:</strong> advertências vêm primeiro, porque condicionam a leitura de tudo. Depois, as ações por prioridade: faixa crítica antes, dimensão crítica antes, e entre ações igualmente urgentes a de menor esforço.</p>
    </details>

    <details><summary>Quando reaplicar</summary>
      <table class="tabela compacta"><thead><tr><th>Nível</th><th>Periodicidade</th><th>Antecipe se…</th></tr></thead><tbody>
        ${modelo.reaplicacao.map(r => `<tr><td>${r.niveis.join(' e ')}</td><td>a cada ${r.meses} meses</td><td>${esc(r.gatilho)}</td></tr>`).join('')}
      </tbody></table>
      <p>Guarde o arquivo exportado: na reaplicação, você poderá importá-lo e comparar a evolução.</p>
    </details>

    <details><summary>Privacidade</summary>
      <p>Tudo roda neste navegador. Nenhuma resposta é enviada a servidor algum — nem ao grupo de pesquisa. Os dados ficam no armazenamento local do navegador e no arquivo que você exportar.</p>
      <p><strong>Atenção:</strong> limpar os dados do navegador, usar janela anônima ou trocar de dispositivo apaga a aplicação. Por isso a exportação faz parte do processo.</p>
    </details>`;
}
