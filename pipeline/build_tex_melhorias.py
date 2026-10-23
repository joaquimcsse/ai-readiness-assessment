# -*- coding: utf-8 -*-
"""Monta o .tex do relatório de melhorias (PBL 8) e compila o PDF.

O conteúdo vem de melhorias_data.py e os números de build/medidas.json (saída
de medir.mjs nas duas versões). Nenhum número do artefato é digitado aqui.
"""
import json
import subprocess

import melhorias_data as dados
from latexstyle import compile_tex, esc, md, montar
from paths import COMMIT_BASE, ENTREGAS_TEX, MEDIDAS, NOME_TEX, PDF, RAIZ

LARGURA_TEXTO = 15.8  # cm (A4 com margens de 2,6 cm)
CAMINHOS_ARTEFATO = ["index.html", "dados.json", "css", "js", "tests", ".github", "package.json"]


# ---------------------------------------------------------------- formatação
def inteiro(n):
    return "{:,}".format(int(n)).replace(",", ".")


def kib(n):
    return ("%.0f KiB" % (n / 1024))


def pct(x, casas=0):
    return ("%.*f" % (casas, x)).replace(".", ",") + r"\%"


def sim_nao(v):
    return "sim" if v else "não"


def git(*args):
    r = subprocess.run(["git", *args], cwd=RAIZ, capture_output=True, text=True)
    return r.stdout.strip()


def codigo_da_versao():
    """Último commit que mexeu no artefato, e se há alteração local por commitar."""
    commit = git("log", "-1", "--format=%h", "--", *CAMINHOS_ARTEFATO)
    sujo = bool(git("status", "--porcelain", "--", *CAMINHOS_ARTEFATO))
    ramo = git("rev-parse", "--abbrev-ref", "HEAD")
    return commit, sujo, ramo


# ---------------------------------------------------------------- tabelas
def tabela(legenda, spec, cabecalho, linhas, rotulo=None):
    """Tabela curta que não quebra: legenda no topo, booktabs, largura do texto."""
    cab = " & ".join(r"\thead{%s}" % c for c in cabecalho) + r" \\"
    corpo = "\n".join(" & ".join(l) + r" \\" for l in linhas)
    return "\n".join([
        r"\begin{table}[H]", r"\centering\small",
        r"\caption{%s}%s" % (legenda, r"\label{%s}" % rotulo if rotulo else ""),
        r"\begin{tabularx}{\linewidth}{%s}" % spec, r"\toprule", cab, r"\midrule", corpo,
        r"\bottomrule", r"\end{tabularx}", r"\end{table}", ""])


def tabela_longa(legenda, spec, cabecalho, linhas, rotulo=None):
    """Tabela que pode quebrar entre páginas, com "(continuação)" e "continua na próxima página"."""
    n = len(cabecalho)
    cab = " & ".join(r"\thead{%s}" % c for c in cabecalho) + r" \\"
    corpo = "\n".join(" & ".join(l) + r" \\ \addlinespace[2pt]" for l in linhas)
    return "\n".join([
        r"{\small", r"\begin{longtable}{%s}" % spec,
        r"\caption{%s}%s\\" % (legenda, r"\label{%s}" % rotulo if rotulo else ""),
        r"\toprule", cab, r"\midrule", r"\endfirsthead",
        r"\caption[]{(continuação)}\\", r"\toprule", cab, r"\midrule", r"\endhead",
        r"\midrule\multicolumn{%d}{r}{\footnotesize\itshape continua na próxima página}\\" % n, r"\endfoot",
        r"\bottomrule", r"\endlastfoot",
        corpo, r"\end{longtable}}", ""])


