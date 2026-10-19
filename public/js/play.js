// Pásala · phone screen (IDEA §3.2). The server decides everything; this page shows state and sends player:pass.
// Player data (names, messages) only goes through textContent.
(function () {
  'use strict';
  var E = Protocol.EVENTS, KEY = 'pasala.player';
  var socket = createSocket();
  var state = null;          // last room:state
  var me = null;             // {code, playerId, name} once joined
  var turnInfo = null;       // last you:turn {turn, amount, msLeft, pmc}
  var deadline = 0;          // Date.now() + msLeft of the current turn
  var passedTurn = null;     // turn I just passed (optimistic "¡Pasada!")
  var wasMine = false, shownTurn = null, matesSig = '', toId = null, joining = false;

  function $(id) { return document.getElementById(id); }
  var SCREENS = ['join', 'wait', 'other', 'turn', 'passed', 'final'];

  function load() { try { return JSON.parse(localStorage.getItem(KEY)); } catch (e) { return null; } }
  function save(p) { try { localStorage.setItem(KEY, JSON.stringify(p)); } catch (e) { /* private mode */ } }
  function forget() { try { localStorage.removeItem(KEY); } catch (e) { /* private mode */ } me = null; }

  function show(name) {
    SCREENS.forEach(function (s) { $('s-' + s).hidden = s !== name; });
    document.body.classList.toggle('on-hot', name === 'turn');
  }
  function playerById(id) {
    var ps = (state && state.players) || [];
    for (var i = 0; i < ps.length; i++) if (ps[i].id === id) return ps[i];
    return null;
  }
  function label(p) { return (p.isBot ? '🤖 ' : '') + p.name; }

  // ---- join ----
  var codeFromUrl = (/[?&]code=([A-Za-z0-9]+)/.exec(location.search) || [])[1];
  if (codeFromUrl) $('code').value = codeFromUrl.toUpperCase();
  var stored = load();
  if (stored && stored.code && !codeFromUrl) $('code').value = stored.code;
  if (stored && stored.name) $('name').value = stored.name;

  function joinError(msg) { $('join-err').textContent = msg || ''; }

  function doJoin(code, name, playerId, secret) {
    if (joining) return;
    joining = true;
    socket.emit(E.PLAYER_JOIN, { code: code, name: name, playerId: playerId || undefined, secret: secret || undefined }, function (res) {
      joining = false;
      if (!res || res.ok === false || !res.playerId) {
        if (playerId) forget();
        joinError((res && (res.message || res.error)) || 'No pudimos entrar a la sala. Revisa el código.');
        render();
        return;
      }
      // In mock mode the fake ack is canned, so keep the stored id the test chose.
      var id = (isMock() && playerId) ? playerId : res.playerId;
      me = { code: code, playerId: id, secret: res.secret || (isMock() ? secret : undefined), name: name };
      save(me);
      joinError('');
      render();
    });
  }

  $('join-form').addEventListener('submit', function (ev) {
    ev.preventDefault();
    var code = $('code').value.trim().toUpperCase(), name = $('name').value.trim();
    if (!code) return joinError('Escribe el código de la sala.');
    if (!name) return joinError('Escribe tu nombre.');
    joinError('');
    var prev = load();
    var same = prev && prev.code === code;
    doJoin(code, name, same ? prev.playerId : null, same ? prev.secret : null);
  });

  // ---- turn ----
  function parseSaving(raw) {
    var s = String(raw).replace(/[\s$]/g, '').replace(',', '.');
    if (!/^\d*\.?\d+$|^\d+\.$/.test(s)) return NaN;
    return Number(s);
  }

  function renderMates() {
    var ps = ((state && state.players) || []).filter(function (p) { return p.id !== me.playerId; });
    // "No regreses la papa": the one who passed to you is off limits, unless only the two of you are left.
    var g = state && state.game, live = ps.filter(function (p) { return p.connected; }).length;
    var banned = state && state.settings.noReturn && g && g.prevId && live > 1 ? g.prevId : null;
    if (banned === toId) toId = null;
    var sig = ps.map(function (p) { return p.id + '|' + p.name + '|' + p.connected + '|' + p.isBot; }).join(';') + '#' + toId + '#' + banned;
    if (sig === matesSig) return;
    matesSig = sig;
    var box = $('mates');
    box.textContent = '';
    ps.forEach(function (p) {
      var b = document.createElement('button');
      b.type = 'button';
      b.textContent = label(p);
      b.disabled = !p.connected || p.id === banned;
      if (p.id === banned) b.title = 'Te lo acaba de pasar: no se lo regreses';
      b.setAttribute('aria-pressed', String(p.id === toId));
      b.addEventListener('click', function () { toId = p.id; matesSig = ''; renderMates(); });
      box.appendChild(b);
    });
  }

  function renderTurn() {
    var g = state.game, t = g.turn;
    if (t !== shownTurn) {   // a new turn: clean form
      shownTurn = t; toId = null; matesSig = '';
      $('saving').value = ''; $('turn-err').textContent = '';
      $('go').disabled = false;
    }
    var chosen = toId && playerById(toId);
    if (chosen && !chosen.connected) { toId = null; matesSig = ''; }
    $('turn-amount').textContent = Format.money(turnInfo && turnInfo.turn === t ? turnInfo.amount : g.amount);
    var pmc = turnInfo && turnInfo.pmc != null ? turnInfo.pmc : state.settings.pmc;
    $('turn-hint').textContent = 'PMC ' + Format.pmcLabel(pmc) + '. Te quedas con lo que no consumes.';
    renderMates();
    tick();
  }

  function tick() {
    if (!state || !state.game || $('s-turn').hidden) return;
    var ms = Math.max(0, deadline - Date.now());
    $('clock').style.setProperty('--progress', String(Math.min(1, ms / Protocol.LIMITS.turnMs)));
    $('secs').textContent = String(Math.ceil(ms / 1000));
  }
  setInterval(tick, 100);

  $('turn-form').addEventListener('submit', function (ev) {
    ev.preventDefault();
    var g = state && state.game;
    if (!g || g.holderId !== me.playerId) return;
    var saving = parseSaving($('saving').value);
    var err = $('turn-err');
    if (isNaN(saving)) { err.textContent = 'Escribe cuánto te ahorras, por ejemplo 25.03.'; return; }
    if (!toId) { err.textContent = 'Elige a quién se lo pasas.'; return; }
    err.textContent = '';
    passedTurn = g.turn;
    $('go').disabled = true;
    socket.emit(E.PLAYER_PASS, { turn: g.turn, saving: saving, toId: toId });
    render();
  });

  // ---- render by state ----
  function render() {
    $('pause').hidden = !(state && state.game && state.game.paused);
    if (!me || !state) return show('join');
    var mine = playerById(me.playerId);
    if (!mine) { forget(); joinError('Ya no estás en la sala. Entra de nuevo.'); return show('join'); }
    var g = state.game, saved = Format.money(mine.saved);

    if (state.phase === 'final') {
      var rank = (state.final && state.final.ranking) || [], pos = 0, mySaved = mine.saved, i;
      for (i = 0; i < rank.length; i++) if (rank[i].id === me.playerId) { pos = i + 1; mySaved = rank[i].saved; }
      $('final-place').textContent = pos ? '#' + pos : '';
      $('final-saved').textContent = Format.money(mySaved);
      var inv = state.settings.investment, pmc = state.settings.pmc;
      $('final-sentence').textContent = Format.money(inv) + ' de inversión movieron ' +
        Format.money(state.final ? state.final.moved : 0) + ' en la economía.';
      $('final-formula').textContent = 'Multiplicador k = 1 / (1 - ' + Format.pmcLabel(pmc) + ') = ' + Format.k(pmc) + '.';
      wasMine = false;
      return show('final');
    }
    if (state.phase !== 'playing' || !g) {
      $('wait-name').textContent = me.name;
      $('wait-saved').textContent = saved;
      wasMine = false;
      return show('wait');
    }
    if (g.holderId === me.playerId) {
      if (passedTurn !== g.turn) {
        show('turn');
        if (!wasMine) {
          wasMine = true;
          try { if (navigator.vibrate) navigator.vibrate([220, 90, 220]); } catch (e) { /* unsupported */ }
        }
        return renderTurn();
      }
      $('passed-saved').textContent = saved;   // I passed, the server has not moved on yet
      return show('passed');
    }
    wasMine = false;
    var last = g.ledgerTail && g.ledgerTail[g.ledgerTail.length - 1];
    if (last && last.playerId === me.playerId) {
      $('passed-saved').textContent = saved;
      return show('passed');
    }
    var holder = playerById(g.holderId);
    $('other-name').textContent = holder ? label(holder) : '';
    $('other-amount').textContent = Format.money(g.amount);
    $('other-saved').textContent = saved;
    show('other');
  }

  // ---- socket ----
  function rejoin() {
    var p = me || load();
    if (p && p.code && p.playerId) doJoin(p.code, p.name, p.playerId, p.secret);
  }

  socket.on('connect', function () { $('conn').hidden = true; rejoin(); });
  socket.on('disconnect', function () { $('conn').hidden = false; });
  socket.on(E.ROOM_STATE, function (s) {
    state = s;
    var g = s.game;
    if (g && me && g.holderId === me.playerId && !(turnInfo && turnInfo.turn === g.turn)) {
      turnInfo = { turn: g.turn, amount: g.amount, msLeft: g.msLeft, pmc: s.settings.pmc };
    }
    if (g) deadline = Date.now() + g.msLeft;
    render();
  });
  socket.on(E.YOU_TURN, function (t) {
    turnInfo = t;
    deadline = Date.now() + t.msLeft;
    render();
  });
  socket.on(E.ERROR, function (e) {
    var msg = (e && e.message) || 'Algo salió mal.';
    if (!$('s-turn').hidden || passedTurn !== null) {
      passedTurn = null; $('go').disabled = false;
      render();
      $('turn-err').textContent = msg;
    } else joinError(msg);
  });

  // First paint: stored player resumes on connect; mock sockets connect on their own.
  if (stored && stored.playerId && !codeFromUrl) me = stored;
  show(me ? 'wait' : 'join');
  if (me) $('wait-name').textContent = me.name;
})();
