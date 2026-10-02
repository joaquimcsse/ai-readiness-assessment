// nucleo.js — camadas C2 (normalização e escore), C3 (classificação não
// compensatória) e C4 (inferência prescritiva), implementadas como funções
// puras sobre o contrato de dados. Nenhuma função lê ou escreve estado
// externo: é este módulo que a etapa V2 confere contra os casos de teste.
// O algoritmo segue a seção 4 (pseudocódigo da p. 19) e o fluxo principal
// do caso de uso UC-05.

import { validarModelo } from './validacao.js';

export class ErroDiagnostico extends Error {
  constructor(codigo, mensagem, detalhes = {}) {
    super(mensagem);
    this.name = 'ErroDiagnostico';
    this.codigo = codigo; // FE-01, FE-02 ou FE-03
    this.detalhes = detalhes;
  }
}

// Elimina ruído de ponto flutuante (ex.: 39,99999999 em vez de 40) sem
// alterar o valor em nenhuma casa decimal relevante.
const limpar = x => Math.round(x * 1e9) / 1e9;

// ---------------------------------------------------------------- C2
// CP-04 — Normalizador de respostas: e_i = (r_i − 1) / (5 − 1) × 100
export function normalizar(r) {
  if (!Number.isInteger(r) || r < 1 || r > 5) {
    throw new ErroDiagnostico('FE-03', `Resposta fora do domínio de 1 a 5: ${r}.`);
  }
  return ((r - 1) / 4) * 100;
}

// CP-02 (regra) — lista os itens sem resposta válida, na ordem do banco.
export function itensPendentes(respostas, modelo) {
  return modelo.itens
    .map(i => i.codigo)
    .filter(c => !Number.isInteger(respostas?.[c]) || respostas[c] < 1 || respostas[c] > 5);
}

// CP-05 — Agregador por dimensão: média simples dos escores normalizados (RN-03)
export function escoresPorDimensao(respostas, modelo) {
  const escores = {};
  for (const d of modelo.dimensoes) {
    const itens = modelo.itens.filter(i => i.dimensao === d.codigo);
    const soma = itens.reduce((acc, i) => acc + normalizar(respostas[i.codigo]), 0);
    escores[d.codigo] = limpar(soma / itens.length);
  }
  return escores;
}

// CP-06 — Ponderador global: E_g = Σ p_d · E_d (RN-04)
export function escoreGlobal(escores, modelo) {
  return limpar(modelo.dimensoes.reduce((acc, d) => acc + d.peso * escores[d.codigo], 0));
}

// ---------------------------------------------------------------- C3
// Busca em partição: limite inferior inclusivo, superior exclusivo,
// exceto no último intervalo, que inclui 100.
function buscarIntervalo(escore, intervalos, rotulo) {
  if (typeof escore !== 'number' || Number.isNaN(escore) || escore < 0 || escore > 100) {
    throw new ErroDiagnostico('FE-03', `Escore fora do domínio 0 a 100: ${escore}.`);
  }
  const ordenados = [...intervalos].sort((a, b) => a.limite_inferior - b.limite_inferior);
  for (let k = 0; k < ordenados.length; k++) {
    const it = ordenados[k];
    const ultimo = k === ordenados.length - 1;
    if (escore >= it.limite_inferior && (escore < it.limite_superior || (ultimo && escore <= it.limite_superior))) {
      return it;
    }
  }
  throw new ErroDiagnostico('FE-03', `Nenhum ${rotulo} cobre o escore ${escore}: tabela de limites inválida.`);
}

// CP-07 — Classificador de nível: ν(·)
export function nivelDe(escore, modelo) {
  return buscarIntervalo(escore, modelo.niveis, 'nível').numero;
}

export function faixaDe(escore, modelo) {
  return buscarIntervalo(escore, modelo.faixas, 'faixa').codigo;
}

// CP-08 — Aplicador do teto de gargalo:
// N_g = min( ν(E_g), min_{d∈C} ν(E_d) ),  C = dimensões críticas (RN-01, RN-02)
export function aplicarTeto(escores, eg, modelo) {
  const criticas = modelo.dimensoes.filter(d => d.critica).map(d => d.codigo);
  const nivelCompensatorio = nivelDe(eg, modelo);
  const teto = Math.min(...criticas.map(d => nivelDe(escores[d], modelo)));
  const nivelFinal = Math.min(nivelCompensatorio, teto);
  const tetoAtuou = nivelFinal < nivelCompensatorio;
  // Fig. 4: só há gargalo ativo quando o menor nível crítico fica abaixo do
  // nível do escore global; nesse caso, são gargalos as dimensões críticas
  // cujo nível iguala o teto. Caso contrário, registra-se ausência de gargalo.
  const gargalos = tetoAtuou ? criticas.filter(d => nivelDe(escores[d], modelo) === teto) : [];
  return { nivelCompensatorio, teto, nivelFinal, tetoAtuou, gargalos, criticas };
}

