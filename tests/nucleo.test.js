// Etapa V2 — verificação do núcleo lógico contra casos de teste:
// caso ilustrativo (Metalmecânica Aurora), todos os mínimos, todos os
// máximos e um gargalo isolado em cada dimensão crítica.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  diagnosticar, normalizar, nivelDe, faixaDe, ErroDiagnostico, dataReaplicacao,
} from '../js/nucleo.js';

const modelo = JSON.parse(readFileSync(new URL('../dados.json', import.meta.url)));

function respostasPorDimensao(mapa) {
  const r = {};
  for (const d of modelo.dimensoes) {
    const itens = modelo.itens.filter(i => i.dimensao === d.codigo);
    const valores = Array.isArray(mapa[d.codigo]) ? mapa[d.codigo] : itens.map(() => mapa[d.codigo]);
    itens.forEach((it, k) => { r[it.codigo] = valores[k]; });
  }
  return r;
}
const todas = v => respostasPorDimensao(Object.fromEntries(modelo.dimensoes.map(d => [d.codigo, v])));

const AURORA = respostasPorDimensao({
  D0: [4, 4, 3, 3],
  D1: [2, 2, 1, 2, 2],
  D2: [4, 5, 4, 3, 4],
  D3: [3, 2, 3, 3, 2, 3],
  D4: [2, 3, 2, 3, 2],
  D5: [4, 4, 3, 2, 3],
});

test('normalização linear da escala de 5 pontos', () => {
  assert.deepEqual([1, 2, 3, 4, 5].map(normalizar), [0, 25, 50, 75, 100]);
  for (const v of [0, 6, 2.5, null, undefined, '3']) {
    assert.throws(() => normalizar(v), e => e.codigo === 'FE-03');
  }
});

test('limites de nível e faixa: inferior inclusivo, superior exclusivo, último fechado', () => {
  assert.equal(nivelDe(0, modelo), 1);
  assert.equal(nivelDe(19.999, modelo), 1);
  assert.equal(nivelDe(20, modelo), 2);
  assert.equal(nivelDe(80, modelo), 5);
  assert.equal(nivelDe(100, modelo), 5);
  assert.equal(faixaDe(39.99, modelo), 'F1');
  assert.equal(faixaDe(40, modelo), 'F2');
  assert.equal(faixaDe(70, modelo), 'F3');
  assert.equal(faixaDe(100, modelo), 'F3');
});

test('caso ilustrativo Metalmecânica Aurora (seção 4, Tabela 13)', () => {
  const d = diagnosticar(AURORA, modelo, { data: '2026-09-13' });
  const esc = Object.fromEntries(Object.entries(d.escores).map(([k, v]) => [k, Math.round(v * 10) / 10]));
  assert.deepEqual(esc, { D0: 62.5, D1: 20, D2: 75, D3: 41.7, D4: 35, D5: 55 });
  assert.deepEqual(d.niveis, { D0: 4, D1: 2, D2: 4, D3: 3, D4: 2, D5: 3 });
  assert.deepEqual(d.faixas, { D0: 'F2', D1: 'F1', D2: 'F3', D3: 'F2', D4: 'F1', D5: 'F2' });
  assert.equal(Math.round(d.escoreGlobal * 10) / 10, 47.8);
  assert.equal(d.nivelCompensatorio, 3);
  assert.equal(d.teto, 2);
  assert.equal(d.nivelFinal, 2);
  assert.equal(d.tetoAtuou, true);
  assert.deepEqual(d.gargalos, ['D1']);
  assert.deepEqual(
    d.roteiro.map(r => [r.ordem, r.regra, r.origem, r.esforco, r.horizonte, r.prioridade]),
    [
      [1, 'RT-04', 'Advertência', 'Médio', 'Curto', 1002],
      [2, 'RD-D1-F1', 'Ação', 'Alto', 'Médio', 351],
      [3, 'RD-D4-F1', 'Ação', 'Baixo', 'Curto', 303],
      [4, 'RD-D0-F2', 'Ação', 'Médio', 'Curto', 252],
      [5, 'RD-D3-F2', 'Ação', 'Médio', 'Médio', 252],
      [6, 'RD-D5-F2', 'Ação', 'Médio', 'Médio', 202],
      [7, 'RD-D2-F3', 'Ação', 'Médio', 'Médio', 102],
    ],
  );
  assert.ok(d.observacoes.some(o => o.codigo === 'FA-01'));
  assert.equal(d.dataReaplicacao, '2027-03-13'); // nível 2 → 6 meses
});

test('V2: todos os mínimos', () => {
  const d = diagnosticar(todas(1), modelo);
  assert.equal(d.escoreGlobal, 0);
  assert.equal(d.nivelFinal, 1);
  assert.equal(d.tetoAtuou, false);
  assert.deepEqual(d.gargalos, []);
  assert.ok(Object.values(d.faixas).every(f => f === 'F1'));
  const advs = d.roteiro.filter(r => r.origem === 'Advertência').map(r => r.regra);
  assert.deepEqual(advs.sort(), ['RT-01', 'RT-02', 'RT-05']);
  assert.equal(d.roteiro.filter(r => r.origem === 'Ação').length, 6);
});

