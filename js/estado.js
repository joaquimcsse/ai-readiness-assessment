// estado.js — único ponto em que a aplicação escreve fora da memória:
// persistência no armazenamento local do navegador, máquina de estados de
// uma aplicação (seção 6, Fig. 6) e exportação/importação do diagnóstico
// em arquivo (CP-13). Nenhum dado deixa o dispositivo (ADR-03, RNF05).

const CHAVE = 'mgp-pme:v1';
export const FORMATO_EXPORTACAO = 'mgp-pme/diagnostico';
export const FORMATO_AVALIACAO = 'mgp-pme/avaliacao';

export const ESTADOS = {
  PREPARADA: 'Preparada',
  EM_PREENCHIMENTO: 'Em preenchimento',
  COMPLETA: 'Completa',
  DIAGNOSTICADA: 'Diagnosticada',
  ARQUIVADA: 'Arquivada',
};

export const SIGNIFICADO_ESTADO = {
  'Preparada': 'A ficha de contexto foi preenchida e a versão do modelo, fixada.',
  'Em preenchimento': 'Há ao menos uma resposta registrada e itens ainda pendentes.',
  'Completa': 'As trinta respostas estão registradas; o cálculo pode ser executado.',
  'Diagnosticada': 'Escores, nível final e roteiro foram calculados e estão disponíveis.',
  'Arquivada': 'O diagnóstico foi exportado e serve de base de comparação para a próxima aplicação.',
};

// ------------------------------------------------------------ armazenamento
let memoria = null; // reserva quando o armazenamento local está indisponível
let persistente = true;

function vazio() {
  return { atual: null, aplicacoes: {}, avaliacoes: [] };
}

export function carregar() {
  if (memoria) return memoria;
  try {
    const bruto = localStorage.getItem(CHAVE);
    memoria = bruto ? { ...vazio(), ...JSON.parse(bruto) } : vazio();
  } catch {
    persistente = false;
    memoria = vazio();
  }
  return memoria;
}

export function salvar() {
  if (!memoria) return;
  try {
    localStorage.setItem(CHAVE, JSON.stringify(memoria));
    persistente = true;
  } catch {
    persistente = false;
  }
}

export function armazenamentoDisponivel() {
  carregar();
  return persistente;
}

function novoId() {
  const agora = new Date();
  const base = agora.toISOString().replace(/[-:T]/g, '').slice(0, 14);
  return `APL-${base}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
}

export function hojeISO() {
  const d = new Date();
  const p = n => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

// ------------------------------------------------------------ consultas
export function aplicacaoAtual() {
  const s = carregar();
  return s.atual ? s.aplicacoes[s.atual] || null : null;
}

export function obterAplicacao(id) {
  return carregar().aplicacoes[id] || null;
}

export function listarAplicacoes() {
  return Object.values(carregar().aplicacoes)
    .sort((a, b) => (b.data || '').localeCompare(a.data || '') || (b.criadaEm || '').localeCompare(a.criadaEm || ''));
}

export function definirAtual(id) {
  const s = carregar();
  s.atual = id;
  salvar();
}

export function contarRespondidas(app) {
  return Object.values(app.respostas || {}).filter(v => Number.isInteger(v) && v >= 1 && v <= 5).length;
}

// ------------------------------------------------------------ transições
// UC-01 — iniciar aplicação: ficha preenchida e versão do modelo fixada.
export function iniciarAplicacao(ficha, versaoModelo, anterior = null) {
  const s = carregar();
  const app = {
    id: novoId(),
    criadaEm: new Date().toISOString(),
    versaoModelo,
    empresa: {
      identificador: ficha.identificador,
      setor: ficha.setor,
      porte: ficha.porte,
      funcionarios: ficha.funcionarios,
    },
    respondente: ficha.respondente,
    data: ficha.data,
    estado: ESTADOS.PREPARADA,
    respostas: {},
    diagnostico: null,
    responsaveis: {},
    anterior, // aplicação de que esta é reaplicação (UC-09)
    exportadaEm: null,
    origem: 'local',
    historicoEstados: [{ estado: ESTADOS.PREPARADA, em: new Date().toISOString() }],
  };
  s.aplicacoes[app.id] = app;
  s.atual = app.id;
  salvar();
  return app;
}

function mudarEstado(app, estado) {
  if (app.estado !== estado) {
    app.estado = estado;
    app.historicoEstados = [...(app.historicoEstados || []), { estado, em: new Date().toISOString() }];
  }
}

export function atualizarFicha(app, ficha) {
  if (app.estado === ESTADOS.ARQUIVADA) return app;
  app.empresa = { identificador: ficha.identificador, setor: ficha.setor, porte: ficha.porte, funcionarios: ficha.funcionarios };
  app.respondente = ficha.respondente;
  app.data = ficha.data;
  salvar();
  return app;
}

// UC-02 — registrar ou alterar resposta. Alterar uma resposta depois do
// cálculo devolve a aplicação a Em preenchimento, invalidando o diagnóstico
// anterior em vez de atualizá-lo silenciosamente.
export function registrarResposta(app, item, valor, totalItens) {
  if (app.estado === ESTADOS.ARQUIVADA) {
    throw new Error('Aplicação arquivada: as respostas não podem ser alteradas. Inicie uma reaplicação.');
  }
  if (!Number.isInteger(valor) || valor < 1 || valor > 5) {
    return app; // exceção de UC-02: valor fora do domínio é recusado e a resposta anterior é mantida
  }
  if (app.respostas[item] === valor && app.estado !== ESTADOS.PREPARADA) return app;
  app.respostas[item] = valor;
  if (app.diagnostico) app.diagnostico = null;
  mudarEstado(app, ESTADOS.EM_PREENCHIMENTO);
  if (contarRespondidas(app) >= totalItens) mudarEstado(app, ESTADOS.COMPLETA);
  salvar();
  return app;
}

export function registrarDiagnostico(app, diagnostico) {
  app.diagnostico = { ...diagnostico, geradoEm: new Date().toISOString() };
  mudarEstado(app, ESTADOS.DIAGNOSTICADA);
  salvar();
  return app;
}

// FE-01 — devolve a aplicação a Em preenchimento.
export function devolverParaPreenchimento(app) {
  app.diagnostico = null;
  mudarEstado(app, ESTADOS.EM_PREENCHIMENTO);
  salvar();
}

export function definirResponsavel(app, regra, nome) {
  app.responsaveis = { ...(app.responsaveis || {}), [regra]: nome };
  salvar();
}

export function excluirAplicacao(id) {
  const s = carregar();
  delete s.aplicacoes[id];
  if (s.atual === id) s.atual = null;
  salvar();
}

// ------------------------------------------------------------ arquivos
export function baixarArquivo(nome, conteudo, tipo = 'application/json') {
  const blob = new Blob([conteudo], { type: `${tipo};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = nome;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function slug(texto) {
  return String(texto || 'empresa')
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '-').replace(/^-|-$/g, '').toLowerCase().slice(0, 40) || 'empresa';
}

