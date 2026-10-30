// relatorio-pdf.js — relatório do diagnóstico em PDF (CP-12), gerado no próprio
// navegador com pdfmake. Segue o desenho dos relatórios de checklist e de WIT do
// cop: capa com faixa escura e quadro de resultado, cabeçalho e rodapé corridos
// a partir da página 2 ("Página X de Y"), seções numeradas e tabelas com filetes
// horizontais e linhas alternadas.
//
// documentoRelatorio() é uma função pura (testada em Node, sem pdfmake); só
// gerarPdf() depende da biblioteca, carregada sob demanda.

import { num, dataBR, dataHoraBR, nomeNivel, nomeFaixa, nomeDimensao, rotuloPorte, citar } from './ui.js';
import { periodicidade } from './nucleo.js';
import {
  primeiroPasso, ehGargalo, alvoLegivel, referenciasDoPasso, referenciasDoRelatorio, celulasCanvas,
} from './painel.js';

// ------------------------------------------------------------ tema (cop: report-theme.ts)
export const CORES = {
  faixa: '#39495C',      // capa, títulos, cabeçalho das tabelas
  primaria: '#506A88',   // links e destaques
  texto: '#21262B',
  mudo: '#5E666F',
  filete: '#E2E5E9',
  zebra: '#F3F3F3',
  alerta: '#A43B3B',     // faixa Crítica e gargalo: a única cor de alerta
  branco: '#FFFFFF',
};
// Faixas: uma rampa de luminância de uma só matiz, mais o alerta.
export const COR_FAIXA = { F1: CORES.alerta, F2: '#8A99AD', F3: CORES.faixa };
// O cinza médio de F2 serve para barras; em texto ele fica abaixo de 4,5:1, então
// o texto usa um tom mais escuro da mesma matiz.
export const COR_FAIXA_TEXTO = { F1: CORES.alerta, F2: '#5F6E82', F3: CORES.faixa };
const FUNDO_FAIXA = { F1: '#F7ECEC', F2: '#F1F3F6', F3: '#E6EAEF' };

export const PAGINA = { largura: 595.28, altura: 841.89, margens: [40, 72, 40, 56] };
const LARGURA_UTIL = PAGINA.largura - PAGINA.margens[0] - PAGINA.margens[2];
const ALTURA_CAPA = 236;

const TABELA = {
  fillColor: linha => (linha === 0 ? CORES.faixa : linha % 2 === 0 ? CORES.zebra : null),
  hLineWidth: (i, no) => (i === 0 || i === no.table.body.length ? 0 : 0.5),
  vLineWidth: () => 0,
  hLineColor: () => CORES.filete,
  paddingLeft: () => 6, paddingRight: () => 6, paddingTop: () => 4, paddingBottom: () => 4,
};
const PAINEL = {
  hLineWidth: (i, no) => (i === 0 || i === no.table.body.length ? 0 : 0.5),
  vLineWidth: () => 0,
  hLineColor: () => CORES.filete,
  paddingLeft: () => 0, paddingRight: () => 8, paddingTop: () => 4, paddingBottom: () => 4,
};
const SEM_BORDAS = {
  hLineWidth: () => 0, vLineWidth: () => 0,
  paddingLeft: () => 0, paddingRight: () => 0, paddingTop: () => 2, paddingBottom: () => 2,
};

const ESTILOS = {
  h1: { fontSize: 15, bold: true, color: CORES.faixa, margin: [0, 18, 0, 10] },
  h2: { fontSize: 11.5, bold: true, color: CORES.faixa, margin: [0, 12, 0, 6] },
  pequeno: { fontSize: 7.5, color: CORES.mudo },
  rotulo: { fontSize: 7.5, color: CORES.mudo, characterSpacing: 0.3 },
  th: { bold: true, fontSize: 8, color: CORES.branco },
  td: { fontSize: 8.5 },
  cita: { fontSize: 7.5, color: CORES.mudo },
};

