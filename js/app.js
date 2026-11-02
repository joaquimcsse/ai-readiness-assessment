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
import { esc, dataBR, nomeNivel, notificar, lerArquivo, lerArquivoBinario, rotuloPorte, icone } from './ui.js';
import { descartarGraficos } from './graficos.js';
import { limparAnimacoes } from './animacoes.js';
import { renderInicio } from './inicio.js';
import { abrirExportacao } from './exportacao.js';
import { carregarExcelJS, carregarECharts } from './bibliotecas.js';
import { lerPlanilha } from './planilha.js';

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
  descartarGraficos();
  limparAnimacoes();
  const el = document.createElement('div');
  el.className = `tela ${classe}`;
  principal.replaceChildren(el);
  principal.dataset.tela = classe;
  document.body.dataset.tela = classe || 'ferramenta';
  principal.focus({ preventScroll: true });
  window.scrollTo(0, 0);
  return el;
}

function ir(rota) {
  if (location.hash === rota) roteador();
  else location.hash = rota;
}

const ROTAS_PESQUISA = ['avaliacao', 'manutencao', 'sobre'];
const grupoPesquisa = document.getElementById('menu-pesquisa');

function marcarMenu(rota) {
  document.querySelectorAll('.menu a').forEach(a => {
    const ativo = a.dataset.rota === rota;
    a.classList.toggle('ativo', ativo);
    if (ativo) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current');
  });
  grupoPesquisa.querySelector('summary').classList.toggle('ativo', ROTAS_PESQUISA.includes(rota));
  grupoPesquisa.open = false;
}

// O grupo "Pesquisa" fecha ao clicar fora dele.
document.addEventListener('click', ev => {
  if (grupoPesquisa.open && !grupoPesquisa.contains(ev.target)) grupoPesquisa.open = false;
});

// "Diagnóstico" no menu leva ao ponto em que o gestor parou.
function telaAplicacao() {
  const app = estado.aplicacaoAtual();
  if (!app) ir('#/ficha');
  else if (app.diagnostico) ir('#/diagnostico');
  else ir('#/questionario');
}

// FE-02: a versão do modelo fixada no início difere da carregada.
function versaoDivergente(app) {
  return app && app.versaoModelo !== modelo.versao_modelo && app.estado !== estado.ESTADOS.ARQUIVADA && !app.diagnostico;
}

