# -*- coding: utf-8 -*-
"""Fonte única do conteúdo do relatório de melhorias (PBL 8, DSR etapa 5).

Cadeia de rastreabilidade: limitação apontada na avaliação do PBL 7 (L) ->
recomendação da Seção 6 daquele relatório (R) -> melhoria implementada (M) ->
arquivos alterados -> teste ou medição que a confirma.

Número que depende do artefato NÃO é digitado aqui: os textos usam campos de
formatação ({pal_antes}, {cod_depois} etc.) preenchidos com build/medidas.json,
que pipeline/medir.mjs produz rodando as duas versões.
"""

DOCUMENTO = {
    "rotulo_capa": "PESQUISA APLICADA \\,|\\, DESIGN SCIENCE RESEARCH \\,|\\, ETAPA 5",
    "titulo": "Melhorias do Artefato MGP-PME",
    "subtitulo": "Modelo de Gargalos de Prontidão para Pequenas e Médias Empresas",
    "chamada": "PBL 8: refinar o artefato com base nos resultados da avaliação",
    "cabecalho": "Melhorias do MGP-PME \\,|\\, PBL 8",
    "grupo": "G02",
    "integrantes": [
        "Renan da Silva Oliveira Andrade",
        "Guilherme Arcanjo de Morais",
        "Lucas da Costa Paula",
        "Renan Americo Herculano",
        "Joaquim dos Anjos Faraco",
    ],
    "curso": "Bacharelado em Ciência da Computação, turma 6º A",
    "disciplina": "Pesquisa Aplicada, PUCPR",
    "data": "23 de outubro de 2026",
}

# Resultado do CI no pull request desta etapa (R1). Preenchido depois que o
# workflow roda no GitHub; enquanto for None, o relatório diz que está pendente.
CI = {"pr": None, "url": None, "resultado": None, "testes": None}

# ---------------------------------------------------------------- PBL 7 -> L
# Cada limitação cita a evidência do relatório de avaliação (E1 testes, E2
# medições, E3 questionário com Q1 a Q11, E4 simulação) e os critérios afetados.
LIMITACOES = [
    {"cod": "L1", "texto": "Códigos de regra (RD, RT) ainda exibidos no roteiro; a respondente pediu para \"remover as tags de debug\".",
     "evidencia": "E2; Q4, Q11", "criterios": "RNF01", "r": "R2"},
    {"cod": "L2", "texto": "Texto demais e informação percebida como desorganizada; leitura longa e cansativa.",
     "evidencia": "Q2, Q3, Q5, Q7", "criterios": "RNF01, RNF04", "r": "R3"},
    {"cod": "L3", "texto": "Fluxo pouco fluido depois do preenchimento: muitas opções e nenhum próximo passo claro.",
     "evidencia": "Q6", "criterios": "RF06, OE5", "r": "R4"},
    {"cod": "L4", "texto": "Seis rotas no topo, misturando telas do gestor e da pesquisa; a respondente procurou um menu lateral.",
     "evidencia": "Q2, Q9", "criterios": "RNF01", "r": "R5"},
    {"cod": "L5", "texto": "Workflow de testes conferido só localmente; o branch publicado pelo GitHub Pages não passava pela suíte.",
     "evidencia": "E1", "criterios": "CT-01 a CT-08", "r": "R1"},
    {"cod": "L6", "texto": "Com o teto atuando, a primeira ação nem sempre é a do gargalo (15,3% dos perfis correlacionados).",
     "evidencia": "E4", "criterios": "OE5", "r": "R9"},
    {"cod": "L7", "texto": "Tempo de aplicação só estimado (20 a 30 min) e autonomia sem medida; amostra de uma respondente.",
     "evidencia": "E2, E3; Q5, Q7", "criterios": "RNF02, RNF04, OE2, OE7", "r": "R7"},
    {"cod": "L8", "texto": "27 de 30 itens com âncoras em rascunho; pesos, limites e dimensões críticas sem revisão de especialistas.",
     "evidencia": "E2, E4", "criterios": "OE1, OE2", "r": "R6, R10"},
    {"cod": "L9", "texto": "Visual possivelmente associado a interfaces geradas por IA (\"estética claudiana\"), embora também chamado de bonito.",
     "evidencia": "Q1, Q10", "criterios": "RF05", "r": "R8"},
]

