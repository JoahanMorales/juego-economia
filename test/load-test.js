// Prueba de carga (IDEA §7.2): un presentador y N celulares simulados juegan partidas seguidas.
// Uso: node test/load-test.js <url> | --local [--players N] [--games N]
//      [--think-min ms] [--think-max ms] [--json]
const { io: connect } = require('socket.io-client');

const GAME_TIMEOUT_MS = 8 * 60 * 1000;
const MAX_AVG_LATENCY_MS = 300;
const HOST_GAP_MS = 1100; // el servidor limita a 1 acción/s por socket

function parseArgs(argv) {
  const o = { url: null, local: false, players: 30, games: 3, thinkMin: 1000, thinkMax: 8000, json: false };
  const num = (v, name) => {
    const n = Number(v);
    if (!Number.isFinite(n) || n < 0) throw new Error(`Valor inválido para ${name}: ${v}`);
    return n;
  };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--local') o.local = true;
    else if (a === '--json') o.json = true;
    else if (a === '--players') o.players = num(argv[++i], a);
    else if (a === '--games') o.games = num(argv[++i], a);
    else if (a === '--think-min') o.thinkMin = num(argv[++i], a);
    else if (a === '--think-max') o.thinkMax = num(argv[++i], a);
    else if (a.startsWith('--')) throw new Error(`Opción desconocida: ${a}`);
    else o.url = a;
  }
  if (!o.local && !o.url) throw new Error('Falta la URL o --local');
  if (o.players < 2) throw new Error('--players debe ser al menos 2');
  if (o.thinkMax < o.thinkMin) o.thinkMax = o.thinkMin;
  return o;
}

const round2 = (x) => Math.round(x * 100) / 100;
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const rand = (a, b) => a + Math.random() * (b - a);
const ask = (c, ev, data) => new Promise((r) => c.emit(ev, data, r));

