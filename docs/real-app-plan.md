# DegreePath — from mock to real app

Proposed implementation plan, November 16, 2026. These stages are not implemented. Confirm the event rules, AI requirements, and pre-existing-code policy before selecting the competition scope.

## Product to prove

Change one course decision, see a feasible revised route, understand why it changed, and identify what still needs advisor review. Keep the primary flow: course → change → consequences. Saved plans keeps alternatives accessible from the third primary tab. Accounts and a chatbot should not be prerequisites to trying it.

## 1. One reviewed program

Choose one KSU program and one exact catalog year. Use official catalog requirements and Academic Maps identified in the official KSU catalog and Academic Maps as starting sources. Retain source URLs, retrieval dates, and review status. Begin with a small reviewed dataset before depending on extraction.

Model versioned courses, requirement groups, AND/OR prerequisites, minimum grades, elective limits, and permitted shared credit. Keep prerequisite eligibility separate from degree applicability. Explicitly flag unsupported conditions.

**Acceptance:** each supported rule traces to a source; reviewed fixtures cover a prerequisite alternative, grade failure, elective capacity, and coursework outside the program's requirements.

## 2. Student record and requirement evaluation

Start with manual entry or a fictional fixture matching the supported catalog. Represent completed/in-progress work, grades, evaluated transfer equivalents, program, catalog year, and approved exceptions. Do not assume substitutions or transfer equivalencies are approved.

Implement requirement allocation before reporting real completion percentages. Track credits applied, credits outside requirements, unmet groups, and additional prerequisite work without double-counting.

**Acceptance:** a reviewed fixture agrees with a known advising/audit example. Unverified equivalencies and exceptions remain visible. No university password is collected.

## 3. Scheduling and evidence

Replace the every-course-every-term assumption with explicit offering evidence: published, forecast, historical, or unknown. Add annual offerings, supported corequisites, workload limits, and summer preference. Compare baseline and scenario under identical assumptions.

Keep the greedy scheduler as a baseline; do not call its finish optimal. Evaluate bounded search or a constraint solver when concrete cases require it. Explain infeasibility using the actual requirement or dependency.

**Acceptance:** reviewed cases cover an unaffected deferral, a later finish, excluded mandatory coursework, a valid alternative, an annual-offering bottleneck, and unknown availability.

## 4. Meaningful AI

Translate “12 credits, no summer, take Calc II later” into editable constraints, then run the deterministic planner. Explain the computed result using the same rule IDs and source evidence. AI does not establish official degree requirements.

Keep model credentials on a backend. Manual controls and deterministic calculations should remain usable if the model is unavailable.

**Acceptance:** users can correct interpreted preferences; contradictions are surfaced; explanations agree with computed results; unsupported facts remain unknown. Evaluate against a fixed set of representative requests.

## 5. Real degree comparison

Add one adjacent program before expanding to three. Apply the same student record to each program's catalog-specific requirements and schedule the remaining work. Compare applied credits, credits outside requirements, remaining requirements, prerequisite sequences, estimated finish, and review conditions.

**Acceptance:** cards use reviewed computed values. Sorting by finish versus credit applicability can produce different rankings. Elective limits and shared-credit rules are respected. Replace fictional cards only after this works.

## 6. Pilot readiness

Persist the active draft locally before adding accounts. Add an advisor-ready summary with changed courses, assumptions, sources, and questions needing approval. Review student details before adding sharing/export. Consider cloud accounts when cross-device use is needed.

Use a small backend for model access and ingestion, versioned snapshots, and visible freshness. Keep the UI separate from the pure planning engine. A framework migration is optional and should address an observed maintenance need.

Check keyboard access, screen-reader labels, both themes, mobile course editing, stale sources, storage failures, and provider outages. Add browser regression tests once the main flow settles.

**Acceptance:** a new user can complete the main task without coaching, restore their plan, explain the finish change, and identify when advisor review is needed.

## Competition story

Prioritize one trustworthy flow: reviewed rules → student preference → baseline → course change → visual consequence → source-backed explanation → kept option. Add another degree only when allocation is correct.

Ask a few students and an advisor to try it. Record whether they can explain the consequence and choose a next action. Use the actual rubric to assess AI fit. If rule review/data access cannot be established in time, retain a clearly labeled fictional demo or reconsider the alternate dining-companion concept.

## Immediate decisions

- Select the first program and exact catalog year.
- Choose a small student fixture and a reviewer for expected results.
- Confirm judging criteria and AI requirements.
- Define supported rules and which missing conditions must be flagged.

No live integration or official academic approval is assumed by this plan.
