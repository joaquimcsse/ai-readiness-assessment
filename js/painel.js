// painel.js — camada C5 (Apresentação e diagnóstico): perfil por dimensão
// desenhado em SVG sem biblioteca externa (CP-11), relatório de diagnóstico
// com área de impressão (CP-12), Canvas de Prontidão (seção 9) e comparação
// entre aplicações (UC-09).
// Ordem de leitura deliberada: perfil (evidência) → nível (conclusão) →
// roteiro (o que fazer a respeito).

import { esc, num, dataBR, nomeNivel, nomeFaixa, nomeDimensao, rotuloPorte } from './ui.js';
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
      <title>${esc(d.codigo)} ${esc(d.nome)}: ${num(d.escore)} — nível ${d.nivel}, faixa ${esc(nomeFaixa(modelo, d.faixa))}${d.critica ? ', dimensão crítica' : ''}${d.eGargalo ? ', GARGALO' : ''}</title>
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

export function htmlCanvas(app, modelo) {
  const diag = app.diagnostico;
  const agora = diag.roteiro.filter(r => r.horizonte === 'Curto');
  const depois = diag.roteiro.filter(r => r.horizonte !== 'Curto');
  const mudar = dimensoesQueDevemMudar(diag, modelo);
  const resp = app.responsaveis || {};
  const comResp = diag.roteiro.filter(r => (resp[r.regra] || '').trim());
  const criticasF1 = diag.porDimensao.filter(d => d.critica && d.faixa === 'F1').map(d => d.codigo);

  const celula = (titulo, conteudo, origem) => `<div class="canvas-celula">
    <h4>${esc(titulo)}</h4><div class="canvas-conteudo">${conteudo}</div><p class="canvas-origem">${esc(origem)}</p></div>`;

  return `<div class="canvas-grade">
    ${celula('Onde estamos', `<ul class="mini-escores">${diag.porDimensao.map(d => `<li><span>${esc(d.codigo)} ${esc(d.nome)}</span><strong class="txt-${esc(d.faixa)}">${num(d.escore)}</strong></li>`).join('')}</ul>`, 'Painel de perfil (CP-11)')}
    ${celula('O que nos trava', diag.tetoAtuou
      ? `<p><strong>${diag.gargalos.map(g => `${esc(g)} ${esc(nomeDimensao(modelo, g))}`).join(', ')}</strong> limita o nível atribuído em ${diag.nivelCompensatorio - diag.nivelFinal} nível(is): de ${diag.nivelCompensatorio} para ${diag.nivelFinal}.</p>${criticasF1.length ? `<p>Dimensões críticas na faixa Crítica: ${criticasF1.map(esc).join(', ')}.</p>` : ''}`
      : `<p>Nenhuma dimensão crítica limita o nível atribuído.</p>${criticasF1.length ? `<p>Ainda assim, ${criticasF1.map(esc).join(', ')} está na faixa Crítica.</p>` : ''}`, 'Aplicador do teto de gargalo (CP-08)')}
    ${celula('Em que nível estamos', `<p><strong>Nível ${diag.nivelFinal} — ${esc(nomeNivel(modelo, diag.nivelFinal))}.</strong> ${esc(modelo.niveis.find(n => n.numero === diag.nivelFinal)?.interpretacao)}</p>`, 'Classificador de nível (CP-07)')}
    ${celula('O que a média esconde', diag.tetoAtuou
      ? `<p>A média ponderada (${num(diag.escoreGlobal)}) indicaria o nível ${diag.nivelCompensatorio} — ${esc(nomeNivel(modelo, diag.nivelCompensatorio))}. O nível efetivamente atribuído é ${diag.nivelFinal}: dimensões fortes não compensam a base que falta.</p>`
      : `<p>Nada: o nível pela média ponderada (${num(diag.escoreGlobal)}) e o nível atribuído coincidem.</p>`, 'Regra transversal RT-03 / FA-01')}
    ${celula('O que fazer agora', agora.length
      ? `<ol>${agora.map(r => `<li><strong>${esc(r.regra)}</strong> — esforço ${esc(r.esforco.toLowerCase())}</li>`).join('')}</ol>`
      : '<p>Sem ações de curto prazo neste roteiro.</p>', 'Priorizador do roteiro (CP-10)')}
    ${celula('O que fazer depois', depois.length
      ? `<ol>${depois.map(r => `<li><strong>${esc(r.regra)}</strong> — ${esc(r.horizonte.toLowerCase())} prazo</li>`).join('')}</ol>`
      : '<p>—</p>', 'Priorizador do roteiro (CP-10)')}
    ${celula('Quem responde por cada passo', comResp.length
      ? `<ul>${comResp.map(r => `<li><strong>${esc(r.regra)}</strong>: ${esc(resp[r.regra])}</li>`).join('')}</ul>`
      : '<p class="vazio">A preencher pela empresa: indique um responsável para cada passo na tabela do roteiro.</p>', 'Preenchido pela própria PME')}
    ${celula('Como saberemos que avançamos', `<p>Próxima aplicação: <strong>${dataBR(diag.dataReaplicacao)}</strong>.</p>${mudar.length
      ? `<p>Espera-se mudança de faixa em: ${mudar.map(d => `<strong>${esc(d)}</strong>`).join(', ')}.</p>`
      : '<p>Espera-se manutenção das faixas atuais.</p>'}`, 'Ciclo de reaplicação')}
  </div>`;
}