// ------------------------------------------------------------ títulos que não ficam órfãos
// Como o HeadingKeeper do cop: o título de seção carrega headlineLevel 1 e um id;
// o bloco que vem logo depois recebe o id "<titulo>-1". Se esse bloco não couber
// na mesma página, a quebra vem antes do título.
const NIVEL_TITULO = 1;

export function tituloOrfao(no, consultas) {
  if (no.headlineLevel !== NIVEL_TITULO || !no.id) return false;
  if (!consultas.getPreviousNodesOnPage().some(anterior => !anterior.stack)) return false;
  return !consultas.getFollowingNodesOnPage().some(seguinte => seguinte.id === `${no.id}-1`);
}

function secao(numero, titulo, primeiro, resto = [], { quebra = false } = {}) {
  const id = `secao-${numero}`;
  return [
    { text: `${numero}. ${titulo}`, style: 'h1', id, headlineLevel: NIVEL_TITULO, ...(quebra ? { pageBreak: 'before', margin: [0, 0, 0, 10] } : {}) },
    { ...primeiro, id: `${id}-1` },
    ...resto,
  ];
}

// ------------------------------------------------------------ trechos de texto
const cita = (modelo, chaves) => (chaves.length ? { text: ` (${citar(modelo, chaves)})`, style: 'cita' } : '');

function trechos(lista) {
  return lista.map(x => (typeof x === 'string' ? x
    : { text: x.t, bold: Boolean(x.forte || x.faixa), ...(x.faixa ? { color: COR_FAIXA_TEXTO[x.faixa] } : {}) }));
}

function th(texto, alinhamento) {
  return { text: texto, style: 'th', ...(alinhamento ? { alignment: alinhamento } : {}) };
}

// ------------------------------------------------------------ capa
function fundoCapa(app) {
  const nome = app.empresa.identificador;
  const tamanho = nome.length > 70 ? 15 : nome.length > 48 ? 18 : nome.length > 30 ? 21 : 24;
  return [
    { canvas: [{ type: 'rect', x: 0, y: 0, w: PAGINA.largura, h: ALTURA_CAPA, color: CORES.faixa }] },
    {
      absolutePosition: { x: PAGINA.margens[0], y: 52 },
      width: LARGURA_UTIL,
      stack: [
        { text: 'MGP-PME', bold: true, fontSize: 11, color: CORES.branco },
        { text: 'Modelo de Gargalos de Prontidão para PMEs', fontSize: 8, color: '#C9D1DB', margin: [0, 1, 0, 0] },
        { text: 'DIAGNÓSTICO DE PRONTIDÃO PARA IA', bold: true, fontSize: 8.5, characterSpacing: 1.2, color: '#C9D1DB', margin: [0, 34, 0, 6] },
        { text: nome, bold: true, fontSize: tamanho, color: CORES.branco, lineHeight: 1.05 },
        { text: `${app.empresa.setor} · ${rotuloPorte(app.empresa.porte)} · ${app.empresa.funcionarios} funcionários`, fontSize: 10, color: '#C9D1DB', margin: [0, 6, 0, 0] },
      ],
    },
  ];
}

