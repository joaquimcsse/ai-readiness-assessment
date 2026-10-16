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
