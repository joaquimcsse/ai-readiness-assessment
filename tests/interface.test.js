// RNF01 (linguagem de negócio): o texto que o gestor lê não imprime códigos de
// especificação (UC, CP, FE, RT). Os códigos continuam permitidos em comentários,
// em comparações do código (o.codigo === 'UC-07') e nas telas Sobre, Rastreabilidade e
// Manutenção do modelo (público: pesquisador mantenedor, que usa os códigos).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const MODULOS = ['app.js', 'painel.js', 'coleta.js', 'ui.js', 'estado.js', 'avaliacao.js', 'graficos.js', 'exportacao.js', 'inicio.js', 'animacoes.js', 'pesquisa.js'];
const CODIGO = /\b(UC|CP|FE|RT)-\d{2}\b/;

function semComentariosEComparacoes(fonte) {
  return fonte
    .split('\n')
    .filter(l => !l.trim().startsWith('//') && !l.trim().startsWith('*') && !l.trim().startsWith('/*'))
    .map(l => l
      .replace(/\s\/\/.*$/, '')                                   // comentário no fim da linha
      .replace(/(===|!==|==|!=)\s*'[A-Z]{2}-\d{2}'/g, '')          // e.codigo === 'FE-01'
      .replace(/codigo:\s*'[A-Z]{2}-\d{2}'/g, ''))                 // observação interna, não é texto de tela
    .join('\n');
}

test('RNF01: módulos da interface do gestor não imprimem códigos de especificação', () => {
  for (const nome of MODULOS) {
    const fonte = semComentariosEComparacoes(readFileSync(new URL(`../js/${nome}`, import.meta.url), 'utf-8'));
    const achado = fonte.split('\n').find(l => CODIGO.test(l));
    assert.equal(achado, undefined, `${nome} imprime código de especificação: ${achado?.trim().slice(0, 100)}`);
  }
});

test('RNF01: o código do erro não é exibido ao gestor', () => {
  const app = readFileSync(new URL('../js/app.js', import.meta.url), 'utf-8');
  assert.ok(!/\$\{esc\(e\.codigo\)\}/.test(app), 'app.js imprime e.codigo na tela');
});

// ---------------------------------------------------------------- versão 1.1.0
// Melhorias da avaliação do PBL 7 (R2, R3, R4, R5 e R9), conferidas sobre o
// relatório do caso Aurora renderizado como texto, sem navegador.
import { diagnosticar } from '../js/nucleo.js';
import { htmlRelatorio, primeiroPasso } from '../js/painel.js';
import { opcoesPerfil, opcoesRadar, coresDoTema, quebrar } from '../js/graficos.js';
import { ordemItens, proximoItem, estadoCriterios } from '../js/coleta.js';

const modelo = JSON.parse(readFileSync(new URL('../dados.json', import.meta.url)));
const AURORA = { D0: [4, 4, 3, 3], D1: [2, 2, 1, 2, 2], D2: [4, 5, 4, 3, 4], D3: [3, 2, 3, 3, 2, 3], D4: [2, 3, 2, 3, 2], D5: [4, 4, 3, 2, 3] };

function aplicacaoAurora(estado = 'Diagnosticada') {
  const respostas = {};
  for (const d of modelo.dimensoes) {
    modelo.itens.filter(i => i.dimensao === d.codigo).forEach((it, k) => { respostas[it.codigo] = AURORA[d.codigo][k]; });
  }
  const diagnostico = { ...diagnosticar(respostas, modelo, { data: '2026-09-13' }), geradoEm: '2026-09-13T12:00:00Z' };
  return {
    id: 'APL-TESTE', estado, data: '2026-09-13', respondente: 'Teste', respostas, diagnostico, responsaveis: {},
    empresa: { identificador: 'Metalmecânica Aurora', setor: 'Indústria metalmecânica', porte: 'pequena', funcionarios: 42 },
  };
}

// Texto que o gestor vê ou ouve: conteúdo, aria-label, title e placeholder.
// Atributos data-* e class são internos e ficam de fora.
function textoExposto(html) {
  return html
    .replace(/\s(data-[\w-]+|class|id|href|for|name|type|value)="[^"]*"/g, '')
    .replace(/<[^>]*?\s(aria-label|title|placeholder)="([^"]*)"[^>]*>/g, ' $2 ')
    .replace(/<[^>]+>/g, ' ');
}