# ---------------------------------------------------------------- R (PBL 7, Seção 6)
SITUACOES = ["Implementada", "Parcial", "Próximo ciclo"]

RECOMENDACOES = [
    {"r": "R1", "acao": "Confirmar no GitHub Actions que o workflow roda o comando de teste documentado.",
     "situacao": "Implementada", "m": "M1"},
    {"r": "R2", "acao": "Tirar os códigos de regra (RD, RT) da tela do gestor.", "situacao": "Implementada", "m": "M2"},
    {"r": "R3", "acao": "Reduzir o texto: resumo de uma tela no topo e detalhes sob demanda.", "situacao": "Implementada", "m": "M3"},
    {"r": "R4", "acao": "Redesenhar o caminho do último item ao resultado, com um único próximo passo.",
     "situacao": "Implementada", "m": "M4"},
    {"r": "R5", "acao": "Reorganizar a navegação, agrupando as rotas do topo.", "situacao": "Implementada", "m": "M5"},
    {"r": "R6", "acao": "Rever com especialistas as âncoras em rascunho e a calibração dos pesos.",
     "situacao": "Próximo ciclo", "m": None},
    {"r": "R7", "acao": "Ampliar a amostra, com cronômetro e registro da ajuda recebida.", "situacao": "Parcial", "m": "M7"},
    {"r": "R8", "acao": "Verificar com mais opiniões se a identidade visual parece genérica antes de mudá-la.",
     "situacao": "Próximo ciclo", "m": None},
    {"r": "R9", "acao": "Decidir se o roteiro põe a ação do gargalo antes das demais ou apenas a sinaliza.",
     "situacao": "Implementada", "m": "M6"},
    {"r": "R10", "acao": "Na revisão com especialistas, priorizar dimensões críticas e limites dos níveis.",
     "situacao": "Próximo ciclo", "m": None},
]

