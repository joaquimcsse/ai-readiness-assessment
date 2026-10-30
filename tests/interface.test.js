// RNF01 (linguagem de negócio): o texto que o gestor lê não imprime códigos de
// especificação (UC, CP, FE, RT). Os códigos continuam permitidos em comentários,
// em comparações do código (o.codigo === 'UC-07') e nas telas Sobre, Rastreabilidade e
// Manutenção do modelo (público: pesquisador mantenedor, que usa os códigos).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const MODULOS = ['app.js', 'painel.js', 'coleta.js', 'ui.js', 'estado.js', 'avaliacao.js'];
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

test('R3: o resumo vem primeiro e os detalhes ficam recolhidos', () => {
  const html = htmlRelatorio(aplicacaoAurora(), modelo);
  assert.ok(html.indexOf('rel-resumo') < html.indexOf('<details class="rel-secao'));
  assert.equal((html.match(/<details class="rel-secao/g) || []).length, 5);
  assert.doesNotMatch(html, /<details class="rel-secao[^"]*" open/);
});

test('R9: sem reordenar o roteiro, o resumo começa pela ação do gargalo', () => {
  const app = aplicacaoAurora();
  const diag = app.diagnostico;
  assert.deepEqual(diag.gargalos, ['D1']);
  const passo = primeiroPasso(diag);
  assert.equal(passo.dimensao, 'D1');
  assert.equal(passo.origem, 'Ação');
  const html = htmlRelatorio(app, modelo);
  const resumo = html.slice(html.indexOf('rel-resumo'), html.indexOf('<details class="rel-secao'));
  assert.match(resumo, /<li><span class="selo selo-critica">gargalo<\/span> <strong>D1 /);
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
