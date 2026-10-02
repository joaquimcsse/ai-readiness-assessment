// avaliacao.js — UC-13 Avaliar utilidade e clareza do artefato (ator:
// Especialista avaliador; etapa V3 da validação empírica). Inclui a geração
// de um diagnóstico (UC-05) quando o avaliador vincula uma aplicação. O
// protocolo respondido é exportado em arquivo — nada é enviado (ADR-03).

import { esc, dataBR, notificar } from './ui.js';
import { salvarAvaliacao, listarAvaliacoes, excluirAvaliacao, exportarAvaliacao, novoIdAvaliacao, listarAplicacoes, hojeISO } from './estado.js';

const ESCALA = ['Discordo totalmente', 'Discordo', 'Neutro', 'Concordo', 'Concordo totalmente'];

export const QUESTOES = [
  { codigo: 'Q01', criterio: 'Utilidade', texto: 'O diagnóstico ajuda a decidir se e quando investir em IA.' },
  { codigo: 'Q02', criterio: 'Utilidade', texto: 'O roteiro de ação indica próximos passos que a empresa consegue executar.' },
  { codigo: 'Q03', criterio: 'Utilidade', texto: 'O teto de gargalo torna o resultado mais realista do que uma média simples.' },
  { codigo: 'Q04', criterio: 'Clareza', texto: 'As afirmações e as âncoras usam linguagem de gestão, sem jargão técnico (RNF01).' },
  { codigo: 'Q05', criterio: 'Clareza', texto: 'As cinco descrições de cada item permitem escolher sem ambiguidade.' },
  { codigo: 'Q06', criterio: 'Clareza', texto: 'O relatório explica por que o nível atribuído é o que é.' },
  { codigo: 'Q07', criterio: 'Relevância', texto: 'As seis dimensões cobrem o que importa para a prontidão de uma PME.' },
  { codigo: 'Q08', criterio: 'Relevância', texto: 'As recomendações são pertinentes ao perfil diagnosticado.' },
  { codigo: 'Q09', criterio: 'Autonomia', texto: 'Um gestor consegue aplicar o instrumento sozinho, apenas com o guia embutido (RNF02).' },
  { codigo: 'Q10', criterio: 'Eficiência', texto: 'A aplicação completa cabe em 20 a 30 minutos (RNF04).' },
];

