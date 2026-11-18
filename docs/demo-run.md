# DegreePath — my solo demo run

**Current revision: November 18, 2026 · It agent companion + calculated route options.**

**App:** http://127.0.0.1:4173/

Go line by line. Tick an action only after you try it. This is your personal critique run, not a meeting script. Stop and tell me whenever anything feels wrong; you don't have to finish first.

Earlier checkmarks and comments are preserved in [[DegreePath/archive/demoRun-before-viewport-walkthrough-2026-11-18|the previous note]]. New checks below are deliberately unchecked.

## New run — compare routes with the agent

Do this first for the new feature. The full My plan/editor/save review follows below. This is your own critique run, not a presentation.

**App:** http://127.0.0.1:4173/ · **It companion:** http://localhost:4700/p/degreepath-agent

### A. Find it and carry your edits across

- [ ] **Point:** My plan, beside Explore a change. **Click:** Compare options. **Say to yourself:** “Can I tell this compares routes?” A new comparison tab should carry my credit limit and every course edit.
- [ ] **Click:** Lighter semesters → Earlier finish → Compare both. The active goal should be obvious. Changing preferences must clear old results, rather than leave a stale explanation.
- [ ] **Point:** Try a case. **Click:** On track → Compare calculated routes. Expect 15 credits = Fall 2029 / 100%; 12 = Spring 2030 / 97%; 18 = Fall 2029 / 100%. Coverage is measured by the original Fall 2029 finish.
- [ ] **Point:** status sentence. **Say:** “This is a local calculation, not an AI answer.” Free text must not silently override requirements.
- [ ] **Click:** Delay Calculus II. **Type:** “I want a lighter workload. Does taking more credits actually avoid this prerequisite delay?” **Click:** Continue in It. Expect the It page to open with Calculus II / two terms later AND my context retained.
- [ ] If It needs browser pairing, tell Codex. Pair locally; never put invitation tokens into Git or public messages.

### B. Ask and challenge the answer

- [ ] **Point:** It workspace · two-way actions. **Click:** Ask agent to compare. Calculated cards should appear immediately, with a clear queued state while the agent reviews.
- [ ] Expect all three credit limits to show **Spring 2030**, **7 semesters**, **0 blocked**, **97% by original finish**. More capacity does not bypass this prerequisite chain.
- [ ] **Point:** Agent explanation when it arrives. **Say:** “Does it explain why the dates are the same and acknowledge the sample assumptions?” It must describe these calculations, not invent eligibility or claim the globally best schedule.
- [ ] **Setup catch:** Codex's add-on still needs a restart/hook review before automatic delivery is verified. Keep this chat open. If the request remains queued, tell Codex **“answer the latest DegreePath It request”**; it can read and answer the actual action manually. A queued request is pending; a local preview is not an agent reply.
- [ ] After an answer, **click:** Lighter semesters. Previous cards/explanation should clear. **Type:** more context. The cursor must stay stable; old answers must not reappear over new edits.
- [ ] **Click:** Ask agent to compare again. The feasible 12-credit option should sort first. Dates must still match the engine.
- [ ] On the 12-credit card, **click:** Use in My plan. Expect a new tab showing **12 credits**, the same Calculus II deferral, What-if selected and the card's finish date. Opening a route does not save it automatically.
- [ ] **Click:** Save plan locally → Saved plans. Refresh and reopen it. Both credit limit and edits should survive, with other saved plans untouched.

### C. A broken route must not become fake graduation

- [ ] Return to It. **Click:** Exclude Programming II → Preview locally. Expect **four options over two pages**; the first page shows three.
- [ ] **Point:** Restore excluded courses. It must explicitly restore Programming II: Fall 2029 / 6 semesters / 0 blocked / 100%. This changes the exclusion; it is not graduation without the course.
- [ ] **Point:** Standard pace, exclusion retained. Expect **Incomplete**, **2 partial terms**, **12 blocked**, **67%**. No graduation date.
- [ ] **Click:** More options. The 18-credit exclusion also stays incomplete. Previous options returns to the first three cards.
- [ ] On the 15-credit incomplete card, **click:** Use in My plan. Expect **2 schedulable semesters**, **12 requirements blocked**, and Programming II excluded. This is a partial schedule.
- [ ] **Click:** View result and inspect blocked requirements. **Say:** “Can I understand the failure without hunting?” Check Connections too.
- [ ] Back in It, open the restoration candidate. Expect baseline with Programming II retained, without silently overwriting saved plans.

### D. Find the rough edges

