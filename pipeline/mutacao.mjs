// mutacao.mjs — verifica se a simulação (simular.mjs --verificar) detecta
// defeitos no núcleo. Cada mutante é uma cópia de js/ em um diretório
// temporário com um único defeito injetado em nucleo.js; o artefato original
// nunca é alterado. Sai com código 1 se algum defeito passar despercebido.
//
// Defeitos (relatório do PBL 7, seção 2.4): limite de intervalo inclusivo,
// teto de gargalo removido, desempate da priorização invertido, teto
// incorreto e data de reaplicação sem ajuste ao fim do mês.

import { cpSync, mkdtempSync, readFileSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const RAIZ = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const SIMULAR = join(RAIZ, 'pipeline', 'simular.mjs');

const MUTANTES = [
  ['limite de intervalo inclusivo', 'escore < it.limite_superior ||', 'escore <= it.limite_superior ||'],
  ['teto de gargalo removido', 'const nivelFinal = Math.min(nivelCompensatorio, teto);', 'const nivelFinal = nivelCompensatorio;'],
  ['desempate da priorização invertido', 'ordemDim.indexOf(a.dimensao) - ordemDim.indexOf(b.dimensao)', 'ordemDim.indexOf(b.dimensao) - ordemDim.indexOf(a.dimensao)'],
  ['teto incorreto (máximo em vez de mínimo)', 'const teto = Math.min(...criticas', 'const teto = Math.max(...criticas'],
  ['data de reaplicação sem ajuste ao fim do mês', 'alvo.setUTCDate(Math.min(d, ultimoDia));', 'alvo.setUTCDate(d);'],
];

const original = readFileSync(join(RAIZ, 'js', 'nucleo.js'), 'utf8');
let escaparam = 0;
for (const [nome, de, para] of MUTANTES) {
  if (!original.includes(de)) {
    console.log(`ERRO      ${nome}: trecho alvo não encontrado em nucleo.js`);
    escaparam++;
    continue;
  }
  const dir = mkdtempSync(join(tmpdir(), 'mgp-mutante-'));
  try {
    cpSync(join(RAIZ, 'js'), dir, { recursive: true });
    writeFileSync(join(dir, 'nucleo.js'), original.replace(de, para));
    const r = spawnSync(process.execPath, [SIMULAR, '--verificar', '--silencioso', '--nucleo', dir], { encoding: 'utf8' });
    const detectado = r.status !== 0;
    if (!detectado) escaparam++;
    console.log(`${detectado ? 'detectado' : 'ESCAPOU  '} ${nome}`);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}
console.log(`\n${MUTANTES.length - escaparam} de ${MUTANTES.length} defeitos detectados.`);
process.exit(escaparam ? 1 : 0);
