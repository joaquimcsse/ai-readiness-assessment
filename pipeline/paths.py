# -*- coding: utf-8 -*-
"""Caminhos do pipeline do relatório, todos derivados da posição deste arquivo.

Nenhum script do pipeline pode conter caminho absoluto: o repositório pode ser
clonado em qualquer lugar que tudo continua funcionando.

Layout:
    <raiz>/                o artefato (index.html, js/, css/, dados.json, tests/)
    <raiz>/pipeline/       este código
    <raiz>/build/          tudo que é regerável (no .gitignore)
    <raiz>/entregas/       o PDF final e o .tex pronto para o Overleaf
"""
import shutil
from pathlib import Path

RAIZ = Path(__file__).resolve().parent.parent
PIPELINE = RAIZ / "pipeline"

# Versão avaliada no PBL 7 (o relatório de avaliação cita o commit 3155fb3 com
# alterações locais; elas foram publicadas em 9addc6d, e b9668a4 é o merge).
COMMIT_BASE = "b9668a4"

# --- intermediários (regeráveis) ---
BUILD = RAIZ / "build"
TEX_BUILD = BUILD / "tex"
CAPTURA = BUILD / "captura"        # sites-envelope e PNGs das telas
QA = BUILD / "qa"
MEDIDAS = BUILD / "medidas.json"   # saída de medir.mjs para as duas versões

# --- entregáveis ---
ENTREGAS = RAIZ / "entregas"
ENTREGAS_TEX = ENTREGAS / "tex"
PDF = ENTREGAS / "Melhorias-MGP-PME.pdf"
NOME_TEX = "Melhorias-MGP-PME"

_DIRS = [BUILD, TEX_BUILD, CAPTURA, QA, ENTREGAS, ENTREGAS_TEX]


def preparar():
    """Cria os diretórios de trabalho. Idempotente."""
    for d in _DIRS:
        d.mkdir(parents=True, exist_ok=True)


DEPENDENCIAS = [
    ("node", "rodar os testes e medir as versões do artefato"),
    ("git", "extrair a versão-base para a comparação"),
    ("pdflatex", "compilar o relatório (TeX Live)"),
    ("firefox", "capturar as telas antes e depois (headless)"),
    ("pdftoppm", "gerar as páginas em PNG para a revisão visual (poppler)"),
]


def checar_dependencias():
    return ["%s -- %s" % (p, para) for p, para in DEPENDENCIAS if not shutil.which(p)]


if __name__ == "__main__":
    print("raiz:", RAIZ)
    pend = checar_dependencias()
    if pend:
        print("\nDependências faltando:")
        for p in pend:
            print("  -", p)
        raise SystemExit(1)
    print("todas as dependências externas estão presentes.")
