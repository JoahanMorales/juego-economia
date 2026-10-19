const QRCode = require('qrcode');
const { createRooms } = require('./rooms');
const { validateSettings, createRateLimiter } = require('./validate');
const { broadcast } = require('./broadcast');

const SWEEP_MS = 10 * 60 * 1000;

module.exports = function socketLobby(io, ctx) {
  const rooms = ctx.rooms || (ctx.rooms = createRooms());
  ctx.broadcast = (room) => broadcast(io, room);
  const limiter = createRateLimiter({ intervalMs: 1000 });

  const sweeper = setInterval(() => {
    for (const code of rooms.sweep()) io.in(code).socketsLeave(code);
  }, SWEEP_MS);
  sweeper.unref();
  ctx.server.on('close', () => clearInterval(sweeper));

  function publicUrl(socket) {
    const base = process.env.RENDER_EXTERNAL_URL
      || `${socket.handshake.headers['x-forwarded-proto'] || 'http'}://${socket.handshake.headers.host}`;
    return base.replace(/\/$/, '');
  }

  io.on('connection', (socket) => {
    const fail = (code, message) => socket.emit('error:msg', { code, message });
    const ack = (cb, data) => { if (typeof cb === 'function') cb(data); };

    // Envuelve cada evento: límite de 1 acción/s por socket y datos siempre como objeto.
    function on(event, handler) {
      socket.on(event, (data, cb) => {
        if (typeof data === 'function') { cb = data; data = {}; }
        if (!data || typeof data !== 'object') data = {};
        if (ctx.rateMs !== 0 && !limiter.allow(socket.id)) return fail('rate_limit', 'Vas muy rápido. Espera un segundo.');
        return handler(data, cb);
      });
    }

    function hostRoom() {
      const room = socket.data.hostCode && rooms.find(socket.data.hostCode);
      if (!room || room.hostSocketId !== socket.id) {
        fail('not_host', 'No tienes permiso de presentador para esta sala.');
        return null;
      }
      return room;
    }

    on('host:create', async (_data, cb) => {
      const room = rooms.create({ settings: { turnMs: ctx.turnMs } });
      room.hostSocketId = socket.id;
      socket.data.hostCode = room.code;
      socket.join(room.code);
      const joinUrl = `${publicUrl(socket)}/play.html?code=${room.code}`;
      try {
        const qr = await QRCode.toDataURL(joinUrl);
        ack(cb, { code: room.code, hostToken: room.hostToken, joinUrl, qr });
      } catch {
        fail('qr', 'No se pudo generar el código QR.');
      }
      ctx.broadcast(room);
    });

    on('host:resume', ({ code, hostToken }, cb) => {
      const room = rooms.find(code);
      if (!room || typeof hostToken !== 'string' || hostToken !== room.hostToken) {
        return fail('not_host', 'No se pudo reanudar la sala: código o clave inválidos.');
      }
      room.hostSocketId = socket.id;
      socket.data.hostCode = room.code;
      socket.join(room.code);
      rooms.touch(room);
      ack(cb, { code: room.code });
      return ctx.broadcast(room);
    });

    on('host:settings', (data) => {
      const room = hostRoom();
      if (!room) return;
      if (room.phase !== 'lobby') return fail('bad_phase', 'Sólo puedes cambiar la configuración en el lobby.');
      const v = validateSettings(data);
      if (!v.ok) return fail('bad_settings', v.error);
      Object.assign(room.settings, v.value);
      rooms.touch(room);
      ctx.broadcast(room);
    });

    on('host:kick', ({ playerId }) => {
      const room = hostRoom();
      if (!room) return;
      const p = typeof playerId === 'string' && room.players.get(playerId);
      if (!p) return fail('no_player', 'Ese jugador ya no está en la sala.');
      const target = p.socketId && io.sockets.sockets.get(p.socketId);
      rooms.kick(room, playerId);
      if (target) {
        target.emit('error:msg', { code: 'kicked', message: 'El presentador te sacó de la sala.' });
        target.leave(room.code);
        target.data.playerId = null;
        target.data.playerCode = null;
      }
      rooms.touch(room);
      ctx.broadcast(room);
    });

    on('player:join', ({ code, name, playerId }, cb) => {
      const room = rooms.find(code);
      if (!room) return fail('no_room', 'No existe una sala con ese código.');
      const known = typeof playerId === 'string' && room.players.has(playerId);
      if (!known && room.phase !== 'lobby') {
        return fail('in_progress', 'La partida ya empezó. Espera a que el presentador vuelva al lobby.');
      }
      const r = rooms.join(room, { name, playerId: known ? playerId : undefined, socketId: socket.id });
      if (!r.ok) return fail('bad_name', r.error);
      socket.data.playerId = r.player.id;
      socket.data.playerCode = room.code;
      socket.join(room.code);
      rooms.touch(room);
      ack(cb, { playerId: r.player.id });
      return ctx.broadcast(room);
    });

    socket.on('disconnect', () => {
      limiter.forget(socket.id);
      const { hostCode, playerId, playerCode } = socket.data;
      if (hostCode) {
        const room = rooms.find(hostCode);
        if (room && room.hostSocketId === socket.id) room.hostSocketId = null;
      }
      if (playerId && playerCode) {
        const room = rooms.find(playerCode);
        const p = room && room.players.get(playerId);
        if (p && p.socketId === socket.id) {
          rooms.setConnected(room, playerId, false);
          ctx.broadcast(room);
        }
      }
    });
  });
};