export function renderAvaliacao(el, { modelo }) {
  const aplicacoes = listarAplicacoes().filter(a => a.diagnostico);
  el.innerHTML = `
    <section class="cartao estreito">
      <p class="etapa-rotulo">Pacote P3 · Especialista avaliador · etapa V3</p>
      <h1>Protocolo de avaliação do artefato</h1>
      <p class="lead">Julgue a utilidade, a clareza e a relevância do MGP-PME. Recomenda-se aplicar o instrumento (ou carregar o caso de demonstração) antes de responder, e vincular abaixo o diagnóstico que serviu de base.</p>
      <form id="form-aval" class="formulario">
        <div class="linha-2">
          <label>Nome do avaliador <input name="avaliador" required maxlength="120"></label>
          <label>Perfil
            <select name="perfil" required>
              <option value="">Selecione…</option>
              <option>Especialista acadêmico</option>
              <option>Consultor ou profissional de TI</option>
              <option>Gestor de PME</option>
              <option>Outro</option>
            </select>
          </label>
        </div>
        <div class="linha-2">
          <label>Diagnóstico de referência
            <select name="aplicacao">
              <option value="">Nenhum</option>
              ${aplicacoes.map(a => `<option value="${esc(a.id)}">${esc(a.empresa.identificador)}, ${dataBR(a.data)} (nível ${a.diagnostico.nivelFinal})</option>`).join('')}
            </select>
          </label>
          <label>Tempo gasto na aplicação (minutos) <input name="minutos" type="number" min="0" step="1" inputmode="numeric"></label>
        </div>
        <fieldset class="likert">
          <legend>Indique sua concordância</legend>
          <div class="likert-cab" aria-hidden="true"><span></span>${ESCALA.map((e, k) => `<span>${k + 1}<small>${esc(e)}</small></span>`).join('')}</div>
          ${QUESTOES.map(q => `<div class="likert-linha" role="radiogroup" aria-label="${esc(q.texto)}">
            <span class="likert-txt"><small>${esc(q.criterio)}</small>${esc(q.texto)}</span>
            ${ESCALA.map((e, k) => `<label class="likert-op"><input type="radio" name="${q.codigo}" value="${k + 1}" required aria-label="${esc(e)}"><span>${k + 1}</span></label>`).join('')}
          </div>`).join('')}
        </fieldset>
        <label>Críticas e sugestões sobre o instrumento (itens, âncoras, dimensões)
          <textarea name="critica_instrumento" rows="3"></textarea></label>
        <label>Críticas e sugestões sobre as recomendações (roteiro, regras)
          <textarea name="critica_recomendacoes" rows="3"></textarea></label>
        <label>Outros comentários <textarea name="comentarios" rows="2"></textarea></label>
        <div class="acoes"><button type="submit" class="btn btn-pri">Salvar e exportar avaliação</button></div>
      </form>
    </section>
    <section class="cartao estreito">
      <h2>Avaliações registradas neste navegador</h2>
      <div data-lista></div>
    </section>`;

  const lista = el.querySelector('[data-lista]');
  function desenharLista() {
    const avals = listarAvaliacoes();
    lista.innerHTML = avals.length ? `<table class="tabela"><thead><tr><th>Data</th><th>Avaliador</th><th>Perfil</th><th class="num">Média</th><th></th></tr></thead><tbody>
      ${avals.map(a => {
        const notas = QUESTOES.map(q => a.respostas[q.codigo]).filter(Boolean);
        const media = notas.reduce((s, v) => s + v, 0) / (notas.length || 1);
        return `<tr><td>${dataBR(a.data)}</td><td>${esc(a.avaliador)}</td><td>${esc(a.perfil)}</td><td class="num">${media.toFixed(1).replace('.', ',')}</td>
          <td class="acoes-linha"><button type="button" class="link" data-exp="${esc(a.id)}">exportar</button> <button type="button" class="link perigo" data-del="${esc(a.id)}">excluir</button></td></tr>`;
      }).join('')}</tbody></table>
      <p class="nota">Envie os arquivos exportados ao grupo de pesquisa pelo canal combinado. O MGP-PME não transmite dados.</p>`
      : '<p class="nota">Nenhuma avaliação registrada.</p>';
  }

  el.querySelector('#form-aval').addEventListener('submit', ev => {
    ev.preventDefault();
    const f = new FormData(ev.target);
    const vinculada = listarAplicacoes().find(a => a.id === f.get('aplicacao'));
    const avaliacao = {
      id: novoIdAvaliacao(),
      data: hojeISO(),
      versaoModelo: modelo.versao_modelo,
      avaliador: f.get('avaliador').trim(),
      perfil: f.get('perfil'),
      minutos: f.get('minutos') ? Number(f.get('minutos')) : null,
      respostas: Object.fromEntries(QUESTOES.map(q => [q.codigo, Number(f.get(q.codigo))])),
      questoes: QUESTOES,
      critica_instrumento: f.get('critica_instrumento').trim(),
      critica_recomendacoes: f.get('critica_recomendacoes').trim(),
      comentarios: f.get('comentarios').trim(),
      diagnosticoReferencia: vinculada ? {
        aplicacao: vinculada.id,
        setor: vinculada.empresa.setor,
        porte: vinculada.empresa.porte,
        versaoModelo: vinculada.diagnostico.versaoModelo,
        escores: vinculada.diagnostico.escores,
        nivelFinal: vinculada.diagnostico.nivelFinal,
        roteiro: vinculada.diagnostico.roteiro.map(r => r.regra),
      } : null,
    };
    salvarAvaliacao(avaliacao);
    exportarAvaliacao(avaliacao);
    ev.target.reset();
    desenharLista();
    notificar('Avaliação salva e exportada.');
  });

  lista.addEventListener('click', ev => {
    const b = ev.target.closest('button');
    if (!b) return;
    if (b.dataset.exp) exportarAvaliacao(listarAvaliacoes().find(a => a.id === b.dataset.exp));
    if (b.dataset.del && confirm('Excluir esta avaliação deste navegador?')) { excluirAvaliacao(b.dataset.del); desenharLista(); }
  });
  desenharLista();
}
