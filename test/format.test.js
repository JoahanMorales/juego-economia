'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const F = require('../public/js/format');

test('money: es-MX, 2 decimales, signo de pesos', () => {
  assert.equal(F.money(1234.5), '$1,234.50');
  assert.equal(F.money(0), '$0.00');
  assert.equal(F.money(0.5), '$0.50');
  assert.equal(F.money(1000000), '$1,000,000.00');
  assert.equal(F.money(140.625), '$140.63');
  assert.equal(F.money(-5), '-$5.00');
  assert.equal(F.money(NaN), '$0.00');
});

test('round2 redondea a centavos', () => {
  assert.equal(F.round2(421.875), 421.88);
  assert.equal(F.round2(1000 * (1 - 2 / 3)), 333.33);
});

test('k = 1 / (1 − PMC)', () => {
  assert.equal(F.k(2 / 3), 3);
  assert.equal(F.k(0.5), 2);
  assert.equal(F.k(0.75), 4);
});
