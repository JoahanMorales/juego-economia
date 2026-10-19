'use strict';
// Lógica pura del juego (IDEA §4.6): sin sockets ni timers. El servidor manda.

const round2 = (x) => Math.round(x * 100) / 100;
const EPS = 1e-9;

function pick(list, rng) {
  if (!list.length) return null;
  return list[Math.min(list.length - 1, Math.floor(rng() * list.length))];
}

function playersOf(room) {
  return [...room.players.values()];
}

const fmt = (x) => '$' + x.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

// Destino válido: existe, conectado y distinto del que tiene el dinero.
// Si no hay conectados, cae a cualquier jugador ≠ holder; si no hay otro, null.
function chooseTarget(room, toId, rng) {
  const g = room.game;
  const others = playersOf(room).filter((p) => p.id !== g.holderId);
  const chosen = typeof toId === 'string' ? room.players.get(toId) : null;
  const noReturn = room.settings.noReturn && others.filter((p) => p.connected).length > 1;
  const blocked = (p) => noReturn && p.id === g.prevId;
  if (chosen && chosen.connected && chosen.id !== g.holderId && !blocked(chosen)) return chosen;
  let pool = others.filter((p) => p.connected && !blocked(p));
  if (!pool.length) pool = others.filter((p) => p.connected);
  if (!pool.length) pool = others;
  return pick(pool, rng);
}

function startGame(room, rng = Math.random, now = Date.now()) {
  const players = playersOf(room);
  for (const p of players) {
    p.saved = 0;
    p.errors = 0;
    p.totalResponseMs = 0;
    p.turns = 0;
  }
  const connected = players.filter((p) => p.connected);
  const holder = pick(connected.length ? connected : players, rng);
  room.phase = 'playing';
  room.game = {
    holderId: holder ? holder.id : null,
    prevId: null,
    amount: round2(room.settings.investment),
    turn: 1,
    turnStartedAt: now,
    deadline: now + room.settings.turnMs,
    moved: 0,
    lostSavings: 0,
    ledger: [],
    lastEvent: null,
  };
  return room;
}

function resolveTurn(room, { turn, saving, toId, timeout } = {}, rng = Math.random, now = Date.now()) {
  const g = room.game;
  if (room.phase !== 'playing' || !g || turn !== g.turn) return { finished: false, ignored: true };
  const { pmc, tolerance, turnMs } = room.settings;
  const holder = room.players.get(g.holderId);
  const income = round2(g.amount);
  const correctSaving = round2(income * (1 - pmc));
  const consumption = round2(income - correctSaving); // SIEMPRE el valor correcto
  const valid = !timeout && typeof saving === 'number' && Number.isFinite(saving);
  const ok = valid && Math.abs(saving - correctSaving) <= tolerance + EPS;
  const reason = ok ? 'ok' : valid ? 'wrong' : 'timeout';

  if (holder) {
    holder.turns++;
    holder.totalResponseMs += timeout ? turnMs : Math.max(0, Math.min(turnMs, now - g.turnStartedAt));
    if (ok) holder.saved = round2(holder.saved + correctSaving);
    else {
      holder.errors++;
      g.lostSavings = round2(g.lostSavings + correctSaving);
    }
  }
  g.moved = round2(g.moved + income);
  const name = holder ? holder.name : '?';
  g.ledger.push({ n: g.ledger.length + 1, playerId: g.holderId, name, income, consumption, saving: correctSaving, ok, reason });

  const dest = chooseTarget(room, toId, rng);
  const to = dest ? dest.name : '?';
  g.lastEvent = ok
    ? { ok: true, text: `${name} se quedó ${fmt(correctSaving)} y le pasó ${fmt(consumption)} a ${to}` }
    : { ok: false, text: `${name} ${reason === 'timeout' ? 'se quedó sin tiempo' : 'se equivocó'} y perdió ${fmt(correctSaving)}; pasan ${fmt(consumption)} a ${to}` };

  g.prevId = g.holderId;
  g.amount = consumption;
  if (!dest || consumption < 1) {
    finish(room);
    return { finished: true };
  }
  g.holderId = dest.id;
  g.turn++;
  g.turnStartedAt = now;
  g.deadline = now + turnMs;
  return { finished: false };
}

function finish(room) {
  room.phase = 'final';
  return room;
}

function ranking(room) {
  return playersOf(room)
    .map((p) => ({
      id: p.id,
      name: p.name,
      saved: p.saved,
      errors: p.errors,
      avgMs: p.turns ? Math.round(p.totalResponseMs / p.turns) : 0,
      noTurns: !p.turns,
    }))
    .sort((a, b) => b.saved - a.saved || a.errors - b.errors || a.noTurns - b.noTurns || a.avgMs - b.avgMs);
}

function finalSummary(room) {
  const g = room.game || { ledger: [], moved: 0, lostSavings: 0 };
  const { investment, pmc } = room.settings;
  return {
    ledger: g.ledger,
    theoretical: round2(investment / (1 - pmc)),
    moved: g.moved,
    lostSavings: g.lostSavings,
    ranking: ranking(room).map(({ noTurns, ...r }) => r),
  };
}

function publicState(room, now = Date.now()) {
  const g = room.game;
  const state = {
    code: room.code,
    phase: room.phase,
    settings: { investment: room.settings.investment, pmc: room.settings.pmc },
    players: playersOf(room).map((p) => ({ id: p.id, name: p.name, saved: p.saved, errors: p.errors, connected: p.connected, isBot: p.isBot })),
    game: g
      ? {
          holderId: g.holderId,
          amount: g.amount,
          turn: g.turn,
          msLeft: room.phase === 'playing' ? Math.max(0, g.deadline - now) : 0,
          moved: g.moved,
          passes: g.ledger.length,
          lastEvent: g.lastEvent,
          ledgerTail: g.ledger.slice(-8),
        }
      : null,
  };
  if (room.phase === 'final') state.final = finalSummary(room);
  return state;
}

module.exports = { startGame, resolveTurn, finish, publicState, finalSummary, round2 };
