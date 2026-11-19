# DegreePath

See every path to your KSU graduation. DegreePath reads your DegreeWorks audit, maps what is left against the live KSU class schedule, and lets you try drops, delays and adds before you commit. A local AI agent answers questions about your path and proposes changes that the planner checks first.

Part of the KSU AI Hackathon, alongside [Nudox Lab Ops](https://github.com/zxndmxn/nudox-lab-map).

## Status

| Area | State |
| --- | --- |
| Built-in KSU sign-in, one-click DegreeWorks sync | Working with a live KSU account, nothing else to install |
| D2L due dates next to each course (titles and dates only) | Working, same sign-in |
| Progress: requirements, this term, course history | Working, no grades stored |
| Roadmap built from your real remaining courses and live offerings | Working |
| What-if: drop, take later, add a course, credit cap, summer | Working, previewed before you apply |
| Compare and saved plans | Working |
| Optional local assistant (Ollama, Qwen 2.5 1.5B) | Working, grounded in planner results; app works without it |
| One-click launcher: installs packages, assistant and model on first run | Working |
| Floating assistant with page hints | Working |

## Quick start

**One click:** double-click `Start DegreePath.cmd` (or the DegreePath desktop shortcut). It installs what it needs on first run, starts the app and opens it in your browser. Close its window to stop DegreePath.

Needs Node.js 22.18+ and Microsoft Edge or Google Chrome (every Windows PC has Edge). On first launch click **Connect your KSU account**: the normal KSU Microsoft sign-in opens once, the same one as Owl Express. That one sign-in covers DegreeWorks and D2L and renews itself in the background. No Python or extra tools.

**The assistant sets itself up.** The first time you launch, DegreePath installs [Ollama](https://ollama.com) if it is missing (via winget on Windows) and downloads Qwen 2.5 1.5B (about 1 GB) in the background. The app is usable the whole time and the chat shows progress. Skip it with `DEGREEPATH_NO_AI=1`. `npm run agent:setup` does the same thing by hand.

Developers can also run `npm install --include=dev` then `npm run dev`. On Windows, if PowerShell blocks `npm`, use `cmd /c npm ...`.

## How it works

```
KSU DegreeWorks + D2L ──> built-in connector (server/ksu.ts) ──> local bridge (server/bridge.ts, 127.0.0.1)
   audit, prereqs, seats,        one KSU sign-in, read-only     │  parses the audit, drops grades/GPA/name/ID
   due dates                                                     ▼
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
- Your KSU session is saved only on this computer under `%LOCALAPPDATA%\DegreePath` (never in the repo). The connector only reads; it never requests D2L grades.
- Course lookups are cached in `.cache/` (git-ignored). Saved plans live in your browser.

## Tests

```sh
npm test   # type-check + 24 tests: audit privacy, prerequisite parsing, scheduling, blocked reasons, agent grounding and guardrails
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
