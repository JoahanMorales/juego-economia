const game = require('./game');
const bots = require('./bots');
const { validateSaving, createRateLimiter } = require('./validate');

const DROP_MS = 3000; // el que tiene el dinero se desconectó: se resuelve como tiempo agotado
const TURN_GRACE_MS = 300; // margen del reloj del servidor sobre el del celular
const MAX_PLAYERS = 60;
const MAX_BOTS_PER_CALL = 10;

module.exports = function socketGame(io, ctx) {
  const rooms = ctx.rooms;
  const limiter = createRateLimiter({ intervalMs: 1000 });

  // publicState no trae `paused`: se agrega aquí, una sola vez, para todos los broadcasts.
  ctx.broadcast = (room) => {
    const s = game.publicState(room);
    if (s.game) s.game.paused = !!(room.game && room.game.paused);
    io.to(room.code).emit('room:state', s);
  };

  const connectedCount = (room) => [...room.players.values()].filter((p) => p.connected).length;

  function clearTimers(room) {
    const g = room.game;
    if (!g) return;
    for (const k of ['timer', 'botTimer', 'dropTimer']) {
      if (g[k]) clearTimeout(g[k]);
      g[k] = null;
    }
  }

  // Un timer sólo actúa si la sala y el turno siguen siendo los mismos.
  function schedule(room, key, ms, fn) {
    const g = room.game;
    const turn = g.turn;
    const t = setTimeout(() => {
      g[key] = null;
      if (rooms.find(room.code) !== room || room.game !== g || room.phase !== 'playing' || g.paused || g.turn !== turn) return;
      fn(turn);
    }, ms);
    if (t.unref) t.unref();
    g[key] = t;
  }

  function emitTurn(room) {
    const g = room.game;
    const holder = room.players.get(g.holderId);
    const sock = holder && holder.socketId && io.sockets.sockets.get(holder.socketId);
    if (!sock) return;
    sock.emit('you:turn', {
      turn: g.turn,
      amount: g.amount,
      msLeft: Math.max(0, g.deadline - Date.now()),
      pmc: room.settings.pmc,
    });
  }

  function resolve(room, move) {
    const r = game.resolveTurn(room, move, Math.random, Date.now());
    if (r.ignored) return;
    if (r.finished) {
      clearTimers(room);
      ctx.broadcast(room);
    } else {
      nextTurn(room);
    }
  }

  function nextTurn(room) {
    const g = room.game;
    clearTimers(room);
    g.paused = false;
    const turnMs = room.settings.turnMs;
    schedule(room, 'timer', turnMs + TURN_GRACE_MS, (turn) => resolve(room, { turn, timeout: true }));

    const holder = room.players.get(g.holderId);
    if (holder && holder.isBot) {
      const plan = bots.planMove(Math.random, {
        income: g.amount,
        pmc: room.settings.pmc,
        holderId: holder.id,
        players: [...room.players.values()],
        tolerance: room.settings.tolerance,
      });
      schedule(room, 'botTimer', plan.delayMs, (turn) => resolve(room, { turn, saving: plan.saving, toId: plan.toId }));
    } else if (holder && !holder.connected) {
      schedule(room, 'dropTimer', Math.min(DROP_MS, turnMs), (turn) => resolve(room, { turn, timeout: true }));
    } else {
      emitTurn(room);
    }
    ctx.broadcast(room);
  }

  io.on('connection', (socket) => {
    const fail = (code, message) => socket.emit('error:msg', { code, message });

    function hostRoom() {
      const room = socket.data.hostCode && rooms.find(socket.data.hostCode);
      if (!room || room.hostSocketId !== socket.id) {
        fail('not_host', 'No tienes permiso de presentador para esta sala.');
        return null;
      }
      return room;
    }

    socket.on('host:addBots', (data) => {
      const room = hostRoom();
      if (!room) return;
      if (room.phase !== 'lobby') return fail('bad_phase', 'Sólo puedes agregar bots en el lobby.');
      const count = data && data.count;
      if (!Number.isInteger(count) || count < 1 || count > MAX_BOTS_PER_CALL) {
        return fail('bad_count', 'Puedes agregar de 1 a 10 bots a la vez.');
      }
      if (room.players.size + count > MAX_PLAYERS) return fail('room_full', 'La sala admite máximo 60 jugadores.');
      let n = [...room.players.values()].filter((p) => p.isBot).length;
      for (let i = 0; i < count; i++) rooms.join(room, bots.makeBot(n++));
      rooms.touch(room);
      ctx.broadcast(room);
    });

    socket.on('host:start', () => {
      const room = hostRoom();
      if (!room) return;
      if (room.phase !== 'lobby' && room.phase !== 'final') return fail('bad_phase', 'La partida ya está en curso.');
      if (connectedCount(room) < 2) return fail('few_players', 'Se necesitan al menos 2 jugadores conectados.');
      clearTimers(room);
      game.startGame(room, Math.random, Date.now());
      rooms.touch(room);
      nextTurn(room);
    });

    socket.on('host:end', () => {
      const room = hostRoom();
      if (!room) return;
      if (room.phase !== 'playing') return fail('bad_phase', 'No hay una partida en curso.');
      clearTimers(room);
      game.finish(room);
      rooms.touch(room);
      ctx.broadcast(room);
    });

    socket.on('host:lobby', () => {
      const room = hostRoom();
      if (!room) return;
      clearTimers(room);
      room.phase = 'lobby';
      room.game = null;
      rooms.touch(room);
      ctx.broadcast(room);
    });

    socket.on('player:pass', (data) => {
      if (!data || typeof data !== 'object') return;
      const room = socket.data.playerCode && rooms.find(socket.data.playerCode);
      const g = room && room.game;
      const me = room && room.players.get(socket.data.playerId);
      if (!g || room.phase !== 'playing' || g.paused || !me || me.socketId !== socket.id) return;
      if (g.holderId !== me.id || data.turn !== g.turn) return; // no es su turno o es un turno viejo
      const raw = typeof data.saving === 'string' && data.saving.trim() !== '' ? Number(data.saving) : data.saving;
      const v = validateSaving(raw);
      if (!v.ok) return fail('bad_saving', v.error);
      if (ctx.rateMs !== 0 && !limiter.allow(socket.id)) return fail('rate_limit', 'Vas muy rápido. Espera un segundo.');
      rooms.touch(room);
      resolve(room, { turn: g.turn, saving: v.value, toId: data.toId });
    });

    // Los listeners de socket-lobby ya corrieron: `connected` y `socketId` están al día.
    socket.on('player:join', (data) => {
      const room = data && rooms.find(data.code);
      const g = room && room.game;
      const me = room && room.players.get(socket.data.playerId);
      if (!g || room.phase !== 'playing' || !me || me.socketId !== socket.id) return;
      if (g.paused) {
        if (connectedCount(room) < 2) return;
        g.deadline = Date.now() + room.settings.turnMs;
        nextTurn(room);
      } else if (me.id === g.holderId) {
        if (g.dropTimer) clearTimeout(g.dropTimer);
        g.dropTimer = null;
        emitTurn(room);
      }
    });

    socket.on('disconnect', () => {
      limiter.forget(socket.id);
      const { playerId, playerCode } = socket.data;
      const room = playerId && playerCode && rooms.find(playerCode);
      const g = room && room.game;
      const me = room && room.players.get(playerId);
      if (!g || room.phase !== 'playing' || !me || me.connected || g.paused) return;
      if (connectedCount(room) < 2) {
        clearTimers(room);
        g.paused = true;
        ctx.broadcast(room);
      } else if (me.id === g.holderId && !g.dropTimer) {
        schedule(room, 'dropTimer', Math.min(DROP_MS, room.settings.turnMs), (turn) => resolve(room, { turn, timeout: true }));
      }
    });
  });
};
