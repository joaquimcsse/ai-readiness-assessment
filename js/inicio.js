// inicio.js — página inicial. Uma sequência que se lê rolando: a faixa vinho
// com a prévia do resultado, os números do instrumento, como funciona, o
// método (por que o nível pode ser menor que a média), os critérios, o que o
// gestor recebe, a garantia de privacidade e o convite final.
// A prévia e a explicação do método usam o caso ilustrativo calculado pelo
// próprio núcleo, e não números inventados.

import { esc, num, nomeNivel, nomeDimensao, referenciaCompleta, obterReferencia, icone } from './ui.js';
import { diagnosticar } from './nucleo.js';
import { primeiroPasso } from './painel.js';
import { esforcoGestor } from './validacao.js';
import { animarTela, parallax, vigiarRolagem } from './animacoes.js';
import { REVISAO } from './pesquisa.js';

// Ícones de traço (24px) dos critérios, das etapas e do que o gestor recebe.
const DESENHOS = {
  D0: '<rect x="3" y="4" width="18" height="12" rx="2"/><path d="M8 20h8M12 16v4"/>',
  D1: '<ellipse cx="12" cy="6" rx="7" ry="3"/><path d="M5 6v6c0 1.7 3.1 3 7 3s7-1.3 7-3V6M5 12v6c0 1.7 3.1 3 7 3s7-1.3 7-3v-6"/>',
  D2: '<circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="4"/><circle cx="12" cy="12" r=".8" fill="currentColor"/>',
  D3: '<circle cx="9" cy="8" r="3"/><circle cx="17" cy="9" r="2.4"/><path d="M3.5 19c.6-3 2.8-5 5.5-5s4.9 2 5.5 5M14.5 14.6c.8-.4 1.6-.6 2.5-.6 2.1 0 3.8 1.6 4.3 4"/>',
  D4: '<path d="M12 3l7 3v5c0 4.5-3 8.2-7 10-4-1.8-7-5.5-7-10V6z"/><path d="M9 12l2 2 4-4"/>',
  D5: '<circle cx="12" cy="5" r="2.2"/><circle cx="5" cy="18" r="2.2"/><circle cx="19" cy="18" r="2.2"/><path d="M11 7l-5 9M13 7l5 9M7.2 18h9.6"/>',
  ficha: '<rect x="5" y="3" width="14" height="18" rx="2"/><path d="M9 8h6M9 12h6M9 16h4"/>',
  pergunta: '<rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="8" cy="10" r="1.6"/><circle cx="8" cy="15" r="1.6" fill="currentColor"/><path d="M12 10h5M12 15h5"/>',
  painel: '<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>',
  nivel: '<path d="M4 20h4v-5h4v-5h4V5h4"/>',
  perfil: '<path d="M12 3l8 5v8l-8 5-8-5V8z"/><path d="M12 8l4 2.5v3L12 16l-4-2.5v-3z"/>',
  roteiro: '<path d="M9 6h11M9 12h11M9 18h11"/><path d="M4 6l1 1 2-2M4 12l1 1 2-2M4 18l1 1 2-2"/>',
  arquivo: '<path d="M7 3h7l5 5v13H7z"/><path d="M14 3v5h5M10 13h6M10 17h6"/>',
  cadeado: '<rect x="5" y="10" width="14" height="10" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/>',
  livro: '<path d="M4 5c3-1 6-1 8 1 2-2 5-2 8-1v14c-3-1-6-1-8 1-2-2-5-2-8-1z"/><path d="M12 6v14"/>',
  metodo: '<circle cx="12" cy="12" r="8"/><path d="M12 8v4l3 2"/>',
};
const desenho = (nome, classe = 'ico') =>
  `<svg class="${classe}" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">${DESENHOS[nome] || ''}</svg>`;

// Grade de pontos vermelhos, motivo gráfico da página.
const pontos = (colunas, linhas, classe) => `<svg class="${classe}" viewBox="0 0 ${colunas * 22} ${linhas * 22}" aria-hidden="true">${
  Array.from({ length: colunas * linhas }, (_, k) => `<circle cx="${(k % colunas) * 22 + 11}" cy="${Math.floor(k / colunas) * 22 + 11}" r="8"/>`).join('')}</svg>`;

