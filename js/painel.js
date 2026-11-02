// painel.js — camada C5 (Apresentação e diagnóstico): perfil por critério
// (CP-11), relatório de diagnóstico com área de impressão (CP-12), Canvas de
// Prontidão (seção 9) e comparação entre aplicações (UC-09).
// Versão 1.4.0: o diagnóstico é um painel. Primeiro os indicadores (nível,
// escore, gargalo, reaplicação), depois os gráficos (ECharts, em graficos.js),
// os três primeiros passos e, em abas, os detalhes. Os SVG desenhados aqui
// são o conteúdo de reserva dos gráficos: valem sem a biblioteca e no Node.

import { esc, num, dataBR, nomeNivel, nomeFaixa, nomeDimensao, rotuloPorte, citar, obterReferencia, referenciaCompleta, icone } from './ui.js';
import { ESTADOS } from './estado.js';
import { periodicidade } from './nucleo.js';
import { montarGraficos, opcoesPerfil, opcoesRadar, opcoesComparacao, opcoesRadarComparacao } from './graficos.js';
import { animarTela } from './animacoes.js';

const SVG_NS = 'http://www.w3.org/2000/svg';
const MESES_HORIZONTE = { Curto: 3, Médio: 9, Longo: 18 };
const encurtar = (t, n = 26) => (t.length > n ? `${t.slice(0, n - 1)}…` : t);

// ------------------------------------------------------------ CP-11 — perfil em SVG (reserva)
export function svgPerfil(diag, modelo, { largura = 680 } = {}) {
  const linhas = diag.porDimensao;
  const rotuloW = 210;
  const direita = 90;
  const topo = 30;
  const alturaLinha = 56;
  const areaW = largura - rotuloW - direita;
  const altura = topo + linhas.length * alturaLinha + 30;
  const x = v => rotuloW + (v / 100) * areaW;

  const faixas = modelo.faixas.map(f => `
    <rect class="zona zona-${esc(f.codigo)}" x="${x(f.limite_inferior)}" y="${topo - 8}" width="${x(f.limite_superior) - x(f.limite_inferior)}" height="${linhas.length * alturaLinha + 8}"/>
    <text class="zona-rotulo" x="${(x(f.limite_inferior) + x(f.limite_superior)) / 2}" y="${topo - 14}" text-anchor="middle">${esc(f.nome)}</text>`).join('');
  const grade = [0, 20, 40, 60, 80, 100].map(v => `
    <line class="grade" x1="${x(v)}" x2="${x(v)}" y1="${topo - 8}" y2="${topo + linhas.length * alturaLinha}"/>
    <text class="eixo" x="${x(v)}" y="${topo + linhas.length * alturaLinha + 16}" text-anchor="middle">${v}</text>`).join('');
  const barras = linhas.map((d, k) => {
    const y = topo + k * alturaLinha + 20;
    const h = 16;
    const w = Math.max(x(d.escore) - x(0), 1.5);
    return `<g class="barra-dim ${d.eGargalo ? 'gargalo' : ''}">
      <title>${esc(d.nome)}: ${num(d.escore)}, nível ${d.nivel}, faixa ${esc(nomeFaixa(modelo, d.faixa))}${d.critica ? ', critério crítico' : ''}${d.eGargalo ? ', gargalo' : ''}</title>
      <text class="rotulo-dim" x="${rotuloW - 12}" y="${y + h / 2}" text-anchor="end" dominant-baseline="middle">${esc(encurtar(d.nome))}</text>
      ${d.critica ? `<circle class="marca-critica" cx="${rotuloW - 6}" cy="${y + h / 2}" r="2.5"/>` : ''}
      <rect class="barra barra-${esc(d.faixa)}" x="${x(0)}" y="${y}" width="${w}" height="${h}"/>
      <text class="valor" x="${x(0) + w + 6}" y="${y + h / 2}" dominant-baseline="middle">${num(d.escore)}${d.eGargalo ? '  gargalo' : ''}</text>
    </g>`;
  }).join('');
  const eg = diag.escoreGlobal;
  const global = `<line class="linha-global" x1="${x(eg)}" x2="${x(eg)}" y1="${topo - 8}" y2="${topo + linhas.length * alturaLinha}"/>
    <text class="rotulo-global" x="${x(eg) + 4}" y="${topo + linhas.length * alturaLinha - 4}">média ${num(eg)}</text>`;

  return `<svg xmlns="${SVG_NS}" class="grafico-perfil" viewBox="0 0 ${largura} ${altura}" role="img" aria-labelledby="perfil-titulo perfil-desc">
    <title id="perfil-titulo">Perfil de prontidão por critério</title>
    <desc id="perfil-desc">${linhas.map(d => `${d.nome}: ${num(d.escore)} (${nomeFaixa(modelo, d.faixa)})`).join('; ')}. Média ponderada ${num(eg)}.</desc>
    ${faixas}${grade}${barras}${global}
  </svg>`;
}

