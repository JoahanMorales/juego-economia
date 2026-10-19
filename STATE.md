# STATE

Phase: execution
Updated: 1792403458
AVAILABLE: PAS-015 PAS-016 
CLAIMED: -
BLOCKED: -
REVIEW: PAS-011 PAS-012 PAS-013 PAS-014 
INTEGRATED: PAS-001 PAS-002 PAS-003 PAS-004 PAS-005 PAS-006 PAS-007 PAS-008 PAS-009 PAS-010 PAS-018 
CANCELLED: PAS-017 

Claims (first 24; status --task ID shows detail):
PAS-011 | REVIEW | joahan-2 | until 1792417858
PAS-012 | REVIEW | joahan-1 | until 1792417775
PAS-013 | REVIEW | joahan-2 | until 1792417775
PAS-014 | REVIEW | joahan-2 | until 1792407525

Blockers: BLOCKED tasks; use status --task ID --summary.
Current decisions (last 5):
- 1792392794 | plan | JoahanMorales/JoahanMorales | tasks added: PAS-018 | Why: backlog without PR (Plan-Channel: claims)
- 1792393356 | PAS-011 | one browser context per device; Ana right, Luis wrong; end via host | Why: real server, deterministic enough
- 1792403046 | deadline lease/PAS-011/1792396056 | REQUIRES_RECOVERY | Claim kept; read the summary and use release --expired --read-summary. No work is deleted.
- 1792403046 | deadline lease/PAS-012/1792395988 | REQUIRES_RECOVERY | Claim kept; read the summary and use release --expired --read-summary. No work is deleted.
- 1792403375 | PAS-012 | rate_limit de 1/s hace que tiempos de pensar cortos con pocos jugadores midan mal; defaults IDEA no lo afectan | Why: limiter del servidor por socket

Global next step: available P0; else review PRs, tests, demo, rehearsal.
Why: bounded snapshot to resume without rereading history.
