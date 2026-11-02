// graficos.js — gráficos do diagnóstico e da comparação com Apache ECharts
// (vendor/echarts, carregado só nestas telas). As opções são montadas por
// funções puras a partir das cores do tema (variáveis CSS), então os mesmos
// gráficos servem ao tema claro e ao escuro. Cada contêiner já traz um SVG
// estático desenhado por painel.js: se a biblioteca não carregar, ele fica.

import { carregarECharts } from './bibliotecas.js';
import { num } from './ui.js';

const FONTE = '"IBM Plex Sans", system-ui, sans-serif';
// gráficos: rótulos de eixo a 12-13px, para acompanhar o corpo de 17px

// Cores e fonte lidas do tema em uso. `ler` recebe o nome da variável CSS.
export function coresDoTema(ler) {
  const v = nome => (ler(nome) || '').trim();
  return {
    texto: v('--texto'), texto2: v('--texto-2'), texto3: v('--texto-3'), filete: v('--filete'), superficie: v('--superficie'),
    primaria: v('--primaria'), alerta: v('--alerta'), roxo: v('--roxo-texto') || v('--primaria'), vermelho: v('--vermelho') || v('--alerta'),
    F1: v('--f1'), F2: v('--f2'), F3: v('--f3'),
    F1s: v('--f1-suave'), F2s: v('--f2-suave'), F3s: v('--f3-suave'),
    serieA: v('--serie-a'), serieB: v('--serie-b'),
  };
}

// Rótulos longos em duas linhas, quebrando no espaço mais próximo do meio.
export function quebrar(texto, limite = 18) {
  if (texto.length <= limite) return texto;
  const meio = texto.length / 2;
  let melhor = -1;
  for (let k = 0; k < texto.length; k++) {
    if (texto[k] === ' ' && (melhor < 0 || Math.abs(k - meio) < Math.abs(melhor - meio))) melhor = k;
  }
  return melhor < 0 ? texto : `${texto.slice(0, melhor)}\n${texto.slice(melhor + 1)}`;
}

function base(c, animar) {
  return {
    animation: animar, animationDuration: 650, animationEasing: 'cubicOut', animationDurationUpdate: 250,
    animationDelay: k => k * 70,
    textStyle: { fontFamily: FONTE, color: c.texto },
    tooltip: {
      backgroundColor: c.superficie, borderWidth: 0, padding: [8, 12],
      textStyle: { color: c.texto, fontFamily: FONTE, fontSize: 12 },
      extraCssText: 'box-shadow: 0 4px 16px rgba(16,24,40,.16); border-radius: 2px;',
    },
  };
}

const eixoValor = (c, estreito = false) => ({
  type: 'value', min: 0, max: 100, interval: estreito ? 50 : 20,
  axisLabel: { color: c.texto3, fontSize: 11 },
  splitLine: { lineStyle: { color: c.filete } },
  axisLine: { show: false }, axisTick: { show: false },
});

// Perfil por critério: barras horizontais coloridas pela faixa, zonas das faixas
// ao fundo, linha da média ponderada e o gargalo rotulado.
export function opcoesPerfil(diag, modelo, c, { animar = true, largura = 800 } = {}) {
  const linhas = diag.porDimensao;
  const estreito = largura < 520;
  const zonas = modelo.faixas.map(f => [
    { xAxis: f.limite_inferior, name: f.nome, itemStyle: { color: c[`${f.codigo}s`], opacity: .7 } },
    { xAxis: f.limite_superior },
  ]);
  return {
    ...base(c, animar),
    // espaço à direita só para o rótulo da barra mais longa ("gargalo" ocupa mais)
    grid: { left: 4, right: linhas.some(d => d.eGargalo) && !estreito ? 92 : 48, top: 24, bottom: 8, containLabel: true },
    tooltip: {
      ...base(c, animar).tooltip, trigger: 'item',
      formatter: p => {
        const d = linhas[p.dataIndex];
        if (!d) return '';
        const faixa = modelo.faixas.find(f => f.codigo === d.faixa)?.nome ?? d.faixa;
        return `<strong>${d.nome}</strong><br>Escore ${num(d.escore)} · nível ${d.nivel}<br>Faixa ${faixa}${d.critica ? ' · crítico' : ''}${d.eGargalo ? '<br><b style="color:' + c.alerta + '">Gargalo: limita o nível</b>' : ''}`;
      },
    },
    xAxis: eixoValor(c, estreito),
    yAxis: {
      type: 'category', inverse: true, data: linhas.map(d => d.nome),
      axisLabel: { color: c.texto, fontSize: estreito ? 12 : 13, width: estreito ? 84 : 150, overflow: 'break', lineHeight: 14,
        formatter: (v, k) => (linhas[k]?.critica ? `${v} {crit|●}` : v),
        rich: { crit: { color: c.alerta, fontSize: 8, padding: [0, 0, 2, 2] } } },
      axisLine: { show: false }, axisTick: { show: false },
    },
    series: [{
      type: 'bar', barWidth: 18, name: 'Escore',
      data: linhas.map(d => ({
        value: Math.round(d.escore * 10) / 10,
        itemStyle: { color: c[d.faixa] || c.F2, borderRadius: [0, 4, 4, 0] },
        label: { color: d.eGargalo ? c.alerta : c.texto, fontWeight: d.eGargalo ? 600 : 500 },
      })),
      label: {
        show: true, position: 'right', fontSize: 13, distance: 6,
        formatter: p => `${num(p.value)}${linhas[p.dataIndex]?.eGargalo && !estreito ? '  gargalo' : ''}`,
      },
      markArea: {
        silent: true, data: zonas,
        label: { show: !estreito, position: 'insideTop', color: c.texto3, fontSize: 11, distance: 4 },
      },
      markLine: {
        silent: true, symbol: 'none',
        lineStyle: { color: c.texto2, type: [4, 3], width: 1 },
        label: { formatter: `média ${num(diag.escoreGlobal)}`, position: 'start', distance: 6, color: c.texto2, fontSize: 11 },
        data: [{ xAxis: Math.round(diag.escoreGlobal * 10) / 10 }],
      },
    }],
  };
}