// Radar estático de reserva: só o polígono e os nomes.
export function svgRadar(valores, nomes, { tamanho = 320 } = {}) {
  const cx = tamanho / 2;
  const cy = tamanho / 2;
  const r = tamanho * 0.32;
  const n = nomes.length;
  const ponto = (k, v) => {
    const ang = -Math.PI / 2 + (2 * Math.PI * k) / n;
    return [cx + Math.cos(ang) * r * (v / 100), cy + Math.sin(ang) * r * (v / 100)];
  };
  const aneis = [20, 40, 60, 80, 100].map(v => `<polygon class="grade" points="${nomes.map((_, k) => ponto(k, v).join(',')).join(' ')}"/>`).join('');
  const eixos = nomes.map((nome, k) => {
    const [x, y] = ponto(k, 100);
    const [tx, ty] = ponto(k, 122);
    return `<line class="grade" x1="${cx}" y1="${cy}" x2="${x}" y2="${y}"/><text class="eixo" x="${tx}" y="${ty}" text-anchor="middle" dominant-baseline="middle">${esc(encurtar(nome, 18))}</text>`;
  }).join('');
  const poligono = valores.map(vs => `<polygon class="${vs.classe}" points="${vs.valores.map((v, k) => ponto(k, v).join(',')).join(' ')}"/>`).join('');
  return `<svg xmlns="${SVG_NS}" class="grafico-perfil" viewBox="0 0 ${tamanho} ${tamanho}" role="img" aria-label="Forma do perfil por critério">${aneis}${eixos}${poligono}</svg>`;
}

// Barras agrupadas de reserva para a comparação entre duas aplicações.
export function svgComparacao(diagA, diagB, modelo, rotulos, { largura = 680 } = {}) {
  const rotuloW = 210;
  const direita = 60;
  const topo = 32;
  const alturaLinha = 48;
  const areaW = largura - rotuloW - direita;
  const n = modelo.dimensoes.length;
  const altura = topo + n * alturaLinha + 24;
  const x = v => rotuloW + (v / 100) * areaW;
  const grade = [0, 20, 40, 60, 80, 100].map(v => `
    <line class="grade" x1="${x(v)}" x2="${x(v)}" y1="${topo - 6}" y2="${topo + n * alturaLinha}"/>
    <text class="eixo" x="${x(v)}" y="${topo + n * alturaLinha + 16}" text-anchor="middle">${v}</text>`).join('');
  const linhas = modelo.dimensoes.map((d, k) => {
    const y = topo + k * alturaLinha + 8;
    const a = diagA.escores[d.codigo];
    const b = diagB.escores[d.codigo];
    return `<g><title>${esc(d.nome)}: ${num(a)} → ${num(b)}</title>
      <text class="rotulo-dim" x="${rotuloW - 12}" y="${y + 14}" text-anchor="end" dominant-baseline="middle">${esc(encurtar(d.nome))}</text>
      <rect class="barra-a" x="${x(0)}" y="${y}" width="${Math.max(x(a) - x(0), 1.5)}" height="12"/>
      <text class="valor" x="${x(a) + 5}" y="${y + 6}" dominant-baseline="middle">${num(a)}</text>
      <rect class="barra-b" x="${x(0)}" y="${y + 16}" width="${Math.max(x(b) - x(0), 1.5)}" height="12"/>
      <text class="valor" x="${x(b) + 5}" y="${y + 22}" dominant-baseline="middle">${num(b)}</text>
    </g>`;
  }).join('');
  const legenda = `<g class="legenda">
    <rect class="barra-a" x="${rotuloW}" y="4" width="12" height="8"/><text x="${rotuloW + 18}" y="12">${esc(rotulos[0])}</text>
    <rect class="barra-b" x="${rotuloW + 200}" y="4" width="12" height="8"/><text x="${rotuloW + 218}" y="12">${esc(rotulos[1])}</text>
  </g>`;
  return `<svg xmlns="${SVG_NS}" class="grafico-perfil" viewBox="0 0 ${largura} ${altura}" role="img" aria-label="Comparação dos escores por critério entre duas aplicações">
    ${grade}${linhas}${legenda}</svg>`;
}

// ------------------------------------------------------------ Canvas de Prontidão
function dimensoesQueDevemMudar(diag, modelo) {
  const meses = periodicidade(diag.nivelFinal, modelo)?.meses ?? 12;
  const alvo = new Set(diag.roteiro
    .filter(r => r.origem === 'Ação' && r.faixa !== 'F3' && MESES_HORIZONTE[r.horizonte] <= meses)
    .map(r => r.dimensao));
  return modelo.dimensoes.map(d => d.codigo).filter(d => alvo.has(d));
}

