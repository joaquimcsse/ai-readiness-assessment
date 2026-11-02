// sobre.js — o artefato na Design Science Research: título e autores do
// artigo, DSR Canvas, objetivos e requisitos, avaliação (evidências, vereditos,
// limitações), arquitetura em camadas, decisões arquiteturais, rastreabilidade
// e referências. O conteúdo de pesquisa vem de pesquisa.js.

import { esc, num, citar, referenciaCompleta, icone } from './ui.js';
import { RASTREABILIDADE } from './rastreabilidade.js';
import { validarModelo, esforcoGestor } from './validacao.js';
import { ARTIGO, REVISAO, OBJETIVOS, REQUISITOS, EVIDENCIAS, PARCIAIS, VEREDITOS, LIMITACOES, REFERENCIAS_METODO, veredito } from './pesquisa.js';

const DSR_CANVAS = [
  ['Problema de pesquisa', ARTIGO.problema],
  ['Classe de problemas', 'Avaliar a prontidão para adotar tecnologia em organizações com poucos recursos. O MGP-PME é uma instância dessa classe, feita para qualquer PME.'],
  ['Artefato', 'MGP-PME (Modelo de Gargalos de Prontidão para PMEs): um modelo de referência com seis dimensões e uma página web que aplica 30 assertivas, classifica a empresa em cinco níveis e monta um roteiro a partir de 24 regras.'],
  ['Tipo de artefato', 'Modelo e instanciação, de natureza prescritiva: orienta a decisão de investir em IA. Na tipologia de Gregor e Hevner (2013), é uma melhoria, ou seja, uma solução nova para um problema conhecido.'],
  ['Requisitos', 'Seis funcionais (RF01 a RF06) e cinco não funcionais (RNF01 a RNF05), fixados junto com os objetivos. Servem de critério de aceitação, e a matriz de rastreabilidade liga cada um a componentes e decisões.'],
  ['Base de conhecimento', `${REVISAO.artigos} artigos lidos na íntegra, publicados de ${REVISAO.periodo}, ${REVISAO.base}, em seis eixos temáticos. Entram também os modelos TOE, TAM e UTAUT, a Visão Baseada em Recursos e as Capacidades Dinâmicas, os modelos de maturidade em estágios e a lógica de condições necessárias (Dul, 2016).`],
  ['Procedimentos de projeto', 'Ciclo da DSR de Peffers et al. (2007). Cinco camadas de processamento sobre três repositórios de parâmetros, numa página web estática, com sete decisões de arquitetura registradas.'],
  ['Demonstração e avaliação', 'Demonstração com o caso ilustrativo da Metalmecânica Aurora. Avaliação no quadro FEDS (Venable et al., 2016), com testes automatizados, medições, simulação sintética, duas entrevistas com gestores de PMEs e um survey com o questionário SUS.'],
  ['Contribuições', 'Leva a lógica não compensatória para um instrumento prescritivo que a própria PME aplica. Como as dimensões críticas limitam o nível, um ponto forte não esconde um gargalo. O modelo conceitual de Kalleparambil e Akoum (2025) segue sem instanciação; o MGP-PME tem uma implementação em uso.'],
  ['Limitações e generalização', 'Os pesos e as dimensões críticas ainda dependem de calibração empírica, e os resultados não permitem generalizar a utilidade do diagnóstico. A lista completa está na seção Avaliação.'],
];

