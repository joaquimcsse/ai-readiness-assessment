// manutencao.js — pacote P3, ator Pesquisador mantenedor:
// UC-10 Parametrizar dimensões, pesos e faixas; UC-11 Manter banco de itens
// e âncoras; UC-12 Manter base de regras de recomendação.
// A página é estática: "publicar" uma nova versão significa validar o
// rascunho e gerar o novo dados.json, que o mantenedor versiona no
// repositório (ADR-04). Parâmetros inconsistentes impedem a publicação.

import { esc, num, notificar, lerArquivo } from './ui.js';
import { validarModelo } from './validacao.js';
import { carregarRascunhoModelo, salvarRascunhoModelo, descartarRascunhoModelo, baixarArquivo } from './estado.js';

const ABAS = [
  { id: 'dimensoes', rotulo: 'Dimensões e pesos', uc: 'UC-10' },
  { id: 'faixas', rotulo: 'Níveis, faixas e priorização', uc: 'UC-10' },
  { id: 'itens', rotulo: 'Itens e âncoras', uc: 'UC-11' },
  { id: 'regras', rotulo: 'Base de regras', uc: 'UC-12' },
  { id: 'publicar', rotulo: 'Publicar versão', uc: 'UC-10 a 12' },
];

function compararVersao(a, b) {
  const pa = String(a).split('.').map(n => parseInt(n, 10) || 0);
  const pb = String(b).split('.').map(n => parseInt(n, 10) || 0);
  for (let k = 0; k < Math.max(pa.length, pb.length); k++) {
    if ((pa[k] || 0) !== (pb[k] || 0)) return (pa[k] || 0) - (pb[k] || 0);
  }
  return 0;
}

function proximaVersao(v) {
  const p = String(v).split('.').map(n => parseInt(n, 10) || 0);
  while (p.length < 3) p.push(0);
  return `${p[0]}.${p[1] + 1}.0`;
}

function obter(obj, caminho) {
  return caminho.split('.').reduce((o, k) => (o == null ? o : o[k]), obj);
}

function definir(obj, caminho, valor) {
  const partes = caminho.split('.');
  const ultimo = partes.pop();
  const alvo = partes.reduce((o, k) => o[k], obj);
  alvo[ultimo] = valor;
}

// Lista legível do que mudou entre o modelo publicado e o rascunho (etapa V4).
export function diferencas(base, novo) {
  const mudancas = [];
  const comparar = (lista, chave, rotulo, campos) => {
    for (const n of novo[lista] || []) {
      const b = (base[lista] || []).find(x => x[chave] === n[chave]);
      if (!b) { mudancas.push(`${rotulo} ${n[chave]}: incluído`); continue; }
      for (const c of campos) {
        if (JSON.stringify(b[c]) !== JSON.stringify(n[c])) mudancas.push(`${rotulo} ${n[chave]}: ${c} alterado`);
      }
    }
    for (const b of base[lista] || []) {
      if (!(novo[lista] || []).some(x => x[chave] === b[chave])) mudancas.push(`${rotulo} ${b[chave]}: removido`);
    }
  };
  comparar('dimensoes', 'codigo', 'Dimensão', ['nome', 'peso', 'critica', 'definicao']);
  comparar('niveis', 'numero', 'Nível', ['nome', 'limite_inferior', 'limite_superior', 'interpretacao']);
  comparar('faixas', 'codigo', 'Faixa', ['nome', 'limite_inferior', 'limite_superior', 'leitura']);
  comparar('itens', 'codigo', 'Item', ['assertiva', 'dimensao', 'ancoras', 'ancoras_status']);
  comparar('regras_dimensao', 'codigo', 'Regra', ['acao', 'esforco', 'horizonte']);
  comparar('regras_transversais', 'codigo', 'Regra', ['acao', 'esforco', 'horizonte', 'condicao', 'condicao_texto']);
  if (JSON.stringify(base.priorizacao) !== JSON.stringify(novo.priorizacao)) mudancas.push('Parâmetros de priorização alterados');
  if (JSON.stringify(base.reaplicacao) !== JSON.stringify(novo.reaplicacao)) mudancas.push('Periodicidade de reaplicação alterada');
  return mudancas;
}

