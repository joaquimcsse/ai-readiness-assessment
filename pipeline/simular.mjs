// simular.mjs — simulação sintética (E4) sobre o núcleo do MGP-PME.
//
// Reescrita a partir da especificação do relatório de avaliação do PBL 7
// (seção 2.4 e Tabelas 5 e 9 a 14): o script original não foi versionado.
// Importa o núcleo e o dados.json sem alterá-los e usa a semente 20261013.
//
// Uso:
//   node pipeline/simular.mjs                 roda tudo e grava pipeline/saida/simulacao.json
//   node pipeline/simular.mjs --verificar     roda só as verificações (sai com código 1 se houver divergência)
//   node pipeline/simular.mjs --nucleo DIR    usa DIR/nucleo.js em vez de js/nucleo.js (usado por mutacao.mjs)
//
// As verificações comparam o núcleo com oráculos independentes (fronteiras em
// inteiros, regra do teto, ordem do roteiro, calendário), de modo que um
// defeito no núcleo não contamina o oráculo.

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const RAIZ = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const soVerificar = args.includes('--verificar');
const silencioso = args.includes('--silencioso');
const iNucleo = args.indexOf('--nucleo');
const dirNucleo = iNucleo >= 0 ? resolve(args[iNucleo + 1]) : resolve(RAIZ, 'js');

const N = await import(pathToFileURL(resolve(dirNucleo, 'nucleo.js')).href);
const MODELO = JSON.parse(readFileSync(resolve(RAIZ, 'dados.json'), 'utf8'));
const SEMENTE = 20261013;

const DIMS = MODELO.dimensoes.map(d => d.codigo);
const ITENS = Object.fromEntries(DIMS.map(d => [d, MODELO.itens.filter(i => i.dimensao === d).map(i => i.codigo)]));
const TODOS = MODELO.itens.map(i => i.codigo);
const CRITICAS = MODELO.dimensoes.filter(d => d.critica).map(d => d.codigo);
const clone = o => JSON.parse(JSON.stringify(o));