# ---------------------------------------------------------------- partes do documento
def capa(doc, commit, sujo, ramo, med):
    integrantes = r" \\ & ".join(esc(i) for i in doc["integrantes"])
    codigo = r"commit \texttt{%s}, branch \texttt{%s}%s; versão avaliada: \texttt{%s}" % (
        esc(commit), esc(ramo), ", com alterações locais ainda não commitadas" if sujo else "", COMMIT_BASE)
    ficha = [
        ("Artefato", "MGP-PME, versão %s do artefato (modelo %s)" % (esc(med["depois"]["versao"]), esc(med["modelo"]))),
        ("Código", codigo),
        ("Grupo", esc(doc["grupo"])),
        ("Integrantes", integrantes),
        ("Curso", esc(doc["curso"])),
        ("Disciplina", esc(doc["disciplina"])),
        ("Data", esc(doc["data"])),
    ]
    linhas = "\n".join(r"\textbf{%s} & %s \\" % (a, b) for a, b in ficha)
    return r"""
\begin{titlepage}
\sffamily\setlength{\parindent}{0pt}
\vspace*{3.2cm}
{\small %(rotulo)s}\par\vspace{6pt}
\rule{\linewidth}{0.8pt}\par\vspace{1.4cm}
{\fontsize{30}{36}\selectfont\bfseries %(titulo)s\par}\vspace{0.9cm}
{\large %(subtitulo)s\par}\vspace{0.5cm}
{\normalsize %(chamada)s\par}\vspace{1.2cm}
\rule{\linewidth}{0.4pt}
\vfill
{\footnotesize\renewcommand{\arraystretch}{1.25}
\begin{tabular}{@{}p{3.6cm}p{11.6cm}@{}}
%(linhas)s
\end{tabular}}
\vspace*{1.4cm}
\end{titlepage}
""" % {"rotulo": doc["rotulo_capa"], "titulo": esc(doc["titulo"]).replace(" MGP", r"\\MGP"),
       "subtitulo": esc(doc["subtitulo"]), "chamada": esc(doc["chamada"]), "linhas": linhas}


def contagem_situacoes():
    return {s: [r["r"] for r in dados.RECOMENDACOES if r["situacao"] == s] for s in dados.SITUACOES}


def resumo(med):
    a, d = med["antes"], med["depois"]
    sit = contagem_situacoes()
    linhas = [[esc(s), str(len(rs)), ", ".join(rs)] for s, rs in sit.items()]
    linhas.append([r"\textbf{Total}", r"\textbf{%d}" % len(dados.RECOMENDACOES), ""])
    return r"""
\pagenumbering{roman}
\markboth{}{}
\section*{Resumo}
Este relatório corresponde à etapa de melhorias do processo de \emph{Design Science Research} (Peffers et al., 2007).
A avaliação do PBL 7 concluiu que o núcleo de cálculo do MGP-PME estava correto e que as lacunas estavam no uso da
página: códigos de regra na tela, texto demais, um fluxo confuso depois do preenchimento e nenhuma medida do tempo
gasto. Das %(n)d recomendações daquele relatório, %(impl)d foram implementadas, %(parc)d foi implementada em parte e
%(prox)d dependem de especialistas ou de novos respondentes, por isso ficam para o próximo ciclo.

%(tab)s
\rotulo{Principais achados}
Na versão %(vd)s, o relatório do gestor não mostra mais nenhum código de regra. No caso Aurora, a versão avaliada
exibia %(cod)s. Sem abrir nenhuma seção, o diagnóstico agora mostra %(pal_d)s palavras, contra %(pal_a)s antes, e o
restante do conteúdo continua nas seções recolhidas. O nível, o gargalo e o roteiro do caso Aurora são os mesmos nas
duas versões, e a suíte passou de %(ta)s para %(td)s testes, todos aprovados.

\rotulo{Próximos passos}
As lacunas que estavam no próprio artefato foram tratadas, mas os vereditos parciais de RNF01, RNF04, RF06 e OE5 só
podem mudar com uma nova rodada do questionário. A Seção~\ref{sec:proximo} lista o que ficou para o próximo ciclo: a
revisão por especialistas (R6 e R10), a ampliação da amostra (R7) e a decisão sobre a identidade visual (R8).
""" % {"n": len(dados.RECOMENDACOES), "impl": len(sit["Implementada"]), "parc": len(sit["Parcial"]),
       "prox": len(sit["Próximo ciclo"]), "vd": esc(d["versao"]),
       "cod": "%s ocorrências de %s códigos distintos" % (a["relatorio"]["codigosExpostos"], a["relatorio"]["codigosDistintos"]),
       "pal_d": inteiro(d["relatorio"]["palavrasSemAbrir"]), "pal_a": inteiro(a["relatorio"]["palavrasSemAbrir"]),
       "ta": a["testes"]["total"], "td": d["testes"]["total"],
       "tab": tabela("Recomendações do PBL 7 por situação.", r"L{3.2cm}L{2.4cm}X",
                     ["Situação", "Quantidade", "Recomendações"], linhas)}


