// coleta.js — camada C1 (Coleta): ficha de contexto (CP-03), formulário de
// itens com as âncoras como opções de resposta (CP-01, ADR-06), validador
// de completude (CP-02) e guia de aplicação embutido (CP-14).
// Versão 1.4.0: o questionário mostra uma afirmação por tela, com a trilha dos
// seis critérios ao lado, atalhos de teclado e uma tela de revisão no fim.

import { esc, dataBR, PORTES, num, citar, icone } from './ui.js';
import { ESTADOS, contarRespondidas, hojeISO } from './estado.js';
import { itensPendentes } from './nucleo.js';
import { esforcoGestor } from './validacao.js';
import { carregarECharts } from './bibliotecas.js';

// ------------------------------------------------------------ CP-03 — ficha
export function renderFicha(el, { modelo, app, sugestao, aoSalvar, aoCancelar }) {
  const base = app ? { ...app.empresa, respondente: app.respondente, data: app.data } : (sugestao || {});
  const bloqueada = app?.estado === ESTADOS.ARQUIVADA;
  const campo = (nome, rotulo, controle, classe = '') => `<label class="campo ${classe}" data-campo="${nome}">${rotulo}${controle}<span class="campo-erro" data-erro="${nome}"></span></label>`;
  el.innerHTML = `
    <div class="estreito">
      <header class="pagina-cab">
        <div>
          <span class="rotulo">Etapa 1 de 3</span>
          <h1>Dados da empresa</h1>
          <p class="sub">Não entram no cálculo. Identificam o diagnóstico e ficam só neste navegador.</p>
        </div>
      </header>
      ${app?.anterior ? '<p class="aviso aviso-info">Reaplicação: os dados vieram da aplicação anterior. Atualize o que mudou.</p>' : ''}
      <form id="form-ficha" class="painel formulario" novalidate>
        <div class="grade-form">
          ${campo('identificador', 'Empresa', `<input name="identificador" required maxlength="120" autocomplete="organization" value="${esc(base.identificador)}" placeholder="Ex.: Metalmecânica Aurora">`, 'inteira')}
          ${campo('setor', 'Setor', `<input name="setor" required maxlength="120" value="${esc(base.setor)}" placeholder="Ex.: Indústria metalmecânica">`, 'inteira')}
          ${campo('porte', 'Porte', `<select name="porte" required>
              <option value="">Selecione</option>
              ${PORTES.map(p => `<option value="${esc(p.valor)}" ${base.porte === p.valor ? 'selected' : ''}>${esc(p.rotulo)}</option>`).join('')}
            </select>`)}
          ${campo('funcionarios', 'Funcionários', `<input name="funcionarios" type="number" min="1" step="1" required inputmode="numeric" value="${esc(base.funcionarios)}">`)}
          ${campo('respondente', 'Responsável pelo preenchimento', `<input name="respondente" required maxlength="120" autocomplete="name" value="${esc(base.respondente)}" placeholder="Nome e função">`)}
          ${campo('data', 'Data', `<input name="data" type="date" required value="${esc(base.data || hojeISO())}">`)}
        </div>
        <div class="form-rodape">
          <span class="nota">Modelo ${esc(app?.versaoModelo || modelo.versao_modelo)}</span>
          <div class="acoes">
            ${aoCancelar ? '<button type="button" class="btn btn-fantasma" data-acao="cancelar">Voltar</button>' : ''}
            <button type="submit" class="btn btn-pri" ${bloqueada ? 'disabled' : ''}>${app ? 'Salvar e continuar' : 'Começar questionário'}</button>
          </div>
        </div>
      </form>
    </div>`;

  const form = el.querySelector('#form-ficha');
  el.querySelector('[data-acao="cancelar"]')?.addEventListener('click', aoCancelar);
  form.addEventListener('submit', ev => {
    ev.preventDefault();
    const dados = Object.fromEntries(new FormData(form));
    dados.identificador = dados.identificador.trim();
    dados.setor = dados.setor.trim();
    dados.respondente = dados.respondente.trim();
    dados.funcionarios = Number(dados.funcionarios);
    const erros = {};
    if (!dados.identificador) erros.identificador = 'Informe o nome ou identificador da empresa.';
    if (!dados.setor) erros.setor = 'Informe o setor.';
    if (!PORTES.some(p => p.valor === dados.porte)) erros.porte = 'Selecione o porte.';
    if (!Number.isInteger(dados.funcionarios) || dados.funcionarios <= 0) erros.funcionarios = 'Use um número inteiro maior que zero.';
    if (!dados.respondente) erros.respondente = 'Informe quem está respondendo.';
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dados.data || '')) erros.data = 'Informe a data.';
    form.querySelectorAll('[data-campo]').forEach(c => {
      const msg = erros[c.dataset.campo] || '';
      c.classList.toggle('erro', Boolean(msg));
      c.querySelector('[data-erro]').textContent = msg;
      c.querySelector('input, select')?.setAttribute('aria-invalid', String(Boolean(msg)));
    });
    const primeiro = Object.keys(erros)[0];
    if (primeiro) { form.querySelector(`[name="${primeiro}"]`).focus(); return; }
    aoSalvar(dados);
  });
}

