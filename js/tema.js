// tema.js — tema claro (padrão) ou escuro. Script clássico carregado no <head>,
// antes da folha de estilo ser aplicada à página, para não piscar o tema
// errado; a CSP não permite script embutido, por isso é um arquivo. A escolha
// fica só neste navegador.
(function () {
  var CHAVE = 'mgp-pme:tema';
  var raiz = document.documentElement;
  function ler() { try { return localStorage.getItem(CHAVE); } catch (e) { return null; } }
  function aplicar(tema) {
    if (tema === 'escuro') raiz.setAttribute('data-tema', 'escuro');
    else raiz.removeAttribute('data-tema');
    var meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', tema === 'escuro' ? '#16191d' : '#ffffff');
    var botoes = document.querySelectorAll('[data-tema]');
    for (var i = 0; i < botoes.length; i++) {
      if (botoes[i] !== raiz) botoes[i].setAttribute('aria-pressed', String(botoes[i].getAttribute('data-tema') === (tema || 'claro')));
    }
  }
  aplicar(ler());
  document.addEventListener('DOMContentLoaded', function () {
    aplicar(ler());
    document.addEventListener('click', function (ev) {
      var b = ev.target.closest && ev.target.closest('button[data-tema]');
      if (!b) return;
      var tema = b.getAttribute('data-tema');
      try { localStorage.setItem(CHAVE, tema); } catch (e) { /* sem persistência */ }
      aplicar(tema);
    });
  });
})();
