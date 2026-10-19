# TASKS · Pásala (backlog v1)

State lives on the `claims` branch (`uak status`); this file holds only tasks. Spec: `IDEA.md`. Rubric: `.uak/PROJECT.md`.
IDEA §8 phases are split into vertical tasks: §4.5 (protocol + mock states) is the wave-1 contract, so the server,
the logic and both screens move in parallel. IDEA §4.7 edge cases live in the task that owns each file.
`public/css/styles.css` from IDEA §4.3 becomes `tokens.css` + `base.css` (design lock) + `host.css` + `play.css`.

## PAS-001 · Esqueleto: Express + Socket.IO + /health + tooling

- **Type:** setup
- **Priority:** P0
- **Estimate:** 30 min
- **Rubric / Spec:** C6 · IDEA §4.1, §4.3, §6.1, §6.2
- **Depends on:** None
- **Paths:** package.json, package-lock.json, server.js, src/socket-lobby.js, src/socket-game.js, render.yaml, playwright.config.js, test/health.test.js, .uak/bin/smoke-project
- **Freeze-Allowed:** no
- **Acceptance:**
  - Every foreseeable dependency in one go: `express`, `socket.io` 4, `qrcode`; dev: `socket.io-client`, `@playwright/test`. `"engines": {"node": ">=20"}`, `"start": "node server.js"`, `"test"` runs every `test/*.test.js` with `node --test`.
  - `server.js` exports `createServer({ turnMs })` (for tests) and listens on `process.env.PORT || 3000`, `0.0.0.0`, only when run directly. Serves `public/`, `GET /health` → `ok`, attaches Socket.IO and calls `require('./src/socket-lobby')(io, ctx)` and `require('./src/socket-game')(io, ctx)`; both start as no-op stubs owned later by PAS-007 and PAS-008.
  - `render.yaml` exactly as IDEA §6.2, one instance.
  - `playwright.config.js`: `webServer` runs `node server.js` on `PORT=${UAK_PORT:-3100}`, `reducedMotion: 'reduce'`, projects `projector` (1280×720) and `phone` (390×844), `testDir: 'e2e'`.
  - `bash .uak/bin/uak init-smoke --command "npm ci --no-audit --no-fund && npm test"`.
  - `test/health.test.js` starts `createServer` on port 0 and gets `ok` from `/health`.
- **Verify:** `npm ci --no-audit --no-fund && node --test test/health.test.js`
- **Next step:** `npm init -y`, then add the dependencies above in one `npm install`.

## PAS-002 · Contrato: protocolo, formato es-MX y estados mock

- **Type:** contract
- **Priority:** P0
- **Estimate:** 45 min
- **Rubric / Spec:** C5 · IDEA §4.4, §4.5, §1
- **Depends on:** None
- **Paths:** public/js/protocol.js, public/js/format.js, public/js/mock-socket.js, public/mock/, test/protocol.test.js, test/format.test.js
- **Freeze-Allowed:** no
- **Acceptance:**
  - `public/js/protocol.js` loads in the browser (global `Protocol`) and in Node (`module.exports`): event names of IDEA §4.5, limits (investment 10–10,000,000; PMC 0.1–0.95; turn 10,000 ms; tolerance 0.50; names ≤ 16 chars), the 3 presentation presets of IDEA §1 (`$1,000`/2⁄3, `$1,000,000`/0.50, `$1,000,000`/0.75) and a JSDoc typedef of the public state (never `hostToken`).
  - `public/js/format.js` (same dual export): `money(1234.5)` → `$1,234.50` with `es-MX` and 2 decimals; `round2`; `k(pmc)`.
  - `public/mock/{lobby,playing,myturn,passed,final}.json`: public states with `demo_data: true`, 6 players. Every amount is computed with the IDEA §4.6 formulas (PMC 0.75, $1,000), never typed by hand; `final.json` has the full ledger, theory 4,000 and a ranking.
  - `public/js/mock-socket.js`: with `?mock=<state>` in the URL, a fake socket with `on`/`emit` that emits `room:state` from the fixture and ticks `msLeft` down, so PAS-009 and PAS-010 work without a server. Without `?mock`, it does nothing.
  - Tests: money formatting (incl. 0, 0.5, 1,000,000), presets → k = 3, 2, 4 and totals 3,000 / 2,000,000 / 4,000,000; every fixture sums correctly (Σ ahorro + último monto = inversión).
