// Versão 1.3.0: exportação em PDF e planilha (CP-12, CP-13, UC-08, UC-09).
// O PDF é conferido sobre a definição do documento (pdfmake não roda aqui); a
// planilha faz ida e volta com o exceljs copiado em vendor/.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { diagnosticar } from '../js/nucleo.js';
import { documentoRelatorio, tituloOrfao } from '../js/relatorio-pdf.js';
import { referenciasDoRelatorio } from '../js/painel.js';
import { montarPlanilha, lerPlanilha } from '../js/planilha.js';
import { nomeArquivo } from '../js/ui.js';
import * as estado from '../js/estado.js';

const modelo = JSON.parse(readFileSync(new URL('../dados.json', import.meta.url)));
createRequire(import.meta.url)('../vendor/exceljs/exceljs.min.js');
const { ExcelJS } = globalThis;

const AURORA = { D0: [4, 4, 3, 3], D1: [2, 2, 1, 2, 2], D2: [4, 5, 4, 3, 4], D3: [3, 2, 3, 3, 2, 3], D4: [2, 3, 2, 3, 2], D5: [4, 4, 3, 2, 3] };
function aplicacao(respostasPorDim = AURORA) {
  const respostas = {};
  for (const d of modelo.dimensoes) {
    modelo.itens.filter(i => i.dimensao === d.codigo).forEach((it, k) => { respostas[it.codigo] = respostasPorDim[d.codigo][k]; });
  }
  return {
    id: 'APL-EXPORTACAO', estado: 'Diagnosticada', data: '2026-09-13', respondente: 'Teste', respostas, responsaveis: {},
    empresa: { identificador: 'Metalmecânica Aurora', setor: 'Indústria metalmecânica', porte: 'pequena', funcionarios: 42 },
    diagnostico: { ...diagnosticar(respostas, modelo, { data: '2026-09-13' }), geradoEm: '2026-09-13T12:00:00Z' },
  };
}

// Todo o texto de uma árvore do pdfmake, na ordem.
function textoDe(no) {
  if (no == null || typeof no === 'number' || typeof no === 'boolean') return '';
  if (typeof no === 'string') return no;
  if (Array.isArray(no)) return no.map(textoDe).join(' ');
  return ['text', 'stack', 'columns', 'ol', 'ul', 'table', 'body'].map(k => textoDe(no[k])).join(' ').replace(/\s+/g, ' ');
}

test('PDF: capa com a empresa e o nível; rodapé "Página X de Y" fora da capa', () => {
  const doc = documentoRelatorio(aplicacao(), modelo, { geradoEm: '2026-09-13T12:00:00Z' });
  const capa = textoDe(doc.background(1));
  assert.match(capa, /Metalmecânica Aurora/);
  assert.equal(doc.background(2), null);
  assert.match(textoDe(doc.content.slice(0, 6)), /NÍVEL ATRIBUÍDO 2 Em desenvolvimento/);
  assert.equal(doc.footer(1, 7), null);
  assert.equal(doc.header(1), null);
  assert.match(textoDe(doc.footer(2, 7)), /Página 2 de 7/);
  assert.match(textoDe(doc.header(3)), /Metalmecânica Aurora/);
  assert.equal(doc.pageSize, 'A4');
  assert.deepEqual(doc.pageMargins, [40, 72, 40, 56]);
});

test('PDF: seções numeradas na ordem e roteiro com uma linha por passo', () => {
  const app = aplicacao();
  const doc = documentoRelatorio(app, modelo);
  const titulos = doc.content.filter(n => n.style === 'h1').map(n => n.text);
  assert.deepEqual(titulos, ['1. Perfil por dimensão', '2. Por que este nível', '3. Roteiro de ação', '4. Canvas de Prontidão', '5. Respostas', '6. Referências']);
  const tabelaRoteiro = doc.content.find(n => n.table?.body?.[0]?.[2]?.text === 'O que fazer');
  assert.equal(tabelaRoteiro.table.body.length, app.diagnostico.roteiro.length + 1);
  assert.equal(tabelaRoteiro.table.headerRows, 1);
  // cada título carrega o id que o mantém junto do bloco seguinte
  for (const [k, n] of doc.content.entries()) {
    if (n.style === 'h1') assert.equal(doc.content[k + 1].id, `${n.id}-1`);
  }
});

