// Validadores do contrato de dados (dados.json).
// Realizam os critérios de aceitação verificáveis sobre os parâmetros
// (CT-01, CT-02, CT-03, CT-05) e a guarda de domínio FE-03.
// Funções puras: usadas pela página (app, manutenção) e pelos testes em Node.

const TOLERANCIA = 1e-9;
const ESFORCOS = ['Baixo', 'Médio', 'Alto'];
const HORIZONTES = ['Curto', 'Médio', 'Longo'];
const TIPOS_CONDICAO = ['faixa', 'faixa_global', 'criticas_em_faixa', 'todas', 'alguma', 'nao'];

// Intervalos contíguos cobrindo [0, 100] sem lacuna nem sobreposição.
export function validarParticao(intervalos, rotulo) {
  const erros = [];
  if (!Array.isArray(intervalos) || intervalos.length === 0) {
    return [`${rotulo}: lista vazia.`];
  }
  const ordenados = [...intervalos].sort((a, b) => a.limite_inferior - b.limite_inferior);
  for (const it of ordenados) {
    if (typeof it.limite_inferior !== 'number' || typeof it.limite_superior !== 'number' ||
        Number.isNaN(it.limite_inferior) || Number.isNaN(it.limite_superior)) {
      erros.push(`${rotulo}: limites não numéricos.`);
      return erros;
    }
    if (it.limite_inferior < 0 || it.limite_superior > 100) {
      erros.push(`${rotulo}: limite fora do domínio 0 a 100.`);
    }
    if (it.limite_superior <= it.limite_inferior) {
      erros.push(`${rotulo}: limite superior deve ser maior que o inferior.`);
    }
  }
  if (Math.abs(ordenados[0].limite_inferior - 0) > TOLERANCIA) {
    erros.push(`${rotulo}: a primeira faixa deve começar em 0.`);
  }
  if (Math.abs(ordenados[ordenados.length - 1].limite_superior - 100) > TOLERANCIA) {
    erros.push(`${rotulo}: a última faixa deve terminar em 100.`);
  }
  for (let i = 1; i < ordenados.length; i++) {
    const ant = ordenados[i - 1].limite_superior;
    const atual = ordenados[i].limite_inferior;
    if (atual > ant + TOLERANCIA) erros.push(`${rotulo}: lacuna entre ${ant} e ${atual}.`);
    if (atual < ant - TOLERANCIA) erros.push(`${rotulo}: sobreposição entre ${atual} e ${ant}.`);
  }
  return erros;
}

function validarCondicao(cond, modelo, caminho, erros) {
  if (!cond || !TIPOS_CONDICAO.includes(cond.tipo)) {
    erros.push(`${caminho}: tipo de condição inválido.`);
    return;
  }
  const dims = modelo.dimensoes.map(d => d.codigo);
  const faixas = modelo.faixas.map(f => f.codigo);
  switch (cond.tipo) {
    case 'faixa':
      if (!dims.includes(cond.dimensao)) erros.push(`${caminho}: dimensão ${cond.dimensao} inexistente.`);
      if (!faixas.includes(cond.faixa)) erros.push(`${caminho}: faixa ${cond.faixa} inexistente.`);
      break;
    case 'faixa_global':
      if (!faixas.includes(cond.faixa)) erros.push(`${caminho}: faixa ${cond.faixa} inexistente.`);
      break;
    case 'criticas_em_faixa':
      if (!faixas.includes(cond.faixa)) erros.push(`${caminho}: faixa ${cond.faixa} inexistente.`);
      if (!Number.isInteger(cond.minimo) || cond.minimo < 1) erros.push(`${caminho}: mínimo inválido.`);
      break;
    case 'todas':
    case 'alguma':
      if (!Array.isArray(cond.condicoes) || cond.condicoes.length === 0) {
        erros.push(`${caminho}: combinação sem condições.`);
      } else {
        cond.condicoes.forEach((c, i) => validarCondicao(c, modelo, `${caminho}[${i}]`, erros));
      }
      break;
    case 'nao':
      validarCondicao(cond.condicao, modelo, `${caminho}.nao`, erros);
      break;
  }
}