// ---------------------------------------------------------------- C4
// Avalia a condição declarativa de uma regra transversal.
export function avaliarCondicao(cond, ctx) {
  switch (cond.tipo) {
    case 'faixa':
      return ctx.faixas[cond.dimensao] === cond.faixa;
    case 'faixa_global':
      return ctx.faixaGlobal === cond.faixa;
    case 'criticas_em_faixa':
      return ctx.criticas.filter(d => ctx.faixas[d] === cond.faixa).length >= cond.minimo;
    case 'todas':
      return cond.condicoes.every(c => avaliarCondicao(c, ctx));
    case 'alguma':
      return cond.condicoes.some(c => avaliarCondicao(c, ctx));
    case 'nao':
      return !avaliarCondicao(cond.condicao, ctx);
    default:
      throw new ErroDiagnostico('FE-03', `Tipo de condição desconhecido: ${cond.tipo}.`);
  }
}

// CP-09 — Seletor de regras: uma regra de dimensão por dimensão (a da sua
// faixa) e as regras transversais cujas condições disparam.
export function selecionarRegras(faixas, faixaGlobal, modelo) {
  const criticas = modelo.dimensoes.filter(d => d.critica).map(d => d.codigo);
  const ctx = { faixas, faixaGlobal, criticas };
  const acoes = modelo.dimensoes.map(d => {
    const regra = modelo.regras_dimensao.find(r => r.dimensao === d.codigo && r.faixa === faixas[d.codigo]);
    if (!regra) throw new ErroDiagnostico('FE-03', `Base de regras sem regra para ${d.codigo}-${faixas[d.codigo]}.`);
    return regra;
  });
  const advertencias = modelo.regras_transversais.filter(r => avaliarCondicao(r.condicao, ctx));
  return { acoes, advertencias };
}

// CP-10 — Priorizador do roteiro.
// prioridade = peso da faixa + 50 se a dimensão for crítica + bônus de esforço;
// advertências recebem 1000 + bônus de esforço e precedem todas as ações (RN-06).
// Empates são desfeitos pela ordem das dimensões no modelo, D0 a D5 (FA-03).
export function priorizar(selecao, modelo) {
  const p = modelo.priorizacao;
  const ordemDim = modelo.dimensoes.map(d => d.codigo);
  const criticas = new Set(modelo.dimensoes.filter(d => d.critica).map(d => d.codigo));
  const ordemRT = modelo.regras_transversais.map(r => r.codigo);

  const advertencias = selecao.advertencias.map(r => ({
    regra: r.codigo,
    origem: 'Advertência',
    alvo: r.condicao_texto,
    dimensao: null,
    faixa: null,
    acao: r.acao,
    esforco: r.esforco,
    horizonte: r.horizonte,
    prioridade: p.peso_advertencia + p.bonus_esforco[r.esforco],
  }));
  const acoes = selecao.acoes.map(r => ({
    regra: r.codigo,
    origem: 'Ação',
    alvo: r.dimensao,
    dimensao: r.dimensao,
    faixa: r.faixa,
    acao: r.acao,
    esforco: r.esforco,
    horizonte: r.horizonte,
    prioridade: p.peso_faixa[r.faixa] + (criticas.has(r.dimensao) ? p.bonus_dimensao_critica : 0) + p.bonus_esforco[r.esforco],
  }));

  advertencias.sort((a, b) => b.prioridade - a.prioridade || ordemRT.indexOf(a.regra) - ordemRT.indexOf(b.regra));
  acoes.sort((a, b) => b.prioridade - a.prioridade || ordemDim.indexOf(a.dimensao) - ordemDim.indexOf(b.dimensao));
  return [...advertencias, ...acoes].map((item, k) => ({ ordem: k + 1, ...item }));
}

// Data sugerida de reaplicação (ciclo da seção 6).
export function periodicidade(nivel, modelo) {
  return modelo.reaplicacao.find(r => r.niveis.includes(nivel));
}

export function dataReaplicacao(dataISO, nivel, modelo) {
  const regra = periodicidade(nivel, modelo);
  const [a, m, d] = dataISO.split('-').map(Number);
  const alvo = new Date(Date.UTC(a, m - 1 + regra.meses, 1));
  const ultimoDia = new Date(Date.UTC(alvo.getUTCFullYear(), alvo.getUTCMonth() + 1, 0)).getUTCDate();
  alvo.setUTCDate(Math.min(d, ultimoDia));
  return alvo.toISOString().slice(0, 10);
}

