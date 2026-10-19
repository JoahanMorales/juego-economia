# DESIGN · Pásala (locked 2026-10-19)

Direction **4 · Marcador + Cadena**, picked by the human (uak decision on PAS-003): the scoreboard of direction 1
with the chain of direction 3 as the projector's bottom band; the phone is direction 1.
This file is the kit's `web/DESIGN.md` for this repo. A global change (theme, palette, type, shape) needs a human
`uak decision`. Reference screens: `public/design-lock/host.html` (projector) and `public/design-lock/play.html` (phone),
with screenshots in `public/design-lock/shots/`.

**Design read:** a live classroom game (projector + phones) for university students in a Macroeconomics class, with a
TV-scoreboard language, built with native CSS custom properties and transform/opacity motion. Dark theme only: the
projector decides it (IDEA §3.3).
Dials: projector VARIANCE 6 · MOTION 6 · DENSITY 5; phone VARIANCE 3 · MOTION 5 · DENSITY 2.

## Tokens (`public/css/tokens.css`, the only file with color literals)
| Token | Value | Use |
|---|---|---|
| `--bg` | `#170C12` | page background |
| `--surface` / `--surface-2` | `#26131D` / `#331A28` | lower third, inputs on dark, hover |
| `--line` | `#4A2A3D` | hairlines, ring track, chain line |
| `--text` / `--text-muted` | `#F6ECE3` / `#C2AAB6` | text / labels and secondary numbers |
| `--gold` | `#EDC24F` | money: every amount, the meter, chain nodes |
| `--hot` | `#FF6A3D` | the active turn: holder name, ring, live node, phone background on your turn |
| `--ok` / `--err` | `#5CC57A` / `#EF5B5B` | correct saving / wrong or late saving |
| `--on-hot` | `#170C12` | text and controls on `--hot` |

Gold means money, orange means "now". Never use them for anything else (no gold headings, no orange decoration).

## Type
- **Bricolage Grotesque** 800, tracking -0.02 to -0.035em: names, titles, buttons.
- **Atkinson Hyperlegible** 400/700: labels, sentences, the event line.
- **JetBrains Mono** 600-800 with tabular figures: every amount, the room code, seconds, pass numbers.
- Amounts always `$1,234.56` (`es-MX`, 2 decimals) via `money()` in `public/js/format.js`.

| Projector (1280×720, 5 m) | px | Phone (390×844) | px |
|---|---:|---|---:|
| holder name | 132 | your amount | 64 |
| holder amount | 92 | screen title | 30 |
| moved total | 60 | saving input | 32 |
| event line | 23 | buttons and labels | 18-19 |
| labels, rows | 19-20 | hints | 16 |

## Shape
Containers are sharp: `--radius: 2px` everywhere (panels, inputs, buttons, chips). Only **data marks** are round: chain
nodes (their area is the income of a pass) and the 10 s ring. Separate with hairlines (`--hairline`) and space, not cards.

## Components
**Projector, en juego** (see `design-lock/host.html`):
- Header: wordmark `Pás<span>a</span>la` (the "a" in `--hot`), then `Sala`, `PMC`, `Pase` as label + mono value. Hairline below.
- Stage (left, 1.5fr): label "Tiene el dinero", holder name in `--hot` (pulse), amount in `--gold` + the ring (108 px, seconds inside), and the **lower third** at the bottom: `--surface`, an 8 px left bar `--ok`/`--err`, the event sentence.
- Aside (right, 1fr, hairline on the left): "Dinero que se ha movido" in `--gold` 60 px, "La teoría dice $X (k = n)", a 4 px meter (`--line` track, `--gold` fill = moved / theory), then the savings ranking (top 5, hairline rows, position in display type, first in `--gold`).
- **Chain band** (bottom, full width): the last 8 passes plus the holder as nodes on a hairline. Node diameter `16px + share × 52px` where share = income / investment. Correct = gold disc; wrong or late = `--bg` disc with a 3 px `--err` ring and its saving struck through; the holder = `--hot` 34 px node that beats. Under each node: name, income (mono, muted), saving (mono 13 px, `--ok`/`--err`).
- Lobby: room code huge in mono, the QR as delivered by `qrcode` (dark modules on light, needed for phone cameras) inside a `--text` frame with 12 px padding, player chips (sharp, `--surface`, disconnected at 40% opacity, bots marked 🤖), investment/PMC controls with the 3 presets of IDEA §1 as buttons, "Agregar bots", "¡Arrancar!" in `--hot`.
- Final: one sentence "$1,000 de inversión movieron $X en la economía", the formula k = 1 / (1 − PMC) with the numbers, the full chain table with totals, a podium (3 places, mono amounts), "Otra ronda" / "Cambiar PMC".

**Phone** (see `design-lock/play.html`):
- Your turn: the whole screen is `--hot` with `--on-hot` text. A 10 px shot clock across the top (width = msLeft / 10 s), "Tu turno" + seconds, "Te llegó" + amount 64 px, a 2 px rule, then the form: label "¿Cuánto te ahorras?", a `--bg` field 66 px high with `$` and the value in `--gold` mono (`inputmode="decimal"`), the hint "PMC 0.75. Te quedas con lo que no consumes.", teammates as a 2-column grid of 56 px outlined buttons (selected = filled `--on-hot`; disconnected = dashed at 35%), and "¡Pásala!" as a full-width 68 px `--bg` bar with `--gold` text.
- Other screens stay on `--bg`: join (code + name), waiting ("¡Estás dentro!" + your saving), someone else has it (their name in `--hot`, the amount, "Atento: te lo pueden pasar a ti"), passed ("¡Pasada! Mira el proyector"), final (your place, your saving, the multiplier sentence).
- Never show the correct saving on the phone. The hint states the rule, not the answer.

## States
Every screen has its empty, loading and error state: lobby with no players ("Escanea el QR para entrar"), reconnecting
(a single line under the header, not a spinner), Spanish errors from `error:msg` inline under the field, game paused
(fewer than 2 connected) as the lower third in `--err`.

## Motion (each one says something)
| Motion | Means | Spec |
|---|---|---|
| holder name pulse | "this person has the money now" | scale 1 → 1.025, 1.2 s, `--ease`, infinite |
| live node beat | the chain is still alive | scale 1 → 1.2, 1.2 s |
| new node enters | a pass happened | opacity + translateY 6 px, `--dur` |
| ring / shot clock | time left | driven by `msLeft`, no easing tricks |
| flying bill (PAS-014) | money moved from A to B | transform only, `--z-flyer` |
Only `transform` and `opacity`. `prefers-reduced-motion: reduce` collapses all of it (base.css); UI tests run reduced.

## Accessibility
AA contrast for all text (muted on bg is 8:1; on-hot on hot is 6.8:1). Visible focus (`:focus-visible`, gold; on
`--hot` it is `--on-hot`). Touch targets ≥ 56 px. The ring has `role="timer"` and a label. Names are user data: render
them with `textContent` only.

## Never
1. No gradients as decoration, no glow, no glassmorphism, no drop shadows on text.
2. No emoji or icons as decoration. The only emoji is 🤖 for bots (IDEA §4.8).
3. No cards for grouping, no colored dots before labels, no section-number labels, no "eyebrow" over every block.
4. No em dash or en dash in any visible text. Use a period, a comma or parentheses.
5. No Inter or system fonts, no serif. Amounts are never in a proportional font.
6. No color outside `tokens.css` (the test fails), no second accent, no light sections.
7. No stock-AI copy ("¡Bienvenido a la experiencia!", "potencia", "sin fricción"). Plain classroom Spanish.
