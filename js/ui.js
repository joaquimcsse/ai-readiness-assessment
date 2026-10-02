// Utilitários de apresentação compartilhados pelos módulos de interface.

export function esc(v) {
  return String(v ?? '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

export const num = (v, casas = 1) =>
  Number(v).toLocaleString('pt-BR', { minimumFractionDigits: casas, maximumFractionDigits: casas });

export function dataBR(iso) {
  if (!iso) return 'sem data';
  const [a, m, d] = iso.slice(0, 10).split('-');
  return `${d}/${m}/${a}`;
}

export function nomeNivel(modelo, n) {
  return modelo.niveis.find(x => x.numero === n)?.nome ?? `Nível ${n}`;
}

export function nomeFaixa(modelo, f) {
  return modelo.faixas.find(x => x.codigo === f)?.nome ?? f;
}

export function nomeDimensao(modelo, d) {
  return modelo.dimensoes.find(x => x.codigo === d)?.nome ?? d;
}

export const PORTES = [
  { valor: 'micro', rotulo: 'Microempresa (até 9 pessoas)' },
  { valor: 'pequena', rotulo: 'Pequena empresa (10 a 49 pessoas)' },
  { valor: 'média', rotulo: 'Média empresa (50 a 249 pessoas)' },
];

export function rotuloPorte(v) {
  return PORTES.find(p => p.valor === v)?.rotulo.split(' (')[0] ?? v ?? 'porte não informado';
}

export function aviso(container, tipo, html) {
  const div = document.createElement('div');
  div.className = `aviso aviso-${tipo}`;
  div.setAttribute('role', tipo === 'erro' ? 'alert' : 'status');
  div.innerHTML = html;
  container.prepend(div);
  return div;
}

let temporizador = null;
export function notificar(texto) {
  let el = document.getElementById('notificacao');
  if (!el) {
    el = document.createElement('div');
    el.id = 'notificacao';
    el.setAttribute('role', 'status');
    el.setAttribute('aria-live', 'polite');
    document.body.appendChild(el);
  }
  el.textContent = texto;
  el.classList.add('visivel');
  clearTimeout(temporizador);
  temporizador = setTimeout(() => el.classList.remove('visivel'), 3200);
}

export function lerArquivo(arquivo) {
  return new Promise((resolve, reject) => {
    const leitor = new FileReader();
    leitor.onload = () => resolve(leitor.result);
    leitor.onerror = () => reject(leitor.error);
    leitor.readAsText(arquivo, 'utf-8');
  });
}