// As oito células do Canvas como dados (título, conteúdo, origem). O conteúdo é
// uma lista de blocos — { p: trechos }, { ol | ul: [trechos] }, { escores: [...] }
// ou { vazio: texto } — e cada trecho é um texto ou { t, forte, faixa }. O mesmo
// conteúdo vira HTML na tela (htmlCanvas) e tabela no PDF (relatorio-pdf.js).
export function celulasCanvas(app, modelo) {
  const diag = app.diagnostico;
  const agora = diag.roteiro.filter(r => r.horizonte === 'Curto');
  const depois = diag.roteiro.filter(r => r.horizonte !== 'Curto');
  const mudar = dimensoesQueDevemMudar(diag, modelo);
  const resp = app.responsaveis || {};
  const comResp = diag.roteiro.filter(r => (resp[r.regra] || '').trim());
  const criticasF1 = diag.porDimensao.filter(d => d.critica && d.faixa === 'F1').map(d => d.codigo);
  const forte = t => ({ t, forte: true });
  const gargalos = diag.gargalos.map(g => `${g} ${nomeDimensao(modelo, g)}`).join(', ');

  return [
    { titulo: 'Onde estamos', origem: 'Escore de cada critério, de 0 a 100',
      blocos: [{ escores: diag.porDimensao.map(d => ({ rotulo: `${d.codigo} ${d.nome}`, valor: num(d.escore), faixa: d.faixa })) }] },
    { titulo: 'O que nos trava', origem: 'Critério crítico de menor escore',
      blocos: diag.tetoAtuou
        ? [{ p: [forte(gargalos), ` limita o nível atribuído em ${diag.nivelCompensatorio - diag.nivelFinal} nível(is): de ${diag.nivelCompensatorio} para ${diag.nivelFinal}.`] },
           ...(criticasF1.length ? [{ p: [`Critérios críticos na faixa Crítica: ${criticasF1.join(', ')}.`] }] : [])]
        : [{ p: ['Nenhum critério crítico limita o nível atribuído.'] },
           ...(criticasF1.length ? [{ p: [`Ainda assim, ${criticasF1.join(', ')} está na faixa Crítica.`] }] : [])] },
    { titulo: 'Em que nível estamos', origem: 'Nível de maturidade atribuído',
      blocos: [{ p: [forte(`Nível ${diag.nivelFinal}: ${nomeNivel(modelo, diag.nivelFinal)}.`), ` ${modelo.niveis.find(n => n.numero === diag.nivelFinal)?.interpretacao ?? ''}`] }] },
    { titulo: 'O que a média esconde', origem: 'Média ponderada contra nível atribuído',
      blocos: [{ p: [diag.tetoAtuou
        ? `A média ponderada (${num(diag.escoreGlobal)}) indicaria o nível ${diag.nivelCompensatorio} (${nomeNivel(modelo, diag.nivelCompensatorio)}). O nível efetivamente atribuído é ${diag.nivelFinal}: critérios fortes não compensam a base que falta.`
        : `Nada: o nível pela média ponderada (${num(diag.escoreGlobal)}) e o nível atribuído coincidem.`] }] },
    { titulo: 'O que fazer agora', origem: 'Roteiro priorizado',
      blocos: agora.length ? [{ ol: agora.map(r => [r.acao, ` (esforço ${r.esforco.toLowerCase()})`]) }] : [{ p: ['Sem ações de curto prazo neste roteiro.'] }] },
    { titulo: 'O que fazer depois', origem: 'Roteiro priorizado',
      blocos: depois.length ? [{ ol: depois.map(r => [r.acao, ` (${r.horizonte.toLowerCase()} prazo)`]) }] : [{ p: ['Nenhuma ação de médio ou longo prazo.'] }] },
    { titulo: 'Quem responde por cada passo', origem: 'Preenchido pela própria PME',
      blocos: comResp.length ? [{ ul: comResp.map(r => [forte(resp[r.regra]), `: ${r.acao}`]) }]
        : [{ vazio: 'A preencher pela empresa: indique um responsável para cada passo na tabela do roteiro.' }] },
    { titulo: 'Como saberemos que avançamos', origem: 'Ciclo de reaplicação',
      blocos: [{ p: ['Próxima aplicação: ', forte(dataBR(diag.dataReaplicacao)), '.'] },
        mudar.length ? { p: ['Devem mudar de faixa: ', ...mudar.flatMap((d, k) => [k ? ', ' : '', forte(d)]), '.'] } : { p: ['As faixas atuais devem se manter.'] }] },
  ];
}

function htmlTrechos(trechos) {
  return trechos.map(x => {
    if (typeof x === 'string') return esc(x);
    const t = esc(x.t);
    if (x.faixa) return `<strong class="txt-${esc(x.faixa)}">${t}</strong>`;
    return x.forte ? `<strong>${t}</strong>` : t;
  }).join('');
}

function htmlBloco(b) {
  if (b.p) return `<p>${htmlTrechos(b.p)}</p>`;
  if (b.ol) return `<ol>${b.ol.map(li => `<li>${htmlTrechos(li)}</li>`).join('')}</ol>`;
  if (b.ul) return `<ul>${b.ul.map(li => `<li>${htmlTrechos(li)}</li>`).join('')}</ul>`;
  if (b.escores) return `<ul class="mini-escores">${b.escores.map(e => `<li><span>${esc(e.rotulo)}</span><strong class="txt-${esc(e.faixa)}">${esc(e.valor)}</strong></li>`).join('')}</ul>`;
  if (b.vazio) return `<p class="vazio">${esc(b.vazio)}</p>`;
  return '';
}

export function htmlCanvas(app, modelo) {
  return `<div class="canvas-grade">
    ${celulasCanvas(app, modelo).map(c => `<div class="canvas-celula">
      <h4>${esc(c.titulo)}</h4><div class="canvas-conteudo">${c.blocos.map(htmlBloco).join('')}</div><p class="canvas-origem">${esc(c.origem)}</p></div>`).join('')}
  </div>`;
}

// ------------------------------------------------------------ CP-12 — relatório
// R9: o roteiro não é reordenado (a prioridade continua a do PBL 4); quando o
// teto atua, o resumo começa pela ação da dimensão-gargalo e ela recebe um selo.
export function primeiroPasso(diag) {
  if (diag.tetoAtuou) {
    const doGargalo = diag.roteiro.find(r => r.origem === 'Ação' && diag.gargalos.includes(r.dimensao));
    if (doGargalo) return doGargalo;
  }
  return diag.roteiro[0];
}

