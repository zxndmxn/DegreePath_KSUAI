# Notes for coding agents

DegreePath is a local web app (React + Vite) that plans a KSU student's path to graduation from their real DegreeWorks audit.

## Rules

- The planner in `src/core/plan.ts` is the source of truth. AI may propose or explain changes; it never decides what is valid.
- Never store or send grades, GPA, grade points, name, student ID or email. `src/core/audit.ts` drops them; keep it that way and keep `tests/core.test.mjs` privacy checks passing.
- Raw audits never reach the browser. The bridge (`server/bridge.ts`) parses them server-side.
- The bridge runs the DegreeWorks CLI with fixed arguments only. User text never becomes a command or path.
- Tests use synthetic data only (`tests/fixtures.mjs`). Never commit a real audit, `.cache/`, cookies or `node_modules`.
- Do not claim registration, withdrawal or financial aid outcomes. Point students to their advisor.

## Map

| Path | Purpose |
| --- | --- |
| `server/bridge.ts` | `/api/status`, `/api/audit/sync`, `/api/courses`, `/api/login`, `/api/agent` (+ `?stream=1`), `/api/agent/warm` |
| `src/core/audit.ts` | DegreeWorks audit to `Pathway` |
| `src/core/catalog.ts` | `dw course` output to `CourseInfo`, Banner prerequisite parser |
| `src/core/plan.ts` | Scheduler, blocked reasons, plan diff |
| `src/core/agent.ts` | System prompt, context builder, verified what-ifs, question grounding, action validation |
| `src/store.ts` | App state, local storage, course lookups |
| `src/ui/` | Screens and components |
| `agent/Modelfile` | Builds the `degreepath` Ollama model from `qwen2.5:3b` |

## Checks

Run `npm test` (type-check plus Node tests) before every commit. On Windows with `NODE_ENV=production`, install with `npm install --include=dev`.
