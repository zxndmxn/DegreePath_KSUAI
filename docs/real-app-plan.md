# DegreePath: from prototype to real app

**Status (November 19, 2026):** DegreePath now runs on a student's real DegreeWorks audit and KSU's live class schedule. The sample curriculum is gone.

## What a student gets

1. Sync their audit in one click. See degree percent, open requirements, this term and history.
2. A roadmap of every remaining course placed by real prerequisites and offerings.
3. Try a drop, delay or add and see the new finish date before applying it.
4. Ask a local AI in plain English; every suggestion is checked by the planner.

## Architecture

DegreeWorks CLI → local bridge (parses and strips personal data) → planner → UI. Ollama runs the agent on the same machine.

## Next milestones

1. **Breadth:** validate on audits from freshmen and transfer students; support choose-from requirements fully.
2. **Trust:** show the DegreeWorks rule text behind each requirement and the source of each offering.
3. **Speed:** GPU inference where the backend is stable; keep CPU fallback.
4. **Reach:** a packaged launcher so any KSU student can run it without a terminal.
5. **Workload:** optional D2L signals to balance hard semesters.

## Competition story

"Your real audit, the real schedule, and an AI that cannot lie about your graduation date because the planner checks it."