export function renderManutencao(el, { modelo }) {
  const base = modelo;
  let rascunho = carregarRascunhoModelo();
  if (!rascunho || rascunho.versao_modelo !== base.versao_modelo) rascunho = structuredClone(base);
  let aba = 'dimensoes';
  let filtroDim = 'D0';

  el.innerHTML = `
    <section class="cartao">
      <p class="etapa-rotulo">Pacote P3 · Pesquisador mantenedor</p>
      <h1>Manutenção do modelo</h1>
      <p class="lead">Edite pesos, limites, itens, âncoras e regras a partir de evidência da avaliação empírica (etapa V4). As alterações ficam em um rascunho neste navegador; ao publicar, o sistema valida o modelo e gera o novo <code>dados.json</code>, que deve substituir o arquivo do repositório. Parâmetros inconsistentes impedem a publicação e a versão anterior é mantida.</p>
      <p class="nota">Versão publicada em uso: <strong>${esc(base.versao_modelo)}</strong> (${esc(base.data_versao || '')}). Diagnósticos de versões diferentes não são comparáveis (RN-07).</p>
      <div class="acoes acoes-esq">
        <label class="btn btn-sec">Carregar dados.json de arquivo<input type="file" accept="application/json,.json" data-acao="carregar" hidden></label>
        <button type="button" class="btn btn-sec" data-acao="descartar">Descartar rascunho</button>
      </div>
    </section>
    <div class="painel-validacao" data-validacao aria-live="polite"></div>
    <nav class="abas" role="tablist">${ABAS.map(a => `<button type="button" role="tab" class="aba" data-aba="${a.id}">${esc(a.rotulo)} <small>${esc(a.uc)}</small></button>`).join('')}</nav>
    <div data-corpo class="cartao"></div>`;

  const corpo = el.querySelector('[data-corpo]');
  const painelVal = el.querySelector('[data-validacao]');

  function campo(caminho, { tipo = 'texto', rotulo = '', area = false, opcoes = null, passo = 'any', classe = '' } = {}) {
    const v = obter(rascunho, caminho);
    const attrs = `data-caminho="${esc(caminho)}" data-tipo="${tipo}" aria-label="${esc(rotulo || caminho)}"`;
    if (opcoes) return `<select ${attrs} class="${classe}">${opcoes.map(o => `<option ${o === v ? 'selected' : ''}>${esc(o)}</option>`).join('')}</select>`;
    if (tipo === 'bool') return `<input type="checkbox" ${attrs} ${v ? 'checked' : ''}>`;
    if (tipo === 'json') return `<textarea ${attrs} class="json ${classe}" rows="4" spellcheck="false">${esc(JSON.stringify(v, null, 1))}</textarea>`;
    if (area) return `<textarea ${attrs} class="${classe}" rows="2">${esc(v)}</textarea>`;
    if (tipo === 'num') return `<input type="number" step="${passo}" ${attrs} class="${classe}" value="${esc(v)}">`;
    return `<input ${attrs} class="${classe}" value="${esc(v)}">`;
  }

  function validar() {
    const erros = validarModelo(rascunho);
    const mudancas = diferencas(base, rascunho);
    const soma = rascunho.dimensoes.reduce((a, d) => a + (Number(d.peso) || 0), 0);
    painelVal.innerHTML = erros.length
      ? `<div class="aviso aviso-erro"><strong>${erros.length} inconsistência(s) — a publicação está bloqueada.</strong><ul>${erros.slice(0, 12).map(e => `<li>${esc(e)}</li>`).join('')}${erros.length > 12 ? `<li>… e mais ${erros.length - 12}.</li>` : ''}</ul></div>`
      : `<div class="aviso aviso-ok"><strong>Modelo consistente.</strong> ${mudancas.length ? `${mudancas.length} alteração(ões) em relação à versão ${esc(base.versao_modelo)}.` : 'Nenhuma alteração em relação à versão publicada.'} Soma dos pesos: ${num(soma, 2)}.</div>`;
    const somaEl = el.querySelector('[data-soma]');
    if (somaEl) { somaEl.textContent = num(soma, 2); somaEl.classList.toggle('txt-F1', Math.abs(soma - 1) > 1e-6); }
    return { erros, mudancas };
  }

  function desenhar() {
    el.querySelectorAll('[data-aba]').forEach(b => { b.classList.toggle('ativa', b.dataset.aba === aba); b.setAttribute('aria-selected', String(b.dataset.aba === aba)); });
    if (aba === 'dimensoes') {
      corpo.innerHTML = `
        <h2>Dimensões, pesos e criticidade <small>UC-10</small></h2>
        <p class="nota">A soma dos pesos deve ser 1 e exatamente três dimensões devem ser críticas (operam como gargalo). Soma atual: <strong data-soma></strong>.</p>
        <table class="tabela tabela-edicao"><thead><tr><th>Cód.</th><th>Nome</th><th>Peso</th><th>Crítica</th><th>Definição</th></tr></thead><tbody>
          ${rascunho.dimensoes.map((d, k) => `<tr><td><strong>${esc(d.codigo)}</strong></td><td>${campo(`dimensoes.${k}.nome`, { rotulo: 'Nome' })}</td>
            <td>${campo(`dimensoes.${k}.peso`, { tipo: 'num', passo: '0.01', rotulo: `Peso ${d.codigo}`, classe: 'curto' })}</td>
            <td class="centro">${campo(`dimensoes.${k}.critica`, { tipo: 'bool', rotulo: `Crítica ${d.codigo}` })}</td>
            <td>${campo(`dimensoes.${k}.definicao`, { area: true, rotulo: 'Definição' })}</td></tr>`).join('')}
        </tbody></table>`;
    } else if (aba === 'faixas') {
      corpo.innerHTML = `
        <h2>Níveis de maturidade <small>UC-10</small></h2>
        <p class="nota">Os limites devem ser contíguos e cobrir de 0 a 100 (inferior inclusivo, superior exclusivo, exceto no último).</p>
        <table class="tabela tabela-edicao"><thead><tr><th>Nível</th><th>Nome</th><th>De</th><th>Até</th><th>Interpretação</th></tr></thead><tbody>
          ${rascunho.niveis.map((n, k) => `<tr><td><strong>${n.numero}</strong></td><td>${campo(`niveis.${k}.nome`)}</td>
            <td>${campo(`niveis.${k}.limite_inferior`, { tipo: 'num', classe: 'curto' })}</td><td>${campo(`niveis.${k}.limite_superior`, { tipo: 'num', classe: 'curto' })}</td>
            <td>${campo(`niveis.${k}.interpretacao`, { area: true })}</td></tr>`).join('')}
        </tbody></table>
        <h2>Faixas da base de regras <small>UC-10</small></h2>
        <table class="tabela tabela-edicao"><thead><tr><th>Faixa</th><th>Nome</th><th>De</th><th>Até</th><th>Leitura</th></tr></thead><tbody>
          ${rascunho.faixas.map((f, k) => `<tr><td><strong>${esc(f.codigo)}</strong></td><td>${campo(`faixas.${k}.nome`)}</td>
            <td>${campo(`faixas.${k}.limite_inferior`, { tipo: 'num', classe: 'curto' })}</td><td>${campo(`faixas.${k}.limite_superior`, { tipo: 'num', classe: 'curto' })}</td>
            <td>${campo(`faixas.${k}.leitura`, { area: true })}</td></tr>`).join('')}
        </tbody></table>
        <h2>Priorização do roteiro</h2>
        <p class="nota">prioridade = peso da faixa + bônus se a dimensão for crítica + bônus de esforço. Advertências recebem o peso de advertência e precedem todas as ações.</p>
        <div class="grade-campos">
          ${rascunho.faixas.map(f => `<label>Peso da faixa ${esc(f.codigo)} ${campo(`priorizacao.peso_faixa.${f.codigo}`, { tipo: 'num', classe: 'curto' })}</label>`).join('')}
          <label>Bônus de dimensão crítica ${campo('priorizacao.bonus_dimensao_critica', { tipo: 'num', classe: 'curto' })}</label>
          ${['Baixo', 'Médio', 'Alto'].map(e => `<label>Bônus de esforço ${e} ${campo(`priorizacao.bonus_esforco.${e}`, { tipo: 'num', classe: 'curto' })}</label>`).join('')}
          <label>Peso de advertência ${campo('priorizacao.peso_advertencia', { tipo: 'num', classe: 'curto' })}</label>
        </div>
        <h2>Periodicidade de reaplicação</h2>
        <table class="tabela tabela-edicao"><thead><tr><th>Níveis</th><th>Meses</th><th>Gatilho para antecipar</th></tr></thead><tbody>
          ${rascunho.reaplicacao.map((r, k) => `<tr><td>${r.niveis.join(' e ')}</td><td>${campo(`reaplicacao.${k}.meses`, { tipo: 'num', classe: 'curto' })}</td><td>${campo(`reaplicacao.${k}.gatilho`, { area: true })}</td></tr>`).join('')}
        </tbody></table>`;
    } else if (aba === 'itens') {
      const itens = rascunho.itens.map((it, k) => ({ it, k })).filter(x => x.it.dimensao === filtroDim);
      corpo.innerHTML = `
        <h2>Banco de itens e âncoras <small>UC-11</small></h2>
        <p class="nota">Cada item tem cinco âncoras de prática observável, da 1 (Inexistente) à 5 (Otimizada). Use o status para marcar âncoras revisadas pelo grupo.</p>
        <div class="filtro-horizonte" role="group" aria-label="Dimensão">${rascunho.dimensoes.map(d => `<button type="button" class="chip ${d.codigo === filtroDim ? 'ativo' : ''}" data-dim="${esc(d.codigo)}">${esc(d.codigo)} <small>${rascunho.itens.filter(i => i.dimensao === d.codigo).length}</small></button>`).join('')}</div>
        ${itens.map(({ it, k }) => `
          <details class="item-edicao" ${itens.length <= 6 ? '' : ''}>
            <summary><strong>${esc(it.codigo)}</strong> ${esc(it.assertiva)} <span class="selo ${it.ancoras_status === 'rascunho' ? 'selo-alerta' : ''}">${esc(it.ancoras_status || '')}</span></summary>
            <label>Assertiva ${campo(`itens.${k}.assertiva`, { rotulo: 'Assertiva' })}</label>
            <div class="linha-2">
              <label>Dimensão ${campo(`itens.${k}.dimensao`, { opcoes: rascunho.dimensoes.map(d => d.codigo) })}</label>
              <label>Status das âncoras ${campo(`itens.${k}.ancoras_status`, { opcoes: ['PBL4', 'rascunho', 'revisada'] })}</label>
            </div>
            ${it.ancoras.map((_, j) => `<label>Âncora ${j + 1} · ${esc(rascunho.escala[j]?.descritor)} ${campo(`itens.${k}.ancoras.${j}`, { area: true })}</label>`).join('')}
          </details>`).join('')}`;
    } else if (aba === 'regras') {
      corpo.innerHTML = `
        <h2>Regras de dimensão <small>UC-12</small></h2>
        <p class="nota">Exatamente uma regra por par dimensão-faixa, para que nenhum perfil produza roteiro vazio (CT-05).</p>
        <table class="tabela tabela-edicao"><thead><tr><th>Regra</th><th>Ação prescrita</th><th>Esforço</th><th>Horizonte</th></tr></thead><tbody>
          ${rascunho.regras_dimensao.map((r, k) => `<tr><td><code>${esc(r.codigo)}</code></td><td>${campo(`regras_dimensao.${k}.acao`, { area: true })}</td>
            <td>${campo(`regras_dimensao.${k}.esforco`, { opcoes: ['Baixo', 'Médio', 'Alto'] })}</td><td>${campo(`regras_dimensao.${k}.horizonte`, { opcoes: ['Curto', 'Médio', 'Longo'] })}</td></tr>`).join('')}
        </tbody></table>
        <h2>Regras transversais <small>UC-12</small></h2>
        <p class="nota">A condição é uma expressão declarativa sobre as faixas. Tipos: <code>faixa</code> {dimensao, faixa}, <code>faixa_global</code> {faixa}, <code>criticas_em_faixa</code> {faixa, minimo}, <code>todas</code>/<code>alguma</code> {condicoes: […]}, <code>nao</code> {condicao}.</p>
        <table class="tabela tabela-edicao"><thead><tr><th>Regra</th><th>Condição</th><th>Advertência</th><th>Esforço</th><th>Horizonte</th></tr></thead><tbody>
          ${rascunho.regras_transversais.map((r, k) => `<tr><td><code>${esc(r.codigo)}</code></td>
            <td>${campo(`regras_transversais.${k}.condicao_texto`, { area: true, rotulo: 'Condição em texto' })}${campo(`regras_transversais.${k}.condicao`, { tipo: 'json', rotulo: 'Condição' })}</td>
            <td>${campo(`regras_transversais.${k}.acao`, { area: true })}</td>
            <td>${campo(`regras_transversais.${k}.esforco`, { opcoes: ['Baixo', 'Médio', 'Alto'] })}</td><td>${campo(`regras_transversais.${k}.horizonte`, { opcoes: ['Curto', 'Médio', 'Longo'] })}</td></tr>`).join('')}
        </tbody></table>`;
    } else {
      const { erros, mudancas } = validar();
      corpo.innerHTML = `
        <h2>Publicar nova versão do modelo</h2>
        <p>Publicar gera o arquivo <code>dados.json</code> com a nova versão. Para que a página passe a usá-la, substitua o arquivo no repositório. Aplicações em andamento sob a versão anterior serão interrompidas (FE-02) e precisarão ser reiniciadas.</p>
        <h3>O que mudou</h3>
        ${mudancas.length ? `<ul class="lista-mudancas">${mudancas.map(m => `<li>${esc(m)}</li>`).join('')}</ul>` : '<p class="nota">Nenhuma alteração em relação à versão publicada.</p>'}
        <form data-form-publicar class="formulario">
          <div class="linha-2">
            <label>Nova versão <input name="versao" required value="${esc(proximaVersao(base.versao_modelo))}" pattern="\\d+\\.\\d+\\.\\d+"></label>
            <label>Data <input name="data" type="date" required value="${new Date().toISOString().slice(0, 10)}"></label>
          </div>
          <label>Por que mudou (evidência que justifica o ajuste)
            <textarea name="notas" rows="3" required placeholder="Ex.: avaliação com especialistas (V3) indicou que…"></textarea></label>
          <div class="acoes"><button type="submit" class="btn btn-pri" ${erros.length ? 'disabled' : ''}>Publicar e baixar dados.json</button></div>
          ${erros.length ? '<p class="aviso aviso-erro">Corrija as inconsistências acima para publicar.</p>' : ''}
        </form>`;
    }
    validar();
  }

  el.addEventListener('click', ev => {
    const b = ev.target.closest('button');
    if (!b) return;
    if (b.dataset.aba) { aba = b.dataset.aba; desenhar(); }
    if (b.dataset.dim) { filtroDim = b.dataset.dim; desenhar(); }
    if (b.dataset.acao === 'descartar') {
      if (confirm('Descartar todas as alterações do rascunho e voltar à versão publicada?')) {
        descartarRascunhoModelo();
        rascunho = structuredClone(base);
        desenhar();
        notificar('Rascunho descartado.');
      }
    }
  });

  // Edição genérica por caminho: cada campo sabe onde fica no rascunho.
  el.addEventListener('input', ev => {
    const c = ev.target.closest('[data-caminho]');
    if (!c) return;
    let valor;
    switch (c.dataset.tipo) {
      case 'num': valor = c.value === '' ? NaN : Number(c.value); break;
      case 'bool': valor = c.checked; break;
      case 'json':
        try { valor = JSON.parse(c.value); c.classList.remove('invalido'); } catch { c.classList.add('invalido'); return; }
        break;
      default: valor = c.value;
    }
    definir(rascunho, c.dataset.caminho, valor);
    salvarRascunhoModelo(rascunho);
    validar();
  });
  el.addEventListener('change', async ev => {
    if (ev.target.dataset.caminho && ev.target.type === 'checkbox') {
      definir(rascunho, ev.target.dataset.caminho, ev.target.checked);
      salvarRascunhoModelo(rascunho);
      validar();
    }
    if (ev.target.dataset.acao === 'carregar' && ev.target.files[0]) {
      try {
        const novo = JSON.parse(await lerArquivo(ev.target.files[0]));
        if (!novo.dimensoes || !novo.itens) throw new Error('estrutura inesperada');
        rascunho = novo;
        salvarRascunhoModelo(rascunho);
        desenhar();
        notificar(`Arquivo carregado como rascunho (versão ${novo.versao_modelo}).`);
      } catch (e) {
        notificar(`Não foi possível carregar o arquivo: ${e.message}`);
      }
      ev.target.value = '';
    }
  });

  el.addEventListener('submit', ev => {
    if (!ev.target.matches('[data-form-publicar]')) return;
    ev.preventDefault();
    const dados = Object.fromEntries(new FormData(ev.target));
    const { erros, mudancas } = validar();
    // Exceção de UC-10: parâmetros inconsistentes — recusa e mantém a versão anterior.
    if (erros.length) { notificar('Publicação recusada: o modelo tem inconsistências.'); return; }
    if (!/^\d+\.\d+\.\d+$/.test(dados.versao) || compararVersao(dados.versao, base.versao_modelo) <= 0) {
      notificar(`A nova versão deve ser posterior a ${base.versao_modelo}.`);
      return;
    }
    if (!dados.notas.trim()) { notificar('Registre o que mudou e por quê.'); return; }
    const publicado = structuredClone(rascunho);
    publicado.versao_modelo = dados.versao;
    publicado.data_versao = dados.data;
    publicado.notas_versao = dados.notas.trim();
    publicado.historico_versoes = [
      ...(base.historico_versoes || [{ versao: base.versao_modelo, data: base.data_versao, notas: base.notas_versao, alteracoes: [] }]),
      { versao: dados.versao, data: dados.data, notas: dados.notas.trim(), alteracoes: mudancas },
    ];
    // Ordem de chaves estável, como no arquivo original
    const ordenado = { versao_modelo: publicado.versao_modelo, data_versao: publicado.data_versao, notas_versao: publicado.notas_versao, ...publicado };
    baixarArquivo('dados.json', `${JSON.stringify(ordenado, null, 2)}\n`);
    notificar(`Versão ${dados.versao} gerada. Substitua o dados.json do repositório para publicá-la.`);
  });

  desenhar();
}