- [ ] At 100% laptop zoom, are goal, compare, route and return controls easy to find? Is the explanation prominent enough?
- [ ] Start Compare options from a plan with **two edits**. Do both arrive? A preset intentionally replaces the draft with its labeled example.
- [ ] Refresh It after changing context/goal: the latest draft should remain. An old handoff must not overwrite the newer draft; an old answer must not attach to a new request.
- [ ] Ordinary local comparison works without the It connection. If It is unavailable, Continue in It should report a clear failure, not hang or claim success.
- [ ] Report issues as **section → click → expected → actual → screenshot**, including credit limit and active course edits.

**Still absent:** real DegreeWorks/D2L import, verified KSU requirements/offerings, arbitrary add/replace and a hosted AI backend. Nudox stays in the other chat.

## 0. Start safely — exactly where to click

- [ ] Open the app link above in your normal demo browser/profile. Keep this exact address; localhost, another port or another profile has different storage.
- [ ] Hard-refresh once with **Ctrl+Shift+R** so the new layout is loaded. This does not delete saved plans; it clears an unsaved active scenario in this version.
- [ ] Set browser zoom to **100%**. Use your normal laptop window. Don't zoom out to make a broken layout fit.
- [ ] Click **My plan** in the left black sidebar.
- [ ] Close any dialog with **×** in its upper-right corner or **Escape**.
- [ ] If a **change strip** appears above the semester cards, save it first if wanted, then click **Reset** on the right of that strip. **No strip means no active change and no Reset to find.**
- [ ] In the summary row under MY DEGREE PLAN, find the **far-right box labeled SEMESTER PACE**. Click its large **15 credits ∨** value and choose **15 credits**. If already 15, leave it.
- [ ] Click **Baseline** on the right of SEMESTER ROADMAP.

**Expect:** Fall 2029, six semesters, 18 remaining courses / 60 credits, 60/120 earned. The gold **Explore a change** button is now beside the page title; the big instructional banner was removed to free space.

**My first reaction / anything I couldn't find >**

## 1. Test the whole screen before editing anything

- [ ] Look at the summary, roadmap controls, coverage bars and course rows. At a normal laptop size, the page should fit without vertical scrolling or clipped names.
- [ ] Find the **‹ / page count / ›** beside the roadmap hint, just above the semester cards. These move between **semester pages**.
- [ ] Click **›**. Expect later semesters, not a changed plan or finish date. Click **‹** to return.
- [ ] At shorter window heights, a semester card can also have its own **‹ / count / › at its bottom**. These move through that semester's **courses**. They do not move the courses in the plan.
- [ ] Click a card's next-course button if present. Expect the remaining class names, including Technology & Ethics in Spring 2027. Go back.
- [ ] Check no course title, credit value, button or bar is cut off. Page controls must be visibly available when there are more items.

**Critique:** Is paging clearer than scrolling? Are the two kinds of page control distinguishable? Too many clicks? Any row cramped or text too small?

**My critique >**

## 2. Inspect a class and the visible picker

- [ ] Click **Explore a change** beside the page title.
- [ ] Expect a centered editor with **Semester** buttons and a **Courses** list on the left. No semester/course dropdowns.
- [ ] Click **Spring 2027**, then the **Calculus II** course row or its branching DegreePath mark. The whole row should work.
- [ ] Expect Calculus II selected; four courses listed for that semester; **Try a change** names Calculus II.
- [ ] Click **Fall 2027**. Expect Data Structures, Applied Physics, Linear Algebra and Web Foundations to appear immediately.
- [ ] Click **Applied Physics**, then **Data Structures**. Expect the title/selection and connections to follow the selected class. Selecting alone must not edit the plan.
- [ ] Click **All**. If more than four classes exist, use the **‹ / count / › below the course list**. Try another page, then return to Spring 2027 → Calculus II.
- [ ] Click **Connections** at the top of the right pane. Expect directly unlocked courses, downstream courses and prerequisite information. For Calculus II, five remaining courses are connected and Calculus I is completed.
- [ ] Click **Result** beside Connections. Expect an unchanged finish and a prompt to choose an action.
- [ ] Close with **Back to roadmap**. It should return you to the roadmap without introducing a change.

**Critique:** Can you see all course options without guessing where to click? Does the logo feel clickable? Are Result/Connections obvious? Does changing the selected class feel different from changing the plan?

**My critique >**

## 3. A one-term change that does not delay graduation