function quadroResultado(diag, modelo) {
  const trava = diag.tetoAtuou
    ? [
      { text: 'O QUE TRAVA', style: 'rotulo' },
      { text: diag.gargalos.map(g => `${g} ${nomeDimensao(modelo, g)}`).join(', '), bold: true, fontSize: 13, color: CORES.alerta, margin: [0, 2, 0, 2] },
      { text: `Pela média seria o nível ${diag.nivelCompensatorio}; enquanto este critério não melhorar, o nível não passa de ${diag.nivelFinal}.`, fontSize: 8.5 },
    ]
    : [
      { text: 'O QUE TRAVA', style: 'rotulo' },
      { text: 'Nada impede o próximo nível', bold: true, fontSize: 13, margin: [0, 2, 0, 2] },
      { text: 'Use o roteiro para consolidar os critérios mais fracos.', fontSize: 8.5 },
    ];
  const corBorda = diag.tetoAtuou ? CORES.alerta : CORES.faixa;
  return {
    table: {
      widths: [170, '*'],
      body: [[
        { stack: [
          { text: 'NÍVEL ATRIBUÍDO', style: 'rotulo' },
          { text: [{ text: `${diag.nivelFinal} `, fontSize: 26, bold: true, color: CORES.faixa }, { text: nomeNivel(modelo, diag.nivelFinal), fontSize: 12, bold: true }], margin: [0, 2, 0, 0] },
          { text: `Média ponderada ${num(diag.escoreGlobal)}`, style: 'pequeno' },
        ] },
        { stack: trava },
      ]],
    },
    layout: {
      hLineWidth: () => 1.5, vLineWidth: (i, no) => (i === 1 ? 0.5 : 1.5),
      hLineColor: () => corBorda, vLineColor: (i, no) => (i === 1 ? CORES.filete : corBorda),
      paddingLeft: () => 12, paddingRight: () => 12, paddingTop: () => 10, paddingBottom: () => 10,
    },
    margin: [0, 14, 0, 0],
  };
}

function capa(app, modelo, geradoEm) {
  const diag = app.diagnostico;
  const linha = (rotulo, valor) => [{ text: rotulo.toUpperCase(), style: 'rotulo' }, { text: valor, fontSize: 10 }];
  const primeiro = primeiroPasso(diag);
  const passos = [primeiro, ...diag.roteiro.filter(r => r !== primeiro).slice(0, 2)];
  return [
    { text: '', margin: [0, ALTURA_CAPA - PAGINA.margens[1] + 22, 0, 0] },
    { text: 'Dados da aplicação', style: 'h2', margin: [0, 0, 0, 4] },
    {
      table: {
        widths: [150, '*'],
        body: [
          linha('Data da aplicação', dataBR(app.data)),
          linha('Respondente', app.respondente || 'não informado'),
          linha('Versão do modelo', diag.versaoModelo),
          linha('Reaplicação sugerida', dataBR(diag.dataReaplicacao)),
          linha('Relatório gerado em', dataHoraBR(geradoEm)),
        ],
      },
      layout: PAINEL,
    },
    quadroResultado(diag, modelo),
    { text: 'Por onde começar', style: 'h2', margin: [0, 16, 0, 6] },
    {
      ol: passos.map(r => ({
        text: [
          ehGargalo(diag, r) ? { text: 'Gargalo. ', bold: true, color: CORES.alerta } : '',
          { text: `${alvoLegivel(r, modelo)}. `, bold: true },
          r.acao,
          cita(modelo, referenciasDoPasso(modelo, r)),
          { text: ` (${r.horizonte.toLowerCase()} prazo)`, style: 'pequeno' },
        ],
        margin: [0, 0, 0, 5],
      })),
    },
    { text: `O roteiro completo, com ${diag.totalAcoes} passos, está na seção 3.`, style: 'pequeno', margin: [0, 2, 0, 0] },
  ];
}

