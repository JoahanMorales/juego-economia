const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { io: connect } = require('socket.io-client');
const { createServer } = require('../server');

let srv;
let url;
const clients = [];

before(async () => {
  srv = createServer({});
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
  clients.push(c);
  return c;
}
const once = (c, ev) => new Promise((r) => c.once(ev, r));
const ask = (c, ev, data) => new Promise((r) => c.emit(ev, data, r));
const until = (c, pred) => new Promise((r) => c.on('room:state', (s) => pred(s) && r(s)));
const wait =(ms) => new Promise((r) => setTimeout(r, ms));

async function newRoom() {
  const host = client();
  const created = await ask(host, 'host:create', {});
  return { host, ...created };
}

test('host:create devuelve código, token, joinUrl y QR', async () => {
  const { code, hostToken, joinUrl, qr } = await newRoom();
  assert.match(code, /^[A-Z]{4}$/);
  assert.ok(hostToken);
  assert.equal(joinUrl, `${url}/play.html?code=${code}`);
  assert.match(qr, /^data:image\/png;base64,/);
});

test('host sin token recibe error:msg en español', async () => {
  const { code } = await newRoom();
  const intruder = client();
  const err = once(intruder, 'error:msg');
  intruder.emit('host:settings', { investment: 500, pmc: 0.5 });
  assert.match((await err).message, /permiso/);
  const err2 = once(intruder, 'error:msg');
  intruder.emit('host:resume', { code, hostToken: 'falso' });
  assert.equal((await err2).code, 'not_host');
  const err3 = once(intruder, 'error:msg');
  intruder.emit('host:kick', { playerId: 'x' });
  assert.equal((await err3).code, 'not_host');
});

test('player:join, room:state sin hostToken y desconexión en gris', async () => {
  const { host, code, hostToken } = await newRoom();
  const p = client();
  const state = once(host, 'room:state');
  const { playerId } = await ask(p, 'player:join', { code, name: 'Ana' });
  const s = await state;
  assert.equal(s.players[0].name, 'Ana');
  assert.equal(s.players[0].connected, true);
  assert.ok(!JSON.stringify(s).includes(hostToken));

  const gray = until(host, (s) => s.players.length === 1 && !s.players[0].connected);
  p.close();
  assert.equal((await gray).players[0].connected, false);

  const p2 = client();
  const back = until(host, (s) => s.players.length === 1 && s.players[0].connected);
  const r = await ask(p2, 'player:join', { code, name: 'Otro', playerId });
  assert.equal(r.playerId, playerId);
  const s2 = await back;
  assert.equal(s2.players.length, 1);
  assert.equal(s2.players[0].connected, true);
});

test('nombres repetidos y sala inexistente', async () => {
  const { code } = await newRoom();
  const a = client();
  const b = client();
  await ask(a, 'player:join', { code, name: 'Ana' });
  const st = until(a, (s) => s.players.length === 2);
  await ask(b, 'player:join', { code, name: 'Ana' });
  assert.deepEqual((await st).players.map((x) => x.name), ['Ana', 'Ana 2']);
  const c = client();
  const err = once(c, 'error:msg');
  c.emit('player:join', { code: 'ZZZZ', name: 'X' });
  assert.equal((await err).code, 'no_room');
});

test('host:settings valida, y host:resume reanuda con el token', async () => {
  const { host, code, hostToken } = await newRoom();
  const st = until(host, (s) => s.settings.investment === 2000);
  host.emit('host:settings', { investment: 2000, pmc: 0.5 });
  assert.deepEqual((await st).settings, { investment: 2000, pmc: 0.5 });

  const bad = once(host, 'error:msg');
  host.emit('host:settings', { investment: 1, pmc: 0.5 });
  assert.equal((await bad).code, 'bad_settings');

  const host2 = client();
  const res = await ask(host2, 'host:resume', { code, hostToken });
  assert.equal(res.code, code);
  const st2 = until(host2, (s) => s.settings.investment === 3000);
  host2.emit('host:settings', { investment: 3000, pmc: 0.75 });
  assert.equal((await st2).settings.investment, 3000);
  // el socket anterior ya no es el presentador
  const err = once(host, 'error:msg');
  host.emit('host:settings', { investment: 100, pmc: 0.5 });
  assert.equal((await err).code, 'not_host');
});

test('host:settings fuera del lobby se rechaza', async () => {
  const { host, code } = await newRoom();
  srv.ctx.rooms.find(code).phase = 'playing';
  const err = once(host, 'error:msg');
  host.emit('host:settings', { investment: 500, pmc: 0.5 });
  assert.equal((await err).code, 'bad_phase');
});

test('host:kick saca al jugador', async () => {
  const { host, code } = await newRoom();
  const p = client();
  const { playerId } = await ask(p, 'player:join', { code, name: 'Luis' });
  const kicked = once(p, 'error:msg');
  const empty = new Promise((r) => host.on('room:state', (s) => s.players.length === 0 && r(s)));
  host.emit('host:kick', { playerId });
  assert.equal((await kicked).code, 'kicked');
  assert.equal((await empty).players.length, 0);
});

test('en fase final se emite final.theoretical y un ranking no vacío', async () => {
  const game = require('../src/game');
  const { host, code } = await newRoom();
  const a = client();
  const b = client();
  await ask(a, 'player:join', { code, name: 'Ana' });
  await ask(b, 'player:join', { code, name: 'Beto' });
  const room = srv.ctx.rooms.find(code);
  game.startGame(room);
  game.resolveTurn(room, { turn: 1, saving: 0 });
  game.finish(room);
  const pending = until(host, (s) => s.phase === 'final');
  srv.ctx.broadcast(room);
  const state = await pending;
  assert.equal(state.final.theoretical, game.round2(room.settings.investment / (1 - room.settings.pmc)));
  assert.ok(state.final.ranking.length > 0);
  assert.equal(JSON.stringify(state).includes('hostToken'), false);
});

test('límite de 1 acción por segundo por socket', async () => {
  srv.ctx.rateMs = undefined;
  try {
    const c = client();
    await once(c, 'connect');
    const errs = [];
    c.on('error:msg', (e) => errs.push(e));
    c.emit('player:join', { code: 'ZZZZ', name: 'A' });
    c.emit('player:join', { code: 'ZZZZ', name: 'B' });
    await wait(200);
    assert.deepEqual(errs.map((e) => e.code), ['no_room', 'rate_limit']);
  } finally {
    srv.ctx.rateMs = 0;
  }
});
