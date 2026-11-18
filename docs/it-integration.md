# It integration — local planning companion

Updated November 18, 2026. This is a personal local integration, not a hosted student-facing AI service.

## What is implemented

1. My plan → Compare options carries the current credit limit and all course edits into `agent.html`.
2. Compare calculated routes runs the same `planner.ts` engine at 12, 15 and 18 credits. If required courses were excluded, an additional explicitly labeled restoration candidate is offered.
3. Continue in It sends a validated sample request through a development-only localhost endpoint, patches the fixed `degreepath-agent` page and opens it. Context and edits are retained.
4. Ask agent to compare stages a structured request and sends the `degreepath:compare` action. Results are calculated immediately; the pending state clearly distinguishes calculations from an actual agent answer.
5. Codex reads the action, recalculates candidates with `scripts/compare-routes.mjs`, reasons about the results and patches `reply`, `explanation` and `status` back to the page. Only a matching request ID, revision and dataset is displayed. Route data is recomputed in the browser rather than blindly accepted from a reply.
6. Use in My plan opens a validated route fragment. It changes the active scenario; saving locally is still an explicit action. Opening the route consumes/removes the URL fragment; refresh then resets the unsaved draft as before.

The agent cannot change academic rules through free text. These are three greedy candidate schedules, not a global optimization proof. Deferrals are relative to each candidate's baseline. The sample assumes every course is offered each fall and spring. Completion coverage is earned plus planned credits by a date, not a probability of graduation.

## Verified laptop state

- Official It v0.1.45 installed at `C:\Users\billz\.it\bin\it.exe`; telemetry off, network sharing off, Codex auto-wake off.
- It serves at http://localhost:4700; companion at http://localhost:4700/p/degreepath-agent.
- DegreePath development server: http://127.0.0.1:4173/. The handoff intentionally requires this exact origin.
- Manual foreground service remains running. No Windows startup task was registered.
- Codex add-on is installed but reports **needs approval/restart**. The developer did not approve hooks or change Codex's permission policy. Automatic hook delivery remains unverified; actions can be read and answered manually in this conversation. A queued action is not proof an autonomous agent is running.
- Verified browser request → CLI action → calculated options → actual Codex explanation → browser update, plus local plan → It handoff and It route → My plan handoff.
- Verified foreign Origin gives 403 and unknown course gives 400; neither changed It state. All 26 tests pass.

PowerShell's `It` name collides with Pester. Use the full executable path:

```powershell
& 'C:\Users\billz\.it\bin\it.exe' serve
```

In another terminal, from the app folder:

```powershell
npm run dev
```

When ready to enable automatic add-on delivery, restart Codex and review the installed It hook request yourself. Do not change unrelated approval or access settings. Keep auto-wake off for supervised demos.

## Publish your own local companion

Install It from its official instructions first. From this app folder:

```powershell
npm run build:it
& 'C:\Users\billz\.it\bin\it.exe' create 'DegreePath · Compare routes' --id degreepath-agent --dir .it-page --agent Codex --open
```

On later source changes use `update degreepath-agent --dir .it-page`. Do not overwrite a page owned by another conversation without checking ownership. The CLI may ask the user to pair a browser; use its short-lived invitation locally. Never commit pairing tokens, runtime credentials, personal audit exports or It session data. `.it-work/`, `.it-page/` and `.env*` are ignored. The source builds without It installed.

## Handling an agent request

See `AGENTS.md`. Inspect the latest action and current page draft before answering. An old reply must not replace newer edits. Use the state revision returned by `it state` with `patch --if-revision` if state might change between inspection and publication. Re-read and retry only for the same still-current request.

## Sources and scope

- [It agent documentation](https://github.com/Aaryan-Kapoor/it/blob/master/docs/agents.md): page/action/state workflow.
- [Installation](https://github.com/Aaryan-Kapoor/it/blob/master/docs/install.md).
- [License](https://github.com/Aaryan-Kapoor/it/blob/master/LICENSE.md): custom It License, not blanket MIT licensing. Keep the runtime separate from our source; do not assume permission to embed/host/distribute it as a student product. Confirm that deployment model with the organizer before using it beyond this personal local setup.

It provides the interactive agent workspace. DegreeWorks/D2L CLIs are separate data-access tools; neither is connected here. Nudox maps code for agents and is handled in another chat; it is not a runtime dependency of this integration. No Nudox work or homelab configuration was resumed.

## Next acceptance gates

- [ ] Review/restart the Codex add-on and verify a fresh click arrives automatically without manually reading the queue.
- [ ] Test a student-supplied, redacted audit import as staged data, with uncertain rules retained for review.
- [ ] Implement catalog-year requirements and offerings before claiming real KSU graduation routes.
- [ ] Add validated add/replace operations, not just defer/exclude.
- [ ] Decide the deployed AI/backend and It licensing model before promising public availability.
