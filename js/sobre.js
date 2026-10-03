// sobre.js — posicionamento do artefato na Design Science Research:
// DSR Canvas (seção 9), decisões arquiteturais (Tabela 6), arquitetura em
// camadas, matriz de rastreabilidade (Tabela 20) e referências.

import { esc, num } from './ui.js';
import { RASTREABILIDADE } from './rastreabilidade.js';
import { validarModelo, esforcoGestor } from './validacao.js';

const DSR_CANVAS = [
  ['Problema de pesquisa', 'Como as Pequenas e Médias Empresas podem avaliar, de forma estruturada, acessível e sistemática, sua prontidão tecnológica, cultural e organizacional antes de investir na adoção de Inteligência Artificial?'],
  ['Classe de problemas', 'Avaliação de prontidão organizacional para adoção tecnológica em organizações de recursos limitados. O artefato é um exemplar desta classe, e não uma solução particular a uma empresa.'],
  ['Artefato', 'MGP-PME (Modelo de Gargalos de Prontidão para Pequenas e Médias Empresas): um modelo de referência com 6 dimensões e uma instanciação executável com 30 itens, 5 níveis de maturidade e 24 regras prescritivas.'],
  ['Tipo de artefato', 'Combinação de modelo e instanciação, de natureza prescritiva. Não explica por que PMEs adotam ou deixam de adotar IA: orienta decisões concretas de investimento.'],
  ['Requisitos', 'Seis requisitos funcionais e cinco não funcionais, fixados na etapa de definição dos objetivos da solução. São critério de aceitação do artefato: a matriz de rastreabilidade liga cada um a um componente ou a uma decisão arquitetural.'],
  ['Base de conhecimento', 'Revisão de mais de trinta artigos publicados entre 2021 e 2026, em seis eixos temáticos; modelos TOE, TAM e UTAUT; Visão Baseada em Recursos e Capacidades Dinâmicas; modelos de maturidade em estágios; e o ciclo metodológico da DSR (Peffers et al., 2007).'],
  ['Procedimentos de projeto', 'Arquitetura em cinco camadas sobre três repositórios de parâmetros, instanciada em uma página web estática. Sete decisões arquiteturais registradas com alternativas e consequências.'],
  ['Demonstração e avaliação', 'Demonstração por casos ilustrativos de PMEs; verificação do núcleo lógico contra casos de teste de fronteira; avaliação de utilidade, clareza e relevância percebida junto a especialistas e gestores; recalibração dos parâmetros a partir das críticas.'],
  ['Contribuições', 'Teórica: operacionalização da distinção entre prontidão e intenção de adoção e do tratamento da capacidade digital básica como pré-requisito, e não como eixo paralelo. Prática: instrumento autoaplicável, de custo nulo, que converte diagnóstico em roteiro de ação priorizado.'],
  ['Limitações e generalização', 'Os pesos e limites de faixa são calibrados sobre evidência da literatura, e não sobre base empírica própria; a generalização proposta é para a classe de problemas, não para setores específicos; o artefato não mede resultado de adoção, apenas condição prévia.'],
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

const REQUISITOS = [
  ['RF01', 'Coleta de dados estruturada'], ['RF02', 'Cálculo de escores por dimensão'], ['RF03', 'Lógica não compensatória (gargalos)'],
  ['RF04', 'Classificação de maturidade'], ['RF05', 'Geração de painel visual'], ['RF06', 'Emissão de roteiro prescritivo'],
  ['RNF01', 'Usabilidade e linguagem'], ['RNF02', 'Autonomia e autossuficiência'], ['RNF03', 'Custo e acessibilidade tecnológica'],
  ['RNF04', 'Eficiência de tempo'], ['RNF05', 'Privacidade e confidencialidade'],
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
    ['CT-02', 'Soma dos pesos igual a um e exatamente três dimensões críticas', !erros.some(e => /pesos|críticas/.test(e))],
    ['CT-03', 'Níveis e faixas contíguos cobrindo 0 a 100', !erros.some(e => /^(Níveis|Faixas)/.test(e))],
    ['CT-04', 'Nível atribuído nunca excede o da dimensão crítica de menor escore', null],
    ['CT-05', 'Ao menos uma regra para cada par dimensão-faixa', !erros.some(e => /regra para/.test(e))],
    ['CT-06', 'Todo RF atendido por componente e exercitado por caso de uso', rt.matriz.filter(m => m.requisito.startsWith('RF')).every(m => m.componentes.length && m.casos_de_uso.length)],
    ['CT-07', `Esforço do gestor entre 20 e 30 minutos (declarado: ${t.min} a ${t.max})`, t.min >= 20 && t.max <= 30],
    ['CT-08', 'Nenhuma resposta deixa o dispositivo do respondente', null],
  ];

  el.innerHTML = `
    <section class="cartao">
      <p class="etapa-rotulo">Pesquisa Aplicada · PUCPR · Grupo G02 · PBL 4</p>
      <h1>Sobre o MGP-PME</h1>
      <p class="lead">Instanciação executável do <strong>Modelo de Gargalos de Prontidão para Pequenas e Médias Empresas</strong>, artefato de uma pesquisa conduzida segundo a <em>Design Science Research</em> (Peffers et al., 2007). Modelo em uso: versão <strong>${esc(modelo.versao_modelo)}</strong>, com ${modelo.dimensoes.length} dimensões, ${modelo.itens.length} itens, ${modelo.niveis.length} níveis, ${modelo.regras_dimensao.length + modelo.regras_transversais.length} regras.</p>
      ${rascunhos ? `<p class="aviso aviso-info">${rascunhos} dos ${modelo.itens.length} itens têm âncoras em status <strong>rascunho</strong>: redigidas a partir dos descritores genéricos da escala e aguardando revisão do grupo. Apenas I01, I06 e I16 têm a ancoragem integral publicada no PBL 4.</p>` : ''}
    </section>

    <section class="cartao">
      <h2>DSR Canvas do projeto</h2>
      <div class="canvas-grade canvas-dsr">${DSR_CANVAS.map(([t, c]) => `<div class="canvas-celula"><h4>${esc(t)}</h4><div class="canvas-conteudo"><p>${esc(c)}</p></div></div>`).join('')}</div>
    </section>

    <section class="cartao">
      <h2>Arquitetura</h2>
      <p>Cinco camadas de processamento em encadeamento estrito sobre três repositórios de parâmetros (R1 banco de itens, R2 tabela de níveis e faixas, R3 base de regras), todos em <code>dados.json</code>. As camadas C2 a C4 são funções puras em <code>nucleo.js</code>, conferidas automaticamente contra casos de teste (etapa V2).</p>
      <table class="tabela"><thead><tr><th>Camada</th><th>Nome</th><th>Módulo</th><th>Componentes</th></tr></thead><tbody>
        ${CAMADAS.map(c => `<tr><td><strong>${c[0]}</strong></td><td>${esc(c[1])}</td><td><code>${esc(c[2])}</code></td><td>${esc(c[3])}</td></tr>`).join('')}
      </tbody></table>
      <h3>Modelo de referência</h3>
      <table class="tabela"><thead><tr><th>Dim.</th><th>Nome</th><th class="num">Peso</th><th>Crítica</th><th class="num">Itens</th><th>Referências</th></tr></thead><tbody>
        ${modelo.dimensoes.map(d => `<tr><td><strong>${esc(d.codigo)}</strong></td><td>${esc(d.nome)}</td><td class="num">${num(d.peso, 2)}</td><td>${d.critica ? 'sim' : 'não'}</td><td class="num">${modelo.itens.filter(i => i.dimensao === d.codigo).length}</td><td><small>${esc(d.referencias || '')}</small></td></tr>`).join('')}
      </tbody></table>
    </section>

    <section class="cartao">
      <h2>Decisões arquiteturais</h2>
      <table class="tabela"><thead><tr><th>Código</th><th>Decisão</th><th>O que foi adotado</th><th>Consequência assumida</th><th>Requisitos</th></tr></thead><tbody>
        ${ADRS.map(a => `<tr><td><strong>${a[0]}</strong></td><td>${esc(a[1])}</td><td>${esc(a[2])}</td><td>${esc(a[3])}</td><td>${esc(a[4])}</td></tr>`).join('')}
      </tbody></table>
    </section>

    <section class="cartao">
      <h2>Matriz de rastreabilidade</h2>
      <table class="tabela"><thead><tr><th>Requisito</th><th>Componentes</th><th>Casos de uso</th><th>Decisões</th></tr></thead><tbody>
        ${rt.matriz.map(m => {
          const titulo = REQUISITOS.find(r => r[0] === m.requisito)?.[1] ?? '';
          return `<tr><td><strong>${esc(m.requisito)}</strong><br><small>${esc(titulo)}</small></td>
            <td>${m.componentes.map(c => `<abbr title="${esc(nomeCP[c])}">${esc(c)}</abbr>`).join(', ') || 'nenhum'}</td>
            <td>${m.casos_de_uso.map(u => `<abbr title="${esc(nomeUC[u])}">${esc(u)}</abbr>`).join(', ') || 'nenhum'}</td>
            <td>${m.decisoes.join(', ') || 'nenhuma'}</td></tr>`;
        }).join('')}
      </tbody></table>
      <h3>Casos de uso e onde estão nesta página</h3>
      <table class="tabela"><thead><tr><th>Código</th><th>Caso de uso</th><th>Ator</th><th>Módulos</th></tr></thead><tbody>
        ${rt.casos_de_uso.map(u => `<tr><td><strong>${esc(u.codigo)}</strong></td><td>${esc(u.nome)}</td><td>${esc(u.ator)}</td><td><code>${u.modulos.map(esc).join(', ')}</code></td></tr>`).join('')}
      </tbody></table>
    </section>

    <section class="cartao">
      <h2>Critérios de aceitação</h2>
      <p class="nota">Verificados sobre o modelo carregado nesta página. CT-04 e CT-08 são verificados pela suíte de testes (<code>node --test</code>) e pela inspeção de rede.</p>
      <table class="tabela"><thead><tr><th>Código</th><th>Critério</th><th>Situação</th></tr></thead><tbody>
        ${criterios.map(c => `<tr><td><strong>${c[0]}</strong></td><td>${esc(c[1])}</td><td>${c[2] === null ? '<span class="selo">testes automatizados</span>' : c[2] ? '<span class="selo selo-ok">atendido</span>' : '<span class="selo selo-critica">não atendido</span>'}</td></tr>`).join('')}
      </tbody></table>
    </section>

    <section class="cartao">
      <h2>Referências centrais</h2>
      <ul class="referencias">
        <li>Peffers, K., Tuunanen, T., Rothenberger, M.A., Chatterjee, S., 2007. A design science research methodology for information systems research. Journal of Management Information Systems 24, 45-77.</li>
        <li>Al Tawara, A., Gide, E., El Khodr, M., 2026a. Development of an AI-business transformation framework for Australian SMEs. ITHET 2026, IEEE.</li>
        <li>Kalleparambil, S.A., Akoum, M., 2025. AI organisational readiness for SMEs: a tailored model for AI adoption success. Journal of Information &amp; Knowledge Management 24.</li>
        <li>Monisha, Kaur, N., Kaur, J., Budhiraja, K., Aggarwal, I., 2026. Integrating agile management practices and organizational culture to enable sustainable AI adoption. CCICT 2026.</li>
        <li>Khan, A.N., Mehmood, K., Soomro, M.A., 2024. Knowledge management-based artificial intelligence (AI) adoption in construction SMEs. IEEE Transactions on Engineering Management 71.</li>
        <li>Sharma, S., Singh, G., Islam, N., Dhir, A., 2024. Why do SMEs adopt artificial intelligence-based chatbots? IEEE Transactions on Engineering Management 71.</li>
      </ul>
      <p class="nota">A lista completa está no documento de arquitetura (PBL 4, seção 11).</p>
    </section>`;
}
