const test = require('node:test');
const assert = require('node:assert');
const { createRooms, CODE_ALPHABET } = require('../src/rooms');

test('create: código único sin letras ambiguas y hostToken uuid', () => {
  const r = createRooms();
  const seen = new Set();
  for (let i = 0; i < 200; i++) {
    const room = r.create({ now: 1 });
    assert.match(room.code, /^[A-Z]{4}$/);
    assert.ok(!/[ILOQU]/.test(room.code), room.code);
    assert.ok(!seen.has(room.code));
    seen.add(room.code);
    assert.match(room.hostToken, /^[0-9a-f-]{36}$/);
  }
  assert.ok(!/[ILOQU]/.test(CODE_ALPHABET));
});

test('create/find/delete', () => {
  const r = createRooms();
  const room = r.create({ now: 5 });
  assert.strictEqual(room.phase, 'lobby');
  assert.strictEqual(room.createdAt, 5);
  assert.strictEqual(room.lastActivity, 5);
  assert.strictEqual(r.find(room.code), room);
  assert.strictEqual(r.find(room.code.toLowerCase()), room);
  assert.strictEqual(r.find('ZZZZ'), undefined);
  assert.strictEqual(r.delete(room.code), true);
  assert.strictEqual(r.find(room.code), undefined);
});

test('join: nuevo, duplicado y reconexión conserva saved/errors', () => {
  const r = createRooms();
  const room = r.create();
  const a = r.join(room, { name: ' <b>Ana</b> ', playerId: 'p1', socketId: 's1' });
  assert.strictEqual(a.ok, true);
  assert.strictEqual(a.player.name, 'Ana');
  assert.strictEqual(a.player.connected, true);
  const b = r.join(room, { name: 'Ana', playerId: 'p2' });
  assert.strictEqual(b.player.name, 'Ana 2');
  a.player.saved = 40;
  a.player.errors = 2;
  r.setConnected(room, 'p1', false);
  assert.strictEqual(a.player.connected, false);
  assert.strictEqual(a.player.socketId, null);
  const again = r.join(room, { name: 'Otro', playerId: 'p1', secret: a.player.secret, socketId: 's9' });
  assert.strictEqual(again.reconnected, true);
  assert.strictEqual(again.player, a.player);
  assert.strictEqual(a.player.saved, 40);
  assert.strictEqual(a.player.errors, 2);
  assert.strictEqual(a.player.name, 'Ana');
  assert.strictEqual(a.player.connected, true);
  assert.strictEqual(a.player.socketId, 's9');
  assert.strictEqual(room.players.size, 2);
});

test('join: nombre vacío rechazado en español; sin playerId genera uno', () => {
  const r = createRooms();
  const room = r.create();
  const bad = r.join(room, { name: '  ' });
  assert.strictEqual(bad.ok, false);
  assert.match(bad.error, /nombre/i);
  const ok = r.join(room, { name: 'Luis' });
  assert.match(ok.player.id, /^[0-9a-f-]{36}$/);
});

test('kick y setConnected', () => {
  const r = createRooms();
  const room = r.create();
  r.join(room, { name: 'Ana', playerId: 'p1' });
  assert.strictEqual(r.kick(room, 'p1'), true);
  assert.strictEqual(r.kick(room, 'p1'), false);
  assert.strictEqual(r.setConnected(room, 'nadie', true), null);
});

test('touch y sweep (> 2 h)', () => {
  const r = createRooms();
  const H = 3600000;
  const old = r.create({ now: 0 });
  const fresh = r.create({ now: 0 });
  r.touch(fresh, 1.5 * H);
  assert.strictEqual(fresh.lastActivity, 1.5 * H);
  const removed = r.sweep(2 * H + 1);
  assert.deepStrictEqual(removed, [old.code]);
  assert.strictEqual(r.find(old.code), undefined);
  assert.strictEqual(r.find(fresh.code), fresh);
  assert.deepStrictEqual(r.sweep(2 * H), []);
});

test('reconectar exige el secret: el id público no basta para suplantar', () => {
  const r = createRooms();
  const room = r.create();
  const ana = r.join(room, { name: 'Ana', socketId: 's1' }).player;
  ana.saved = 120;
  r.setConnected(room, ana.id, false);
  for (const secret of [undefined, '', 'adivinado']) {
    const fake = r.join(room, { name: 'Intruso', playerId: ana.id, secret, socketId: 'sX' });
    assert.strictEqual(fake.reconnected, false);
    assert.notStrictEqual(fake.player.id, ana.id);
    assert.strictEqual(fake.player.saved, 0);
  }
  assert.strictEqual(ana.connected, false);
  const back = r.join(room, { name: 'Ana', playerId: ana.id, secret: ana.secret, socketId: 's2' });
  assert.strictEqual(back.reconnected, true);
  assert.strictEqual(back.player.saved, 120);
  assert.match(ana.secret, /^[0-9a-f-]{36}$/);
});
