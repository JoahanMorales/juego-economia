'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { NAMES, botName, makeBot, planMove } = require('../src/bots');

function seeded(seed) { // mulberry32
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const players = [
  { id: 'a', connected: true }, { id: 'b', connected: true }, { id: 'c', connected: false }, { id: 'd', connected: true },
];

test('nombres temáticos de IDEA §4.8; después del 5º se numeran y caben en 16 caracteres', () => {
  assert.deepEqual([0, 1, 2, 3, 4].map(botName), NAMES);
  assert.equal(botName(5), 'Bot Panadero 2');
  assert.equal(botName(9), 'Bot Carpintera 2');
  for (let i = 0; i < 40; i++) assert.ok(botName(i).length <= 16, botName(i));
});

test('makeBot crea un jugador marcado como bot', () => {
  assert.deepEqual(makeBot(0), { name: 'Bot Panadero', isBot: true });
  assert.deepEqual(makeBot(7), { name: 'Bot Tendera 2', isBot: true });
});

test('responde entre 1.5 y 4.5 s y nunca se pasa a sí mismo ni a un desconectado', () => {
  const rng = seeded(1);
  for (let i = 0; i < 500; i++) {
    const m = planMove(rng, { income: 750, pmc: 0.75, holderId: 'a', players });
    assert.ok(m.delayMs >= 1500 && m.delayMs <= 4500, String(m.delayMs));
    assert.ok(['b', 'd'].includes(m.toId), m.toId);
  }
});

test('acierta el 85 % ± 3 % y cada error queda fuera de la tolerancia', () => {
  const rng = seeded(42);
  let hits = 0;
  const n = 2000;
  for (let i = 0; i < n; i++) {
    const income = 10 + Math.floor(rng() * 1000000) / 100;
    const correct = Math.round(income * 0.25 * 100) / 100;
    const m = planMove(rng, { income, pmc: 0.75, holderId: 'a', players });
    if (m.saving === correct) hits++;
    else assert.ok(Math.abs(m.saving - correct) > 0.5 && m.saving >= 0, `${m.saving} vs ${correct}`);
  }
  assert.ok(Math.abs(hits / n - 0.85) <= 0.03, `acierto ${hits / n}`);
});

test('sin nadie más conectado no hay destino', () => {
  const m = planMove(seeded(3), { income: 100, pmc: 0.5, holderId: 'a', players: [{ id: 'a', connected: true }, { id: 'c', connected: false }] });
  assert.equal(m.toId, null);
});
