// Matriz de rastreabilidade (Tabela 20), catálogo de componentes (Tabela 5)
// e de casos de uso (Tabela 16), com o módulo da página que realiza cada um.
// Exibida na seção Sobre e verificada automaticamente em tests/ (CT-06).
export const RASTREABILIDADE = {
  "componentes": [
    { "codigo": "CP-01", "camada": "C1", "nome": "Formulário de itens", "modulos": ["coleta.js"] },
    { "codigo": "CP-02", "camada": "C1", "nome": "Validador de completude", "modulos": ["coleta.js", "nucleo.js"] },
    { "codigo": "CP-03", "camada": "C1", "nome": "Ficha de contexto", "modulos": ["coleta.js", "estado.js"] },
    { "codigo": "CP-04", "camada": "C2", "nome": "Normalizador de respostas", "modulos": ["nucleo.js"] },
    { "codigo": "CP-05", "camada": "C2", "nome": "Agregador por dimensão", "modulos": ["nucleo.js"] },
    { "codigo": "CP-06", "camada": "C2", "nome": "Ponderador global", "modulos": ["nucleo.js"] },
    { "codigo": "CP-07", "camada": "C3", "nome": "Classificador de nível", "modulos": ["nucleo.js"] },
    { "codigo": "CP-08", "camada": "C3", "nome": "Aplicador do teto de gargalo", "modulos": ["nucleo.js"] },
    { "codigo": "CP-09", "camada": "C4", "nome": "Seletor de regras", "modulos": ["nucleo.js"] },
    { "codigo": "CP-10", "camada": "C4", "nome": "Priorizador do roteiro", "modulos": ["nucleo.js"] },
    { "codigo": "CP-11", "camada": "C5", "nome": "Painel de perfil", "modulos": ["painel.js"] },
    { "codigo": "CP-12", "camada": "C5", "nome": "Relatório de diagnóstico", "modulos": ["painel.js"] },
    { "codigo": "CP-13", "camada": "C5", "nome": "Exportador", "modulos": ["estado.js"] },
    { "codigo": "CP-14", "camada": "C1", "nome": "Guia de aplicação embutido", "modulos": ["coleta.js", "index.html"] }
  ],
  "casos_de_uso": [
    { "codigo": "UC-01", "pacote": "P1", "nome": "Iniciar aplicação", "ator": "Gestor da PME", "modulos": ["coleta.js", "estado.js"] },
    { "codigo": "UC-02", "pacote": "P1", "nome": "Responder itens do instrumento", "ator": "Gestor da PME", "modulos": ["coleta.js"] },
    { "codigo": "UC-03", "pacote": "P1", "nome": "Consultar guia de aplicação", "ator": "Gestor da PME", "modulos": ["coleta.js"] },
    { "codigo": "UC-04", "pacote": "P1", "nome": "Calcular escores de prontidão", "ator": "Gestor da PME", "modulos": ["nucleo.js"] },
    { "codigo": "UC-05", "pacote": "P1", "nome": "Gerar diagnóstico de prontidão", "ator": "Gestor da PME", "modulos": ["nucleo.js", "app.js"] },
    { "codigo": "UC-06", "pacote": "P2", "nome": "Consultar perfil de prontidão por dimensão", "ator": "Gestor da PME", "modulos": ["painel.js"] },
    { "codigo": "UC-07", "pacote": "P2", "nome": "Consultar roteiro de ação priorizado", "ator": "Gestor da PME", "modulos": ["painel.js"] },
    { "codigo": "UC-08", "pacote": "P2", "nome": "Exportar diagnóstico", "ator": "Gestor da PME", "modulos": ["estado.js"] },
    { "codigo": "UC-09", "pacote": "P2", "nome": "Reaplicar o instrumento e comparar resultados", "ator": "Gestor da PME", "modulos": ["estado.js", "painel.js"] },
    { "codigo": "UC-10", "pacote": "P3", "nome": "Parametrizar dimensões, pesos e faixas", "ator": "Pesquisador mantenedor", "modulos": ["manutencao.js", "validacao.js"] },
    { "codigo": "UC-11", "pacote": "P3", "nome": "Manter banco de itens e âncoras", "ator": "Pesquisador mantenedor", "modulos": ["manutencao.js", "validacao.js"] },
    { "codigo": "UC-12", "pacote": "P3", "nome": "Manter base de regras de recomendação", "ator": "Pesquisador mantenedor", "modulos": ["manutencao.js", "validacao.js"] },
    { "codigo": "UC-13", "pacote": "P3", "nome": "Avaliar utilidade e clareza do artefato", "ator": "Especialista avaliador", "modulos": ["avaliacao.js"] }
  ],
  "matriz": [
    { "requisito": "RF01", "componentes": ["CP-01", "CP-02", "CP-03"], "casos_de_uso": ["UC-01", "UC-02", "UC-11"], "decisoes": ["ADR-04", "ADR-06"] },
    { "requisito": "RF02", "componentes": ["CP-04", "CP-05", "CP-06"], "casos_de_uso": ["UC-04", "UC-09", "UC-10"], "decisoes": ["ADR-02"] },
    { "requisito": "RF03", "componentes": ["CP-08"], "casos_de_uso": ["UC-05", "UC-10"], "decisoes": ["ADR-01", "ADR-02", "ADR-05"] },
    { "requisito": "RF04", "componentes": ["CP-07", "CP-12"], "casos_de_uso": ["UC-05", "UC-09", "UC-10"], "decisoes": ["ADR-01"] },
    { "requisito": "RF05", "componentes": ["CP-08", "CP-11", "CP-12", "CP-13"], "casos_de_uso": ["UC-05", "UC-06", "UC-09"], "decisoes": [] },
    { "requisito": "RF06", "componentes": ["CP-09", "CP-10", "CP-12"], "casos_de_uso": ["UC-05", "UC-07", "UC-12"], "decisoes": ["ADR-04", "ADR-07"] },
    { "requisito": "RNF01", "componentes": ["CP-01", "CP-02", "CP-12", "CP-14"], "casos_de_uso": ["UC-02", "UC-13"], "decisoes": ["ADR-05", "ADR-06"] },
    { "requisito": "RNF02", "componentes": ["CP-14"], "casos_de_uso": ["UC-03", "UC-13"], "decisoes": ["ADR-07"] },
    { "requisito": "RNF03", "componentes": [], "casos_de_uso": [], "decisoes": ["ADR-02", "ADR-03"] },
    { "requisito": "RNF04", "componentes": ["CP-01"], "casos_de_uso": ["UC-02"], "decisoes": [] },
    { "requisito": "RNF05", "componentes": ["CP-03", "CP-13"], "casos_de_uso": ["UC-08"], "decisoes": ["ADR-03"] }
  ]
};
