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
node --test                      # ou: npm test   (Node 20+, sem dependências)
```

| Arquivo | Verifica |
|---|---|
| `tests/nucleo.test.js` | caso Aurora (escores, nível, gargalo e roteiro exatos da Tabela 13); todos os mínimos; todos os máximos; gargalo isolado em D0, D1 e D3; 2 000 perfis aleatórios (CT-04, RN-06); FA-03; FE-01/02/03; limites de faixa; reaplicação |
| `tests/contrato.test.js` | CT-01, CT-02, CT-03, CT-05, CT-06 (matriz de rastreabilidade), CT-07 (20–30 min), CT-08 (nenhum canal de saída; CSP) |
| `tests/propriedades.test.js` | monotonicidade, fronteiras contra um oráculo em inteiros, entradas inválidas, modelo corrompido, datas de reaplicação |
| `tests/interface.test.js` | RNF01 (nenhum código de especificação ou de regra na tela do gestor), resumo primeiro, um único próximo passo, gargalo sinalizado, menu agrupado |
| `tests/metricas.test.js` | registro local do tempo de preenchimento e das aberturas do guia |

## Estrutura (seção 8 — módulos)

| Arquivo | Realiza |
|---|---|
| `index.html` | documento raiz; CSP que bloqueia qualquer conexão a terceiros |
| `dados.json` | contrato de dados: R1 banco de itens, R2 níveis/faixas/pesos, R3 base de regras, versão do modelo |
| `js/coleta.js` | C1 — ficha (CP-03), formulário (CP-01), completude (CP-02), guia (CP-14) |
| `js/nucleo.js` | C2–C4 — funções puras CP-04 a CP-10 e o fluxo de UC-05 |
| `js/painel.js` | C5 — perfil (CP-11), relatório (CP-12), Canvas de Prontidão, comparação (UC-09) |
| `js/graficos.js` | gráficos do diagnóstico e da comparação (Apache ECharts), com as opções em funções puras |
| `js/inicio.js` | página inicial |
| `js/pesquisa.js` | dados da pesquisa (artigo, objetivos, requisitos, evidências, vereditos) usados no Sobre e no Início |
| `js/animacoes.js` | movimento: revelar ao rolar, contagem de números, parallax, topo que muda ao rolar |
| `js/estado.js` | armazenamento local, máquina de estados, arquivamento e importação (CP-13) |
| `js/exportacao.js` | diálogo "Exportar diagnóstico": relatório em PDF e planilha (UC-08) |
| `js/relatorio-pdf.js` | relatório em PDF (CP-12), no padrão dos relatórios de checklist e de WIT do cop |
| `js/planilha.js` | planilha de dados .xlsx: gera e lê de volta para a comparação (CP-13, UC-09) |
| `js/bibliotecas.js` | carrega pdfmake, exceljs e echarts de `vendor/` só quando são usados |
| `js/tema.js` | tema claro (padrão) ou escuro, escolhido no rodapé |
| `vendor/` | pdfmake 0.3.11 e exceljs 4.4.0 (MIT), echarts 5.6.0 (Apache 2.0) e IBM Plex (OFL), copiados sem alteração |
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

## Versão 1.1.0 do artefato (PBL 8: melhorias)

Esta versão responde à avaliação do PBL 7. O modelo continua na versão 1.0.0, porque
pesos, limites, itens e regras não mudaram, e por isso diagnósticos antigos e novos
continuam comparáveis. As mudanças estão todas na página:

- O roteiro e as advertências não mostram mais o código da regra (RD, RT). Os códigos
  ficam no arquivo exportado e nas telas de pesquisa (R2).
- O diagnóstico começa por um resumo com o nível, a dimensão que trava o resultado e os
  três primeiros passos. Perfil, explicação do nível, roteiro completo e Canvas ficam
  recolhidos e saem abertos na impressão (R3).
- Depois do último item aparece o cartão "Tudo respondido", com um único botão. No
  diagnóstico, o botão em destaque é "Exportar e arquivar" (depois, "Reaplicar"), e as
  outras ações ficam em "Mais opções" (R4).
- O topo tem Início, Diagnóstico e Histórico. Avaliação, Manutenção e Sobre estão no
  grupo "Pesquisa" (R5).
- A ordem do roteiro é a mesma do PBL 4, então o caso Aurora continua igual à Tabela 13.
  A ação da dimensão-gargalo ganhou um selo e abre o resumo (R9).
- Cada aplicação guarda o início e o fim do preenchimento e quantas vezes o guia foi
  aberto, e o arquivo exportado leva esses dados. A página continua sem enviar nada (R7).
- Os testes rodam também no branch publicado, `mgp-pme-pagina-estatica` (R1).

O relatório desta etapa sai de `make` (pipeline em `pipeline/`, PDF em
`entregas/Melhorias-MGP-PME.pdf`), que mede esta versão contra a base `b9668a4`.
Requer `node`, `git`, `pdflatex`, `firefox` e `pdftoppm`; `make deps` confere.

## Versão 1.2.0 do artefato (referências e revisão de UX)

O modelo continua na versão 1.0.0: pesos, limites, itens e regras não mudaram, só
ganharam referências, que não entram no cálculo.

- **Referências bibliográficas** em `dados.json` (bloco `referencias`, 22 obras do PBL 4,
  seção 11, cada uma com DOI conferido no PDF do artigo). Dimensões e regras apontam para
  elas por chave, e `validarModelo` recusa chave inexistente.
- **Início:** cada dimensão mostra a citação curta e a seção "Base científica" traz a
  referência completa. No questionário, no Guia e no Sobre, só a citação.
- **Questionário:** cinco afirmações, no máximo uma por dimensão (I07, I11, I16, I23,
  I28), mostram uma linha "Na literatura" com o achado de um estudo.
- **Resultado:** cada passo do roteiro e cada advertência citam os estudos da regra que
  os gerou, e a explicação do teto de gargalo cita a sua fundamentação
  (`fundamentacao.teto_de_gargalo`). A seção 5, "Referências", lista só as obras citadas
  naquele diagnóstico.
- **UX:** visual plano, sem cartões com sombra, filetes laterais, brilhos, degradês e
  rótulos em caixa alta. Notificação no topo, para não cobrir a barra de progresso. Barra
  de progresso mais baixa no celular. No celular, o Histórico vira lista com as ações à
  vista, e "excluir" fica afastado de "exportar". Também há uma dica de por que
  "Comparar" está desativado. Na impressão, os números de seção aparecem e a seta de
  recolher some.

## Versão 1.3.0 do artefato (exportação, paleta e tema)

O modelo continua na versão 1.0.0.

- **Exportar** abre um diálogo com dois arquivos, gerados no navegador:
  - **Relatório em PDF**, no desenho dos relatórios de checklist e de WIT do cop:
    - capa com faixa escura, dados da aplicação e quadro de resultado;
    - a partir da página 2, cabeçalho e rodapé corridos, com "Página X de Y";
    - seções numeradas: perfil, nível, roteiro, Canvas, respostas e referências;
    - a planilha de dados vai anexada dentro do PDF.
  - **Planilha de dados (.xlsx)**, com as abas Resumo, Respostas, Dimensões, Roteiro e
    Referências. A aba oculta `_mgp` leva a aplicação completa, e é ela que o Histórico
    importa para comparar reaplicações.
  - O primeiro download arquiva a aplicação.
- **JSON:** nada mais gera JSON para o gestor. Arquivos `.json` exportados antes continuam
  importáveis.
- **Bibliotecas:** pdfmake e exceljs ficam em `vendor/` e são carregadas só ao exportar ou
  importar. A CSP continua `script-src 'self'`.
- **Paleta neutra:**
  - cinzas, um único tom de ardósia (`#39495C`) e um único vermelho de alerta (`#A43B3B`),
    os mesmos valores do tema dos relatórios do cop;
  - as faixas viram uma rampa da mesma matiz;
  - todos os pares texto/fundo passam no AA, nos dois temas.