// Devolve a lista de inconsistências do modelo; lista vazia = modelo válido.
export function validarModelo(modelo) {
  const erros = [];
  if (!modelo || typeof modelo !== 'object') return ['Modelo ausente.'];
  if (!modelo.versao_modelo) erros.push('Versão do modelo ausente.');

  // Escala de 5 pontos
  if (!Array.isArray(modelo.escala) || modelo.escala.length !== 5) {
    erros.push('A escala deve ter exatamente 5 pontos.');
  }

  // CT-02: dimensões, pesos e criticidade
  const dims = modelo.dimensoes || [];
  if (dims.length !== 6) erros.push(`Esperadas 6 dimensões, encontradas ${dims.length}.`);
  const codigosDim = dims.map(d => d.codigo);
  if (new Set(codigosDim).size !== codigosDim.length) erros.push('Códigos de dimensão duplicados.');
  let soma = 0;
  for (const d of dims) {
    if (typeof d.peso !== 'number' || Number.isNaN(d.peso) || d.peso < 0 || d.peso > 1) {
      erros.push(`Peso de ${d.codigo} fora do domínio 0 a 1.`);
    } else {
      soma += d.peso;
    }
  }
  if (Math.abs(soma - 1) > 1e-6) erros.push(`A soma dos pesos deve ser 1 (atual: ${soma.toFixed(4)}).`);
  const criticas = dims.filter(d => d.critica === true);
  if (criticas.length !== 3) erros.push(`Exatamente 3 dimensões devem ser críticas (atual: ${criticas.length}).`);

  // CT-01: 30 itens, cada um com 5 âncoras, distribuídos nas 6 dimensões
  const itens = modelo.itens || [];
  if (itens.length !== 30) erros.push(`Esperados 30 itens, encontrados ${itens.length}.`);
  const codigosItem = itens.map(i => i.codigo);
  if (new Set(codigosItem).size !== codigosItem.length) erros.push('Códigos de item duplicados.');
  for (const it of itens) {
    if (!codigosDim.includes(it.dimensao)) erros.push(`Item ${it.codigo}: dimensão ${it.dimensao} inexistente.`);
    if (!it.assertiva || !String(it.assertiva).trim()) erros.push(`Item ${it.codigo}: assertiva vazia.`);
    if (!Array.isArray(it.ancoras) || it.ancoras.length !== 5) {
      erros.push(`Item ${it.codigo}: deve ter exatamente 5 âncoras.`);
    } else if (it.ancoras.some(a => !a || !String(a).trim())) {
      erros.push(`Item ${it.codigo}: há âncora vazia.`);
    }
  }
  for (const d of codigosDim) {
    const n = itens.filter(i => i.dimensao === d).length;
    if (n < 4 || n > 6) erros.push(`Dimensão ${d} deve agrupar de 4 a 6 itens (atual: ${n}).`);
  }

  // CT-03: níveis e faixas contíguos cobrindo 0 a 100
  const niveis = modelo.niveis || [];
  if (niveis.length !== 5) erros.push(`Esperados 5 níveis, encontrados ${niveis.length}.`);
  erros.push(...validarParticao(niveis, 'Níveis'));
  const faixas = modelo.faixas || [];
  if (faixas.length !== 3) erros.push(`Esperadas 3 faixas, encontradas ${faixas.length}.`);
  erros.push(...validarParticao(faixas, 'Faixas'));

  // CT-05: exatamente uma regra por par dimensão-faixa
  const rds = modelo.regras_dimensao || [];
  const codigosFaixa = faixas.map(f => f.codigo);
  for (const d of codigosDim) {
    for (const f of codigosFaixa) {
      const n = rds.filter(r => r.dimensao === d && r.faixa === f).length;
      if (n !== 1) erros.push(`Deve haver exatamente uma regra para ${d}-${f} (atual: ${n}).`);
    }
  }
  for (const r of rds) {
    if (!r.acao || !String(r.acao).trim()) erros.push(`Regra ${r.codigo}: ação vazia.`);
    if (!ESFORCOS.includes(r.esforco)) erros.push(`Regra ${r.codigo}: esforço inválido.`);
    if (!HORIZONTES.includes(r.horizonte)) erros.push(`Regra ${r.codigo}: horizonte inválido.`);
  }
  const rts = modelo.regras_transversais || [];
  for (const r of rts) {
    if (!r.acao || !String(r.acao).trim()) erros.push(`Regra ${r.codigo}: advertência vazia.`);
    if (!ESFORCOS.includes(r.esforco)) erros.push(`Regra ${r.codigo}: esforço inválido.`);
    if (!HORIZONTES.includes(r.horizonte)) erros.push(`Regra ${r.codigo}: horizonte inválido.`);
    validarCondicao(r.condicao, { dimensoes: dims, faixas }, `Regra ${r.codigo}`, erros);
  }
  const todosCodigos = [...rds, ...rts].map(r => r.codigo);
  if (new Set(todosCodigos).size !== todosCodigos.length) erros.push('Códigos de regra duplicados.');

  // Parâmetros de priorização
  const p = modelo.priorizacao;
  if (!p) {
    erros.push('Parâmetros de priorização ausentes.');
  } else {
    for (const f of codigosFaixa) {
      if (typeof p.peso_faixa?.[f] !== 'number') erros.push(`Peso de priorização da faixa ${f} ausente.`);
    }
    for (const e of ESFORCOS) {
      if (typeof p.bonus_esforco?.[e] !== 'number') erros.push(`Bônus de esforço ${e} ausente.`);
    }
    if (typeof p.bonus_dimensao_critica !== 'number') erros.push('Bônus de dimensão crítica ausente.');
    if (typeof p.peso_advertencia !== 'number') erros.push('Peso de advertência ausente.');
  }

  // Periodicidade de reaplicação deve cobrir os cinco níveis
  const reap = modelo.reaplicacao || [];
  for (const n of niveis.map(x => x.numero)) {
    if (!reap.some(r => r.niveis.includes(n))) erros.push(`Periodicidade de reaplicação ausente para o nível ${n}.`);
  }
  return erros;
}

// CT-07: soma dos tempos declarados por etapa do fluxo de aplicação.
export function esforcoGestor(modelo) {
  const etapas = modelo.tempos_processo || [];
  return etapas.reduce((acc, e) => ({ min: acc.min + e.min, max: acc.max + e.max }), { min: 0, max: 0 });
}
