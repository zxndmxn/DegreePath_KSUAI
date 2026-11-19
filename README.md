# DegreePath

See every path to your KSU graduation. DegreePath reads your DegreeWorks audit, maps what is left against the live KSU class schedule, and lets you try drops, delays and adds before you commit. A local AI agent answers questions about your path and proposes changes that the planner checks first.

Part of the KSU AI Hackathon, alongside [Nudox Lab Ops](https://github.com/zxndmxn/nudox-lab-map).

## Status

| Area | State |
| --- | --- |
| One-click DegreeWorks sync (or upload `dw --json audit`) | Working with a live KSU account |
| Progress: requirements, this term, course history | Working, no grades stored |
| Roadmap built from your real remaining courses and live offerings | Working |
| What-if: drop, take later, add a course, credit cap, summer | Working, previewed before you apply |
| Compare and saved plans | Working |
| Optional local assistant (Ollama, Qwen 2.5 1.5B) | Working, grounded in planner results; app works without it |
| One-click launcher and desktop shortcut | Working |
| Floating assistant with page hints | Working |

## Quick start

**One click:** double-click `Start DegreePath.cmd` (or the DegreePath desktop shortcut). It installs what it needs on first run, starts the app and opens it in your browser. Close its window to stop DegreePath.

Needs Node.js 22.18+ and the organizer's [DegreeWorks CLI](https://github.com/Aaryan-Kapoor/degreeworks-cli) signed in once with `dw login --channel msedge`.

**The assistant is optional.** DegreePath works fully without it. To turn it on, install [Ollama](https://ollama.com) and run `npm run agent:setup` once. It uses Qwen 2.5 1.5B (about 1 GB), small enough for nearly any laptop.

Developers can also run `npm install --include=dev` then `npm run dev`. On Windows, if PowerShell blocks `npm`, use `cmd /c npm ...`.

## How it works

```
DegreeWorks CLI (dw) ──> local bridge (server/bridge.ts, inside Vite on 127.0.0.1)
   audit, course prereqs,      │  parses the audit, drops grades/GPA/name/ID
   sections and seats          ▼
                         pathway + catalog ──> planner (src/core/plan.ts) ──> roadmap UI
                                                    ▲
                         local agent (Ollama) ──────┘  proposes actions, planner verifies
```

- **Planner:** schedules remaining courses term by term using KSU prerequisites (including same-term co-requisites), published offerings and seats, your credit cap and summer choice. Past the published schedule it assumes the same season repeats and marks the course **Watch**.
- **Colors:** green on track, gold watch, orange moved, red blocked, blue taking now.
- **Agent:** sees a grade-free summary of your plan and live course facts. When you ask about a drop, delay, credit load or summer, the planner computes the real answer first and the model restates it. It may only propose `drop`, `defer`, `add`, `restore`, credit cap or summer changes, and each proposal shows its verified finish date before you apply it. Answers stream in as they are written.

## Privacy

- Everything runs on this computer. The raw audit never reaches the browser; the bridge keeps only courses, terms, credits and requirements.
- Grades, GPA, name, student ID and email are never stored or sent to the model.
- Course lookups are cached in `.cache/` (git-ignored). Saved plans live in your browser.

## Tests

```sh
npm test   # type-check + 20 tests: audit privacy, prerequisite parsing, scheduling, blocked reasons, agent grounding and guardrails
```

## Known limits

- Requirement rules come from DegreeWorks as-is. Choose-from lists show as options to pick, but complex sharing rules are not modeled.
- Future offerings beyond KSU's published terms are assumptions.
- Ollama's Vulkan backend returns corrupted text on some AMD laptop GPUs, so the assistant runs on CPU by default (about 4 seconds per answer). Set `DEGREEPATH_GPU=1` to try the GPU.
- Planning only: confirm withdrawals, registration and financial aid with your advisor.

## Project layout

| Path | What it does |
| --- | --- |
| `server/bridge.ts` | Local API: status, audit sync, course lookups, agent |
| `src/core/` | Audit parser, prerequisite parser, planner, agent rules |
| `src/ui/` | Welcome, Progress, Roadmap, course panel, add-course search, Compare, Plans, Chat, floating assistant |
| `agent/Modelfile` | The curated `degreepath` model (Qwen 2.5 1.5B) |
| `Start DegreePath.cmd`, `scripts/start.mjs` | One-click launcher |
| `tests/` | Node tests on synthetic data only |