def sumario():
    return r"""
\clearpage
\tableofcontents
\clearpage
\pagenumbering{arabic}
\paginacaocorpo
"""


def introducao(med):
    a, d = med["antes"], med["depois"]
    evid = [
        ["E1", r"Suíte de testes automáticos (\texttt{node -{}-test})",
         "Núcleo, contrato de dados, critérios CT-01 a CT-08 e um teste para cada melhoria"],
        ["E2", r"Medição comparativa (\texttt{pipeline/medir.mjs})",
         "Códigos expostos, palavras à vista, botões, menu, peso da página e rede, nas duas versões"],
        ["E5", r"Capturas de tela (\texttt{pipeline/capturar.py})",
         "Aparência das telas alteradas na versão avaliada e na versão nova"],
    ]
    return r"""
\section{Introdução e método}
Na DSRM, a avaliação pode levar de volta ao desenvolvimento, e o ciclo se repete até o artefato atender aos objetivos
(Peffers et al., 2007; Hevner et al., 2004). Esta etapa faz uma dessas voltas. Ela parte das limitações levantadas na
avaliação do PBL 7 (Grupo G02, 2026c), implementa as recomendações que estavam ao alcance do grupo e mede a versão
nova com a mesma régua usada na anterior.

Cada recomendação recebe uma de três situações:
\begin{itemize}
  \item \emph{Implementada}, quando a mudança está no código e um teste automático ou uma medição a confirma;
  \item \emph{Parcial}, quando a parte que cabe ao artefato foi feita e o restante depende de coleta com pessoas;
  \item \emph{Próximo ciclo}, quando a recomendação depende de especialistas, de novos respondentes ou de uma decisão
        que uma única opinião não sustenta.
\end{itemize}

Duas restrições orientaram as mudanças. O modelo (\texttt{dados.json}) continua na versão %(modelo)s, porque pesos,
limites, itens e regras não mudaram e uma versão nova impediria comparar diagnósticos antigos e novos (RN-07). O núcleo
de cálculo (\texttt{js/nucleo.js}) também ficou intacto, para que os resultados do PBL 7 sobre ele (E1 e E4) continuem
valendo. Só a página mudou, e o artefato passou da versão %(va)s para a %(vd)s.

As evidências da evolução estão na Tabela~\ref{tab:evid}. O script \texttt{pipeline/medir.mjs} extrai a versão avaliada
(commit \texttt{%(base)s}) com \texttt{git archive}, roda a mesma medição nas duas versões e grava o resultado em
\texttt{build/medidas.json}, de onde saem todos os números das Seções~\ref{sec:melhorias} e~\ref{sec:evidencias}. As
capturas vêm de \texttt{pipeline/capturar.py}, que desenha o caso Aurora no Firefox \emph{headless} com os módulos de
cada versão. O questionário (E3) e a simulação (E4) não foram repetidos nesta etapa.

%(tab)s""" % {"modelo": esc(med["modelo"]), "va": esc(a["versao"]), "vd": esc(d["versao"]), "base": COMMIT_BASE,
              "tab": tabela("Evidências desta etapa.", r"L{1.1cm}L{5.4cm}X", ["Código", "Evidência", "O que mede"],
                            evid, "tab:evid")}


def limitacoes():
    linhas = [[l["cod"], md(l["texto"]), esc(l["evidencia"]), esc(l["criterios"]), esc(l["r"])] for l in dados.LIMITACOES]
    return r"""
\section{Limitações identificadas na avaliação}
A Tabela~\ref{tab:lim} resume as limitações da Seção 5.2 e da Tabela 16 do PBL 7 e liga cada uma à recomendação
correspondente. As seis primeiras (L1 a L6) estavam no próprio artefato e podiam ser tratadas nesta etapa. A L7 é mista:
o grupo pode instrumentar a página, mas a medida depende de outros gestores. L8 e L9 dependem de especialistas ou de
mais respondentes.

%s""" % tabela_longa("Limitações apontadas no PBL 7 e recomendação correspondente.",
                     r"L{0.7cm}L{6.6cm}L{2.1cm}L{2.3cm}L{1.2cm}",
                     ["Cód.", "Limitação", "Evidência", "Critérios", "Rec."], linhas, "tab:lim")


