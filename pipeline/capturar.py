# -*- coding: utf-8 -*-
"""Capturas de tela antes × depois: versão-base e versão atual, no Firefox headless.

Para cada versão monta em build/captura/<versão>/ uma cópia da página em que
js/app.js é trocado por um envelope (captura.js). O envelope importa os módulos
da própria versão, monta o caso Aurora e desenha a tela pedida de forma
síncrona, porque o Firefox fotografa no evento load e o app real só desenha
depois de buscar dados.json. O modelo entra como módulo (modelo.js) pelo mesmo
motivo. Tudo é servido por http.server local: a CSP da página continua valendo.

O Firefox sai com código 0 mesmo quando o script quebra; por isso o envelope
pinta a página de magenta em qualquer erro e aqui se procura essa cor, além de
conferir que a imagem não saiu em branco ou só com o fundo.
"""
import functools
import http.server
import json
import shutil
import socketserver
import subprocess
import tempfile
import threading
from pathlib import Path

from PIL import Image

from paths import CAPTURA

LARGURA = 1000        # px; numa figura de 15,8 cm, o texto de 16 px sai com ~7 pt
MAGENTA = (255, 0, 255)

# tela -> (altura da janela em px CSS, parâmetros)
TELAS = {
    "diagnostico": 1180,
    "questionario": 760,
    "menu": 420,
}

ENVELOPE = r"""// Envelope de captura (gerado por pipeline/capturar.py; não faz parte do artefato).
import modelo from './modelo.js';
import { diagnosticar } from './js/nucleo.js';
import { renderDiagnostico } from './js/painel.js';
import { renderQuestionario } from './js/coleta.js';

window.addEventListener('error', () => { document.body.style.background = '#ff00ff'; });
try {
  const tela = new URLSearchParams(location.search).get('tela');
  const AURORA = { D0: [4, 4, 3, 3], D1: [2, 2, 1, 2, 2], D2: [4, 5, 4, 3, 4], D3: [3, 2, 3, 3, 2, 3], D4: [2, 3, 2, 3, 2], D5: [4, 4, 3, 2, 3] };
  const respostas = {};
  for (const d of modelo.dimensoes) {
    modelo.itens.filter(i => i.dimensao === d.codigo).forEach((it, k) => { respostas[it.codigo] = AURORA[d.codigo][k]; });
  }
  const app = {
    id: 'APL-CAPTURA', versaoModelo: modelo.versao_modelo, data: '2026-09-13', respondente: 'Demonstração',
    respostas, responsaveis: {}, diagnostico: null, estado: 'Completa', anterior: null, origem: 'local',
    empresa: { identificador: 'Metalmecânica Aurora (caso ilustrativo)', setor: 'Indústria metalmecânica', porte: 'pequena', funcionarios: 42 },
  };
  const principal = document.getElementById('conteudo');
  const el = document.createElement('div');
  el.className = 'tela';
  principal.replaceChildren(el);
  const nada = () => {};
  const rotaAtiva = tela === 'menu' ? 'avaliacao' : 'aplicacao';
  document.querySelectorAll('.menu a').forEach(a => a.classList.toggle('ativo', a.dataset.rota === rotaAtiva));
  if (tela === 'questionario') {
    renderQuestionario(el, { modelo, app, blocoInicial: 2, aoResponder: nada, aoGerar: nada, aoEditarFicha: nada });
    // só o fim do último bloco interessa: o último item, o que vem depois e a barra
    const blocos = [...el.querySelectorAll('.dimensao-bloco')];
    blocos.slice(0, -1).forEach(b => b.remove());
    const itens = [...el.querySelectorAll('.item')];
    itens.slice(0, -1).forEach(i => i.remove());
    el.querySelector('.cabecalho-quest')?.remove();
    el.querySelector('.dim-cab p')?.remove();
  } else {
    app.diagnostico = { ...diagnosticar(respostas, modelo, { data: app.data }), geradoEm: '2026-09-13T12:00:00Z' };
    app.estado = 'Diagnosticada';
    renderDiagnostico(el, { modelo, app, temAnteriores: false, aoExportar: nada, aoCorrigir: nada, aoReaplicar: nada, aoComparar: nada, aoResponsavel: nada });
    if (tela === 'menu') {
      const grupo = document.getElementById('menu-pesquisa');
      if (grupo) { grupo.open = true; grupo.querySelector('summary').classList.add('ativo'); }
    }
  }
  document.querySelectorAll('.barra-progresso').forEach(b => { b.style.position = 'static'; });
  document.documentElement.style.scrollbarWidth = 'none';
} catch (e) {
  document.body.style.background = '#ff00ff';
  document.body.textContent = String(e && e.stack || e);
}
"""