const curto = nome => nome.split(/[ ,]/)[0];

// Resume uma ação a cerca de `max` caracteres, cortando em palavra inteira.
const resumir = (texto, max = 64) => {
  const base = texto.split(/[,.:;(]/)[0].trim();
  if (base.length <= max) return base;
  return `${base.slice(0, max).replace(/\s+\S*$/, '')}…`;
};

function casoIlustrativo(modelo, caso) {
  const respostas = {};
  for (const d of modelo.dimensoes) {
    modelo.itens.filter(i => i.dimensao === d.codigo).forEach((it, k) => { respostas[it.codigo] = caso.respostas[d.codigo]?.[k] ?? 3; });
  }
  return diagnosticar(respostas, modelo, { data: '2026-01-01' });
}

function cartoesPrevia(modelo, diag) {
  const passo = primeiroPasso(diag);
  const teto = modelo.niveis.find(n => n.numero === diag.nivelFinal)?.limite_superior ?? 40;
  return `
    <div class="flutuante f1" data-revelar style="--atraso:250ms">
      <span class="f-rot">Nível atribuído</span>
      <div class="f-nivel"><strong>${diag.nivelFinal}</strong><span>de ${modelo.niveis.length}<br><b>${esc(nomeNivel(modelo, diag.nivelFinal))}</b></span></div>
      <div class="f-escada">${modelo.niveis.map(n => `<i class="${n.numero <= diag.nivelFinal ? 'ate' : ''}"></i>`).join('')}</div>
    </div>
    <div class="flutuante f2" data-revelar style="--atraso:420ms">
      <div class="f-cab"><span class="f-rot">Perfil por critério</span><span class="pilula pilula-critica">gargalo: ${esc(nomeDimensao(modelo, diag.gargalos[0] ?? ''))}</span></div>
      <div class="f-barras" style="--teto-n:${teto}">
        ${diag.porDimensao.map((d, k) => `<div class="f-coluna ${d.eGargalo ? 'gargalo' : ''}"><i style="--v:${d.escore}%;--k:${k}"></i><span>${esc(curto(d.nome))}</span></div>`).join('')}
        <div class="f-teto"><span>teto</span></div>
      </div>
    </div>
    <div class="flutuante f3" data-revelar style="--atraso:600ms">
      <span class="f-rot">Primeiro passo</span>
      <p>${esc(resumir(passo.acao))}</p>
      <span class="pilula">${esc(passo.horizonte)} prazo</span>
    </div>`;
}

// O método em uma animação: barras sobem, a média aparece, o crítico mais fraco
// fica vermelho, o teto desce até o nível dele e o nível passa de 3 a 2.
function demoGargalo(modelo, diag) {
  const teto = modelo.niveis.find(n => n.numero === diag.nivelFinal)?.limite_superior ?? 40;
  return `<figure class="lp-demo" data-revelar aria-label="Exemplo: média ${num(diag.escoreGlobal)} indicaria nível ${diag.nivelCompensatorio}, mas o critério crítico mais fraco limita o nível a ${diag.nivelFinal}.">
    <div class="demo-area" style="--media:${diag.escoreGlobal}%;--teto:${teto}%">
      ${modelo.niveis.map(n => `<div class="demo-faixa" style="--de:${n.limite_inferior}%;--ate:${n.limite_superior}%"><span>nível ${n.numero}</span></div>`).join('')}
      <div class="demo-barras">
        ${diag.porDimensao.map((d, k) => `<div class="demo-col ${d.eGargalo ? 'gargalo' : ''} ${d.critica ? 'critica' : ''}">
          <i style="--v:${d.escore}%;--k:${k}"><b>${num(d.escore, 0)}</b></i><span>${esc(curto(d.nome))}</span></div>`).join('')}
      </div>
      <div class="demo-media"><span>média<br>${num(diag.escoreGlobal)}</span></div>
      <div class="demo-teto"><span>teto</span></div>
    </div>
    <figcaption class="demo-resultado">
      <span>A média indica o nível ${diag.nivelCompensatorio}, mas ${esc(nomeDimensao(modelo, diag.gargalos[0] ?? ''))} limita a ${diag.nivelFinal}.</span>
      <span class="demo-num"><s>${diag.nivelCompensatorio}</s><strong>${diag.nivelFinal}</strong></span>
    </figcaption>
  </figure>`;
}

function referencias(modelo) {
  const chaves = new Set(['peffers2007']);
  modelo.dimensoes.forEach(d => (d.referencias || []).forEach(c => chaves.add(c)));
  modelo.itens.forEach(i => (i.fundamento?.referencias || []).forEach(c => chaves.add(c)));
  const refs = [...chaves].map(c => obterReferencia(modelo, c)).filter(Boolean)
    .sort((a, b) => a.autores.localeCompare(b.autores, 'pt-BR'));
  if (!refs.length) return '';
  return `<section class="conteudo lp-refs-secao">
      <details class="lp-refs" id="base-cientifica">
        <summary>${icone('chevron')} Base científica · ${refs.length} estudos citados</summary>
        <ol class="referencias">${refs.map(r => `<li id="ref-${esc(r.chave)}">${referenciaCompleta(r)}</li>`).join('')}</ol>
      </details>
    </section>`;
}

const titulo = (rotulo, texto, extra = '') => `<header class="lp-titulo" data-revelar>
    <span class="sobrelinha">${esc(rotulo)}</span><h2>${texto}</h2>${extra ? `<p>${extra}</p>` : ''}</header>`;

export function renderInicio(el, { modelo, app, emCurso, respondidas, semArmazenamento, caso }) {
  const total = modelo.itens.length;
  const tempo = esforcoGestor(modelo);
  const diag = casoIlustrativo(modelo, caso);
  const regras = (modelo.regras_dimensao?.length || 0) + (modelo.regras_transversais?.length || 0);
  const estudos = modelo.referencias?.length || 0;

  // tempos do processo (Tabela 14): ficha, perguntas e leitura do resultado
  const gestor = (modelo.tempos_processo || []).filter(e => e.raia === 'Gestor da PME');
  const soma = lista => [lista.reduce((s, e) => s + e.min, 0), lista.reduce((s, e) => s + e.max, 0)];
  const ultimaPergunta = gestor.map(e => Boolean(e.dimensoes)).lastIndexOf(true);
  const faixa = ([a, b]) => (a === b ? `${a} min` : `${a} a ${b} min`);
  const passos = [
    ['ficha', 'Dados da empresa', 'Setor, porte e responsável, que não entram no cálculo.', faixa(soma(gestor.slice(0, 1)))],
    ['pergunta', `${total} afirmações`, 'Uma por tela, com cinco descrições de prática.', faixa(soma(gestor.filter(e => e.dimensoes)))],
    ['painel', 'Diagnóstico', 'Nível, gargalo e roteiro priorizado, em PDF.', faixa(soma(gestor.slice(ultimaPergunta + 1)))],
  ];
  const recebe = [
    ['nivel', 'Nível e gargalo', 'De 1 a 5, com o critério que segura o resultado.'],
    ['perfil', 'Perfil em gráficos', 'Os seis critérios lado a lado, de 0 a 100.'],
    ['roteiro', 'Roteiro priorizado', 'Ações por prazo e esforço, com responsável.'],
    ['arquivo', 'PDF e planilha', 'Para compartilhar e comparar na reaplicação.'],
  ];

  const cta = emCurso
    ? `<a class="btn btn-claro btn-grande" href="${app.diagnostico ? '#/diagnostico' : '#/questionario'}">${app.diagnostico ? 'Ver diagnóstico' : `Continuar (${respondidas}/${total})`} ${icone('seta')}</a>
       <button type="button" class="btn btn-contorno btn-grande" data-acao="nova">Novo diagnóstico</button>`
    : `<button type="button" class="btn btn-claro btn-grande" data-acao="nova">Iniciar diagnóstico ${icone('seta')}</button>
       <button type="button" class="btn btn-contorno btn-grande" data-acao="demo">Ver exemplo</button>`;

  el.innerHTML = `
    <section class="cheia lp-heroi">
      <div class="lp-formas" aria-hidden="true">
        <span class="forma disco" data-parallax="0.10"></span>
        <span class="forma anel" data-parallax="0.04"></span>
        <span class="forma pontos-heroi" data-parallax="0.22">${pontos(5, 3, 'grade-pontos')}</span>
      </div>
      <div class="conteudo lp-heroi-grade">
        <div class="lp-heroi-texto">
          <span class="lp-selo entra" style="--atraso:0ms">Diagnóstico gratuito · ${tempo.min} a ${tempo.max} min</span>
          <h1 class="entra" style="--atraso:80ms">A sua empresa está <span class="destaque">pronta para IA<svg viewBox="0 0 300 16" preserveAspectRatio="none" aria-hidden="true"><path d="M3 11 C 80 3, 200 3, 297 9"/></svg></span>?</h1>
          <p class="lp-sub entra" style="--atraso:160ms">Descubra o nível de prontidão, o que trava o avanço e por onde começar.</p>
          <div class="acoes entra" style="--atraso:240ms">${cta}</div>
          ${emCurso ? `<p class="lp-atual entra" style="--atraso:300ms">Em andamento: ${esc(app.empresa.identificador)}${emCurso && app.diagnostico ? '' : ` · <button type="button" class="link link-claro" data-acao="demo">ver exemplo</button>`}</p>` : ''}
          <ul class="lp-confianca entra" style="--atraso:320ms">
            <li>${desenho('cadeado')} Nada sai do navegador</li>
            <li>${desenho('livro')} ${REVISAO.artigos} artigos revisados</li>
            <li>${desenho('metodo')} Design Science Research</li>
          </ul>
          ${semArmazenamento ? `<p class="aviso aviso-alerta">${icone('alerta')}<span>Este navegador não guarda dados. Exporte o diagnóstico antes de fechar.</span></p>` : ''}
        </div>
        <div class="lp-heroi-visual">
          <span class="lp-previa-rotulo entra" style="--atraso:200ms">Prévia do resultado · caso ilustrativo</span>
          ${cartoesPrevia(modelo, diag)}
        </div>
      </div>
    </section>

    <section class="conteudo">
      <ul class="lp-numeros" data-revelar>
        <li><strong data-contar="${total}">${total}</strong><span>afirmações</span></li>
        <li><strong data-contar="${modelo.dimensoes.length}">${modelo.dimensoes.length}</strong><span>critérios</span></li>
        <li><strong data-contar="${modelo.niveis.length}">${modelo.niveis.length}</strong><span>níveis de maturidade</span></li>
        <li><strong data-contar="${regras}">${regras}</strong><span>regras de recomendação</span></li>
        <li><strong data-contar="${estudos}">${estudos}</strong><span>estudos citados</span></li>
      </ul>
    </section>

    <section class="conteudo lp-secao">
      ${titulo('Como funciona', 'Três etapas até o diagnóstico')}
      <ol class="lp-passos" data-revelar>
        <svg class="lp-linha" viewBox="0 0 100 2" preserveAspectRatio="none" aria-hidden="true"><path d="M0 1H100"/></svg>
        ${passos.map(([ic, t, d, m], k) => `<li style="--atraso:${200 + k * 180}ms">
          <span class="lp-passo-ico">${desenho(ic)}<b>${k + 1}</b></span>
          <strong>${esc(t)}</strong><p>${esc(d)}</p><span class="pilula">${esc(m)}</span></li>`).join('')}
      </ol>
    </section>

    <section class="conteudo lp-secao lp-metodo">
      <div class="lp-metodo-texto">
        ${titulo('O método', 'Por que o nível pode ser menor que a média', 'Um ponto forte não compensa uma base que falta. Os critérios críticos funcionam como teto: o nível final nunca passa do nível do mais fraco deles.')}
        <ul class="lp-legenda" data-revelar>
          <li><i class="l-barra"></i>Escore de cada critério, de 0 a 100</li>
          <li><i class="l-media"></i>Média ponderada</li>
          <li><i class="l-teto"></i>Teto do critério crítico mais fraco</li>
        </ul>
        <p class="nota" data-revelar>Caso ilustrativo, calculado pelo próprio instrumento.</p>
      </div>
      ${demoGargalo(modelo, diag)}
    </section>

    <section class="cheia lp-alt">
      <div class="conteudo lp-secao">
        ${titulo('O que avaliamos', 'Seis critérios de prontidão', `Os ${modelo.dimensoes.filter(d => d.critica).length} marcados como críticos limitam o resultado.`)}
        <ul class="lp-criterios">
          ${modelo.dimensoes.map((d, k) => `<li data-revelar style="--atraso:${(k % 3) * 100}ms">
            <span class="lp-crit-ico">${desenho(d.codigo)}</span>
            <div><h3>${esc(d.nome)}</h3><p>${esc(d.resumo || '')}</p></div>
            ${d.critica ? '<span class="pilula pilula-critica">crítico</span>' : ''}
          </li>`).join('')}
        </ul>
      </div>
    </section>

    <section class="conteudo lp-secao lp-recebe">
      <div>
        ${titulo('O que você recebe', 'Um diagnóstico para decidir onde investir')}
        <ul class="lp-lista" data-revelar>
          ${recebe.map(([ic, t, d], k) => `<li style="--atraso:${k * 120}ms"><span class="lp-lista-ico">${desenho(ic)}</span><div><strong>${esc(t)}</strong><p>${esc(d)}</p></div></li>`).join('')}
        </ul>
      </div>
      <div class="lp-pilha" data-revelar>
        <div class="pilha-cartao p1">
          <span class="f-rot">Nível atribuído</span>
          <div class="f-nivel"><strong data-contar="${diag.nivelFinal}">${diag.nivelFinal}</strong><span>de ${modelo.niveis.length}<br><b>${esc(nomeNivel(modelo, diag.nivelFinal))}</b></span></div>
          <span class="f-rot" style="margin-top:12px">Escore global</span>
          <div class="f-escore"><strong data-contar="${diag.escoreGlobal}" data-casas="1">${num(diag.escoreGlobal)}</strong> / 100</div>
        </div>
        <div class="pilha-cartao p2">
          <span class="f-rot">Por onde começar</span>
          <ol>${[primeiroPasso(diag), ...diag.roteiro.filter(r => r !== primeiroPasso(diag)).slice(0, 2)].map(r => `<li><b>${esc(r.dimensao ? nomeDimensao(modelo, r.dimensao) : 'Atenção')}</b>${esc(resumir(r.acao, 58))}</li>`).join('')}</ol>
        </div>
      </div>
    </section>

    <section class="cheia lp-alt lp-confia">
      <ul class="conteudo">
        <li data-revelar>${desenho('cadeado')}<div><strong>100% no navegador</strong><p>Nenhuma resposta é enviada a servidor algum.</p></div></li>
        <li data-revelar style="--atraso:120ms">${desenho('livro')}<div><strong>Revisão de ${REVISAO.artigos} artigos</strong><p>Publicados de ${REVISAO.periodo}, sobre adoção de IA em pequenas e médias empresas.</p></div></li>
        <li data-revelar style="--atraso:240ms">${desenho('metodo')}<div><strong>Artefato de Design Science Research</strong><p>Projetado, demonstrado e avaliado segundo o ciclo de Peffers et al. (2007).</p></div></li>
      </ul>
    </section>

    <section class="cheia lp-cta">
      ${pontos(4, 3, 'grade-pontos cta-pontos')}
      <div class="conteudo" data-revelar>
        <h2>Leva de ${tempo.min} a ${tempo.max} minutos.</h2>
        <p>Você não precisa de cadastro nem de consultoria, e o resultado sai assim que você termina.</p>
        <button type="button" class="btn btn-claro btn-grande" data-acao="${emCurso ? 'continuar' : 'nova'}">${emCurso ? 'Continuar diagnóstico' : 'Iniciar diagnóstico'} ${icone('seta')}</button>
      </div>
    </section>

    ${referencias(modelo)}`;

  animarTela(el);
  parallax(el);
  vigiarRolagem();
}
