'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const P = require('../public/js/protocol');
const F = require('../public/js/format');
const V = require('../src/validate');
const { build, OUT } = require('./build-mock');

test('los eventos son los de IDEA §4.5', () => {
  const names = Object.values(P.EVENTS).sort();
  assert.deepEqual(names, ['error:msg', 'host:addBots', 'host:create', 'host:end', 'host:kick', 'host:lobby',
    'host:resume', 'host:settings', 'host:start', 'player:join', 'player:pass', 'room:state', 'you:turn']);
});

test('los límites coinciden con la validación del servidor', () => {
  for (const key of ['investmentMin', 'investmentMax', 'pmcMin', 'pmcMax', 'nameMax']) {
    assert.equal(P.LIMITS[key], V.LIMITS[key], key);
  }
});

test('los 3 casos de la presentación: k y total', () => {
  const totals = P.PRESETS.map((p) => [F.k(p.pmc), F.round2(p.investment / (1 - p.pmc))]);
  assert.deepEqual(totals, [[3, 3000], [2, 2000000], [4, 4000000]]);
});

test('los mocks están al día con src/game.js (node test/build-mock.js)', async () => {
  const files = await build();
  for (const [name, data] of Object.entries(files)) {
    const disk = JSON.parse(fs.readFileSync(path.join(OUT, name), 'utf8'));
    assert.deepEqual(disk, JSON.parse(JSON.stringify(data)), `${name} está desactualizado: corre node test/build-mock.js`);
  }
});

test('cada mock es demo_data y nunca expone hostToken en el estado', () => {
  for (const name of fs.readdirSync(OUT)) {
    const m = JSON.parse(fs.readFileSync(path.join(OUT, name), 'utf8'));
    assert.equal(m.demo_data, true, name);
    assert.ok(!JSON.stringify(m.state).includes('hostToken'), name);
  }
});

test('la economía cuadra: ahorro guardado + perdido + monto que queda = inversión', () => {
  for (const name of ['playing.json', 'final.json']) {
    const s = JSON.parse(fs.readFileSync(path.join(OUT, name), 'utf8')).state;
    const saved = s.players.reduce((a, p) => a + p.saved, 0);
    // playing.json has exactly 8 passes, so its ledgerTail is the whole ledger.
    const ledger = s.final ? s.final.ledger : s.game.ledgerTail;
    const lost = ledger.filter((r) => !r.ok).reduce((a, r) => a + r.saving, 0);
    if (s.final) assert.equal(F.round2(lost), s.final.lostSavings, name);
    assert.equal(F.round2(saved + lost + s.game.amount), s.settings.investment, name);
  }
});

test('el mock de tu turno tiene al jugador como holder', () => {
  const m = JSON.parse(fs.readFileSync(path.join(OUT, 'myturn.json'), 'utf8'));
  assert.equal(m.state.game.holderId, m.you);
  const passed = JSON.parse(fs.readFileSync(path.join(OUT, 'passed.json'), 'utf8'));
  assert.notEqual(passed.state.game.holderId, passed.you);
});
