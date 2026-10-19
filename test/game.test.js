'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const g = require('../src/game');

const seq = (...v) => { let i = 0; return () => v[i++ % v.length]; };
function mk(n, settings = {}, over = {}) {
  const players = new Map();
  for (let i = 0; i < n; i++) {
    const id = 'p' + i;
    players.set(id, { id, name: 'J' + i, socketId: 's' + i, connected: true, isBot: false, saved: 0, errors: 0, totalResponseMs: 0, turns: 0, ...(over[id] || {}) });
  }
  return { code: 'ABCD', hostToken: 'SECRETO', phase: 'lobby', players, settings: { investment: 1000, pmc: 0.75, turnMs: 10000, tolerance: 0.5, ...settings }, game: null };
}
const play = (room, saving, toId, rng = () => 0, now = 1000) =>
  g.resolveTurn(room, { turn: room.game.turn, saving, toId }, rng, now);

test('PMC 0.75 / $1,000: ahorro 250 y pasan 750', () => {
  const r = mk(3); g.startGame(r, () => 0, 0);
  const holder = r.players.get(r.game.holderId);
  const res = play(r, 250, 'p2');
  assert.equal(res.finished, false);
  assert.equal(holder.saved, 250);
  assert.equal(r.game.amount, 750);
  assert.equal(r.game.holderId, 'p2');
  assert.equal(r.game.ledger[0].consumption, 750);
});

test('PMC 2/3: 333.33 con tolerancia ±0.50 acepta 333 y 333.5', () => {
  for (const s of [333.33, 333, 333.5]) {
    const r = mk(3, { pmc: 2 / 3 }); g.startGame(r, () => 0, 0);
    play(r, s, 'p1');
    assert.equal(r.players.get('p0').saved, 333.33, 'acepta ' + s);
    assert.equal(r.game.amount, 666.67);
  }
  const r = mk(3, { pmc: 2 / 3 }); g.startGame(r, () => 0, 0);
  play(r, 332.8, 'p1');
  assert.equal(r.players.get('p0').errors, 1);
});

test('respuesta fuera de tolerancia: error, sin ahorro, el dinero pasa igual', () => {
  const r = mk(3); g.startGame(r, () => 0, 0);
  play(r, 200, 'p1');
  const p = r.players.get('p0');
  assert.equal(p.saved, 0); assert.equal(p.errors, 1);
  assert.equal(r.game.amount, 750);
  assert.equal(r.game.lostSavings, 250);
  assert.equal(r.game.ledger[0].ok, false);
  assert.equal(r.game.ledger[0].reason, 'wrong');
});

test('timeout pierde el ahorro y pasa el consumo correcto', () => {
  const r = mk(3); g.startGame(r, () => 0, 0);
  g.resolveTurn(r, { turn: 1, timeout: true }, () => 0, 11000);
  assert.equal(r.players.get('p0').saved, 0);
  assert.equal(r.players.get('p0').errors, 1);
  assert.equal(r.game.amount, 750);
  assert.equal(r.game.ledger[0].reason, 'timeout');
});

test('saving no numérico o infinito cuenta como error', () => {
  for (const s of ['250', NaN, Infinity, undefined, null]) {
    const r = mk(3); g.startGame(r, () => 0, 0);
    play(r, s, 'p1');
    assert.equal(r.players.get('p0').errors, 1);
    assert.equal(r.game.amount, 750);
  }
});

test('jugada con turno viejo o duplicada se ignora', () => {
  const r = mk(3); g.startGame(r, () => 0, 0);
  g.resolveTurn(r, { turn: 1, saving: 250, toId: 'p1' }, () => 0, 100);
  const snap = JSON.stringify(r.game);
  const res = g.resolveTurn(r, { turn: 1, saving: 250, toId: 'p1' }, () => 0, 200);
  assert.equal(res.ignored, true);
  assert.equal(JSON.stringify(r.game), snap);
});

test('pasarse a sí mismo → destino al azar ≠ holder', () => {
  const r = mk(4); g.startGame(r, () => 0, 0);
  play(r, 250, 'p0', seq(0.99));
  assert.notEqual(r.game.holderId, 'p0');
  assert.equal(r.game.holderId, 'p3');
});

