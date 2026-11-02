// pesquisa.js — o que a pesquisa diz sobre o artefato, como dado: título do
// artigo, autores, método, revisão de literatura, objetivos, requisitos e a
// avaliação (evidências e vereditos). As telas Sobre e Início leem daqui, para
// que o texto da página acompanhe o artigo num só lugar.
// Fonte: artigo do grupo G02 "Prontidão organizacional para a adoção de
// Inteligência Artificial em Pequenas e Médias Empresas" (versão preliminar),
// seções 2, 5, 6.1, 8 e 9.4 e tabelas 1, 6, 7 e 8.

export const ARTIGO = {
  titulo: 'Prontidão organizacional para a adoção de Inteligência Artificial em Pequenas e Médias Empresas: projeto, demonstração e avaliação de um artefato de autoavaliação não compensatório',
  autores: ['Renan da Silva Oliveira Andrade', 'Guilherme Arcanjo de Morais', 'Joaquim dos Anjos Faraco', 'Renan Americo Herculano', 'Lucas da Costa Paula'],
  problema: 'Como as Pequenas e Médias Empresas (PMEs) podem avaliar, de forma estruturada, acessível e sistemática, a sua prontidão tecnológica, cultural e organizacional antes de investir na adoção de Inteligência Artificial?',
  objetivoGeral: 'Conceber, desenvolver e avaliar um artefato prescritivo (um instrumento estruturado de autoavaliação) que permita a PMEs diagnosticar, de forma acessível, sistemática e autônoma, sua prontidão tecnológica, organizacional e cultural para a adoção de IA, gerando um escore de maturidade e recomendações de próximos passos.',
};

// Seção 2: corpus da revisão.
export const REVISAO = {
  artigos: 35,
  periodo: '2021 a 2026',
  base: 'majoritariamente IEEE Xplore',
  eixos: [
    'Modelos teóricos de aceitação e prontidão tecnológica',
    'Fatores tecnológicos',
    'Fatores organizacionais e humanos',
    'Fatores ambientais',
    'Prontidão e intenção de adoção como construtos distintos',
    'Evidências empíricas setoriais e artefatos correlatos',
  ],
};

// Seção 5.2.
export const OBJETIVOS = [
  ['OE1', 'Estruturar as dimensões de avaliação da prontidão (tecnológicas, organizacionais, humanas, ambientais e éticas), com pesos e indicação das dimensões críticas, a partir da literatura.'],
  ['OE2', 'Desenvolver um instrumento de coleta com cerca de 30 assertivas em escala ordinal de cinco pontos e âncoras comportamentais, em linguagem de negócios, aplicável em 20 a 30 minutos.'],
  ['OE3', 'Estabelecer uma pontuação não compensatória e a classificação em cinco níveis de maturidade, em que as dimensões críticas limitam o nível global.'],
  ['OE4', 'Construir uma base de regras que converta perfis de prontidão em ações priorizadas por esforço e horizonte de execução.'],
  ['OE5', 'Gerar um diagnóstico e um roteiro priorizado para cada organização avaliada.'],
  ['OE6', 'Implementar o artefato como ferramenta de custo nulo, com execução local e painéis gerados automaticamente.'],
  ['OE7', 'Validar o artefato com casos ilustrativos e avaliação com especialistas e gestores de PMEs, verificando utilidade, clareza e contribuição para decisões sobre investimento em IA.'],
];

// Tabela 1.
export const REQUISITOS = [
  ['RF01', 'Coleta estruturada: cerca de 30 assertivas em seis dimensões, em escala ordinal de 5 pontos com âncoras comportamentais'],
  ['RF02', 'Escore normalizado de 0 a 100 para cada dimensão'],
  ['RF03', 'Lógica não compensatória: o nível global é limitado pelas dimensões críticas'],
  ['RF04', 'Classificação em cinco níveis de maturidade'],
  ['RF05', 'Painel visual que evidencie as dimensões em situação de gargalo'],
  ['RF06', 'Roteiro prescritivo priorizado por prazo, a partir de uma base de regras'],
  ['RNF01', 'Linguagem de negócios, acessível a gestores sem formação técnica'],
  ['RNF02', 'Autoaplicável, sem consultoria externa'],
  ['RNF03', 'Custo nulo, sobre plataforma ubíqua e sem servidor dedicado'],
  ['RNF04', 'Aplicação completa em cerca de 20 a 30 minutos'],
  ['RNF05', 'Privacidade: nenhum dado é transmitido a terceiros'],
];

// Tabela 6.
export const EVIDENCIAS = [
  ['E1', 'Suíte de testes automatizados (node --test)', 'Núcleo de cálculo, contrato de dados e critérios de aceitação'],
  ['E2', 'Medições do modelo e da página', 'Dimensões, itens, tamanho, chamadas de rede e códigos visíveis na tela'],
  ['E3a', 'Entrevista com gestora de PME (ciclo 1)', 'Visual, navegação, tempo percebido, incômodos e sugestões'],
  ['E3b', 'Entrevista com gestor de PME (ciclo 2)', 'SUS e perguntas abertas PA1 a PA3'],
  ['E4', 'Simulação sintética sobre o núcleo', 'Ablação, sensibilidade, personas, cobertura, propriedades e trajetórias'],
  ['E5', 'Survey com público geral', 'SUS e perguntas abertas PA1 a PA3'],
];