// ------------------------------------------------------------ blocos do questionário
// Os itens seguem os três blocos de tempo do processo (Fig. 5 / Tabela 14):
// D0+D1, D2+D3, D4+D5. A estimativa de esforço do guia usa estes blocos.
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

// ------------------------------------------------------------ navegação entre afirmações
// Ordem de apresentação: critério a critério, na ordem do modelo.
export function ordemItens(modelo) {
  return modelo.dimensoes.flatMap(d => modelo.itens.filter(i => i.dimensao === d.codigo));
}

const respondido = (app, codigo) => Number.isInteger(app.respostas?.[codigo]);

// Próxima afirmação sem resposta depois de `atual`, voltando ao começo se
// preciso. Sem `atual`, a primeira sem resposta. null quando tudo foi respondido.
export function proximoItem(app, modelo, atual = null) {
  const ordem = ordemItens(modelo).map(i => i.codigo);
  const k = atual ? ordem.indexOf(atual) : -1;
  for (let passo = 1; passo <= ordem.length; passo++) {
    const c = ordem[(k + passo + ordem.length) % ordem.length];
    if (!respondido(app, c)) return c;
  }
  return null;
}

// Situação de cada critério para a trilha lateral e para a revisão.
export function estadoCriterios(app, modelo) {
  return modelo.dimensoes.map(d => {
    const itens = modelo.itens.filter(i => i.dimensao === d.codigo);
    const feitos = itens.filter(i => respondido(app, i.codigo)).length;
    return {
      codigo: d.codigo, nome: d.nome, critica: Boolean(d.critica),
      total: itens.length, feitos, completo: feitos === itens.length,
      itens: itens.map(i => i.codigo),
      primeiroPendente: itens.find(i => !respondido(app, i.codigo))?.codigo ?? null,
    };
  });
}