- **Tema:** claro por padrão. O escuro, também neutro, é escolhido no rodapé e fica salvo
  no navegador.

## Versão 1.4.0 do artefato (nova interface)

O modelo continua na versão 1.0.0. Só mudou a interface.

**Visual**
- Paleta da identidade da PUCPR sobre branco:
  - vinho `#8A0638` nas ações, nos títulos e na faixa de abertura (`#4E0420`);
  - vermelho `#FF0040` só no gargalo, nos critérios críticos e nos erros;
  - violeta só nos gráficos e nas legendas deles.
- Regra contra o excesso de cor: no máximo uma superfície saturada por tela.
- Fonte IBM Plex Sans (400 a 700), guardada em `vendor/fonts` (licença OFL). Corpo de 17px.
- Painéis brancos com sombra leve e sem borda. Botões com canto de 10px; "crítico" e "gargalo" em pílulas.
- Ícones em SVG no lugar de glifos como ✓ ▲ ◆.
- Movimento curto, em `js/animacoes.js`:
  - as seções entram ao aparecer na tela e os números contam até o valor;
  - a afirmação desliza ao navegar no questionário;
  - os gráficos crescem ao carregar.
  - Com "reduzir movimento" ligado no sistema, nada se move.

**Página inicial** (`js/inicio.js`)
- Uma sequência que se lê rolando:
  1. faixa vinho com a prévia de um resultado;
  2. os números do instrumento;
  3. como funciona;
  4. o método, com uma animação de como o teto de gargalo leva a média de nível 3 para 2;
  5. os seis critérios;
  6. o que o gestor recebe;
  7. privacidade e o convite final.
