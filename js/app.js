// app.js — documento raiz em execução: carrega o contrato de dados, instancia
// os módulos de cada camada e conduz o processo de aplicação (Fig. 5) entre
// as telas. Depois do carregamento de dados.json, nenhuma requisição de rede
// é feita.

import { diagnosticar, ErroDiagnostico } from './nucleo.js';
import { validarModelo } from './validacao.js';
import * as estado from './estado.js';
import { renderFicha, renderQuestionario, renderGuia } from './coleta.js';
import { renderDiagnostico, renderComparacao } from './painel.js';
import { renderManutencao } from './manutencao.js';
import { renderAvaliacao } from './avaliacao.js';
import { renderSobre } from './sobre.js';
import { esc, dataBR, nomeNivel, notificar, lerArquivo, rotuloPorte } from './ui.js';

const URL_DADOS = 'dados.json';
const principal = document.getElementById('conteudo');
let modelo = null;

// Caso ilustrativo da seção 4 (Metalmecânica Aurora), usado na demonstração (V1).
const CASO_AURORA = {
  ficha: { identificador: 'Metalmecânica Aurora (caso ilustrativo)', setor: 'Indústria metalmecânica', porte: 'pequena', funcionarios: 42, respondente: 'Demonstração' },
  respostas: { D0: [4, 4, 3, 3], D1: [2, 2, 1, 2, 2], D2: [4, 5, 4, 3, 4], D3: [3, 2, 3, 3, 2, 3], D4: [2, 3, 2, 3, 2], D5: [4, 4, 3, 2, 3] },
};

// ------------------------------------------------------------ utilidades de tela
function novaTela(classe = '') {
  const el = document.createElement('div');
  el.className = `tela ${classe}`;
  principal.replaceChildren(el);
  principal.focus({ preventScroll: true });
  window.scrollTo(0, 0);
  return el;
}

function ir(rota) {
  if (location.hash === rota) roteador();
  else location.hash = rota;
}

function marcarMenu(rota) {
  document.querySelectorAll('.menu a').forEach(a => {
    const ativo = a.dataset.rota === rota;
    a.classList.toggle('ativo', ativo);
    if (ativo) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current');
  });
}

// FE-02: a versão do modelo fixada no início difere da carregada.
function versaoDivergente(app) {
  return app && app.versaoModelo !== modelo.versao_modelo && app.estado !== estado.ESTADOS.ARQUIVADA && !app.diagnostico;
}

function telaVersaoDivergente(el, app) {
  el.innerHTML = `<section class="cartao estreito">
    <h1>O modelo foi atualizado</h1>
    <div class="aviso aviso-erro" role="alert"><strong>Cálculo interrompido (FE-02).</strong> Esta aplicação foi iniciada sob a versão <strong>${esc(app.versaoModelo)}</strong> do modelo, mas a página agora usa a versão <strong>${esc(modelo.versao_modelo)}</strong>. Para não misturar respostas coletadas sob modelos distintos, a aplicação precisa ser reiniciada.</div>
    <div class="acoes"><button type="button" class="btn btn-pri" data-acao="reiniciar">Reiniciar com a mesma ficha</button></div>
  </section>`;
  el.querySelector('[data-acao="reiniciar"]').addEventListener('click', () => {
    estado.iniciarAplicacao({ ...app.empresa, respondente: app.respondente, data: estado.hojeISO() }, modelo.versao_modelo, app.anterior);
    notificar('Nova aplicação iniciada com a versão atual do modelo.');
    ir('#/questionario');
  });
}

