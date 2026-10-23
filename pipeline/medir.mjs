// medir.mjs — mede uma versão do artefato MGP-PME e imprime um JSON.
//
//   node pipeline/medir.mjs <diretório da versão>
//
// Roda igual sobre a base (b9668a4, extraída num diretório temporário) e sobre a
// versão atual, para que a comparação antes × depois do relatório use a mesma
// régua. Sem dependências: o relatório do caso Aurora é renderizado pela própria
// renderDiagnostico() da versão, sobre um elemento falso que só guarda o HTML.
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { spawnSync } from 'node:child_process';

const dir = resolve(process.argv[2] || '.');
const ler = rel => readFileSync(join(dir, rel), 'utf-8');
const modulo = rel => import(pathToFileURL(join(dir, rel)).href);

// ---------------------------------------------------------------- testes (E1)
function testes() {
  const r = spawnSync(process.execPath, ['--test', '--test-reporter=tap'], { cwd: dir, encoding: 'utf-8', timeout: 300000 });
  const n = rotulo => Number((r.stdout.match(new RegExp(`^# ${rotulo} (\\d+)`, 'm')) || [])[1] ?? NaN);
  return { total: n('tests'), aprovados: n('pass'), falhas: n('fail') };
}

// ---------------------------------------------------------------- página (E2)
function bytesDe(rel) {
  const p = join(dir, rel);
  if (statSync(p).isDirectory()) return readdirSync(p).reduce((s, f) => s + bytesDe(join(rel, f)), 0);
  return statSync(p).size;
}

function pagina() {
  const html = ler('index.html');
  const js = readdirSync(join(dir, 'js')).filter(f => f.endsWith('.js')).map(f => ler(join('js', f))).join('\n');
  const menu = html.slice(html.indexOf('<nav class="menu"'), html.indexOf('</nav>'));
  const semGrupo = menu.replace(/<details[\s\S]*?<\/details>/g, '');
  return {
    bytes: { total: ['index.html', 'dados.json', 'css', 'js'].reduce((s, r) => s + bytesDe(r), 0), js: bytesDe('js'), css: bytesDe('css'), dados: bytesDe('dados.json') },
    recursosExternos: (html.match(/(src|href)="https?:\/\//g) || []).length,
    chamadasRede: (js.match(/\bfetch\(|XMLHttpRequest|sendBeacon|new WebSocket|EventSource/g) || []).length,
    csp: /default-src 'self'/.test(html),
    menuTopo: (semGrupo.match(/<a /g) || []).length + (menu.match(/<details/g) || []).length,
    menuRotas: (menu.match(/<a /g) || []).length,
    cartaoConclusao: /data-concluido/.test(ler('js/coleta.js')),
    metricasUso: /inicioPreenchimento/.test(ler('js/estado.js')),
    ciNoBranchPublicado: /branches:\s*\[[^\]]*mgp-pme-pagina-estatica/.test(ler('.github/workflows/pages.yml')),
  };
}

// ---------------------------------------------------------------- relatório do caso Aurora
const AURORA = { D0: [4, 4, 3, 3], D1: [2, 2, 1, 2, 2], D2: [4, 5, 4, 3, 4], D3: [3, 2, 3, 3, 2, 3], D4: [2, 3, 2, 3, 2], D5: [4, 4, 3, 2, 3] };
const CODIGO_OU_REGRA = /\b(UC|CP|FE|RT)-\d{2}\b|\bRD-D\d-F\d\b/g;

// Texto que o gestor vê ou ouve: conteúdo e aria-label/title/placeholder.
function textoExposto(html) {
  return html
    .replace(/<svg[\s\S]*?<\/svg>/g, ' ')
    .replace(/\s(data-[\w-]+|class|id|href|for|name|type|value)="[^"]*"/g, '')
    .replace(/<[^>]*?\s(aria-label|title|placeholder)="([^"]*)"[^>]*>/g, ' $2 ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&[a-z#0-9]+;/g, ' ');
}

// O que aparece sem abrir nada: de cada <details> fechado, só o <summary>.
const semRecolhidos = html => html.replace(/<details(?![^>]*\bopen\b)[^>]*>\s*(<summary[^>]*>[\s\S]*?<\/summary>)[\s\S]*?<\/details>/g, ' $1 ');
const palavras = texto => (texto.match(/[\p{L}\p{N}][\p{L}\p{N},.%-]*/gu) || []).length;

async function relatorio() {
  const modelo = JSON.parse(ler('dados.json'));
  const { diagnosticar } = await modulo('js/nucleo.js');
  const { renderDiagnostico } = await modulo('js/painel.js');
  const respostas = {};
  for (const d of modelo.dimensoes) {
    modelo.itens.filter(i => i.dimensao === d.codigo).forEach((it, k) => { respostas[it.codigo] = AURORA[d.codigo][k]; });
  }
  const diag = diagnosticar(respostas, modelo, { data: '2026-09-13' });
  const app = {
    id: 'APL-MEDICAO', estado: 'Diagnosticada', data: '2026-09-13', respondente: 'Medição', respostas, responsaveis: {},
    diagnostico: { ...diag, geradoEm: '2026-09-13T12:00:00Z' },
    empresa: { identificador: 'Metalmecânica Aurora', setor: 'Indústria metalmecânica', porte: 'pequena', funcionarios: 42 },
  };
  const toco = { addEventListener() {}, innerHTML: '' };
  const el = { innerHTML: '', querySelector: () => toco, querySelectorAll: () => [], addEventListener() {} };
  const nada = () => {};
  renderDiagnostico(el, { modelo, app, temAnteriores: false, aoExportar: nada, aoCorrigir: nada, aoReaplicar: nada, aoComparar: nada, aoResponsavel: nada });
  const html = el.innerHTML;
  const barra = html.slice(html.indexOf('barra-acoes'), html.indexOf('<article'));
  const barraVisivel = semRecolhidos(barra);
  const imediato = semRecolhidos(html);
  return {
    nivelFinal: diag.nivelFinal,
    gargalos: diag.gargalos,
    roteiro: diag.roteiro.map(r => r.regra),
    passosRoteiro: diag.totalAcoes,
    codigosExpostos: (textoExposto(html).match(CODIGO_OU_REGRA) || []).length,
    codigosDistintos: [...new Set(textoExposto(html).match(CODIGO_OU_REGRA) || [])].length,
    palavrasTotal: palavras(textoExposto(html)),
    palavrasSemAbrir: palavras(textoExposto(imediato)),
    secoesRecolhidas: (html.match(/<details class="rel-secao/g) || []).length,
    botoesBarraVisiveis: (barraVisivel.match(/<button|<summary class="btn/g) || []).length,
    botoesPrimarios: (html.match(/class="btn btn-pri"/g) || []).length,
    gargaloSinalizado: /selo-critica">gargalo</.test(html),
  };
}

const versao = JSON.parse(ler('package.json')).version;
const saida = { versao, testes: testes(), pagina: pagina(), relatorio: await relatorio() };
if (!existsSync(join(dir, 'js', 'painel.js'))) throw new Error('diretório não parece o artefato');
process.stdout.write(JSON.stringify(saida, null, 2) + '\n');