function radarBase(nomes, c, largura = 800) {
  return {
    radius: largura < 520 ? '46%' : '56%', center: ['50%', '48%'], splitNumber: 5, shape: 'polygon',
    indicator: nomes.map(n => ({ name: quebrar(n), max: 100, min: 0 })),
    axisName: { color: c.texto2, fontSize: 12, lineHeight: 15 },
    splitLine: { lineStyle: { color: c.filete } },
    splitArea: { show: false },
    axisLine: { lineStyle: { color: c.filete } },
  };
}

// Forma do perfil: o polígono da empresa contra o limite da faixa Crítica.
export function opcoesRadar(diag, modelo, c, { animar = true, largura = 800 } = {}) {
  const linhas = diag.porDimensao;
  const limite = modelo.faixas.find(f => f.codigo === 'F1')?.limite_superior ?? 40;
  return {
    ...base(c, animar),
    tooltip: { ...base(c, animar).tooltip, trigger: 'item',
      formatter: p => `<strong>${p.seriesName}</strong><br>${linhas.map((d, k) => `${d.nome}: ${num(p.value[k])}`).join('<br>')}` },
    legend: { bottom: 0, itemWidth: 14, itemHeight: 8, textStyle: { color: c.texto2, fontSize: 11 }, data: ['Empresa', 'Limite da faixa Crítica'] },
    radar: radarBase(linhas.map(d => d.nome), c, largura),
    series: [{
      type: 'radar',
      data: [
        { name: 'Limite da faixa Crítica', value: linhas.map(() => limite), symbol: 'none',
          lineStyle: { color: c.vermelho, type: [4, 3], width: 1 }, itemStyle: { color: c.vermelho }, areaStyle: { color: c.F1s, opacity: 1 } },
        { name: 'Empresa', value: linhas.map(d => Math.round(d.escore * 10) / 10), symbol: 'circle', symbolSize: 5,
          lineStyle: { color: c.roxo, width: 2 }, itemStyle: { color: c.roxo }, areaStyle: { color: c.roxo, opacity: .14 } },
      ],
    }],
  };
}

// Comparação entre duas aplicações: barras agrupadas por critério.
export function opcoesComparacao(da, db, modelo, rotulos, c, { animar = true, largura = 800 } = {}) {
  const dims = modelo.dimensoes;
  const estreito = largura < 520;
  const serie = (nome, diag, cor) => ({
    type: 'bar', name: nome, barWidth: 10, barGap: '30%',
    itemStyle: { color: cor, borderRadius: [0, 3, 3, 0] }, label: { show: true, position: 'right', fontSize: 12, color: c.texto2, formatter: p => num(p.value) },
    data: dims.map(d => Math.round(diag.escores[d.codigo] * 10) / 10),
  });
  return {
    ...base(c, animar),
    grid: { left: 8, right: 48, top: 36, bottom: 8, containLabel: true },
    legend: { top: 0, left: 0, itemWidth: 14, itemHeight: 8, textStyle: { color: c.texto2, fontSize: 12 } },
    tooltip: { ...base(c, animar).tooltip, trigger: 'axis', axisPointer: { type: 'shadow', shadowStyle: { color: c.filete, opacity: .5 } },
      valueFormatter: v => num(v) },
    xAxis: eixoValor(c, estreito),
    yAxis: { type: 'category', inverse: true, data: dims.map(d => d.nome),
      axisLabel: { color: c.texto, fontSize: estreito ? 12 : 13, width: estreito ? 84 : 150, overflow: 'break', lineHeight: 15 }, axisLine: { show: false }, axisTick: { show: false } },
    series: [serie(rotulos[0], da, c.serieA), serie(rotulos[1], db, c.serieB)],
  };
}