// ------------------------------------------------------------ telas
function telaInicio() {
  const el = novaTela('inicio');
  const app = estado.aplicacaoAtual();
  const total = modelo.itens.length;
  const respondidas = app ? estado.contarRespondidas(app) : 0;
  const semArmazenamento = !estado.armazenamentoDisponivel();

  el.innerHTML = `
    <section class="heroi">
      <div class="heroi-texto">
        <p class="etapa-rotulo">Diagnóstico autoaplicável · 20 a 30 minutos · gratuito</p>
        <h1>A sua empresa está pronta para a Inteligência Artificial — ou algo vai travar o investimento?</h1>
        <p class="lead">Responda ${total} afirmações sobre como a empresa trabalha hoje. O MGP-PME calcula o perfil de prontidão em seis dimensões, identifica o <strong>gargalo</strong> que limita o avanço e entrega um <strong>roteiro de ação priorizado</strong> — sem consultoria, sem cadastro e sem enviar nenhum dado para fora deste navegador.</p>
        <div class="acoes acoes-esq">
          ${app && app.estado !== estado.ESTADOS.ARQUIVADA
            ? `<a class="btn btn-pri" href="${app.diagnostico ? '#/diagnostico' : '#/questionario'}">${app.diagnostico ? 'Ver diagnóstico atual' : `Continuar aplicação (${respondidas}/${total})`}</a>
               <button type="button" class="btn btn-sec" data-acao="nova">Iniciar nova aplicação</button>`
            : '<button type="button" class="btn btn-pri" data-acao="nova">Iniciar aplicação</button>'}
          <button type="button" class="btn btn-sec" data-acao="demo">Ver exemplo preenchido</button>
        </div>
        ${semArmazenamento ? '<p class="aviso aviso-alerta">O armazenamento local deste navegador está indisponível (janela anônima ou bloqueio). Você pode aplicar o instrumento, mas exporte o diagnóstico antes de fechar a página.</p>' : ''}
      </div>
      <ol class="passos">
        <li><strong>Ficha da empresa</strong><span>2 a 3 min</span></li>
        <li><strong>${total} afirmações em 3 blocos</strong><span>13 a 18 min</span></li>
        <li><strong>Perfil, nível e roteiro</strong><span>4 a 6 min</span></li>
        <li><strong>Exportar e arquivar</strong><span>até 1 min</span></li>
      </ol>
    </section>

    <section class="cartao">
      <h2>O que o diagnóstico considera</h2>
      <div class="grade-dimensoes">
        ${modelo.dimensoes.map(d => `<div class="dim-cartao ${d.critica ? 'critica' : ''}">
          <span class="cod-dim">${esc(d.codigo)}</span>
          <h3>${esc(d.nome)}</h3>
          <p>${esc(d.definicao.split('. ')[0])}.</p>
          ${d.critica ? '<span class="selo selo-critica">crítica — limita o nível</span>' : ''}
        </div>`).join('')}
      </div>
      <p class="nota"><strong>Por que “gargalo”?</strong> Em uma média comum, um ponto forte compensa um ponto fraco. Aqui não: o nível da empresa nunca ultrapassa o da dimensão crítica mais fraca (${modelo.dimensoes.filter(d => d.critica).map(d => esc(d.nome)).join(', ')}). Uma estratégia clara não sustenta uma solução de IA se faltam dados que a alimentem.</p>
    </section>

    ${app ? `<section class="cartao">
      <h2>Aplicação atual</h2>
      <p>${esc(app.empresa.identificador)} · ${dataBR(app.data)} · <span class="selo selo-estado">${esc(app.estado)}</span> — ${esc(estado.SIGNIFICADO_ESTADO[app.estado])}</p>
    </section>` : ''}`;

  el.querySelector('[data-acao="nova"]')?.addEventListener('click', () => {
    const atual = estado.aplicacaoAtual();
    if (atual && atual.estado !== estado.ESTADOS.ARQUIVADA && estado.contarRespondidas(atual) > 0 &&
        !confirm('Já existe uma aplicação em andamento. Ela continuará disponível no Histórico. Iniciar uma nova?')) return;
    estado.definirAtual(null);
    ir('#/ficha');
  });
  el.querySelector('[data-acao="demo"]').addEventListener('click', carregarDemonstracao);
}

function carregarDemonstracao() {
  const app = estado.iniciarAplicacao({ ...CASO_AURORA.ficha, data: estado.hojeISO() }, modelo.versao_modelo);
  for (const d of modelo.dimensoes) {
    modelo.itens.filter(i => i.dimensao === d.codigo).forEach((it, k) => {
      estado.registrarResposta(app, it.codigo, CASO_AURORA.respostas[d.codigo][k], modelo.itens.length);
    });
  }
  gerarDiagnostico(app);
  notificar('Caso ilustrativo carregado: Metalmecânica Aurora.');
}

function telaFicha() {
  const el = novaTela();
  const app = estado.aplicacaoAtual();
  const editavel = app && app.estado !== estado.ESTADOS.ARQUIVADA ? app : null;
  renderFicha(el, {
    modelo,
    app: editavel,
    aoCancelar: () => history.length > 1 ? history.back() : ir('#/inicio'),
    aoSalvar: ficha => {
      if (editavel) estado.atualizarFicha(editavel, ficha);
      else estado.iniciarAplicacao(ficha, modelo.versao_modelo);
      ir('#/questionario');
    },
  });
}