const CODIGO_OU_REGRA = /\b(UC|CP|FE|RT)-\d{2}\b|\bRD-D\d-F\d\b/;

test('R2: o relatório do gestor não exibe códigos de especificação nem de regra', () => {
  for (const estado of ['Diagnosticada', 'Arquivada']) {
    const texto = textoExposto(htmlRelatorio(aplicacaoAurora(estado), modelo, { temAnteriores: true }));
    assert.doesNotMatch(texto, CODIGO_OU_REGRA, `estado ${estado}`);
  }
});

test('R4: o diagnóstico oferece um único próximo passo em destaque', () => {
  const contar = html => (html.match(/class="btn btn-pri"/g) || []).length;
  const aberta = htmlRelatorio(aplicacaoAurora(), modelo);
  const arquivada = htmlRelatorio(aplicacaoAurora('Arquivada'), modelo, { temAnteriores: true });
  assert.equal(contar(aberta), 1);
  assert.match(aberta, /data-acao="exportar">Exportar e arquivar</);
  assert.equal(contar(arquivada), 1);
  assert.match(arquivada, /data-acao="reaplicar">Reaplicar o instrumento</);
});

// Versão 1.4.0: o resumo virou uma faixa de indicadores e os detalhes, abas.
// A intenção de R3 continua: o resumo vem antes de tudo e só uma aba (a tabela
// de critérios, curta) aparece aberta; as demais ficam a um clique, e todas
// saem na impressão. Os três primeiros passos do roteiro ficam no resumo.
test('R3: os indicadores vêm primeiro e os detalhes ficam em abas, uma só aberta', () => {
  const html = htmlRelatorio(aplicacaoAurora(), modelo);
  const resumo = html.indexOf('rel-resumo');
  assert.ok(resumo > 0 && resumo < html.indexOf('data-grafico') && resumo < html.indexOf('role="tablist"'));
  const paineis = [...html.matchAll(/<div class="painel-aba([^"]*)" role="tabpanel"[^>]*data-painel="(\w+)"/g)];
  assert.deepEqual(paineis.map(m => m[2]), ['criterios', 'roteiro', 'nivel', 'canvas', 'referencias']);
  assert.deepEqual(paineis.filter(m => /\bativo\b/.test(m[1])).map(m => m[2]), ['criterios']);
  assert.ok(html.indexOf('class="prioridades"') < html.indexOf('role="tablist"'));
  assert.equal((html.match(/role="tab" /g) || []).length, 5);
  assert.equal((html.match(/aria-selected="true"/g) || []).length, 1);
});

