# PROJECT · Pásala, clase de Macroeconomía (sprint mode)

> Filled in by `/uak-setup` with the human at minute 0. uak reads the flat fields of the last block from
> the remote `main`, so a stale worktree can never change permissions.

## Event
| Field | Value |
|---|---|
| Event / challenge | Juego en clase "El multiplicador de la inversión" · Macroeconomía · IPN UPIICSA · spec: `IDEA.md` |
| Start | 2026-10-18 23:05 America/Mexico_City |
| Official deadline | 2026-10-20 07:00 America/Mexico_City (martes, inicio de la clase) · platforms: Render (web service) + this GitHub repo |
| Freeze | Tue 02:12 · `Freeze-Epoch: 1792483965` (from `uak clock`) |
| Clean rehearsal / plan B | 2026-10-20 05:00 |
| Internal submission | 2026-10-20 06:00: deployed on Render, phones tested, host page opened 5 min before class (IDEA §10) |
| Humans | JoahanMorales: builder and presenter · submission owner: JoahanMorales |
| Agents | joahan-1, joahan-2 |
| Machines | one Linux laptop (aarch64) · ports already taken: 8000, 8080 |

Schedule from `uak clock`: first claim by Mon 01:05 · design lock Mon 00:05 · walking skeleton Mon 01:05 ·
plan-B video Mon 15:02 · freeze Tue 02:12 · rehearsal Tue 05:00 · internal submit Tue 06:00 · deadline Tue 07:00.

## Official rubric (weights sum to 100)
There is no teacher rubric (confirmed by the human). This one comes from IDEA §1 and §5.
| ID | Criterion | Weight | Evidence in the demo |
|---|---|---:|---|
| C1 | One person's spending is another's income: the money visibly hops between phones | 15 | host "who has the money" + event line; player hot-potato mode |
| C2 | Each person keeps a part (PMS) and passes the rest (PMC): the saving the player types is validated (±$0.50) | 15 | player input → green/red row in the chain table |
| C3 | The chain dies out: each pass is smaller and the game ends under $1 | 10 | chain table (last 8 passes) and amount shrinking |
| C4 | Total moved ≈ k × ΔI, and total saving tends to the investment | 20 | final screen: moved vs. theory, full table with totals |
| C5 | Numbers match the slides: $1,000/PMC 2/3 → k=3; $1M/0.50 → k=2; $1M/0.75 → k=4 | 15 | host settings + final screen; `node:test` cases (IDEA §7.1) |
| C6 | Holds 30 phones on Render | 15 | `node test/load-test.js <url>`: latency < 300 ms, 0 disconnects (IDEA §7.2) |
| C7 | Readable on the projector at 5 m and usable on a phone (48 px buttons, es-MX amounts) | 10 | host at 1280×720, player at 390×844 screenshots |

## Event rules
| Topic | Confirmed rule | Source |
|---|---|---|
| AI use / prior code | No teacher rules (the human, 2026-10-18); IDEA asks to reuse the prototype `pasala.html` as reference | the human · IDEA §3.3 |
| Data and licenses | No external data; Google Fonts (OFL); npm deps express, socket.io, qrcode (MIT) | IDEA §3.3, §4.1 |
| Format and video limits | Live in-class demo on the projector; students join from their phones | IDEA §2, §10 |

## Plan B
- A video of the whole flow at `docs/plan-b.mp4` (v1 Mon 15:00, final Tue 05:00). Use it if the school Wi-Fi or Render fails.
- Second fallback: run `npm start` on the laptop and have phones join over the laptop's hotspot.
- Render's free plan sleeps after 15 min: open the host page 5 min before class. Never deploy during class.

## Executable config
A human sets `yes`. A missing field means `no`.

```text
Mode: sprint
Backlog-Proposed-Epoch: 0
Backlog-Approved: yes
Autonomy: yes
Auto-Merge: yes
Review-Mode: claims
Plan-Channel: claims
Freeze-Epoch: 1792483965
Lease-Seconds: 2700
Review-Lease-Seconds: 14400
Events-Per-Session: 100
Checkpoint-Percent: 60
Merge-Lease-Seconds: 1800
Merge-Wait-Seconds: 180
Max-Parallel-Subagents: 4
Opus-Subagents-Per-Session: 2
Pace: auto
Subagent-Hard-Cap: 6
Strong-Hard-Cap: 3
Subagents-Per-Session: 40
Subagents-Per-Machine: 8
Subagent-Burst-Per-Minute: 6
Max-Worktree-Agents: 6
Blackbox: on
Additive-Paths: test/
```