# ---------------------------------------------------------------- M (o que foi feito)
MELHORIAS = [
    {"cod": "M1", "r": "R1", "criterios": "CT-01 a CT-08",
     "mudanca": "O workflow roda `node --test` também nos pushes para `mgp-pme-pagina-estatica`, o branch que o GitHub "
                "Pages publica. As permissões de publicação ficaram só no job que publica, e cada ref tem o próprio "
                "grupo de concorrência, para que a execução de um PR não cancele uma publicação.",
     "arquivos": "`.github/workflows/pages.yml`",
     "verificacao": "Execução do workflow no pull request desta etapa."},
    {"cod": "M2", "r": "R2", "criterios": "RNF01",
     "mudanca": "No roteiro, a coluna \"Regra\" virou \"Onde\", com a dimensão e a faixa, e a coluna de prioridade "
                "numérica saiu. As advertências aparecem como \"Atenção\", sem o código RT. A comparação entre "
                "aplicações lista pela ação o que entrou e o que saiu do roteiro. Os códigos ficam no arquivo exportado "
                "e nas telas de Sobre e Manutenção, que a equipe usa.",
     "arquivos": "`js/painel.js`",
     "verificacao": "Teste R2 em `tests/interface.test.js`: nenhum código no texto, `aria-label`, `title` ou "
                    "`placeholder` do relatório."},
    {"cod": "M3", "r": "R3", "criterios": "RNF04, RNF01",
     "mudanca": "O diagnóstico começa por um resumo que cabe numa tela, com o nível atribuído, a dimensão que trava o "
                "resultado e os três primeiros passos. As outras quatro seções (perfil, explicação do nível, roteiro "
                "completo e Canvas) ficam recolhidas, cada uma com uma linha de resumo, e saem abertas na impressão. "
                "Os textos de introdução ficaram mais curtos.",
     "arquivos": "`js/painel.js`, `css/estilo.css`",
     "verificacao": "Teste R3 e contagem de palavras exibidas sem abrir nada (Seção 4.1)."},
    {"cod": "M4", "r": "R4", "criterios": "RF06, OE5",
     "mudanca": "Quando o gestor responde o último item, a página rola até o cartão \"Tudo respondido\", cujo único botão, "
                "\"Ver meu diagnóstico\", já recebe o foco. Antes disso, o destaque vai para \"Próximo bloco\" sempre "
                "que o bloco atual fica completo. No diagnóstico, o botão em destaque é \"Exportar e arquivar\" e, "
                "depois da exportação, \"Reaplicar\". Corrigir, comparar e imprimir foram para \"Mais opções\".",
     "arquivos": "`js/coleta.js`, `js/painel.js`, `css/estilo.css`",
     "verificacao": "Teste R4 (um único botão primário, aberta ou arquivada) e captura do fim do questionário (Seção 4.2)."},
    {"cod": "M5", "r": "R5", "criterios": "RNF01",
     "mudanca": "O topo tem agora as três rotas do gestor (Início, Diagnóstico e Histórico) e o grupo \"Pesquisa\", "
                "com Avaliação, Manutenção e Sobre. O link \"Diagnóstico\" abre a etapa em que o gestor parou, "
                "seja a ficha, o questionário ou o resultado.",
     "arquivos": "`index.html`, `js/app.js`, `css/estilo.css`",
     "verificacao": "Teste R5 e captura do menu (Seção 4.2)."},
    {"cod": "M6", "r": "R9", "criterios": "OE5",
     "mudanca": "O grupo decidiu sinalizar a ação do gargalo e manter a prioridade do PBL 4, com a qual o caso Aurora "
                "continua idêntico à Tabela 13. Quando o teto atua, o resumo começa pela ação da dimensão-gargalo, "
                "que também recebe o selo \"gargalo\" no roteiro.",
     "arquivos": "`js/painel.js`",
     "verificacao": "Teste R9 e os testes do núcleo, que não mudaram."},
    {"cod": "M7", "r": "R7", "criterios": "RNF02, RNF04, OE7",
     "mudanca": "Cada aplicação guarda no navegador o início e o fim do preenchimento e o número de vezes que o guia "
                "foi aberto. Esses dados vão no arquivo exportado e no protocolo de avaliação por especialistas. A "
                "página continua sem enviar nada, então a equipe só recebe os dados se o gestor entregar o arquivo.",
     "arquivos": "`js/estado.js`, `js/app.js`, `js/avaliacao.js`",
     "verificacao": "`tests/metricas.test.js` (3 testes)."},
]

