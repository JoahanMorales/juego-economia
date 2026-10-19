# worklog/WL-1792393300-joahan-2-PAS-011-hack.KU4Eyn.md · PAS-011

## Live summary
- Done: e2e/flow.spec.js written
- Decision: one browser context per device; Ana right, Luis wrong; end via host
- Why: real server, deterministic enough
- Failing: first run: strict-mode locator #s-turn,#s-other (fixed, not re-run)
- Commands: UAK_PORT=$UAK_PORT npx playwright test e2e/flow.spec.js --project=projector
- Next: re-run the flow spec, fix the next failure, then /uak-ship

## History
- 1792393300 | CLAIMED | joahan-2 | claim; next: write e2e/flow.spec.js against the real server
- 1792393356 | CLAIMED | joahan-2 | checkpoint; next: re-run the flow spec, fix the next failure, then /uak-ship
