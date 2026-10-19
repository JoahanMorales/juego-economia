// Projector screen. The server owns the game; this file only shows room:state and sends host:* actions.
// Player data is always written with textContent.
(function () {
  'use strict';
  var E = Protocol.EVENTS, L = Protocol.LIMITS, money = Format.money;
  var STORE = 'pasala.host';
  var $ = function (id) { return document.getElementById(id); };
  var tpl = function (id) { return $(id).content.firstElementChild.cloneNode(true); };
  var setText = function (el, v) { if (el.textContent !== v) el.textContent = v; };

  var host = load();          // {code, hostToken, joinUrl, qr}
  var state = null;           // last PublicState
  var deadline = 0;           // performance.now() when the turn ends
  var lastPasses = -1;
  var knownChips = {};

  function load() { try { return JSON.parse(localStorage.getItem(STORE)) || null; } catch (e) { return null; } }
  function save() { try { localStorage.setItem(STORE, JSON.stringify(host)); } catch (e) { /* private mode: resume just won't work */ } }
  function forget() { host = null; try { localStorage.removeItem(STORE); } catch (e) { /* ignore */ } }

  // ---------- Socket ----------
  var socket = window.createSocket({ reconnection: true });
  var resuming = false;

  socket.on('connect', function () {
    $('status').hidden = true;
    if (host && host.code && host.hostToken) {
      resuming = true;
      socket.emit(E.HOST_RESUME, { code: host.code, hostToken: host.hostToken }, function (res) {
        resuming = false;
        if (res && res.code) showHost();
      });
    } else create();
  });
  socket.on('disconnect', function () { $('status').hidden = false; });
  socket.on(E.ROOM_STATE, render);
  socket.on(E.ERROR, function (err) {
    if (resuming && err && err.code === 'not_host') { resuming = false; forget(); create(); return; }
    toast(err && err.message ? err.message : 'Algo salió mal.');
  });

  function create() {
    socket.emit(E.HOST_CREATE, {}, function (res) {
      if (!res || !res.code) return;
      host = { code: res.code, hostToken: res.hostToken, joinUrl: res.joinUrl, qr: res.qr };
      save();
      showHost();
    });
  }

  function showHost() {
    if (!host) return;
    setText($('code'), host.code);
    setText($('m-code'), host.code);
    if (host.qr) $('qr').src = host.qr;
    setText($('join-url'), host.joinUrl ? 'o entra a ' + host.joinUrl.replace(/^https?:\/\//, '').replace(/\?code=.*/, '') + ' y escribe el código' : '');
  }

  var toastTimer;
  function toast(text) {
    var t = $('toast');
    t.textContent = text;
    t.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { t.hidden = true; }, 4000);
  }

  // Two-step buttons: the first click arms, the second within 3 s confirms.
  function confirmClick(btn, armedText, action) {
    var original = btn.textContent, timer;
    btn.addEventListener('click', function () {
      if (btn.dataset.confirm === 'true') { clearTimeout(timer); btn.dataset.confirm = 'false'; btn.textContent = original; action(); return; }
      btn.dataset.confirm = 'true';
      btn.textContent = armedText;
      timer = setTimeout(function () { btn.dataset.confirm = 'false'; btn.textContent = original; }, 3000);
    });
  }

  // ---------- Render ----------
  var lastPhase = null;
  function render(s) {
    if (s.phase === 'final' && lastPhase === 'playing' && window.Sfx) Sfx.end();
    lastPhase = s.phase;
    state = s;
    document.body.dataset.phase = s.phase;
    document.body.dataset.paused = String(!!(s.game && s.game.paused));
    if (!host && s.code) { setText($('code'), s.code); setText($('m-code'), s.code); }
    setText($('m-pmc'), pmcText(s.settings.pmc));
    if (s.phase === 'lobby') renderLobby(s);
    else if (s.phase === 'playing') renderGame(s);
    else if (s.phase === 'final') renderFinal(s);
  }

  function pmcText(pmc) { return Math.abs(pmc - 2 / 3) < 0.001 ? '2/3' : String(Format.round2(pmc)); }
  function connected(s) { return s.players.filter(function (p) { return p.connected; }); }
  function playerName(p) { return p.isBot ? '🤖 ' + p.name : p.name; }

  // Lobby
  function renderLobby(s) {
    var list = $('chips'), seen = {};
    s.players.forEach(function (p) {
      seen[p.id] = true;
      var li = list.querySelector('[data-id="' + CSS.escape(p.id) + '"]');
      if (!li) {
        li = tpl('tpl-chip');
        li.dataset.id = p.id;
        if (knownChips.ready) li.classList.add('new');
        var kick = li.querySelector('.kick');
        confirmClick(kick, 'Sacar', function () { socket.emit(E.HOST_KICK, { playerId: p.id }); });
        list.appendChild(li);
      }
      setText(li.querySelector('.nm'), playerName(p));
      li.querySelector('.kick').setAttribute('aria-label', 'Sacar a ' + p.name);
      li.classList.toggle('off', !p.connected);
    });
    Array.prototype.slice.call(list.children).forEach(function (li) { if (!seen[li.dataset.id]) li.remove(); });
    knownChips.ready = true;

    var n = connected(s).length;
    setText($('count'), String(n));
    setText($('count-word'), n === 1 ? 'conectado' : 'conectados');
    $('empty').hidden = s.players.length > 0;
    $('start').disabled = n < 2;
    $('start-hint').textContent = n < 2 ? 'Se necesitan al menos 2 jugadores conectados.' : 'Todo listo. Elige el caso de la diapositiva y arranca.';

    var inv = $('inv'), pmc = $('pmc');
    if (document.activeElement !== inv) inv.value = Format.money(s.settings.investment).replace('$', '');
    if (document.activeElement !== pmc) pmc.value = pmcText(s.settings.pmc);
    var k = 1 / (1 - s.settings.pmc);
    $('k-preview').replaceChildren(document.createTextNode('k = ' + Format.round2(k) + ', la teoría da'), mono(money(s.settings.investment * k)));
    Array.prototype.forEach.call($('presets').children, function (b) {
      var pr = Protocol.PRESETS[b.dataset.i];
      b.setAttribute('aria-pressed', String(pr.investment === s.settings.investment && Math.abs(pr.pmc - s.settings.pmc) < 0.001));
    });
  }
  function mono(text) { var b = document.createElement('b'); b.textContent = text; return b; }

  // En juego
  function renderGame(s) {
    var g = s.game, byId = {};
    s.players.forEach(function (p) { byId[p.id] = p; });
    var holder = byId[g.holderId];
    setText($('holder'), holder ? playerName(holder) : '-');
    setText($('amount'), money(g.amount));
    setText($('m-turn'), String(g.turn));
    deadline = g.paused ? 0 : performance.now() + g.msLeft;
    if (g.paused) { setRing(g.msLeft); }

    var ev = $('event');
    ev.dataset.paused = String(!!g.paused);
    if (g.paused) { ev.dataset.ok = 'false'; setText($('event-text'), 'Pausa: hay menos de 2 jugadores conectados.'); }
    else if (g.lastEvent) { ev.dataset.ok = String(g.lastEvent.ok); setText($('event-text'), g.lastEvent.text); }
    else { ev.dataset.ok = 'true'; setText($('event-text'), 'El dinero cayó con ' + (holder ? holder.name : 'alguien') + '. Arranca la cadena.'); }

    var theory = s.settings.investment / (1 - s.settings.pmc);
    setText($('moved'), money(g.moved));
    setText($('theory'), money(theory));
    setText($('k'), String(Format.round2(1 / (1 - s.settings.pmc))));
    $('meter').style.width = Math.min(100, g.moved / theory * 100) + '%';

    renderRanking(s.players);
    renderChain(s, holder);
  }

  function renderRanking(players) {
    var rank = $('rank');
    var top = players.slice().sort(function (a, b) { return b.saved - a.saved || a.errors - b.errors; }).slice(0, 5);
    rank.replaceChildren.apply(rank, top.map(function (p, i) {
      var li = tpl('tpl-rank');
      li.querySelector('.pos').textContent = String(i + 1);
      li.querySelector('.nm').textContent = playerName(p);
      li.querySelector('.sv').textContent = money(p.saved);
      if (!p.connected) li.classList.add('off');
      return li;
    }));
  }

  function renderChain(s, holder) {
    var g = s.game, track = $('track'), inv = s.settings.investment;
    var fresh = lastPasses >= 0 && g.passes > lastPasses;
    lastPasses = g.passes;
    var rows = g.ledgerTail.map(function (r) {
      var li = tpl('tpl-node');
      li.dataset.ok = String(r.ok);
      li.style.setProperty('--share', String(Math.min(1, r.income / inv)));
      li.querySelector('.nm').textContent = r.name;
      li.querySelector('.in').textContent = money(r.income);
      li.querySelector('.sv').textContent = money(r.saving);
      return li;
    });
    var now = tpl('tpl-node');
    now.className = 'now';
    now.querySelector('.nm').textContent = holder ? holder.name : '';
    now.querySelector('.in').textContent = money(g.amount);
    now.querySelector('.sv').remove();
    if (fresh) now.classList.add('enter');
    rows.push(now);
    track.replaceChildren.apply(track, rows);
    if (fresh) {
      var ok = !g.lastEvent || g.lastEvent.ok;
      if (window.Sfx) { if (ok) Sfx.pass(); else Sfx.miss(); }
      flyBill(money(g.amount));
    }
  }

  // The bill hops from the node of the pass that just happened to the new holder's node.
  var reduced = window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : { matches: false };
  function flyBill(text) {
    var nodes = $('track').querySelectorAll('.node');
    if (reduced.matches || nodes.length < 2 || !document.body.animate) return;
    var a = nodes[nodes.length - 2].getBoundingClientRect(), b = nodes[nodes.length - 1].getBoundingClientRect();
    var fly = $('flyer');
    fly.textContent = text;
    fly.hidden = false;
    var w = fly.offsetWidth, h = fly.offsetHeight;
    var x1 = a.left + a.width / 2 - w / 2, y1 = a.top + a.height / 2 - h / 2;
    var x2 = b.left + b.width / 2 - w / 2, y2 = b.top + b.height / 2 - h / 2;
    var lift = Math.min(90, Math.max(40, Math.abs(x2 - x1) * 0.5));
    var anim = fly.animate([
      { transform: 'translate(' + x1 + 'px,' + y1 + 'px) scale(0.6)', opacity: 0 },
      { transform: 'translate(' + x1 + 'px,' + (y1 - lift * 0.6) + 'px) scale(1)', opacity: 1, offset: 0.25 },
      { transform: 'translate(' + (x1 + x2) / 2 + 'px,' + (Math.min(y1, y2) - lift) + 'px) scale(1.05)', opacity: 1, offset: 0.55 },
      { transform: 'translate(' + x2 + 'px,' + y2 + 'px) scale(0.6)', opacity: 0 }
    ], { duration: 900, easing: 'cubic-bezier(0.16, 1, 0.3, 1)' });
    anim.onfinish = function () { fly.hidden = true; };
  }

  // Final
  function renderFinal(s) {
    var f = s.final, inv = s.settings.investment;
    setText($('f-inv'), money(inv));
    setText($('f-moved'), money(f.moved));
    setText($('f-k'), 'k = 1 / (1 − ' + pmcText(s.settings.pmc) + ') = ' + Format.round2(1 / (1 - s.settings.pmc)));
    setText($('f-theory'), money(f.theoretical));
    var saved = s.players.reduce(function (a, p) { return a + p.saved; }, 0);
    setText($('f-saved'), money(saved));
    var gap = Format.round2(f.theoretical - f.moved);
    setText($('f-note'), 'La cadena se cortó cuando quedó menos de $1, por eso se movieron ' + money(gap) + ' menos que la teoría. '
      + 'El ahorro de todos (' + money(saved) + ') más lo que se perdió por errores (' + money(f.lostSavings) + ') casi igualan la inversión.');

    var podium = $('podium'), top = f.ranking.slice(0, 3), max = top.length ? top[0].saved || 1 : 1;
    podium.replaceChildren.apply(podium, top.map(function (p, i) {
      var li = tpl('tpl-step');
      li.querySelector('.place').textContent = String(i + 1);
      li.querySelector('.nm').textContent = p.name;
      li.querySelector('.sv').textContent = money(p.saved);
      li.querySelector('.block').style.setProperty('--h', Math.max(12, Math.round(p.saved / max * 56)) + 'px');
      return li;
    }));

    var body = $('ledger'), ti = 0, ts = 0, tc = 0;
    body.replaceChildren.apply(body, f.ledger.map(function (r) {
      var tr = tpl('tpl-row');
      tr.dataset.ok = String(r.ok);
      tr.querySelector('.n').textContent = String(r.n);
      tr.querySelector('.nm').textContent = r.name;
      tr.querySelector('.in').textContent = money(r.income);
      tr.querySelector('.sv').textContent = money(r.saving);
      tr.querySelector('.cs').textContent = money(r.consumption);
      ti += r.income; ts += r.ok ? r.saving : 0; tc += r.consumption;
      return tr;
    }));
    drawChart(f, inv / (1 - s.settings.pmc));
    setText($('t-income'), money(ti));
    setText($('t-saving'), money(ts));
    setText($('t-cons'), money(tc));
  }

  // Bars: the income of each pass. Line: the running total. Dashes: k × ΔI. One scale (0 → theory) so the
  // shrinking bars visibly add up to the line that approaches the theory.
  var SVG = 'http://www.w3.org/2000/svg';
  function el(name, attrs, text) {
    var n = document.createElementNS(SVG, name);
    Object.keys(attrs).forEach(function (k) { n.setAttribute(k, String(attrs[k])); });
    if (text != null) n.textContent = text;
    return n;
  }
  function drawChart(f, theory) {
    var svg = $('chart'), W = Math.max(200, Math.round(svg.getBoundingClientRect().width)), H = 170;
    var padL = 4, padR = 156, top = 14, bottom = H - 18, plotW = W - padL - padR, n = f.ledger.length;
    svg.setAttribute('viewBox', '0 0 ' + W + ' ' + H);
    var y = function (v) { return bottom - (v / theory) * (bottom - top); };
    var step = n ? plotW / n : plotW, bw = Math.max(2, Math.min(18, step * 0.62));
    var parts = [el('line', { 'class': 'base', x1: padL, x2: padL + plotW, y1: bottom, y2: bottom })];
    var cum = 0, pts = [];
    f.ledger.forEach(function (r, i) {
      var cx = padL + step * i + step / 2;
      parts.push(el('rect', { 'class': r.ok ? 'bar' : 'bar miss', x: (cx - bw / 2).toFixed(1), y: y(r.income).toFixed(1), width: bw.toFixed(1), height: Math.max(1, bottom - y(r.income)).toFixed(1) }));
      cum += r.income;
      pts.push(cx.toFixed(1) + ',' + y(cum).toFixed(1));
    });
    parts.push(el('line', { 'class': 'theory', x1: padL, x2: padL + plotW, y1: y(theory), y2: y(theory) }));
    if (pts.length) parts.push(el('polyline', { 'class': 'cum', points: pts.join(' ') }));
    parts.push(el('text', { x: padL + plotW + 10, y: y(theory) + 4, 'class': 'strong' }, 'k × ΔI ' + money(theory)));
    parts.push(el('text', { x: padL + plotW + 10, y: y(cum) + 20 }, 'se movió ' + money(f.moved)));
    parts.push(el('text', { x: padL, y: H - 2 }, 'pase 1'));
    parts.push(el('text', { x: padL + plotW, y: H - 2, 'text-anchor': 'end' }, 'pase ' + n));
    svg.replaceChildren.apply(svg, parts);
  }

  // ---------- Clock: one rAF loop, driven by the msLeft of the last state ----------
  function setRing(ms) {
    var left = Math.max(0, ms);
    $('ring').style.setProperty('--progress', String(left / L.turnMs));
    setText($('secs'), String(Math.ceil(left / 1000)));
  }
  (function tick() {
    if (state && state.phase === 'playing' && deadline) setRing(deadline - performance.now());
    requestAnimationFrame(tick);
  })();

  // ---------- Controls ----------
  Protocol.PRESETS.forEach(function (pr, i) {
    var b = document.createElement('button');
    b.type = 'button';
    b.className = 'preset';
    b.dataset.i = String(i);
    var t = document.createElement('b'); t.textContent = pr.label;
    var d = document.createElement('span'); d.textContent = money(pr.investment).replace('.00', '') + ' · PMC ' + pmcText(pr.pmc);
    b.append(t, d);
    b.addEventListener('click', function () { socket.emit(E.HOST_SETTINGS, { investment: pr.investment, pmc: pr.pmc }); });
    $('presets').appendChild(b);
  });

  function num(v) { return Number(String(v).replace(/[$\s,]/g, '').replace(/^(\d+)\/(\d+)$/, function (_, a, b) { return String(a / b); })); }
  function sendSettings() {
    if (!state) return;
    var investment = num($('inv').value), pmc = num($('pmc').value.replace(',', '.'));
    if (!isFinite(investment) || !isFinite(pmc)) { toast('Escribe números válidos.'); return; }
    if (investment === state.settings.investment && Math.abs(pmc - state.settings.pmc) < 0.0001) return;
    socket.emit(E.HOST_SETTINGS, { investment: investment, pmc: pmc });
  }
  ['inv', 'pmc'].forEach(function (id) {
    $(id).addEventListener('change', sendSettings);
    $(id).addEventListener('keydown', function (e) { if (e.key === 'Enter') e.target.blur(); });
  });

  $('sound').addEventListener('click', function () {
    var on = this.getAttribute('aria-pressed') !== 'true';
    this.setAttribute('aria-pressed', String(on));
    this.textContent = on ? 'Sonido sí' : 'Sonido';
    if (window.Sfx) { Sfx.set(on); if (on) Sfx.pass(); }
  });
  $('bots').addEventListener('click', function () { socket.emit(E.HOST_ADD_BOTS, { count: 5 }); });
  $('start').addEventListener('click', function () { socket.emit(E.HOST_START, {}); });
  confirmClick($('end'), '¿Terminar?', function () { socket.emit(E.HOST_END, {}); });
  $('again').addEventListener('click', function () { socket.emit(E.HOST_START, {}); });
  $('to-lobby').addEventListener('click', function () { socket.emit(E.HOST_LOBBY, {}); });

  showHost();
})();
