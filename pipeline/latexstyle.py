# -*- coding: utf-8 -*-
"""Preâmbulo LaTeX do relatório, no mesmo formato do relatório de avaliação do
PBL 7: Times no texto, Helvetica nos títulos e cabeçalhos de tabela, fio no
cabeçalho com o nome do documento à esquerda e a seção à direita, páginas
"n de N", capa com ficha e tabelas em booktabs com a legenda no topo.

Adaptado de gpma_ensw/pipeline/latexstyle.py (mesmo esc() e compile_tex()).
Preto e branco: nenhuma cor; as capturas de tela são a única exceção."""
import os
import shutil
import subprocess

from paths import TEX_BUILD

PREAMBULO = r"""%==============================================================================
%  MGP-PME --- @@TITULO@@
%  Pesquisa Aplicada --- PUCPR --- Grupo G02
%  Gerado por pipeline/build_tex_melhorias.py; compilacao: pdfLaTeX
%==============================================================================
\documentclass[11pt,a4paper]{article}

\usepackage[T1]{fontenc}
\usepackage[utf8]{inputenc}
\usepackage[brazilian]{babel}

\usepackage{mathptmx}
\usepackage[scaled=0.92]{helvet}
\usepackage{microtype}

\usepackage[a4paper,top=2.6cm,bottom=2.6cm,left=2.6cm,right=2.6cm]{geometry}
\usepackage{fancyhdr}
\usepackage{titlesec}
\usepackage{titletoc}
\usepackage{enumitem}
\usepackage{graphicx}
\usepackage{booktabs}
\usepackage{tabularx}
\usepackage{longtable}
\usepackage{array}
\usepackage{amssymb}
\usepackage[font=small,labelfont=bf,skip=6pt]{caption}
\usepackage{float}
\usepackage{needspace}
\usepackage{lastpage}
\usepackage[hidelinks]{hyperref}

% ---------- Titulos ----------
\titleformat{\section}{\sffamily\large\bfseries}{\thesection}{0.8em}{}
\titleformat{\subsection}{\sffamily\normalsize\bfseries}{\thesubsection}{0.7em}{}
\titlespacing*{\section}{0pt}{2.4ex plus 1ex minus .2ex}{1.1ex plus .2ex}
\titlespacing*{\subsection}{0pt}{1.8ex plus 1ex minus .2ex}{0.8ex plus .2ex}
\newcommand{\rotulo}[1]{\par\needspace{3\baselineskip}\vspace{0.4em}{\sffamily\bfseries #1}\par\nopagebreak\vspace{-0.4em}}

% ---------- Sumario ----------
\renewcommand{\contentsname}{Sum\'ario}
\titlecontents{section}[1.5em]{\addvspace{6pt}\sffamily\bfseries}
  {\contentslabel{1.5em}}{\hspace*{-1.5em}}{\hfill\contentspage}
\titlecontents{subsection}[3.6em]{}{\contentslabel{2.1em}}{}
  {\titlerule*[0.6pc]{.}\contentspage}

% ---------- Cabecalho e rodape ----------
\pagestyle{fancy}
\fancyhf{}
\renewcommand{\headrulewidth}{0.4pt}
% \rightmark devolve a primeira marca da página: o cabeçalho mostra a seção em
% que a página começa, como no relatório de avaliação
\renewcommand{\sectionmark}[1]{\markboth{\thesection\quad #1}{\thesection\quad #1}}
\renewcommand{\subsectionmark}[1]{}
\fancyhead[L]{\sffamily\footnotesize @@CABECALHO@@}
\fancyhead[R]{\sffamily\footnotesize\nouppercase{\rightmark}}
\fancyfoot[C]{\sffamily\footnotesize\thepage}
\newcommand{\paginacaocorpo}{\fancyfoot[C]{\sffamily\footnotesize\thepage{} de \pageref*{LastPage}}}

% ---------- Tabelas ----------
\renewcommand{\arraystretch}{1.25}
\newcolumntype{L}[1]{>{\raggedright\arraybackslash}p{#1}}
\renewcommand{\tabularxcolumn}[1]{>{\raggedright\arraybackslash}p{#1}}
\newcommand{\thead}[1]{\sffamily\bfseries\small #1}
\setlength{\LTpre}{8pt}
\setlength{\LTpost}{6pt}

% ---------- Captura de tela ----------
% contorno fino: a captura tem fundo escuro e borda propria, mas o fio separa
% duas capturas lado a lado. #1 = largura em cm  #2 = arquivo
\newcommand{\captura}[2]{{\setlength{\fboxsep}{0pt}\setlength{\fboxrule}{0.4pt}%
  \fbox{\includegraphics[width=\dimexpr#1cm-2\fboxrule\relax]{#2}}}}

\setlist{itemsep=2pt,topsep=4pt}
% parágrafos sem recuo e com espaço entre eles, como no relatório de avaliação
\setlength{\parindent}{0pt}
\setlength{\parskip}{0.55em plus 0.1em}

\begin{document}
"""