export function opcoesRadarComparacao(da, db, modelo, rotulos, c, { animar = true, largura = 800 } = {}) {
  const dims = modelo.dimensoes;
  const item = (nome, diag, cor, forte) => ({
    name: nome, value: dims.map(d => Math.round(diag.escores[d.codigo] * 10) / 10), symbol: 'circle', symbolSize: forte ? 5 : 4,
    lineStyle: { color: cor, width: forte ? 2 : 1.5 }, itemStyle: { color: cor }, areaStyle: { color: cor, opacity: forte ? .12 : .06 },
  });
  return {
    ...base(c, animar),
    tooltip: { ...base(c, animar).tooltip, trigger: 'item' },
    legend: { bottom: 0, itemWidth: 14, itemHeight: 8, textStyle: { color: c.texto2, fontSize: 11 } },
    radar: radarBase(dims.map(d => d.nome), c, largura),
    series: [{ type: 'radar', data: [item(rotulos[0], da, c.serieA, false), item(rotulos[1], db, c.serieB, true)] }],
  };
}

// ------------------------------------------------------------ montagem no navegador
const ativos = new Set();

export function descartarGraficos() {
  for (const g of ativos) g.descartar();
  ativos.clear();
}

// especificacoes: { nome: (cores, opcoes) => opções do ECharts } para cada
// contêiner [data-grafico="nome"] dentro de `raiz`.
export async function montarGraficos(raiz, especificacoes) {
  if (typeof document === 'undefined' || !raiz?.querySelectorAll) return;
  const caixas = [...raiz.querySelectorAll('[data-grafico]')].filter(cx => especificacoes[cx.dataset.grafico]);
  if (!caixas.length) return;
  let echarts;
  try { echarts = await carregarECharts(); } catch { echarts = null; }
  if (!echarts) { caixas.forEach(cx => cx.classList.add('sem-biblioteca')); return; } // fica o SVG estático
  const animar = !window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  const cores = () => coresDoTema(n => getComputedStyle(document.documentElement).getPropertyValue(n));

  for (const caixa of caixas) {
    if (!caixa.isConnected) continue;
    const montar = especificacoes[caixa.dataset.grafico];
    caixa.replaceChildren();
    const grafico = echarts.init(caixa, null, { renderer: 'svg' });
    const estreito = () => caixa.clientWidth < 520;
    let eraEstreito = estreito();
    grafico.setOption(montar(cores(), { animar, largura: caixa.clientWidth }));
    // a forma das opções muda abaixo de 520px (rótulos menores, menos marcas)
    const redimensionar = new ResizeObserver(() => {
      grafico.resize();
      if (estreito() !== eraEstreito) { eraEstreito = estreito(); grafico.setOption(montar(cores(), { animar: false, largura: caixa.clientWidth }), true); }
    });
    redimensionar.observe(caixa);
    // a primeira medida pode vir antes da fonte carregar ou do painel terminar de entrar
    document.fonts?.ready.then(() => { if (caixa.isConnected) grafico.resize(); });
    caixa.closest('[data-revelar]')?.addEventListener('transitionend', () => { if (caixa.isConnected) grafico.resize(); }, { once: true });
    const tema = new MutationObserver(() => grafico.setOption(montar(cores(), { animar: false, largura: caixa.clientWidth }), true));
    tema.observe(document.documentElement, { attributes: true, attributeFilter: ['data-tema'] });
    const registro = {
      grafico, caixa,
      descartar() { redimensionar.disconnect(); tema.disconnect(); grafico.dispose(); },
    };
    ativos.add(registro);
  }
}

// Na impressão, o SVG do ECharts passa a escalar com a largura da página.
if (typeof window !== 'undefined') {
  window.addEventListener('beforeprint', () => {
    for (const { caixa } of ativos) {
      const svg = caixa.querySelector('svg');
      if (!svg) continue;
      const w = svg.getAttribute('width');
      const h = svg.getAttribute('height');
      if (w && h && !svg.getAttribute('viewBox')) svg.setAttribute('viewBox', `0 0 ${parseFloat(w)} ${parseFloat(h)}`);
      svg.style.width = '100%';
      svg.style.height = 'auto';
    }
  });
  window.addEventListener('afterprint', () => {
    for (const { caixa, grafico } of ativos) {
      const svg = caixa.querySelector('svg');
      if (svg) { svg.style.width = ''; svg.style.height = ''; }
      grafico.resize();
    }
  });
}
