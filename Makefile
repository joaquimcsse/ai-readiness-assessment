# Relatório de melhorias do MGP-PME (PBL 8). O artefato em si não precisa de
# build: é a página estática na raiz. Este Makefile só gera o relatório.
# Tudo em entregas/ é artefato de build: corrija em pipeline/, nunca no .tex.

PY   := python3
PIPE := pipeline

.DEFAULT_GOAL := all

## all: gera o relatório e roda as verificações (alvo padrão)
all: build check

## build: mede as duas versões, captura as telas e compila o PDF
build:
	cd $(PIPE) && $(PY) build_all.py

## check: verificações automáticas (testes, caso Aurora, códigos, .tex isolado)
check:
	cd $(PIPE) && $(PY) verificar.py

## qa: converte o PDF em PNG, uma imagem por página, para a revisão visual
qa:
	cd $(PIPE) && $(PY) qa.py

## medir: imprime as medidas da versão atual
medir:
	node $(PIPE)/medir.mjs .

## test: roda a suíte de testes do artefato
test:
	node --test

## deps: confere os programas externos do pipeline
deps:
	cd $(PIPE) && $(PY) paths.py

## clean: apaga build/ (regenerável)
clean:
	rm -rf build
	find $(PIPE) -name '__pycache__' -type d -exec rm -rf {} +

## help: mostra estes alvos
help:
	@grep -E '^## ' $(MAKEFILE_LIST) | sed 's/## /  make /'

.PHONY: all build check qa medir test deps clean help
