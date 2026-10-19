// Estado público de la sala (IDEA §4.5): nunca incluye hostToken ni timers.
function publicState(room, now = Date.now()) {
  const state = {
    code: room.code,
    phase: room.phase,
    settings: { investment: room.settings.investment, pmc: room.settings.pmc },
    players: [...room.players.values()].map((p) => ({
      id: p.id, name: p.name, saved: p.saved, errors: p.errors, connected: p.connected, isBot: p.isBot,
    })),
    game: null,
  };
  const g = room.game;
  if (g) {
    state.game = {
      holderId: g.holderId,
      amount: g.amount,
      turn: g.turn,
      msLeft: Math.max(0, (g.deadline || now) - now),
      moved: g.moved,
      passes: g.ledger ? g.ledger.length : 0,
      lastEvent: g.lastEvent || null,
      ledgerTail: g.ledger ? g.ledger.slice(-8) : [],
    };
  }
  if (room.phase === 'final' && g) {
    state.final = { ledger: g.ledger || [], theoretical: g.theoretical ?? null, ranking: g.ranking || [] };
  }
  return state;
}

function broadcast(io, room) {
  io.to(room.code).emit('room:state', publicState(room));
}

module.exports = { publicState, broadcast };