// ------------------------------------------------------------ 1. perfil
function perfil(diag, modelo) {
  const largura = 300;
  const x = v => (v / 100) * largura;
  const eg = diag.escoreGlobal;
  const zonas = modelo.faixas.map(f => ({ type: 'rect', x: x(f.limite_inferior), y: 0, w: x(f.limite_superior) - x(f.limite_inferior), h: 22, color: FUNDO_FAIXA[f.codigo] ?? CORES.zebra }));
  const cabecalho = [
    { text: '' },
    { columns: modelo.faixas.map(f => ({ width: x(f.limite_superior) - x(f.limite_inferior), text: f.nome, style: 'pequeno', alignment: 'center' })) },
    { text: '' },
  ];
  const linhas = diag.porDimensao.map(d => [
    { text: [d.critica ? { text: 'crítico  ', style: 'pequeno', color: CORES.alerta } : '', { text: `${d.codigo} `, bold: true }, d.nome], fontSize: 8.5, alignment: 'right', margin: [0, 5, 8, 0] },
    { canvas: [
      ...zonas,
      { type: 'rect', x: 0, y: 5, w: Math.max(x(d.escore), 1.5), h: 12, color: COR_FAIXA[d.faixa] },
      { type: 'line', x1: x(eg), y1: 0, x2: x(eg), y2: 22, lineWidth: 1, dash: { length: 3, space: 2 }, lineColor: CORES.texto },
    ] },
    { text: `${num(d.escore)}${d.eGargalo ? '  gargalo' : ''}`, bold: true, fontSize: 8.5, color: d.eGargalo ? CORES.alerta : CORES.texto, margin: [6, 5, 0, 0] },
  ]);
  const grafico = {
    table: { widths: [150, largura, '*'], body: [cabecalho, ...linhas] },
    layout: SEM_BORDAS,
  };
  const tabela = {
    table: {
      headerRows: 1,
      widths: ['*', 34, 38, 30, 62, 130],
      body: [
        [th('Critério'), th('Peso', 'right'), th('Escore', 'right'), th('Nível', 'right'), th('Faixa'), th('Situação')],
        ...diag.porDimensao.map(d => {
          const peso = modelo.dimensoes.find(x => x.codigo === d.codigo)?.peso ?? 0;
          const situacao = d.eGargalo ? 'Gargalo: limita o nível' : d.faixa === 'F1' ? 'Exige ação antes de investir em IA' : d.faixa === 'F2' ? 'Sustenta piloto delimitado' : 'Não restringe a adoção';
          return [
            { text: [{ text: `${d.codigo} `, bold: true }, d.nome, d.critica ? { text: '  crítico', style: 'pequeno' } : ''], style: 'td' },
            { text: `${num(peso * 100, 0)}%`, style: 'td', alignment: 'right' },
            { text: num(d.escore), style: 'td', alignment: 'right', bold: true },
            { text: String(d.nivel), style: 'td', alignment: 'right' },
            { text: nomeFaixa(modelo, d.faixa), style: 'td', color: COR_FAIXA_TEXTO[d.faixa], bold: true },
            { text: situacao, style: 'td', ...(d.eGargalo ? { color: CORES.alerta, bold: true } : {}) },
          ];
        }),
      ],
    },
    layout: TABELA,
    margin: [0, 10, 0, 0],
  };
  return secao(1, 'Perfil por critério', grafico, [
    { text: `Linha tracejada: média ponderada ${num(eg)}. Escore de 0 a 100 em cada critério; os críticos limitam o nível atribuído.`, style: 'pequeno', margin: [0, 4, 0, 0] },
    tabela,
  ], { quebra: true });
}

// ------------------------------------------------------------ 2. nível
function porQueNivel(diag, modelo) {
  const nivel = modelo.niveis.find(n => n.numero === diag.nivelFinal);
  const corpo = {
    table: {
      widths: [150, '*'],
      body: [
        [{ text: 'NÍVEL ATRIBUÍDO', style: 'rotulo' }, { text: [{ text: `${diag.nivelFinal} · ${nivel.nome}. `, bold: true }, nivel.interpretacao], fontSize: 9 }],
        [{ text: 'MÉDIA PONDERADA', style: 'rotulo' }, { text: `${num(diag.escoreGlobal)}, que corresponde ao nível ${diag.nivelCompensatorio} (${nomeNivel(modelo, diag.nivelCompensatorio)})`, fontSize: 9 }],
      ],
    },
    layout: PAINEL,
  };
  const resto = [];
  if (diag.tetoAtuou) {
    resto.push({
      text: [
        { text: 'Por que o nível é menor do que a média? ', bold: true },
        diag.observacoes.find(o => o.codigo === 'FA-01')?.texto ?? '',
        ' A literatura trata a base digital e os dados como pré-requisito da prontidão para IA, e não como um fator que outro ponto forte compense.',
        cita(modelo, modelo.fundamentacao?.teto_de_gargalo || []),
      ],
      margin: [0, 10, 0, 0],
    });
  } else {
    resto.push({ text: 'O nível atribuído coincide com o da média ponderada: nenhum critério crítico segura o resultado.', margin: [0, 10, 0, 0] });
  }
  diag.observacoes.filter(o => o.codigo === 'FA-02').forEach(o => resto.push({ text: o.texto, margin: [0, 6, 0, 0] }));
  return secao(2, 'Por que este nível', corpo, resto);
}

