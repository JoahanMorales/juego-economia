const crypto = require('node:crypto');
const { cleanName, uniqueName, normalizeCode } = require('./validate');

const CODE_ALPHABET = 'ABCDEFGHJKMNPRSTVWXYZ';
const IDLE_MS = 2 * 60 * 60 * 1000;

function createRooms() {
  const rooms = new Map();

  function newCode() {
    for (;;) {
      let code = '';
      for (let i = 0; i < 4; i++) code += CODE_ALPHABET[crypto.randomInt(CODE_ALPHABET.length)];
      if (!rooms.has(code)) return code;
    }
  }

  function create({ now = Date.now(), settings } = {}) {
    const room = {
      code: newCode(),
      hostToken: crypto.randomUUID(),
      hostSocketId: null,
      createdAt: now,
      lastActivity: now,
      settings: { investment: 1000, pmc: 0.75, turnMs: 10000, tolerance: 0.5, ...settings },
      phase: 'lobby',
      players: new Map(),
      game: null,
    };
    rooms.set(room.code, room);
    return room;
  }

  const find = (code) => rooms.get(normalizeCode(code));

  function remove(code) {
    const room = rooms.get(code);
    if (room && room.game && room.game.timer) clearTimeout(room.game.timer);
    return rooms.delete(code);
  }

  // Reconnecting needs the player's secret: the public id travels in room:state, so it proves nothing.
  function join(room, { name, playerId, secret, socketId = null, isBot = false }) {
    const existing = playerId && room.players.get(playerId);
    if (existing && !existing.isBot && typeof secret === 'string' && secret === existing.secret) {
      existing.connected = true;
      existing.socketId = socketId;
      return { ok: true, player: existing, reconnected: true };
    }
    const clean = cleanName(name);
    if (!clean) return { ok: false, error: 'Escribe tu nombre para entrar.' };
    const taken = [...room.players.values()].map((p) => p.name);
    const player = {
      id: playerId && !room.players.has(playerId) ? playerId : crypto.randomUUID(),
      secret: crypto.randomUUID(),
      name: uniqueName(clean, taken),
      socketId,
      connected: true,
      isBot,
      saved: 0,
      errors: 0,
      totalResponseMs: 0,
      turns: 0,
    };
    room.players.set(player.id, player);
    return { ok: true, player, reconnected: false };
  }

  function setConnected(room, playerId, connected, socketId = null) {
    const p = room.players.get(playerId);
    if (!p) return null;
    p.connected = connected;
    p.socketId = connected ? socketId : null;
    return p;
  }

  const kick = (room, playerId) => room.players.delete(playerId);

  function touch(room, now = Date.now()) { room.lastActivity = now; }

  function sweep(now = Date.now()) {
    const removed = [];
    for (const [code, room] of rooms) {
      if (now - room.lastActivity > IDLE_MS) {
        remove(code);
        removed.push(code);
      }
    }
    return removed;
  }

  return { create, find, delete: remove, join, setConnected, kick, touch, sweep, size: () => rooms.size };
}

module.exports = { createRooms, CODE_ALPHABET, IDLE_MS };
