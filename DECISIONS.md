# DECISIONS

Coordination decisions on the claims branch.
Why: a reversible option after 15 min keeps work moving.
- 1792388131 | PAS-001 | express 5 | Why: no version pinned in task
- 1792390361 | PAS-004 | CommonJS, funciones puras con rng y now inyectados | Why: sin sockets ni timers; testeable
- 1792390560 | PAS-017 | follow-up of PAS-005 by joahan-1: Reconexión con token secreto (player:join devuelve playerId y secret; reconecta sólo con secret; el estado público nunca lo incluye) | Why: same Paths, no scope change
- 1792391010 | PAS-007 | ctx.rooms/ctx.broadcast compartidos; rate limit global por socket | Why: PAS-008 reutiliza las salas
- 1792391628 | deadline decision/PAS-003-1792390594/1792391494 | BLOCKED_OTHER_TASK | Option: Direction 4: Marcador (1) + Cadena (3) on the projector; phone = direction 1; Why: Human's pick (JoahanMorales, 2026-10-19 00:1x): 1 is perfect, merged with the chain of 3; no money, accounts, publishing or scope expansion.
- 1792392325 | PAS-010 | mock mode trusts stored playerId | Why: mock ack is canned
- 1792392794 | plan | JoahanMorales/JoahanMorales | tasks added: PAS-018 | Why: backlog without PR (Plan-Channel: claims)
- 1792393356 | PAS-011 | one browser context per device; Ana right, Luis wrong; end via host | Why: real server, deterministic enough
- 1792403046 | deadline lease/PAS-011/1792396056 | REQUIRES_RECOVERY | Claim kept; read the summary and use release --expired --read-summary. No work is deleted.
- 1792403046 | deadline lease/PAS-012/1792395988 | REQUIRES_RECOVERY | Claim kept; read the summary and use release --expired --read-summary. No work is deleted.
- 1792403375 | PAS-012 | rate_limit de 1/s hace que tiempos de pensar cortos con pocos jugadores midan mal; defaults IDEA no lo afectan | Why: limiter del servidor por socket