function telaQuestionario(bloco) {
  const el = novaTela();
  const app = estado.aplicacaoAtual();
  if (!app) { ir('#/ficha'); return; }
  if (versaoDivergente(app)) { telaVersaoDivergente(el, app); return; }
  renderQuestionario(el, {
    modelo,
    app,
    blocoInicial: Number(bloco) || 0,
    aoResponder: (item, valor) => estado.registrarResposta(app, item, valor, modelo.itens.length),
    aoGerar: () => (app.diagnostico ? ir('#/diagnostico') : gerarDiagnostico(app)),
    aoEditarFicha: () => ir('#/ficha'),
  });
}

// UC-05 — Gerar diagnóstico de prontidão.
function gerarDiagnostico(app) {
  try {
    const diag = diagnosticar(app.respostas, modelo, { versaoFixada: app.versaoModelo, data: app.data });
    estado.registrarDiagnostico(app, diag);
    ir('#/diagnostico');
  } catch (e) {
    if (!(e instanceof ErroDiagnostico)) throw e;
    if (e.codigo === 'FE-01') {
      estado.devolverParaPreenchimento(app);
      notificar(e.message);
      ir('#/questionario');
    } else if (e.codigo === 'FE-02') {
      telaVersaoDivergente(novaTela(), app);
    } else {
      novaTela().innerHTML = `<section class="cartao estreito"><div class="aviso aviso-erro" role="alert"><strong>Cálculo interrompido (${esc(e.codigo)}).</strong> ${esc(e.message)}</div></section>`;
    }
  }
}

function telaDiagnostico(id) {
  const el = novaTela();
  const app = id ? estado.obterAplicacao(id) : estado.aplicacaoAtual();
  if (!app) { ir('#/inicio'); return; }
  if (!app.diagnostico) {
    el.innerHTML = `<section class="cartao estreito"><h1>Diagnóstico ainda não gerado</h1>
      <p>Esta aplicação está no estado <strong>${esc(app.estado)}</strong>: ${esc(estado.SIGNIFICADO_ESTADO[app.estado])}</p>
      <div class="acoes"><a class="btn btn-pri" href="#/questionario">Ir ao questionário</a></div></section>`;
    return;
  }
  const outras = estado.listarAplicacoes().filter(a => a.id !== app.id && a.diagnostico);
  renderDiagnostico(el, {
    modelo,
    app,
    temAnteriores: outras.length > 0,
    aoExportar: () => {
      estado.exportarDiagnostico(app);
      notificar('Diagnóstico exportado. A aplicação foi arquivada.');
      telaDiagnostico(id);
    },
    aoCorrigir: () => { estado.definirAtual(app.id); ir('#/questionario'); },
    aoReaplicar: () => {
      estado.iniciarAplicacao({ ...app.empresa, respondente: app.respondente, data: estado.hojeISO() }, modelo.versao_modelo, app.id);
      ir('#/ficha');
    },
    aoComparar: () => {
      const anterior = outras.find(a => a.id === app.anterior) ||
        outras.find(a => a.empresa.identificador === app.empresa.identificador) || outras[0];
      ir(`#/comparar/${anterior.id}/${app.id}`);
    },
    aoResponsavel: (regra, nome) => estado.definirResponsavel(app, regra, nome),
  });
}

