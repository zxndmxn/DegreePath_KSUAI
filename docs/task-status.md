# DegreePath task status

Updated November 20, 2026.

## Done

- [x] One-click DegreeWorks sync with silent token refresh and one-time sign-in fallback
- [x] Privacy: grades, GPA, name, ID and email never stored or sent to the model
- [x] Live KSU prerequisites, offerings and seats through the DegreeWorks CLI, cached locally
- [x] Planner: drops, deferrals, adds, credit cap, summer, co-requisites, plain-language blocked reasons
- [x] Progress, Roadmap (side panel), Compare, Saved plans, light and dark themes
- [x] Local agent (Ollama, Qwen 2.5 1.5B): streaming answers grounded in planner results, verified action chips
- [x] Floating assistant with page hints
- [x] 27 tests on synthetic data

## Next

- [ ] Test with an underclassman's audit (many open requirements, choose-from rules)
- [ ] Requirement-sharing rules (one course counting for two blocks)
- [ ] Faster agent on AMD GPUs (Ollama Vulkan currently corrupts output on the RX 6800M)
- [x] Windows launcher installs from the lockfile
- [x] Synthetic demo with planner-backed answers
- [x] D2L workload context for connected users
- [x] Audit refresh rechecks offerings and flags stale results
- [x] Unresolved audit rules withhold an estimated finish

## Known limits

- Offerings past KSU's published terms are assumptions, marked Watch.
- The agent takes about 6 to 12 seconds per answer on CPU after warm-up.
