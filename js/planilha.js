// planilha.js — planilha de dados do diagnóstico (CP-13), gerada e lida no
// navegador com exceljs. É o arquivo que o gestor guarda e que o Histórico
// importa para comparar reaplicações (UC-09). As abas visíveis servem para
// leitura e análise; a aba oculta "_mgp" leva a aplicação completa, para que a
// importação reconstitua exatamente o que foi exportado.

import { dataBR, nomeNivel, nomeFaixa, nomeDimensao, rotuloPorte, citar } from './ui.js';
import { FORMATO_EXPORTACAO } from './estado.js';
import { referenciasDoPasso, referenciasDoRelatorio, alvoLegivel } from './painel.js';
import { periodicidade } from './nucleo.js';

export const VERSAO_FORMATO = 2;
const ABA_DADOS = '_mgp';
const TAMANHO_PEDACO = 32000; // limite de uma célula do Excel: 32 767 caracteres

const COR = { faixa: 'FF39495C', branco: 'FFFFFFFF', zebra: 'FFF3F3F3', filete: 'FFE2E5E9', alerta: 'FFA43B3B' };

function aba(wb, nome, colunas, linhas) {
  const ws = wb.addWorksheet(nome, { views: [{ state: 'frozen', ySplit: 1 }] });
  ws.columns = colunas.map(([header, key, width]) => ({ header, key, width }));
  linhas.forEach(l => ws.addRow(l));
  const cab = ws.getRow(1);
  cab.font = { bold: true, color: { argb: COR.branco } };
  cab.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COR.faixa } };
  cab.alignment = { vertical: 'middle' };
  cab.height = 20;
  ws.eachRow((row, n) => {
    if (n > 1) {
      row.alignment = { vertical: 'top', wrapText: true };
      if (n % 2 === 1) row.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COR.zebra } };
    }
    row.border = { bottom: { style: 'thin', color: { argb: COR.filete } } };
  });
  if (linhas.length) ws.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: colunas.length } };
  return ws;
}

