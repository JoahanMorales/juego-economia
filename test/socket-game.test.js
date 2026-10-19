const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { io: connect } = require('socket.io-client');
const { createServer } = require('../server');

let srv;
let url;
const clients = [];

before(async () => {
  srv = createServer({ turnMs: 300 });
  srv.ctx.rateMs = 0;
  await new Promise((r) => srv.server.listen(0, '127.0.0.1', r));
  url = `http://127.0.0.1:${srv.server.address().port}`;
});

after(async () => {
  clients.forEach((c) => c.close());
  srv.io.close();
  await new Promise((r) => srv.server.close(() => r()));
});

function client() {
  const c = connect(url, { forceNew: true, transports: ['websocket'] });
  c.on('room:state', (s) => { c.last = s; });
  clients.push(c);
  return c;
}
const ask = (c, ev, data) => new Promise((r) => c.emit(ev, data, r));
const once = (c, ev) => new Promise((r) => c.once(ev, r));
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const round2 = (x) => Math.round(x * 100) / 100;

// Espera un room:state que cumpla pred (revisa primero el último recibido).
function until(c, pred, ms = 20000) {
  return new Promise((resolve, reject) => {
    if (c.last && pred(c.last)) return resolve(c.last);
    const t = setTimeout(() => reject(new Error('until: tiempo agotado')), ms);
    const h = (s) => {
      if (pred(s)) { clearTimeout(t); c.off('room:state', h); resolve(s); }
    };
    c.on('room:state', h);
    return undefined;
  });
}

async function newRoom({ players = 2, bots = 0 } = {}) {
  const host = client();
  const { code } = await ask(host, 'host:create', {});
  const ps = [];
  for (let i = 0; i < players; i++) {
    const c = client();
    c.turns = [];
    c.on('you:turn', (t) => c.turns.push(t));
    const { playerId } = await ask(c, 'player:join', { code, name: `J${i + 1}` });
    c.pid = playerId;
    ps.push(c);
  }
  if (bots) host.emit('host:addBots', { count: bots });
  await until(host, (s) => s.players.length === players + bots);
  return { host, code, ps };
}

// Juega bien: ahorra lo correcto y le pasa a otro.
function autoplay(c, ids) {
  c.on('you:turn', (t) => {
    const toId = ids.find((o) => o !== c.pid);
    c.emit('player:pass', { turn: t.turn, saving: round2(t.amount * (1 - t.pmc)), toId });
  });
}

test('partida completa: 2 jugadores + 3 bots llega a final y cuadra', async () => {
  const { host, ps } = await newRoom({ players: 2, bots: 3 });
  const ids = ps.map((p) => p.pid);
  ps.forEach((p) => autoplay(p, ids));
  host.emit('host:start', {});
  const s = await until(host, (x) => x.phase === 'final', 40000);
  const saved = s.final.ranking.reduce((a, r) => a + r.saved, 0);
  const total = saved + s.final.lostSavings + s.game.amount;
  assert.ok(Math.abs(total - 1000) < 0.1, `Σ = ${total}`);
  assert.ok(s.game.amount < 1);
  assert.equal(s.final.ledger.length, s.game.passes);
  assert.equal(s.game.paused, false);
});

test('un turno viejo se ignora y un no-poseedor no mueve el dinero', async () => {
  const { host, ps } = await newRoom({ players: 2 });
  host.emit('host:start', {});
  const s = await until(host, (x) => x.phase === 'playing');
  const holder = ps.find((p) => p.pid === s.game.holderId);
  const other = ps.find((p) => p !== holder);
  await wait(50);
  assert.equal(other.turns.length, 0); // you:turn sólo llega al que tiene el dinero
  assert.equal(holder.turns.length, 1);
  other.emit('player:pass', { turn: 1, saving: 250, toId: holder.pid });
  holder.emit('player:pass', { turn: 99, saving: 250, toId: other.pid });
  await wait(60);
  assert.equal(host.last.game.passes, 0);
  assert.equal(host.last.game.turn, 1);
  holder.emit('player:pass', { turn: 1, saving: '250', toId: other.pid });
  holder.emit('player:pass', { turn: 1, saving: 250, toId: other.pid }); // doble clic
  const s2 = await until(host, (x) => x.game && x.game.turn === 2);
  assert.equal(s2.game.passes, 1);
  assert.equal(s2.game.holderId, other.pid);
  assert.equal(s2.game.amount, 750);
  await wait(60);
  assert.equal(host.last.game.turn, 2);
});