_TEX_ESPECIAIS = {
    "&": r"\&", "%": r"\%", "$": r"\$", "#": r"\#", "_": r"\_",
    "{": r"\{", "}": r"\}", "~": r"\textasciitilde{}", "^": r"\textasciicircum{}",
}


def esc(s):
    """Escapa caracteres especiais do LaTeX em texto puro vindo dos dados.
    NÃO usar em strings que já contêm marcação LaTeX própria."""
    out = []
    aspas_abertas = True
    for c in str(s):
        if c == "\\":
            out.append(r"\textbackslash{}")
        elif c == '"':
            out.append("``" if aspas_abertas else "''")
            aspas_abertas = not aspas_abertas
        elif c in _TEX_ESPECIAIS:
            out.append(_TEX_ESPECIAIS[c])
        else:
            out.append(c)
    return "".join(out)


def md(s):
    """Escapa e converte `código` em \\texttt e *ênfase* em \\emph."""
    import re
    partes = re.split(r"(`[^`]+`)", str(s))
    saida = []
    for p in partes:
        if p.startswith("`") and p.endswith("`"):
            # "-{}-" impede que "--" vire traço na fonte monoespaçada
            saida.append(r"\texttt{%s}" % esc(p[1:-1]).replace("--", "-{}-"))
        else:
            t = esc(p)
            t = re.sub(r"\*([^*]+)\*", r"\\emph{\1}", t)
            saida.append(t)
    return "".join(saida)


def montar(corpo, titulo, cabecalho):
    pre = PREAMBULO.replace("@@TITULO@@", titulo).replace("@@CABECALHO@@", cabecalho)
    return pre + corpo + "\n\\end{document}\n"


def compile_tex(fonte, nome, pdf_saida, tex_saida=None):
    """Compila três vezes (sumário, LastPage e referências estabilizam) e publica
    o PDF e o .tex nos entregáveis. As figuras são copiadas junto do .tex."""
    os.makedirs(TEX_BUILD, exist_ok=True)
    for velho in TEX_BUILD.glob(nome + ".*"):
        if velho.suffix in (".aux", ".toc", ".out", ".log"):
            velho.unlink()
    src = TEX_BUILD / (nome + ".tex")
    src.write_text(fonte, encoding="utf-8")
    for i in range(3):
        r = subprocess.run(
            ["pdflatex", "-interaction=nonstopmode", "-halt-on-error", "-output-directory", str(TEX_BUILD), str(src)],
            cwd=TEX_BUILD, capture_output=True, timeout=180)
        saida = (r.stdout or b"").decode("utf-8", errors="replace")
        if r.returncode != 0:
            raise RuntimeError("pdflatex falhou em %s (passada %d):\n%s" % (nome, i + 1, saida[-6000:]))
    os.makedirs(os.path.dirname(pdf_saida), exist_ok=True)
    shutil.copyfile(TEX_BUILD / (nome + ".pdf"), pdf_saida)
    if tex_saida:
        os.makedirs(os.path.dirname(tex_saida), exist_ok=True)
        shutil.copyfile(src, tex_saida)
    return pdf_saida