// ------------------------------------------------------------ CP-01 e CP-02 — formulário
export function renderQuestionario(el, { modelo, app, itemInicial = null, aoResponder, aoGerar, aoEditarFicha }) {
  const ordem = ordemItens(modelo);
  const codigos = ordem.map(i => i.codigo);
  const total = ordem.length;
  const somenteLeitura = app.estado === ESTADOS.ARQUIVADA;
  const REVISAO = 'revisao';
  const tudoRespondido = () => itensPendentes(app.respostas, modelo).length === 0;

  let atual = codigos.includes(itemInicial) || itemInicial === REVISAO ? itemInicial
    : (tudoRespondido() || somenteLeitura ? REVISAO : proximoItem(app, modelo));
  let deRevisao = false;
  let temporizador = null;
  let anterior = null; // para o sentido da transição entre afirmações

  el.innerHTML = `
    <div class="quest">
      <aside class="trilha" aria-label="Critérios">
        <div class="trilha-emp"><strong>${esc(app.empresa.identificador)}</strong>${dataBR(app.data)}${somenteLeitura ? '' : ' · <button type="button" class="link" data-acao="ficha">editar dados</button>'}</div>
        <ol data-trilha></ol>
        <div class="trilha-revisao"><button type="button" class="link" data-ir="${REVISAO}">Revisar respostas</button></div>
      </aside>
      <div class="quest-corpo">
        <div class="quest-movel" data-movel></div>
        ${somenteLeitura ? `<p class="aviso aviso-info">${icone('info')}<span>Aplicação arquivada: respostas só para consulta.</span></p>` : ''}
        <section class="painel quest-painel" data-tela aria-live="polite"></section>
        <footer class="quest-barra" data-barra>
          <button type="button" class="btn btn-fantasma" data-acao="anterior">${icone('voltar')} Voltar</button>
          <div class="progresso"><span><strong data-respondidas></strong> de ${total} respondidas</span><div class="trilho-fino" aria-hidden="true"><div data-trilho></div></div></div>
          <button type="button" class="btn btn-sec" data-acao="proximo">Próxima ${icone('chevron')}</button>
        </footer>
      </div>
    </div>`;

  const tela = el.querySelector('[data-tela]');
  const barra = el.querySelector('[data-barra]');

  function desenharTrilha() {
    const crits = estadoCriterios(app, modelo);
    const dimAtual = atual === REVISAO ? null : ordem.find(i => i.codigo === atual)?.dimensao;
    el.querySelector('[data-trilha]').innerHTML = crits.map(c => `
      <li class="${c.completo ? 'feito' : ''} ${c.codigo === dimAtual ? 'atual' : ''}">
        <button type="button" data-ir="${esc(c.primeiroPendente || c.itens[0])}" ${c.codigo === dimAtual ? 'aria-current="step"' : ''}>
          <span class="marcador">${c.completo ? icone('check') : ''}</span>
          <span class="nome">${esc(c.nome)}${c.critica ? ' <span class="ponto" title="Critério crítico"></span>' : ''}</span>
          <span class="contagem">${c.feitos}/${c.total}</span>
        </button>
      </li>`).join('');
    const respondidas = contarRespondidas(app);
    el.querySelector('[data-respondidas]').textContent = respondidas;
    el.querySelector('[data-trilho]').style.width = `${(respondidas / total) * 100}%`;
    const movel = el.querySelector('[data-movel]');
    if (atual === REVISAO) {
      movel.innerHTML = `<div class="linha"><strong>Revisão</strong><span>${respondidas}/${total}</span></div><div class="trilho-fino"><div style="width:${(respondidas / total) * 100}%"></div></div>`;
    } else {
      const k = crits.findIndex(c => c.codigo === dimAtual);
      movel.innerHTML = `<div class="linha"><span>Critério ${k + 1} de ${crits.length} · <strong>${esc(crits[k].nome)}</strong></span><span>${respondidas}/${total}</span></div><div class="trilho-fino"><div style="width:${(respondidas / total) * 100}%"></div></div>`;
    }
  }

  function telaItem(item) {
    const d = modelo.dimensoes.find(x => x.codigo === item.dimensao);
    const doCrit = ordem.filter(i => i.dimensao === d.codigo);
    const valor = app.respostas[item.codigo];
    const sobre = `${esc(d.definicao)}${d.referencias?.length ? ` <cite>(${esc(citar(modelo, d.referencias))})</cite>` : ''}`;
    return `
      <div class="quest-rotulo"><span>${esc(d.nome)} · pergunta ${doCrit.indexOf(item) + 1} de ${doCrit.length}</span>${d.critica ? '<span class="critico">Critério crítico</span>' : ''}</div>
      <h1 class="quest-pergunta" id="pergunta" tabindex="-1">${esc(item.assertiva)}</h1>
      <p class="quest-dica">Escolha o que a empresa faz hoje. Na dúvida, a opção mais baixa.</p>
      <details class="quest-porque"><summary>Sobre este critério ${icone('baixo')}</summary>
        <p>${sobre}</p>
        ${item.fundamento ? `<p id="fund-${esc(item.codigo)}"><strong>Na literatura:</strong> ${esc(item.fundamento.texto)} <cite>(${esc(citar(modelo, item.fundamento.referencias))})</cite></p>` : ''}
      </details>
      <fieldset class="respostas" data-item="${esc(item.codigo)}" aria-labelledby="pergunta">
        ${item.ancoras.map((ancora, k) => {
          const v = k + 1;
          return `<label class="resposta">
            <input type="radio" name="${esc(item.codigo)}" value="${v}" ${valor === v ? 'checked' : ''} ${somenteLeitura ? 'disabled' : ''}>
            <span class="resposta-num">${v}</span>
            <span class="resposta-desc">${esc(modelo.escala[k]?.descritor ?? '')}</span>
            <span class="resposta-txt">${esc(ancora)}</span>
          </label>`;
        }).join('')}
      </fieldset>
      <p class="quest-atalhos" aria-hidden="true"><kbd>1</kbd>–<kbd>5</kbd> responde · <kbd>←</kbd> <kbd>→</kbd> navega</p>`;
  }

  function telaRevisao() {
    const crits = estadoCriterios(app, modelo);
    const pendentes = itensPendentes(app.respostas, modelo);
    const rotuloGerar = app.diagnostico ? 'Ver diagnóstico' : 'Gerar diagnóstico';
    return `
      <div class="revisao">
        <span class="rotulo">Etapa 2 de 3</span>
        <h1 id="pergunta" tabindex="-1">Revisão</h1>
        <p class="sub">${pendentes.length ? `Faltam ${pendentes.length} respostas, marcadas em vermelho.` : 'Tudo respondido. Clique em um valor para alterá-lo.'}</p>
        <ul class="revisao-lista">
          ${crits.map(c => {
            const vals = c.itens.map(i => app.respostas[i]).filter(Number.isInteger);
            const media = vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : null;
            return `<li>
              <span class="nome">${esc(c.nome)}${c.critica ? ' <span class="ponto" title="Critério crítico"></span>' : ''}</span>
              <span class="celulas">${c.itens.map((i, k) => {
                const v = app.respostas[i];
                return `<button type="button" class="celula ${Number.isInteger(v) ? '' : 'vazia'}" data-ir="${esc(i)}" data-de-revisao aria-label="${esc(c.nome)}, pergunta ${k + 1}: ${Number.isInteger(v) ? `resposta ${v}` : 'sem resposta'}">${Number.isInteger(v) ? v : '–'}</button>`;
              }).join('')}</span>
              <span class="media">${media === null ? '' : `média ${num(media)}`}</span>
            </li>`;
          }).join('')}
        </ul>
        <div class="revisao-rodape">
          <span class="nota">${contarRespondidas(app)} de ${total} respondidas</span>
          ${pendentes.length && !app.diagnostico
            ? `<button type="button" class="btn btn-sec" data-ir="${esc(pendentes[0])}">Responder pendentes</button>`
            : `<button type="button" class="btn btn-pri btn-grande" data-acao="gerar" ${somenteLeitura && !app.diagnostico ? 'disabled' : ''}>${rotuloGerar} ${icone('seta')}</button>`}
        </div>
      </div>`;
  }

  function desenhar({ focar = true } = {}) {
    clearTimeout(temporizador);
    const posicao = c => (c === REVISAO ? codigos.length : codigos.indexOf(c));
    tela.classList.remove('ir-frente', 'ir-tras');
    if (anterior !== null && anterior !== atual) tela.classList.add(posicao(atual) < posicao(anterior) ? 'ir-tras' : 'ir-frente');
    anterior = atual;
    if (atual === REVISAO) {
      tela.innerHTML = telaRevisao();
      barra.hidden = true;
      // o diagnóstico vem a seguir: a biblioteca de gráficos já começa a carregar
      carregarECharts().catch(() => {});
    } else {
      const item = ordem.find(i => i.codigo === atual);
      tela.innerHTML = telaItem(item);
      barra.hidden = false;
      const k = codigos.indexOf(atual);
      barra.querySelector('[data-acao="anterior"]').disabled = k === 0;
      const proximo = barra.querySelector('[data-acao="proximo"]');
      const ultimo = k === codigos.length - 1;
      proximo.innerHTML = ultimo ? `Revisar ${icone('chevron')}` : `Próxima ${icone('chevron')}`;
      proximo.classList.toggle('btn-pri', respondido(app, atual));
      proximo.classList.toggle('btn-sec', !respondido(app, atual));
    }
    desenharTrilha();
    history.replaceState(null, '', `#/questionario/${atual}`);
    if (focar) {
      tela.querySelector('#pergunta')?.focus({ preventScroll: true });
      if (tela.getBoundingClientRect().top < 0) window.scrollTo({ top: 0 });
    }
  }

  function ir(codigo, { vindoDaRevisao = false } = {}) {
    deRevisao = vindoDaRevisao;
    atual = codigo;
    desenhar();
  }

  function avancar() {
    if (atual === REVISAO) return;
    const k = codigos.indexOf(atual);
    ir(k < codigos.length - 1 ? codigos[k + 1] : REVISAO);
  }

  function recuar() {
    if (atual === REVISAO) { ir(codigos[codigos.length - 1]); return; }
    const k = codigos.indexOf(atual);
    if (k > 0) ir(codigos[k - 1]);
  }

  function responder(codigo, valor) {
    const faltavam = itensPendentes(app.respostas, modelo).length;
    aoResponder(codigo, valor);
    tela.querySelector(`input[value="${valor}"]`)?.closest('.resposta')?.classList.add('escolhida');
    desenharTrilha();
    const proximo = barra.querySelector('[data-acao="proximo"]');
    proximo.classList.add('btn-pri');
    proximo.classList.remove('btn-sec');
    clearTimeout(temporizador);
    temporizador = setTimeout(() => {
      if (deRevisao || (faltavam > 0 && tudoRespondido())) ir(REVISAO);
      else avancar();
    }, 260);
  }

  el.addEventListener('change', ev => {
    const input = ev.target;
    if (input.type !== 'radio' || somenteLeitura) return;
    responder(input.name, Number(input.value));
  });

  el.addEventListener('click', ev => {
    const b = ev.target.closest('button');
    if (!b) return;
    if (b.dataset.ir) { ir(b.dataset.ir, { vindoDaRevisao: b.hasAttribute('data-de-revisao') }); return; }
    switch (b.dataset.acao) {
      case 'anterior': recuar(); break;
      case 'proximo': avancar(); break;
      case 'gerar': aoGerar(); break;
      case 'ficha': aoEditarFicha(); break;
    }
  });

  // Atalhos: 1 a 5 respondem, setas navegam. Valem só enquanto esta tela existe
  // e nenhum campo de texto, diálogo ou guia tem o foco.
  const controle = new AbortController();
  document.addEventListener('keydown', ev => {
    if (!el.isConnected) { controle.abort(); return; }
    if (ev.altKey || ev.ctrlKey || ev.metaKey || ev.defaultPrevented) return;
    const alvo = ev.target;
    if (alvo.closest?.('dialog, .guia, textarea, select') || (alvo.tagName === 'INPUT' && alvo.type !== 'radio')) return;
    if (atual === REVISAO) return;
    if (/^[1-5]$/.test(ev.key) && !somenteLeitura) {
      const radio = tela.querySelector(`input[value="${ev.key}"]`);
      if (radio) { ev.preventDefault(); radio.checked = true; responder(atual, Number(ev.key)); }
    } else if (ev.key === 'ArrowRight' && alvo.type !== 'radio') { ev.preventDefault(); avancar(); }
    else if (ev.key === 'ArrowLeft' && alvo.type !== 'radio') { ev.preventDefault(); recuar(); }
    else if (ev.key === 'Enter' && alvo.type === 'radio' && respondido(app, atual)) { ev.preventDefault(); avancar(); }
  }, { signal: controle.signal });

  desenhar({ focar: false });
  return { ir };
}

