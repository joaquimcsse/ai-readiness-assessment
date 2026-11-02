// bibliotecas.js — carga sob demanda das bibliotecas (pdfmake, exceljs e
// echarts), copiadas em vendor/. Só são buscadas quando o gestor exporta,
// importa ou abre um diagnóstico: a página inicial não paga o seu peso. São arquivos do
// próprio site, então a CSP (script-src 'self') continua valendo.

const carregados = new Map();

function carregarScript(src) {
  if (!carregados.has(src)) {
    carregados.set(src, new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = src;
      s.async = true;
      s.onload = () => resolve();
      s.onerror = () => { carregados.delete(src); reject(new Error(`Não foi possível carregar ${src}.`)); };
      document.head.appendChild(s);
    }));
  }
  return carregados.get(src);
}

// O vfs_fonts.js registra a fonte Roboto no pdfMake já carregado, por isso a ordem.
export async function carregarPdfMake() {
  await carregarScript('vendor/pdfmake/pdfmake.min.js');
  await carregarScript('vendor/pdfmake/vfs_fonts.js');
  return window.pdfMake;
}

export async function carregarExcelJS() {
  await carregarScript('vendor/exceljs/exceljs.min.js');
  return window.ExcelJS;
}

// Apache ECharts: gráficos do diagnóstico e da comparação.
export async function carregarECharts() {
  await carregarScript('vendor/echarts/echarts.min.js');
  return window.echarts;
}