// Fundamentação do roteiro: cada passo cita os estudos da regra que o gerou.
// A consulta é feita no modelo carregado (mesma versão do diagnóstico), então
// também vale para diagnósticos importados de arquivo.
export function referenciasDoPasso(modelo, r) {
  const regra = [...(modelo.regras_dimensao || []), ...(modelo.regras_transversais || [])].find(x => x.codigo === r.regra);
  return regra?.referencias || [];
}

function citacao(modelo, chaves) {
  return chaves.length ? ` <cite class="rel-cita">(${esc(citar(modelo, chaves))})</cite>` : '';
}

// Lista das obras citadas neste relatório, na ordem alfabética dos autores.
export function referenciasDoRelatorio(diag, modelo) {
  const chaves = new Set(diag.roteiro.flatMap(r => referenciasDoPasso(modelo, r)));
  if (diag.tetoAtuou) (modelo.fundamentacao?.teto_de_gargalo || []).forEach(c => chaves.add(c));
  return [...chaves].map(c => obterReferencia(modelo, c)).filter(Boolean)
    .sort((a, b) => a.autores.localeCompare(b.autores, 'pt-BR'));
}

export const ehGargalo = (diag, r) => r.origem === 'Ação' && diag.gargalos.includes(r.dimensao);
const seloGargalo = '<span class="selo selo-critica">gargalo</span>';

export function alvoLegivel(r, modelo) {
  return r.dimensao ? `${r.dimensao} ${nomeDimensao(modelo, r.dimensao)}` : `Atenção: ${r.alvo}`;
}

// Na tela, o alvo das advertências troca os códigos dos critérios (D1) pelos nomes.
export const textoAlvo = (alvo, modelo) => String(alvo ?? '').replace(/\bD\d\b/g, c => nomeDimensao(modelo, c));
const ondeNaTela = (r, modelo) => (r.dimensao ? nomeDimensao(modelo, r.dimensao) : `Atenção: ${textoAlvo(r.alvo, modelo)}`);

// Os quatro indicadores do topo. Vêm antes de tudo (R3).
function htmlIndicadores(app, modelo) {
  const diag = app.diagnostico;
  const nomesGargalo = diag.gargalos.map(g => nomeDimensao(modelo, g)).join(', ');
  const reap = periodicidade(diag.nivelFinal, modelo);
  return `<section class="painel kpis rel-resumo" data-revelar aria-labelledby="resumo-titulo">
    <h2 id="resumo-titulo" class="sr">Resumo do diagnóstico</h2>
    <div class="kpi">
      <span class="kpi-rot">Nível atribuído</span>
      <div class="nivel-linha"><span class="kpi-valor"><span data-contar="${diag.nivelFinal}">${diag.nivelFinal}</span><small> de ${modelo.niveis.length}</small></span><span class="kpi-nome">${esc(nomeNivel(modelo, diag.nivelFinal))}</span></div>
      <div class="escada" aria-hidden="true">${modelo.niveis.map((n, k) => `<span style="--k:${k}" class="${n.numero <= diag.nivelFinal ? 'ate' : ''} ${diag.tetoAtuou && n.numero > diag.nivelFinal && n.numero <= diag.nivelCompensatorio ? 'ponderado' : ''}"></span>`).join('')}</div>
      <p class="kpi-txt">${diag.tetoAtuou ? `A média indicaria ${diag.nivelCompensatorio}; o gargalo segura em ${diag.nivelFinal}.` : 'Coincide com o nível da média.'}</p>
    </div>
    <div class="kpi">
      <span class="kpi-rot">Escore global</span>
      <span class="kpi-valor"><span data-contar="${diag.escoreGlobal}" data-casas="1">${num(diag.escoreGlobal)}</span><small> / 100</small></span>
      <p class="kpi-txt">Média ponderada dos critérios</p>
    </div>
    <div class="kpi kpi-gargalo ${diag.tetoAtuou ? '' : 'nenhum'}">
      <span class="kpi-rot">O que trava</span>
      <span class="kpi-valor">${diag.tetoAtuou ? esc(nomesGargalo) : 'Nenhum gargalo'}</span>
      <p class="kpi-txt">${diag.tetoAtuou ? `O nível não passa de ${diag.nivelFinal} enquanto não melhorar.` : 'Nenhum critério crítico limita o nível.'}</p>
    </div>
    <div class="kpi">
      <span class="kpi-rot">Próxima aplicação</span>
      <span class="kpi-valor" style="font-size:1.25rem;line-height:1.3">${dataBR(diag.dataReaplicacao)}</span>
      <p class="kpi-txt">A cada ${reap?.meses ?? '–'} meses no nível ${diag.nivelFinal}</p>
    </div>
  </section>`;
}

