// Design-lock sample data (demo_data: true). Every amount comes from the IDEA §4.6 formula, PMC 0.75, $1,000.
(function () {
  var round2 = function (x) { return Math.round(x * 100) / 100; };
  var money = function (x) { return '$' + x.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 }); };
  var pmc = 0.75, investment = 1000;
  var names = ['Ximena', 'Diego', 'Fernanda', 'Emiliano', 'Regina', 'Bot Tendera', 'Santiago', 'Valeria'];
  var order = [0, 1, 2, 3, 4, 5, 6, 1, 7];       // who received each pass
  var wrong = { 3: true, 6: true };                // passes answered wrong or late
  var ledger = [], amount = investment, moved = 0, saved = {};
  names.forEach(function (n) { saved[n] = 0; });
  for (var i = 0; i < order.length - 1; i++) {
    var income = round2(amount), saving = round2(income * (1 - pmc)), consumption = round2(income - saving);
    var name = names[order[i]], ok = !wrong[i];
    if (ok) saved[name] = round2(saved[name] + saving);
    moved = round2(moved + income);
    ledger.push({ n: i + 1, name: name, to: names[order[i + 1]], income: income, saving: saving, consumption: consumption, ok: ok });
    amount = consumption;
  }
  var last = ledger[ledger.length - 1];
  var ranking = names.map(function (n) { return { name: n, saved: saved[n] }; })
    .sort(function (a, b) { return b.saved - a.saved; });
  window.DEMO = {
    demo_data: true, pmc: pmc, investment: investment, k: 1 / (1 - pmc), theory: investment / (1 - pmc),
    holder: names[order[order.length - 1]], amount: amount, turn: order.length, msLeft: 6400,
    moved: moved, ledger: ledger, ranking: ranking, money: money,
    lastEvent: last.ok ? last.name + ' se quedó ' + money(last.saving) + ' y le pasó ' + money(last.consumption) + ' a ' + last.to
                       : 'A ' + last.name + ' se le acabó el tiempo. El dinero saltó a ' + last.to,
    lastOk: last.ok, players: names
  };
  // Fill [data-demo] nodes with textContent only.
  document.addEventListener('DOMContentLoaded', function () {
    var d = window.DEMO;
    var set = function (sel, v) { document.querySelectorAll('[data-demo="' + sel + '"]').forEach(function (el) { el.textContent = v; }); };
    set('holder', d.holder); set('amount', money(d.amount)); set('moved', money(d.moved)); set('theory', money(d.theory));
    set('turn', String(d.turn)); set('passes', String(d.ledger.length)); set('event', d.lastEvent); set('pmc', '0.75');
    set('k', String(d.k)); set('seconds', String(Math.ceil(d.msLeft / 1000))); set('saving-hint', money(round2(d.amount * (1 - pmc))));
    document.documentElement.style.setProperty('--progress', String(d.msLeft / 10000));
    document.documentElement.style.setProperty('--moved-ratio', String(d.moved / d.theory));
    var ev = document.querySelector('[data-demo-event-state]'); if (ev) ev.setAttribute('data-ok', String(d.lastOk));
    var tpl = function (id) { var t = document.getElementById(id); return t ? t.content.firstElementChild : null; };
    var fill = function (node, obj) { Object.keys(obj).forEach(function (k) { var el = node.querySelector('[data-f="' + k + '"]'); if (el) el.textContent = obj[k]; }); };
    var chain = document.querySelector('[data-list="chain"]'), rowT = tpl('chain-row');
    if (chain && rowT) d.ledger.slice(-8).forEach(function (r) {
      var row = rowT.cloneNode(true);
      fill(row, { n: String(r.n), name: r.name, income: money(r.income), saving: money(r.saving), consumption: money(r.consumption) });
      row.setAttribute('data-ok', String(r.ok));
      row.style.setProperty('--share', String(r.income / d.investment));
      chain.appendChild(row);
    });
    var rank = document.querySelector('[data-list="ranking"]'), rankT = tpl('rank-row');
    if (rank && rankT) d.ranking.slice(0, 5).forEach(function (p, i) {
      var row = rankT.cloneNode(true); fill(row, { pos: String(i + 1), name: p.name, saved: money(p.saved) }); rank.appendChild(row);
    });
    var mates = document.querySelector('[data-list="mates"]'), mateT = tpl('mate');
    if (mates && mateT) d.players.filter(function (n) { return n !== d.holder; }).slice(0, 6).forEach(function (n, i) {
      var b = mateT.cloneNode(true); fill(b, { name: n }); if (n === 'Bot Tendera') b.setAttribute('data-bot', 'true');
      if (i === 4) b.disabled = true; mates.appendChild(b);
    });
  });
})();
