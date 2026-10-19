// Shared number formatting (browser global `Format`, Node module). Amounts are always es-MX with 2 decimals.
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.Format = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';
  var MXN = new Intl.NumberFormat('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  function round2(x) { return Math.round(x * 100) / 100; }

  // money(1234.5) → "$1,234.50"; negative values keep the sign before the dollar sign.
  function money(x) {
    var n = Number(x);
    if (!isFinite(n)) return '$0.00';
    var r = round2(n);
    return (r < 0 ? '-$' : '$') + MXN.format(Math.abs(r));
  }

  // The investment multiplier k = 1 / (1 − PMC), rounded for display (k(2/3) → 3).
  function k(pmc) { return round2(1 / (1 - pmc)); }

  // "0.75" for the screen; thirds and other repeating values show 2 decimals.
  function pmcLabel(pmc) { return String(round2(pmc)); }

  return { round2: round2, money: money, k: k, pmcLabel: pmcLabel };
});