test('R9: sem reordenar o roteiro, o resumo começa pela ação do gargalo', () => {
  const app = aplicacaoAurora();
  const diag = app.diagnostico;
  assert.deepEqual(diag.gargalos, ['D1']);
  const passo = primeiroPasso(diag);
  assert.equal(passo.dimensao, 'D1');
  assert.equal(passo.origem, 'Ação');
  const html = htmlRelatorio(app, modelo);
  const resumo = html.slice(html.indexOf('class="prioridades"'), html.indexOf('role="tablist"'));
  assert.match(resumo, /^class="prioridades"><li><span class="onde"><span class="selo selo-critica">gargalo<\/span> Dados<\/span>/);
  assert.match(html, /kpi-gargalo[^]*?kpi-valor">Dados</);
});

test('gráficos: cada gráfico tem um SVG de reserva e as opções marcam o gargalo', () => {
  const app = aplicacaoAurora();
  const html = htmlRelatorio(app, modelo);
  for (const nome of ['perfil', 'radar']) {
    assert.match(html, new RegExp(`data-grafico="${nome}"[^>]*><svg `), `${nome} sem SVG de reserva`);
  }
  const cores = coresDoTema(n => ({ '--f1': '#a00', '--f2': '#888', '--f3': '#333', '--alerta': '#a00' })[n] || '#000');
  const opcoes = opcoesPerfil(app.diagnostico, modelo, cores, { animar: false });
  const barras = opcoes.series[0].data;
  assert.equal(barras.length, modelo.dimensoes.length);
  const k = app.diagnostico.porDimensao.findIndex(d => d.eGargalo);
  assert.equal(barras[k].itemStyle.color, '#a00');
  assert.match(opcoes.series[0].label.formatter({ value: 20, dataIndex: k }), /gargalo/);
  assert.equal(opcoes.series[0].markLine.data[0].xAxis, Math.round(app.diagnostico.escoreGlobal * 10) / 10);
  assert.equal(opcoes.series[0].markArea.data.length, modelo.faixas.length);
  const radar = opcoesRadar(app.diagnostico, modelo, cores, { animar: false });
  assert.equal(radar.radar.indicator.length, modelo.dimensoes.length);
  assert.equal(quebrar('Governança, ética e conformidade'), 'Governança, ética\ne conformidade');
});

// ---------------------------------------------------------------- questionário (1.4.0)
test('questionário: uma afirmação por tela, na ordem dos critérios, até a revisão', () => {
  const ordem = ordemItens(modelo).map(i => i.codigo);
  assert.equal(ordem.length, modelo.itens.length);
  assert.deepEqual([...new Set(ordemItens(modelo).map(i => i.dimensao))], modelo.dimensoes.map(d => d.codigo));
  const app = { respostas: {} };
  assert.equal(proximoItem(app, modelo), ordem[0]);
  app.respostas[ordem[0]] = 3;
  assert.equal(proximoItem(app, modelo), ordem[1]);
  assert.equal(proximoItem(app, modelo, ordem[5]), ordem[6]);
  // volta ao começo para achar uma pendente
  for (const c of ordem.slice(2)) app.respostas[c] = 4;
  assert.equal(proximoItem(app, modelo, ordem[ordem.length - 1]), ordem[1]);
  app.respostas[ordem[1]] = 2;
  assert.equal(proximoItem(app, modelo), null);
  const crits = estadoCriterios(app, modelo);
  assert.ok(crits.every(c => c.completo && c.primeiroPendente === null));
  delete app.respostas[ordem[0]];
  const primeiro = estadoCriterios(app, modelo)[0];
  assert.equal(primeiro.feitos, primeiro.total - 1);
  assert.equal(primeiro.primeiroPendente, ordem[0]);
});

test('R5: o topo tem três rotas do gestor e agrupa as telas de pesquisa', () => {
  const html = readFileSync(new URL('../index.html', import.meta.url), 'utf-8');
  const menu = html.slice(html.indexOf('<nav class="menu"'), html.indexOf('</nav>'));
  const [antes, grupo] = menu.split('<details');
  assert.equal((antes.match(/<a /g) || []).length, 3);
  assert.equal((grupo.match(/<a /g) || []).length, 3);
  for (const rota of ['avaliacao', 'manutencao', 'sobre']) assert.match(grupo, new RegExp(`data-rota="${rota}"`));
});

// ---------------------------------------------------------------- versão 1.2.0
// Fundamentação: cada passo do roteiro cita os estudos da regra que o gerou, e a
// lista de referências do relatório traz só as obras citadas naquele diagnóstico.
test('referências do relatório: o roteiro cita estudos e a lista acompanha o diagnóstico', () => {
  const ref = chave => modelo.referencias.find(r => r.chave === chave);
  const listaDe = html => {
    const corpo = html.slice(html.lastIndexOf('<ol class="referencias">'));
    return [...corpo.matchAll(/doi\.org\/([^"]+)"/g)].map(m => m[1]);
  };
  const aurora = htmlRelatorio(aplicacaoAurora(), modelo);
  const roteiro = aurora.slice(aurora.indexOf('tabela-roteiro'), aurora.indexOf('</table>', aurora.indexOf('tabela-roteiro')));
  assert.match(roteiro, /<cite class="rel-cita">\(Al Tawara et al\., 2026a\)<\/cite>/);
  // teto atuou: a explicação do nível cita a fundamentação do teto de gargalo
  assert.match(aurora, /Por que o nível é menor[^]*?<cite class="rel-cita">\(Kalleparambil e Akoum, 2025; Al Tawara et al\., 2026a\)/);
  const citadas = new Set([...aurora.matchAll(/<cite class="rel-cita">\(([^)]*)\)<\/cite>/g)].flatMap(m => m[1].split('; ')));
  const listadas = listaDe(aurora);
  assert.ok(listadas.length > 0);
  for (const doi of listadas) assert.ok(citadas.has(modelo.referencias.find(r => r.doi === doi).citacao), `${doi} listada sem ser citada`);
  for (const c of citadas) assert.ok(listadas.includes(modelo.referencias.find(r => r.citacao === c).doi), `${c} citada sem estar na lista`);

  // empresa toda consolidada: outras regras, outra lista, sem a fundamentação do teto
  const maxima = aplicacaoAurora();
  for (const k of Object.keys(maxima.respostas)) maxima.respostas[k] = 5;
  maxima.diagnostico = diagnosticar(maxima.respostas, modelo, { data: '2026-09-13' });
  const outra = listaDe(htmlRelatorio(maxima, modelo));
  assert.notDeepEqual(outra, listadas);
  assert.ok(!maxima.diagnostico.tetoAtuou);
  assert.ok(!/Por que o nível é menor/.test(htmlRelatorio(maxima, modelo)));
  assert.ok(outra.every(doi => ref(modelo.referencias.find(r => r.doi === doi).chave)));
});

// ---------------------------------------------------------------- avaliação (1.4.0)
// A tela de avaliação segue o protocolo do artigo: SUS (Brooke, 1996) e PA1 a PA3.
import { escoreSUS, ITENS_SUS } from '../js/avaliacao.js';
import { VEREDITOS, PARCIAIS, OBJETIVOS, REQUISITOS, EVIDENCIAS, PERGUNTAS_ABERTAS } from '../js/pesquisa.js';

test('SUS: escore de 0 a 100 pela regra de Brooke', () => {
  const todos = v => Object.fromEntries(ITENS_SUS.map(([c]) => [c, v]));
  assert.equal(ITENS_SUS.length, 10);
  assert.equal(escoreSUS(todos(3)), 50);
  const melhor = Object.fromEntries(ITENS_SUS.map(([c], k) => [c, k % 2 === 0 ? 5 : 1]));
  const pior = Object.fromEntries(ITENS_SUS.map(([c], k) => [c, k % 2 === 0 ? 1 : 5]));
  assert.equal(escoreSUS(melhor), 100);
  assert.equal(escoreSUS(pior), 0);
  assert.equal(escoreSUS({ ...todos(3), S10: null }), null);
  assert.equal(escoreSUS({ ...todos(3), S01: 6 }), null);
});

test('pesquisa: vereditos e listas batem com as tabelas do artigo', () => {
  const soma = VEREDITOS.reduce((s, v) => ({ t: s.t + v.total, a: s.a + v.atendidos, p: s.p + v.parciais, n: s.n + v.naoAtendidos }), { t: 0, a: 0, p: 0, n: 0 });
  assert.deepEqual(soma, { t: 26, a: 19, p: 7, n: 0 });
  for (const v of VEREDITOS) assert.equal(v.atendidos + v.parciais + v.naoAtendidos, v.total, v.grupo);
  assert.equal(OBJETIVOS.length, 7);
  assert.equal(REQUISITOS.length, 11);
  const parciaisOE = Object.keys(PARCIAIS).filter(c => c.startsWith('OE')).length;
  const parciaisReq = Object.keys(PARCIAIS).filter(c => /^RN?F/.test(c)).length;
  assert.equal(parciaisOE, VEREDITOS[0].parciais);
  assert.equal(parciaisReq, VEREDITOS[1].parciais);
  for (const c of Object.keys(PARCIAIS)) assert.ok([...OBJETIVOS, ...REQUISITOS].some(([k]) => k === c), `${c} não existe`);
  assert.deepEqual(EVIDENCIAS.map(e => e[0]), ['E1', 'E2', 'E3a', 'E3b', 'E4', 'E5']);
  assert.equal(PERGUNTAS_ABERTAS.length, 3);
});
