// Propriedades do núcleo que os testes de exemplo não cobrem: monotonicidade,
// fronteiras de nível e faixa contra um oráculo em inteiros (todas as
// combinações de respostas de cada dimensão), entradas inválidas, modelo
// corrompido e datas de reaplicação contra um calendário independente.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { diagnosticar, dataReaplicacao, ErroDiagnostico } from '../js/nucleo.js';

const modelo = JSON.parse(readFileSync(new URL('../dados.json', import.meta.url)));
const DIMS = modelo.dimensoes.map(d => d.codigo);
const ITENS = Object.fromEntries(DIMS.map(d => [d, modelo.itens.filter(i => i.dimensao === d).map(i => i.codigo)]));
const TODOS = modelo.itens.map(i => i.codigo);
const todas = v => Object.fromEntries(TODOS.map(c => [c, v]));

// Gerador pseudoaleatório com semente fixa (mulberry32), para o teste ser reprodutível.
function mulberry32(a) {
  return () => {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

test('monotonicidade: subir uma resposta nunca reduz escore, teto nem nível', () => {
  const rng = mulberry32(7);
  for (let i = 0; i < 150; i++) {
    const r = Object.fromEntries(TODOS.map(c => [c, 1 + Math.floor(rng() * 5)]));
    const a = diagnosticar(r, modelo);
    for (const c of TODOS) {
      if (r[c] === 5) continue;
      const b = diagnosticar({ ...r, [c]: r[c] + 1 }, modelo);
      assert.ok(b.escoreGlobal >= a.escoreGlobal - 1e-9, `escore global caiu ao subir ${c}`);
      assert.ok(b.nivelCompensatorio >= a.nivelCompensatorio, `nível compensatório caiu ao subir ${c}`);
      assert.ok(b.teto >= a.teto, `teto caiu ao subir ${c}`);
      assert.ok(b.nivelFinal >= a.nivelFinal, `nível final caiu ao subir ${c}`);
      for (const d of DIMS) assert.ok(b.escores[d] >= a.escores[d] - 1e-9, `escore de ${d} caiu ao subir ${c}`);
    }
  }
});

test('fronteiras: nível e faixa de cada dimensão batem com o oráculo em inteiros', () => {
  // escore da dimensão = 25 · soma(r − 1) / n; compara sem ponto flutuante: 25·soma ≥ limite·n
  const limNiveis = modelo.niveis.map(n => n.limite_inferior).filter(x => x > 0);
  const limFaixas = modelo.faixas.map(f => f.limite_inferior).filter(x => x > 0);
  for (const d of DIMS) {
    const itens = ITENS[d], n = itens.length;
    for (let idx = 0; idx < 5 ** n; idx++) {
      const r = todas(3);
      let t = idx, soma = 0;
      for (const c of itens) { const v = 1 + (t % 5); t = Math.floor(t / 5); r[c] = v; soma += v - 1; }
      const dd = diagnosticar(r, modelo);
      const nivel = 1 + limNiveis.filter(b => 25 * soma >= b * n).length;
      const faixa = 'F' + (1 + limFaixas.filter(b => 25 * soma >= b * n).length);
      assert.equal(dd.niveis[d], nivel, `${d} soma=${soma}: nível`);
      assert.equal(dd.faixas[d], faixa, `${d} soma=${soma}: faixa`);
    }
  }
});

test('resposta inválida ou ausente gera FE-01 e nunca um resultado silencioso', () => {
  const invalidos = [0, 6, -1, 2.5, '3', null, undefined, NaN, Infinity, true, [], {}];
  for (const c of TODOS) {
    for (const v of invalidos) {
      const r = todas(3); r[c] = v;
      assert.throws(() => diagnosticar(r, modelo),
        e => e instanceof ErroDiagnostico && e.codigo === 'FE-01' && e.detalhes.pendentes.includes(c));
    }
    const sem = todas(3); delete sem[c];
    assert.throws(() => diagnosticar(sem, modelo), e => e.codigo === 'FE-01' && e.detalhes.pendentes.includes(c));
  }
  for (const vazio of [null, undefined, {}]) {
    assert.throws(() => diagnosticar(vazio, modelo), e => e.codigo === 'FE-01' && e.detalhes.pendentes.length === TODOS.length);
  }
});

test('modelo corrompido gera FE-03 e versão divergente gera FE-02', () => {
  const corrupcoes = {
    'soma dos pesos 1,1': m => { m.dimensoes[0].peso += 0.1; },
    'regra de dimensão removida': m => { m.regras_dimensao.pop(); },
    'lacuna nos níveis': m => { m.niveis[2].limite_inferior = 41; },
    '29 itens': m => { m.itens.pop(); },
    'duas dimensões críticas': m => { m.dimensoes[0].critica = false; },
    'priorização ausente': m => { delete m.priorizacao; },
    'reaplicação sem o nível 5': m => { m.reaplicacao[2].niveis = [4]; },
  };
  for (const [nome, f] of Object.entries(corrupcoes)) {
    const m = structuredClone(modelo); f(m);
    assert.throws(() => diagnosticar(todas(3), m), e => e.codigo === 'FE-03', nome);
  }
  assert.throws(() => diagnosticar(todas(3), modelo, { versaoFixada: '0.0.1' }), e => e.codigo === 'FE-02');
});

test('data de reaplicação: ciclo por nível e ajuste ao último dia do mês', () => {
  const diasMes = (a, m) => [31, (a % 4 === 0 && (a % 100 !== 0 || a % 400 === 0)) ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][m - 1];
  const meses = { 1: 6, 2: 6, 3: 9, 4: 12, 5: 12 };
  const dois = x => String(x).padStart(2, '0');
  for (let ano = 2026; ano <= 2029; ano++) for (let mes = 1; mes <= 12; mes++) for (const dia of [1, 15, 28, 29, 30, 31]) {
    if (dia > diasMes(ano, mes)) continue;
    for (let nivel = 1; nivel <= 5; nivel++) {
      const m0 = mes - 1 + meses[nivel];
      const a1 = ano + Math.floor(m0 / 12), m1 = (m0 % 12) + 1;
      const esperada = `${a1}-${dois(m1)}-${dois(Math.min(dia, diasMes(a1, m1)))}`;
      assert.equal(dataReaplicacao(`${ano}-${dois(mes)}-${dois(dia)}`, nivel, modelo), esperada, `${ano}-${mes}-${dia} nível ${nivel}`);
    }
  }
});
