// avaliacao.js — UC-13 Avaliar utilidade e clareza do artefato, no protocolo
// usado na pesquisa (seção 8.2 do artigo): o questionário System Usability
// Scale (SUS, Brooke, 1996) e as perguntas abertas PA1 a PA3, aplicados na
// segunda entrevista com gestor (E3b) e no survey (E5). A avaliação fica neste
// navegador e é exportada em arquivo; nada é enviado (ADR-03).

import { esc, dataBR, notificar, num, icone } from './ui.js';
import { salvarAvaliacao, listarAvaliacoes, excluirAvaliacao, exportarAvaliacao, novoIdAvaliacao, listarAplicacoes, hojeISO, minutosPreenchimento } from './estado.js';
import { PERGUNTAS_ABERTAS } from './pesquisa.js';

const ESCALA = ['Discordo totalmente', 'Discordo', 'Neutro', 'Concordo', 'Concordo totalmente'];

// Texto provisório: tradução direta dos dez itens de Brooke (1996). Troque pelo
// texto da versão em português aplicada pelo grupo e mude a marca para false.
export const SUS_TEXTO_PROVISORIO = true;
export const ITENS_SUS = [
  ['S01', 'Eu gostaria de usar este sistema com frequência.'],
  ['S02', 'Achei o sistema desnecessariamente complexo.'],
  ['S03', 'Achei o sistema fácil de usar.'],
  ['S04', 'Eu precisaria da ajuda de uma pessoa com conhecimento técnico para usar o sistema.'],
  ['S05', 'Achei que as funções do sistema estão bem integradas.'],
  ['S06', 'Achei o sistema inconsistente demais.'],
  ['S07', 'Imagino que a maioria das pessoas aprenderia a usar este sistema rapidamente.'],
  ['S08', 'Achei o sistema muito trabalhoso de usar.'],
  ['S09', 'Eu me senti muito confiante usando o sistema.'],
  ['S10', 'Precisei aprender muita coisa antes de conseguir usar o sistema.'],
];

// Escore SUS de 0 a 100: itens ímpares contam (resposta − 1), pares contam
// (5 − resposta), e a soma é multiplicada por 2,5. null se faltar resposta.
export function escoreSUS(respostas) {
  const vals = ITENS_SUS.map(([c]) => Number(respostas?.[c]));
  if (vals.some(v => !Number.isInteger(v) || v < 1 || v > 5)) return null;
  return vals.reduce((s, v, k) => s + (k % 2 === 0 ? v - 1 : 5 - v), 0) * 2.5;
}

// Avaliações salvas antes desta versão usavam dez afirmações próprias (Q01 a
// Q10, de 1 a 5); continuam listadas, com a média delas.
function resumoAntigo(a) {
  const notas = Object.values(a.respostas || {}).filter(Number.isFinite);
  return notas.length ? `média ${num(notas.reduce((s, v) => s + v, 0) / notas.length)}` : '';
}