// UC-08 / CP-13 — exportar diagnóstico. Leva a aplicação a Arquivada.
export function exportarDiagnostico(app) {
  if (!app.diagnostico) throw new Error('Não há diagnóstico para exportar.');
  app.exportadaEm = new Date().toISOString();
  mudarEstado(app, ESTADOS.ARQUIVADA);
  salvar();
  const pacote = {
    formato: FORMATO_EXPORTACAO,
    versaoFormato: 1,
    exportadoEm: app.exportadaEm,
    aplicacao: app,
  };
  baixarArquivo(`mgp-pme_${slug(app.empresa.identificador)}_${app.data}.json`, JSON.stringify(pacote, null, 2));
  return app;
}

// UC-09 — importar um diagnóstico exportado anteriormente, para comparação.
export function importarDiagnostico(texto) {
  let pacote;
  try {
    pacote = JSON.parse(texto);
  } catch {
    throw new Error('O arquivo não é um JSON válido.');
  }
  if (pacote?.formato !== FORMATO_EXPORTACAO || !pacote.aplicacao?.diagnostico) {
    throw new Error('O arquivo não é um diagnóstico exportado pelo MGP-PME.');
  }
  const app = pacote.aplicacao;
  const s = carregar();
  if (s.aplicacoes[app.id]) {
    return { app: s.aplicacoes[app.id], jaExistia: true };
  }
  app.origem = 'importada';
  app.estado = ESTADOS.ARQUIVADA;
  s.aplicacoes[app.id] = app;
  salvar();
  return { app, jaExistia: false };
}

// ------------------------------------------------------------ rascunho do modelo (UC-10 a UC-12)
const CHAVE_RASCUNHO = 'mgp-pme:rascunho-modelo';

export function carregarRascunhoModelo() {
  try {
    const bruto = localStorage.getItem(CHAVE_RASCUNHO);
    return bruto ? JSON.parse(bruto) : null;
  } catch {
    return null;
  }
}

export function salvarRascunhoModelo(modelo) {
  try { localStorage.setItem(CHAVE_RASCUNHO, JSON.stringify(modelo)); } catch { /* sem persistência */ }
}

export function descartarRascunhoModelo() {
  try { localStorage.removeItem(CHAVE_RASCUNHO); } catch { /* sem persistência */ }
}

// ------------------------------------------------------------ avaliações (UC-13)
export function salvarAvaliacao(avaliacao) {
  const s = carregar();
  s.avaliacoes = [...(s.avaliacoes || []), avaliacao];
  salvar();
}

export function listarAvaliacoes() {
  return carregar().avaliacoes || [];
}

export function excluirAvaliacao(id) {
  const s = carregar();
  s.avaliacoes = (s.avaliacoes || []).filter(a => a.id !== id);
  salvar();
}

export function exportarAvaliacao(avaliacao) {
  baixarArquivo(`mgp-pme_avaliacao_${avaliacao.id}.json`,
    JSON.stringify({ formato: FORMATO_AVALIACAO, versaoFormato: 1, avaliacao }, null, 2));
}

export function novoIdAvaliacao() {
  return `AVL-${new Date().toISOString().replace(/[-:T]/g, '').slice(0, 14)}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
}