// ---------------------------------------------------------------- UC-05
// Orquestra o fluxo principal: completude → normalização → agregação →
// ponderação → classificação → teto → seleção → priorização.
// opcoes.versaoFixada: versão do modelo fixada no início da aplicação (FE-02).
// opcoes.data: data da aplicação (ISO), para a data sugerida de reaplicação.
export function diagnosticar(respostas, modelo, opcoes = {}) {
  // FE-02 — versão do modelo alterada durante a aplicação
  if (opcoes.versaoFixada && opcoes.versaoFixada !== modelo.versao_modelo) {
    throw new ErroDiagnostico('FE-02',
      `A aplicação foi iniciada sob a versão ${opcoes.versaoFixada} do modelo, mas a versão carregada é ${modelo.versao_modelo}. Reinicie a aplicação para não misturar respostas coletadas sob modelos distintos.`,
      { versaoFixada: opcoes.versaoFixada, versaoAtual: modelo.versao_modelo });
  }
  // FE-03 — parâmetro fora do domínio
  const errosModelo = validarModelo(modelo);
  if (errosModelo.length) {
    throw new ErroDiagnostico('FE-03', `Parâmetros do modelo inválidos: ${errosModelo.join(' ')}`, { erros: errosModelo });
  }
  // FE-01 — itens sem resposta
  const pendentes = itensPendentes(respostas, modelo);
  if (pendentes.length) {
    throw new ErroDiagnostico('FE-01', `Há ${pendentes.length} item(ns) sem resposta: ${pendentes.join(', ')}.`, { pendentes });
  }

  const escores = escoresPorDimensao(respostas, modelo);
  const eg = escoreGlobal(escores, modelo);
  const niveis = {};
  const faixas = {};
  for (const d of modelo.dimensoes) {
    niveis[d.codigo] = nivelDe(escores[d.codigo], modelo);
    faixas[d.codigo] = faixaDe(escores[d.codigo], modelo);
  }
  const faixaGlobal = faixaDe(eg, modelo);
  const teto = aplicarTeto(escores, eg, modelo);
  const selecao = selecionarRegras(faixas, faixaGlobal, modelo);
  const roteiro = priorizar(selecao, modelo);

  const porDimensao = modelo.dimensoes.map(d => ({
    codigo: d.codigo,
    nome: d.nome,
    critica: d.critica,
    escore: escores[d.codigo],
    nivel: niveis[d.codigo],
    faixa: faixas[d.codigo],
    eGargalo: teto.gargalos.includes(d.codigo),
  }));

  const observacoes = [];
  if (teto.tetoAtuou) {
    const nomes = Object.fromEntries(modelo.niveis.map(n => [n.numero, n.nome]));
    observacoes.push({
      codigo: 'FA-01',
      texto: `O escore ponderado (${eg.toFixed(1).replace('.', ',')}) corresponde ao nível ${teto.nivelCompensatorio} (${nomes[teto.nivelCompensatorio]}), mas o nível atribuído é ${teto.nivelFinal} (${nomes[teto.nivelFinal]}): a média ponderada superestima a prontidão real, porque ${teto.gargalos.join(', ')} — dimensão crítica de menor escore — limita o que a empresa consegue sustentar.`,
    });
  }
  if (!Object.values(faixas).includes('F1')) {
    observacoes.push({
      codigo: 'FA-02',
      texto: 'Nenhuma dimensão está na faixa Crítica: não há gargalos ativos, e o roteiro é composto por ações de consolidação e ampliação.',
    });
  }
  if (!roteiro.some(r => r.horizonte === 'Curto')) {
    observacoes.push({
      codigo: 'UC-07',
      texto: 'O roteiro não contém nenhuma ação de curto prazo: o perfil não oferece ganho rápido disponível.',
    });
  }

  const resultado = {
    versaoModelo: modelo.versao_modelo,
    escores,
    escoreGlobal: eg,
    faixaGlobal,
    niveis,
    faixas,
    porDimensao,
    nivelCompensatorio: teto.nivelCompensatorio,
    teto: teto.teto,
    nivelFinal: teto.nivelFinal,
    tetoAtuou: teto.tetoAtuou,
    gargalos: teto.gargalos,
    roteiro,
    observacoes,
    totalAcoes: roteiro.length,
    totalAdvertencias: roteiro.filter(r => r.origem === 'Advertência').length,
  };
  if (opcoes.data) {
    resultado.dataReaplicacao = dataReaplicacao(opcoes.data, teto.nivelFinal, modelo);
  }
  return resultado;
}