export function montarPlanilha(app, modelo, ExcelJS, { exportadoEm = new Date().toISOString() } = {}) {
  const diag = app.diagnostico;
  const wb = new ExcelJS.Workbook();
  wb.creator = 'MGP-PME';
  wb.title = `Diagnóstico de prontidão para IA: ${app.empresa.identificador}`;
  wb.created = new Date(exportadoEm);

  const reap = periodicidade(diag.nivelFinal, modelo);
  const resumo = aba(wb, 'Resumo', [['Campo', 'campo', 30], ['Valor', 'valor', 80]], [
    { campo: 'Empresa', valor: app.empresa.identificador },
    { campo: 'Setor', valor: app.empresa.setor },
    { campo: 'Porte', valor: rotuloPorte(app.empresa.porte) },
    { campo: 'Funcionários', valor: app.empresa.funcionarios },
    { campo: 'Respondente', valor: app.respondente },
    { campo: 'Data da aplicação', valor: dataBR(app.data) },
    { campo: 'Versão do modelo', valor: diag.versaoModelo },
    { campo: 'Nível atribuído', valor: `${diag.nivelFinal} · ${nomeNivel(modelo, diag.nivelFinal)}` },
    { campo: 'Média ponderada (0 a 100)', valor: Number(diag.escoreGlobal.toFixed(1)) },
    { campo: 'Nível pela média', valor: `${diag.nivelCompensatorio} · ${nomeNivel(modelo, diag.nivelCompensatorio)}` },
    { campo: 'O que trava', valor: diag.tetoAtuou ? diag.gargalos.map(g => `${g} ${nomeDimensao(modelo, g)}`).join(', ') : 'Nenhuma dimensão crítica limita o nível' },
    { campo: 'Próxima aplicação sugerida', valor: `${dataBR(diag.dataReaplicacao)} (a cada ${reap?.meses} meses)` },
    { campo: 'Exportado em', valor: new Date(exportadoEm).toLocaleString('pt-BR') },
    { campo: 'Como usar este arquivo', valor: 'Guarde a planilha. Na próxima aplicação, importe-a em Histórico para comparar a evolução. Não altere a aba oculta de dados.' },
  ]);
  resumo.getColumn('campo').font = { bold: true };

  aba(wb, 'Respostas', [['Código', 'codigo', 9], ['Dimensão', 'dimensao', 30], ['Afirmação', 'assertiva', 70], ['Resposta (1 a 5)', 'valor', 16], ['Nível da escala', 'descritor', 16], ['Descrição escolhida', 'ancora', 70]],
    modelo.itens.map(i => {
      const v = app.respostas[i.codigo];
      return { codigo: i.codigo, dimensao: `${i.dimensao} ${nomeDimensao(modelo, i.dimensao)}`, assertiva: i.assertiva, valor: v ?? null, descritor: v ? modelo.escala[v - 1]?.descritor : '', ancora: v ? i.ancoras[v - 1] : '' };
    }));

  const dims = aba(wb, 'Dimensões', [['Código', 'codigo', 9], ['Dimensão', 'nome', 34], ['Peso', 'peso', 9], ['Crítica', 'critica', 9], ['Escore (0 a 100)', 'escore', 16], ['Nível', 'nivel', 8], ['Faixa', 'faixa', 14], ['Gargalo', 'gargalo', 10]],
    diag.porDimensao.map(d => ({
      codigo: d.codigo, nome: d.nome, peso: modelo.dimensoes.find(x => x.codigo === d.codigo)?.peso ?? null,
      critica: d.critica ? 'sim' : 'não', escore: Number(d.escore.toFixed(1)), nivel: d.nivel, faixa: nomeFaixa(modelo, d.faixa), gargalo: d.eGargalo ? 'sim' : 'não',
    })));
  dims.getColumn('peso').numFmt = '0%';
  dims.eachRow((row, n) => { if (n > 1 && row.getCell('gargalo').value === 'sim') row.font = { bold: true, color: { argb: COR.alerta } }; });

  aba(wb, 'Roteiro', [['Ordem', 'ordem', 8], ['Onde', 'onde', 30], ['O que fazer', 'acao', 80], ['Esforço', 'esforco', 10], ['Horizonte', 'horizonte', 11], ['Responsável', 'responsavel', 22], ['Referências', 'refs', 40]],
    diag.roteiro.map(r => ({
      ordem: r.ordem, onde: alvoLegivel(r, modelo), acao: r.acao, esforco: r.esforco, horizonte: r.horizonte,
      responsavel: (app.responsaveis || {})[r.regra] || '', refs: citar(modelo, referenciasDoPasso(modelo, r)),
    })));

  aba(wb, 'Referências', [['Citação', 'citacao', 28], ['Autores', 'autores', 50], ['Ano', 'ano', 8], ['Título', 'titulo', 70], ['Veículo', 'veiculo', 60], ['DOI', 'doi', 36]],
    referenciasDoRelatorio(diag, modelo).map(r => ({ ...r, doi: { text: r.doi, hyperlink: `https://doi.org/${r.doi}` } })));

  // Aba oculta: a aplicação inteira, em pedaços que cabem numa célula.
  const dados = wb.addWorksheet(ABA_DADOS, { state: 'veryHidden' });
  const texto = JSON.stringify({ formato: FORMATO_EXPORTACAO, versaoFormato: VERSAO_FORMATO, exportadoEm, aplicacao: app });
  dados.addRow(['formato', FORMATO_EXPORTACAO]);
  dados.addRow(['versaoFormato', VERSAO_FORMATO]);
  for (let k = 0; k < texto.length; k += TAMANHO_PEDACO) dados.addRow(['dados', texto.slice(k, k + TAMANHO_PEDACO)]);
  return wb;
}

// Lê uma planilha exportada e devolve o pacote { formato, aplicacao, ... }.
export async function lerPlanilha(buffer, ExcelJS) {
  const wb = new ExcelJS.Workbook();
  try {
    await wb.xlsx.load(buffer);
  } catch {
    throw new Error('O arquivo não é uma planilha .xlsx válida.');
  }
  const dados = wb.getWorksheet(ABA_DADOS);
  if (!dados) throw new Error('Esta planilha não foi exportada pelo MGP-PME (falta a aba de dados).');
  let texto = '';
  dados.eachRow(row => { if (row.getCell(1).value === 'dados') texto += String(row.getCell(2).value ?? ''); });
  try {
    return JSON.parse(texto);
  } catch {
    throw new Error('A aba de dados da planilha está corrompida.');
  }
}

export async function gerarPlanilha(ExcelJS, app, modelo, opcoes) {
  const buffer = await montarPlanilha(app, modelo, ExcelJS, opcoes).xlsx.writeBuffer();
  return new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
}

