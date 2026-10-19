// Builds public/mock/*.json from the real game logic (src/game.js), so every sample number is computed, never typed.
//   node test/build-mock.js          writes the files
//   require('./build-mock').build()  returns them (test/protocol.test.js checks the files are up to date)
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const QRCode = require('qrcode');
const game = require('../src/game');

const OUT = path.join(__dirname, '..', 'public', 'mock');
const CODE = 'KFTR';
const JOIN_URL = `http://localhost:3000/play.html?code=${CODE}`;
const T0 = 1792400000000; // a fixed clock: the files never change between runs

// A tiny seeded rng (mulberry32) so the random picks of game.js are reproducible.
function rng(seed) {
  return function () {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const PEOPLE = [
  ['p1', 'Ximena'], ['p2', 'Diego'], ['p3', 'Fernanda'], ['p4', 'Emiliano'],
  ['p5', 'Regina'], ['p6', 'Bot Tendera', true], ['p7', 'Santiago'],
];

function room() {
  const players = new Map();
  for (const [id, name, isBot] of PEOPLE) {
    players.set(id, { id, name, socketId: null, connected: id !== 'p7', isBot: !!isBot, saved: 0, errors: 0, totalResponseMs: 0, turns: 0 });
  }
  return { code: CODE, hostToken: 'demo', phase: 'lobby', players, settings: { investment: 1000, pmc: 0.75, turnMs: 10000, tolerance: 0.5 }, game: null };
}

const clone = (x) => JSON.parse(JSON.stringify(x));
const snap = (name, r, now, you, extra = {}) => ({ demo_data: true, mock: name, you, ...extra, state: clone(game.publicState(r, now)) });

// One answer per pass: [saving offset from the correct value or 'timeout', destination].
const SCRIPT = [
  [0, 'p2'], [0, 'p3'], [12, 'p4'], [0, 'p5'], [0, 'p6'], [0, 'p2'], ['timeout', 'p4'], [0, 'p5'],
];

async function build() {
  const files = {};
  const qr = await QRCode.toDataURL(JOIN_URL, { margin: 1, width: 360 });
  const r = room();
  files['lobby.json'] = snap('lobby', r, T0, null, { host: { code: CODE, hostToken: 'demo', joinUrl: JOIN_URL, qr } });

  const rand = rng(7);
  game.startGame(r, () => 0, T0); // the first connected player (Ximena) gets the investment
  let now = T0;
  for (const [offset, to] of SCRIPT) {
    now += 3200;
    const income = r.game.amount;
    const correct = game.round2(income * (1 - r.settings.pmc));
    const action = offset === 'timeout' ? { turn: r.game.turn, timeout: true } : { turn: r.game.turn, saving: game.round2(correct + offset), toId: to };
    game.resolveTurn(r, action, rand, now);
  }
  // Regina (p5) holds the money 3.6 s into her turn.
  const mid = now + 3600;
  files['playing.json'] = snap('playing', r, mid, null);
  files['myturn.json'] = snap('myturn', r, mid, 'p5');
  files['passed.json'] = snap('passed', r, mid, r.game.prevId);

  // Everyone answers right until the chain falls under $1.
  const order = ['p1', 'p2', 'p3', 'p4', 'p5', 'p6'];
  let i = 0;
  while (r.phase === 'playing') {
    now += 2400;
    const income = r.game.amount;
    const holder = r.game.holderId;
    let to = order[i++ % order.length];
    if (to === holder) to = order[i++ % order.length];
    game.resolveTurn(r, { turn: r.game.turn, saving: game.round2(income * (1 - r.settings.pmc)), toId: to }, rand, now);
  }
  files['final.json'] = snap('final', r, now, 'p3');
  return files;
}

async function write() {
  const files = await build();
  fs.mkdirSync(OUT, { recursive: true });
  for (const [name, data] of Object.entries(files)) fs.writeFileSync(path.join(OUT, name), JSON.stringify(data, null, 2) + '\n');
  return Object.keys(files);
}

module.exports = { build, OUT };
if (require.main === module) write().then((names) => console.log('mock:', names.join(' ')));
