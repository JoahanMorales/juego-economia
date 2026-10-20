# Backlog published on claims (uak plan)

Append-only; added to .uak/TASKS.md from main. Why: adding tasks never waits for a PR.

## PAS-017 · Reconexión con token secreto (player:join devuelve playerId y secret; reconecta sólo con secret; el estado público nunca lo incluye) (follow-up of PAS-005)

- **Type:** follow-up
- **Priority:** P1
- **Depends on:** PAS-005
- **Follow-up of:** PAS-005
- **Paths:** src/rooms.js, src/validate.js, test/rooms.test.js, test/validate.test.js
- **Freeze-Allowed:** no
- **Acceptance:**
  - Reconexión con token secreto (player:join devuelve playerId y secret; reconecta sólo con secret; el estado público nunca lo incluye)
- **Verify:** `node --test test/rooms.test.js test/validate.test.js`
## PAS-018 · Reconexión con token secreto (nadie puede suplantar a otro jugador)

- **Type:** bug
- **Priority:** P1
- **Estimate:** 40 min
- **Rubric / Spec:** C6 · IDEA §4.2, §4.7 (review of PAS-005: the public player id was enough to take over a player)
- **Depends on:** PAS-005, PAS-007, PAS-010
- **Paths:** src/rooms.js, src/socket-lobby.js, public/js/play.js, test/rooms.test.js, test/socket-lobby.test.js, e2e/play.spec.js
- **Freeze-Allowed:** yes
- **Acceptance:**
  - Each player gets a random `secret` (crypto.randomUUID) at join; `player:join` acks `{ playerId, secret }`.
  - Reconnecting requires `{ playerId, secret }` that match; a known playerId with a missing or wrong secret is treated as a new player (a new id), never as the old one.
  - The secret never appears in room:state (publicState only maps public fields) nor in any broadcast.
  - play.js stores the secret in localStorage with the playerId and sends both on reload; the mock path keeps working.
  - Tests: impersonation with the public id fails; the real owner reconnects and keeps saved/errors.
- **Verify:** `node --test test/rooms.test.js test/socket-lobby.test.js`
- **Next step:** add `secret` to the player object in rooms.join with a failing impersonation test.

## PAS-019 · playwright.config.js: cada proyecto corre sólo sus specs (proyector: host y flow; celular: play), así npx playwright test pasa completo (follow-up of PAS-001)

- **Type:** follow-up
- **Priority:** P1
- **Depends on:** PAS-001
- **Follow-up of:** PAS-001
- **Paths:** package.json, package-lock.json, server.js, src/socket-lobby.js, src/socket-game.js, render.yaml, playwright.config.js, test/health.test.js, .uak/bin/smoke-project
- **Freeze-Allowed:** no
- **Acceptance:**
  - playwright.config.js: cada proyecto corre sólo sus specs (proyector: host y flow; celular: play), así npx playwright test pasa completo
- **Verify:** `npm ci --no-audit --no-fund && node --test test/health.test.js`
## PAS-020 · Playwright: cada proyecto corre sólo sus specs

- **Type:** bug
- **Priority:** P1
- **Estimate:** 15 min
- **Rubric / Spec:** C7 · README "Pruebas en navegador"
- **Depends on:** PAS-001
- **Paths:** playwright.config.js
- **Freeze-Allowed:** yes
- **Acceptance:**
  - The `projector` project only matches e2e/host.spec.js and e2e/flow.spec.js; the `phone` project only matches e2e/play.spec.js.
  - `npx playwright test` with no flags passes every spec (the README command).
- **Verify:** `npx playwright test`
- **Next step:** add testMatch to both projects in playwright.config.js.

| playwright.config.js | PAS-020 |

## PAS-021 · Montos de millones caben en una línea en el celular (follow-up of PAS-010)

- **Type:** follow-up
- **Priority:** P1
- **Depends on:** PAS-010
- **Follow-up of:** PAS-010
- **Paths:** public/play.html, public/js/play.js, public/css/play.css, e2e/play.spec.js
- **Freeze-Allowed:** no
- **Acceptance:**
  - Montos de millones caben en una línea en el celular
- **Verify:** `npx playwright test e2e/play.spec.js --project=phone`

## PAS-022 · Etiqueta 'se movió' de la gráfica final no se corta con millones (follow-up of PAS-014)

- **Type:** follow-up
- **Priority:** P1
- **Depends on:** PAS-014
- **Follow-up of:** PAS-014
- **Paths:** public/host.html, public/js/host.js, public/css/host.css, public/js/sfx.js, e2e/host.spec.js
- **Freeze-Allowed:** no
- **Acceptance:**
  - Etiqueta 'se movió' de la gráfica final no se corta con millones
- **Verify:** `npx playwright test e2e/host.spec.js --project=projector`

## PAS-023 · Evidencia de Render en docs/demo.md (follow-up of PAS-016)

- **Type:** follow-up
- **Priority:** P1
- **Depends on:** PAS-016
- **Follow-up of:** PAS-016
- **Paths:** docs/demo.md
- **Freeze-Allowed:** no
- **Acceptance:**
  - Evidencia de Render en docs/demo.md
- **Verify:** `test -s docs/demo.md && node test/load-test.js --local --players 30 --games 1`
