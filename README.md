# DegreePath_KSUAI

A student-first degree-path simulator for the KSU AI hackathon. Change a course decision, compare its impact on your semester plan, and save alternatives.

**Current state:** a working local prototype with fictional data, multi-course scenarios, route comparisons and an optional local It/Codex companion. No KSU connection or official academic audit. Real requirements, student imports, offerings and cross-program evaluation remain unfinished. The browser does not contain a hosted AI model.

**New:** My plan → **Compare options** compares 12/15/18-credit routes using the same scheduler. **Continue in It** passes the current sample edits to the locally installed workspace; **Ask agent to compare** queues a request and displays the agent's returned explanation. See [setup and limitations](docs/it-integration.md) and [solo walkthrough](docs/demo-run.md).

## Run locally

Requires Node.js 22.18 or newer. No API key or app account required.

```sh
git clone https://github.com/zxndmxn/DegreePath_KSUAI.git
cd DegreePath_KSUAI
npm ci
npm run dev
```

Open http://127.0.0.1:4173/. Stop with Ctrl+C. The server binds to localhost only.

This repository is private. The owner invites teammates through Settings → Collaborators; teammates must accept before cloning. No collaborators are automatically added by this setup.

## Try it

1. Open My plan. The 15-credit baseline finishes Fall 2029.
2. Click anywhere on Calculus II. Keyboard users can focus a card and press Enter.
3. Choose Take it later; the default two-semester deferral moves the estimate to Spring 2030.
4. Choose Create roadmap, then compare Baseline and What-if plan. Use next/previous semester and course controls to reach longer lists without clipping.
5. Semester chips list courses immediately. Edit another class to accumulate changes; Undo removes only that class's edit.
6. Save plan locally, then restore the complete scenario from Saved plans after reloading. Older single-course saves still load.
7. Result and Connections are separate editor views. Blocked requirements open from View requirements. Compare paths computes baseline-versus-scenario results; degree previews remain unevaluated.

See [the solo walkthrough](docs/demo-run.md) for exact clicks, expected results and feedback capture. The finish-transition arrow animates on hover/keyboard focus and respects reduced-motion preferences.

The top-right switch controls light/dark mode. Saved plans and theme preference stay in the current browser; they do not sync between teammates. Unsaved changes reset on reload.

## Check and build

```sh
npm test
npm run build
npm run preview
```

The 22 tests check TypeScript/build, 270 single-course scenario combinations, accumulated constraints and per-course undo, local scenario serialization, planned coverage, partial-schedule regression, and normalized-import/data fixtures. Build output goes to ignored dist/. Dev and preview use the same port; stop one before starting the other.

| File | Responsibility |
| --- | --- |
| src/main.ts | Interface, course dialog, theme, saved plans |
| src/planner.ts | Fictional graph and deterministic scheduler |
| src/style.css | Responsive light/dark design |
| tests/planner.test.mjs | Capacity, prerequisites, deferral, exclusion, scenario coverage |
| [docs/real-app-plan.md](docs/real-app-plan.md) | Development stages |
| [CONTRIBUTING.md](CONTRIBUTING.md) | Team workflow |

## Prototype boundaries

The fictional Computing B.S. starts Spring 2027 with 60 summarized earned credits and 18 remaining courses totaling 60 credits. Only Calculus I and Programming I are individually modeled as completed prerequisites. Codes and requirements are invented.

The greedy scheduler assumes every course runs each fall/spring, prerequisites finish in earlier terms, and all modeled courses are mandatory. Deferral means no earlier than baseline placement plus 1–4 terms. Baseline and scenario share the 12/15/18-credit cap. Results are not guaranteed to be the earliest possible finish.

Multiple course constraints are supported. Excluding Programming II alone leaves two schedulable semesters and 12 blocked requirements. Excluding both Calculus II and Programming II leaves only Spring 2027, four available courses (13 credits), and 14 blocked requirements. This is a **partial schedule**, never a one-semester degree.

Coverage counts earned plus planned credits through the original finish date; earned credits remain 60. The displayed percentage controls the red/orange/yellow coverage-bar color. The roadmap action separately reflects disruption. At laptop sizes, paging keeps course/semester/edit lists accessible without clipped rows; no unsupported degree data is silently filled in.

OR prerequisites, corequisites, grades, elective allocation, residency, transfer evaluation, admission gates, real offerings, section conflicts, and advisor exceptions are not modeled. No student data is transmitted. Fonts use the local system.

Confirm event rules, AI requirements, and pre-existing-code policy before a competition submission.

## Data pipeline work

The website still runs the original fictional 18-course planner. New contracts, mock records, and normalized-JSON intake are development foundations and are not connected to the UI.

- [Data pipeline research and architecture](docs/data-pipeline.md)
- [Task status and next actions](docs/task-status.md)
- [Data packs and their limitations](data/README.md)

The target is all current KSU programs. A 291-entry public directory inventory is included for discovery; no real program is yet advertised as reviewed/schedulable. The synthetic integration pack includes 48 invented courses, three programs, six students, and 576 offering records.