// ------------------------------------------------------------ CP-12 — relatório
export function renderDiagnostico(el, { modelo, app, aoExportar, aoCorrigir, aoReaplicar, aoComparar, aoResponsavel, temAnteriores }) {
  const diag = app.diagnostico;
  const nivelInfo = modelo.niveis.find(n => n.numero === diag.nivelFinal);
  const reap = periodicidade(diag.nivelFinal, modelo);
  const arquivada = app.estado === ESTADOS.ARQUIVADA;
  const resp = app.responsaveis || {};
  const advertencias = diag.roteiro.filter(r => r.origem === 'Advertência');

  el.innerHTML = `
    <div class="barra-acoes nao-imprimir">
      <div>
        <p class="etapa-rotulo">Etapa 3 de 4 · leitura em cerca de 4 a 6 minutos</p>
        <span class="selo selo-estado">${esc(app.estado)}</span>
        ${app.origem === 'importada' ? '<span class="selo">importada</span>' : ''}
      </div>
      <div class="acoes">
        ${!arquivada ? '<button type="button" class="btn btn-sec" data-acao="corrigir">Corrigir respostas</button>' : ''}
        ${temAnteriores ? '<button type="button" class="btn btn-sec" data-acao="comparar">Comparar com outra aplicação</button>' : ''}
        <button type="button" class="btn btn-sec" data-acao="imprimir">Imprimir / salvar PDF</button>
        ${arquivada
          ? '<button type="button" class="btn btn-sec" data-acao="exportar">Exportar novamente</button><button type="button" class="btn btn-pri" data-acao="reaplicar">Reaplicar o instrumento</button>'
          : '<button type="button" class="btn btn-pri" data-acao="exportar">Exportar e arquivar</button>'}
      </div>
    </div>
    ${!arquivada ? `<p class="aviso aviso-alerta nao-imprimir"><strong>Etapa 4 — exporte o diagnóstico.</strong> Ele está guardado apenas neste navegador; limpar os dados de navegação o apaga. O arquivo exportado é o que permite comparar com a próxima aplicação.</p>` : ''}

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

      <section class="rel-secao">
        <h2><span class="num-secao">1</span> Perfil por dimensão</h2>
        <p class="rel-intro">Escore de 0 a 100 em cada dimensão. ◆ marca as dimensões críticas, que limitam o nível global. As cores indicam a faixa: <span class="txt-F1">Crítica</span>, <span class="txt-F2">Em evolução</span>, <span class="txt-F3">Consolidada</span>.</p>
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
              <td>${d.eGargalo ? '<strong class="txt-F1">Gargalo — limita o nível</strong>' : d.faixa === 'F1' ? 'Exige ação antes de investir em IA' : d.faixa === 'F2' ? 'Sustenta piloto delimitado' : 'Não restringe a adoção'}</td>
            </tr>`;
          }).join('')}</tbody>
        </table>
      </section>

      <section class="rel-secao">
        <h2><span class="num-secao">2</span> Nível de prontidão atribuído</h2>
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
        <p class="aviso aviso-alerta"><strong>Por que o nível é menor do que a média sugere?</strong> ${esc(diag.observacoes.find(o => o.codigo === 'FA-01')?.texto ?? '')} Investir em IA sem essa base tende a produzir impacto neutro ou negativo; por isso o modelo não deixa dimensões fortes encobrirem o déficit.</p>`
        : `<p class="nota">Escore global ponderado: <strong>${num(diag.escoreGlobal)}</strong>. Nenhuma dimensão crítica limitou o nível: o nível atribuído coincide com o da média ponderada.</p>`}
        ${diag.observacoes.filter(o => o.codigo === 'FA-02').map(o => `<p class="aviso aviso-ok">${esc(o.texto)}</p>`).join('')}
      </section>

      <section class="rel-secao">
        <h2><span class="num-secao">3</span> Roteiro de ação priorizado</h2>
        <p class="rel-intro">${diag.totalAcoes} itens: ${diag.totalAdvertencias} advertência(s) e ${diag.totalAcoes - diag.totalAdvertencias} ações, uma por dimensão. Cada item vem de uma regra explícita da base, identificada pelo código. Indique um responsável para cada passo.</p>
        ${advertencias.length ? `<div class="advertencias">${advertencias.map(a => `
          <div class="advertencia"><span class="adv-cod">${esc(a.regra)}</span><div><strong>Advertência — ${esc(a.alvo)}.</strong> ${esc(a.acao)}</div></div>`).join('')}</div>` : ''}
        <div class="filtro-horizonte nao-imprimir" role="group" aria-label="Filtrar por horizonte">
          <span>Filtrar por horizonte:</span>
          ${['Todos', 'Curto', 'Médio', 'Longo'].map((h, k) => `<button type="button" class="chip ${k === 0 ? 'ativo' : ''}" data-horizonte="${h}" aria-pressed="${k === 0}">${h}</button>`).join('')}
        </div>
        <table class="tabela tabela-roteiro">
          <thead><tr><th class="num">#</th><th>Regra</th><th>Alvo</th><th>O que fazer</th><th>Esforço</th><th>Horizonte</th><th class="num">Prior.</th><th>Responsável</th></tr></thead>
          <tbody>${diag.roteiro.map(r => `
            <tr data-h="${esc(r.horizonte)}" class="${r.origem === 'Advertência' ? 'linha-adv' : ''}">
              <td class="num">${r.ordem}</td>
              <td><code>${esc(r.regra)}</code><br><small>${esc(r.origem)}</small></td>
              <td>${r.dimensao ? `<strong>${esc(r.dimensao)}</strong><br><small>${esc(nomeFaixa(modelo, r.faixa))}</small>` : `<small>${esc(r.alvo)}</small>`}</td>
              <td class="col-acao">${esc(r.acao)}</td>
              <td>${esc(r.esforco)}</td>
              <td>${esc(r.horizonte)}</td>
              <td class="num">${r.prioridade}</td>
              <td><input class="input-resp" data-regra="${esc(r.regra)}" value="${esc(resp[r.regra] || '')}" placeholder="Nome" aria-label="Responsável por ${esc(r.regra)}" ${arquivada ? 'readonly' : ''}><span class="so-impressao">${esc(resp[r.regra] || '')}</span></td>
            </tr>`).join('')}</tbody>
        </table>
        <p class="nota legenda-esforco">Esforço — ${modelo.esforcos.map(e => `<strong>${esc(e.codigo)}</strong>: ${esc(e.significado)}`).join(' ')}<br>
        Horizonte — ${modelo.horizontes.map(h => `<strong>${esc(h.codigo)}</strong>: ${esc(h.significado)}`).join(' ')}</p>
        ${diag.observacoes.filter(o => o.codigo === 'UC-07').map(o => `<p class="aviso aviso-info">${esc(o.texto)}</p>`).join('')}
      </section>

      <section class="rel-secao quebra-antes">
        <h2><span class="num-secao">4</span> Canvas de Prontidão</h2>
        <p class="rel-intro">O resumo do diagnóstico em oito perguntas. Sete são respondidas automaticamente; a atribuição de responsáveis cabe à empresa.</p>
        <div data-canvas>${htmlCanvas(app, modelo)}</div>
      </section>

      <footer class="rel-rodape">
        <p><strong>Próxima aplicação sugerida: ${dataBR(diag.dataReaplicacao)}</strong> (nível ${diag.nivelFinal}: a cada ${reap?.meses} meses). Antecipe se: ${esc(reap?.gatilho)}</p>
        <p>Gerado pelo MGP-PME, modelo ${esc(diag.versaoModelo)}, em ${dataBR(diag.geradoEm)}. Diagnóstico calculado inteiramente neste dispositivo; nenhum dado foi transmitido. Só é comparável a diagnósticos da mesma versão do modelo. Aplicação ${esc(app.id)}.</p>
      </footer>
    </article>`;

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
  const sairam = [...regrasA].filter(r => !regrasB.has(r));
  const entraram = [...regrasB].filter(r => !regrasA.has(r));
  const mesmaEmpresa = antes.empresa.identificador.trim().toLowerCase() === depois.empresa.identificador.trim().toLowerCase();

  el.innerHTML = `
    ${!mesmaEmpresa ? '<p class="aviso aviso-alerta">As duas aplicações são de empresas com identificadores diferentes. A comparação é possível, mas confira se é isso mesmo que deseja.</p>' : ''}
    <div class="comparacao-cab">
      <div class="cartao-mini"><span class="lado-rot">Antes</span><strong>${esc(antes.empresa.identificador)}</strong><span>${dataBR(antes.data)} · nível ${da.nivelFinal} — ${esc(nomeNivel(modelo, da.nivelFinal))}</span></div>
      <div class="seta" aria-hidden="true">→</div>
      <div class="cartao-mini"><span class="lado-rot">Depois</span><strong>${esc(depois.empresa.identificador)}</strong><span>${dataBR(depois.data)} · nível ${db.nivelFinal} — ${esc(nomeNivel(modelo, db.nivelFinal))}</span></div>
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
      <div class="cartao-mini"><h3>Saíram do roteiro</h3>${sairam.length ? `<ul>${sairam.map(r => `<li><code>${esc(r)}</code></li>`).join('')}</ul>` : '<p>—</p>'}</div>
      <div class="cartao-mini"><h3>Entraram no roteiro</h3>${entraram.length ? `<ul>${entraram.map(r => `<li><code>${esc(r)}</code></li>`).join('')}</ul>` : '<p>—</p>'}</div>
    </div>`;
}