# ---------------------------------------------------------------- critérios parciais do PBL 7
# "lacuna": o que o PBL 7 apontou no próprio artefato; "agora": o que mudou;
# "pendente": o que ainda falta para o veredito mudar. Pela regra do PBL 7, um
# critério com queixa da usuária (E3) só deixa de ser Parcial com nova coleta.
PARCIAIS = [
    {"cod": "RNF01", "nome": "Linguagem de negócio",
     "lacuna": "Código de regra em 2 pontos do roteiro; Q4 e Q11.",
     "agora": "{cod_depois} códigos expostos no relatório (eram {cod_antes}); menu agrupado.",
     "pendente": "Repetir o questionário (E3)."},
    {"cod": "RNF04", "nome": "Aplicação em 20 a 30 minutos",
     "lacuna": "Texto em excesso (Q5, Q7); tempo só estimado.",
     "agora": "{pal_depois} palavras à vista no diagnóstico (eram {pal_antes}); tempo de preenchimento registrado.",
     "pendente": "Cronometrar aplicações reais."},
    {"cod": "RF06", "nome": "Roteiro prescritivo priorizado",
     "lacuna": "Fluxo pós-preenchimento pouco fluido (Q6).",
     "agora": "Cartão de conclusão e um único próximo passo; ação do gargalo sinalizada.",
     "pendente": "Repetir o questionário (E3)."},
    {"cod": "RNF02", "nome": "Autoaplicável e autoinstrutivo",
     "lacuna": "Sem medida de autonomia.",
     "agora": "Aberturas do guia registradas e exportadas.",
     "pendente": "Aplicar com mais gestores."},
    {"cod": "OE2", "nome": "Instrumento de coleta",
     "lacuna": "27 âncoras em rascunho; tempo estimado.",
     "agora": "Tempo agora mensurável; âncoras inalteradas.",
     "pendente": "Revisão por especialistas (R6)."},
    {"cod": "OE5", "nome": "Diagnóstico e roteiro personalizado",
     "lacuna": "Q2, Q6; gargalo nem sempre primeiro (E4).",
     "agora": "Resumo abre pelo gargalo; fluxo redesenhado.",
     "pendente": "Repetir o questionário (E3)."},
    {"cod": "OE7", "nome": "Validação empírica",
     "lacuna": "n = 1; nenhum especialista.",
     "agora": "Instrumentação para a próxima rodada.",
     "pendente": "Especialistas e mais gestores (R6, R7)."},
]

# ---------------------------------------------------------------- o que fica para o próximo ciclo
PROXIMO_CICLO = [
    {"r": "R6", "o_que": "Revisão das 27 âncoras em rascunho e da calibração dos pesos.",
     "por_que": "Depende de especialistas, que o grupo ainda não reuniu.",
     "como": "Usar o protocolo da tela Avaliação por especialistas (V3), que já exporta as respostas em JSON."},
    {"r": "R7", "o_que": "Ampliar a amostra de gestores, com tempo e ajuda medidos.",
     "por_que": "Depende de novas empresas; a instrumentação (M7) já está pronta.",
     "como": "Pedir a cada gestor o arquivo exportado, que agora traz início, fim e aberturas do guia."},
    {"r": "R8", "o_que": "Decidir se a identidade visual muda.",
     "por_que": "A única respondente achou o visual \"bonito, moderno\" e também citou a \"estética claudiana\" como incômodo. Uma opinião só não basta para mudar a identidade visual.",
     "como": "Perguntar a mais respondentes, no mesmo questionário, como percebem o visual."},
    {"r": "R10", "o_que": "Revisar dimensões críticas e limites dos níveis antes dos pesos.",
     "por_que": "Faz parte da revisão por especialistas (R6). Na simulação do PBL 7, os pesos quase não mudaram o nível.",
     "como": "Levar à revisão os números da análise de sensibilidade do PBL 7 (Tabela 11)."},
]

REFERENCIAS = [
    "Grupo G02, 2026a. PBL 3 --- Objetivos, descrição do artefato e requisitos. Pesquisa Aplicada, PUCPR, 16 de agosto de 2026.",
    "Grupo G02, 2026b. PBL 4 --- Arquitetura, modelos e especificação da solução (MGP-PME), versão 1.0. Pesquisa Aplicada, PUCPR, 13 de setembro de 2026.",
    "Grupo G02, 2026c. PBL 7 --- Avaliação do artefato MGP-PME. Pesquisa Aplicada, PUCPR, 16 de outubro de 2026.",
    "Hevner, A.R., March, S.T., Park, J., Ram, S., 2004. Design science in information systems research. MIS Quarterly 28, 75--105.",
    "Peffers, K., Tuunanen, T., Rothenberger, M.A., Chatterjee, S., 2007. A design science research methodology for information systems research. Journal of Management Information Systems 24, 45--77.",
]