// ------------------------------------------------------------ 3. roteiro
function roteiro(app, modelo) {
  const diag = app.diagnostico;
  const resp = app.responsaveis || {};
  const advertencias = diag.roteiro.filter(r => r.origem === 'Advertência');
  const intro = { text: 'Advertências primeiro, depois uma ação por critério, da mais urgente para a menos urgente.', style: 'pequeno' };
  const resto = advertencias.map(a => ({
    table: { widths: [3, '*'], body: [[{ text: '', fillColor: CORES.alerta }, { text: [{ text: `Atenção: ${a.alvo}. `, bold: true }, a.acao, cita(modelo, referenciasDoPasso(modelo, a))], fillColor: CORES.zebra, margin: [8, 6, 6, 6] }]] },
    layout: { hLineWidth: () => 0, vLineWidth: () => 0, paddingLeft: () => 0, paddingRight: () => 0, paddingTop: () => 0, paddingBottom: () => 0 },
    margin: [0, 8, 0, 0],
  }));
  resto.push({
    table: {
      headerRows: 1,
      dontBreakRows: true,
      widths: [14, 82, '*', 40, 46, 70],
      body: [
        [th('#', 'right'), th('Onde'), th('O que fazer'), th('Esforço'), th('Horizonte'), th('Responsável')],
        ...diag.roteiro.map(r => [
          { text: String(r.ordem), style: 'td', alignment: 'right' },
          r.dimensao
            ? { stack: [{ text: [{ text: `${r.dimensao} `, bold: true }, nomeDimensao(modelo, r.dimensao)], style: 'td' }, { text: nomeFaixa(modelo, r.faixa), style: 'pequeno', color: COR_FAIXA_TEXTO[r.faixa] }] }
            : { text: 'Atenção', style: 'td', bold: true },
          { text: [ehGargalo(diag, r) ? { text: 'Gargalo. ', bold: true, color: CORES.alerta } : '', r.acao, cita(modelo, referenciasDoPasso(modelo, r))], style: 'td' },
          { text: r.esforco, style: 'td' },
          { text: r.horizonte, style: 'td' },
          { text: (resp[r.regra] || '').trim() || ' ', style: 'td' },
        ]),
      ],
    },
    layout: TABELA,
    margin: [0, 10, 0, 0],
  });
  resto.push({
    stack: [
      { text: ['Esforço: ', ...modelo.esforcos.flatMap(e => [{ text: `${e.codigo}: `, bold: true }, `${e.significado} `])], style: 'pequeno' },
      { text: ['Horizonte: ', ...modelo.horizontes.flatMap(h => [{ text: `${h.codigo}: `, bold: true }, `${h.significado} `])], style: 'pequeno', margin: [0, 2, 0, 0] },
    ],
    margin: [0, 6, 0, 0],
  });
  return secao(3, 'Roteiro de ação', intro, resto, { quebra: true });
}

// ------------------------------------------------------------ 4. Canvas
function blocoPdf(b) {
  if (b.p) return { text: trechos(b.p), margin: [0, 0, 0, 4] };
  if (b.ol) return { ol: b.ol.map(li => ({ text: trechos(li), margin: [0, 0, 0, 2] })), margin: [0, 0, 0, 4] };
  if (b.ul) return { ul: b.ul.map(li => ({ text: trechos(li), margin: [0, 0, 0, 2] })), margin: [0, 0, 0, 4] };
  if (b.escores) {
    return {
      table: { widths: ['*', 'auto'], body: b.escores.map(e => [{ text: e.rotulo }, { text: e.valor, bold: true, color: COR_FAIXA_TEXTO[e.faixa], alignment: 'right' }]) },
      layout: { ...PAINEL, paddingTop: () => 2, paddingBottom: () => 2 },
    };
  }
  if (b.vazio) return { text: b.vazio, italics: true, color: CORES.mudo };
  return '';
}