def melhorias(med):
    linhas = []
    for m in dados.MELHORIAS:
        verif = md(m["verificacao"])
        if m["cod"] == "M1":
            verif = esc(resultado_ci())
        linhas.append([m["cod"], "%s\\newline {\\footnotesize %s}" % (m["r"], esc(m["criterios"])),
                       md(m["mudanca"]) + r"\newline{\footnotesize Arquivos: %s}" % md(m["arquivos"]), verif])
    a = med["antes"]["relatorio"]
    return r"""
\section{Melhorias implementadas}\label{sec:melhorias}
A Tabela~\ref{tab:melhorias} registra as %(n)s melhorias da versão %(vd)s, com a recomendação de origem, os critérios
do PBL 3 e do PBL 4 envolvidos, os arquivos alterados e o teste ou a execução que confirma cada uma.

%(tab)s
\subsection{Decisão sobre o gargalo no roteiro (R9)}
O PBL 7 mostrou que, com o teto atuando, uma ação de outra dimensão passa à frente da ação do gargalo em 15,3\%% dos
perfis correlacionados simulados. Pôr a ação do gargalo sempre em primeiro lugar alteraria a regra de priorização
especificada no PBL 4 (CP-10) e o roteiro desses perfis, sem que nenhum gestor tenha pedido isso. O grupo preferiu
sinalizar: o resumo do diagnóstico começa pela ação do gargalo e o roteiro marca essa ação com um selo, enquanto a
ordem continua a do PBL 4. No caso Aurora, o gargalo é %(garg)s e sua ação já é a primeira depois da advertência. Se
os gestores da próxima rodada preferirem a outra opção, a mudança fica restrita à função \texttt{priorizar()} em
\texttt{js/nucleo.js} e aos testes do núcleo.

\subsection{Testes no branch publicado (R1)}
A página é publicada pelo GitHub Pages a partir do branch \texttt{mgp-pme-pagina-estatica}, no modo em que o próprio
GitHub monta o site a cada push. O workflow de testes só disparava em push para \texttt{main}, então o que ia ao ar não
passava pela suíte. Além disso, a execução do pull request \#4 terminou como falha por problema no arquivo do workflow,
sem iniciar nenhum job. A melhoria M1 faz os testes rodarem no branch publicado e restringe as permissões de publicação
ao job que publica. %(ci)sPara que uma falha nos testes também impeça a publicação, a fonte do GitHub Pages teria de
passar a ser o GitHub Actions. Essa é uma configuração do repositório e cabe ao dono dele.
""" % {"ci": frase_ci(), "n": len(dados.MELHORIAS), "vd": esc(med["depois"]["versao"]), "garg": ", ".join(a["gargalos"]),
       "tab": tabela_longa("Registro das melhorias da versão %s." % esc(med["depois"]["versao"]),
                           r"L{0.7cm}L{1.7cm}L{8.0cm}L{3.6cm}",
                           ["Cód.", "Origem", "Mudança", "Verificação"], linhas, "tab:melhorias")}


def frase_ci():
    ci = dados.CI
    if not ci["resultado"]:
        return ""
    return (r"No pull request desta etapa, aberto no fork \texttt{%s} (\#%s), o job de testes rodou no Node %s e "
            r"aprovou os %s testes; o job de publicação foi pulado, como deve acontecer num pull request. "
            % (esc(ci["repositorio"]), ci["pr"], esc(ci["node"]), ci["testes"]))


def resultado_ci():
    ci = dados.CI
    if not ci["resultado"]:
        return "Execução do workflow no pull request desta etapa (pendente no momento desta versão do relatório)."
    return "Pull request #%s do fork %s: workflow %s, %s de %s testes no Node %s." % (
        ci["pr"], ci["repositorio"], ci["resultado"], ci["testes"], ci["testes"], ci["node"])


