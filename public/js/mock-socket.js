// A fake Socket.IO client for building screens without a server (IDEA §4.5 contract).
// With ?mock=lobby|playing|myturn|passed|final in the URL, createSocket() returns a fake that replays
// public/mock/<state>.json (demo_data: true) and ticks msLeft down; otherwise it returns the real io().
// Screens always call createSocket() and never io() directly.
(function (root) {
  'use strict';

  function FakeSocket(name) {
    this.handlers = {};
    this.name = name;
    this.data = null;
    this.connected = false;
    this.id = 'mock-' + name;
    var self = this;
    fetch('mock/' + name + '.json', { cache: 'no-store' })
      .then(function (r) { if (!r.ok) throw new Error('No existe el mock ' + name); return r.json(); })
      .then(function (data) { self.data = data; self.start(); })
      .catch(function (err) { self.fire('error:msg', { code: 'MOCK', message: err.message }); });
  }

  FakeSocket.prototype.on = function (event, cb) {
    (this.handlers[event] = this.handlers[event] || []).push(cb);
    return this;
  };
  FakeSocket.prototype.off = function (event, cb) {
    this.handlers[event] = (this.handlers[event] || []).filter(function (h) { return h !== cb; });
    return this;
  };
  FakeSocket.prototype.fire = function (event, payload) {
    (this.handlers[event] || []).forEach(function (h) { h(payload); });
  };

  // Acks answer like the server would; other events are logged so the screen author sees them.
  FakeSocket.prototype.emit = function (event, payload, ack) {
    var d = this.data || {};
    if (typeof console !== 'undefined') console.info('[mock] emit', event, payload || '');
    if (typeof ack !== 'function') return this;
    if (event === 'host:create' || event === 'host:resume') ack(Object.assign({ ok: true }, d.host || { code: d.state && d.state.code, hostToken: 'demo' }));
    else if (event === 'player:join') ack({ ok: true, playerId: d.you || 'p1' });
    else ack({ ok: true });
    return this;
  };

  FakeSocket.prototype.start = function () {
    var self = this, s = this.data.state;
    this.connected = true;
    this.fire('connect');
    this.fire('room:state', s);
    if (s.game && s.phase === 'playing' && this.data.you === s.game.holderId) {
      this.fire('you:turn', { turn: s.game.turn, amount: s.game.amount, msLeft: s.game.msLeft, pmc: s.settings.pmc });
    }
    // Tick the clock like a live turn: once per second, wrap to 10 s so the screen never freezes at 0.
    if (s.game && s.phase === 'playing') {
      this.timer = setInterval(function () {
        s.game.msLeft = s.game.msLeft > 1000 ? s.game.msLeft - 1000 : 10000;
        self.fire('room:state', s);
      }, 1000);
    }
  };

  FakeSocket.prototype.disconnect = function () { clearInterval(this.timer); this.connected = false; this.fire('disconnect'); };

  function mockName() {
    var m = /[?&]mock=([a-z]+)/.exec(root.location ? root.location.search : '');
    return m ? m[1] : null;
  }

  root.createSocket = function (opts) {
    var name = mockName();
    if (name) return new FakeSocket(name);
    return root.io(opts);
  };
  root.isMock = function () { return !!mockName(); };
})(typeof self !== 'undefined' ? self : this);
