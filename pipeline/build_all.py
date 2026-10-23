# -*- coding: utf-8 -*-
"""Orquestra o relatório: extrai a versão-base, mede as duas versões, captura as
telas, monta o .tex e compila o PDF.

A versão-base é extraída num diretório temporário fora do repositório: dentro
dele, o `node --test` da raiz acharia os testes da base e os rodaria junto."""
import json
import shutil
import subprocess
import sys
import tempfile
from pathlib import Path

import build_tex_melhorias
import capturar
from paths import (CAPTURA, COMMIT_BASE, ENTREGAS_TEX, MEDIDAS, PIPELINE, RAIZ, TEX_BUILD,
                   checar_dependencias, preparar)


def extrair_base(destino):
    arquivo = subprocess.run(["git", "archive", COMMIT_BASE], cwd=RAIZ, capture_output=True, check=True).stdout
    subprocess.run(["tar", "-x", "-C", str(destino)], input=arquivo, check=True)


def medir(diretorio):
    r = subprocess.run(["node", str(PIPELINE / "medir.mjs"), str(diretorio)], capture_output=True, text=True, timeout=600)
    if r.returncode != 0:
        raise RuntimeError("medir.mjs falhou em %s:\n%s" % (diretorio, r.stderr[-3000:]))
    return json.loads(r.stdout)


def publicar_figuras(capturas):
    for destino in (TEX_BUILD / "figuras", ENTREGAS_TEX / "figuras"):
        destino.mkdir(parents=True, exist_ok=True)
        for telas in capturas.values():
            for png in telas.values():
                shutil.copyfile(png, destino / png.name)


def main():
    pend = checar_dependencias()
    if pend:
        print("Dependências faltando:\n  " + "\n  ".join(pend))
        return 1
    preparar()
    with tempfile.TemporaryDirectory(prefix="mgp-pme-base-") as tmp:
        base = Path(tmp)
        extrair_base(base)
        print("medindo a versão-base (%s)..." % COMMIT_BASE)
        antes = medir(base)
        print("medindo a versão atual...")
        depois = medir(RAIZ)
        modelo = json.loads((RAIZ / "dados.json").read_text(encoding="utf-8"))["versao_modelo"]
        MEDIDAS.write_text(json.dumps({"base": COMMIT_BASE, "modelo": modelo, "antes": antes, "depois": depois},
                                      ensure_ascii=False, indent=2), encoding="utf-8")
        print("capturando as telas...")
        capturas = capturar.capturar({"antes": base, "depois": RAIZ})
    publicar_figuras(capturas)
    print("compilando o relatório...")
    print(build_tex_melhorias.gerar())
    return 0


if __name__ == "__main__":
    sys.exit(main())