- **Verify:** `node --test test/protocol.test.js test/format.test.js`
- **Next step:** write `public/js/format.js` and its test first.

## PAS-003 · Design lock: dirección visual, tokens y portada

- **Type:** contract
- **Priority:** P0
- **Estimate:** 60 min
- **Rubric / Spec:** C7 · IDEA §3.3
- **Depends on:** None
- **Uses contract:** PAS-002
- **Paths:** docs/DESIGN.md, public/css/tokens.css, public/css/base.css, public/index.html, public/design-lock/, test/design-tokens.test.js
- **Freeze-Allowed:** no
- **Acceptance:**
  - Run `/uak-design-lock` (skill `design-taste-frontend`): 3 clearly different directions INSIDE the IDEA §3.3 palette and fonts (layout, density, motion and texture differ). Each is a static `public/design-lock/<n>.html` of the wow screen (host "en juego": who holds the money, the amount, the 10 s ring, the chain) plus the phone "modo papa caliente", captured at 1280×720 and 390×844. The human picks one; the others are deleted.
  - `docs/DESIGN.md` (this repo's `web/DESIGN.md`): tokens, type scale (legible at 5 m), components (chip, ring, chain row, podium, big button ≥ 48 px), motion rules with `prefers-reduced-motion`, and the "never" list: no generic gradients, no glassmorphism, no decorative emoji or icons (only 🤖 for bots), no filler cards, no stock-AI copy, no Inter/system fonts, amounts always JetBrains Mono tabular figures.
  - `public/css/tokens.css` holds every color, font, radius, shadow and duration as a CSS variable; `base.css` loads the 3 Google Fonts and the resets.
  - `public/index.html`: "Soy presentador" / "Soy jugador" landing in the locked direction.
  - `test/design-tokens.test.js` fails if any `public/**/*.{css,html,js}` outside `tokens.css` contains a hex/rgb color literal, or if a §3.3 color is missing from `tokens.css`.
  - `uak decision` records the human's pick.
- **Verify:** `node --test test/design-tokens.test.js`
- **Next step:** read IDEA §3 and load the `design-taste-frontend` skill.

## PAS-004 · Lógica pura del juego (game.js) con pruebas

- **Type:** feature
- **Priority:** P0
- **Estimate:** 60 min
- **Rubric / Spec:** C2, C3, C4, C5 · IDEA §4.6, §7.1, §2 (reglas finas)
- **Depends on:** None
- **Uses contract:** PAS-002
- **Paths:** src/game.js, test/game.test.js
- **Freeze-Allowed:** no
- **Acceptance:**
  - Pure functions, no sockets and no timers inside: `startGame(room, rng)`, `resolveTurn(room, {turn, saving, toId, timeout}, rng, now)` → `{ finished }`, `finish(room)`, `publicState(room, now)` (with `msLeft`, `ledgerTail` of 8, never `hostToken`), `finalSummary(room)` (ledger, theoretical = investment / (1 − PMC), ranking: more saved → fewer errors → faster average).
  - Every case of IDEA §7.1, plus: the 3 presentation presets give theory 3,000 / 2,000,000 / 4,000,000; a timeout loses the saving and still passes the correct consumption; with 2 players the money goes back and forth; an invalid or disconnected `toId` goes to a random connected player ≠ holder; amounts rounded to cents.
- **Verify:** `node --test test/game.test.js`
- **Next step:** write the PMC 0.75 / $1,000 first-pass test (250 saved, 750 passed).

## PAS-005 · Salas y validación (rooms.js, validate.js)

- **Type:** feature
- **Priority:** P0
- **Estimate:** 45 min
- **Rubric / Spec:** C6 · IDEA §4.4, §4.7
- **Depends on:** None
- **Uses contract:** PAS-002
- **Paths:** src/rooms.js, src/validate.js, test/rooms.test.js, test/validate.test.js
- **Freeze-Allowed:** no
- **Acceptance:**
  - `rooms.js`: create (unique 4-letter code without ambiguous letters, `hostToken` from `crypto.randomUUID`), find, delete, `join(room, {name, playerId})` (new player or reconnect keeping `saved`/`errors`), `setConnected`, `kick`, `sweep(now)` deletes rooms idle > 2 h, `touch` updates `lastActivity`.
  - `validate.js`: names trimmed, HTML and control characters removed, ≤ 16 chars, empty rejected, duplicates get " 2", " 3"; room code normalized to upper case; settings in range (investment 10–10,000,000, PMC 0.1–0.95) or a Spanish error; `saving` must be a finite number; a per-key rate limiter (1 action/s, injected clock).
- **Verify:** `node --test test/rooms.test.js test/validate.test.js`
- **Next step:** write `validate.js` name tests ("  <b>Ana</b>  " → "Ana", "Ana" twice → "Ana 2").

## PAS-006 · Bots para pruebas (bots.js)

- **Type:** feature
- **Priority:** P0
- **Estimate:** 20 min
- **Rubric / Spec:** C6 · IDEA §4.8
- **Depends on:** None
- **Uses contract:** PAS-002
- **Paths:** src/bots.js, test/bots.test.js
- **Freeze-Allowed:** no
- **Acceptance:**
  - Names from IDEA §4.8 (more than 5 → numbered), `isBot: true`.
  - `planMove(rng, {income, pmc, holderId, players})` → `{ delayMs, saving, toId }`: delay in 1,500–4,500 ms, correct saving 85% of the time (a wrong one is off by more than the tolerance), `toId` connected and ≠ holder.
  - With a seeded rng over 2,000 moves the hit rate is 85% ± 3%.
- **Verify:** `node --test test/bots.test.js`
- **Next step:** write a tiny seeded rng helper inside the test.

## PAS-007 · Sockets del lobby: crear, reanudar, entrar, QR, estado

- **Type:** feature
- **Priority:** P0
- **Estimate:** 60 min
- **Rubric / Spec:** C1, C6 · IDEA §4.5, §4.7, §6.1
- **Depends on:** PAS-001, PAS-005
- **Uses contract:** PAS-002
- **Paths:** src/socket-lobby.js, src/broadcast.js, test/socket-lobby.test.js
- **Freeze-Allowed:** no
- **Acceptance:**
  - `host:create` → `{code, hostToken, joinUrl, qr}`: `joinUrl` = `RENDER_EXTERNAL_URL` (or the request's host) + `/play.html?code=XXXX`, `qr` a data URL from `qrcode`.
  - `host:resume`, `host:settings` (lobby only), `host:kick`; every `host:*` without the room's `hostToken` → `error:msg` in Spanish.
  - `player:join` (new or reconnect by `playerId`), disconnect marks the player gray (`connected: false`).
  - `src/broadcast.js`: `room:state` to `io.to(code)` on every change, built with `publicState`, never `hostToken`.
  - Rate limit 1 action/s per socket; the 10-min sweep interval (`unref`) deletes rooms idle 2 h.
  - Integration test with `socket.io-client` against `createServer` on port 0.
- **Verify:** `node --test test/socket-lobby.test.js`
- **Next step:** replace the PAS-001 stub in `src/socket-lobby.js` with `host:create`.

## PAS-008 · Sockets del juego: turnos, reloj, bots, desconexiones

- **Type:** feature
- **Priority:** P0
- **Estimate:** 60 min
- **Rubric / Spec:** C1, C2, C3 · IDEA §4.2, §4.5, §4.6, §4.7, §4.8
- **Depends on:** PAS-004, PAS-006, PAS-007
- **Uses contract:** PAS-002
- **Paths:** src/socket-game.js, test/socket-game.test.js
- **Freeze-Allowed:** no
- **Acceptance:**
  - `host:start` (≥ 2 connected players), `host:addBots`, `host:end`, `host:lobby`, `player:pass {turn, saving, toId}`.
  - The server owns the clock: one timer per turn of `turnMs + 300` ms; `you:turn` to the holder; a stale or duplicate `turn` is ignored (double tap).
  - A disconnected holder resolves as a timeout after 3 s; fewer than 2 connected → the game pauses and the state says so; bots play through `planMove`.
  - The game ends under $1 or on `host:end`; `room:state` carries `final` in phase `final`.
  - Integration test with `socket.io-client` and `createServer({ turnMs: 300 })`: a full game with 2 clients and 3 bots ends with Σ saved + lost ≈ investment − last amount.
- **Verify:** `node --test test/socket-game.test.js`
- **Next step:** replace the PAS-001 stub in `src/socket-game.js` with `host:start`.

## PAS-009 · Pantalla del presentador (proyector)

- **Type:** feature
- **Priority:** P0
- **Estimate:** 90 min
- **Rubric / Spec:** C1, C3, C4, C7 · IDEA §3.1, §3.3
- **Depends on:** PAS-003
- **Uses contract:** PAS-002, PAS-007, PAS-008
- **Paths:** public/host.html, public/js/host.js, public/css/host.css, e2e/host.spec.js
- **Freeze-Allowed:** no
- **Acceptance:**
  - Lobby: big room code, QR, live player chips (disconnected = gray, bots 🤖), investment/PMC controls with the 3 presets, "Agregar bots", "¡Arrancar!" (disabled under 2 players).
  - En juego: the holder's name huge with a pulse, the amount, a 10 s ring driven by `msLeft`, the event line (green / red), "Dinero que se ha movido", passes, savings ranking, the last 8 chain rows, "Terminar ahora". All visible at 1280×720 without scrolling.
  - Final: "$1,000 de inversión movieron $X en la economía", k = 1 / (1 − PMC) with the numbers, full table with totals, podium, "Otra ronda" / "Cambiar PMC".
  - `localStorage` keeps `code` + `hostToken` and sends `host:resume` on reload. Player data only through `textContent`.
  - Works on `?mock=lobby|playing|final` and on the real socket. Only `tokens.css` colors; `design-critic` at 1280×720 has no P1 left.
  - `e2e/host.spec.js` checks the 3 mock screens at 1280×720 with reduced motion.
- **Verify:** `npx playwright test e2e/host.spec.js --project=projector`
- **Next step:** build `host.html` against `?mock=playing` first (the wow screen).

## PAS-010 · Pantalla del jugador (celular)

- **Type:** feature
- **Priority:** P0
- **Estimate:** 75 min
- **Rubric / Spec:** C1, C2, C7 · IDEA §3.2, §3.3
- **Depends on:** PAS-003
- **Uses contract:** PAS-002, PAS-007, PAS-008
- **Paths:** public/play.html, public/js/play.js, public/css/play.css, e2e/play.spec.js
- **Freeze-Allowed:** no
- **Acceptance:**
  - Entrar: code (prefilled from `?code=`) + name; `playerId` saved in `localStorage` and resent on reload.
  - Esperando / otro tiene el dinero / tu turno (`navigator.vibrate`, orange background, big amount, 10 s ring, `inputmode="decimal"` field "¿Cuánto te ahorras?", teammates as ≥ 48 px buttons, disconnected ones disabled, "¡Pásala!" sends `turn`) / "¡Pasada! Mira el proyector" / final (place, saving, multiplier summary).
  - Spanish errors from `error:msg` shown inline. Player data only through `textContent`. Only `tokens.css` colors; `design-critic` at 390×844 has no P1 left.
  - `e2e/play.spec.js` walks the mock screens at 390×844 with reduced motion.
- **Verify:** `npx playwright test e2e/play.spec.js --project=phone`
- **Next step:** build the "tu turno" screen against `?mock=myturn` first.

## PAS-011 · Prueba de punta a punta (servidor real + 2 celulares + bots)

- **Type:** integration
- **Priority:** P0
- **Estimate:** 45 min
- **Rubric / Spec:** C1–C5 · IDEA §2, §7.3
- **Depends on:** PAS-008, PAS-009, PAS-010
- **Paths:** e2e/flow.spec.js
- **Freeze-Allowed:** yes
- **Acceptance:**
  - Against the real server: a host page creates a room; 2 phone pages join with the code; the host adds 3 bots, picks $1,000 / PMC 0.75 and starts; the phones answer (one right, one wrong); the game reaches the final screen with theory $4,000.00 and moved ≤ $4,000.00.
  - Reloading a phone mid-game keeps its name and saving; reloading the host resumes the room.
- **Verify:** `npx playwright test e2e/flow.spec.js`
- **Next step:** reuse the selectors of `e2e/host.spec.js` and `e2e/play.spec.js`.

## PAS-012 · Prueba de carga: 30 celulares

- **Type:** integration
- **Priority:** P0
- **Estimate:** 45 min
- **Rubric / Spec:** C6 · IDEA §5, §7.2
- **Depends on:** PAS-008
- **Paths:** test/load-test.js
- **Freeze-Allowed:** yes
- **Acceptance:**
  - `node test/load-test.js <url>` or `--local` (starts `createServer` in-process on a free port): one host, 30 `socket.io-client` players "Prueba 1…30"; on their turn they wait 1–8 s, answer right 80% of the time and pass to someone random; 3 games in a row.
  - Prints the average and p95 latency from `player:pass` to the next `room:state`, disconnects and errors; exit 1 if the average is ≥ 300 ms or any client disconnects. `--players` and `--games` flags for quicker runs.
- **Verify:** `node test/load-test.js --local --players 30 --games 1`
- **Next step:** connect the host client and create the room.

## PAS-013 · README y guía de despliegue en Render

- **Type:** docs
- **Priority:** P1
- **Estimate:** 30 min
- **Rubric / Spec:** C6 · IDEA §5, §6, §10
- **Depends on:** PAS-001
- **Paths:** README.md
- **Freeze-Allowed:** yes
- **Acceptance:**
  - In Spanish: what Pásala is and the class it supports; run locally (`npm ci`, `npm start`, `npm test`); the Render steps of IDEA §6.3 (Blueprint with `render.yaml`, one instance, free plan sleeps); the IDEA §10 class-day checklist; plan B (video, laptop + hotspot); the load test command.
  - Real screenshots of the host and the phone once PAS-009/PAS-010 are in (or a placeholder note until then).
- **Verify:** `grep -q "render.yaml" README.md && grep -q "/health" README.md && grep -q "load-test" README.md`
- **Next step:** copy the IDEA §6.3 steps and adapt them.

## PAS-014 · Pulido del proyector: billete volando, sonido, gráfica final

- **Type:** feature
- **Priority:** P1
- **Estimate:** 60 min
- **Rubric / Spec:** C1, C4, C7 · IDEA §3.1, §8 fase 9
- **Depends on:** PAS-009
- **Paths:** public/host.html, public/js/host.js, public/css/host.css, public/js/sfx.js, e2e/host.spec.js
- **Freeze-Allowed:** no
- **Acceptance:**
  - A bill flies from the previous holder's name to the new one (off with reduced motion).
  - Optional sound on the projector behind a "Sonido" toggle (off by default; Web Audio, no files from third parties).
  - Final screen: a bar chart (inline SVG, no library) of the income of each pass, with the theory line.
  - `design-critic` at 1280×720 has no P1 left.
- **Verify:** `npx playwright test e2e/host.spec.js --project=projector`
- **Next step:** add the SVG bar chart to the final screen.

## PAS-015 · Opción "no regreses la papa"

- **Type:** feature
- **Priority:** P2
- **Estimate:** 30 min
- **Rubric / Spec:** C1 · IDEA §2 (reglas finas)
- **Depends on:** PAS-008, PAS-010, PAS-014
- **Paths:** src/game.js, src/validate.js, src/socket-game.js, test/game.test.js, public/host.html, public/js/host.js, public/js/play.js
- **Freeze-Allowed:** no
- **Acceptance:**
  - A lobby toggle `noReturn`: when on, the player who passed to you is not a valid destination (disabled on the phone; the server reroutes to someone random), except with only 2 players.
  - A test in `test/game.test.js` for both cases.
- **Verify:** `node --test test/game.test.js`
- **Next step:** add the rule to `resolveTurn` with a failing test.

## PAS-016 · Demo y entrega: Render, carga real, ensayo, plan B

- **Type:** demo
- **Priority:** P0
- **Estimate:** 60 min
- **Rubric / Spec:** C1–C7 · IDEA §5, §7.3, §10
- **Depends on:** PAS-011, PAS-012, PAS-013
- **Paths:** docs/demo.md
- **Freeze-Allowed:** yes
- **Acceptance:**
  - The human creates the Render service from `render.yaml` (an agent never creates accounts or deploys).
  - The agent runs `node test/load-test.js https://<render-url> --players 30 --games 3` and records the real output in `docs/demo.md`.
  - Clean-clone rehearsal (`/uak-demo`): `npm ci && npm test && npx playwright test` from a fresh clone.
  - `docs/demo.md`: the class script (IDEA §10: practice round, PMC 0.50 vs 0.75, k = 2 vs 4), the plan-B steps, and the checklist ticked with evidence. The human records the plan-B video.
- **Verify:** `test -s docs/demo.md && node test/load-test.js --local --players 30 --games 1`
- **Next step:** ask the human for the Render URL.