async function main() {
  const opts = parseArgs(process.argv.slice(2));
  let local = null;
  let url = opts.url;
  if (opts.local) {
    const { createServer } = require('../server');
    local = createServer({});
    await new Promise((r) => local.server.listen(0, '127.0.0.1', r));
    url = `http://127.0.0.1:${local.server.address().port}`;
  }

  const latencies = [];
  const errors = {};
  let passes = 0;
  let disconnects = 0;
  let closing = false;
  const sockets = [];

  function client(name) {
    const c = connect(url, { forceNew: true, reconnection: false });
    c.label = name;
    c.on('room:state', (s) => { c.last = s; });
    c.on('error:msg', (e) => { errors[e.code] = (errors[e.code] || 0) + 1; });
    c.on('disconnect', () => { if (!closing) disconnects++; });
    sockets.push(c);
    return c;
  }
  const connected = (c) => (c.connected ? Promise.resolve() : new Promise((res, rej) => {
    c.once('connect', res);
    c.once('connect_error', (e) => rej(new Error(`No se pudo conectar a ${url}: ${e.message}`)));
  }));

  // Espera un room:state que cumpla pred (revisa antes el último recibido).
  function until(c, pred, ms) {
    return new Promise((resolve, reject) => {
      if (c.last && pred(c.last)) return resolve(c.last);
      const t = setTimeout(() => { c.off('room:state', h); reject(new Error('tiempo agotado')); }, ms);
      function h(s) {
        if (pred(s)) { clearTimeout(t); c.off('room:state', h); resolve(s); }
      }
      c.on('room:state', h);
      return undefined;
    });
  }

  function setupPlayer(c) {
    c.pending = null;
    c.on('room:state', (s) => {
      const p = c.pending;
      if (p && (s.phase === 'final' || (s.game && s.game.turn > p.turn))) {
        latencies.push(Date.now() - p.t0);
        c.pending = null;
      }
    });
    c.on('you:turn', (t) => {
      const think = Math.max(0, Math.min(rand(opts.thinkMin, opts.thinkMax), t.msLeft - 500));
      setTimeout(() => {
        if (closing) return;
        const others = ((c.last && c.last.players) || []).filter((p) => p.connected && p.id !== c.pid);
        if (!others.length) return;
        const right = round2(t.amount * (1 - t.pmc));
        let saving = right;
        if (Math.random() >= 0.8) {
          saving = round2(t.amount * t.pmc);
          if (Math.abs(saving - right) < 1) saving = round2(right + 7);
        }
        const toId = others[Math.floor(Math.random() * others.length)].id;
        c.pending = { turn: t.turn, t0: Date.now() };
        passes++;
        c.emit('player:pass', { turn: t.turn, saving, toId });
      }, think);
    });
  }

  const games = [];
  let failure = null;
  try {
    const host = client('Presentador');
    await connected(host);
    const { code } = await ask(host, 'host:create', {});
    if (!code) throw new Error('host:create no devolvió código');

    for (let i = 1; i <= opts.players; i++) {
      const c = client(`Prueba ${i}`);
      setupPlayer(c);
      await connected(c);
      const ack = await ask(c, 'player:join', { code, name: `Prueba ${i}` });
      if (!ack || !ack.playerId) throw new Error(`Prueba ${i} no pudo unirse (${Object.keys(errors).join(', ') || 'sin detalle'})`);
      c.pid = ack.playerId;
      c.secret = ack.secret;
    }
    await until(host, (s) => s.players.length === opts.players, 15000);

    for (let g = 1; g <= opts.games; g++) {
      await wait(HOST_GAP_MS);
      host.emit('host:start', {});
      let fin;
      try {
        fin = await until(host, (s) => s.phase === 'final' && s.game && s.game.passes > 0, GAME_TIMEOUT_MS);
      } catch {
        throw new Error(`La partida ${g} no terminó en ${GAME_TIMEOUT_MS / 60000} min`);
      }
      games.push({ game: g, passes: fin.game.passes, moved: fin.final.moved, theoretical: fin.final.theoretical });
      if (g < opts.games) {
        await wait(HOST_GAP_MS);
        host.emit('host:lobby', {});
        await until(host, (s) => s.phase === 'lobby', 15000);
      }
    }
  } catch (e) {
    failure = e.message;
  }

  closing = true;
  sockets.forEach((c) => c.close());
  if (local) {
    local.io.close();
    await new Promise((r) => local.server.close(() => r()));
  }

  const sorted = [...latencies].sort((a, b) => a - b);
  const avg = sorted.length ? sorted.reduce((a, b) => a + b, 0) / sorted.length : 0;
  const p95 = sorted.length ? sorted[Math.min(sorted.length - 1, Math.ceil(sorted.length * 0.95) - 1)] : 0;
  const max = sorted.length ? sorted[sorted.length - 1] : 0;
  const ok = !failure && disconnects === 0 && sorted.length > 0 && avg < MAX_AVG_LATENCY_MS;
  const reason = failure
    || (disconnects ? `${disconnects} desconexiones` : null)
    || (!sorted.length ? 'no se midió ninguna latencia' : null)
    || (avg >= MAX_AVG_LATENCY_MS ? `latencia promedio ${avg.toFixed(1)} ms >= ${MAX_AVG_LATENCY_MS} ms` : null);

  const summary = {
    ok,
    reason,
    players: opts.players,
    games: games.length,
    passes,
    latencySamples: sorted.length,
    avgMs: Math.round(avg * 10) / 10,
    p95Ms: p95,
    maxMs: max,
    disconnects,
    errors,
    perGame: games,
  };

  if (opts.json) {
    console.log(JSON.stringify(summary));
  } else {
    console.log(`Partidas: ${summary.games}/${opts.games} · jugadores: ${opts.players} · jugadas: ${passes}`);
    console.log(`Latencia player:pass → room:state (${sorted.length} muestras): promedio ${summary.avgMs} ms · p95 ${p95} ms · máx ${max} ms`);
    console.log(`Desconexiones: ${disconnects}`);
    const codes = Object.entries(errors);
    console.log(`error:msg: ${codes.length ? codes.map(([k, v]) => `${k}=${v}`).join(', ') : 'ninguno'}`);
    for (const g of games) console.log(`  Partida ${g.game}: movido ${g.moved} vs teórico ${g.theoretical} (${g.passes} jugadas)`);
    console.log(ok ? 'RESULTADO: OK' : `RESULTADO: FALLA · ${reason}`);
  }
  process.exit(ok ? 0 : 1);
}

main().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
