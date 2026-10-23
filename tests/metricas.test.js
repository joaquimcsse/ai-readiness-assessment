// R7 da avaliação do PBL 7: a aplicação registra, sem enviar nada, quando o
// preenchimento começou e terminou e quantas vezes o guia foi aberto, e o
// arquivo exportado leva esses dados para a próxima rodada de validação.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as estado from '../js/estado.js';

const FICHA = { identificador: 'Empresa Teste', setor: 'Serviços', porte: 'micro', funcionarios: 5, respondente: 'Gestora', data: '2026-10-23' };

test('R7: início e fim do preenchimento são gravados uma vez', () => {
  const app = estado.iniciarAplicacao(FICHA, '1.0.0');
  assert.deepEqual(app.metricas, { inicioPreenchimento: null, fimPreenchimento: null, aberturasGuia: 0 });
  estado.registrarResposta(app, 'I01', 3, 2);
  const inicio = app.metricas.inicioPreenchimento;
  assert.ok(inicio);
  assert.equal(app.metricas.fimPreenchimento, null);
  estado.registrarResposta(app, 'I02', 4, 2);
  assert.ok(app.metricas.fimPreenchimento);
  estado.registrarResposta(app, 'I01', 5, 2);
  assert.equal(app.metricas.inicioPreenchimento, inicio);
  assert.ok(estado.minutosPreenchimento(app) >= 0);
});

test('R7: aberturas do guia contam só para a aplicação em andamento', () => {
  const app = estado.iniciarAplicacao(FICHA, '1.0.0');
  estado.registrarAberturaGuia();
  estado.registrarAberturaGuia();
  assert.equal(app.metricas.aberturasGuia, 2);
  estado.definirAtual(null);
  estado.registrarAberturaGuia();
  assert.equal(app.metricas.aberturasGuia, 2);
});

test('R7: aplicação antiga, sem métricas, continua funcionando', () => {
  const app = estado.iniciarAplicacao(FICHA, '1.0.0');
  delete app.metricas;
  assert.equal(estado.minutosPreenchimento(app), null);
  estado.registrarResposta(app, 'I01', 2, 30);
  assert.ok(app.metricas.inicioPreenchimento);
});
