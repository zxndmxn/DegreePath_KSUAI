# DegreePath task status

Updated November 18, 2026. Scope: **all current KSU degrees/programs**, plus the catalog versions applicable to supported students. Owners for unfinished work are not assigned yet. This file is the shared task tracker; update status and evidence when a task changes.

## November 18 UI checks

- [x] **UI-06 · Done** — Circular finish-transition arrow animates on hover/focus with reduced-motion support; coverage strips resized to an intermediate scale.
- [x] **FIT-01 · Done** — Laptop My Plan uses viewport-sized semester/course pages; centered editor separates Result and Connections and pages longer course/edit lists. At 1280×720, page height matches viewport and tested course titles are not clipped; reported three-edit result fits both editor panes without overflow.
- [x] **QA-05 · Done** — 22 tests pass, including the explicit Calculus II + Programming II exclusion regression: one partial semester, 13 scheduled credits, 14 blocked requirements, no finish date.
- [x] **DEMO-03 · Done** — Rewrote vault `_demoRun.md` as a line-by-line solo review and included the team copy at `docs/demo-run.md`. Covers pagination, hover/focus arrow, multi-course persistence, standalone versus combined exclusions and partial schedules.

- [x] **UI-05 · Done** — Visible semester chips and course rows; logo actions without Explore text; simpler Result panel; compact My Plan; larger coverage bars colored by percentage (red/orange/yellow).
- [x] **SCHED-04 · Done for synthetic graph** — Multiple per-course defer/exclude constraints; changing one retains others; individual undo; combined saves with legacy single-save support. Real-program rules remain unverified.
- [x] **QA-04 · Done** — 21 tests pass. Browser verified accumulated edits, individual undo, combined save-refresh-restore, requirements popover, compact layout, light/dark and 390px-wide list controls.

- [x] **UI-04 · Done** — Centered two-column editor, semester picker, prominent live outcomes/connections, favicon and phone-width summary.
- [x] **IMPACT-01 · Done** — Date-bounded planned-coverage calculation, cumulative semester comparisons and original-placement labels. Earned credits stay immutable. Three new tests; 18 total pass.
- [x] **NAV-01 · Done** — Create roadmap selects What-if and focuses its result; empty What-if preserves baseline until an action exists.
- [x] **QA-03 · Done** — Browser: Data Structures exclusion (7 blocked / 80%), Computer Networks two-term deferral (Spring 2030 / 97% / 4 placements changed), save-refresh-restore, baseline consistency, semester selection, themes, mobile summary and no captured console errors.
- [x] **HANDOFF-01 · Done** — Separate Nudox task documented in vault `nudox shit.md`; no installation/authentication/indexing performed. Continue in the user's other chat.

## November 17 research update

- [x] **UI-03 · Done** — Prominent planning entry, visible course Explore labels, stronger view controls, selected-view finish/highlight consistency, and remove Appearance label.
- [x] **COMPARE-02 · Done** — Calculated sample baseline-versus-scenario comparison and changed-placement list; selectable degree previews remain explicitly unevaluated.
- [x] **SAVE-01 · Done** — Expose local saving in the roadmap/dialog/comparison; browser save-refresh-restore verified. Reject an eleventh distinct save instead of evicting a previous one. Storage-denied and cap boundary still require manual browser checks.
- [x] **DEMO-02 · Done** — Vault `_demoRun.md`: Point / Click / Say script, expected results, edge checks, known limitations and issue-capture table.

- [x] **RES-02 · Done** — Static review of Aaryan Kapoor's school CLIs and It documentation/license. See `../../aaryan-resources-review-2026-11-17.md`.
- [ ] **IMPORT-05 · Needs evidence** — Inspect a consented, redacted raw KSU audit/course JSON sample; preserve nested alternatives, attempts, transfers and prerequisite logic. His CLI source establishes an access approach, not a verified integration in our app.
- [ ] **LOOP-01 · Next** — Complete select course → propose change → calculate → highlight/explain impact → undo, with revision checks and independently reviewed expected results.
- **Priority change:** investigate structured JSON before PDF layout parsing; keep PDF/manual input as fallback routes.
- **AI boundary:** translate preferences into editable constraints and explain engine results. Do not let generated text decide academic eligibility.

Statuses: **Done**, **Next**, **Planned**, **Needs evidence**. A completed research/data-contract task does not mean the corresponding user-facing feature works.

## Current evidence

- Approved KSU dashboard pushed to `main`: `2b91ea1`.
- Public program directory: **291 entries across 8 categories discovered**; **0 real program versions reviewed or supported for scheduling**. Entries still need catalog/active-status reconciliation.
- New synthetic integration pack: **48 courses, 3 programs, 6 student imports, 576 offering rows, 2 invalid imports, 10 future scenario cases**.
- Existing visible mock: **18 courses**, one deferred/excluded course at a time. New data intake is **not wired to the website**.
- No KSU audit has been imported or used in testing. No institutional API access has been established.

## Completed