test('toId inválido o desconectado → al azar entre conectados ≠ holder', () => {
  const r = mk(4, {}, { p1: { connected: false } }); g.startGame(r, () => 0, 0);
  play(r, 250, 'p1', () => 0);
  assert.equal(r.game.holderId, 'p2');
  const r2 = mk(4); g.startGame(r2, () => 0, 0);
  play(r2, 250, 'nadie', () => 0.99);
  assert.equal(r2.game.holderId, 'p3');
  const r3 = mk(4); g.startGame(r3, () => 0, 0);
  play(r3, 250, { x: 1 }, () => 0);
  assert.equal(r3.game.holderId, 'p1');
});

test('con 2 jugadores el dinero va y viene', () => {
  const r = mk(2); g.startGame(r, () => 0, 0);
  const seen = [];
  for (let i = 0; i < 5; i++) { seen.push(r.game.holderId); play(r, g.round2(r.game.amount * 0.25), 'p0'); }
  assert.deepEqual(seen, ['p0', 'p1', 'p0', 'p1', 'p0']);
});

test('termina cuando el monto baja de $1 y la suma de ahorros ≈ inversión − resto', () => {
  const r = mk(3); g.startGame(r, () => 0, 0);
  let res = { finished: false }, n = 0;
  while (!res.finished && n++ < 200) res = play(r, g.round2(g.round2(r.game.amount) * 0.25), 'p1', () => 0);
  assert.equal(res.finished, true);
  assert.equal(r.phase, 'final');
  assert.ok(r.game.amount < 1);
  const sum = [...r.players.values()].reduce((a, p) => a + p.saved, 0);
  assert.ok(sum < 1000 && sum > 998, `sum=${sum}`);
});

test('los 3 presets de la presentación: teoría 3,000 / 2,000,000 / 4,000,000', () => {
  const casos = [[1000, 2 / 3, 3000], [1000000, 0.5, 2000000], [1000000, 0.75, 4000000]];
  for (const [investment, pmc, esperado] of casos) {
    const r = mk(3, { investment, pmc }); g.startGame(r, () => 0, 0); g.finish(r);
    assert.equal(g.finalSummary(r).theoretical, esperado);
  }
});

test('montos redondeados a centavos (ejemplo de IDEA §1)', () => {
  const r = mk(3); g.startGame(r, () => 0, 0);
  const montos = [];
  for (let i = 0; i < 4; i++) { montos.push(r.game.amount); play(r, g.round2(r.game.amount * 0.25), 'p1', () => 0); }
  assert.deepEqual(montos, [1000, 750, 562.5, 421.87]);
  assert.equal(r.game.amount, 316.4);
  assert.equal(r.game.ledger[2].saving, 140.63);
});

test('publicState: msLeft, ledgerTail de 8, sin hostToken, final sólo al terminar', () => {
  const r = mk(3); g.startGame(r, () => 0, 0);
  for (let i = 0; i < 10; i++) play(r, g.round2(r.game.amount * 0.25), 'p1', () => 0, 500);
  const s = g.publicState(r, 4000);
  assert.equal(s.game.msLeft, 10500 - 4000);
  assert.equal(s.game.ledgerTail.length, 8);
  assert.equal(s.game.ledgerTail[7].n, 10);
  assert.equal(s.game.passes, 10);
  assert.equal(s.final, undefined);
  assert.ok(!JSON.stringify(s).includes('SECRETO'));
  assert.ok(!('hostToken' in s));
  g.finish(r);
  const f = g.publicState(r, 99999);
  assert.equal(f.game.msLeft, 0);
  assert.equal(f.final.ledger.length, 10);
  assert.ok(!JSON.stringify(f).includes('SECRETO'));
});

test('ranking: más ahorro → menos errores → más rápido', () => {
  const r = mk(4, {}, {
    p0: { saved: 500, errors: 1, totalResponseMs: 4000, turns: 2 },
    p1: { saved: 500, errors: 0, totalResponseMs: 9000, turns: 3 },
    p2: { saved: 500, errors: 0, totalResponseMs: 3000, turns: 3 },
    p3: { saved: 900, errors: 5, totalResponseMs: 1000, turns: 1 },
  });
  r.game = { ledger: [], moved: 0, lostSavings: 0 };
  assert.deepEqual(g.finalSummary(r).ranking.map((x) => x.id), ['p3', 'p2', 'p1', 'p0']);
});

test('startGame reinicia contadores y elige holder conectado', () => {
  const r = mk(3, {}, { p0: { connected: false, saved: 9, errors: 2 } });
  g.startGame(r, () => 0, 0);
  assert.equal(r.players.get('p0').saved, 0);
  assert.equal(r.players.get('p0').errors, 0);
  assert.equal(r.game.holderId, 'p1');
  assert.equal(r.phase, 'playing');
  assert.equal(r.game.amount, 1000);
});
