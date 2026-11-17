import './style.css';
import { courses, dependencies, plan, termLabel } from './planner';
import type { Scenario, Course } from './planner';

const branch = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 19V5m0 10c0-5 12-2 12-10"/><circle cx="6" cy="4" r="2.2"/><circle cx="18" cy="4" r="2.2"/><circle cx="6" cy="20" r="2.2"/></svg>`;
const arrow = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true"><path d="M5 12h14m-5-5 5 5-5 5"/></svg>`;
const check = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="m5 12 4 4L19 6"/></svg>`;
const app = document.querySelector<HTMLDivElement>('#app')!;
let theme = (() => { try { return localStorage.getItem('degreepath.theme') ?? (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'); } catch { return 'light'; } })();
document.documentElement.dataset.theme = theme;
let editorOpen = false;
const navIcons = [
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>',
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true"><path d="M6 20V4m0 7h8a4 4 0 0 0 4-4V4M6 14h8a4 4 0 0 1 4 4v2"/></svg>',
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true"><path d="M6 3h12v18l-6-4-6 4Z"/></svg>'
];
const moon = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="M20 15.5A8.5 8.5 0 0 1 8.5 4 8.5 8.5 0 1 0 20 15.5Z"/></svg>';
const sun = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l2 2m10 10 2 2M5 19l2-2M17 7l2-2"/></svg>';
let creditLimit = 15;
let selectedId = 'calc2';
let scenario: Scenario | undefined;
let view: 'plan' | 'compare' | 'saved' = 'plan';
let timeline: 'baseline' | 'scenario' = 'baseline';
let notice = '';
let storageAvailable = true;
interface Saved { id: string; name: string; date: string; scenario: Scenario }
const escape = (value: string) => value.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
function loadSaved(): Saved[] {
  try {
    const data: unknown = JSON.parse(localStorage.getItem('degreepath.scenarios.v1') ?? '[]');
    if (!Array.isArray(data)) return [];
    return data.filter((s): s is Saved => s && typeof s.id === 'string' && typeof s.name === 'string' && typeof s.date === 'string'
      && s.scenario && courses.some(c => c.id === s.scenario.courseId) && ['defer', 'exclude'].includes(s.scenario.action)
      && [12, 15, 18].includes(s.scenario.creditLimit) && Number.isInteger(s.scenario.delay) && s.scenario.delay >= 1 && s.scenario.delay <= 4).slice(0, 10);
  } catch { storageAvailable = false; return []; }
}
let saved = loadSaved();
function persist() {
  try { localStorage.setItem('degreepath.scenarios.v1', JSON.stringify(saved)); return true; }
  catch { storageAvailable = false; notice = 'Browser storage is unavailable. Scenarios will only last for this session.'; return false; }
}
function courseCard(c: Course, index: number, baseline: ReturnType<typeof plan>) {
  const moved = !!scenario && baseline.placements[c.id] !== index;
  const selected = editorOpen && c.id === selectedId;
  return `<button class="course area-${c.area.toLowerCase()} ${selected ? 'selected' : ''} ${moved ? 'moved' : ''}" data-course="${c.id}" aria-label="Explore impact: ${c.title}" aria-haspopup="dialog">
    <span class="course-top"><span>${c.code}</span><span class="course-open" aria-hidden="true">${arrow}</span></span>
    <span class="course-title">${c.title}</span><span class="course-bottom"><span class="course-credit" title="${c.area}">${c.credits} cr</span>${moved ? '<span class="course-state">Moved</span>' : '<span class="course-edit">Explore</span>'}</span>
  </button>`;
}
function render() {
  const baseline = plan(creditLimit);
  const result = scenario ? plan(creditLimit, scenario) : baseline;
  const active = timeline === 'baseline' ? baseline : result;
  const course = courses.find(c => c.id === selectedId)!;
  const deps = dependencies(selectedId);
  const delta = result.terms.length - baseline.terms.length;
  const changed = courses.filter(c => result.placements[c.id] !== baseline.placements[c.id]).length;
  const complete = result.finish !== null;
  app.innerHTML = `
    <div class="sample-banner">Sample curriculum <span>·</span> Independent student prototype</div>
    <aside class="sidebar"><a href="#" class="brand" aria-label="DegreePath home"><span class="brand-mark">${branch}</span><span>DegreePath<small>KSU AI HACKATHON</small></span></a><div class="nav-category">ACADEMIC PLANNING</div><nav aria-label="Main navigation">${[['plan', 'My plan'], ['compare', 'Compare paths'], ['saved', 'Saved plans']].map(([id, label],i) => `<button data-view="${id}" class="nav-link ${view === id ? 'active' : ''}" ${view === id ? 'aria-current="page"' : ''}>${navIcons[i]}<span>${label}</span>${id === 'saved' && saved.length ? `<span class="count">${saved.length}</span>` : ''}</button>`).join('')}</nav><div class="sidebar-bottom"><span class="sidebar-label">YOUR DEGREE</span><strong>Computing B.S.</strong><span>60 of 120 credits completed</span><div class="sidebar-progress"><i></i></div><span class="sidebar-footnote">Fictional sample · No KSU connection</span></div></aside>
    <header class="topbar"><div class="program-context">${branch}<span>PROGRAM</span><strong>Computing B.S.</strong><span class="catalog-label">Sample catalog</span></div><div class="profile"><span class="mode-label">Appearance</span><span class="theme-control"><span class="theme-end" aria-hidden="true">${sun}</span><button id="theme-toggle" class="theme-switch" role="switch" aria-label="Dark mode" aria-checked="${theme === 'dark'}"><span class="switch-thumb"></span></button><span class="theme-end" aria-hidden="true">${moon}</span></span></div></header>
    <main><div class="page-heading"><div><div class="eyebrow">DEGREEPATH / ${view === 'compare' ? 'EXPLORE' : view === 'saved' ? 'YOUR OPTIONS' : 'OVERVIEW'}</div><h1>${view === 'compare' ? 'COMPARE PATHS' : view === 'saved' ? 'SAVED PLANS' : 'MY DEGREE PLAN'}</h1></div>${view === 'plan' ? `<button id="new-scenario" class="primary-button">${branch} Explore a change</button>` : ''}</div>
      <div class="notice" role="status" aria-live="polite">${escape(notice)}</div>
      ${view === 'plan' ? `
      <section class="summary-grid" aria-label="Plan summary">
        <div class="summary-card"><span class="summary-label">COMPLETED CREDITS</span><strong>60 <span>/ 120</span></strong><div class="metric-progress"><i></i></div></div>
        <div class="summary-card"><span class="summary-label">COURSES REMAINING</span><strong>18</strong><small>60 credits to complete</small></div>
        <div class="summary-card"><span class="summary-label">${scenario ? 'WHAT-IF FINISH' : 'ESTIMATED FINISH'}</span><strong class="finish-value">${complete ? result.finish : 'Incomplete'}</strong><small>${!complete ? 'Required course excluded' : scenario ? delta > 0 ? `+${delta} semester${delta === 1 ? '' : 's'} vs. baseline` : delta < 0 ? `${delta} semesters vs. baseline` : 'No change to finish' : `${baseline.terms.length} semesters · fall / spring`}</small></div>
        <div class="summary-card workload"><label class="summary-label" for="credits">SEMESTER PACE</label><select id="credits">${[12, 15, 18].map(n => `<option value="${n}" ${creditLimit === n ? 'selected' : ''}>${n} credits</option>`).join('')}</select><small>Maximum credits per term</small></div>
      </section>
      <div class="workspace"><section class="timeline-section" aria-labelledby="timeline-heading">
        <div class="roadmap-toolbar"><div><h2 id="timeline-heading">Semester roadmap</h2><span class="roadmap-subtitle">${active.terms.length} semesters <span>·</span> ${timeline === 'baseline' ? 'Original plan' : scenario ? 'Changes highlighted' : 'Choose a course to start'}</span></div><div class="plan-controls" role="group" aria-label="Displayed plan"><button data-timeline="baseline" class="${timeline === 'baseline' ? 'active' : ''}" aria-pressed="${timeline === 'baseline'}">${check}<span>Baseline</span></button><button data-timeline="scenario" class="${timeline === 'scenario' ? 'active' : ''}" aria-pressed="${timeline === 'scenario'}">${branch}<span>What-if plan</span>${scenario ? '<i class="change-dot"></i>' : ''}</button></div></div>
        <div class="roadmap-tip"><span>${branch} Click any course to change its path</span><span class="roadmap-legend">${scenario && timeline === 'scenario' ? 'Gold marks a moved course' : '18 courses / 60 credits'}</span></div>
        ${scenario ? `<div class="scenario-strip"><span>${branch}<strong>${scenario.action === 'defer' ? 'Taking it later' : 'Exploring without it'}:</strong> ${courses.find(c => c.id === scenario!.courseId)!.title}${scenario.action === 'defer' ? ` · no earlier than ${termLabel(baseline.placements[scenario.courseId] + scenario.delay)}` : ''}</span><button id="reset">Reset plan <span aria-hidden="true">↺</span></button></div>` : ''}
        <div class="terms">${active.terms.map(t => `<section class="term"><header><div><span class="term-number">${String(t.index + 1).padStart(2, '0')}</span><h3>${t.label}</h3></div><span>${t.credits} / ${creditLimit} cr</span></header><div class="term-meter" aria-hidden="true" style="--load:${100*t.credits/creditLimit}%"></div><div class="term-courses">${t.courses.length ? t.courses.map(c => courseCard(c, t.index, baseline)).join('') : '<p class="empty-term">Room to breathe.<br>Waiting for prerequisites.</p>'}</div></section>`).join('')}</div>
        ${active.blocked.length ? `<section class="blocked-box"><h3>Blocked requirements · ${active.blocked.length} courses</h3><p>This degree cannot be completed without the excluded mandatory course. No substitutions are modeled.</p><div>${active.blocked.map(c => `<button data-course="${c.id}"><strong>${c.title}</strong><span>Blocked ${c.id === scenario?.courseId ? '· excluded' : '· prerequisite unavailable'}</span></button>`).join('')}</div></section>` : ''}
        <details class="assumptions"><summary>What goes into this estimate?</summary><p>This fictional sample starts Spring 2027 with 60 earned credits; only Calculus I and Programming I are individually modeled. The greedy planner assumes every remaining course is offered every fall and spring, with prerequisites completed in earlier terms. It does not guarantee the earliest possible finish. Summer, grades, corequisites, electives allocation, transfer rules, admission gates, and real availability are not modeled.</p></details>
      </section>
      </div><dialog id="course-editor" class="course-dialog" aria-labelledby="editor-title"><div class="scenario-panel"><div class="editor-heading"><span class="panel-kicker">${branch} COURSE OPTIONS</span><button id="close-editor" class="close-editor" aria-label="Close course options">×</button></div><h2 id="editor-title">${course.title}</h2>
        <div class="editor-body"><label class="field-label" for="selected-course">COURSE</label><select id="selected-course">${courses.map(c => `<option value="${c.id}" ${c.id === selectedId ? 'selected' : ''}>${c.title}</option>`).join('')}</select>
        <div class="selected-detail"><span>${course.code} · ${course.credits} credits</span><span>${termLabel(baseline.placements[selectedId])}</span></div>
        <div class="panel-divider"></div><span class="field-label">CHANGE COURSE</span>
        <button class="choice ${scenario?.courseId === selectedId && scenario.action === 'defer' ? 'chosen' : ''}" id="defer" aria-pressed="${scenario?.courseId === selectedId && scenario.action === 'defer'}"><span class="choice-icon">↗</span><span><strong>Take it later</strong></span><span class="radio-dot"></span></button>
        ${scenario?.courseId === selectedId && scenario.action === 'defer' ? `<div class="delay-field"><label for="delay">Move at least</label><select id="delay">${[1, 2, 3, 4].map(n => `<option value="${n}" ${scenario!.delay === n ? 'selected' : ''}>${n} semester${n === 1 ? '' : 's'} later</option>`).join('')}</select><small>No earlier than ${termLabel(baseline.placements[selectedId] + scenario.delay)}. Placement may be later.</small></div>` : ''}
        <button class="choice ${scenario?.courseId === selectedId && scenario.action === 'exclude' ? 'chosen' : ''}" id="exclude" aria-pressed="${scenario?.courseId === selectedId && scenario.action === 'exclude'}"><span class="choice-icon">−</span><span><strong>Explore without it</strong></span><span class="radio-dot"></span></button>
        <button class="choice" data-view="compare"><span class="choice-icon">${branch}</span><span><strong>Explore other degrees</strong></span>${arrow}</button>
        <div class="impact"><span class="field-label">${scenario?.courseId === selectedId ? 'YOUR CURRENT WHAT-IF' : 'COURSE CONNECTIONS'}</span><h3>${scenario?.courseId === selectedId ? complete ? delta > 0 ? `A new finish: ${result.finish}` : 'Your finish stays on track' : 'This route needs this course' : `${deps.direct.length + deps.downstream.length} courses connected`}</h3><p>${scenario?.courseId === selectedId ? complete ? `${changed} course${changed === 1 ? '' : 's'} rescheduled. ${delta > 0 ? 'The prerequisite sequence shifts your estimated finish.' : 'The remaining coursework can be rearranged without extending your estimated finish.'}` : `${result.blocked.length} required courses cannot be completed under this constraint. Consider deferring the course or discussing another degree.` : 'Prerequisites connect this course to the rest of your plan.'}</p>
          <div class="route-visual" aria-label="${scenario?.courseId === selectedId ? `Baseline ${baseline.finish}; scenario ${result.finish ?? 'incomplete'}` : 'Course dependency preview'}"><div><span class="route-node">${check}</span><small>${scenario?.courseId === selectedId ? 'Baseline' : course.title}</small><strong>${scenario?.courseId === selectedId ? baseline.finish : 'Selected'}</strong></div><span class="route-line">${arrow}</span><div><span class="route-node ${!complete && scenario?.courseId === selectedId ? 'warning' : ''}">${branch}</span><small>${scenario?.courseId === selectedId ? 'What-if' : 'Connected'}</small><strong>${scenario?.courseId === selectedId ? result.finish ?? 'Incomplete' : `${deps.direct.length + deps.downstream.length} courses`}</strong></div></div><details><summary>Dependencies</summary><p><strong>Direct prerequisites for:</strong> ${deps.direct.map(c => c.title).join(', ') || 'No remaining courses'}.</p><p><strong>Further down the path:</strong> ${deps.downstream.map(c => c.title).join(', ') || 'No further dependencies'}.</p>${course.prerequisites.length ? `<p><strong>This course needs:</strong> ${course.prerequisites.map(p => courses.find(c => c.id === p)?.title ?? (p === 'calc1' ? 'Calculus I (completed)' : 'Programming I (completed)')).join(', ')}.</p>` : ''}</details>
          ${scenario?.courseId === selectedId ? `<div class="next-term"><strong>Eligible courses planned next term</strong><span>${result.terms[0]?.courses.map(c => c.title).join(' · ') || 'No eligible courses scheduled.'}</span></div>` : ''}</div>
        </div><div class="editor-actions"><button class="primary-button" id="save" ${!scenario || scenario.courseId !== selectedId ? 'disabled' : ''}>${branch} Save this plan</button>
      <button id="done-editor" class="done-button">Done ${check}</button></div></div></dialog>` : view === 'compare' ? comparison() : savedPage()}
      <footer><span>Sample curriculum · Not an official KSU degree audit</span><span>DegreePath</span></footer>
    </main>`;
  bind();
  if (editorOpen && view === 'plan') app.querySelector<HTMLDialogElement>('#course-editor')?.showModal();
}
function comparison() {
  const icons = [
    '<path d="m8 7-5 5 5 5m8-10 5 5-5 5m-3-13-2 16"/>',
    '<rect x="3" y="3" width="7" height="7" rx="2"/><rect x="14" y="14" width="7" height="7" rx="2"/><path d="M14 6h4v4M6 14v4h4"/>',
    '<path d="m15 3 6 6-11 11-7 1 1-7Z M12 6l6 6M4 14l6 6"/>'
  ];
  return `<section class="comparison"><div class="comparison-note"><span class="sample-label">PREVIEW</span><span>Degree requirements aren't connected yet. Explore the concepts below.</span></div><div class="compare-grid">${[
    ['Computing B.S.', 'Current degree', 'Code. Build. Solve.', ['Programming', 'Algorithms', 'Systems']],
    ['Information Systems B.S.', 'Explore', 'Where business meets technology.', ['Business', 'Data', 'Technology']],
    ['Digital Design B.S.', 'Explore', 'Make technology more human.', ['Design', 'Interaction', 'Creative practice']],
  ].map(([title, tag, description, focus], i) => `<article class="compare-card compare-${i}"><div class="compare-art"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.2" aria-hidden="true">${icons[i]}</svg><span class="art-orbit"></span></div><span class="eyebrow">${tag}</span><h2>${title}</h2><p>${description}</p><div class="focus-tags">${(focus as string[]).map(f => `<span>${f}</span>`).join('')}</div><div class="degree-status"><span>Credit fit & finish</span><strong>Not evaluated</strong></div><details><summary>What needs connecting?</summary><p>Verified catalog requirements, completed-credit allocation, prerequisite sequences, admission conditions, and course offerings. These fictional programs are illustrative.</p></details></article>`).join('')}</div></section>`;
}
function savedPage() {
  return `<section class="saved-page">${!storageAvailable ? '<p class="comparison-note">Browser storage is unavailable. Saved plans only last for this session.</p>' : ''}${saved.length ? `<div class="saved-grid">${saved.map(s => `<article class="saved-card"><div class="panel-kicker">${branch} SAVED POSSIBILITY</div><h2>${escape(s.name)}</h2><p>${s.scenario.creditLimit} credits per semester · ${escape(new Date(s.date).toLocaleDateString())}</p><div><button class="primary-button" data-restore="${escape(s.id)}">Open scenario ${arrow}</button><button class="text-button" data-delete="${escape(s.id)}">Delete</button></div></article>`).join('')}</div>` : `<div class="empty-state"><span class="empty-icon">${branch}</span><h2>No saved plans yet.</h2><p>Choose a course, try a change, then save your plan.</p><button class="primary-button" data-view="plan">Explore courses ${arrow}</button></div>`}<p class="storage-note">Stored in this browser · 10 options maximum</p></section>`;
}
function setScenario(action: 'defer' | 'exclude') {
  scenario = { courseId: selectedId, action, delay: 2, creditLimit };
  timeline = 'scenario'; notice = ''; render();
}
function bind() {
  app.querySelector<HTMLButtonElement>('#new-scenario')?.addEventListener('click', () => { editorOpen = true; render(); });
  const themeButton = app.querySelector<HTMLButtonElement>('#theme-toggle');
  if (themeButton) themeButton.onclick = () => { theme = theme === 'dark' ? 'light' : 'dark'; document.documentElement.dataset.theme = theme; try { localStorage.setItem('degreepath.theme', theme); } catch {} render(); app.querySelector<HTMLElement>('#theme-toggle')?.focus(); };
  const closeEditor = () => { editorOpen = false; render(); app.querySelector<HTMLElement>(`[data-course="${selectedId}"]`)?.focus({preventScroll:true}); };
  const dialog = app.querySelector<HTMLDialogElement>('#course-editor');
  if (dialog) { dialog.oncancel = e => { e.preventDefault(); closeEditor(); }; dialog.onclick = e => { if (e.target === dialog) { const r = dialog.getBoundingClientRect(); if (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom) closeEditor(); } }; }
  app.querySelector<HTMLButtonElement>('#close-editor')?.addEventListener('click', closeEditor);
  app.querySelector<HTMLButtonElement>('#done-editor')?.addEventListener('click', closeEditor);
  app.querySelector('.brand')?.addEventListener('click', e => { e.preventDefault(); view = 'plan'; render(); });
  app.querySelectorAll<HTMLButtonElement>('[data-view]').forEach(b => b.onclick = () => { view = b.dataset.view as typeof view; editorOpen = false; notice = ''; render(); });
  app.querySelectorAll<HTMLButtonElement>('[data-course]').forEach(b => b.onclick = () => { selectedId = b.dataset.course!; editorOpen = true; notice = ''; render(); });
  app.querySelectorAll<HTMLButtonElement>('[data-timeline]').forEach(b => b.onclick = () => { timeline = b.dataset.timeline as typeof timeline; if (timeline === 'scenario' && !scenario) editorOpen = true; render(); });
  const credits = app.querySelector<HTMLSelectElement>('#credits');
  if (credits) credits.onchange = () => { creditLimit = Number(credits.value); if (scenario) scenario.creditLimit = creditLimit; render(); app.querySelector<HTMLElement>('#credits')?.focus(); };
  const selected = app.querySelector<HTMLSelectElement>('#selected-course');
  if (selected) selected.onchange = () => { selectedId = selected.value; render(); app.querySelector<HTMLElement>('#selected-course')?.focus(); };
  const defer = app.querySelector<HTMLButtonElement>('#defer'); if (defer) defer.onclick = () => { setScenario('defer'); app.querySelector<HTMLElement>('#delay')?.focus(); };
  const exclude = app.querySelector<HTMLButtonElement>('#exclude'); if (exclude) exclude.onclick = () => { setScenario('exclude'); app.querySelector<HTMLElement>('#exclude')?.focus(); };
  const delay = app.querySelector<HTMLSelectElement>('#delay'); if (delay) delay.onchange = () => { scenario!.delay = Number(delay.value); render(); app.querySelector<HTMLElement>('#delay')?.focus(); };
  const reset = app.querySelector<HTMLButtonElement>('#reset'); if (reset) reset.onclick = () => { scenario = undefined; notice = ''; render(); };
  const save = app.querySelector<HTMLButtonElement>('#save'); if (save) save.onclick = () => {
    if (!scenario) return;
    const c = courses.find(c => c.id === scenario!.courseId)!;
    const name = scenario.action === 'defer' ? `${c.title} · ${scenario.delay} semesters later` : `Explore without ${c.title}`;
    saved = [{ id: crypto.randomUUID(), name, date: new Date().toISOString(), scenario: { ...scenario } }, ...saved.filter(s => JSON.stringify(s.scenario) !== JSON.stringify(scenario))].slice(0, 10);
    if (persist()) notice = 'Plan saved. Find it in Saved plans.';
    editorOpen = false; render();
  };
  app.querySelectorAll<HTMLButtonElement>('[data-restore]').forEach(b => b.onclick = () => {
    const s = saved.find(s => s.id === b.dataset.restore)!;
    scenario = { ...s.scenario }; creditLimit = scenario.creditLimit; selectedId = scenario.courseId;
    view = 'plan'; editorOpen = false; timeline = 'scenario'; notice = 'Option restored.'; render();
  });
  app.querySelectorAll<HTMLButtonElement>('[data-delete]').forEach(b => b.onclick = () => { saved = saved.filter(s => s.id !== b.dataset.delete); persist(); render(); });
}
render();