def evidencias(med):
    a, d = med["antes"], med["depois"]
    ra, rd, pa, pd = a["relatorio"], d["relatorio"], a["pagina"], d["pagina"]
    linhas = [
        ["Testes automáticos (aprovados / total)", "%d / %d" % (a["testes"]["aprovados"], a["testes"]["total"]),
         "%d / %d" % (d["testes"]["aprovados"], d["testes"]["total"]), "R1 a R9"],
        ["Códigos de especificação ou regra expostos no relatório Aurora", str(ra["codigosExpostos"]),
         str(rd["codigosExpostos"]), "R2"],
        ["Palavras à vista no diagnóstico, sem abrir nada", inteiro(ra["palavrasSemAbrir"]),
         inteiro(rd["palavrasSemAbrir"]), "R3"],
        ["Palavras do relatório completo", inteiro(ra["palavrasTotal"]), inteiro(rd["palavrasTotal"]), "R3"],
        ["Seções recolhíveis no diagnóstico", str(ra["secoesRecolhidas"]), str(rd["secoesRecolhidas"]), "R3"],
        ["Botões visíveis na barra do diagnóstico (primários)",
         "%d (%d)" % (ra["botoesBarraVisiveis"], ra["botoesPrimarios"]),
         "%d (%d)" % (rd["botoesBarraVisiveis"], rd["botoesPrimarios"]), "R4"],
        ["Cartão de conclusão após o último item", sim_nao(pa["cartaoConclusao"]), sim_nao(pd["cartaoConclusao"]), "R4"],
        ["Entradas no topo do menu (rotas no total)", "%d (%d)" % (pa["menuTopo"], pa["menuRotas"]),
         "%d (%d)" % (pd["menuTopo"], pd["menuRotas"]), "R5"],
        ["Ação do gargalo sinalizada no roteiro", sim_nao(ra["gargaloSinalizado"]), sim_nao(rd["gargaloSinalizado"]), "R9"],
        ["Registro do tempo de preenchimento", sim_nao(pa["metricasUso"]), sim_nao(pd["metricasUso"]), "R7"],
        ["Testes no branch publicado", sim_nao(pa["ciNoBranchPublicado"]), sim_nao(pd["ciNoBranchPublicado"]), "R1"],
        ["Peso total da página", kib(pa["bytes"]["total"]), kib(pd["bytes"]["total"]), "---"],
        ["Recursos externos; chamadas de rede no código", "%d; %d" % (pa["recursosExternos"], pa["chamadasRede"]),
         "%d; %d" % (pd["recursosExternos"], pd["chamadasRede"]), "---"],
        ["Nível, gargalo e passos do roteiro (Aurora)",
         "%d; %s; %d" % (ra["nivelFinal"], ", ".join(ra["gargalos"]), ra["passosRoteiro"]),
         "%d; %s; %d" % (rd["nivelFinal"], ", ".join(rd["gargalos"]), rd["passosRoteiro"]), "---"],
    ]
    linhas = [[esc(c) if i == 0 else c for i, c in enumerate(l)] for l in linhas]
    reducao = 100 * (1 - rd["palavrasSemAbrir"] / ra["palavrasSemAbrir"])
    acrescimo = rd["palavrasTotal"] - ra["palavrasTotal"]

    n = {"cod_antes": str(ra["codigosExpostos"]), "cod_depois": str(rd["codigosExpostos"]),
         "pal_antes": inteiro(ra["palavrasSemAbrir"]), "pal_depois": inteiro(rd["palavrasSemAbrir"])}
    parciais = [[r"\textbf{%s}\newline{\footnotesize %s}" % (p["cod"], esc(p["nome"])), esc(p["lacuna"]),
                 esc(p["agora"].format(**n)), esc(p["pendente"])] for p in dados.PARCIAIS]

    return r"""
\section{Evidências da evolução}\label{sec:evidencias}
\subsection{Medições antes e depois}
A Tabela~\ref{tab:antesdepois} compara a versão avaliada no PBL 7 com a versão %(vd)s. As medidas do relatório usam o
caso Aurora, renderizado pela função \texttt{renderDiagnostico()} de cada versão; para contar o que fica à vista, o
conteúdo das seções recolhidas é descontado e os títulos delas, mantidos.

%(tab)s
O texto que o gestor encontra ao abrir o diagnóstico caiu %(red)s. O relatório completo ficou com %(acr)s palavras a
mais, que são o resumo e as linhas de apoio dos títulos recolhidos, e nada do conteúdo anterior foi retirado. A página
cresceu %(peso)s e continua sem recursos externos, com uma única chamada de rede (a leitura de \texttt{dados.json}).

\subsection{Telas antes e depois}
As Figuras~\ref{fig:diag-antes} e~\ref{fig:diag-depois} mostram o começo do diagnóstico do caso Aurora nas duas
versões, recortado na mesma altura. Na versão avaliada, esse trecho trazia a barra com três botões, o aviso de
exportação e o perfil por dimensão. Na versão nova, ele traz o nível, o gargalo e os três primeiros passos, com os
detalhes recolhidos logo abaixo. As Figuras~\ref{fig:quest} e~\ref{fig:menu} mostram o fim do questionário e o menu.

\begin{figure}[H]
\centering
\captura{%(ld)s}{%(f)s/antes-diagnostico-recorte.png}
\caption{Começo do diagnóstico do caso Aurora na versão %(va)s.}\label{fig:diag-antes}
\end{figure}

\begin{figure}[H]
\centering
\captura{%(ld)s}{%(f)s/depois-diagnostico-recorte.png}
\caption{Começo do diagnóstico do caso Aurora na versão %(vd)s.}\label{fig:diag-depois}
\end{figure}

\begin{figure}[H]
\centering
\captura{12.5}{%(f)s/antes-questionario-recorte.png}\par\small (a) versão %(va)s\par\vspace{6pt}
\captura{12.5}{%(f)s/depois-questionario-recorte.png}\par\small (b) versão %(vd)s
\caption{Fim do questionário, com os 30 itens respondidos.}\label{fig:quest}
\end{figure}

\begin{figure}[H]
\centering
\captura{%(lt)s}{%(f)s/antes-menu-recorte.png}\par\small (a) versão %(va)s\par\vspace{6pt}
\captura{%(lt)s}{%(f)s/depois-menu-recorte.png}\par\small (b) versão %(vd)s, com o grupo Pesquisa aberto
\caption{Topo da página.}\label{fig:menu}
\end{figure}

\subsection{Situação dos critérios parciais}
Pela regra de vereditos do PBL 7, um critério com queixa da usuária (E3) só deixa de ser parcial com uma nova coleta.
Os vereditos ficam, portanto, como estavam. A Tabela~\ref{tab:parciais} mostra, para cada critério parcial, o que mudou
no artefato e o que ainda falta para reavaliá-lo.

%(tabp)s
\subsection{O que não mudou}
Os %(ta)s testes da versão avaliada continuam na suíte sem alteração e passam. O caso Aurora dá o mesmo nível
(%(niv)d), o mesmo gargalo (%(garg)s) e o mesmo roteiro de %(passos)d passos nas duas versões, na mesma ordem. Como
\texttt{js/nucleo.js} e \texttt{dados.json} não mudaram, os resultados da simulação do PBL 7 (E4) valem também para a
versão %(vd)s.
""" % {"vd": esc(d["versao"]), "va": esc(a["versao"]), "f": "figuras", "ld": "13.5", "lt": "%.1f" % LARGURA_TEXTO,
       "tab": tabela("Medidas da versão avaliada e da versão %s (E1, E2)." % esc(d["versao"]),
                     r"XL{2.3cm}L{2.3cm}L{1.4cm}",
                     ["Medida", "Versão %s" % esc(a["versao"]), "Versão %s" % esc(d["versao"]), "Rec."],
                     linhas, "tab:antesdepois"),
       "red": pct(reducao), "acr": inteiro(acrescimo),
       "peso": kib(pd["bytes"]["total"] - pa["bytes"]["total"]),
       "tabp": tabela("Critérios parciais do PBL 7 depois das melhorias.",
                            r"L{2.4cm}L{3.6cm}XL{2.9cm}",
                            ["Critério", "Lacuna no PBL 7", "O que mudou", "O que falta"], parciais, "tab:parciais"),
       "ta": a["testes"]["total"], "niv": rd["nivelFinal"], "garg": ", ".join(rd["gargalos"]),
       "passos": rd["passosRoteiro"]}


