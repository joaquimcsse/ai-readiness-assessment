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
import { esc, dataBR, nomeNivel, notificar, lerArquivo, lerArquivoBinario, rotuloPorte, citar, obterReferencia, referenciaCompleta } from './ui.js';
import { abrirExportacao } from './exportacao.js';
import { carregarExcelJS } from './bibliotecas.js';
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
  const el = document.createElement('div');
  el.className = `tela ${classe}`;
  principal.replaceChildren(el);
  principal.dataset.tela = classe;
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
  el.innerHTML = `<section class="cartao estreito">
    <h1>O modelo foi atualizado</h1>
    <div class="aviso aviso-erro" role="alert"><strong>Cálculo interrompido.</strong> Esta aplicação foi iniciada sob a versão <strong>${esc(app.versaoModelo)}</strong> do modelo, mas a página agora usa a versão <strong>${esc(modelo.versao_modelo)}</strong>. Para não misturar respostas coletadas sob modelos distintos, a aplicação precisa ser reiniciada.</div>
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

  const criticas = modelo.dimensoes.filter(d => d.critica);
  el.innerHTML = `
    <section class="lp-heroi">
      <div class="lp-heroi-texto">
        <p class="etapa-rotulo">Diagnóstico autoaplicável · gratuito</p>
        <h1>A sua empresa está pronta para a Inteligência Artificial, ou algo vai travar o investimento?</h1>
        <div class="acoes acoes-esq">
          ${app && app.estado !== estado.ESTADOS.ARQUIVADA
            ? `<a class="btn btn-pri" href="${app.diagnostico ? '#/diagnostico' : '#/questionario'}">${app.diagnostico ? 'Ver diagnóstico atual' : `Continuar aplicação (${respondidas}/${total})`}</a>
               <button type="button" class="btn btn-sec" data-acao="nova">Iniciar nova aplicação</button>`
            : '<button type="button" class="btn btn-pri" data-acao="nova">Iniciar aplicação</button>'}
          <button type="button" class="btn btn-sec" data-acao="demo">Ver exemplo preenchido</button>
        </div>
        ${app ? `<p class="lp-atual">Aplicação atual: <strong>${esc(app.empresa.identificador)}</strong> · ${dataBR(app.data)} · <span class="selo selo-estado">${esc(app.estado)}</span></p>` : ''}
        ${semArmazenamento ? '<p class="aviso aviso-alerta">O armazenamento local deste navegador está indisponível (janela anônima ou bloqueio). Você pode aplicar o instrumento, mas exporte o diagnóstico antes de fechar a página.</p>' : ''}
      </div>
      <figure class="lp-visual">
        ${svgExemplo()}
        <figcaption>Exemplo: pela média, a empresa estaria no nível 3. Mas <strong class="txt-F1">Dados</strong> é crítico e está no nível 2, então o nível atribuído é 2.</figcaption>
      </figure>
    </section>

    <section class="lp-secao">
      <h2>Como funciona</h2>
      <ol class="lp-passos">
        <li><span class="lp-num">1</span><strong>Ficha da empresa</strong><small>2 a 3 min</small></li>
        <li><span class="lp-num">2</span><strong>${total} afirmações em 3 blocos</strong><small>13 a 18 min</small></li>
        <li><span class="lp-num">3</span><strong>Perfil, nível e roteiro</strong><small>4 a 6 min</small></li>
        <li><span class="lp-num">4</span><strong>Exportar e arquivar</strong><small>até 1 min</small></li>
      </ol>
    </section>

    <section class="lp-secao">
      <h2>Estrutura do Diagnóstico</h2>
      <p class="lp-intro">A empresa é avaliada nos critérios abaixo. Os ${criticas.length} marcados como <span class="txt-F1">críticos</span> limitam o resultado: o nível final nunca fica acima do nível do critério crítico mais fraco.</p>
      <ul class="lp-dims">
        ${modelo.dimensoes.map(d => `<li class="${d.critica ? 'critica' : ''}">
          <div>
            <h3>${esc(d.nome)}${d.critica ? ' <span class="lp-tag-critica">crítico</span>' : ''}</h3>
            <p>${esc(d.resumo || d.definicao.split('. ')[0].replace(/\.$/, '') + '.')}</p>
            ${d.referencias?.length ? `<p class="lp-cita">${d.referencias.map(c => `<a href="#ref-${esc(c)}" data-ref="${esc(c)}">${esc(citar(modelo, [c]))}</a>`).join('; ')}</p>` : ''}
          </div>
        </li>`).join('')}
      </ul>
      <p class="nota">A definição completa de cada critério está no <button type="button" class="link" data-acao="guia">Guia</button>.</p>
    </section>

    ${secaoReferencias()}`;

  el.querySelector('[data-acao="guia"]').addEventListener('click', abrirGuia);
  el.querySelector('[data-acao="nova"]')?.addEventListener('click', () => {
    const atual = estado.aplicacaoAtual();
    if (atual && atual.estado !== estado.ESTADOS.ARQUIVADA && estado.contarRespondidas(atual) > 0 &&
        !confirm('Já existe uma aplicação em andamento. Ela continuará disponível no Histórico. Iniciar uma nova?')) return;
    estado.definirAtual(null);
    ir('#/ficha');
  });
  el.querySelector('[data-acao="demo"]').addEventListener('click', carregarDemonstracao);
  // as citações levam à referência completa; o roteamento usa o hash, então rola sem navegar
  el.addEventListener('click', ev => {
    const a = ev.target.closest('a[data-ref]');
    if (!a) return;
    ev.preventDefault();
    const alvo = document.getElementById(`ref-${a.dataset.ref}`);
    alvo?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    alvo?.classList.add('ref-destaque');
    setTimeout(() => alvo?.classList.remove('ref-destaque'), 1600);
  });
}

// Referências completas das obras citadas nas dimensões e nos itens, mais o
// método (DSR). Nas demais telas aparecem só como citação.
function secaoReferencias() {
  const chaves = new Set(['peffers2007']);
  modelo.dimensoes.forEach(d => (d.referencias || []).forEach(c => chaves.add(c)));
  modelo.itens.forEach(i => (i.fundamento?.referencias || []).forEach(c => chaves.add(c)));
  const refs = [...chaves].map(c => obterReferencia(modelo, c)).filter(Boolean)
    .sort((a, b) => a.autores.localeCompare(b.autores, 'pt-BR'));
  if (!refs.length) return '';
  return `<section class="lp-secao lp-refs" aria-labelledby="refs-titulo">
      <h2 id="refs-titulo">Base científica</h2>
      <p class="lp-intro">Os critérios e as afirmações do questionário vêm de uma revisão de estudos recentes sobre adoção de IA em PMEs, e o instrumento foi construído pelo método Design Science Research. Estas são as obras citadas na página e no questionário.</p>
      <ol class="referencias lp-referencias">
        ${refs.map(r => `<li id="ref-${esc(r.chave)}">${referenciaCompleta(r)}</li>`).join('')}
      </ol>
    </section>`;
}

// Ilustração da página inicial: perfil de exemplo em colunas, com o gargalo
// em destaque. Valores fixos, apenas para explicar o conceito.
function svgExemplo() {
  const dados = [['D0', 62.5, 'F2'], ['D1', 20, 'F1'], ['D2', 75, 'F3'], ['D3', 41.7, 'F2'], ['D4', 50, 'F2'], ['D5', 55, 'F2']];
  const base = 214, alt = 170, larg = 36, passo = 58, x0 = 44;
  const y = v => base - (v / 100) * alt;
  const grade = [0, 20, 40, 60, 80, 100].map(v => `<line class="grade" x1="30" x2="400" y1="${y(v)}" y2="${y(v)}"/><text class="eixo" x="22" y="${y(v) + 4}" text-anchor="end">${v}</text>`).join('');
  const barras = dados.map(([c, v, f], k) => {
    const x = x0 + k * passo;
    return `<rect class="barra barra-${f}" x="${x}" y="${y(v)}" width="${larg}" height="${base - y(v)}" rx="5"/>
      <text class="lp-cod ${f === 'F1' ? 'txt-F1' : ''}" x="${x + larg / 2}" y="${base + 20}" text-anchor="middle">${c}</text>`;
  }).join('');
  const xg = x0 + passo + larg / 2;
  return `<svg class="grafico-perfil lp-grafico" viewBox="0 0 410 240" role="img" aria-label="Exemplo de perfil: cinco critérios entre 40 e 75 pontos e o critério Dados com 20 pontos, marcada como gargalo. A média ponderada é 50.">
    ${grade}
    <line class="linha-global" x1="30" x2="400" y1="${y(50)}" y2="${y(50)}"/>
    <text class="rotulo-global" x="${x0 + passo + larg / 2}" y="${y(50) - 8}" text-anchor="middle">média 50</text>
    ${barras}
    <text class="lp-gargalo" x="${xg}" y="${y(20) - 10}" text-anchor="middle">gargalo</text>
  </svg>`;
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
      novaTela().innerHTML = `<section class="cartao estreito"><div class="aviso aviso-erro" role="alert"><strong>Cálculo interrompido.</strong> ${esc(e.message)}</div></section>`;
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
  const apps = estado.listarAplicacoes();
  const atual = estado.aplicacaoAtual();
  el.innerHTML = `
    <section class="cartao">
      <p class="etapa-rotulo">Exportar, reaplicar e comparar</p>
      <h1>Histórico de aplicações</h1>
      <p class="lead">Aplicações guardadas neste navegador e diagnósticos importados de arquivo. Selecione duas para comparar a evolução. Só são comparáveis diagnósticos da mesma versão do modelo.</p>
      <div class="acoes acoes-esq">
        <label class="btn btn-sec">Importar planilha exportada (.xlsx)<input type="file" accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,.json" data-acao="importar" multiple hidden></label>
        <button type="button" class="btn btn-pri" data-acao="comparar" disabled aria-describedby="dica-comparar">Comparar selecionadas</button>
      </div>
      <p class="nota dica-comparar" id="dica-comparar">Marque duas aplicações diagnosticadas na lista para comparar.</p>
    </section>
    <section class="cartao">
      ${apps.length ? `<table class="tabela tabela-historico">
        <thead><tr><th><span class="sr">Selecionar</span></th><th>Empresa</th><th>Data</th><th>Estado</th><th class="num">Nível</th><th>Modelo</th><th></th></tr></thead>
        <tbody>${apps.map(a => `<tr class="${atual?.id === a.id ? 'linha-atual' : ''}">
          <td class="col-sel">${a.diagnostico ? `<input type="checkbox" data-sel="${esc(a.id)}" aria-label="Selecionar ${esc(a.empresa.identificador)} de ${dataBR(a.data)}">` : ''}</td>
          <td class="col-empresa"><strong>${esc(a.empresa.identificador)}</strong><br><small>${esc(a.empresa.setor)} · ${esc(rotuloPorte(a.empresa.porte))}${a.origem === 'importada' ? ' · importada' : ''}${a.anterior ? ' · reaplicação' : ''}</small></td>
          <td data-rotulo="Data">${dataBR(a.data)}</td>
          <td data-rotulo="Estado"><span class="selo selo-estado">${esc(a.estado)}</span>${atual?.id === a.id ? '<br><small>atual</small>' : ''}</td>
          <td class="num" data-rotulo="Nível">${a.diagnostico ? `<strong>${a.diagnostico.nivelFinal}</strong> <small>${esc(nomeNivel(modelo, a.diagnostico.nivelFinal))}</small>` : `${estado.contarRespondidas(a)}/${modelo.itens.length}`}</td>
          <td data-rotulo="Modelo">${esc(a.diagnostico?.versaoModelo || a.versaoModelo)}</td>
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
      el.querySelector('#dica-comparar').hidden = !btnComparar.disabled;
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
  el.innerHTML = `<section class="cartao"><p class="etapa-rotulo">Reaplicar o instrumento e comparar resultados</p>
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
    principal.innerHTML = `<section class="cartao estreito"><div class="aviso aviso-erro" role="alert">
      <strong>Não foi possível carregar o modelo (dados.json).</strong> ${esc(e.message)}</div>
      <p>Se você abriu o arquivo <code>index.html</code> diretamente do disco, o navegador bloqueia a leitura do modelo. Use a versão publicada (GitHub Pages) ou sirva a pasta localmente, por exemplo com <code>python3 -m http.server</code>, e acesse <code>http://localhost:8000</code>.</p></section>`;
    return;
  }
  const erros = validarModelo(modelo);
  if (erros.length) {
    principal.innerHTML = `<section class="cartao estreito"><div class="aviso aviso-erro" role="alert">
      <strong>Parâmetros do modelo inválidos.</strong> O diagnóstico não será calculado com um modelo inconsistente.
      <ul>${erros.map(x => `<li>${esc(x)}</li>`).join('')}</ul></div></section>`;
    return;
  }
  renderGuia(document.getElementById('guia-conteudo'), modelo);
  window.addEventListener('hashchange', roteador);
  roteador();
}

iniciar();