// UC-09 — histórico, importação e comparação.
function telaHistorico() {
  const el = novaTela();
  const apps = estado.listarAplicacoes();
  const atual = estado.aplicacaoAtual();
  el.innerHTML = `
    <section class="cartao">
      <p class="etapa-rotulo">UC-08 e UC-09 · Exportar, reaplicar e comparar</p>
      <h1>Histórico de aplicações</h1>
      <p class="lead">Aplicações guardadas neste navegador e diagnósticos importados de arquivo. Selecione duas para comparar a evolução — só são comparáveis diagnósticos da mesma versão do modelo.</p>
      <div class="acoes acoes-esq">
        <label class="btn btn-sec">Importar diagnóstico exportado (.json)<input type="file" accept="application/json,.json" data-acao="importar" multiple hidden></label>
        <button type="button" class="btn btn-pri" data-acao="comparar" disabled>Comparar selecionadas</button>
      </div>
    </section>
    <section class="cartao">
      ${apps.length ? `<table class="tabela tabela-historico">
        <thead><tr><th><span class="sr">Selecionar</span></th><th>Empresa</th><th>Data</th><th>Estado</th><th class="num">Nível</th><th>Modelo</th><th></th></tr></thead>
        <tbody>${apps.map(a => `<tr class="${atual?.id === a.id ? 'linha-atual' : ''}">
          <td>${a.diagnostico ? `<input type="checkbox" data-sel="${esc(a.id)}" aria-label="Selecionar ${esc(a.empresa.identificador)} de ${dataBR(a.data)}">` : ''}</td>
          <td><strong>${esc(a.empresa.identificador)}</strong><br><small>${esc(a.empresa.setor)} · ${esc(rotuloPorte(a.empresa.porte))}${a.origem === 'importada' ? ' · importada' : ''}${a.anterior ? ' · reaplicação' : ''}</small></td>
          <td>${dataBR(a.data)}</td>
          <td><span class="selo selo-estado">${esc(a.estado)}</span>${atual?.id === a.id ? '<br><small>atual</small>' : ''}</td>
          <td class="num">${a.diagnostico ? `<strong>${a.diagnostico.nivelFinal}</strong> <small>${esc(nomeNivel(modelo, a.diagnostico.nivelFinal))}</small>` : `${estado.contarRespondidas(a)}/${modelo.itens.length}`}</td>
          <td>${esc(a.diagnostico?.versaoModelo || a.versaoModelo)}</td>
          <td class="acoes-linha">
            ${a.diagnostico ? `<a class="link" href="#/diagnostico/${esc(a.id)}">abrir</a> <button type="button" class="link" data-exp="${esc(a.id)}">exportar</button>` : `<button type="button" class="link" data-cont="${esc(a.id)}">continuar</button>`}
            <button type="button" class="link perigo" data-del="${esc(a.id)}">excluir</button>
          </td></tr>`).join('')}</tbody></table>`
      : '<p class="nota">Nenhuma aplicação registrada neste navegador. Inicie uma aplicação ou importe um diagnóstico exportado.</p>'}
    </section>
    <section class="cartao">
      <h2>Ciclo de reaplicação</h2>
      <p>A prontidão muda. O valor do instrumento está tanto no diagnóstico quanto na comparação entre diagnósticos sucessivos. Quanto menor o nível, mais curto o intervalo, porque as ações de curto prazo produzem mudança mensurável mais depressa.</p>
      <table class="tabela compacta"><thead><tr><th>Nível</th><th>Periodicidade</th><th>Antecipe se…</th></tr></thead><tbody>
        ${modelo.reaplicacao.map(r => `<tr><td>${r.niveis.join(' e ')}</td><td>a cada ${r.meses} meses</td><td>${esc(r.gatilho)}</td></tr>`).join('')}
      </tbody></table>
    </section>`;

  const btnComparar = el.querySelector('[data-acao="comparar"]');
  const selecionados = () => [...el.querySelectorAll('[data-sel]:checked')].map(c => c.dataset.sel);
  el.addEventListener('change', async ev => {
    if (ev.target.dataset.sel !== undefined) {
      const sel = selecionados();
      if (sel.length > 2) { ev.target.checked = false; notificar('Selecione apenas duas aplicações.'); }
      btnComparar.disabled = selecionados().length !== 2;
    }
    if (ev.target.dataset.acao === 'importar') {
      let ok = 0;
      for (const arq of ev.target.files) {
        try {
          const { jaExistia } = estado.importarDiagnostico(await lerArquivo(arq));
          if (!jaExistia) ok++;
          else notificar(`${arq.name}: diagnóstico já estava no histórico.`);
        } catch (e) {
          notificar(`${arq.name}: ${e.message}`);
        }
      }
      if (ok) { notificar(`${ok} diagnóstico(s) importado(s).`); telaHistorico(); }
    }
  });
  el.addEventListener('click', ev => {
    const b = ev.target.closest('button');
    if (!b) return;
    if (b.dataset.acao === 'comparar') { const [x, y] = selecionados(); ir(`#/comparar/${x}/${y}`); }
    if (b.dataset.exp) { estado.exportarDiagnostico(estado.obterAplicacao(b.dataset.exp)); notificar('Diagnóstico exportado.'); telaHistorico(); }
    if (b.dataset.cont) { estado.definirAtual(b.dataset.cont); ir('#/questionario'); }
    if (b.dataset.del && confirm('Excluir esta aplicação deste navegador? Se ela não foi exportada, não poderá ser recuperada.')) {
      estado.excluirAplicacao(b.dataset.del);
      telaHistorico();
    }
  });
}