function htmlPrioridades(app, modelo) {
  const diag = app.diagnostico;
  const primeiro = primeiroPasso(diag);
  const passos = [primeiro, ...diag.roteiro.filter(r => r !== primeiro).slice(0, 2)];
  return `<section class="painel" data-revelar style="--atraso:180ms" aria-labelledby="prioridades-titulo">
    <div class="painel-cab"><h2 id="prioridades-titulo">Por onde começar</h2><button type="button" class="link nao-imprimir" data-ir-aba="roteiro">Roteiro completo (${diag.roteiro.length})</button></div>
    <ol class="prioridades">${passos.map(r => `<li><span class="onde">${ehGargalo(diag, r) ? `${seloGargalo} ` : ''}${esc(ondeNaTela(r, modelo))}</span><span class="acao">${esc(r.acao)}</span><span class="prazo">${esc(r.horizonte)} prazo</span></li>`).join('')}</ol>
  </section>`;
}

// A primeira aba é a que abre: a tabela de critérios, curta e numérica, que
// complementa os gráficos. O roteiro completo fica a um clique ("Por onde começar").
const ABAS = [
  ['criterios', 'Critérios'],
  ['roteiro', 'Roteiro'],
  ['nivel', 'Nível'],
  ['canvas', 'Canvas'],
  ['referencias', 'Referências'],
];

