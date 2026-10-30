// painel.js — camada C5 (Apresentação e diagnóstico): perfil por dimensão
// desenhado em SVG sem biblioteca externa (CP-11), relatório de diagnóstico
// com área de impressão (CP-12), Canvas de Prontidão (seção 9) e comparação
// entre aplicações (UC-09).
// Ordem de leitura deliberada: perfil (evidência) → nível (conclusão) →
// roteiro (o que fazer a respeito).

import { esc, num, dataBR, nomeNivel, nomeFaixa, nomeDimensao, rotuloPorte, citar, obterReferencia, referenciaCompleta } from './ui.js';
import { ESTADOS } from './estado.js';
import { periodicidade } from './nucleo.js';

const SVG_NS = 'http://www.w3.org/2000/svg';
const MESES_HORIZONTE = { Curto: 3, Médio: 9, Longo: 18 };

// ------------------------------------------------------------ CP-11 — perfil em SVG
export function svgPerfil(diag, modelo, { largura = 680 } = {}) {
  const linhas = diag.porDimensao;
  const rotuloW = 230;
  const direita = 70;
  const topo = 30;
  const alturaLinha = 42;
  const areaW = largura - rotuloW - direita;
  const altura = topo + linhas.length * alturaLinha + 34;
  const x = v => rotuloW + (v / 100) * areaW;

  const faixas = modelo.faixas.map(f => `
    <rect class="zona zona-${esc(f.codigo)}" x="${x(f.limite_inferior)}" y="${topo - 8}" width="${x(f.limite_superior) - x(f.limite_inferior)}" height="${linhas.length * alturaLinha + 8}"/>
    <text class="zona-rotulo" x="${(x(f.limite_inferior) + x(f.limite_superior)) / 2}" y="${topo - 14}" text-anchor="middle">${esc(f.nome)}</text>`).join('');

  const grade = [0, 20, 40, 60, 80, 100].map(v => `
    <line class="grade" x1="${x(v)}" x2="${x(v)}" y1="${topo - 8}" y2="${topo + linhas.length * alturaLinha}"/>
    <text class="eixo" x="${x(v)}" y="${topo + linhas.length * alturaLinha + 16}" text-anchor="middle">${v}</text>`).join('');

  const barras = linhas.map((d, k) => {
    const y = topo + k * alturaLinha + 8;
    const h = alturaLinha - 16;
    const w = Math.max(x(d.escore) - x(0), 1.5);
    return `<g class="barra-dim ${d.eGargalo ? 'gargalo' : ''}">
      <title>${esc(d.codigo)} ${esc(d.nome)}: ${num(d.escore)}, nível ${d.nivel}, faixa ${esc(nomeFaixa(modelo, d.faixa))}${d.critica ? ', dimensão crítica' : ''}${d.eGargalo ? ', GARGALO' : ''}</title>
      <text class="rotulo-dim" x="${rotuloW - 12}" y="${y + h / 2 + 1}" text-anchor="end" dominant-baseline="middle">${d.critica ? '◆ ' : ''}${esc(d.codigo)} · ${esc(d.nome.length > 24 ? d.nome.slice(0, 23) + '…' : d.nome)}</text>
      <rect class="barra barra-${esc(d.faixa)}" x="${x(0)}" y="${y}" width="${w}" height="${h}" rx="3"/>
      <text class="valor" x="${x(0) + w + 6}" y="${y + h / 2 + 1}" dominant-baseline="middle">${num(d.escore)}${d.eGargalo ? ' ▲ gargalo' : ''}</text>
    </g>`;
  }).join('');

  const eg = diag.escoreGlobal;
  const global = `<line class="linha-global" x1="${x(eg)}" x2="${x(eg)}" y1="${topo - 8}" y2="${topo + linhas.length * alturaLinha}"/>
    <text class="rotulo-global" x="${x(eg)}" y="${altura - 2}" text-anchor="middle">média ponderada ${num(eg)}</text>`;

  return `<svg xmlns="${SVG_NS}" class="grafico-perfil" viewBox="0 0 ${largura} ${altura + 6}" role="img" aria-labelledby="perfil-titulo perfil-desc">
    <title id="perfil-titulo">Perfil de prontidão por dimensão</title>
    <desc id="perfil-desc">${linhas.map(d => `${d.codigo} ${d.nome}: ${num(d.escore)} (${nomeFaixa(modelo, d.faixa)})`).join('; ')}. Média ponderada ${num(eg)}.</desc>
    ${faixas}${grade}${barras}${global}
  </svg>`;
}