def montar_site(origem, destino):
    """Copia a página de `origem` para `destino`, trocando app.js pelo envelope."""
    if destino.exists():
        shutil.rmtree(destino)
    destino.mkdir(parents=True)
    for nome in ("css", "js"):
        shutil.copytree(origem / nome, destino / nome)
    modelo = json.loads((origem / "dados.json").read_text(encoding="utf-8"))
    (destino / "modelo.js").write_text("export default " + json.dumps(modelo, ensure_ascii=False) + ";\n",
                                        encoding="utf-8")
    (destino / "captura.js").write_text(ENVELOPE, encoding="utf-8")
    html = (origem / "index.html").read_text(encoding="utf-8")
    alvo = '<script type="module" src="js/app.js"></script>'
    if alvo not in html:
        raise RuntimeError("index.html de %s sem o script js/app.js" % origem)
    (destino / "index.html").write_text(html.replace(alvo, '<script type="module" src="captura.js"></script>'),
                                        encoding="utf-8")


class _Silencioso(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *args):
        pass


def _servidor(raiz):
    handler = functools.partial(_Silencioso, directory=str(raiz))
    srv = socketserver.TCPServer(("127.0.0.1", 0), handler)
    threading.Thread(target=srv.serve_forever, daemon=True).start()
    return srv


def _conferir(png):
    img = Image.open(png).convert("RGB")
    pequena = img.resize((img.width // 8, img.height // 8))
    cores = pequena.getcolors(maxcolors=1 << 16) or []
    if any(c == MAGENTA for _, c in cores):
        raise RuntimeError("%s: a página acusou erro (magenta)" % png.name)
    if len(cores) < 20:
        raise RuntimeError("%s: captura sem conteúdo (%d cores)" % (png.name, len(cores)))
    return img.size


# Recorte de cada tela para o papel: (topo, base) em px. None na base = até o
# fim do conteúdo (as linhas finais da cor de fundo são descartadas).
CORTES = {
    "diagnostico": (0, 1060),
    "questionario": (150, None),
    "menu": (0, 240),
}


def recortar(png, tela):
    img = Image.open(png).convert("RGB")
    topo, base = CORTES[tela]
    if base is None:
        fundo = img.getpixel((img.width - 2, img.height - 2))
        base = img.height
        while base > topo + 10:
            linha = img.crop((0, base - 1, img.width, base)).getcolors(maxcolors=1 << 16) or []
            if len(linha) > 1 or linha[0][1] != fundo:
                break
            base -= 1
        base = min(img.height, base + 12)
    destino = png.with_name(png.stem + "-recorte.png")
    img.crop((0, topo, img.width, base)).save(destino)
    return destino


def capturar(versoes):
    """versoes: {rótulo: diretório da versão}. Devolve {rótulo: {tela: png recortado}}."""
    CAPTURA.mkdir(parents=True, exist_ok=True)
    for rotulo, origem in versoes.items():
        montar_site(Path(origem), CAPTURA / rotulo)
    srv = _servidor(CAPTURA)
    porta = srv.server_address[1]
    saida = {}
    try:
        for rotulo in versoes:
            saida[rotulo] = {}
            for tela, altura in TELAS.items():
                png = CAPTURA / ("%s-%s.png" % (rotulo, tela))
                if png.exists():
                    png.unlink()
                with tempfile.TemporaryDirectory() as perfil:
                    Path(perfil, "user.js").write_text('user_pref("browser.shell.checkDefaultBrowser", false);\n')
                    url = "http://127.0.0.1:%d/%s/index.html?tela=%s" % (porta, rotulo, tela)
                    r = subprocess.run(
                        ["firefox", "--headless", "--no-remote", "--profile", perfil,
                         "--window-size=%d,%d" % (LARGURA, altura), "--screenshot", str(png), url],
                        capture_output=True, timeout=180)
                if not png.exists():
                    raise RuntimeError("Firefox não gerou %s:\n%s" % (
                        png.name, (r.stderr or b"").decode("utf-8", errors="replace")[-1500:]))
                tam = _conferir(png)
                saida[rotulo][tela] = recortar(png, tela)
                print("  captura %-28s %dx%d" % (png.name, *tam))
    finally:
        srv.shutdown()
        srv.server_close()
    return saida


if __name__ == "__main__":
    import sys
    from paths import RAIZ
    capturar({"depois": RAIZ} if len(sys.argv) < 2 else {"antes": Path(sys.argv[1]), "depois": RAIZ})