const ADRS = [
  ['ADR-01', 'Agregação não compensatória com teto de gargalo', 'O nível global é o mínimo entre o nível do escore ponderado e o menor nível entre as dimensões críticas.', 'O artefato pode atribuir nível inferior ao que a média sugere, o que exige explicar o teto no relatório.', 'RF03, RF04'],
  ['ADR-02', 'Página web estática como única instanciação', 'As cinco âncoras de cada item aparecem como as próprias opções de resposta, o respondente não tem como corromper as fórmulas, e o cálculo fica auditável em um único lugar.', 'A aplicação depende do navegador e do seu armazenamento local, o que torna a exportação do diagnóstico parte obrigatória do fluxo.', 'RNF03, RF02, RF03'],
  ['ADR-03', 'Execução integralmente local, sem servidor e sem transmissão de dados', 'Nenhum dado de resposta deixa o dispositivo do respondente; a página é estática e usa apenas armazenamento local.', 'A pesquisa perde a coleta automática de dados de aplicação: a validação empírica depende de envio voluntário do diagnóstico.', 'RNF03, RNF05'],
  ['ADR-04', 'Parâmetros do modelo externalizados em repositórios', 'R1 (banco de itens), R2 (níveis e faixas) e R3 (base de regras) são dados de entrada das camadas, não lógica.', 'Exige disciplina de versionamento: dois diagnósticos só são comparáveis se produzidos sob a mesma versão do modelo.', 'RF01, RF06'],
  ['ADR-05', 'D0 pontuada como dimensão crítica, e não como filtro binário de entrada', 'D0 recebe escore, entra na média ponderada e opera como gargalo; a empresa não apta recebe diagnóstico e roteiro em vez de recusa.', 'A distinção entre ser digitalmente capaz e estar pronto para a IA passa a depender da leitura do perfil.', 'RF03, RNF01'],
  ['ADR-06', 'Âncoras comportamentais por item, em vez de escala de concordância', 'Cada um dos 30 itens tem cinco âncoras que descrevem práticas observáveis.', 'O banco de itens fica maior e mais caro de calibrar.', 'RF01, RNF01'],
  ['ADR-07', 'Base de regras determinística, e não recomendação por modelo estatístico', 'Toda recomendação decorre de uma regra explícita, rastreável até a faixa que a disparou.', 'As recomendações não se adaptam a particularidades setoriais além das previstas nas regras transversais.', 'RF06, RNF02'],
];

const CAMADAS = [
  ['C1', 'Coleta', 'coleta.js', 'CP-01, CP-02, CP-03, CP-14'],
  ['C2', 'Normalização e escore', 'nucleo.js', 'CP-04, CP-05, CP-06'],
  ['C3', 'Classificação não compensatória', 'nucleo.js', 'CP-07, CP-08'],
  ['C4', 'Inferência prescritiva', 'nucleo.js', 'CP-09, CP-10'],
  ['C5', 'Apresentação e diagnóstico', 'painel.js, estado.js', 'CP-11, CP-12, CP-13'],
];