// Gráfico de barras agrupadas para a comparação entre duas aplicações.
export function svgComparacao(diagA, diagB, modelo, rotulos, { largura = 680 } = {}) {
  const rotuloW = 230;
  const direita = 60;
  const topo = 28;
  const alturaLinha = 52;
  const areaW = largura - rotuloW - direita;
  const n = modelo.dimensoes.length;
  const altura = topo + n * alturaLinha + 26;
  const x = v => rotuloW + (v / 100) * areaW;
  const grade = [0, 20, 40, 60, 80, 100].map(v => `
    <line class="grade" x1="${x(v)}" x2="${x(v)}" y1="${topo - 6}" y2="${topo + n * alturaLinha}"/>
    <text class="eixo" x="${x(v)}" y="${topo + n * alturaLinha + 16}" text-anchor="middle">${v}</text>`).join('');
  const faixas = modelo.faixas.map(f => `<rect class="zona zona-${esc(f.codigo)}" x="${x(f.limite_inferior)}" y="${topo - 6}" width="${x(f.limite_superior) - x(f.limite_inferior)}" height="${n * alturaLinha + 6}"/>`).join('');
  const linhas = modelo.dimensoes.map((d, k) => {
    const y = topo + k * alturaLinha + 6;
    const a = diagA.escores[d.codigo];
    const b = diagB.escores[d.codigo];
    return `<g><title>${esc(d.codigo)}: ${num(a)} → ${num(b)}</title>
      <text class="rotulo-dim" x="${rotuloW - 12}" y="${y + 20}" text-anchor="end" dominant-baseline="middle">${d.critica ? '◆ ' : ''}${esc(d.codigo)} · ${esc(d.nome.length > 24 ? d.nome.slice(0, 23) + '…' : d.nome)}</text>
      <rect class="barra-a" x="${x(0)}" y="${y}" width="${Math.max(x(a) - x(0), 1.5)}" height="17" rx="2"/>
      <text class="valor" x="${x(a) + 5}" y="${y + 9}" dominant-baseline="middle">${num(a)}</text>
      <rect class="barra-b" x="${x(0)}" y="${y + 21}" width="${Math.max(x(b) - x(0), 1.5)}" height="17" rx="2"/>
      <text class="valor" x="${x(b) + 5}" y="${y + 30}" dominant-baseline="middle">${num(b)}</text>
    </g>`;
  }).join('');
  const legenda = `<g class="legenda">
    <rect class="barra-a" x="${rotuloW}" y="4" width="12" height="12" rx="2"/><text x="${rotuloW + 18}" y="14">${esc(rotulos[0])}</text>
    <rect class="barra-b" x="${rotuloW + 230}" y="4" width="12" height="12" rx="2"/><text x="${rotuloW + 248}" y="14">${esc(rotulos[1])}</text>
  </g>`;
  return `<svg xmlns="${SVG_NS}" class="grafico-perfil" viewBox="0 0 ${largura} ${altura}" role="img" aria-label="Comparação dos escores por dimensão entre duas aplicações">
    ${faixas}${grade}${linhas}${legenda}</svg>`;
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
    { titulo: 'Onde estamos', origem: 'Escore de cada dimensão, de 0 a 100',
      blocos: [{ escores: diag.porDimensao.map(d => ({ rotulo: `${d.codigo} ${d.nome}`, valor: num(d.escore), faixa: d.faixa })) }] },
    { titulo: 'O que nos trava', origem: 'Dimensão crítica de menor escore',
      blocos: diag.tetoAtuou
        ? [{ p: [forte(gargalos), ` limita o nível atribuído em ${diag.nivelCompensatorio - diag.nivelFinal} nível(is): de ${diag.nivelCompensatorio} para ${diag.nivelFinal}.`] },
           ...(criticasF1.length ? [{ p: [`Dimensões críticas na faixa Crítica: ${criticasF1.join(', ')}.`] }] : [])]
        : [{ p: ['Nenhuma dimensão crítica limita o nível atribuído.'] },
           ...(criticasF1.length ? [{ p: [`Ainda assim, ${criticasF1.join(', ')} está na faixa Crítica.`] }] : [])] },
    { titulo: 'Em que nível estamos', origem: 'Nível de maturidade atribuído',
      blocos: [{ p: [forte(`Nível ${diag.nivelFinal}: ${nomeNivel(modelo, diag.nivelFinal)}.`), ` ${modelo.niveis.find(n => n.numero === diag.nivelFinal)?.interpretacao ?? ''}`] }] },
    { titulo: 'O que a média esconde', origem: 'Média ponderada contra nível atribuído',
      blocos: [{ p: [diag.tetoAtuou
        ? `A média ponderada (${num(diag.escoreGlobal)}) indicaria o nível ${diag.nivelCompensatorio} (${nomeNivel(modelo, diag.nivelCompensatorio)}). O nível efetivamente atribuído é ${diag.nivelFinal}: dimensões fortes não compensam a base que falta.`
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
        mudar.length ? { p: ['Espera-se mudança de faixa em: ', ...mudar.flatMap((d, k) => [k ? ', ' : '', forte(d)]), '.'] } : { p: ['Espera-se manutenção das faixas atuais.'] }] },
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
// Versão 1.1.0 (avaliação do PBL 7, R2 a R4 e R9): o relatório abre por um
// resumo de uma tela (nível, o que trava e o primeiro passo); perfil, nível,
// roteiro completo e Canvas ficam recolhidos e se abrem na impressão. A tela do
// gestor não mostra códigos de regra: eles seguem no arquivo exportado e nas
// telas de Sobre e Manutenção.

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

function secao(numero, titulo, resumo, conteudo, classe = '') {
  return `<details class="rel-secao ${classe}">
    <summary><h2><span class="num-secao">${numero}</span> ${titulo}</h2><span class="rel-resumo-secao">${resumo}</span></summary>
    <div class="rel-secao-corpo">${conteudo}</div>
  </details>`;
}

function htmlResumo(app, modelo) {
  const diag = app.diagnostico;
  const primeiro = primeiroPasso(diag);
  const seguintes = diag.roteiro.filter(r => r !== primeiro).slice(0, 2);
  const passo = r => `<li>${ehGargalo(diag, r) ? `${seloGargalo} ` : ''}<strong>${esc(alvoLegivel(r, modelo))}.</strong> ${esc(r.acao)}${citacao(modelo, referenciasDoPasso(modelo, r))} <small>(${esc(r.horizonte.toLowerCase())} prazo)</small></li>`;
  return `<section class="rel-resumo" aria-labelledby="resumo-titulo">
    <h2 id="resumo-titulo" class="sr">Resumo do diagnóstico</h2>
    <div class="resumo-grade">
      <div class="resumo-nivel">
        <span class="lado-rot">Nível atribuído</span>
        <div class="nivel-principal"><div class="nivel-num">${diag.nivelFinal}</div><div class="nivel-nome">${esc(nomeNivel(modelo, diag.nivelFinal))}</div></div>
        ${diag.tetoAtuou ? `<p>Pela média seria ${diag.nivelCompensatorio}, mas uma dimensão crítica segura o resultado.</p>` : '<p>Nenhuma dimensão crítica segura o resultado.</p>'}
      </div>
      <div class="resumo-trava">
        <span class="lado-rot">O que trava</span>
        ${diag.tetoAtuou
          ? `<p><strong class="txt-F1">${diag.gargalos.map(g => `${esc(g)} ${esc(nomeDimensao(modelo, g))}`).join(', ')}</strong></p><p>Enquanto não melhorar, o nível não passa de ${diag.nivelFinal}.</p>`
          : `<p><strong>Nada impede o próximo nível.</strong></p><p>Use o roteiro para consolidar as dimensões mais fracas.</p>`}
      </div>
    </div>
    <div class="resumo-passos">
      <span class="lado-rot">Por onde começar</span>
      <ol>${passo(primeiro)}${seguintes.map(passo).join('')}</ol>
      <p class="nota">O roteiro completo, com ${diag.totalAcoes} passos, está na seção 3.</p>
    </div>
  </section>`;
}

export function htmlRelatorio(app, modelo, { temAnteriores = false } = {}) {
  const diag = app.diagnostico;
  const nivelInfo = modelo.niveis.find(n => n.numero === diag.nivelFinal);
  const reap = periodicidade(diag.nivelFinal, modelo);
  const arquivada = app.estado === ESTADOS.ARQUIVADA;
  const resp = app.responsaveis || {};
  const advertencias = diag.roteiro.filter(r => r.origem === 'Advertência');
  const refs = referenciasDoRelatorio(diag, modelo);

  // R4: um único próximo passo em destaque; o resto fica em "Mais opções".
  const opcoes = [
    !arquivada && ['corrigir', 'Corrigir respostas'],
    temAnteriores && ['comparar', 'Comparar com outra aplicação'],
    ['imprimir', 'Imprimir'],
    arquivada && ['exportar', 'Exportar novamente'],
  ].filter(Boolean);
  const principal = arquivada ? ['reaplicar', 'Reaplicar o instrumento'] : ['exportar', 'Exportar e arquivar'];

  const perfil = `
    <p class="rel-intro">◆ marca as dimensões críticas. Cores: <span class="txt-F1">Crítica</span>, <span class="txt-F2">Em evolução</span>, <span class="txt-F3">Consolidada</span>.</p>
    <div class="grafico">${svgPerfil(diag, modelo)}</div>
    <table class="tabela tabela-perfil">
      <thead><tr><th>Dimensão</th><th class="num">Peso</th><th class="num">Escore</th><th class="num">Nível</th><th>Faixa</th><th>Situação</th></tr></thead>
      <tbody>${diag.porDimensao.map(d => {
        const dim = modelo.dimensoes.find(x => x.codigo === d.codigo);
        return `<tr class="${d.eGargalo ? 'linha-gargalo' : ''}">
          <td><strong>${esc(d.codigo)}</strong> ${esc(d.nome)}${d.critica ? ' <span class="selo selo-critica">crítica</span>' : ''}</td>
          <td class="num">${num((dim?.peso ?? 0) * 100, 0)}%</td>
          <td class="num"><strong>${num(d.escore)}</strong></td>
          <td class="num">${d.nivel}</td>
          <td><span class="faixa-tag tag-${esc(d.faixa)}">${esc(nomeFaixa(modelo, d.faixa))}</span></td>
          <td>${d.eGargalo ? '<strong class="txt-F1">Gargalo: limita o nível</strong>' : d.faixa === 'F1' ? 'Exige ação antes de investir em IA' : d.faixa === 'F2' ? 'Sustenta piloto delimitado' : 'Não restringe a adoção'}</td>
        </tr>`;
      }).join('')}</tbody>
    </table>`;

  const nivel = `
    <div class="nivel-bloco">
      <div class="nivel-principal">
        <div class="nivel-num">${diag.nivelFinal}</div>
        <div>
          <div class="nivel-nome">${esc(nivelInfo.nome)}</div>
          <div class="nivel-escala" aria-hidden="true">${modelo.niveis.map(n => `<span class="${n.numero === diag.nivelFinal ? 'atual' : ''} ${diag.tetoAtuou && n.numero === diag.nivelCompensatorio ? 'ponderado' : ''}">${n.numero}</span>`).join('')}</div>
        </div>
      </div>
      <p class="nivel-interp">${esc(nivelInfo.interpretacao)}</p>
    </div>
    ${diag.tetoAtuou ? `
    <div class="teto-explica">
      <div class="lado"><span class="lado-rot">Pela média ponderada</span><strong>${num(diag.escoreGlobal)} → nível ${diag.nivelCompensatorio}</strong><span>${esc(nomeNivel(modelo, diag.nivelCompensatorio))}</span></div>
      <div class="seta" aria-hidden="true">→</div>
      <div class="lado lado-final"><span class="lado-rot">Nível atribuído (teto de gargalo)</span><strong>nível ${diag.nivelFinal}</strong><span>${esc(nomeNivel(modelo, diag.nivelFinal))}</span></div>
    </div>
    <p class="aviso aviso-info"><strong>Por que o nível é menor do que a média?</strong> ${esc(diag.observacoes.find(o => o.codigo === 'FA-01')?.texto ?? '')} A literatura trata a base digital e os dados como pré-requisito da prontidão para IA, e não como um fator que outro ponto forte compense.${citacao(modelo, modelo.fundamentacao?.teto_de_gargalo || [])}</p>`
    : `<p class="nota">Escore global ponderado: <strong>${num(diag.escoreGlobal)}</strong>. O nível atribuído coincide com o da média ponderada.</p>`}
    ${diag.observacoes.filter(o => o.codigo === 'FA-02').map(o => `<p class="aviso aviso-ok">${esc(o.texto)}</p>`).join('')}`;

  const roteiro = `
    <p class="rel-intro">Advertências primeiro, depois uma ação por dimensão, da mais urgente para a menos urgente. Indique um responsável para cada passo.</p>
    ${advertencias.length ? `<div class="advertencias">${advertencias.map(a => `
      <div class="advertencia"><div><strong>Atenção: ${esc(a.alvo)}.</strong> ${esc(a.acao)}${citacao(modelo, referenciasDoPasso(modelo, a))}</div></div>`).join('')}</div>` : ''}
    <div class="filtro-horizonte nao-imprimir" role="group" aria-label="Filtrar por horizonte">
      <span>Filtrar por horizonte:</span>
      ${['Todos', 'Curto', 'Médio', 'Longo'].map((h, k) => `<button type="button" class="chip ${k === 0 ? 'ativo' : ''}" data-horizonte="${h}" aria-pressed="${k === 0}">${h}</button>`).join('')}
    </div>
    <table class="tabela tabela-roteiro">
      <thead><tr><th class="num">#</th><th>Onde</th><th>O que fazer</th><th>Esforço</th><th>Horizonte</th><th>Responsável</th></tr></thead>
      <tbody>${diag.roteiro.map(r => `
        <tr data-h="${esc(r.horizonte)}" class="${r.origem === 'Advertência' ? 'linha-adv' : ''}">
          <td class="num">${r.ordem}</td>
          <td>${r.dimensao ? `<strong>${esc(r.dimensao)}</strong> ${esc(nomeDimensao(modelo, r.dimensao))}<br><small>${esc(nomeFaixa(modelo, r.faixa))}</small>` : '<strong>Atenção</strong>'}</td>
          <td class="col-acao">${ehGargalo(diag, r) ? `${seloGargalo} ` : ''}${esc(r.acao)}${citacao(modelo, referenciasDoPasso(modelo, r))}</td>
          <td>${esc(r.esforco)}</td>
          <td>${esc(r.horizonte)}</td>
          <td><input class="input-resp" data-regra="${esc(r.regra)}" value="${esc(resp[r.regra] || '')}" placeholder="Nome" aria-label="Responsável pelo passo ${r.ordem}" ${arquivada ? 'readonly' : ''}><span class="so-impressao">${esc(resp[r.regra] || '')}</span></td>
        </tr>`).join('')}</tbody>
    </table>
    <p class="nota legenda-esforco">Esforço: ${modelo.esforcos.map(e => `<strong>${esc(e.codigo)}</strong>: ${esc(e.significado)}`).join(' ')}<br>
    Horizonte: ${modelo.horizontes.map(h => `<strong>${esc(h.codigo)}</strong>: ${esc(h.significado)}`).join(' ')}</p>
    ${diag.observacoes.filter(o => o.codigo === 'UC-07').map(o => `<p class="aviso aviso-info">${esc(o.texto)}</p>`).join('')}`;

  return `
    <div class="barra-acoes nao-imprimir">
      <div>
        <p class="etapa-rotulo">Etapa 3 de 4 · seu resultado</p>
        <span class="selo selo-estado">${esc(app.estado)}</span>
        ${app.origem === 'importada' ? '<span class="selo">importada</span>' : ''}
      </div>
      <div class="acoes">
        <details class="mais-opcoes">
          <summary class="btn btn-sec">Mais opções</summary>
          <div class="mais-opcoes-lista">${opcoes.map(([acao, rotulo]) => `<button type="button" class="link" data-acao="${acao}">${rotulo}</button>`).join('')}</div>
        </details>
        <button type="button" class="btn btn-pri" data-acao="${principal[0]}">${principal[1]}</button>
      </div>
    </div>
    ${!arquivada ? '<p class="aviso aviso-info nao-imprimir"><strong>Próximo passo: exporte o diagnóstico.</strong> Ele fica só neste navegador. Baixe o relatório em PDF para ler e compartilhar, e guarde a planilha: é ela que permite comparar com a próxima aplicação.</p>' : ''}

    <article class="relatorio" id="relatorio">
      <header class="rel-cab">
        <div>
          <p class="rel-marca">MGP-PME · Diagnóstico de prontidão para IA</p>
          <h1>${esc(app.empresa.identificador)}</h1>
          <p class="rel-meta">${esc(app.empresa.setor)} · ${esc(rotuloPorte(app.empresa.porte))} · ${esc(app.empresa.funcionarios)} funcionários</p>
        </div>
        <dl class="rel-ident">
          <div><dt>Data da aplicação</dt><dd>${dataBR(app.data)}</dd></div>
          <div><dt>Respondente</dt><dd>${esc(app.respondente)}</dd></div>
          <div><dt>Versão do modelo</dt><dd>${esc(diag.versaoModelo)}</dd></div>
          <div><dt>Reaplicação sugerida</dt><dd>${dataBR(diag.dataReaplicacao)}</dd></div>
        </dl>
      </header>

      ${htmlResumo(app, modelo)}

      <p class="nota nao-imprimir">Toque em um título para ver os detalhes. Na impressão, tudo sai aberto.</p>
      ${secao(1, 'Perfil por dimensão', 'Escore de 0 a 100 em cada uma das seis dimensões', perfil)}
      ${secao(2, 'Por que este nível', diag.tetoAtuou ? `Média ${num(diag.escoreGlobal)} indicaria nível ${diag.nivelCompensatorio}; o teto de gargalo leva a ${diag.nivelFinal}` : `Média ponderada ${num(diag.escoreGlobal)}`, nivel)}
      ${secao(3, 'Roteiro completo', `${diag.totalAcoes} passos, ${advertencias.length} advertência(s)`, roteiro)}
      ${secao(4, 'Canvas de Prontidão', 'O diagnóstico resumido em oito perguntas', `<div data-canvas>${htmlCanvas(app, modelo)}</div>`, 'quebra-antes')}
      ${refs.length ? secao(5, 'Referências', `${refs.length} estudo(s) que fundamentam as ações e a explicação do nível`, `
        <p class="rel-intro">As ações do roteiro e a regra do teto de gargalo se apoiam nestes estudos sobre adoção de IA em PMEs. A lista muda conforme o diagnóstico: só entram as obras citadas acima.</p>
        <ol class="referencias">${refs.map(r => `<li>${referenciaCompleta(r)}</li>`).join('')}</ol>`) : ''}

      <footer class="rel-rodape">
        <p><strong>Próxima aplicação sugerida: ${dataBR(diag.dataReaplicacao)}</strong> (nível ${diag.nivelFinal}: a cada ${reap?.meses} meses). Antecipe se: ${esc(reap?.gatilho)}</p>
        <p>Gerado pelo MGP-PME, modelo ${esc(diag.versaoModelo)}, em ${dataBR(diag.geradoEm)}. Calculado neste dispositivo; nenhum dado foi transmitido. Só é comparável a diagnósticos da mesma versão do modelo.</p>
      </footer>
    </article>`;
}

// Na impressão, as seções recolhidas saem abertas; depois voltam como estavam.
if (typeof window !== 'undefined') {
  window.addEventListener('beforeprint', () => {
    document.querySelectorAll('details.rel-secao:not([open])').forEach(d => { d.dataset.recolhida = '1'; d.open = true; });
  });
  window.addEventListener('afterprint', () => {
    document.querySelectorAll('details.rel-secao[data-recolhida]').forEach(d => { d.open = false; delete d.dataset.recolhida; });
  });
}

export function renderDiagnostico(el, { modelo, app, aoExportar, aoCorrigir, aoReaplicar, aoComparar, aoResponsavel, temAnteriores }) {
  el.innerHTML = htmlRelatorio(app, modelo, { temAnteriores });

  el.querySelector('.filtro-horizonte')?.addEventListener('click', ev => {
    const b = ev.target.closest('[data-horizonte]');
    if (!b) return;
    el.querySelectorAll('[data-horizonte]').forEach(x => { x.classList.toggle('ativo', x === b); x.setAttribute('aria-pressed', String(x === b)); });
    el.querySelectorAll('.tabela-roteiro tbody tr').forEach(tr => {
      tr.classList.toggle('filtrado', b.dataset.horizonte !== 'Todos' && tr.dataset.h !== b.dataset.horizonte);
    });
  });

  el.addEventListener('change', ev => {
    const inp = ev.target.closest('.input-resp');
    if (!inp) return;
    aoResponsavel(inp.dataset.regra, inp.value.trim());
    inp.nextElementSibling.textContent = inp.value.trim();
    el.querySelector('[data-canvas]').innerHTML = htmlCanvas(app, modelo);
  });

  el.querySelector('.barra-acoes').addEventListener('click', ev => {
    const b = ev.target.closest('[data-acao]');
    if (!b) return;
    b.closest('details')?.removeAttribute('open');
    ({ imprimir: () => window.print(), exportar: aoExportar, corrigir: aoCorrigir, reaplicar: aoReaplicar, comparar: aoComparar })[b.dataset.acao]?.();
  });
}

// ------------------------------------------------------------ UC-09 — comparação
export function renderComparacao(el, { modelo, a, b }) {
  // RN-07: só são comparáveis diagnósticos produzidos sob a mesma versão do modelo.
  if (a.diagnostico.versaoModelo !== b.diagnostico.versaoModelo) {
    el.innerHTML = `<div class="aviso aviso-erro" role="alert"><strong>Comparação bloqueada (RN-07).</strong>
      A aplicação de ${dataBR(a.data)} foi produzida sob o modelo ${esc(a.diagnostico.versaoModelo)} e a de ${dataBR(b.data)} sob o modelo ${esc(b.diagnostico.versaoModelo)}.
      Pesos, faixas ou itens podem ter mudado entre as versões; confrontar os escores levaria a conclusões falsas.</div>`;
    return;
  }
  const [antes, depois] = (a.data || '') <= (b.data || '') ? [a, b] : [b, a];
  const da = antes.diagnostico;
  const db = depois.diagnostico;
  const seta = (x, y) => (y > x + 1e-9 ? '<span class="sobe">▲</span>' : y < x - 1e-9 ? '<span class="desce">▼</span>' : '<span class="igual">=</span>');
  const sinal = v => (v > 0 ? '+' : '') + num(v);
  const regrasA = new Set(da.roteiro.map(r => r.regra));
  const regrasB = new Set(db.roteiro.map(r => r.regra));
  const sairam = da.roteiro.filter(r => !regrasB.has(r.regra));
  const entraram = db.roteiro.filter(r => !regrasA.has(r.regra));
  const itemRoteiro = r => `<li><strong>${esc(alvoLegivel(r, modelo))}.</strong> ${esc(r.acao)}</li>`;
  const mesmaEmpresa = antes.empresa.identificador.trim().toLowerCase() === depois.empresa.identificador.trim().toLowerCase();

  el.innerHTML = `
    ${!mesmaEmpresa ? '<p class="aviso aviso-alerta">As duas aplicações são de empresas com identificadores diferentes. A comparação é possível, mas confira se é isso mesmo que deseja.</p>' : ''}
    <div class="comparacao-cab">
      <div class="cartao-mini"><span class="lado-rot">Antes</span><strong>${esc(antes.empresa.identificador)}</strong><span>${dataBR(antes.data)} · nível ${da.nivelFinal}, ${esc(nomeNivel(modelo, da.nivelFinal))}</span></div>
      <div class="seta" aria-hidden="true">→</div>
      <div class="cartao-mini"><span class="lado-rot">Depois</span><strong>${esc(depois.empresa.identificador)}</strong><span>${dataBR(depois.data)} · nível ${db.nivelFinal}, ${esc(nomeNivel(modelo, db.nivelFinal))}</span></div>
    </div>
    <div class="grafico">${svgComparacao(da, db, modelo, [`Antes (${dataBR(antes.data)})`, `Depois (${dataBR(depois.data)})`])}</div>
    <table class="tabela">
      <thead><tr><th>Dimensão</th><th class="num">Antes</th><th class="num">Depois</th><th class="num">Variação</th><th>Faixa</th></tr></thead>
      <tbody>
        ${modelo.dimensoes.map(d => `<tr>
          <td><strong>${esc(d.codigo)}</strong> ${esc(d.nome)}${d.critica ? ' <span class="selo selo-critica">crítica</span>' : ''}</td>
          <td class="num">${num(da.escores[d.codigo])}</td>
          <td class="num">${num(db.escores[d.codigo])}</td>
          <td class="num">${seta(da.escores[d.codigo], db.escores[d.codigo])} ${sinal(db.escores[d.codigo] - da.escores[d.codigo])}</td>
          <td>${da.faixas[d.codigo] === db.faixas[d.codigo] ? esc(nomeFaixa(modelo, db.faixas[d.codigo])) : `${esc(nomeFaixa(modelo, da.faixas[d.codigo]))} → <strong>${esc(nomeFaixa(modelo, db.faixas[d.codigo]))}</strong>`}</td>
        </tr>`).join('')}
        <tr class="total"><td>Escore global ponderado</td><td class="num">${num(da.escoreGlobal)}</td><td class="num">${num(db.escoreGlobal)}</td><td class="num">${seta(da.escoreGlobal, db.escoreGlobal)} ${sinal(db.escoreGlobal - da.escoreGlobal)}</td><td></td></tr>
        <tr class="total"><td>Nível atribuído</td><td class="num">${da.nivelFinal}</td><td class="num">${db.nivelFinal}</td><td class="num">${seta(da.nivelFinal, db.nivelFinal)} ${db.nivelFinal - da.nivelFinal > 0 ? '+' : ''}${db.nivelFinal - da.nivelFinal}</td><td></td></tr>
        <tr><td>Gargalos</td><td colspan="2">${da.gargalos.join(', ') || 'nenhum'} → ${db.gargalos.join(', ') || 'nenhum'}</td><td colspan="2"></td></tr>
      </tbody>
    </table>
    <div class="linha-2">
      <div class="cartao-mini"><h3>Saíram do roteiro</h3>${sairam.length ? `<ul>${sairam.map(itemRoteiro).join('')}</ul>` : '<p>Nenhum passo.</p>'}</div>
      <div class="cartao-mini"><h3>Entraram no roteiro</h3>${entraram.length ? `<ul>${entraram.map(itemRoteiro).join('')}</ul>` : '<p>Nenhum passo.</p>'}</div>
    </div>`;
}