def proximo_ciclo():
    linhas = [[p["r"], esc(p["o_que"]), esc(p["por_que"]), esc(p["como"])] for p in dados.PROXIMO_CICLO]
    return r"""
\section{O que fica para o próximo ciclo}\label{sec:proximo}
As recomendações da Tabela~\ref{tab:prox} dependem de pessoas de fora do grupo ou de mais opiniões. A página já tem o
que elas pedem do lado do artefato: o protocolo de avaliação por especialistas, desde o PBL 4, e o registro de tempo e
de uso do guia, desde esta etapa.

%s""" % tabela("Recomendações para o próximo ciclo.", r"L{0.9cm}L{3.6cm}XL{4.2cm}",
                     ["Rec.", "O que", "Por que ficou", "Como fazer"], linhas, "tab:prox")


def conclusao(med):
    a, d = med["antes"], med["depois"]
    sit = contagem_situacoes()
    return r"""
\section{Versão consolidada e conclusão}
A versão %(vd)s é a versão consolidada do MGP-PME ao fim desta etapa. Ela implementa %(impl)d das %(n)d recomendações
do PBL 7 e parte de uma outra (R7), mantém o modelo e o núcleo de cálculo da versão avaliada e passa nos %(td)s testes
da suíte. As queixas da respondente que tinham causa no código foram tratadas: os códigos saíram da tela, o diagnóstico
abre por um resumo, o fim do questionário leva a um único próximo passo e o menu separa as telas do gestor das telas da
pesquisa.

O próximo ciclo depende sobretudo de coleta. Os vereditos parciais só devem mudar quando outros gestores usarem a
versão nova e responderem o questionário, e a validade do conteúdo continua à espera da revisão por especialistas.

\subsection{Limitações}
\begin{itemize}
  \item Os ganhos de uso foram medidos por contagens sobre o relatório renderizado (palavras, botões, códigos), e
        nenhuma pessoa usou a versão nova ainda. Menos palavras à vista não garantem leitura mais rápida.
  \item As medições usam só o caso Aurora. Perfis com mais advertências geram resumos um pouco mais longos.
  \item A decisão de sinalizar o gargalo, em vez de reordenar o roteiro, foi do grupo e ainda precisa ser testada com
        gestores.
  \item O registro de tempo depende de o gestor exportar o diagnóstico e entregar o arquivo à equipe.
  \item A publicação continua sem depender dos testes enquanto a fonte do GitHub Pages for o branch (Seção 3.2).
\end{itemize}
""" % {"vd": esc(d["versao"]), "impl": len(sit["Implementada"]), "n": len(dados.RECOMENDACOES),
       "td": d["testes"]["total"]}


def referencias():
    itens = "\n".join(r"\item %s" % esc(r) for r in dados.REFERENCIAS)
    return r"""
\section*{Referências}
\markboth{Referências}{Referências}
\addcontentsline{toc}{section}{Referências}
\begin{list}{}{\leftmargin=1.2em\itemindent=-1.2em\itemsep=3pt\parsep=0pt}
%s
\end{list}
""" % itens


# ---------------------------------------------------------------- montagem
def montar_documento(med):
    commit, sujo, ramo = codigo_da_versao()
    corpo = "".join([
        capa(dados.DOCUMENTO, commit, sujo, ramo, med),
        resumo(med), sumario(), introducao(med), limitacoes(), melhorias(med), evidencias(med),
        proximo_ciclo(), conclusao(med), referencias(),
    ])
    return montar(corpo, dados.DOCUMENTO["titulo"], dados.DOCUMENTO["cabecalho"])


def gerar():
    med = json.loads(MEDIDAS.read_text(encoding="utf-8"))
    fonte = montar_documento(med)
    compile_tex(fonte, NOME_TEX, PDF, ENTREGAS_TEX / (NOME_TEX + ".tex"))
    return PDF


if __name__ == "__main__":
    print(gerar())
