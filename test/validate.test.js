const test = require('node:test');
const assert = require('node:assert');
const V = require('../src/validate');

test('cleanName quita HTML y recorta', () => {
  assert.strictEqual(V.cleanName('  <b>Ana</b>  '), 'Ana');
  assert.strictEqual(V.cleanName('A\u0000n\u001fa\u007f'), 'Ana');
  assert.strictEqual(V.cleanName('x'.repeat(30)).length, 16);
  assert.strictEqual(V.cleanName(''), null);
  assert.strictEqual(V.cleanName('   '), null);
  assert.strictEqual(V.cleanName('<i></i>'), null);
  assert.strictEqual(V.cleanName(42), null);
});

test('uniqueName agrega sufijos', () => {
  assert.strictEqual(V.uniqueName('Ana', []), 'Ana');
  assert.strictEqual(V.uniqueName('Ana', ['Ana']), 'Ana 2');
  assert.strictEqual(V.uniqueName('Ana', ['Ana', 'Ana 2']), 'Ana 3');
  assert.strictEqual(V.uniqueName('ana', ['Ana']), 'ana 2');
  assert.ok(V.uniqueName('x'.repeat(16), ['x'.repeat(16)]).length <= 16);
});

test('normalizeCode', () => {
  assert.strictEqual(V.normalizeCode(' kftr '), 'KFTR');
  assert.strictEqual(V.normalizeCode(5), null);
  assert.strictEqual(V.normalizeCode('abcde'), null);
  assert.strictEqual(V.normalizeCode('ab'), null);
});

test('validateSettings', () => {
  assert.deepStrictEqual(V.validateSettings({ investment: 1000, pmc: 0.75 }), { ok: true, value: { investment: 1000, pmc: 0.75 } });
  assert.strictEqual(V.validateSettings({ investment: 10, pmc: 0.1 }).ok, true);
  assert.strictEqual(V.validateSettings({ investment: 10000000, pmc: 0.95 }).ok, true);
  const bads = [{ investment: 9, pmc: 0.5 }, { investment: 10000001, pmc: 0.5 }, { investment: 100, pmc: 0.05 },
    { investment: 100, pmc: 0.96 }, { investment: '100', pmc: 0.5 }, { investment: NaN, pmc: 0.5 }, null, {}];
  for (const bad of bads) {
    const r = V.validateSettings(bad);
    assert.strictEqual(r.ok, false);
    assert.match(r.error, /[a-záéíóú]/i);
  }
});

test('validateSaving', () => {
  assert.deepStrictEqual(V.validateSaving(12.5), { ok: true, value: 12.5 });
  assert.strictEqual(V.validateSaving(0).ok, true);
  for (const bad of [NaN, Infinity, '5', null, undefined, -1]) assert.strictEqual(V.validateSaving(bad).ok, false);
});

test('rate limiter 1/s por clave con reloj inyectado', () => {
  let t = 1000;
  const rl = V.createRateLimiter({ intervalMs: 1000, now: () => t });
  assert.strictEqual(rl.allow('a'), true);
  assert.strictEqual(rl.allow('a'), false);
  assert.strictEqual(rl.allow('b'), true);
  t += 999;
  assert.strictEqual(rl.allow('a'), false);
  t += 1;
  assert.strictEqual(rl.allow('a'), true);
  rl.forget('a');
  assert.strictEqual(rl.allow('a'), true);
});
