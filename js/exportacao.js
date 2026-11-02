// exportacao.js — diálogo "Exportar diagnóstico" (UC-08, CP-13). Oferece os dois
// arquivos: o relatório em PDF, para ler e compartilhar, com a planilha anexada;
// e a planilha de dados (.xlsx), que é o que o Histórico importa para comparar.
// Como no relatório de checklist do cop, cada arquivo mostra o próprio estado
// (gerando, baixado, erro com "Tentar de novo"). Tudo é gerado no navegador.

import { esc, nomeArquivo, icone } from './ui.js';
import { ESTADOS, arquivarExportacao, baixarArquivo } from './estado.js';
import { carregarPdfMake, carregarExcelJS } from './bibliotecas.js';
import { gerarPdf } from './relatorio-pdf.js';
import { gerarPlanilha } from './planilha.js';

const OPCOES = [
  {
    id: 'pdf',
    formato: 'PDF',
    titulo: 'Relatório',
    descricao: 'Para ler e compartilhar. Leva a planilha anexada.',
    botao: 'Baixar PDF',
    primario: true,
  },
  {
    id: 'xlsx',
    formato: 'XLSX',
    titulo: 'Planilha de dados',
    descricao: 'O Histórico importa este arquivo para comparar aplicações.',
    botao: 'Baixar planilha',
    primario: false,
  },
];

function paraDataUrl(blob) {
  return new Promise((resolve, reject) => {
    const leitor = new FileReader();
    leitor.onload = () => resolve(leitor.result);
    leitor.onerror = () => reject(leitor.error);
    leitor.readAsDataURL(blob);
  });
}

async function gerar(tipo, app, modelo) {
  const agora = new Date();
  const geradoEm = agora.toISOString();
  const partes = ['MGP-PME', app.empresa.identificador];
  const ExcelJS = await carregarExcelJS();
  const planilha = await gerarPlanilha(ExcelJS, app, modelo, { exportadoEm: geradoEm });
  const nomePlanilha = nomeArquivo(partes, 'xlsx', agora);
  if (tipo === 'xlsx') return { blob: planilha, nome: nomePlanilha };
  const pdfMake = await carregarPdfMake();
  const anexo = { nome: nomePlanilha, dataUrl: await paraDataUrl(planilha) };
  return { blob: await gerarPdf(pdfMake, app, modelo, { geradoEm, anexo }), nome: nomeArquivo(partes, 'pdf', agora) };
}

// Abre o diálogo; aoFechar(exportou) é chamado ao fechar.
export function abrirExportacao({ app, modelo, aoFechar = () => {} }) {
  let exportou = false;
  const dialogo = document.createElement('dialog');
  dialogo.className = 'dialogo-exportar';
  dialogo.setAttribute('aria-labelledby', 'exportar-titulo');
  dialogo.innerHTML = `
    <form method="dialog" class="dialogo-corpo">
      <h2 id="exportar-titulo">Exportar diagnóstico</h2>
      <p class="nota">${esc(app.empresa.identificador)} · gerado neste navegador, nada é enviado.</p>
      <ul class="exportar-opcoes">
        ${OPCOES.map(o => `<li data-opcao="${o.id}">
          <span class="exportar-formato" aria-hidden="true">${esc(o.formato)}</span>
          <div>
            <h3>${esc(o.titulo)}</h3>
            <p>${esc(o.descricao)}</p>
            <p class="exportar-estado" data-estado role="status" aria-live="polite"></p>
          </div>
          <button type="button" class="btn ${o.primario ? 'btn-pri' : 'btn-sec'}" data-gerar="${o.id}">${icone('baixar')} ${esc(o.botao)}</button>
        </li>`).join('')}
      </ul>
      <div class="form-rodape" style="border-top:0;padding-top:0">
        <span class="nota">${app.estado !== ESTADOS.ARQUIVADA ? 'O primeiro download arquiva as respostas.' : ''}</span>
        <button type="submit" class="btn btn-sec" value="fechar">Fechar</button>
      </div>
    </form>`;
  document.body.appendChild(dialogo);

  dialogo.addEventListener('click', async ev => {
    const botao = ev.target.closest('[data-gerar]');
    if (!botao || botao.disabled) return;
    const tipo = botao.dataset.gerar;
    const linha = botao.closest('li');
    const estadoEl = linha.querySelector('[data-estado]');
    const rotulo = OPCOES.find(o => o.id === tipo).botao;
    botao.disabled = true;
    botao.textContent = 'Gerando…';
    estadoEl.textContent = tipo === 'pdf' ? 'Montando o relatório. Pode levar alguns segundos.' : 'Montando a planilha.';
    estadoEl.className = 'exportar-estado';
    try {
      const { blob, nome } = await gerar(tipo, app, modelo);
      baixarArquivo(nome, blob);
      if (!exportou) { arquivarExportacao(app); exportou = true; }
      estadoEl.textContent = `Baixado: ${nome}`;
      estadoEl.classList.add('ok');
      botao.innerHTML = `${icone('baixar')} Baixar de novo`;
    } catch (e) {
      estadoEl.textContent = `Não foi possível gerar o arquivo. ${e.message || ''}`.trim();
      estadoEl.classList.add('erro');
      botao.textContent = 'Tentar de novo';
    } finally {
      botao.disabled = false;
    }
  });

  dialogo.addEventListener('close', () => {
    dialogo.remove();
    aoFechar(exportou);
  });
  dialogo.showModal();
  dialogo.querySelector('[data-gerar="pdf"]').focus();
  return dialogo;
}