test('PDF: referências iguais às do relatório na tela, sem códigos internos', () => {
  const app = aplicacao();
  const doc = documentoRelatorio(app, modelo);
  const lista = doc.content[doc.content.length - 2].ol;
  const dois = lista.map(li => li.text.find(t => typeof t === 'object' && t.link)?.link.replace('https://doi.org/', ''));
  assert.deepEqual(dois, referenciasDoRelatorio(app.diagnostico, modelo).map(r => r.doi));
  const texto = textoDe(doc.content) + textoDe(doc.background(1)) + textoDe(doc.footer(2, 7));
  assert.doesNotMatch(texto, /\b(UC|CP|FE|RT)-\d{2}\b|\bRD-D\d-F\d\b/);
});

test('PDF: a planilha vai anexada quando é passada', () => {
  const sem = documentoRelatorio(aplicacao(), modelo);
  assert.equal(sem.files, undefined);
  const com = documentoRelatorio(aplicacao(), modelo, { anexo: { nome: 'dados.xlsx', dataUrl: 'data:application/octet-stream;base64,AA==' } });
  assert.equal(com.files.dados.name, 'dados.xlsx');
  assert.match(com.files.dados.src, /^data:/);
});

test('PDF: título de seção não fica órfão no pé da página', () => {
  const consultas = (anteriores, seguintes) => ({ getPreviousNodesOnPage: () => anteriores, getFollowingNodesOnPage: () => seguintes });
  const titulo = { headlineLevel: 1, id: 'secao-3' };
  assert.equal(tituloOrfao(titulo, consultas([{ text: 'x' }], [{ id: 'outra' }])), true);
  assert.equal(tituloOrfao(titulo, consultas([{ text: 'x' }], [{ id: 'secao-3-1' }])), false);
  assert.equal(tituloOrfao(titulo, consultas([{ stack: [] }], [])), false, 'já no topo da página');
  assert.equal(tituloOrfao({ text: 'comum' }, consultas([{ text: 'x' }], [])), false);
});

test('nome de arquivo no padrão do cop: sem acentos, partes com "_", carimbo no fim', () => {
  const quando = new Date(2026, 9, 30, 9, 5);
  assert.equal(nomeArquivo(['MGP-PME', 'Metalmecânica Aurora (caso ilustrativo)'], 'pdf', quando), 'MGP-PME_Metalmecanica-Aurora-caso-ilustrativo_20261030-0905.pdf');
  const longo = nomeArquivo(['MGP-PME', 'x'.repeat(300)], 'xlsx', quando);
  assert.ok(longo.endsWith('_20261030-0905.xlsx'));
  assert.ok(longo.length <= 120 + '_20261030-0905.xlsx'.length);
});

test('planilha: abas legíveis, aba de dados oculta e ida e volta sem perda', async () => {
  const app = aplicacao();
  app.responsaveis = { [app.diagnostico.roteiro[0].regra]: 'Joana' };
  const wb = montarPlanilha(app, modelo, ExcelJS, { exportadoEm: '2026-09-13T12:00:00Z' });
  assert.deepEqual(wb.worksheets.map(w => w.name), ['Resumo', 'Respostas', 'Dimensões', 'Roteiro', 'Referências', '_mgp']);
  assert.equal(wb.getWorksheet('_mgp').state, 'veryHidden');
  assert.equal(wb.getWorksheet('Respostas').rowCount, modelo.itens.length + 1);
  assert.equal(wb.getWorksheet('Roteiro').getCell('F2').value, 'Joana');

  const buffer = await wb.xlsx.writeBuffer();
  const pacote = await lerPlanilha(buffer, ExcelJS);
  assert.equal(pacote.formato, estado.FORMATO_EXPORTACAO);
  assert.deepEqual(pacote.aplicacao, app);

  const { app: importada, jaExistia } = estado.importarDiagnostico(structuredClone(pacote));
  assert.equal(jaExistia, false);
  assert.equal(importada.origem, 'importada');
  assert.deepEqual(importada.diagnostico, app.diagnostico);
});

test('planilha: arquivo que não veio do MGP-PME é recusado com mensagem clara', async () => {
  const outra = new ExcelJS.Workbook();
  outra.addWorksheet('Plan1').addRow(['qualquer coisa']);
  await assert.rejects(lerPlanilha(await outra.xlsx.writeBuffer(), ExcelJS), /não foi exportada pelo MGP-PME/);
  await assert.rejects(lerPlanilha(new TextEncoder().encode('não é xlsx').buffer, ExcelJS), /não é uma planilha \.xlsx válida/);
  assert.throws(() => estado.importarDiagnostico({ formato: 'outro' }), /não é um diagnóstico exportado/);
});