export function renderSobre(el, { modelo }) {
  const erros = validarModelo(modelo);
  const t = esforcoGestor(modelo);
  const rt = RASTREABILIDADE;
  const nomeCP = Object.fromEntries(rt.componentes.map(c => [c.codigo, c.nome]));
  const nomeUC = Object.fromEntries(rt.casos_de_uso.map(u => [u.codigo, u.nome]));
  const rascunhos = modelo.itens.filter(i => i.ancoras_status === 'rascunho').length;
  const criterios = [
    ['CT-01', 'Trinta itens nas seis dimensões, cada um com cinco âncoras', modelo.itens.length === 30 && modelo.itens.every(i => i.ancoras.length === 5)],
    ['CT-02', 'Soma dos pesos igual a um e exatamente três dimensões críticas', !erros.some(e => /pesos|crític/.test(e))],
    ['CT-03', 'Níveis e faixas contíguos, cobrindo de 0 a 100', !erros.some(e => /^(Níveis|Faixas)/.test(e))],
    ['CT-04', 'O nível atribuído nunca passa do nível da dimensão crítica de menor escore', null],
    ['CT-05', 'Ao menos uma regra para cada par dimensão-faixa', !erros.some(e => /regra para/.test(e))],
    ['CT-06', 'Todo RF atendido por um componente e exercitado por um caso de uso', rt.matriz.filter(m => m.requisito.startsWith('RF')).every(m => m.componentes.length && m.casos_de_uso.length)],
    ['CT-07', `Esforço do gestor entre 20 e 30 minutos (declarado: ${t.min} a ${t.max})`, t.min >= 20 && t.max <= 30],
    ['CT-08', 'Nenhuma resposta sai do dispositivo do respondente', null],
  ];

  const secoes = [
    ['dsr', 'DSR Canvas'], ['objetivos', 'Objetivos e requisitos'], ['avaliacao', 'Avaliação'], ['arquitetura', 'Arquitetura'],
    ['decisoes', 'Decisões'], ['rastreabilidade', 'Rastreabilidade'], ['referencias', 'Referências'],
  ];
  const agora = v => (v === null ? `<span class="estado-ct teste">${icone('info')} pela suíte de testes</span>`
    : v ? `<span class="estado-ct ok">${icone('check')} confere</span>` : `<span class="estado-ct falha">${icone('alerta')} não confere</span>`);
  const pilula = v => `<span class="pilula ${v === 'Parcial' ? 'pilula-parcial' : 'pilula-atendido'}">${v}</span>`;
  const linhaAvaliada = (codigo, texto) => {
    const p = PARCIAIS[codigo];
    return `<tr><td><strong>${esc(codigo)}</strong></td><td>${esc(texto)}</td><td>${pilula(veredito(codigo))}</td>
      <td>${p ? `<small><b>Lacuna:</b> ${esc(p.lacuna)}<br><b>Depois:</b> ${esc(p.depois)}</small>` : ''}</td></tr>`;
  };
  const total = VEREDITOS.reduce((s, v) => ({ total: s.total + v.total, atendidos: s.atendidos + v.atendidos, parciais: s.parciais + v.parciais, naoAtendidos: s.naoAtendidos + v.naoAtendidos }), { total: 0, atendidos: 0, parciais: 0, naoAtendidos: 0 });
  const metodo = [...REFERENCIAS_METODO].map(r => ({ ...r, ano: String(r.ano) }));
  const todas = [...(modelo.referencias || []), ...metodo].sort((a, b) => a.autores.localeCompare(b.autores, 'pt-BR'));

  el.innerHTML = `
    <header class="pagina-cab">
      <div>
        <span class="rotulo">Pesquisa · Design Science Research</span>
        <h1>Sobre o MGP-PME</h1>
        <p class="sub">${esc(ARTIGO.titulo)}.</p>
        <p class="meta">${ARTIGO.autores.map(esc).join(' · ')}</p>
        <p class="meta">Modelo ${esc(modelo.versao_modelo)}: ${modelo.dimensoes.length} dimensões, ${modelo.itens.length} itens, ${modelo.niveis.length} níveis e ${modelo.regras_dimensao.length + modelo.regras_transversais.length} regras. Na tela do gestor, as dimensões aparecem como critérios.</p>
      </div>
    </header>
    ${rascunhos ? `<p class="aviso aviso-info">${icone('info')}<span>${rascunhos} dos ${modelo.itens.length} itens têm âncoras em <strong>rascunho</strong>, à espera de validação por especialistas. Só I01, I06 e I16 têm a ancoragem completa publicada.</span></p>` : ''}
    <div class="layout-lateral">
      <nav class="nav-lateral" aria-label="Seções desta página">
        <span class="nav-lateral-titulo">Ir para</span>
        ${secoes.map(([id, rotulo], k) => `<button type="button" data-secao="${id}" ${k === 0 ? 'aria-current="true"' : ''}>${rotulo}</button>`).join('')}
      </nav>
      <div>
        <section class="painel secao-ancora" id="sec-dsr">
          <div class="painel-cab"><h2>DSR Canvas</h2></div>
          <dl class="dsr-grade">${DSR_CANVAS.map(([t, c]) => `<div><dt>${esc(t)}</dt><dd>${esc(c)}</dd></div>`).join('')}</dl>
        </section>

        <section class="painel secao-ancora" id="sec-objetivos">
          <div class="painel-cab"><h2>Objetivos e requisitos</h2></div>
          <p>${esc(ARTIGO.objetivoGeral)}</p>
          <div class="tabela-rolagem"><table class="tabela"><thead><tr><th>Código</th><th>Objetivo específico</th></tr></thead><tbody>
            ${OBJETIVOS.map(([c, t]) => `<tr><td><strong>${c}</strong></td><td>${esc(t)}</td></tr>`).join('')}
          </tbody></table></div>
          <div class="tabela-rolagem" style="margin-top:20px"><table class="tabela"><thead><tr><th>Código</th><th>Requisito</th></tr></thead><tbody>
            ${REQUISITOS.map(([c, t]) => `<tr><td><strong>${c}</strong></td><td>${esc(t)}</td></tr>`).join('')}
          </tbody></table></div>
        </section>

        <section class="painel secao-ancora" id="sec-avaliacao">
          <div class="painel-cab"><h2>Avaliação</h2><p>Quadro FEDS (Venable et al., 2016)</p></div>
          <p>A avaliação combinou estratégias artificiais (testes, medições e simulação) com estratégias naturalísticas (entrevistas e survey).</p>
          <h3>Evidências coletadas</h3>
          <div class="tabela-rolagem"><table class="tabela"><thead><tr><th>Código</th><th>Evidência</th><th>O que mediu</th></tr></thead><tbody>
            ${EVIDENCIAS.map(([c, e, m]) => `<tr><td><strong>${c}</strong></td><td>${esc(e)}</td><td>${esc(m)}</td></tr>`).join('')}
          </tbody></table></div>
          <h3 style="margin-top:24px">Vereditos</h3>
          <div class="tabela-rolagem"><table class="tabela"><thead><tr><th>Grupo</th><th class="num">Total</th><th class="num">Atendidos</th><th class="num">Parciais</th><th class="num">Não atendidos</th></tr></thead><tbody>
            ${VEREDITOS.map(v => `<tr><td>${esc(v.grupo)}</td><td class="num">${v.total}</td><td class="num">${v.atendidos}</td><td class="num">${v.parciais}</td><td class="num">${v.naoAtendidos}</td></tr>`).join('')}
            <tr class="total"><td>Total</td><td class="num">${total.total}</td><td class="num">${total.atendidos}</td><td class="num">${total.parciais}</td><td class="num">${total.naoAtendidos}</td></tr>
          </tbody></table></div>
          <p class="nota">Os vereditos são os do artigo, sobre as versões avaliadas. A linha "Depois" diz o que a página mudou em seguida; essas mudanças ainda não foram reavaliadas.</p>
          <div class="tabela-rolagem"><table class="tabela"><thead><tr><th>Código</th><th>Critério</th><th>Veredito</th><th>Observação</th></tr></thead><tbody>
            ${OBJETIVOS.map(([c, t]) => linhaAvaliada(c, t)).join('')}
            ${REQUISITOS.map(([c, t]) => linhaAvaliada(c, t)).join('')}
            ${criterios.map(([c, t, v]) => `<tr><td><strong>${c}</strong></td><td>${esc(t)}</td><td>${pilula('Atendido')}</td><td><small>No modelo carregado agora: ${agora(v)}</small></td></tr>`).join('')}
          </tbody></table></div>
          <h3 style="margin-top:24px">Limitações</h3>
          <ul class="lista-simples">${LIMITACOES.map(l => `<li>${esc(l)}</li>`).join('')}</ul>
        </section>

        <section class="painel secao-ancora" id="sec-arquitetura">
          <div class="painel-cab"><h2>Arquitetura</h2><p>Cinco camadas sobre três repositórios (R1 itens, R2 níveis e faixas, R3 regras) em <code>dados.json</code></p></div>
          <div class="tabela-rolagem"><table class="tabela"><thead><tr><th>Camada</th><th>Nome</th><th>Módulo</th><th>Componentes</th></tr></thead><tbody>
            ${CAMADAS.map(c => `<tr><td><strong>${c[0]}</strong></td><td>${esc(c[1])}</td><td><code>${esc(c[2])}</code></td><td>${esc(c[3])}</td></tr>`).join('')}
          </tbody></table></div>
          <h3 style="margin-top:24px">Modelo de referência</h3>
          <div class="tabela-rolagem"><table class="tabela"><thead><tr><th>Dim.</th><th>Nome</th><th class="num">Peso</th><th>Crítico</th><th class="num">Itens</th><th>Referências</th></tr></thead><tbody>
            ${modelo.dimensoes.map(d => `<tr><td><strong>${esc(d.codigo)}</strong></td><td>${esc(d.nome)}</td><td class="num">${num(d.peso, 2)}</td><td>${d.critica ? 'sim' : 'não'}</td><td class="num">${modelo.itens.filter(i => i.dimensao === d.codigo).length}</td><td><small>${esc(citar(modelo, d.referencias))}</small></td></tr>`).join('')}
          </tbody></table></div>
        </section>

        <section class="painel secao-ancora" id="sec-decisoes">
          <div class="painel-cab"><h2>Decisões arquiteturais</h2><p>${ADRS.length} decisões · clique para ver</p></div>
          ${ADRS.map(a => `<details class="adr"><summary><code>${a[0]}</code><span>${esc(a[1])}</span><small>${esc(a[4])}</small></summary>
            <dl><dt>O que foi adotado</dt><dd>${esc(a[2])}</dd><dt>Consequência assumida</dt><dd>${esc(a[3])}</dd></dl></details>`).join('')}
        </section>

        <section class="painel secao-ancora" id="sec-rastreabilidade">
          <div class="painel-cab"><h2>Matriz de rastreabilidade</h2></div>
          <div class="tabela-rolagem"><table class="tabela"><thead><tr><th>Requisito</th><th>Componentes</th><th>Casos de uso</th><th>Decisões</th></tr></thead><tbody>
            ${rt.matriz.map(m => {
              const titulo = REQUISITOS.find(r => r[0] === m.requisito)?.[1] ?? '';
              return `<tr><td><strong>${esc(m.requisito)}</strong><br><small>${esc(titulo)}</small></td>
                <td>${m.componentes.map(c => `<abbr title="${esc(nomeCP[c])}">${esc(c)}</abbr>`).join(', ') || 'nenhum'}</td>
                <td>${m.casos_de_uso.map(u => `<abbr title="${esc(nomeUC[u])}">${esc(u)}</abbr>`).join(', ') || 'nenhum'}</td>
                <td>${m.decisoes.join(', ') || 'nenhuma'}</td></tr>`;
            }).join('')}
          </tbody></table></div>
          <h3 style="margin-top:24px">Casos de uso nesta página</h3>
          <div class="tabela-rolagem"><table class="tabela"><thead><tr><th>Código</th><th>Caso de uso</th><th>Ator</th><th>Módulos</th></tr></thead><tbody>
            ${rt.casos_de_uso.map(u => `<tr><td><strong>${esc(u.codigo)}</strong></td><td>${esc(u.nome)}</td><td>${esc(u.ator)}</td><td><code>${u.modulos.map(esc).join(', ')}</code></td></tr>`).join('')}
          </tbody></table></div>
        </section>

        <section class="painel secao-ancora" id="sec-referencias">
          <div class="painel-cab"><h2>Referências</h2><p>Obras citadas pelo modelo e pelo método</p></div>
          <ol class="referencias">
            ${todas.map(r => `<li>${referenciaCompleta(r)}</li>`).join('')}
          </ol>
        </section>
      </div>
    </div>`;

  // a página usa o hash para rotas, então a navegação interna rola sem mudar o endereço
  el.querySelector('.nav-lateral').addEventListener('click', ev => {
    const b = ev.target.closest('[data-secao]');
    if (!b) return;
    el.querySelectorAll('[data-secao]').forEach(x => (x === b ? x.setAttribute('aria-current', 'true') : x.removeAttribute('aria-current')));
    el.querySelector(`#sec-${b.dataset.secao}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });
}