function telaComparar(idA, idB) {
  const el = novaTela();
  const a = estado.obterAplicacao(idA);
  const b = estado.obterAplicacao(idB);
  el.innerHTML = `<section class="cartao"><p class="etapa-rotulo">UC-09 · Reaplicar o instrumento e comparar resultados</p>
    <h1>Comparação entre aplicações</h1>
    <div class="acoes acoes-esq nao-imprimir"><a class="btn btn-sec" href="#/historico">← Histórico</a><button type="button" class="btn btn-sec" data-acao="imprimir">Imprimir</button></div>
    <div data-comp></div></section>`;
  el.querySelector('[data-acao="imprimir"]').addEventListener('click', () => window.print());
  if (!a?.diagnostico || !b?.diagnostico) {
    el.querySelector('[data-comp]').innerHTML = '<p class="aviso aviso-erro">Uma das aplicações não foi encontrada ou não tem diagnóstico.</p>';
    return;
  }
  renderComparacao(el.querySelector('[data-comp]'), { modelo, a, b });
}

// ------------------------------------------------------------ roteador
function roteador() {
  const [rota, ...args] = location.hash.replace(/^#\/?/, '').split('/');
  fecharGuia();
  const mapa = {
    '': ['inicio', telaInicio],
    inicio: ['inicio', telaInicio],
    ficha: ['aplicacao', telaFicha],
    questionario: ['aplicacao', () => telaQuestionario(args[0])],
    diagnostico: ['aplicacao', () => telaDiagnostico(args[0])],
    historico: ['historico', telaHistorico],
    comparar: ['historico', () => telaComparar(args[0], args[1])],
    avaliacao: ['avaliacao', () => renderAvaliacao(novaTela(), { modelo })],
    manutencao: ['manutencao', () => renderManutencao(novaTela(), { modelo })],
    sobre: ['sobre', () => renderSobre(novaTela(), { modelo })],
  };
  const [menu, tela] = mapa[rota] || mapa[''];
  marcarMenu(menu);
  tela();
}

// ------------------------------------------------------------ guia (CP-14)
const guia = document.getElementById('guia');
const veu = document.getElementById('veu');
const botaoGuia = document.getElementById('abrir-guia');
function abrirGuia() {
  guia.hidden = false; veu.hidden = false;
  botaoGuia.setAttribute('aria-expanded', 'true');
  document.getElementById('fechar-guia').focus();
}
function fecharGuia() {
  if (guia.hidden) return;
  guia.hidden = true; veu.hidden = true;
  botaoGuia.setAttribute('aria-expanded', 'false');
}
botaoGuia.addEventListener('click', () => (guia.hidden ? abrirGuia() : fecharGuia()));
document.getElementById('fechar-guia').addEventListener('click', () => { fecharGuia(); botaoGuia.focus(); });
veu.addEventListener('click', fecharGuia);
document.addEventListener('keydown', ev => { if (ev.key === 'Escape') fecharGuia(); });

// ------------------------------------------------------------ inicialização
async function iniciar() {
  try {
    const resp = await fetch(URL_DADOS, { cache: 'no-cache' });
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    modelo = await resp.json();
  } catch (e) {
    principal.innerHTML = `<section class="cartao estreito"><div class="aviso aviso-erro" role="alert">
      <strong>Não foi possível carregar o modelo (dados.json).</strong> ${esc(e.message)}</div>
      <p>Se você abriu o arquivo <code>index.html</code> diretamente do disco, o navegador bloqueia a leitura do modelo. Use a versão publicada (GitHub Pages) ou sirva a pasta localmente, por exemplo com <code>python3 -m http.server</code>, e acesse <code>http://localhost:8000</code>.</p></section>`;
    return;
  }
  const erros = validarModelo(modelo);
  if (erros.length) {
    principal.innerHTML = `<section class="cartao estreito"><div class="aviso aviso-erro" role="alert">
      <strong>Parâmetros do modelo inválidos (FE-03).</strong> O diagnóstico não será calculado com um modelo inconsistente.
      <ul>${erros.map(x => `<li>${esc(x)}</li>`).join('')}</ul></div></section>`;
    return;
  }
  renderGuia(document.getElementById('guia-conteudo'), modelo);
  window.addEventListener('hashchange', roteador);
  roteador();
}

iniciar();
