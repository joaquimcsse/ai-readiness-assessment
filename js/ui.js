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

// Referências bibliográficas (bloco "referencias" de dados.json). Fora da página
// inicial aparecem só como citação; a referência completa fica no Início e no Sobre.
export function obterReferencia(modelo, chave) {
  return (modelo.referencias || []).find(r => r.chave === chave);
}

export function citar(modelo, chaves = []) {
  return chaves.map(c => obterReferencia(modelo, c)?.citacao ?? c).join('; ');
}

export function referenciaCompleta(ref) {
  const doi = ref.doi ? ` <a href="https://doi.org/${esc(ref.doi)}" target="_blank" rel="noopener noreferrer">doi:${esc(ref.doi)}</a>` : '';
  const titulo = /[.?!]$/.test(ref.titulo) ? ref.titulo : `${ref.titulo}.`;
  return `${esc(ref.autores)}, ${esc(ref.ano)}. ${esc(titulo)} <em>${esc(ref.veiculo)}</em>.${doi}`;
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

export function lerArquivoBinario(arquivo) {
  return new Promise((resolve, reject) => {
    const leitor = new FileReader();
    leitor.onload = () => resolve(leitor.result);
    leitor.onerror = () => reject(leitor.error);
    leitor.readAsArrayBuffer(arquivo);
  });
}

// Nome de arquivo exportado, no padrão dos relatórios do cop: partes unidas por
// "_", sem acentos, caracteres fora de [A-Za-z0-9.-] trocados por "-", carimbo
// yyyyMMdd-HHmm no fim; a parte descritiva tem no máximo 120 caracteres.
export function nomeArquivo(partes, extensao, quando = new Date()) {
  const dois = n => String(n).padStart(2, '0');
  const carimbo = `${quando.getFullYear()}${dois(quando.getMonth() + 1)}${dois(quando.getDate())}-${dois(quando.getHours())}${dois(quando.getMinutes())}`;
  const limpo = partes
    .map(p => String(p ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .replace(/[^A-Za-z0-9.-]+/g, '-').replace(/^-+|-+$/g, ''))
    .filter(Boolean)
    .join('_');
  return `${limpo.slice(0, 120).replace(/[-_]+$/, '')}_${carimbo}.${extensao}`;
}

export function dataHoraBR(iso) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return 'sem data';
  return d.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export function lerArquivo(arquivo) {
  return new Promise((resolve, reject) => {
    const leitor = new FileReader();
    leitor.onload = () => resolve(leitor.result);
    leitor.onerror = () => reject(leitor.error);
    leitor.readAsText(arquivo, 'utf-8');
  });
}
