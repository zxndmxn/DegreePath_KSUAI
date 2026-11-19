# DegreePath task status

Updated November 19, 2026.

## Done

- [x] One-click DegreeWorks sync with silent token refresh and one-time sign-in fallback
- [x] Privacy: grades, GPA, name, ID and email never stored or sent to the model
- [x] Live KSU prerequisites, offerings and seats through the DegreeWorks CLI, cached locally
- [x] Planner: drops, deferrals, adds, credit cap, summer, co-requisites, plain-language blocked reasons
- [x] Progress, Roadmap (side panel), Compare, Saved plans, light and dark themes
- [x] Local agent (Ollama, Qwen 2.5 3B): streaming answers grounded in planner results, verified action chips
- [x] Floating assistant with page hints
- [x] 20 tests on synthetic data

## Next

- [ ] Test with an underclassman's audit (many open requirements, choose-from rules)
- [ ] Requirement-sharing rules (one course counting for two blocks)
- [ ] Faster agent on AMD GPUs (Ollama Vulkan currently corrupts output on the RX 6800M)
- [ ] Package as a one-command launcher for judges
- [ ] D2L workload context (organizer's d2l-cli) as an optional signal

## Known limits

- Offerings past KSU's published terms are assumptions, marked Watch.
- The agent takes about 6 to 12 seconds per answer on CPU after warm-up.