test('V2: todos os máximos (FA-02, sem gargalo ativo)', () => {
  const d = diagnosticar(todas(5), modelo);
  assert.equal(d.escoreGlobal, 100);
  assert.equal(d.nivelFinal, 5);
  assert.deepEqual(d.gargalos, []);
  assert.ok(d.roteiro.every(r => r.origem === 'Ação' && r.faixa === 'F3'));
  assert.ok(d.observacoes.some(o => o.codigo === 'FA-02'));
});

for (const crit of ['D0', 'D1', 'D3']) {
  test(`V2/CT-04: gargalo isolado em ${crit}`, () => {
    const mapa = Object.fromEntries(modelo.dimensoes.map(d => [d.codigo, 5]));
    mapa[crit] = 1;
    const d = diagnosticar(respostasPorDimensao(mapa), modelo);
    assert.equal(d.escores[crit], 0);
    assert.ok(d.nivelCompensatorio >= 4, 'média ponderada continua alta');
    assert.equal(d.nivelFinal, 1, 'nível limitado pela dimensão crítica');
    assert.equal(d.tetoAtuou, true);
    assert.deepEqual(d.gargalos, [crit]);
    assert.ok(d.nivelFinal <= Math.min(...['D0', 'D1', 'D3'].map(c => d.niveis[c])));
    assert.equal(d.roteiro.find(r => r.origem === 'Ação').regra, `RD-${crit}-F1`, 'primeira ação ataca o gargalo');
    if (d.faixaGlobal === 'F3') assert.ok(d.roteiro.some(r => r.regra === 'RT-03'));
  });
}

test('dimensão não crítica baixa não limita o nível (agregação compensatória fora de C)', () => {
  const mapa = Object.fromEntries(modelo.dimensoes.map(d => [d.codigo, 5]));
  mapa.D2 = 1;
  const d = diagnosticar(respostasPorDimensao(mapa), modelo);
  assert.equal(d.nivelFinal, d.nivelCompensatorio);
  assert.equal(d.tetoAtuou, false);
});

test('CT-04: nível final nunca excede o da dimensão crítica de menor escore (amostragem)', () => {
  let semente = 42;
  const aleatorio = () => { semente = (semente * 1103515245 + 12345) % 2147483648; return semente / 2147483648; };
  for (let k = 0; k < 2000; k++) {
    const r = {};
    for (const it of modelo.itens) r[it.codigo] = 1 + Math.floor(aleatorio() * 5);
    const d = diagnosticar(r, modelo);
    const menorCritica = Math.min(...['D0', 'D1', 'D3'].map(c => d.niveis[c]));
    assert.ok(d.nivelFinal <= menorCritica);
    assert.ok(d.nivelFinal <= d.nivelCompensatorio);
    assert.ok(d.roteiro.filter(x => x.origem === 'Ação').length === 6, 'roteiro nunca vazio (CT-05)');
    // RN-06: advertências antes das ações
    const idx = d.roteiro.findIndex(x => x.origem === 'Ação');
    assert.ok(d.roteiro.slice(idx).every(x => x.origem === 'Ação'));
  }
});

test('FA-03: empate desfeito pela ordem das dimensões', () => {
  const d = diagnosticar(AURORA, modelo);
  const i0 = d.roteiro.findIndex(r => r.regra === 'RD-D0-F2');
  const i3 = d.roteiro.findIndex(r => r.regra === 'RD-D3-F2');
  assert.equal(d.roteiro[i0].prioridade, d.roteiro[i3].prioridade);
  assert.ok(i0 < i3);
});

test('FE-01: itens sem resposta interrompem o cálculo', () => {
  const r = { ...AURORA };
  delete r.I07; delete r.I22;
  assert.throws(() => diagnosticar(r, modelo), e =>
    e instanceof ErroDiagnostico && e.codigo === 'FE-01' && e.detalhes.pendentes.join() === 'I07,I22');
});

test('FE-02: versão do modelo alterada durante a aplicação', () => {
  assert.throws(() => diagnosticar(AURORA, modelo, { versaoFixada: '0.9.0' }), e => e.codigo === 'FE-02');
});

test('FE-03: parâmetro fora do domínio', () => {
  const ruim = structuredClone(modelo);
  ruim.dimensoes[0].peso = 0.5;
  assert.throws(() => diagnosticar(AURORA, ruim), e => e.codigo === 'FE-03');
  const lacuna = structuredClone(modelo);
  lacuna.niveis[1].limite_inferior = 25;
  assert.throws(() => diagnosticar(AURORA, lacuna), e => e.codigo === 'FE-03');
});

test('periodicidade de reaplicação por nível', () => {
  assert.equal(dataReaplicacao('2026-01-31', 1, modelo), '2026-07-31');
  assert.equal(dataReaplicacao('2026-05-31', 3, modelo), '2027-02-28');
  assert.equal(dataReaplicacao('2026-09-13', 5, modelo), '2027-09-13');
});
