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