- A prévia e a animação usam o caso ilustrativo calculado pelo próprio núcleo, não números inventados.
- O instrumento aparece como artefato de Design Science Research.

**Questionário**
- Uma afirmação por tela, com a trilha dos seis critérios ao lado.
- Teclas 1 a 5 respondem e as setas navegam. Ao responder, a tela avança sozinha.
- A tela de revisão mostra todas as respostas e leva ao diagnóstico.
- O endereço (`#/questionario/I07`) guarda onde o gestor parou.

**Diagnóstico**
- No topo, quatro indicadores: nível, escore global, o que trava e a próxima aplicação.
- Perfil em barras e forma do perfil em radar, com Apache ECharts 5.6.0 (`vendor/echarts`). A biblioteca só é carregada nesta tela e na comparação.
- Um SVG estático fica no lugar dos gráficos se a biblioteca não carregar.
- Em seguida, os três primeiros passos do roteiro.
- Os detalhes ficam em abas: Critérios, Roteiro, Nível, Canvas e Referências. Na impressão saem todas.
- Com o caso Aurora, a tela mostra ao abrir 304 palavras, contra 363 na versão 1.3.0, já contando os indicadores e os gráficos.

**Outras telas**
- A comparação usa os mesmos gráficos.
- O Histórico perdeu a tabela de periodicidade, que já está no Guia.
- A página inicial ficou com título, três números, um botão e a prévia de um resultado. As referências estão recolhidas em "Base científica".
- Nas telas de pesquisa:
  - Manutenção ganhou navegação lateral e uma linha fixa com o estado da validação.
  - Avaliação ganhou uma matriz Likert.
  - Sobre ganhou um índice "Ir para".

**Conteúdo alinhado ao artigo** (`js/pesquisa.js`)
- **Sobre:**
  - título do artigo e autores;
  - DSR Canvas atualizado (revisão de 35 artigos, avaliação no quadro FEDS, contribuição do tipo "melhoria");
  - objetivos OE1 a OE7 e requisitos.
- **Nova seção Avaliação em Sobre:**
  - evidências E1 a E5;
  - vereditos dos 26 critérios (19 atendidos, 7 parciais);
  - as lacunas dos parciais e o que a página mudou depois;
  - as limitações.
- **Avaliação por especialistas** passou a usar o protocolo do artigo:
  - SUS (Brooke, 1996), com escore calculado na tela;
  - as perguntas abertas PA1 a PA3.
  - O texto dos itens do SUS é provisório até o grupo informar a versão em português aplicada (`ITENS_SUS` em `js/avaliacao.js`).
  - Avaliações salvas no protocolo anterior continuam listadas.
- **Conferência com os PDFs originais.** Foram corrigidos, sem mudar a versão do modelo:
  - o resumo de literatura dos itens I07 e I11, que dizia mais do que as fontes;
  - as páginas de Amarasuriya e Abston (2026).
- **Textos da interface:** revisados para leitura mais direta.

**Exportação:** o PDF e a planilha usam a mesma paleta da página (capa vinho, títulos e cabeçalhos vinho, vermelho só no gargalo), e não mais a paleta neutra da versão 1.3.0.

**Publicação:** o workflow do GitHub Pages passou a copiar `vendor/`. Antes, a exportação não funcionava na publicação a partir de `main`.

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
