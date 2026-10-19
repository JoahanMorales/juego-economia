# DECISIONS

Coordination decisions on the claims branch.
Why: a reversible option after 15 min keeps work moving.
- 1792388131 | PAS-001 | express 5 | Why: no version pinned in task
- 1792390361 | PAS-004 | CommonJS, funciones puras con rng y now inyectados | Why: sin sockets ni timers; testeable
- 1792390560 | PAS-017 | follow-up of PAS-005 by joahan-1: Reconexión con token secreto (player:join devuelve playerId y secret; reconecta sólo con secret; el estado público nunca lo incluye) | Why: same Paths, no scope change
- 1792391010 | PAS-007 | ctx.rooms/ctx.broadcast compartidos; rate limit global por socket | Why: PAS-008 reutiliza las salas