- [ ] Open Calculus II from its roadmap row. If offscreen, use the semester/course page buttons from section 1.
- [ ] Click **Take it later**. A **Move at least** dropdown appears directly under that action; it defaults to 2 semesters.
- [ ] Set **1 semester later**.
- [ ] Expect Calculus II Spring 2027 → Fall 2027; finish stays **Fall 2029**; **4 placements changed**; **100% by Fall 2029**.
- [ ] Look at the **circular arrow between Original finish and What-if finish**. Hover over it. It should move gently, not jerk the dates or shift the layout.
- [ ] Move your pointer away. Animation should stop. Keyboard focus should offer the same feedback; reduced-motion settings should suppress it.
- [ ] Click **Create roadmap** in the bottom-right footer.
- [ ] Expect What-if selected and a compact outcome above the classes. **View result** opens the full result without growing the whole page.
- [ ] Open View result, check the dates, then close it with its ×.
- [ ] Click Baseline, then What-if. Baseline has original placements/no Moved labels; What-if retains the change.

**Critique:** Is the arrow lively but useful? Are the dates dominant enough? Does Create roadmap take you somewhere understandable?

**My critique >**

## 4. Extend the same course delay

- [ ] Click **Edit change** in the change strip above the semester cards.
- [ ] Set Calculus II to **2 semesters later**.
- [ ] Expect Spring 2027 → **Spring 2028**; finish **Spring 2030**; **10 placements changed**; **97% / 116 of 120 earned-or-planned credits by Fall 2029**.
- [ ] Your earned credits must remain **60**. A planning change does not remove completed credit.
- [ ] Click Create roadmap. Use the semester pages to find Calculus II in Spring 2028 and Capstone II in Spring 2030. A shifted class should show **Was [original term]**.
- [ ] Click **Compare result** in the change strip.
- [ ] Expect baseline Fall 2029 / 6 terms / 60 scheduled credits / 0 blocked versus what-if Spring 2030 / 7 terms / 60 scheduled credits / 0 blocked.
- [ ] Return to My plan. Navigation should not change the calculation.

**My critique of dates / comparisons / moved labels >**

## 5. Change two courses without losing the first edit

- [ ] Open the editor. Click Spring 2027 → **Programming II**.
- [ ] Click Take it later and leave **2 semesters later**.
- [ ] Expect **both Calculus II and Programming II** listed as changes. The Calculus II edit must not disappear.
- [ ] For this exact 15-credit sample, expect finish **Fall 2030**, **94% by Fall 2029**, and **16 placements changed**.
- [ ] Click **Undo** beside Programming II in the Result. Expect only that edit removed, returning to the Calculus II result: Spring 2030 / 97% / 10 changed.
- [ ] Reapply Programming II's two-term delay.
- [ ] If you make more than three edits later, use the Result's edit-list page controls; every edit must remain reachable and undoable.

**Critique:** Can you keep track of your edits while seeing the other classes? Is the per-course badge enough? Is Undo obvious and safe?

**My critique >**

## 6. Save both edits and reload

- [ ] Click **Save plan locally** in the editor footer.
- [ ] Click **Saved plans** in the left sidebar.
- [ ] Expect a card named **2 course changes · 15 credits**, with date and Open scenario.
- [ ] Refresh the browser. Go back to Saved plans and open that exact card.
- [ ] Expect the complete two-course scenario restored: Fall 2030 / both delays / 15-credit limit.
- [ ] Save it again. An identical plan should update its existing copy, not multiply the cards.
- [ ] If you have older single-course saves, open one. They should still restore correctly.
- [ ] Return to the two-course card and open it again before continuing.

**Known boundary:** Active unsaved edits still reset on refresh; saved cards should survive. Local saves do not sync to teammates.

**My critique of save / restore / names >**

## 7. Programming II exclusion by itself

- [ ] My plan → close dialog if open → **Reset** in the change strip. Leave 15 credits selected.
- [ ] Open Spring 2027 → **Programming II**. Use the card's course page button if needed.
- [ ] Click **Explore without it**.
- [ ] Expect **12 blocked requirements**, Incomplete, and **67% / 80 of 120 credits projected by Fall 2029**.
- [ ] Click **View requirements** in the result notification. Expect a popover of blocked classes. Close it.
- [ ] Click Create roadmap.
- [ ] Expect a **partial schedule with two semesters**, Spring 2027 and Fall 2027, totaling 20 scheduled remaining credits. It is not a two-semester graduation plan.
- [ ] Open View result if you need the full warning; it should not be hidden at the page bottom.

**My critique of incomplete states >**

## 8. Reproduce your screenshot: exclude both Calculus II and Programming II