- [x] **UI-01 · Done** — Compact KSU dashboard, clickable rows, light/dark switch, baseline comparison. Approved design pushed.
- [x] **RES-01 · Done** — Review official audit, forecast, program-directory, institutional API, and vendor-planning sources; record access limitations.
- [x] **DATA-01 · Done** — Save names/provenance for all eight official directory categories, with unsupported flags rather than eligibility claims.
- [x] **DATA-02 · Done** — Add versioned domain contract and synthetic edge-case fixtures, separate from the UI sample.
- [x] **IMPORT-01 · Done** — Pure normalized-JSON staging: type/credit/term/date checks, provenance, duplicate handling, unknown course/transfer review.
- [x] **QA-01 · Done** — Intake regression tests and existing 270-combination planner checks; run through `npm test`.
- [x] **PLAN-01 · Done** — Document pipeline, all-program coverage stages, add/drop semantics, and implementation sequence.

## Tomorrow — Tuesday, November 17

| ID | Status | Task / suggested work area | Acceptance evidence |
| --- | --- | --- | --- |
| EVENT-01 | Next | Team: confirm rubric, allowed prior code, AI requirements, deadline and demo conditions | Written scope decision |
| IMPORT-02 | Needs evidence | Student/data owner: inspect actual KSU DegreeWorks export options and obtain a redacted, consented sample | Verified export format; no private audit committed |
| DATA-03 | Needs evidence | Data owner: resolve linked catalog access and pin current editions for inventory entries | Source links, exact years, retrieval records; no silent use of older sheets |
| DATA-04 | Next | Data owner: reconcile directory entries, degree levels, concentrations, dual programs, and active status | Versioned program registry and explicit coverage counts |
| RULE-01 | Next | Rule owner: implement and review one complete rule slice as the first acceptance fixture | Catalog rules agree with an independently reviewed expected result; full-university backlog remains |
| UI-02 | Next | UI owner: add My coursework with staged import preview, unresolved-row correction, and confirmed apply | Bad last row leaves current record and draft intact |
| STATE-01 | Next | UI/engine owner: persistent draft, stable input focus, undo, revision-tagged calculations | Reload/cancel/rapid edits do not lose or overwrite valid work |
| DEMO-01 | Next | Team: select three honest demo cases and an offline fallback | Unaffected deferral, delayed bottleneck, excluded mandatory course |

## Build sequence after intake

| ID | Status | Work | Done when |
| --- | --- | --- | --- |
| IMPORT-03 | Planned | KSU-specific text-PDF adapter and page/line evidence | Wrapped rows, repeated blocks, lab suffixes, statuses and transfer fields match reviewed samples |
| IMPORT-04 | Planned | Unsupported/scanned/encrypted input handling | Recoverable message and manual fallback; current data preserved |
| RULE-02 | Planned | Requirement allocation: all/any, choose-N/credits, minimum grades, sharing/elective limits | No double-counting; rejected or unknown rules remain visible |
| RULE-03 | Planned | Repeats, transfer evaluation, exceptions, non-course milestones | Distinct attempts preserved; approval is never assumed |
| SCHED-01 | Planned | Real terms/sessions, offerings and prerequisite/corequisite eligibility | Annual bottleneck and paired lecture/lab cases pass |
| SCHED-02 | Planned | Add/remove/move/avoid operations and pins | Transcript immutable; mandatory courses remain required after removal from a term |
| SCHED-03 | Planned | General scheduling search, objective selection and uncertainty | Return feasible/infeasible/needs-review/search-limit; do not call heuristic output optimal |
| COMPARE-01 | Planned | Program-specific credit allocation and feasible route comparison | Reviewed computed results replace fictional cards |
| COVER-01 | Planned | Repeat extraction/review gates across every current program category | Per-version coverage dashboard; unsupported programs clearly identified |
| AI-01 | Planned | Preference interpretation and/or draft extraction with editable structured output | AI text agrees with deterministic result; manual fallback works |
| QA-02 | Planned | Browser input, storage failure, stale worker response, undo and large-record tests | Reproducible tests demonstrate retained input and correct revisions |
| OPS-01 | Planned | Deployment, source refresh/versioning, private-data lifecycle | Reproducible build, no client secrets, tested delete/export and stale-source behavior |
| INTEGRATE-01 | Needs evidence | Approved KSU/Ellucian read-only integration | Institutional owner confirms available resources, authorization, and permitted use |

## Decisions to record

- [ ] Who owns rule extraction, import/state, evaluator/scheduler, and demo validation?
- [ ] Which student catalog applies to a proposed major change?
- [ ] Is the first objective earliest finish, minimum disruption, or workload balance?
- [ ] How are in-progress course outcomes projected and shown?
- [ ] How much offering uncertainty can a demo estimate contain?
- [ ] Which existing KSU DegreeWorks/SEP/planning features are enabled, and what gap are we demonstrating?
- [ ] Which academic consequences remain outside scope (registration changes, financial aid, admission/clinical/permission decisions)?

## Coverage gate

`name_discovered → catalog_pinned → rules_parsed → rules_reviewed → audit_matched → schedule_tested`

Display only the achieved stage. Keep counts by credential category and catalog version, not a single misleading “all programs supported” number.