function canvas(app, modelo) {
  const celulas = celulasCanvas(app, modelo).map(c => ({
    stack: [
      { canvas: [{ type: 'line', x1: 0, y1: 0, x2: (LARGURA_UTIL - 16) / 2, y2: 0, lineWidth: 1.5, lineColor: CORES.faixa }] },
      { text: c.titulo, bold: true, fontSize: 9.5, color: CORES.faixa, margin: [0, 5, 0, 4] },
      ...c.blocos.map(blocoPdf),
      { text: c.origem, style: 'pequeno', italics: true, margin: [0, 2, 0, 0] },
    ],
    fontSize: 8.5,
  }));
  const linhas = [];
  for (let k = 0; k < celulas.length; k += 2) linhas.push([celulas[k], celulas[k + 1] ?? { text: '' }]);
  const grade = {
    table: { widths: ['*', '*'], dontBreakRows: true, body: linhas },
    layout: { hLineWidth: () => 0, vLineWidth: () => 0, paddingLeft: i => (i === 0 ? 0 : 8), paddingRight: i => (i === 0 ? 8 : 0), paddingTop: () => 6, paddingBottom: () => 10 },
  };
  return secao(4, 'Canvas de Prontidão', { text: 'O diagnóstico resumido em oito perguntas.', style: 'pequeno', margin: [0, 0, 0, 6] }, [grade], { quebra: true });
}

// ------------------------------------------------------------ 5. respostas
function respostas(app, modelo) {
  const blocos = modelo.dimensoes.map(d => {
    const itens = modelo.itens.filter(i => i.dimensao === d.codigo);
    return {
      table: {
        headerRows: 1,
        dontBreakRows: true,
        widths: [26, '*', 150],
        body: [
          [{ text: `${d.codigo} ${d.nome}`, style: 'th', colSpan: 3 }, {}, {}],
          ...itens.map(i => {
            const v = app.respostas[i.codigo];
            return [
              { text: i.codigo, style: 'pequeno', margin: [0, 1, 0, 0] },
              { text: i.assertiva, style: 'td' },
              { stack: [
                { text: v ? `${v} · ${modelo.escala[v - 1]?.descritor ?? ''}` : 'sem resposta', bold: true, fontSize: 8.5 },
                v ? { text: i.ancoras[v - 1], style: 'pequeno' } : '',
              ] },
            ];
          }),
        ],
      },
      layout: TABELA,
      margin: [0, 0, 0, 10],
    };
  });
  return secao(5, 'Respostas', { text: 'A descrição escolhida em cada uma das afirmações, de 1 (inexistente) a 5 (otimizada).', style: 'pequeno', margin: [0, 0, 0, 8] }, blocos, { quebra: true });
}

// ------------------------------------------------------------ 6. referências
function referencias(diag, modelo) {
  const refs = referenciasDoRelatorio(diag, modelo);
  if (!refs.length) return [];
  return secao(6, 'Referências', { text: 'As ações do roteiro e a regra do teto de gargalo se apoiam nestes estudos sobre adoção de IA em PMEs. Só entram as obras citadas neste diagnóstico.', style: 'pequeno', margin: [0, 0, 0, 8] }, [{
    ol: refs.map(r => ({
      text: [
        `${r.autores}, ${r.ano}. ${/[.?!]$/.test(r.titulo) ? r.titulo : `${r.titulo}.`} `,
        { text: r.veiculo, italics: true },
        '. ',
        r.doi ? { text: `doi:${r.doi}`, link: `https://doi.org/${r.doi}`, color: CORES.primaria } : '',
      ],
      fontSize: 8.5,
      margin: [0, 0, 0, 5],
    })),
  }]);
}