function telaVersaoDivergente(el, app) {
  el.innerHTML = `<section class="painel estreito">
    <h1>O modelo foi atualizado</h1>
    <p class="sub">Esta aplicação começou na versão ${esc(app.versaoModelo)} do modelo; a página usa a ${esc(modelo.versao_modelo)}. Para não misturar versões, recomece com os mesmos dados da empresa.</p>
    <div class="form-rodape" style="margin-top:20px"><span></span><button type="button" class="btn btn-pri" data-acao="reiniciar">Recomeçar</button></div>
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
  const emCurso = Boolean(app && app.estado !== estado.ESTADOS.ARQUIVADA);
  renderInicio(el, {
    modelo, app, emCurso,
    respondidas: app ? estado.contarRespondidas(app) : 0,
    semArmazenamento: !estado.armazenamentoDisponivel(),
    caso: CASO_AURORA,
  });
  el.addEventListener('click', ev => {
    const b = ev.target.closest('[data-acao]');
    if (!b) return;
    if (b.dataset.acao === 'demo') carregarDemonstracao();
    if (b.dataset.acao === 'continuar') telaAplicacao();
    if (b.dataset.acao === 'nova') {
      const atual = estado.aplicacaoAtual();
      if (atual && atual.estado !== estado.ESTADOS.ARQUIVADA && estado.contarRespondidas(atual) > 0 &&
          !confirm('Há um diagnóstico em andamento. Ele continua no Histórico. Começar outro?')) return;
      estado.definirAtual(null);
      ir('#/ficha');
    }
  });
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

function telaQuestionario(item) {
  const el = novaTela();
  const app = estado.aplicacaoAtual();
  if (!app) { ir('#/ficha'); return; }
  if (versaoDivergente(app)) { telaVersaoDivergente(el, app); return; }
  renderQuestionario(el, {
    modelo,
    app,
    itemInicial: item || null,
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
      novaTela().innerHTML = `<section class="painel estreito"><div class="aviso aviso-erro" role="alert">${icone('alerta')}<p><strong>Cálculo interrompido.</strong> ${esc(e.message)}</p></div></section>`;
    }
  }
}

function telaDiagnostico(id) {
  const el = novaTela();
  const app = id ? estado.obterAplicacao(id) : estado.aplicacaoAtual();
  if (!app) { ir('#/inicio'); return; }
  if (!app.diagnostico) {
    el.innerHTML = `<section class="painel estreito"><h1>Diagnóstico ainda não gerado</h1>
      <p class="sub">${esc(estado.SIGNIFICADO_ESTADO[app.estado])}</p>
      <div class="form-rodape" style="margin-top:20px"><span></span><a class="btn btn-pri" href="#/questionario">Continuar questionário</a></div></section>`;
    return;
  }
  const outras = estado.listarAplicacoes().filter(a => a.id !== app.id && a.diagnostico);
  renderDiagnostico(el, {
    modelo,
    app,
    temAnteriores: outras.length > 0,
    aoExportar: () => abrirExportacao({
      app,
      modelo,
      aoFechar: exportou => {
        if (exportou) notificar('Diagnóstico exportado. A aplicação foi arquivada.');
        telaDiagnostico(id);
      },
    }),
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
  carregarECharts().catch(() => {}); // a comparação usa gráficos
  const apps = estado.listarAplicacoes();
  const atual = estado.aplicacaoAtual();
  const meses = modelo.reaplicacao.map(r => r.meses);
  el.innerHTML = `
    <header class="pagina-cab">
      <div>
        <h1>Histórico</h1>
        <p class="sub">Diagnósticos guardados neste navegador. Marque dois para comparar.</p>
      </div>
      <div class="acoes">
        <label class="btn btn-sec">Importar planilha<input type="file" accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,.json" data-acao="importar" multiple hidden></label>
        <button type="button" class="btn btn-pri" data-acao="comparar" disabled aria-describedby="dica-comparar">Comparar</button>
      </div>
    </header>
    ${apps.length ? `<section class="painel painel-flush">
      <table class="tabela tabela-historico">
        <thead><tr><th><span class="sr">Selecionar</span></th><th>Empresa</th><th>Data</th><th>Situação</th><th class="num">Nível</th><th><span class="sr">Ações</span></th></tr></thead>
        <tbody>${apps.map(a => `<tr class="${atual?.id === a.id ? 'linha-atual' : ''}">
          <td class="col-sel">${a.diagnostico ? `<input type="checkbox" data-sel="${esc(a.id)}" aria-label="Selecionar ${esc(a.empresa.identificador)} de ${dataBR(a.data)}">` : ''}</td>
          <td class="col-empresa"><strong>${esc(a.empresa.identificador)}</strong><br><small>${esc(a.empresa.setor)} · ${esc(rotuloPorte(a.empresa.porte))}${a.origem === 'importada' ? ' · importada' : ''}${a.anterior ? ' · reaplicação' : ''}</small></td>
          <td data-rotulo="Data">${dataBR(a.data)}<br><small>modelo ${esc(a.diagnostico?.versaoModelo || a.versaoModelo)}</small></td>
          <td data-rotulo="Situação">${esc(a.estado)}${atual?.id === a.id ? ' <small>· atual</small>' : ''}</td>
          <td class="num" data-rotulo="Nível">${a.diagnostico ? `<strong>${a.diagnostico.nivelFinal}</strong> <small>${esc(nomeNivel(modelo, a.diagnostico.nivelFinal))}</small>` : `<small>${estado.contarRespondidas(a)}/${modelo.itens.length}</small>`}</td>
          <td class="acoes-linha">
            ${a.diagnostico ? `<a class="link" href="#/diagnostico/${esc(a.id)}">Abrir</a> <button type="button" class="link" data-exp="${esc(a.id)}">Exportar</button>` : `<button type="button" class="link" data-cont="${esc(a.id)}">Continuar</button>`}
            <button type="button" class="link perigo" data-del="${esc(a.id)}">Excluir</button>
          </td></tr>`).join('')}</tbody></table>
    </section>
    <p class="nota" id="dica-comparar">Só diagnósticos da mesma versão do modelo são comparáveis. Reaplique a cada ${Math.min(...meses)} a ${Math.max(...meses)} meses, conforme o nível.</p>`
    : `<section class="painel estreito" style="text-align:center;padding:48px 24px">
        <h2>Nenhum diagnóstico neste navegador</h2>
        <p class="nota">Comece um novo ou importe uma planilha exportada.</p>
        <a class="btn btn-pri" href="#/ficha">Iniciar diagnóstico</a>
      </section><p class="nota" id="dica-comparar" hidden></p>`}`;

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
          const { jaExistia } = estado.importarDiagnostico(await lerPacote(arq));
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
    if (b.dataset.exp) abrirExportacao({ app: estado.obterAplicacao(b.dataset.exp), modelo, aoFechar: () => telaHistorico() });
    if (b.dataset.cont) { estado.definirAtual(b.dataset.cont); ir('#/questionario'); }
    if (b.dataset.del && confirm('Excluir esta aplicação deste navegador? Se ela não foi exportada, não poderá ser recuperada.')) {
      estado.excluirAplicacao(b.dataset.del);
      telaHistorico();
    }
  });
}

// Planilha exportada (a partir da versão 1.3.0) ou JSON de versões anteriores.
async function lerPacote(arquivo) {
  if (/\.json$/i.test(arquivo.name)) return estado.pacoteDeJson(await lerArquivo(arquivo));
  return lerPlanilha(await lerArquivoBinario(arquivo), await carregarExcelJS());
}

function telaComparar(idA, idB) {
  const el = novaTela();
  const a = estado.obterAplicacao(idA);
  const b = estado.obterAplicacao(idB);
  el.innerHTML = `<header class="pagina-cab">
      <div><a class="link nao-imprimir" href="#/historico">${icone('voltar')} Histórico</a><h1 style="margin-top:8px">Comparação</h1></div>
      <div class="acoes nao-imprimir"><button type="button" class="btn btn-sec" data-acao="imprimir">Imprimir</button></div>
    </header>
    <div data-comp></div>`;
  el.querySelector('[data-acao="imprimir"]').addEventListener('click', () => window.print());
  if (!a?.diagnostico || !b?.diagnostico) {
    el.querySelector('[data-comp]').innerHTML = `<p class="aviso aviso-erro">${icone('alerta')}<span>Uma das aplicações não foi encontrada ou não tem diagnóstico.</span></p>`;
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
    aplicacao: ['aplicacao', telaAplicacao],
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
  estado.registrarAberturaGuia();
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
    principal.innerHTML = `<section class="painel estreito"><div class="aviso aviso-erro" role="alert">${icone('alerta')}
      <p><strong>Não foi possível carregar o modelo (dados.json).</strong> ${esc(e.message)}</p></div>
      <p class="nota">Aberto direto do disco? Sirva a pasta, por exemplo com <code>python3 -m http.server</code>, e acesse <code>http://localhost:8000</code>.</p></section>`;
    return;
  }
  const erros = validarModelo(modelo);
  if (erros.length) {
    principal.innerHTML = `<section class="painel estreito"><div class="aviso aviso-erro" role="alert">${icone('alerta')}
      <div><strong>Parâmetros do modelo inválidos.</strong> O diagnóstico não será calculado com um modelo inconsistente.
      <ul>${erros.map(x => `<li>${esc(x)}</li>`).join('')}</ul></div></div></section>`;
    return;
  }
  renderGuia(document.getElementById('guia-conteudo'), modelo);
  window.addEventListener('hashchange', roteador);
  roteador();
}

iniciar();
