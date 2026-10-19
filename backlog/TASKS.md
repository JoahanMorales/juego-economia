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