// ------------------------------------------------------------ documento
export function documentoRelatorio(app, modelo, { geradoEm = new Date().toISOString(), anexo = null } = {}) {
  const diag = app.diagnostico;
  const reap = periodicidade(diag.nivelFinal, modelo);
  const fim = {
    text: [
      { text: `Próxima aplicação sugerida: ${dataBR(diag.dataReaplicacao)}`, bold: true },
      ` (nível ${diag.nivelFinal}: a cada ${reap?.meses} meses). Antecipe se: ${reap?.gatilho ?? ''}`,
    ],
    style: 'pequeno',
    margin: [0, 16, 0, 0],
  };
  const doc = {
    pageSize: 'A4',
    pageMargins: [...PAGINA.margens],
    info: {
      title: `Diagnóstico de prontidão para IA: ${app.empresa.identificador}`,
      author: 'MGP-PME',
      subject: `Nível ${diag.nivelFinal} (${nomeNivel(modelo, diag.nivelFinal)}), modelo ${diag.versaoModelo}`,
      creator: 'MGP-PME',
      producer: 'MGP-PME',
      keywords: 'prontidão para IA; PME; diagnóstico',
    },
    defaultStyle: { font: 'Roboto', fontSize: 9, color: CORES.texto, lineHeight: 1.2 },
    styles: ESTILOS,
    content: [
      ...capa(app, modelo, geradoEm),
      ...perfil(diag, modelo),
      ...porQueNivel(diag, modelo),
      ...roteiro(app, modelo),
      ...canvas(app, modelo),
      ...respostas(app, modelo),
      ...referencias(diag, modelo),
      fim,
    ],
    background: pagina => (pagina === 1 ? fundoCapa(app) : null),
    header: pagina => (pagina === 1 ? null : {
      margin: [PAGINA.margens[0], 28, PAGINA.margens[2], 0],
      stack: [
        { columns: [
          { width: 'auto', text: 'MGP-PME', bold: true, fontSize: 9, color: CORES.faixa },
          { width: '*', text: [{ text: app.empresa.identificador, bold: true }, `  ·  ${dataBR(app.data)}`], fontSize: 8, alignment: 'right' },
        ] },
        { canvas: [{ type: 'line', x1: 0, y1: 6, x2: LARGURA_UTIL, y2: 6, lineWidth: 0.6, lineColor: CORES.filete }] },
      ],
    }),
    footer: (pagina, total) => (pagina === 1 ? null : {
      margin: [PAGINA.margens[0], 16, PAGINA.margens[2], 0],
      stack: [
        { canvas: [{ type: 'line', x1: 0, y1: 0, x2: LARGURA_UTIL, y2: 0, lineWidth: 0.6, lineColor: CORES.filete }] },
        { margin: [0, 6, 0, 0], columns: [
          { width: '*', text: `Gerado em ${dataHoraBR(geradoEm)}`, style: 'pequeno' },
          { width: 'auto', text: 'Calculado neste dispositivo; nenhum dado foi transmitido.', style: 'pequeno', alignment: 'center' },
          { width: '*', text: `Página ${pagina} de ${total}`, style: 'pequeno', alignment: 'right' },
        ] },
      ],
    }),
    pageBreakBefore: tituloOrfao,
  };
  if (anexo) {
    doc.files = { dados: { src: anexo.dataUrl, name: anexo.nome, description: 'Planilha de dados do diagnóstico (MGP-PME). Importe-a no Histórico para comparar reaplicações.' } };
  }
  return doc;
}

export async function gerarPdf(pdfMake, app, modelo, opcoes) {
  const buffer = await pdfMake.createPdf(documentoRelatorio(app, modelo, opcoes)).getBuffer();
  return new Blob([buffer], { type: 'application/pdf' });
}
