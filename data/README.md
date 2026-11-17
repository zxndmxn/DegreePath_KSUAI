# Data packs

These files establish a testable boundary for future integration. They do not replace the visible planner's existing sample and are not loaded into the website yet.

## Synthetic fixtures

`fixtures/synthetic-catalog.v1.json` contains 48 invented DEMO courses, three synthetic 120-credit programs, and 576 offering records. Synthetic program requirements use shared foundation, required track, and credit-choice groups without sharing credits between groups. Tests verify internal reference and credit consistency; no official KSU rule is implied.

Six student records cover new, midpoint, transfer, repeated/failed/in-progress/withdrawn, near-finish, and unresolved cases. Two invalid imports exercise a malformed final row and conflicting attempt IDs. `synthetic-audit-input.txt` is invented text, not an actual DegreeWorks layout or a supported text parser format.

`scenario-cases.v1.json` defines ten future scheduler acceptance cases. These are expected behavioral properties; the general scheduler has not been implemented or tested against them.

## Real source observations

`research/ksu-program-discovery.json` contains 291 names from eight official KSU directory categories, collected November 16, 2026 through web research. Each row records its source and remains `name_discovered`, with a null catalog year and false planning/review flags. Directory entries can represent dual programs/pathways and are not a reconciled count of unique active degrees. Concentrations and catalog versions need further discovery. No real degree requirements have been imported.

`research/ksu-forecast-observations.json` preserves three small public forecast observations and their date/source. Explicit dashes and blank future cells must not be treated identically. Forecasts are not confirmed sections or seat guarantees.

See [the data pipeline](../docs/data-pipeline.md) and [task status](../docs/task-status.md). `src/data/intake.ts` stages normalized JSON safely but deliberately does not claim that the imported record is academically ready to plan.

Do not put real student audits or personal records in this directory or Git. Use redacted/consented samples outside tracked files for adapter development.