export function htmlRelatorio(app, modelo, { temAnteriores = false } = {}) {
  const diag = app.diagnostico;
  const nivelInfo = modelo.niveis.find(n => n.numero === diag.nivelFinal);
  const arquivada = app.estado === ESTADOS.ARQUIVADA;
  const resp = app.responsaveis || {};
  const refs = referenciasDoRelatorio(diag, modelo);

  // R4: um único próximo passo em destaque; o resto fica em "Mais opções".
  const opcoes = [
    !arquivada && ['corrigir', 'Corrigir respostas'],
    temAnteriores && ['comparar', 'Comparar com outra aplicação'],
    ['imprimir', 'Imprimir'],
    arquivada && ['exportar', 'Exportar novamente'],
  ].filter(Boolean);
  const principal = arquivada ? ['reaplicar', 'Reaplicar o instrumento'] : ['exportar', 'Exportar e arquivar'];

  const roteiro = `
    <div class="filtro-linha">
      <div class="segmentado filtro-horizonte" role="group" aria-label="Filtrar por prazo">
        ${['Todos', 'Curto', 'Médio', 'Longo'].map((h, k) => `<button type="button" data-horizonte="${h}" aria-pressed="${k === 0}">${h}</button>`).join('')}
      </div>
      <span class="nota nao-imprimir">Indique um responsável para cada passo.</span>
    </div>
    <div class="tabela-rolagem"><table class="tabela tabela-roteiro">
      <thead><tr><th class="num">#</th><th>Critério</th><th>O que fazer</th><th>Esforço</th><th>Prazo</th><th>Responsável</th></tr></thead>
      <tbody>${diag.roteiro.map(r => `
        <tr data-h="${esc(r.horizonte)}" class="${r.origem === 'Advertência' ? 'linha-adv' : ''}">
          <td class="num">${r.ordem}</td>
          <td>${r.dimensao ? `${esc(nomeDimensao(modelo, r.dimensao))}<br><span class="faixa-tag tag-${esc(r.faixa)}">${esc(nomeFaixa(modelo, r.faixa))}</span>` : `<strong class="txt-F1">Atenção</strong><br><small>${esc(textoAlvo(r.alvo, modelo))}</small>`}</td>
          <td class="col-acao">${ehGargalo(diag, r) ? `${seloGargalo} ` : ''}${esc(r.acao)}${citacao(modelo, referenciasDoPasso(modelo, r))}</td>
          <td>${esc(r.esforco)}</td>
          <td>${esc(r.horizonte)}</td>
          <td><input class="input-resp" data-regra="${esc(r.regra)}" value="${esc(resp[r.regra] || '')}" placeholder="Nome" aria-label="Responsável pelo passo ${r.ordem}" ${arquivada ? 'readonly' : ''}><span class="so-impressao">${esc(resp[r.regra] || '')}</span></td>
        </tr>`).join('')}</tbody>
    </table></div>
    <p class="legenda-esforco">Prazo: ${modelo.horizontes.map(h => `${esc(h.codigo)} ${esc(h.significado.replace(/\.$/, ''))}`).join(' · ')}</p>
    ${diag.observacoes.filter(o => o.codigo === 'UC-07').map(o => `<p class="aviso aviso-info">${esc(o.texto)}</p>`).join('')}`;

  const criterios = `
    <div class="tabela-rolagem"><table class="tabela tabela-perfil">
      <thead><tr><th>Critério</th><th class="num">Peso</th><th class="num">Escore</th><th class="num">Nível</th><th>Faixa</th><th>Situação</th></tr></thead>
      <tbody>${diag.porDimensao.map(d => {
        const dim = modelo.dimensoes.find(x => x.codigo === d.codigo);
        return `<tr class="${d.eGargalo ? 'linha-gargalo' : ''}">
          <td>${esc(d.nome)}${d.critica ? ' <span class="tag" title="Critério crítico: limita o nível"><span class="ponto"></span> crítico</span>' : ''}</td>
          <td class="num">${num((dim?.peso ?? 0) * 100, 0)}%</td>
          <td class="num"><strong>${num(d.escore)}</strong></td>
          <td class="num">${d.nivel}</td>
          <td><span class="faixa-tag tag-${esc(d.faixa)}">${esc(nomeFaixa(modelo, d.faixa))}</span></td>
          <td>${d.eGargalo ? '<strong class="txt-F1">Gargalo: limita o nível</strong>' : d.faixa === 'F1' ? 'Exige ação antes de investir em IA' : d.faixa === 'F2' ? 'Sustenta piloto delimitado' : 'Não restringe a adoção'}</td>
        </tr>`;
      }).join('')}</tbody>
    </table></div>`;

  const nivel = `
    ${diag.tetoAtuou ? `
    <div class="teto-explica">
      <div class="lado"><span class="lado-rot">Pela média ponderada</span><strong>${num(diag.escoreGlobal)} → nível ${diag.nivelCompensatorio}</strong><span class="nota">${esc(nomeNivel(modelo, diag.nivelCompensatorio))}</span></div>
      <div class="seta" aria-hidden="true">${icone('seta')}</div>
      <div class="lado lado-final"><span class="lado-rot">Nível atribuído (teto de gargalo)</span><strong>nível ${diag.nivelFinal}</strong><span class="nota">${esc(nomeNivel(modelo, diag.nivelFinal))}</span></div>
    </div>
    <p class="nivel-interp"><strong>Por que o nível é menor do que a média?</strong> ${esc(diag.observacoes.find(o => o.codigo === 'FA-01')?.texto ?? '')} A literatura trata a base digital e os dados como pré-requisito da prontidão para IA, e não como um fator que outro ponto forte compense.${citacao(modelo, modelo.fundamentacao?.teto_de_gargalo || [])}</p>`
    : `<p class="nivel-interp">O nível atribuído coincide com o da média ponderada (${num(diag.escoreGlobal)}).</p>`}
    <p class="nivel-interp">${esc(nivelInfo.interpretacao)}</p>
    ${diag.observacoes.filter(o => o.codigo === 'FA-02').map(o => `<p class="aviso aviso-ok">${esc(o.texto)}</p>`).join('')}
    <table class="tabela compacta niveis-tabela">
      <thead><tr><th>Nível</th><th class="num">Escore</th><th>Significado</th></tr></thead>
      <tbody>${modelo.niveis.map(n => `<tr class="${n.numero === diag.nivelFinal ? 'atual' : ''}"><td>${n.numero} · ${esc(n.nome)}</td><td class="num">${n.limite_inferior}–${n.limite_superior}</td><td>${esc(n.interpretacao)}</td></tr>`).join('')}</tbody>
    </table>`;

  const conteudo = {
    roteiro,
    criterios,
    nivel,
    canvas: `<div data-canvas>${htmlCanvas(app, modelo)}</div>`,
    referencias: refs.length ? `<ol class="referencias">${refs.map(r => `<li>${referenciaCompleta(r)}</li>`).join('')}</ol>` : '',
  };
  const contagem = { roteiro: diag.roteiro.length, referencias: refs.length };
  const abas = ABAS.filter(([id]) => conteudo[id]);
  const graficoLinhas = diag.porDimensao;

  return `
    <header class="rel-cab barra-acoes">
      <div>
        <span class="rotulo">Diagnóstico de prontidão para IA</span>
        <h1>${esc(app.empresa.identificador)}</h1>
        <p class="meta">${esc(app.empresa.setor)} · ${esc(rotuloPorte(app.empresa.porte))} · ${esc(app.empresa.funcionarios)} funcionários · ${dataBR(app.data)} · ${esc(app.respondente)}${app.origem === 'importada' ? ' · importada' : ''}</p>
        ${!arquivada ? `<p class="meta rel-status nao-imprimir">${icone('alerta')} Ainda não exportado: fica só neste navegador.</p>` : `<p class="meta nao-imprimir">${esc(app.estado)}</p>`}
      </div>
      <div class="acoes nao-imprimir">
        <details class="mais-opcoes">
          <summary class="btn btn-sec">Mais opções ${icone('baixo')}</summary>
          <div class="mais-opcoes-lista">${opcoes.map(([acao, rotulo]) => `<button type="button" data-acao="${acao}">${rotulo}</button>`).join('')}</div>
        </details>
        <button type="button" class="btn btn-pri" data-acao="${principal[0]}">${principal[1]}</button>
      </div>
    </header>

    <article class="relatorio" id="relatorio">
      ${htmlIndicadores(app, modelo)}

      <div class="graficos">
        <section class="painel" data-revelar style="--atraso:80ms" aria-labelledby="g-perfil">
          <div class="painel-cab"><h2 id="g-perfil">Perfil por critério</h2>
            <div class="legenda-faixas">${modelo.faixas.map(f => `<span class="faixa-tag tag-${esc(f.codigo)}">${esc(f.nome)}</span>`).join('')}<span class="tag"><span class="ponto"></span> crítico</span></div></div>
          <div class="grafico-caixa" data-grafico="perfil">${svgPerfil(diag, modelo)}</div>
        </section>
        <section class="painel" data-revelar style="--atraso:140ms" aria-labelledby="g-radar">
          <div class="painel-cab"><h2 id="g-radar">Forma do perfil</h2></div>
          <div class="grafico-caixa radar" data-grafico="radar">${svgRadar([{ classe: 'poligono-b', valores: graficoLinhas.map(d => d.escore) }], graficoLinhas.map(d => d.nome))}</div>
        </section>
      </div>

      ${htmlPrioridades(app, modelo)}

      <section class="painel painel-flush detalhes" data-revelar style="--atraso:240ms" aria-label="Detalhes do diagnóstico">
        <div class="abas-rel" role="tablist" aria-label="Detalhes">
          ${abas.map(([id, rotulo], k) => `<button type="button" role="tab" id="aba-${id}" aria-controls="painel-${id}" aria-selected="${k === 0}" tabindex="${k === 0 ? 0 : -1}" data-aba="${id}">${rotulo}${contagem[id] ? `<small>${contagem[id]}</small>` : ''}</button>`).join('')}
        </div>
        ${abas.map(([id, rotulo], k) => `<div class="painel-aba ${k === 0 ? 'ativo' : ''} ${id === 'canvas' ? 'quebra-antes' : ''}" role="tabpanel" id="painel-${id}" aria-labelledby="aba-${id}" data-painel="${id}">
          <h2 class="painel-aba-titulo">${rotulo}</h2>${conteudo[id]}</div>`).join('')}
      </section>

      <footer class="rel-rodape">
        <p>Modelo ${esc(diag.versaoModelo)} · gerado em ${dataBR(diag.geradoEm)} neste dispositivo, sem transmissão de dados · comparável só com diagnósticos da mesma versão do modelo.</p>
      </footer>
    </article>`;
}