export function renderAvaliacao(el, { modelo }) {
  const aplicacoes = listarAplicacoes().filter(a => a.diagnostico);
  el.innerHTML = `
    <div class="estreito" style="max-width:860px">
      <header class="pagina-cab">
        <div>
          <span class="rotulo">Pesquisa · avaliação de usabilidade</span>
          <h1>Avaliação do MGP-PME</h1>
          <p class="sub">Responda depois de aplicar o diagnóstico ou abrir o exemplo. São dez afirmações do questionário SUS e três perguntas abertas.</p>
        </div>
      </header>
      <form id="form-aval" class="formulario">
        <section class="painel">
          <div class="grade-form">
            <label class="campo">Nome (opcional) <input name="avaliador" maxlength="120" autocomplete="name"></label>
            <label class="campo">Perfil
              <select name="perfil" required>
                <option value="">Selecione</option>
                <option>Gestor de PME</option>
                <option>Especialista</option>
                <option>Público geral</option>
              </select>
            </label>
            <label class="campo">Diagnóstico usado
              <select name="aplicacao">
                <option value="">Nenhum</option>
                ${aplicacoes.map(a => `<option value="${esc(a.id)}">${esc(a.empresa.identificador)}, ${dataBR(a.data)} (nível ${a.diagnostico.nivelFinal})</option>`).join('')}
              </select>
            </label>
            <label class="campo">Minutos gastos <input name="minutos" type="number" min="0" step="1" inputmode="numeric"></label>
          </div>
        </section>
        <section class="painel">
          <div class="painel-cab"><h2>System Usability Scale</h2><p>1 discordo totalmente · 5 concordo totalmente</p></div>
          ${SUS_TEXTO_PROVISORIO ? `<p class="aviso aviso-alerta">${icone('alerta')}<span>Texto provisório dos itens. Falta trocar pela versão em português que o grupo aplicou.</span></p>` : ''}
          <table class="matriz-likert">
            <thead><tr><th scope="col">Afirmação</th>${ESCALA.map((e, k) => `<th scope="col" title="${esc(e)}">${k + 1}</th>`).join('')}</tr></thead>
            <tbody>${ITENS_SUS.map(([c, t], i) => `<tr role="radiogroup" aria-label="${esc(t)}">
              <td><small>${i + 1}</small>${esc(t)}</td>
              ${ESCALA.map((e, k) => `<td><label><input type="radio" name="${c}" value="${k + 1}" required aria-label="${esc(e)}"></label></td>`).join('')}
            </tr>`).join('')}</tbody>
          </table>
          <p class="sus-resultado" data-sus aria-live="polite"></p>
        </section>
        <section class="painel formulario">
          ${PERGUNTAS_ABERTAS.map(([c, t]) => `<label class="campo">${esc(t)} <textarea name="${c}" rows="3"></textarea></label>`).join('')}
          <div class="form-rodape"><span class="nota">Fica salva neste navegador, e um arquivo é baixado para você enviar ao grupo.</span><button type="submit" class="btn btn-pri">Salvar e exportar</button></div>
        </section>
      </form>
      <section class="painel painel-flush" style="margin-top:24px">
        <div class="painel-cab" style="padding:20px 24px 0"><h2>Avaliações salvas</h2></div>
        <div data-lista></div>
      </section>
    </div>`;

  const form = el.querySelector('#form-aval');
  const caixaSUS = el.querySelector('[data-sus]');
  const respostasSUS = () => Object.fromEntries(ITENS_SUS.map(([c]) => [c, Number(new FormData(form).get(c)) || null]));
  function atualizarSUS() {
    const r = respostasSUS();
    const feitas = Object.values(r).filter(Boolean).length;
    const escore = escoreSUS(r);
    caixaSUS.innerHTML = escore === null
      ? `${feitas} de ${ITENS_SUS.length} respondidas`
      : `Escore SUS: <strong>${num(escore)}</strong> <span class="nota">(a referência usual é 68)</span>`;
  }
  form.addEventListener('change', atualizarSUS);
  atualizarSUS();

  const lista = el.querySelector('[data-lista]');
  function desenharLista() {
    const avals = listarAvaliacoes();
    lista.innerHTML = avals.length ? `<table class="tabela"><thead><tr><th>Data</th><th>Nome</th><th>Perfil</th><th class="num">Resultado</th><th></th></tr></thead><tbody>
      ${avals.map(a => `<tr><td>${dataBR(a.data)}</td><td>${esc(a.avaliador || 'sem nome')}</td><td>${esc(a.perfil)}</td>
          <td class="num">${a.protocolo === 'SUS' ? `SUS ${num(a.escoreSUS)}` : `<small>protocolo anterior · ${resumoAntigo(a)}</small>`}</td>
          <td class="acoes-linha"><button type="button" class="link" data-exp="${esc(a.id)}">Exportar</button> <button type="button" class="link perigo" data-del="${esc(a.id)}">Excluir</button></td></tr>`).join('')}</tbody></table>
      <p class="nota" style="padding:12px 24px 20px;margin:0">Envie os arquivos ao grupo pelo canal combinado. A página não transmite nada.</p>`
      : '<p class="nota" style="padding:8px 24px 24px;margin:0">Nenhuma avaliação salva.</p>';
  }

  form.addEventListener('submit', ev => {
    ev.preventDefault();
    const f = new FormData(form);
    const sus = respostasSUS();
    const escore = escoreSUS(sus);
    if (escore === null) { notificar('Responda as dez afirmações do SUS.'); return; }
    const vinculada = listarAplicacoes().find(a => a.id === f.get('aplicacao'));
    const avaliacao = {
      id: novoIdAvaliacao(),
      data: hojeISO(),
      versaoModelo: modelo.versao_modelo,
      protocolo: 'SUS',
      textoSUSProvisorio: SUS_TEXTO_PROVISORIO,
      avaliador: (f.get('avaliador') || '').trim(),
      perfil: f.get('perfil'),
      minutos: f.get('minutos') ? Number(f.get('minutos')) : null,
      sus,
      escoreSUS: escore,
      itensSUS: ITENS_SUS,
      abertas: Object.fromEntries(PERGUNTAS_ABERTAS.map(([c, t]) => [c, { pergunta: t, resposta: (f.get(c) || '').trim() }])),
      diagnosticoReferencia: vinculada ? {
        aplicacao: vinculada.id,
        setor: vinculada.empresa.setor,
        porte: vinculada.empresa.porte,
        versaoModelo: vinculada.diagnostico.versaoModelo,
        escores: vinculada.diagnostico.escores,
        nivelFinal: vinculada.diagnostico.nivelFinal,
        roteiro: vinculada.diagnostico.roteiro.map(r => r.regra),
        metricasUso: vinculada.metricas ?? null,
        minutosPreenchimento: minutosPreenchimento(vinculada),
      } : null,
    };
    salvarAvaliacao(avaliacao);
    exportarAvaliacao(avaliacao);
    form.reset();
    atualizarSUS();
    desenharLista();
    notificar(`Avaliação salva. Escore SUS: ${num(escore)}.`);
  });

  lista.addEventListener('click', ev => {
    const b = ev.target.closest('button');
    if (!b) return;
    if (b.dataset.exp) exportarAvaliacao(listarAvaliacoes().find(a => a.id === b.dataset.exp));
    if (b.dataset.del && confirm('Excluir esta avaliação deste navegador?')) { excluirAvaliacao(b.dataset.del); desenharLista(); }
  });
  desenharLista();
}
