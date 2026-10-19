'use strict';
// Bots for testing without 30 people (IDEA §4.8). Pure: the socket layer schedules the move with its delay.

const NAMES = ['Bot Panadero', 'Bot Carnicero', 'Bot Tendera', 'Bot Frutero', 'Bot Carpintera'];
const ACCURACY = 0.85;
const DELAY_MIN = 1500;
const DELAY_SPAN = 3000;

const round2 = (x) => Math.round(x * 100) / 100;

// The n-th bot of a room (0-based): the 5 names, then "Bot Panadero 2", "Bot Carnicero 2"…
function botName(n) {
  const round = Math.floor(n / NAMES.length);
  return NAMES[n % NAMES.length] + (round ? ' ' + (round + 1) : '');
}

// A bot's turn: when it answers, what it answers and to whom it passes.
// A wrong answer is always off by more than the tolerance, so the server counts it as an error.
function planMove(rng, { income, pmc, holderId, players, tolerance = 0.5 }) {
  const delayMs = Math.round(DELAY_MIN + rng() * DELAY_SPAN);
  const correct = round2(income * (1 - pmc));
  let saving = correct;
  if (rng() >= ACCURACY) {
    const off = round2(tolerance + 0.5 + rng() * Math.max(1, correct * 0.2));
    saving = correct - off >= 0 && rng() < 0.5 ? round2(correct - off) : round2(correct + off);
  }
  const pool = players.filter((p) => p.connected && p.id !== holderId);
  const to = pool.length ? pool[Math.min(pool.length - 1, Math.floor(rng() * pool.length))] : null;
  return { delayMs, saving, toId: to ? to.id : null };
}

module.exports = { NAMES, ACCURACY, botName, planMove };
