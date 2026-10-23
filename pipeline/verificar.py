# -*- coding: utf-8 -*-
"""Verificações automáticas do relatório e da comparação antes × depois.

Reprova (código 1) se: o PDF não existe ou é mais velho que as medidas; algum
teste da versão atual falha ou a suíte encolheu; o caso Aurora mudou de nível,
gargalo ou roteiro (o núcleo não podia mudar nesta etapa); ainda há código de
regra exposto na tela do gestor; uma melhoria cita arquivo que não existe; um
texto dos dados traz número digitado em vez de campo das medidas; ou o .tex
publicado não compila isolado, como no Overleaf."""
import json
import re
import shutil
import subprocess
import sys
import tempfile
from pathlib import Path

import melhorias_data as dados
from paths import ENTREGAS_TEX, MEDIDAS, NOME_TEX, PDF, RAIZ

falhas = []


def conferir(cond, msg):
    print(("  ok    " if cond else "  FALHA ") + msg)
    if not cond:
        falhas.append(msg)


def main():
    conferir(MEDIDAS.exists() and PDF.exists(), "medidas e PDF gerados (rode 'make build')")
    if falhas:
        return 1
    conferir(PDF.stat().st_mtime >= MEDIDAS.stat().st_mtime, "PDF mais novo que build/medidas.json")
    med = json.loads(MEDIDAS.read_text(encoding="utf-8"))
    a, d = med["antes"], med["depois"]

    conferir(d["testes"]["falhas"] == 0 and d["testes"]["aprovados"] == d["testes"]["total"],
             "versão atual: %d de %d testes aprovados" % (d["testes"]["aprovados"], d["testes"]["total"]))
    conferir(d["testes"]["total"] > a["testes"]["total"], "a suíte cresceu (%d -> %d)" % (a["testes"]["total"], d["testes"]["total"]))
    for campo in ("nivelFinal", "gargalos", "roteiro"):
        conferir(a["relatorio"][campo] == d["relatorio"][campo], "caso Aurora: %s igual nas duas versões" % campo)
    conferir(d["relatorio"]["codigosExpostos"] == 0, "nenhum código de regra exposto ao gestor")
    conferir(d["relatorio"]["botoesPrimarios"] == 1, "um único botão primário no diagnóstico")
    conferir(d["pagina"]["recursosExternos"] == 0 and d["pagina"]["chamadasRede"] == a["pagina"]["chamadasRede"],
             "sem recurso externo nem chamada de rede nova")

    for m in dados.MELHORIAS:
        for arq in re.findall(r"`([^`]+)`", m["arquivos"]):
            conferir((RAIZ / arq).exists(), "%s: %s existe" % (m["cod"], arq))
    for r in dados.RECOMENDACOES:
        conferir(r["situacao"] in dados.SITUACOES, "%s: situação válida" % r["r"])
        if r["situacao"] != "Próximo ciclo":
            conferir(any(m["cod"] == r["m"] for m in dados.MELHORIAS), "%s: melhoria registrada" % r["r"])
    for p in dados.PARCIAIS:
        sem_campos = re.sub(r"\{[^}]+\}", "", p["agora"])
        conferir(not re.search(r"\d", sem_campos), "%s: número da medição vem de campo, não digitado" % p["cod"])

    # o .tex publicado compila sozinho, com as figuras ao lado
    with tempfile.TemporaryDirectory() as tmp:
        for item in ENTREGAS_TEX.iterdir():
            (shutil.copytree if item.is_dir() else shutil.copyfile)(item, Path(tmp) / item.name)
        r = subprocess.run(["pdflatex", "-interaction=nonstopmode", "-halt-on-error", NOME_TEX + ".tex"],
                           cwd=tmp, capture_output=True, timeout=180)
        conferir(r.returncode == 0, "entregas/tex/%s.tex compila isolado" % NOME_TEX)

    print("\n%s" % ("tudo certo." if not falhas else "%d verificação(ões) falharam." % len(falhas)))
    return 1 if falhas else 0


if __name__ == "__main__":
    sys.exit(main())