// Tabela 8: os critérios avaliados como parciais, com a lacuna apontada no
// artigo. "depois" registra o que a página mudou em seguida (README, versões
// 1.1.0 e 1.4.0); não é um novo veredito.
export const PARCIAIS = {
  OE2: { lacuna: '27 dos 30 itens com âncoras em rascunho; texto em excesso.', depois: 'Uma afirmação por tela e textos mais curtos. As âncoras continuam em rascunho.' },
  OE5: { lacuna: 'Fluxo após o preenchimento pouco fluido.', depois: 'Tela de revisão no fim do questionário, com um único botão para o diagnóstico.' },
  OE7: { lacuna: 'Duas avaliações com gestores, sem painel de especialistas.', depois: 'Sem mudança: depende de novas avaliações.' },
  RF06: { lacuna: 'Caminho até o roteiro pouco intuitivo.', depois: 'Os três primeiros passos aparecem no topo do diagnóstico, com atalho para o roteiro completo.' },
  RNF01: { lacuna: 'Código de regras aparece no roteiro.', depois: 'Os códigos de regra saíram da tela do gestor e ficam só no arquivo exportado.' },
  RNF02: { lacuna: 'Guia embutido na página, mas sem medição de autonomia.', depois: 'A página registra quantas vezes o guia foi aberto, e o arquivo exportado leva esse número.' },
  RNF04: { lacuna: 'Estimativa sem cronometragem.', depois: 'A página registra o início e o fim do preenchimento, e o arquivo exportado leva os dois.' },
};

// Tabela 7.
export const VEREDITOS = [
  { grupo: 'Objetivos específicos (OE)', total: 7, atendidos: 4, parciais: 3, naoAtendidos: 0 },
  { grupo: 'Requisitos (RF e RNF)', total: 11, atendidos: 7, parciais: 4, naoAtendidos: 0 },
  { grupo: 'Critérios de aceitação (CT)', total: 8, atendidos: 8, parciais: 0, naoAtendidos: 0 },
];

export const veredito = codigo => (PARCIAIS[codigo] ? 'Parcial' : 'Atendido');

// Seção 9.4.
export const LIMITACOES = [
  'A avaliação com usuários se restringiu a duas entrevistas com gestores de Curitiba, e o survey alcançou sobretudo o público acadêmico.',
  'Pesos e dimensões críticas são parâmetros iniciais tirados da literatura, ainda sem calibração empírica.',
  '27 dos 30 itens têm âncoras em rascunho, e o tempo de aplicação não foi cronometrado.',
  'O escore por dimensão é a média de itens ordinais, o que supõe intervalos iguais entre os pontos da escala.',
  'Como autoavaliação, o instrumento está sujeito a vieses de autorrelato. A confiabilidade e a validade de construto não foram estimadas.',
  'A revisão não seguiu protocolo sistemático e se concentrou no IEEE Xplore.',
  'O caso Aurora é fictício: ilustra o mecanismo, não a realidade de uma empresa.',
  'O roteiro vem de um conjunto fixo de regras, o que limita a personalização.',
];

// Perguntas abertas aplicadas com o SUS (seção 8.2.3).
export const PERGUNTAS_ABERTAS = [
  ['PA1', 'Este produto atingiu o objetivo proposto?'],
  ['PA2', 'Você sente que este produto vai ajudar você e sua empresa em um processo de transição tecnológica?'],
  ['PA3', 'O que você mudaria no sistema?'],
];

// Referências de método citadas no artigo e fora do dados.json (que guarda só
// as obras citadas pelo modelo). Brooke (1996) não tem DOI.
export const REFERENCIAS_METODO = [
  { autores: 'Bangor, A., Kortum, P.T., Miller, J.T.', ano: 2008, titulo: 'An empirical evaluation of the system usability scale.', veiculo: 'International Journal of Human-Computer Interaction 24, 574-594', doi: '10.1080/10447310802205776' },
  { autores: 'Brooke, J.', ano: 1996, titulo: 'SUS: a "quick and dirty" usability scale.', veiculo: 'Usability Evaluation in Industry, Taylor & Francis, Londres, 189-194', doi: '' },
  { autores: 'Dul, J.', ano: 2016, titulo: 'Necessary condition analysis (NCA): logic and methodology of "necessary but not sufficient" causality.', veiculo: 'Organizational Research Methods 19, 10-52', doi: '10.1177/1094428115584005' },
  { autores: 'Gregor, S., Hevner, A.R.', ano: 2013, titulo: 'Positioning and presenting design science research for maximum impact.', veiculo: 'MIS Quarterly 37, 337-355', doi: '10.25300/MISQ/2013/37.2.01' },
  { autores: 'Hevner, A.R., March, S.T., Park, J., Ram, S.', ano: 2004, titulo: 'Design science in information systems research.', veiculo: 'MIS Quarterly 28, 75-105', doi: '10.2307/25148625' },
  { autores: 'Venable, J., Pries-Heje, J., Baskerville, R.', ano: 2016, titulo: 'FEDS: a framework for evaluation in design science research.', veiculo: 'European Journal of Information Systems 25, 77-89', doi: '10.1057/ejis.2014.36' },
];
