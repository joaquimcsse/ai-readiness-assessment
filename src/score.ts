import { dimensoes } from "./questions";

export type ResultadoDimensao = { id: string; nome: string; critica: boolean; nota: number };

export type Resultado = {
  geral: number;
  nivel: Nivel;
  porDimensao: ResultadoDimensao[];
  limitada: boolean;
};

export type Nivel = {
  nome: string;
  descricao: string;
  recomendacoes: string[];
};

// Respostas vão de 1 a 5; 1 vira 0 e 5 vira 100.
function normalizar(valores: number[]): number {
  const media = valores.reduce((a, b) => a + b, 0) / valores.length;
  return ((media - 1) / 4) * 100;
}

const niveis: { ate: number; nivel: Nivel }[] = [
  {
    ate: 20,
    nivel: {
      nome: "Inicial",
      descricao:
        "A empresa ainda não reúne as condições básicas para adotar inteligência artificial com segurança. O caminho começa pela organização do dia a dia.",
      recomendacoes: [
        "Garanta equipamentos e conexão estáveis para toda a equipe.",
        "Centralize os registros de vendas, clientes e finanças em um único lugar.",
        "Escolha uma pessoa responsável por organizar as informações.",
      ],
    },
  },
  {
    ate: 40,
    nivel: {
      nome: "Em desenvolvimento",
      descricao:
        "Existem iniciativas isoladas, mas elas dependem de pessoas específicas e não se sustentam sozinhas.",
      recomendacoes: [
        "Padronize como as informações são preenchidas e guardadas.",
        "Escreva os processos principais em uma página cada.",
        "Reserve tempo semanal para a equipe aprender ferramentas novas.",
      ],
    },
  },
  {
    ate: 60,
    nivel: {
      nome: "Definido",
      descricao:
        "A base está montada e os processos são conhecidos. É o momento de escolher um primeiro uso concreto e medir o resultado.",
      recomendacoes: [
        "Escolha uma tarefa repetitiva e teste uma solução em pequena escala.",
        "Defina como o sucesso desse teste será medido antes de começar.",
        "Combine regras simples sobre o uso de dados da empresa.",
      ],
    },
  },
  {
    ate: 80,
    nivel: {
      nome: "Gerenciado",
      descricao:
        "A empresa já acompanha resultados e consegue repetir o que deu certo. O foco passa a ser ampliar com controle.",
      recomendacoes: [
        "Amplie para outras áreas o que funcionou no primeiro teste.",
        "Formalize quem responde por cada decisão apoiada por tecnologia.",
        "Acompanhe indicadores em uma rotina fixa de revisão.",
      ],
    },
  },
  {
    ate: 100,
    nivel: {
      nome: "Otimizado",
      descricao:
        "A adoção faz parte da rotina e melhora de forma contínua. O desafio é manter o ritmo e a confiança.",
      recomendacoes: [
        "Revise periodicamente os resultados e aposente o que não entrega valor.",
        "Compartilhe o aprendizado com parceiros e com o setor.",
        "Mantenha a atenção em ética, privacidade e conformidade.",
      ],
    },
  },
];

export function calcular(respostas: Record<string, number>): Resultado {
  const porDimensao: ResultadoDimensao[] = dimensoes.map((d) => ({
    id: d.id,
    nome: d.nome,
    critica: d.critica,
    nota: Math.round(
      normalizar(d.perguntas.map((_, i) => respostas[`${d.id}-${i}`] ?? 1)),
    ),
  }));

  const media = porDimensao.reduce((s, d) => s + d.nota, 0) / porDimensao.length;

  // Limite: as dimensões críticas seguram a nota geral. A nota nunca passa
  // de 10 pontos acima da menor nota entre as dimensões críticas.
  const menorCritica = Math.min(...porDimensao.filter((d) => d.critica).map((d) => d.nota));
  const teto = menorCritica + 10;
  const geral = Math.round(Math.min(media, teto));

  return {
    geral,
    nivel: niveis.find((n) => geral <= n.ate)!.nivel,
    porDimensao,
    limitada: media > teto,
  };
}