// ------------------------------------------------------------------ aleatoriedade
function mulberry32(a) {
  return () => {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rng = mulberry32(SEMENTE);
const unif = (a, b) => a + (b - a) * rng();
const inteiro = (a, b) => a + Math.floor(rng() * (b - a + 1));
function normal(dp) {
  const u = Math.max(rng(), 1e-12), v = rng();
  return dp * Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}
const clamp = (x, a, b) => Math.min(b, Math.max(a, x));

// População 1: itens independentes, cada resposta sorteada de 1 a 5.
const perfilIndependente = () => Object.fromEntries(TODOS.map(c => [c, inteiro(1, 5)]));
// População 2: maturidade global sorteada + desvio por dimensão (dp 0,15) + ruído por item (dp 0,15), na escala 0 a 1.
function perfilCorrelacionado() {
  const m = rng();
  const r = {};
  for (const d of DIMS) {
    const desvio = normal(0.15);
    for (const c of ITENS[d]) r[c] = 1 + Math.round(4 * clamp(m + desvio + normal(0.15), 0, 1));
  }
  return r;
}

// ------------------------------------------------------------------ diagnóstico
// Composição das funções exportadas do núcleo, sem a validação do modelo, para
// que a sensibilidade possa usar parâmetros perturbados (pesos não inteiros etc.).
function diag(r, modelo = MODELO) {
  const escores = N.escoresPorDimensao(r, modelo);
  const eg = N.escoreGlobal(escores, modelo);
  const faixas = Object.fromEntries(modelo.dimensoes.map(d => [d.codigo, N.faixaDe(escores[d.codigo], modelo)]));
  const teto = N.aplicarTeto(escores, eg, modelo);
  const roteiro = N.priorizar(N.selecionarRegras(faixas, N.faixaDe(eg, modelo), modelo), modelo);
  return { escores, eg, faixas, ...teto, roteiro };
}
const nivelCompUniforme = r => {
  const e = N.escoresPorDimensao(r, MODELO);
  return N.nivelDe(DIMS.reduce((a, d) => a + e[d], 0) / DIMS.length, MODELO);
};
const pct = (k, n) => +(100 * k / n).toFixed(1);
const media = xs => xs.reduce((a, b) => a + b, 0) / xs.length;
const p95 = xs => [...xs].sort((a, b) => a - b)[Math.min(xs.length - 1, Math.ceil(0.95 * xs.length) - 1)];
const r2 = x => +x.toFixed(2);
const r3 = x => +x.toFixed(3);

// ------------------------------------------------------------------ oráculos independentes
const LIM_NIVEL = MODELO.niveis.map(n => [n.numero, n.limite_inferior, n.limite_superior]);
const LIM_FAIXA = MODELO.faixas.map(f => [f.codigo, f.limite_inferior, f.limite_superior]);
// Escore de uma dimensão com k itens e soma s: 100·(s − k)/(4k). Compara em inteiros: 100·(s−k) vs L·4k.
function oraculoIntervalo(s, k, tabela) {
  const num = 100 * (s - k), den = 4 * k;
  for (let j = 0; j < tabela.length; j++) {
    const [id, lo, hi] = tabela[j];
    const ultimo = j === tabela.length - 1;
    if (num >= lo * den && (num < hi * den || (ultimo && num <= hi * den))) return id;
  }
  return null;
}
const oraculoNivelEscore = e => LIM_NIVEL.find(([, lo, hi], j) => e >= lo && (e < hi || (j === LIM_NIVEL.length - 1 && e <= hi)))[0];
// Ordem esperada do roteiro: advertências antes das ações; ações por faixa, depois crítica, esforço e ordem de dimensão.
function ordemCorreta(roteiro) {
  const p = MODELO.priorizacao;
  const adv = roteiro.filter(x => x.origem === 'Advertência');
  const ac = roteiro.filter(x => x.origem !== 'Advertência');
  if (roteiro.slice(0, adv.length).some(x => x.origem !== 'Advertência')) return false;
  const chave = x => [p.peso_faixa[x.faixa], CRITICAS.includes(x.dimensao) ? 1 : 0, p.bonus_esforco[x.esforco], -DIMS.indexOf(x.dimensao)];
  for (let i = 1; i < ac.length; i++) {
    const a = chave(ac[i - 1]), b = chave(ac[i]);
    for (let j = 0; j < a.length; j++) {
      if (a[j] > b[j]) break;
      if (a[j] < b[j]) return false;
    }
  }
  return true;
}
// Calendário independente: soma meses e limita o dia ao último dia do mês de destino.
function oraculoData(iso, meses) {
  let [a, m, d] = iso.split('-').map(Number);
  m += meses;
  while (m > 12) { m -= 12; a += 1; }
  const bissexto = (a % 4 === 0 && a % 100 !== 0) || a % 400 === 0;
  const dias = [31, bissexto ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][m - 1];
  return `${a}-${String(m).padStart(2, '0')}-${String(Math.min(d, dias)).padStart(2, '0')}`;
}

// ------------------------------------------------------------------ verificações
function verificacoes() {
  const out = {};
  const vrng = mulberry32(SEMENTE + 1);
  const vint = (a, b) => a + Math.floor(vrng() * (b - a + 1));
  const aleatorio = () => Object.fromEntries(TODOS.map(c => [c, vint(1, 5)]));

  // Caso Aurora (Seção 5 do artigo): escores, nível 2 com teto e roteiro de 7 linhas.
  const aurora = { D0: [4, 4, 3, 3], D1: [2, 2, 1, 2, 2], D2: [4, 5, 4, 3, 4], D3: [3, 2, 3, 3, 2, 3], D4: [2, 3, 2, 3, 2], D5: [4, 4, 3, 2, 3] };
  const rA = {};
  for (const d of DIMS) ITENS[d].forEach((c, k) => { rA[c] = aurora[d][k]; });
  const dA = N.diagnosticar(rA, MODELO);
  const esperadoA = ['RT-04', 'RD-D1-F1', 'RD-D4-F1', 'RD-D0-F2', 'RD-D3-F2', 'RD-D5-F2', 'RD-D2-F3'];
  out.aurora = { casos: 1, divergencias: (dA.nivelFinal === 2 && dA.nivelCompensatorio === 3 && dA.gargalos.join() === 'D1'
    && dA.roteiro.map(x => x.regra).join() === esperadoA.join()) ? 0 : 1 };

  // Harness: diag() composto deve coincidir com diagnosticar().
  let div = 0;
  for (let i = 0; i < 2000; i++) {
    const r = aleatorio();
    const a = diag(r), b = N.diagnosticar(r, MODELO);
    if (a.nivelFinal !== b.nivelFinal || a.gargalos.join() !== b.gargalos.join()
      || a.roteiro.map(x => x.regra).join() !== b.roteiro.map(x => x.regra).join()) div++;
  }
  out.harness = { casos: 2000, divergencias: div };

  // Teto: o nível final é min(ν(E_g), min ν(E_d) das críticas), calculado pelo oráculo.
  div = 0;
  for (let i = 0; i < 2000; i++) {
    const r = aleatorio();
    const b = N.diagnosticar(r, MODELO);
    const esperado = Math.min(oraculoNivelEscore(b.escoreGlobal), ...CRITICAS.map(d => oraculoNivelEscore(b.escores[d])));
    if (b.nivelFinal !== esperado) div++;
  }
  out.teto = { casos: 2000, divergencias: div };

  // Monotonicidade: subir uma resposta nunca reduz escore, teto nem nível.
  let casos = 0; div = 0;
  for (let i = 0; i < 1000; i++) {
    const r = aleatorio();
    const a = N.diagnosticar(r, MODELO);
    for (const c of TODOS) {
      if (r[c] === 5) continue;
      casos++;
      const b = N.diagnosticar({ ...r, [c]: r[c] + 1 }, MODELO);
      if (b.escoreGlobal < a.escoreGlobal - 1e-9 || b.teto < a.teto || b.nivelFinal < a.nivelFinal
        || DIMS.some(d => b.escores[d] < a.escores[d] - 1e-9)) div++;
    }
  }
  out.monotonicidade = { casos, divergencias: div };

  // Fronteiras: todas as combinações de respostas de cada dimensão contra o oráculo em inteiros.
  casos = 0; div = 0;
  for (const d of DIMS) {
    const k = ITENS[d].length;
    const total = 5 ** k;
    for (let n = 0; n < total; n++) {
      const resp = {};
      let x = n, s = 0;
      for (const c of ITENS[d]) { resp[c] = 1 + (x % 5); s += resp[c]; x = Math.floor(x / 5); }
      for (const c of TODOS) if (!(c in resp)) resp[c] = 3;
      const e = N.escoresPorDimensao(resp, MODELO)[d];
      casos++;
      if (N.nivelDe(e, MODELO) !== oraculoIntervalo(s, k, LIM_NIVEL) || N.faixaDe(e, MODELO) !== oraculoIntervalo(s, k, LIM_FAIXA)) div++;
    }
  }
  out.fronteiras = { casos, divergencias: div };

  // Entradas inválidas ou ausentes devem gerar FE-01, nunca um resultado silencioso.
  const invalidos = [0, 6, -1, 2.5, '3', null, undefined, NaN, true, {}];
  casos = 0; div = 0;
  const espera = (fn, codigo) => { try { fn(); return false; } catch (e) { return e instanceof N.ErroDiagnostico && e.codigo === codigo; } };
  for (let i = 0; i < 2000; i++) {
    const r = aleatorio();
    const c = TODOS[vint(0, TODOS.length - 1)];
    const v = invalidos[vint(0, invalidos.length - 1)];
    if (v === undefined) delete r[c]; else r[c] = v;
    casos++;
    if (!espera(() => N.diagnosticar(r, MODELO), 'FE-01')) div++;
  }
  for (const r of [{}, null, undefined]) { casos++; if (!espera(() => N.diagnosticar(r, MODELO), 'FE-01')) div++; }
  out.entradas_invalidas = { casos, divergencias: div };

  // Modelo corrompido gera FE-03; versão divergente gera FE-02.
  const base = Object.fromEntries(TODOS.map(c => [c, 3]));
  const corrupcoes = [
    m => { m.dimensoes[0].peso = 0.5; },
    m => { m.niveis[1].limite_inferior = 25; },
    m => { m.faixas.pop(); },
    m => { m.regras_dimensao.shift(); },
    m => { m.itens.pop(); },
    m => { m.dimensoes[1].critica = 'sim'; },
    m => { delete m.priorizacao.peso_faixa.F1; },
  ];
  casos = 0; div = 0;
  for (const corromper of corrupcoes) {
    const m = clone(MODELO); corromper(m);
    casos++;
    if (!espera(() => N.diagnosticar(base, m), 'FE-03')) div++;
  }
  casos++;
  if (!espera(() => N.diagnosticar(base, MODELO, { versaoFixada: '0.9.0' }), 'FE-02')) div++;
  out.modelo_corrompido = { casos, divergencias: div };

  // Datas de reaplicação contra um calendário independente (435 dias × 3 periodicidades).
  casos = 0; div = 0;
  const inicio = Date.UTC(2027, 10, 1);
  for (let k = 0; k < 435; k++) {
    const iso = new Date(inicio + k * 86400000).toISOString().slice(0, 10);
    for (const grupo of MODELO.reaplicacao) {
      casos++;
      if (N.dataReaplicacao(iso, grupo.niveis[0], MODELO) !== oraculoData(iso, grupo.meses)) div++;
    }
  }
  out.datas = { casos, divergencias: div };

  // Ordem do roteiro em todos os 15.625 perfis de resposta única por dimensão.
  casos = 0; div = 0;
  for (const r of enumerarPerfis()) { casos++; if (!ordemCorreta(N.diagnosticar(r, MODELO).roteiro)) div++; }
  out.ordem_roteiro = { casos, divergencias: div };

  // Personas (esperado derivado à mão das regras do PBL 4, Tabela 12 do PBL 7).
  out.personas = personas();
  return out;
}

// Perfis com a mesma resposta em todos os itens de cada dimensão: 5^6 = 15.625.
function* enumerarPerfis() {
  for (let n = 0; n < 5 ** DIMS.length; n++) {
    const r = {};
    let x = n;
    for (const d of DIMS) { const v = 1 + (x % 5); x = Math.floor(x / 5); for (const c of ITENS[d]) r[c] = v; }
    yield r;
  }
}
const perfilPorDimensao = vals => { const r = {}; DIMS.forEach((d, k) => ITENS[d].forEach(c => { r[c] = vals[k]; })); return r; };

function personas() {
  const lista = [
    { id: 'P1', perfil: [1, 1, 5, 4, 2, 3], nivel: 1, gargalos: ['D0', 'D1'], rt: ['RT-01', 'RT-02', 'RT-04'] },
    { id: 'P2', perfil: [5, 4, 3, 3, 1, 3], nivel: 3, gargalos: [], rt: ['RT-06'] },
    { id: 'P3', perfil: [3, 3, 3, 3, 3, 3], nivel: 3, gargalos: [], rt: [] },
    { id: 'P4', perfil: [1, 1, 5, 1, 1, 1], nivel: 1, gargalos: [], rt: ['RT-01', 'RT-02', 'RT-04', 'RT-05'] },
    { id: 'P5', perfil: [5, 5, 5, 1, 5, 5], nivel: 1, gargalos: ['D3'], rt: ['RT-03', 'RT-05'] },
    { id: 'P6', perfil: [5, 5, 5, 5, 1, 5], nivel: 5, gargalos: [], rt: ['RT-06'] },
  ];
  const resultado = lista.map(p => {
    const d = N.diagnosticar(perfilPorDimensao(p.perfil), MODELO);
    const rt = d.roteiro.filter(x => x.origem === 'Advertência').map(x => x.regra).sort();
    const confere = d.nivelFinal === p.nivel && d.gargalos.join() === p.gargalos.join() && rt.join() === [...p.rt].sort().join();
    return { id: p.id, perfil: p.perfil, esperado: { nivel: p.nivel, gargalos: p.gargalos, rt: p.rt }, observado: { nivel: d.nivelFinal, gargalos: d.gargalos, rt }, confere };
  });
  return { casos: lista.length, divergencias: resultado.filter(x => !x.confere).length, detalhes: resultado };
}

// ------------------------------------------------------------------ experimentos
function ablacao(gerar, n) {
  let teto = 0, perdidos = [], perde2 = 0, unifComp = 0, unifFinal = 0, seis = 0, comAdv = 0, semCurto = 0, tam = [];
  let primeiraGargalo = 0, outraNaFrente = 0;
  const faixaGargalo = { F1: 0, F2: 0, F3: 0 };
  const finais = [], comps = [];
  const modeloUnif = clone(MODELO); modeloUnif.dimensoes.forEach(d => { d.peso = 1 / DIMS.length; });
  for (let i = 0; i < n; i++) {
    const r = gerar();
    const d = diag(r);
    finais.push(d.nivelFinal); comps.push(d.nivelCompensatorio);
    const perda = d.nivelCompensatorio - d.nivelFinal;
    perdidos.push(perda);
    if (perda >= 2) perde2++;
    const du = diag(r, modeloUnif);
    if (du.nivelCompensatorio !== d.nivelCompensatorio) unifComp++;
    if (du.nivelFinal !== d.nivelFinal) unifFinal++;
    const tetoSeis = Math.min(d.nivelCompensatorio, ...DIMS.map(x => N.nivelDe(d.escores[x], MODELO)));
    if (tetoSeis !== d.nivelFinal) seis++;
    if (d.roteiro.some(x => x.origem === 'Advertência')) comAdv++;
    if (!d.roteiro.some(x => x.horizonte === 'Curto')) semCurto++;
    tam.push(d.roteiro.length);
    if (d.tetoAtuou) {
      teto++;
      const acoes = d.roteiro.filter(x => x.origem !== 'Advertência');
      if (d.gargalos.includes(acoes[0].dimensao)) primeiraGargalo++;
      const maisFraco = [...d.gargalos].sort((a, b) => d.escores[a] - d.escores[b] || DIMS.indexOf(a) - DIMS.indexOf(b))[0];
      const pG = acoes.find(x => x.dimensao === maisFraco).prioridade;
      if (acoes.some(x => !d.gargalos.includes(x.dimensao) && x.prioridade > pG)) outraNaFrente++;
      faixaGargalo[d.faixas[maisFraco]]++;
    }
  }
  return {
    perfis: n,
    nivel_final_medio: r2(media(finais)),
    nivel_compensatorio_medio: r2(media(comps)),
    teto_atua_pct: pct(teto, n),
    niveis_perdidos_media: r2(media(perdidos)),
    perdem_2_ou_mais_pct: pct(perde2, n),
    pesos_uniformes_mudam_compensatorio_pct: pct(unifComp, n),
    pesos_uniformes_mudam_final_pct: pct(unifFinal, n),
    teto_seis_dimensoes_mudaria_final_pct: pct(seis, n),
    com_advertencia_pct: pct(comAdv, n),
    sem_acao_curto_prazo_pct: pct(semCurto, n),
    tamanho_medio_roteiro: r2(media(tam)),
    com_teto_primeira_acao_do_gargalo_pct: pct(primeiraGargalo, teto),
    com_teto_outra_dimensao_na_frente_pct: pct(outraNaFrente, teto),
    com_teto_faixa_do_gargalo_pct: { F1: pct(faixaGargalo.F1, teto), F2: pct(faixaGargalo.F2, teto), F3: pct(faixaGargalo.F3, teto) },
  };
}

function ruido(n) {
  const base = Array.from({ length: n }, perfilCorrelacionado);
  const aplicar = (fn) => {
    let mf = 0, mc = 0, gf = [], gc = [];
    for (const r of base) {
      const a = diag(r), b = diag(fn({ ...r }));
      if (b.nivelFinal !== a.nivelFinal) mf++;
      if (b.nivelCompensatorio !== a.nivelCompensatorio) mc++;
      gf.push(b.nivelFinal - a.nivelFinal); gc.push(b.nivelCompensatorio - a.nivelCompensatorio);
    }
    return { final_muda_pct: pct(mf, n), compensatorio_muda_pct: pct(mc, n), ganho_medio_final: r3(media(gf)), ganho_medio_compensatorio: r3(media(gc)) };
  };
  return {
    perfis: n,
    ruido_20pct_itens_mais_ou_menos_1: aplicar(r => { for (const c of TODOS) if (rng() < 0.2) r[c] = clamp(r[c] + (rng() < 0.5 ? -1 : 1), 1, 5); return r; }),
    complacencia_30pct_itens_mais_1: aplicar(r => { for (const c of TODOS) if (rng() < 0.3) r[c] = Math.min(5, r[c] + 1); return r; }),
    complacencia_uniforme_todos_mais_1: aplicar(r => { for (const c of TODOS) r[c] = Math.min(5, r[c] + 1); return r; }),
  };
}

function sensibilidade(sorteios, nPerfis) {
  const perfis = Array.from({ length: nPerfis }, perfilCorrelacionado);
  const base = perfis.map(r => diag(r));
  const perturbacoes = {
    pesos_20pct: m => { m.dimensoes.forEach(d => { d.peso *= unif(0.8, 1.2); }); normalizar(m); },
    pesos_50pct: m => { m.dimensoes.forEach(d => { d.peso *= unif(0.5, 1.5); }); normalizar(m); },
    limites_niveis_5pts: m => { const b = [20, 40, 60, 80].map(x => x + unif(-5, 5)); m.niveis.forEach((nv, k) => { nv.limite_inferior = k ? b[k - 1] : 0; nv.limite_superior = k < 4 ? b[k] : 100; }); },
    limites_faixas_5pts: m => { const b = [40, 70].map(x => x + unif(-5, 5)); m.faixas.forEach((f, k) => { f.limite_inferior = k ? b[k - 1] : 0; f.limite_superior = k < 2 ? b[k] : 100; }); },
    priorizacao_50pct: m => {
      const p = m.priorizacao;
      for (const k of Object.keys(p.peso_faixa)) p.peso_faixa[k] *= unif(0.5, 1.5);
      p.bonus_dimensao_critica *= unif(0.5, 1.5);
      for (const k of Object.keys(p.bonus_esforco)) p.bonus_esforco[k] *= unif(0.5, 1.5);
    },
  };
  function normalizar(m) { const s = m.dimensoes.reduce((a, d) => a + d.peso, 0); m.dimensoes.forEach(d => { d.peso /= s; }); }
  const out = { sorteios, perfis: nPerfis };
  for (const [nome, perturbar] of Object.entries(perturbacoes)) {
    const fr = { final: [], compensatorio: [], ordem: [], regras: [] };
    for (let s = 0; s < sorteios; s++) {
      const m = clone(MODELO); perturbar(m);
      let f = 0, c = 0, o = 0, g = 0;
      perfis.forEach((r, i) => {
        const a = base[i], b = diag(r, m);
        if (a.nivelFinal !== b.nivelFinal) f++;
        if (a.nivelCompensatorio !== b.nivelCompensatorio) c++;
        const ra = a.roteiro.map(x => x.regra), rb = b.roteiro.map(x => x.regra);
        if ([...ra].sort().join() !== [...rb].sort().join()) g++;
        else if (ra.join() !== rb.join()) o++;
      });
      fr.final.push(100 * f / nPerfis); fr.compensatorio.push(100 * c / nPerfis); fr.ordem.push(100 * o / nPerfis); fr.regras.push(100 * g / nPerfis);
    }
    out[nome] = Object.fromEntries(Object.entries(fr).map(([k, v]) => [k, { media_pct: +media(v).toFixed(1), p95_pct: +p95(v).toFixed(1) }]));
  }
  return out;
}

function cobertura() {
  const combos = new Set(), regras = new Set(), freqRT = {};
  let n = 0, teto = 0, min = Infinity, max = 0;
  for (const r of enumerarPerfis()) {
    const d = diag(r);
    n++;
    combos.add(DIMS.map(x => d.faixas[x]).join());
    d.roteiro.forEach(x => { regras.add(x.regra); if (x.origem === 'Advertência') freqRT[x.regra] = (freqRT[x.regra] || 0) + 1; });
    if (d.tetoAtuou) teto++;
    min = Math.min(min, d.roteiro.length); max = Math.max(max, d.roteiro.length);
  }
  const todas = [...MODELO.regras_dimensao, ...MODELO.regras_transversais].map(x => x.codigo);
  return {
    perfis: n,
    combinacoes_de_faixas: `${combos.size} de ${3 ** DIMS.length}`,
    regras_nunca_acionadas: todas.filter(c => !regras.has(c)),
    tamanho_roteiro: { min, max },
    teto_atua_pct: pct(teto, n),
    frequencia_advertencias_pct: Object.fromEntries(Object.keys(freqRT).sort().map(k => [k, pct(freqRT[k], n)])),
  };
}

function trajetorias(n) {
  const iniciais = [];
  while (iniciais.length < n) { const r = perfilCorrelacionado(); if (diag(r).nivelFinal <= 2) iniciais.push(r); }
  const subir = (r, d) => { for (const c of ITENS[d]) r[c] = Math.min(5, r[c] + 1); };
  const politicas = {
    seguir_roteiro: (r, d) => d.roteiro.filter(x => x.origem !== 'Advertência').slice(0, 2).map(x => x.dimensao),
    sortear_duas: () => { const a = DIMS[inteiro(0, 5)]; let b; do { b = DIMS[inteiro(0, 5)]; } while (b === a); return [a, b]; },
    priorizar_criticas_mais_fracas: (r, d) => {
      const ord = [...DIMS].sort((a, b) => (CRITICAS.includes(b) - CRITICAS.includes(a)) || d.escores[a] - d.escores[b] || DIMS.indexOf(a) - DIMS.indexOf(b));
      return ord.filter(x => d.escores[x] < 100).slice(0, 2);
    },
  };
  const meses = nivel => MODELO.reaplicacao.find(g => g.niveis.includes(nivel)).meses;
  const out = { perfis: n };
  const ciclosPor = {};
  for (const [nome, escolher] of Object.entries(politicas)) {
    const ciclos = [], mesesTot = [];
    let alcancou = 0;
    for (const r0 of iniciais) {
      const r = { ...r0 };
      let k = 0, mtot = 0, d = diag(r);
      while (d.nivelFinal < 4 && k < 50) {
        mtot += meses(d.nivelFinal);
        for (const dim of escolher(r, d)) subir(r, dim);
        k++; d = diag(r);
      }
      if (d.nivelFinal >= 4) alcancou++;
      ciclos.push(k); mesesTot.push(mtot);
    }
    ciclosPor[nome] = ciclos;
    out[nome] = { alcancou_pct: pct(alcancou, n), ciclos_media: r2(media(ciclos)), meses_media: +media(mesesTot).toFixed(1) };
  }
  const a = ciclosPor.seguir_roteiro, b = ciclosPor.priorizar_criticas_mais_fracas;
  out.roteiro_mais_lento_que_criticas_pct = pct(a.filter((x, i) => x > b[i]).length, n);
  out.roteiro_mais_rapido_que_criticas_pct = pct(a.filter((x, i) => x < b[i]).length, n);
  return out;
}

// ------------------------------------------------------------------ execução
const ver = verificacoes();
const totalDiv = Object.values(ver).reduce((a, v) => a + v.divergencias, 0);

if (soVerificar) {
  if (!silencioso) for (const [k, v] of Object.entries(ver)) console.log(`${k.padEnd(20)} casos ${String(v.casos).padStart(6)}  divergências ${v.divergencias}`);
  process.exit(totalDiv ? 1 : 0);
}

const resultado = {
  semente: SEMENTE,
  node: process.version,
  versao_modelo: MODELO.versao_modelo,
  gerado_em: new Date().toISOString().slice(0, 10),
  ablacao: { itens_independentes: ablacao(perfilIndependente, 20000), maturidade_correlacionada: ablacao(perfilCorrelacionado, 20000) },
  ruido_e_complacencia: ruido(5000),
  sensibilidade: sensibilidade(200, 800),
  personas: ver.personas,
  cobertura: cobertura(),
  verificacoes: Object.fromEntries(Object.entries(ver).filter(([k]) => k !== 'personas').map(([k, v]) => [k, v])),
  trajetorias: trajetorias(500),
};

const destino = resolve(RAIZ, 'pipeline', 'saida');
mkdirSync(destino, { recursive: true });
writeFileSync(resolve(destino, 'simulacao.json'), JSON.stringify(resultado, null, 2) + '\n');
console.log(JSON.stringify(resultado, null, 2));
console.error(`\nDivergências nas verificações: ${totalDiv}. Resultado gravado em pipeline/saida/simulacao.json`);
process.exit(totalDiv ? 1 : 0);