test('timeout: pierde el ahorro y el dinero pasa a otra persona', async () => {
  const { host } = await newRoom({ players: 2 });
  host.emit('host:start', {});
  const s = await until(host, (x) => x.phase === 'playing');
  const s2 = await until(host, (x) => x.game && x.game.turn === 2);
  assert.notEqual(s2.game.holderId, s.game.holderId);
  assert.equal(s2.game.lastEvent.ok, false);
  assert.equal(s2.game.amount, 750);
});

test('si el poseedor se desconecta se resuelve en ~3 s (o turnMs si es menor)', async () => {
  const { host, ps } = await newRoom({ players: 3 });
  host.emit('host:start', {});
  const s = await until(host, (x) => x.phase === 'playing');
  const holder = ps.find((p) => p.pid === s.game.holderId);
  const t0 = Date.now();
  holder.close();
  const s2 = await until(host, (x) => x.game && x.game.turn === 2, 5000);
  assert.ok(Date.now() - t0 < 3500);
  assert.notEqual(s2.game.holderId, holder.pid);
  assert.equal(s2.game.lastEvent.ok, false);
});

test('menos de 2 conectados pausa y al volver se reanuda en el mismo turno', async () => {
  const { host, code, ps } = await newRoom({ players: 2 });
  host.emit('host:start', {});
  const s = await until(host, (x) => x.phase === 'playing');
  const holder = ps.find((p) => p.pid === s.game.holderId);
  const other = ps.find((p) => p !== holder);
  other.close();
  const paused = await until(host, (x) => x.game && x.game.paused);
  assert.equal(paused.game.turn, 1);
  await wait(700); // más que turnMs + 300: el reloj no corre en pausa
  assert.equal(host.last.game.turn, 1);
  assert.equal(host.last.game.passes, 0);
  const back = client();
  await ask(back, 'player:join', { code, name: 'J2', playerId: other.pid });
  const resumed = await until(host, (x) => x.game && !x.game.paused);
  assert.equal(resumed.game.turn, 1);
  assert.equal(resumed.game.holderId, holder.pid);
  assert.ok(resumed.game.msLeft > 100);
});

test('el poseedor que reconecta antes de 3 s recupera you:turn', async () => {
  const { host, code, ps } = await newRoom({ players: 3 });
  host.emit('host:start', {});
  const s = await until(host, (x) => x.phase === 'playing');
  const holder = ps.find((p) => p.pid === s.game.holderId);
  holder.close();
  await wait(30);
  const back = client();
  const turn = once(back, 'you:turn');
  await ask(back, 'player:join', { code, name: 'J', playerId: holder.pid });
  const t = await turn;
  assert.equal(t.turn, 1);
  back.emit('player:pass', { turn: 1, saving: 250, toId: null });
  const s2 = await until(host, (x) => x.game && x.game.turn === 2);
  assert.equal(s2.game.lastEvent.ok, true);
});

test('host:* desde un socket que no es el presentador da not_host', async () => {
  const { code } = await newRoom({ players: 2 });
  const intruder = client();
  await ask(intruder, 'player:join', { code, name: 'Intruso' });
  for (const ev of ['host:start', 'host:end', 'host:lobby', 'host:addBots']) {
    const err = once(intruder, 'error:msg');
    intruder.emit(ev, { count: 1 });
    const e = await err;
    assert.equal(e.code, 'not_host');
    assert.match(e.message, /permiso/);
  }
});

test('host:start con menos de 2 conectados falla y host:addBots valida', async () => {
  const { host } = await newRoom({ players: 1 });
  let err = once(host, 'error:msg');
  host.emit('host:start', {});
  assert.equal((await err).code, 'few_players');
  err = once(host, 'error:msg');
  host.emit('host:addBots', { count: 11 });
  assert.equal((await err).code, 'bad_count');
  host.emit('host:addBots', { count: 2 });
  const s = await until(host, (x) => x.players.length === 3);
  assert.deepEqual(s.players.filter((p) => p.isBot).map((p) => p.name), ['Bot Panadero', 'Bot Carnicero']);
});

test('host:end termina con final, otra ronda arranca y host:lobby reinicia', async () => {
  const { host } = await newRoom({ players: 2 });
  host.emit('host:start', {});
  await until(host, (x) => x.phase === 'playing');
  host.emit('host:end', {});
  const fin = await until(host, (x) => x.phase === 'final');
  assert.equal(fin.final.ranking.length, 2);
  host.emit('host:start', {}); // "Otra ronda"
  const again = await until(host, (x) => x.phase === 'playing');
  assert.equal(again.game.turn, 1);
  host.emit('host:lobby', {});
  const lobby = await until(host, (x) => x.phase === 'lobby');
  assert.equal(lobby.game, null);
  await wait(700); // los timers viejos no deben resucitar la partida
  assert.equal(host.last.phase, 'lobby');
});
