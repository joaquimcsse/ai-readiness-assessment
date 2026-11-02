// animacoes.js — movimento da interface: elementos que entram ao aparecer na
// tela, números que contam até o valor, parallax leve e o topo que muda ao
// rolar. Tudo é descartado quando a tela muda (limparAnimacoes) e nada se move
// com "reduzir movimento" ligado: o estado final aparece de uma vez.
// Sem acesso ao DOM no carregamento do módulo, para rodar também no Node.

import { num } from './ui.js';

const limpezas = new Set();

const semMovimento = () =>
  typeof window === 'undefined' || !window.matchMedia || window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const temObservador = () => typeof window !== 'undefined' && 'IntersectionObserver' in window;

export function limparAnimacoes() {
  for (const f of limpezas) f();
  limpezas.clear();
}

// Observa os elementos e chama `aoVer` uma vez, quando cada um entra na tela.
function aoAparecer(elementos, aoVer, margem = '0px 0px -12% 0px') {
  if (!elementos.length) return;
  if (semMovimento() || !temObservador()) { elementos.forEach(aoVer); return; }
  const obs = new IntersectionObserver(entradas => {
    for (const e of entradas) {
      if (!e.isIntersecting) continue;
      obs.unobserve(e.target);
      aoVer(e.target);
    }
  }, { rootMargin: margem, threshold: 0.15 });
  elementos.forEach(el => obs.observe(el));
  limpezas.add(() => obs.disconnect());
}

// [data-revelar] ganha .visivel ao aparecer; o CSS faz a transição.
export function revelar(raiz) {
  if (!raiz?.querySelectorAll) return;
  aoAparecer([...raiz.querySelectorAll('[data-revelar]')], el => el.classList.add('visivel'));
}

// [data-contar="47.8"][data-casas="1"] conta de 0 até o valor.
export function contar(raiz) {
  if (!raiz?.querySelectorAll) return;
  const alvos = [...raiz.querySelectorAll('[data-contar]')];
  const escrever = (el, v) => {
    const casas = Number(el.dataset.casas || 0);
    el.textContent = casas ? num(v, casas) : String(Math.round(v));
  };
  aoAparecer(alvos, el => {
    const fim = Number(el.dataset.contar);
    if (semMovimento()) { escrever(el, fim); return; }
    const duracao = 900;
    const inicio = performance.now();
    const passo = agora => {
      if (!el.isConnected) return;
      const t = Math.min(1, (agora - inicio) / duracao);
      escrever(el, fim * (1 - (1 - t) ** 3));
      if (t < 1) requestAnimationFrame(passo);
    };
    escrever(el, 0);
    requestAnimationFrame(passo);
  });
}

// [data-parallax="0.15"] desloca-se com a rolagem, mais devagar que a página.
export function parallax(raiz) {
  if (!raiz?.querySelectorAll || semMovimento()) return;
  const alvos = [...raiz.querySelectorAll('[data-parallax]')];
  if (!alvos.length) return;
  let pendente = false;
  const aplicar = () => {
    pendente = false;
    const y = window.scrollY;
    for (const el of alvos) el.style.transform = `translate3d(0, ${(y * Number(el.dataset.parallax)).toFixed(1)}px, 0)`;
  };
  const aoRolar = () => { if (!pendente) { pendente = true; requestAnimationFrame(aplicar); } };
  window.addEventListener('scroll', aoRolar, { passive: true });
  limpezas.add(() => window.removeEventListener('scroll', aoRolar));
  aplicar();
}

// body.rolou depois de alguns pixels: o topo da página inicial deixa de se
// confundir com a faixa vinho e passa a branco com sombra.
export function vigiarRolagem() {
  if (typeof window === 'undefined') return;
  const aplicar = () => document.body.classList.toggle('rolou', window.scrollY > 24);
  window.addEventListener('scroll', aplicar, { passive: true });
  limpezas.add(() => { window.removeEventListener('scroll', aplicar); document.body.classList.remove('rolou'); });
  aplicar();
}

// Atalho para as telas: revela e conta tudo o que estiver marcado.
export function animarTela(raiz) {
  revelar(raiz);
  contar(raiz);
}
