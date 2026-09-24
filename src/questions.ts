// As 6 dimensões do diagnóstico e suas 30 perguntas (5 por dimensão).

export type Dimensao = {
  id: string;
  nome: string;
  critica: boolean;
  perguntas: { texto: string; ajuda: string }[];
};

export const escala = [
  "Não acontece",
  "Acontece raramente",
  "Acontece às vezes",
  "Acontece quase sempre",
  "Acontece sempre",
];

export const dimensoes: Dimensao[] = [
  {
    id: "D0",
    nome: "Capacidade digital básica",
    critica: true,
    perguntas: [
      {
        texto: "A equipe usa computadores e internet estável no dia a dia de trabalho.",
        ajuda: "Pense se as pessoas conseguem trabalhar sem interrupções por falta de equipamento ou conexão.",
      },
      {
        texto: "As tarefas do negócio são feitas em programas próprios, e não em papel ou planilhas soltas.",
        ajuda: "Vendas, estoque, financeiro e atendimento registrados em sistemas, não em cadernos.",
      },
      {
        texto: "As informações da empresa ficam guardadas em um lugar comum e acessível.",
        ajuda: "Arquivos e registros centralizados, não espalhados em máquinas pessoais.",
      },
      {
        texto: "Existe alguém responsável por resolver problemas de computador e sistemas.",
        ajuda: "Pode ser um funcionário, um sócio ou um prestador de serviço fixo.",
      },
      {
        texto: "A equipe aprende a usar novas ferramentas sem grande dificuldade.",
        ajuda: "Avalie a facilidade da equipe quando uma ferramenta nova é adotada.",
      },
    ],
  },
  {
    id: "D1",
    nome: "Disponibilidade e qualidade dos dados",
    critica: true,
    perguntas: [
      {
        texto: "Os registros de clientes, vendas e operação estão completos e atualizados.",
        ajuda: "Considere se falta informação ou se os dados ficam desatualizados.",
      },
      {
        texto: "As informações seguem um padrão de preenchimento conhecido por todos.",
        ajuda: "Mesmos campos, mesmo formato de data, nomes sem duplicidade.",
      },
      {
        texto: "É fácil extrair um relatório com os números do negócio quando necessário.",
        ajuda: "Pense no tempo que leva para conseguir um número confiável.",
      },
      {
        texto: "A empresa guarda histórico suficiente para comparar períodos.",
        ajuda: "Dados de meses ou anos anteriores continuam disponíveis.",
      },
      {
        texto: "Existe cópia de segurança das informações importantes.",
        ajuda: "Backup automático ou rotina definida de salvamento.",
      },
    ],
  },
  {
    id: "D2",
    nome: "Estratégia e processos",
    critica: false,
    perguntas: [
      {
        texto: "A empresa tem objetivos claros para os próximos 12 meses.",
        ajuda: "Metas conhecidas pela equipe, não apenas na cabeça do dono.",
      },
      {
        texto: "Os processos principais estão descritos e são seguidos da mesma forma.",
        ajuda: "Uma pessoa nova conseguiria executar seguindo o que está escrito.",
      },
      {
        texto: "A direção já identificou onde a automação traria mais ganho.",
        ajuda: "Tarefas repetitivas ou gargalos mapeados.",
      },
      {
        texto: "Há orçamento previsto para melhorias e novas ferramentas.",
        ajuda: "Mesmo que pequeno, um valor reservado com regularidade.",
      },
      {
        texto: "Resultados de novas iniciativas são medidos antes de expandir.",
        ajuda: "Testar pequeno, medir e só depois ampliar.",
      },
    ],
  },
  {
    id: "D3",
    nome: "Pessoas e cultura",
    critica: true,
    perguntas: [
      {
        texto: "A equipe recebe bem mudanças na forma de trabalhar.",
        ajuda: "Pense na reação das pessoas quando algo novo é proposto.",
      },
      {
        texto: "A liderança apoia e participa das mudanças, não apenas autoriza.",
        ajuda: "Envolvimento real dos responsáveis no dia a dia.",
      },
      {
        texto: "Existe tempo reservado para a equipe aprender coisas novas.",
        ajuda: "Treinamento, estudo ou experimentação dentro do expediente.",
      },
      {
        texto: "As pessoas se sentem à vontade para sugerir melhorias e apontar erros.",
        ajuda: "Ambiente em que apontar um problema não gera punição.",
      },
      {
        texto: "Há pelo menos uma pessoa curiosa que puxa o uso de novas tecnologias.",
        ajuda: "Alguém que testa e ensina os demais.",
      },
    ],
  },
  {
    id: "D4",
    nome: "Governança, ética e conformidade",
    critica: false,
    perguntas: [
      {
        texto: "A empresa sabe quais dados pessoais coleta e por quê.",
        ajuda: "Clientes, funcionários e fornecedores: o que é guardado e com qual finalidade.",
      },
      {
        texto: "O acesso a informações sensíveis é restrito a quem precisa.",
        ajuda: "Nem todo mundo vê tudo.",
      },
      {
        texto: "Existem regras claras sobre o uso de ferramentas e informações da empresa.",
        ajuda: "Orientações combinadas e conhecidas pela equipe.",
      },
      {
        texto: "As decisões importantes ficam registradas e podem ser explicadas.",
        ajuda: "É possível saber quem decidiu, quando e com base em quê.",
      },
      {
        texto: "A empresa acompanha as obrigações legais do seu setor.",
        ajuda: "Inclui proteção de dados e regras específicas da atividade.",
      },
    ],
  },
  {
    id: "D5",
    nome: "Ecossistema e ambiente",
    critica: true,
    perguntas: [
      {
        texto: "Clientes pedem respostas mais rápidas ou serviços mais digitais.",
        ajuda: "Pressão vinda de quem compra da empresa.",
      },
      {
        texto: "Concorrentes do setor já usam soluções automatizadas.",
        ajuda: "O que você observa no mercado em que atua.",
      },
      {
        texto: "Parceiros e fornecedores trocam informações com a empresa de forma digital.",
        ajuda: "Pedidos, notas e dados integrados em vez de e-mail solto.",
      },
      {
        texto: "A empresa tem acesso a apoio externo confiável quando precisa.",
        ajuda: "Associações, universidades, programas de apoio ou consultoria pontual.",
      },
      {
        texto: "Existem linhas de crédito, incentivos ou programas conhecidos pela direção.",
        ajuda: "Apoio financeiro disponível para investir em melhorias.",
      },
    ],
  },
];

export const totalPerguntas = dimensoes.reduce((s, d) => s + d.perguntas.length, 0);
