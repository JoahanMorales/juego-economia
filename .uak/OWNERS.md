# Shared-file owners

One writer per shared file. Others ask the owner with `uak msg ID --kind request`. Patterns are relative, with no spaces; directories end in `/`.
An owner is not a prerequisite for everyone: consumers work on published contracts and mocks. To transfer ownership, open a PR to main.

| Pattern | Owner task |
|---|---|
| package.json | PAS-001 |
| package-lock.json | PAS-001 |
| server.js | PAS-001 |
| render.yaml | PAS-001 |
| playwright.config.js | PAS-001 |
| .uak/bin/smoke-project | PAS-001 |
| .github/workflows/ | PAS-001 |
| .uak/PROJECT.md | PAS-001 |
| public/js/protocol.js | PAS-002 |
| public/js/format.js | PAS-002 |
| public/js/mock-socket.js | PAS-002 |
| public/mock/ | PAS-002 |
| docs/DESIGN.md | PAS-003 |
| public/css/tokens.css | PAS-003 |
| public/css/base.css | PAS-003 |