function mostrarAba(el, id, { focar = false } = {}) {
  el.querySelectorAll('[role="tab"][data-aba]').forEach(b => {
    const ativa = b.dataset.aba === id;
    b.setAttribute('aria-selected', String(ativa));
    b.tabIndex = ativa ? 0 : -1;
    if (ativa && focar) b.focus();
  });
  el.querySelectorAll('[data-painel]').forEach(p => p.classList.toggle('ativo', p.dataset.painel === id));
}

export function renderDiagnostico(el, { modelo, app, aoExportar, aoCorrigir, aoReaplicar, aoComparar, aoResponsavel, temAnteriores }) {
  el.innerHTML = htmlRelatorio(app, modelo, { temAnteriores });
  const diag = app.diagnostico;

  el.addEventListener('click', ev => {
    const alvo = ev.target.closest('button');
    if (!alvo) return;
    if (alvo.dataset.aba) { mostrarAba(el, alvo.dataset.aba); return; }
    if (alvo.dataset.irAba) {
      mostrarAba(el, alvo.dataset.irAba, { focar: true });
      el.querySelector('.detalhes')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      return;
    }
    if (alvo.dataset.horizonte) {
      el.querySelectorAll('[data-horizonte]').forEach(x => x.setAttribute('aria-pressed', String(x === alvo)));
      el.querySelectorAll('.tabela-roteiro tbody tr').forEach(tr => {
        tr.classList.toggle('filtrado', alvo.dataset.horizonte !== 'Todos' && tr.dataset.h !== alvo.dataset.horizonte);
      });
      return;
    }
    if (alvo.dataset.acao) {
      alvo.closest('details')?.removeAttribute('open');
      ({ imprimir: () => window.print(), exportar: aoExportar, corrigir: aoCorrigir, reaplicar: aoReaplicar, comparar: aoComparar })[alvo.dataset.acao]?.();
    }
  });

  // setas do teclado entre as abas (padrão WAI-ARIA)
  el.addEventListener('keydown', ev => {
    const aba = ev.target.closest?.('[role="tab"][data-aba]');
    if (!aba || !['ArrowLeft', 'ArrowRight'].includes(ev.key)) return;
    const todas = [...el.querySelectorAll('[role="tab"][data-aba]')];
    const k = todas.indexOf(aba) + (ev.key === 'ArrowRight' ? 1 : -1);
    mostrarAba(el, todas[(k + todas.length) % todas.length].dataset.aba, { focar: true });
  });

  el.addEventListener('change', ev => {
    const inp = ev.target.closest?.('.input-resp');
    if (!inp) return;
    aoResponsavel(inp.dataset.regra, inp.value.trim());
    inp.nextElementSibling.textContent = inp.value.trim();
    el.querySelector('[data-canvas]').innerHTML = htmlCanvas(app, modelo);
  });

  animarTela(el);
  montarGraficos(el, {
    perfil: (c, o) => opcoesPerfil(diag, modelo, c, o),
    radar: (c, o) => opcoesRadar(diag, modelo, c, o),
  });
}

// Na impressão, todas as abas saem (CSS); nada a abrir ou fechar.