// ------------------------------------------------------------ CP-14 — guia de aplicação
export function renderGuia(el, modelo) {
  const tempo = esforcoGestor(modelo);
  const gestor = (modelo.tempos_processo || []).filter(e => e.raia === 'Gestor da PME');
  const secao = (titulo, corpo, aberta = false) => `<details ${aberta ? 'open' : ''}><summary>${titulo} ${icone('chevron')}</summary>${corpo}</details>`;
  el.innerHTML = `
    <p class="intro">Avalia se a empresa está pronta para IA e o que a impede. Você aplica sozinho, em ${tempo.min} a ${tempo.max} minutos.</p>
    ${secao('Como preencher', `<ol>
        <li>Preencha os dados da empresa. Eles não entram no cálculo.</li>
        <li>Responda as ${modelo.itens.length} afirmações, uma por tela, com o que a empresa <strong>faz hoje</strong>.</li>
        <li>Prática só no papel ou que depende de uma pessoa conta como a opção mais baixa.</li>
        <li>Na dúvida entre duas opções, escolha a mais baixa.</li>
        <li>Gere o diagnóstico e exporte o PDF e a planilha.</li>
      </ol>
      <p class="nota">Atalhos: teclas 1 a 5 respondem; setas avançam e voltam.</p>`, true)}
    ${secao('Tempo por etapa', `<table class="tabela compacta"><thead><tr><th>Etapa</th><th class="num">Minutos</th></tr></thead><tbody>
        ${gestor.map(e => `<tr><td>${esc(e.atividade)}</td><td class="num">${e.min === e.max ? e.min : `${e.min} a ${e.max}`}</td></tr>`).join('')}
        <tr class="total"><td>Total</td><td class="num">${tempo.min} a ${tempo.max}</td></tr>
      </tbody></table>`)}
    ${secao('Escala de resposta', `<dl>${modelo.escala.map(e => `<dt>${e.valor} · ${esc(e.descritor)}</dt><dd>${esc(e.significado)}</dd>`).join('')}</dl>`)}
    ${secao('Os seis critérios', `<dl>${modelo.dimensoes.map(d => `<dt>${esc(d.nome)} · peso ${num(d.peso * 100, 0)}%${d.critica ? ' · crítico' : ''}</dt><dd>${esc(d.definicao)}${d.referencias?.length ? ` <cite>(${esc(citar(modelo, d.referencias))})</cite>` : ''}</dd>`).join('')}</dl>`)}
    ${secao('Como ler o resultado', `
      <p><strong>Escore (0 a 100):</strong> média das respostas do critério.</p>
      <p><strong>Teto de gargalo:</strong> o nível da empresa nunca passa do nível do critério crítico mais fraco (${modelo.dimensoes.filter(d => d.critica).map(d => esc(d.nome)).join(', ')}). Um ponto forte não compensa uma base que falta.</p>
      <table class="tabela compacta"><thead><tr><th>Nível</th><th class="num">Escore</th></tr></thead><tbody>
        ${modelo.niveis.map(n => `<tr><td>${n.numero} · ${esc(n.nome)}</td><td class="num">${n.limite_inferior} a ${n.limite_superior}</td></tr>`).join('')}
      </tbody></table>
      <dl>${modelo.faixas.map(f => `<dt>${esc(f.nome)} (${f.limite_inferior} a ${f.limite_superior})</dt><dd>${esc(f.leitura)}</dd>`).join('')}</dl>
      <p><strong>Roteiro:</strong> advertências primeiro; depois as ações, da mais urgente à menos urgente.</p>`)}
    ${secao('Quando reaplicar', `<table class="tabela compacta"><thead><tr><th>Nível</th><th>Período</th><th>Antecipe se</th></tr></thead><tbody>
        ${modelo.reaplicacao.map(r => `<tr><td>${r.niveis.join(' e ')}</td><td>${r.meses} meses</td><td>${esc(r.gatilho)}</td></tr>`).join('')}
      </tbody></table>
      <p>Na reaplicação, importe a planilha no Histórico para comparar.</p>`)}
    ${secao('Privacidade', `<p>Nada é enviado a servidor algum. Os dados ficam neste navegador e nos arquivos que você exportar.</p>
      <p>Os dados se perdem se você limpar o navegador, usar uma janela anônima ou trocar de dispositivo. Exporte o diagnóstico para guardar uma cópia.</p>`)}`;
}
