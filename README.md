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
| Local agent chat (Ollama, Qwen 2.5 3B) | Working, runs on this computer |

## Quick start

Needs Node.js 22.18+, the organizer's [DegreeWorks CLI](https://github.com/Aaryan-Kapoor/degreeworks-cli) signed in once with `dw login`, and [Ollama](https://ollama.com).

```sh
git clone https://github.com/zxndmxn/DegreePath_KSUAI.git
cd DegreePath_KSUAI
npm install --include=dev
npm run agent:setup   # pulls qwen2.5:3b and builds the "degreepath" model
npm run dev
```

Open http://127.0.0.1:4173/ and click **Sync from DegreeWorks**.

On Windows, if PowerShell blocks `npm`, use `cmd /c npm ...`. If your machine sets `NODE_ENV=production`, keep `--include=dev`.

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
- **Agent:** sees a grade-free summary of your plan and live course facts. It may only propose `drop`, `defer`, `add`, `restore`, credit cap or summer changes. Each proposal shows its verified finish date before you apply it.

## Privacy

- Everything runs on this computer. The raw audit never reaches the browser; the bridge keeps only courses, terms, credits and requirements.
- Grades, GPA, name, student ID and email are never stored or sent to the model.
- Course lookups are cached in `.cache/` (git-ignored). Saved plans live in your browser.

## Tests

```sh
npm test   # type-check + 17 tests: audit privacy, prerequisite parsing, scheduling, blocked reasons, agent guardrails
```

## Known limits

- Requirement rules come from DegreeWorks as-is. Choose-from lists show as options to pick, but complex sharing rules are not modeled.
- Future offerings beyond KSU's published terms are assumptions.
- Ollama's Vulkan backend returns corrupted text on some AMD laptop GPUs, so the agent runs on CPU by default (about 10 to 15 seconds per answer after warm-up). Set `DEGREEPATH_GPU=1` to try the GPU.
- Planning only: confirm withdrawals, registration and financial aid with your advisor.

## Project layout

| Path | What it does |
| --- | --- |
| `server/bridge.ts` | Local API: status, audit sync, course lookups, agent |
| `src/core/` | Audit parser, prerequisite parser, planner, agent rules |
| `src/ui/` | Welcome, Progress, Roadmap, course panel, Compare, Plans, Chat |
| `agent/Modelfile` | The curated `degreepath` model |
| `tests/` | Node tests on synthetic data only |