// ------------------------------------------------------------ UC-09 — comparação
export function renderComparacao(el, { modelo, a, b }) {
  // RN-07: só são comparáveis diagnósticos produzidos sob a mesma versão do modelo.
  if (a.diagnostico.versaoModelo !== b.diagnostico.versaoModelo) {
    el.innerHTML = `<div class="aviso aviso-erro" role="alert">${icone('alerta')}<p><strong>Comparação bloqueada.</strong>
      A aplicação de ${dataBR(a.data)} usou o modelo ${esc(a.diagnostico.versaoModelo)} e a de ${dataBR(b.data)} o modelo ${esc(b.diagnostico.versaoModelo)}.
      Pesos, faixas ou itens podem ter mudado entre as versões.</p></div>`;
    return;
  }
  const [antes, depois] = (a.data || '') <= (b.data || '') ? [a, b] : [b, a];
  const da = antes.diagnostico;
  const db = depois.diagnostico;
  const delta = (x, y, casas = 1) => {
    const d = y - x;
    if (Math.abs(d) < 1e-9) return '<span class="delta igual">sem variação</span>';
    return `<span class="delta ${d > 0 ? 'sobe' : 'desce'}">${icone(d > 0 ? 'sobe' : 'desce')}${d > 0 ? '+' : ''}${casas ? num(d, casas) : d}</span>`;
  };
  const regrasA = new Set(da.roteiro.map(r => r.regra));
  const regrasB = new Set(db.roteiro.map(r => r.regra));
  const sairam = da.roteiro.filter(r => !regrasB.has(r.regra));
  const entraram = db.roteiro.filter(r => !regrasA.has(r.regra));
  const itemRoteiro = r => `<li><strong>${esc(ondeNaTela(r, modelo))}.</strong> ${esc(r.acao)}</li>`;
  const mesmaEmpresa = antes.empresa.identificador.trim().toLowerCase() === depois.empresa.identificador.trim().toLowerCase();
  const rotulos = [`Antes · ${dataBR(antes.data)}`, `Depois · ${dataBR(depois.data)}`];
  const gargalos = d => d.gargalos.map(g => nomeDimensao(modelo, g)).join(', ') || 'nenhum';

  el.innerHTML = `
    ${!mesmaEmpresa ? `<p class="aviso aviso-alerta">${icone('alerta')}<span>As aplicações são de empresas com nomes diferentes.</span></p>` : ''}
    <section class="painel comp-kpis" data-revelar>
      <div class="kpi"><span class="kpi-rot">Nível atribuído</span><span class="kpi-valor">${da.nivelFinal} → ${db.nivelFinal}</span>${delta(da.nivelFinal, db.nivelFinal, 0)}</div>
      <div class="kpi"><span class="kpi-rot">Escore global</span><span class="kpi-valor" data-contar="${db.escoreGlobal}" data-casas="1">${num(db.escoreGlobal)}</span>${delta(da.escoreGlobal, db.escoreGlobal)}</div>
      <div class="kpi"><span class="kpi-rot">Gargalo</span><span class="kpi-valor" style="font-size:1.125rem;line-height:1.3">${esc(gargalos(db))}</span><p class="kpi-txt">antes: ${esc(gargalos(da))}</p></div>
      <div class="kpi"><span class="kpi-rot">Período</span><span class="kpi-valor" style="font-size:1.125rem;line-height:1.3">${dataBR(antes.data)} → ${dataBR(depois.data)}</span><p class="kpi-txt">${esc(depois.empresa.identificador)}</p></div>
    </section>
    <div class="graficos">
      <section class="painel"><div class="painel-cab"><h2>Escore por critério</h2></div>
        <div class="grafico-caixa" data-grafico="comparacao">${svgComparacao(da, db, modelo, rotulos)}</div></section>
      <section class="painel"><div class="painel-cab"><h2>Forma do perfil</h2></div>
        <div class="grafico-caixa radar" data-grafico="radar-comparacao">${svgRadar([
          { classe: 'poligono-a', valores: modelo.dimensoes.map(d => da.escores[d.codigo]) },
          { classe: 'poligono-b', valores: modelo.dimensoes.map(d => db.escores[d.codigo]) }], modelo.dimensoes.map(d => d.nome))}</div></section>
    </div>
    <section class="painel">
      <div class="tabela-rolagem"><table class="tabela">
        <thead><tr><th>Critério</th><th class="num">Antes</th><th class="num">Depois</th><th class="num">Variação</th><th>Faixa</th></tr></thead>
        <tbody>
          ${modelo.dimensoes.map(d => `<tr>
            <td>${esc(d.nome)}${d.critica ? ' <span class="ponto" title="Critério crítico"></span>' : ''}</td>
            <td class="num">${num(da.escores[d.codigo])}</td>
            <td class="num">${num(db.escores[d.codigo])}</td>
            <td class="num">${delta(da.escores[d.codigo], db.escores[d.codigo])}</td>
            <td>${da.faixas[d.codigo] === db.faixas[d.codigo] ? esc(nomeFaixa(modelo, db.faixas[d.codigo])) : `${esc(nomeFaixa(modelo, da.faixas[d.codigo]))} → <strong>${esc(nomeFaixa(modelo, db.faixas[d.codigo]))}</strong>`}</td>
          </tr>`).join('')}
          <tr class="total"><td>Escore global ponderado</td><td class="num">${num(da.escoreGlobal)}</td><td class="num">${num(db.escoreGlobal)}</td><td class="num">${delta(da.escoreGlobal, db.escoreGlobal)}</td><td></td></tr>
        </tbody>
      </table></div>
    </section>
    <section class="painel colunas-2">
      <div><h2>Saíram do roteiro</h2>${sairam.length ? `<ul class="lista-simples">${sairam.map(itemRoteiro).join('')}</ul>` : '<p class="nota">Nenhum passo.</p>'}</div>
      <div><h2>Entraram no roteiro</h2>${entraram.length ? `<ul class="lista-simples">${entraram.map(itemRoteiro).join('')}</ul>` : '<p class="nota">Nenhum passo.</p>'}</div>
    </section>`;

  animarTela(el);
  montarGraficos(el, {
    comparacao: (c, o) => opcoesComparacao(da, db, modelo, rotulos, c, o),
    'radar-comparacao': (c, o) => opcoesRadarComparacao(da, db, modelo, rotulos, c, o),
  });
}