- [ ] Keep Programming II excluded from section 7.
- [ ] Open the editor → Spring 2027 → **Calculus II** → Explore without it.
- [ ] Expect **14 blocked requirements**, Incomplete, **61% / 73 of 120 projected credits** and **two exclusions** listed.
- [ ] Click Create roadmap.
- [ ] Expect the heading **Partial schedule · 1 semester**. Only Spring 2027 has schedulable coursework.
- [ ] Its four courses are **Technical Writing, Technology & Ethics, Applied Physics and Open Elective**, totaling **13 credits**. Use the card's next-course button if it shows only part of the list.
- [ ] The notification must explain that requirements are blocked; the app must never claim Spring 2027 is your graduation date.
- [ ] Open View result → hover the finish arrow → open View requirements → close both popovers.
- [ ] Undo only Calculus II. Programming II must stay excluded; the plan should return to the two-semester partial schedule from section 7.

**Why this is expected:** Both excluded classes are prerequisite bottlenecks. Once all independent courses are placed, nothing else is eligible. The scheduler stops rather than displaying empty semesters forever.

**My critique / does the partial-schedule explanation make sense? >**

## 9. Coverage-strip sizing and color

- [ ] Reset the scenario first, then inspect the normal semester cards.
- [ ] Coverage should be between the earlier tiny and oversized versions: readable percentage, moderate bars, restrained padding.
- [ ] The colored bar follows its displayed percentage: **low red → middle orange → high yellow**. The neutral bar is the original/reference projection.
- [ ] Page through the semesters. Later cumulative coverage should increase toward 100% without changing earned credits.
- [ ] Create a delayed plan and compare the original/what-if bars by the same semester.
- [ ] Check the main Result action separately: Create roadmap reflects disruption, while coverage-bar color reflects percentage. A high credit percentage can still have blocked mandatory courses.

**My preferred size / color / readability change >**

## 10. Credit limits and assumptions

- [ ] Reset any active scenario. Find the large value in the far-right SEMESTER PACE box below the title.
- [ ] Select 12: expect baseline **Spring 2030 / 7 semesters**.
- [ ] Select 18: expect **Fall 2029 / 6 semesters**.
- [ ] Restore 15: expect **Fall 2029 / 6 semesters**.
- [ ] Check displayed term credits never exceed the selected cap. More capacity need not shorten a prerequisite chain.
- [ ] Click **What goes into this estimate?**, below the semester cards. Read the assumptions popover and close it.
- [ ] Make a course edit, then change the cap. Baseline and what-if comparison must use that same cap.

**My critique >**

## 11. Page-fit and completeness — don't just check the screenshot

- [ ] At your usual laptop window and 100% zoom, check My plan and the editor for vertical/horizontal scrolling and clipped content.
- [ ] Test Result with 0 edits, 2 edits, and 3 edits. Close the editor; do the same with View result on the roadmap.
- [ ] Test Connections for Programming II, which has a large downstream chain.
- [ ] Test All courses across its page controls, not only the first four classes.
- [ ] Test later semester pages and each semester's course pages. No missing class is acceptable just to avoid scrolling.
- [ ] If the window is narrower/shorter, check that a page count/control appears rather than chopping a title, Undo or footer button.
- [ ] If anything fails: record window size, browser zoom, edit count, selected course and a screenshot. Don't zoom out to hide the failure.

**My critique >**

## 12. Theme, keyboard and remaining navigation

- [ ] Toggle the sun/moon switch at the top right. Inspect controls in both themes; leave your preferred theme selected.
- [ ] Refresh; the theme and saved plans should persist.
- [ ] Open a course. Tab / Shift+Tab through semester buttons, course rows, actions, Result/Connections and footer. Focus must stay visible.
- [ ] Escape closes the editor. The finish arrow's keyboard-focus feedback should respect reduced motion too.
- [ ] Compare paths → My scenario should calculate your edits. Degree previews should stay explicitly unevaluated, not invent a degree finish.
- [ ] Only if wanted: save a throwaway plan and delete only that card. Delete has no undo; keep wanted plans.

**My critique >**

## Send feedback as you go

> Step 8 — I expected more semesters, but the partial-schedule label explained it. View requirements is hard to notice though. Screenshot attached.

| Step | Exact action / where I got stuck | Expected vs actual | What I'd change |
| --- | --- | --- | --- |
| | | | |
| | | | |
| | | | |

Working mock: multi-course defer/exclude, individual Undo, accumulated constraints, calculated scenario comparison, local saves, themes, paged lists and projected coverage. Still missing: real audit import, verified KSU rules, true degree switching, arbitrary course insertion, unsaved-draft persistence, AI and teammate sync. Missing features are valid critique; keep them distinct from incorrect implemented behavior.
