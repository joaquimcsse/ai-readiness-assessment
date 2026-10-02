// Critérios de aceitação verificáveis automaticamente sobre os modelos (seção 10).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { validarModelo, esforcoGestor } from '../js/validacao.js';
import { RASTREABILIDADE as rast } from '../js/rastreabilidade.js';

const ler = p => JSON.parse(readFileSync(new URL(p, import.meta.url)));
const modelo = ler('../dados.json');

test('contrato de dados válido', () => {
  assert.deepEqual(validarModelo(modelo), []);
});

test('CT-01: 30 itens nas 6 dimensões, cada um com 5 âncoras', () => {
  assert.equal(modelo.itens.length, 30);
  assert.ok(modelo.itens.every(i => i.ancoras.length === 5 && i.ancoras.every(a => a.trim())));
  const dist = Object.fromEntries(modelo.dimensoes.map(d => [d.codigo, modelo.itens.filter(i => i.dimensao === d.codigo).length]));
  assert.deepEqual(dist, { D0: 4, D1: 5, D2: 5, D3: 6, D4: 5, D5: 5 });
});

test('CT-02: soma dos pesos = 1 e exatamente D0, D1, D3 críticas', () => {
  const soma = modelo.dimensoes.reduce((a, d) => a + d.peso, 0);
  assert.ok(Math.abs(soma - 1) < 1e-9);
  assert.deepEqual(modelo.dimensoes.filter(d => d.critica).map(d => d.codigo), ['D0', 'D1', 'D3']);
});

test('CT-03: níveis e faixas contíguos de 0 a 100', () => {
  const quebrado = structuredClone(modelo);
  quebrado.faixas[1].limite_superior = 65;
  assert.ok(validarModelo(quebrado).some(e => e.startsWith('Faixas')));
  assert.deepEqual(validarModelo(modelo).filter(e => /Níveis|Faixas/.test(e)), []);
});

test('CT-05: uma regra por par dimensão-faixa; 24 regras no total', () => {
  assert.equal(modelo.regras_dimensao.length, 18);
  assert.equal(modelo.regras_transversais.length, 6);
  const semRegra = structuredClone(modelo);
  semRegra.regras_dimensao.pop();
  assert.ok(validarModelo(semRegra).some(e => e.includes('D5-F3')));
});

test('CT-06: todo RF tem componente e caso de uso; componentes/UCs existem', () => {
  const cps = new Set(rast.componentes.map(c => c.codigo));
  const ucs = new Set(rast.casos_de_uso.map(u => u.codigo));
  for (const r of rast.matriz.filter(m => m.requisito.startsWith('RF'))) {
    assert.ok(r.componentes.length > 0, `${r.requisito} sem componente`);
    assert.ok(r.casos_de_uso.length > 0, `${r.requisito} sem caso de uso`);
  }
  for (const r of rast.matriz) {
    r.componentes.forEach(c => assert.ok(cps.has(c), `${c} inexistente`));
    r.casos_de_uso.forEach(u => assert.ok(ucs.has(u), `${u} inexistente`));
  }
  assert.equal(cps.size, 14);
  assert.equal(ucs.size, 13);
  // cada componente aponta para um módulo da página que existe no disco
  const js = readdirSync(new URL('../js/', import.meta.url));
  for (const c of rast.componentes) {
    for (const m of c.modulos) {
      assert.ok(js.includes(m) || m === 'index.html' || m === 'dados.json', `${c.codigo}: módulo ${m} ausente`);
    }
  }
});

test('CT-07: esforço do gestor entre 20 e 30 minutos', () => {
  const { min, max } = esforcoGestor(modelo);
  assert.equal(min, 20);
  assert.equal(max, 30);
  const etapas = modelo.tempos_processo.filter(e => e.dimensoes);
  const itensPorEtapa = etapas.map(e => modelo.itens.filter(i => e.dimensoes.includes(i.dimensao)).length);
  assert.deepEqual(itensPorEtapa, [9, 11, 10]);
});

test('CT-08: nenhum módulo usa canal de saída de dados', () => {
  const proibidos = /\b(XMLHttpRequest|WebSocket|sendBeacon|EventSource|navigator\.sendBeacon|RTCPeerConnection)\b/;
  for (const f of readdirSync(new URL('../js/', import.meta.url))) {
    const fonte = readFileSync(new URL(`../js/${f}`, import.meta.url), 'utf8');
    assert.ok(!proibidos.test(fonte), `${f} contém canal de rede proibido`);
    // fetch só é permitido para carregar o contrato local dados.json
    const fetches = [...fonte.matchAll(/fetch\(([^)]*)\)/g)].map(m => m[1]);
    fetches.forEach(arg => assert.match(arg, /dados\.json|URL_DADOS/, `${f}: fetch não permitido (${arg})`));
  }
  const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
  assert.ok(!/<script[^>]+src=["']https?:/i.test(html), 'index.html carrega script externo');
  assert.ok(!/<link[^>]+href=["']https?:/i.test(html), 'index.html carrega recurso externo');
  assert.match(html, /Content-Security-Policy/, 'CSP restringe conexões');
});
