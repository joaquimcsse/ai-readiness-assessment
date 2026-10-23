# -*- coding: utf-8 -*-
"""Converte o relatório em PNG, uma imagem por página, em build/qa/.

A revisão é manual e obrigatória: olhe TODAS as páginas, não só a primeira."""
import subprocess

from paths import PDF, QA, preparar

DPI = 72


def main():
    preparar()
    for f in QA.glob("*.png"):
        f.unlink()
    subprocess.run(["pdftoppm", "-r", str(DPI), "-png", str(PDF), str(QA / "pagina")], check=True)
    n = len(list(QA.glob("*.png")))
    print("%d páginas em %s; revise todas." % (n, QA))


if __name__ == "__main__":
    main()
