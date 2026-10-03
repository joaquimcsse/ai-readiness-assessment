# MGP-PME — Modelo de Gargalos de Prontidão para PMEs

Instanciação executável do artefato especificado em
`PBL4-Arquitetura-Solucao-MGP-PME.pdf` (Grupo G02 · Pesquisa Aplicada · PUCPR).

Uma página web estática em que o gestor de uma PME responde 30 itens com âncoras
comportamentais e recebe, sem servidor e sem enviar dados a ninguém:

- o **perfil de prontidão** nas seis dimensões (D0–D5), em gráfico SVG;
- o **nível de maturidade** (1–5) com **teto de gargalo** — o nível nunca ultrapassa o
  da dimensão crítica mais fraca (D0, D1, D3);
- o **roteiro de ação priorizado**, gerado por 24 regras determinísticas;
- o **Canvas de Prontidão** e o relatório imprimível em A4.

## Como usar

**Publicado (GitHub Pages):** veja “Publicação” abaixo. Abra a URL no navegador.

**Local:** o navegador não lê `dados.json` com a página aberta direto do disco
(`file://`), então sirva a pasta:

```bash
python3 -m http.server 8000      # ou: npm start
# abra http://localhost:8000
```

Na página inicial, **“Ver exemplo preenchido”** carrega o caso ilustrativo
Metalmecânica Aurora (seção 4 do PBL 4) — o resultado bate com a Tabela 13.

## Testes (etapa V2 e critérios de aceitação)

```bash
node --test "tests/*.test.js"    # ou: npm test   (Node 22+, sem dependências)
```

| Arquivo | Verifica |
|---|---|
| `tests/nucleo.test.js` | caso Aurora (escores, nível, gargalo e roteiro exatos da Tabela 13); todos os mínimos; todos os máximos; gargalo isolado em D0, D1 e D3; 2 000 perfis aleatórios (CT-04, RN-06); FA-03; FE-01/02/03; limites de faixa; reaplicação |
| `tests/contrato.test.js` | CT-01, CT-02, CT-03, CT-05, CT-06 (matriz de rastreabilidade), CT-07 (20–30 min), CT-08 (nenhum canal de saída; CSP) |

## Estrutura (seção 8 — módulos)

| Arquivo | Realiza |
|---|---|
| `index.html` | documento raiz; CSP que bloqueia qualquer conexão a terceiros |
| `dados.json` | contrato de dados: R1 banco de itens, R2 níveis/faixas/pesos, R3 base de regras, versão do modelo |
| `js/coleta.js` | C1 — ficha (CP-03), formulário (CP-01), completude (CP-02), guia (CP-14) |
| `js/nucleo.js` | C2–C4 — funções puras CP-04 a CP-10 e o fluxo de UC-05 |
| `js/painel.js` | C5 — perfil SVG (CP-11), relatório (CP-12), Canvas de Prontidão, comparação (UC-09) |
| `js/estado.js` | armazenamento local, máquina de estados, exportação/importação (CP-13) |
| `js/app.js` | roteamento entre telas e orquestração do processo de aplicação |
| `js/manutencao.js` | UC-10/11/12 — editar parâmetros, validar e gerar novo `dados.json` |
| `js/avaliacao.js` | UC-13 — protocolo de avaliação por especialistas (V3), exportado em JSON |
| `js/validacao.js` | validação do contrato (CT-01/02/03/05, FE-03) |
| `js/sobre.js`, `js/rastreabilidade.js` | DSR Canvas, ADRs, matriz de rastreabilidade |

## Publicação no GitHub Pages

1. Crie um repositório no GitHub e envie este diretório (`git push`).
2. Em *Settings → Pages → Build and deployment*, escolha **GitHub Actions**.
3. O workflow `.github/workflows/pages.yml` roda os testes e publica a página a cada push
   em `main`. Se os testes falharem, nada é publicado.

## Nova versão do modelo (etapa V4)

Na aba **Manutenção**, edite pesos, limites, itens, âncoras ou regras. A página valida o
modelo continuamente e só permite publicar um modelo consistente. Ao publicar, ela baixa o
novo `dados.json` (com versão, data, justificativa e lista do que mudou) — substitua o
arquivo no repositório. Aplicações em andamento sob a versão anterior são interrompidas
(FE-02), e diagnósticos de versões diferentes não podem ser comparados (RN-07).

## Decisões de implementação a revisar

- **Âncoras:** o PBL 4 publica a ancoragem integral só de I01, I06 e I16. As âncoras dos
  outros 27 itens foram redigidas a partir dos descritores genéricos da escala e estão
  marcadas `"ancoras_status": "rascunho"` em `dados.json` para revisão do grupo.
- **Gargalo:** o pseudocódigo marca como gargalo toda dimensão crítica cujo nível iguala o
  teto; a Fig. 4 só marca gargalo quando o teto fica abaixo do nível ponderado. Adotou-se a
  Fig. 4 — sem isso, uma empresa toda no nível 5 teria três “gargalos”.
- **RT-02/RT-03:** “dimensões críticas” = D0, D1, D3 (é o que reproduz a Tabela 13).
- **RT-03 × FA-01:** a explicação do teto (FA-01) aparece sempre que o teto atua; a regra
  RT-03 só entra no roteiro quando a sua condição (escore global Consolidado) é satisfeita.
