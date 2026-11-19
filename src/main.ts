import './style.css';
import { courses, dependencies, plan, termLabel, scenarioChanges, updateCourseChange, removeCourseChange } from './planner';
import type { Scenario, Course } from './planner';
import { describeImpact, projectedCreditsThrough, coveragePercent, coverageColor } from './impact';
import {parseRouteFragment,scenarioForRoute,type RouteRequest} from './route-options';
import {renderStudent} from './student';

const branch = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 19V5m0 10c0-5 12-2 12-10"/><circle cx="6" cy="4" r="2.2"/><circle cx="18" cy="4" r="2.2"/><circle cx="6" cy="20" r="2.2"/></svg>`;
const arrow = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true"><path d="M5 12h14m-5-5 5 5-5 5"/></svg>`;
const check = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="m5 12 4 4L19 6"/></svg>`;
const app = document.querySelector<HTMLDivElement>('#app')!;
let theme = (() => { try { return localStorage.getItem('degreepath.theme') ?? (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'); } catch { return 'light'; } })();
document.documentElement.dataset.theme = theme;
let editorOpen = false;
let courseTerm = '0';
let coursePage = 0;
let editPage = 0;
let roadmapPage = 0;
const termCoursePages: Record<number,number> = {};
let editorTab: 'result' | 'connections' = 'result';
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
let comparisonView: 'scenario' | 'degrees' = 'scenario';
let selectedDegree = 0;
let notice = '';
let showSample = false;
try {
  const imported=parseRouteFragment(location.hash);
  if(imported){
    showSample = true;
    creditLimit=imported.creditLimit;scenario=scenarioForRoute(creditLimit,imported.changes);
    timeline=scenario?'scenario':'baseline';selectedId=scenario?.courseId??'calc2';
    notice='Calculated route opened. Review it here, then save locally if you want to keep it.';
    history.replaceState(null,'',location.pathname+location.search);
  }
}catch{showSample = true;notice='That route link is invalid. Your original sample plan is shown.';}
function agentHref(){
  const request:RouteRequest={requestId:crypto.randomUUID(),revision:0,dataset:'degreepath.sample.v1',creditLimit,changes:scenarioChanges(scenario),goal:'balanced',context:''};
  return 'agent.html#request='+encodeURIComponent(JSON.stringify(request));
}
let storageAvailable = true;
interface Saved { id: string; name: string; date: string; scenario: Scenario }
const escape = (value: string) => value.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
function validStoredScenario(value: Scenario): boolean {
  try { if (![12,15,18].includes(value.creditLimit) || !courses.some(c=>c.id===value.courseId) || !['defer','exclude'].includes(value.action) || !Number.isInteger(value.delay) || value.delay<1 || value.delay>4) return false; plan(value.creditLimit,value); return true; } catch { return false; }
}
function scenarioKey(value: Scenario): string {
  return JSON.stringify([value.creditLimit, scenarioChanges(value).map(c=>({...c})).sort((a,b)=>a.courseId.localeCompare(b.courseId))]);
}
function loadSaved(): Saved[] {
  try {
    const data: unknown = JSON.parse(localStorage.getItem('degreepath.scenarios.v1') ?? '[]');
    if (!Array.isArray(data)) return [];
    return data.filter((s): s is Saved => s && typeof s.id === 'string' && typeof s.name === 'string' && typeof s.date === 'string'
      && s.scenario && validStoredScenario(s.scenario)).slice(0, 10);
  } catch { storageAvailable = false; return []; }
}
let saved = loadSaved();
function persist() {
  try { localStorage.setItem('degreepath.scenarios.v1', JSON.stringify(saved)); storageAvailable = true; return true; }
  catch { storageAvailable = false; notice = 'Browser storage is unavailable. Scenarios will only last for this session.'; return false; }
}
function courseCard(c: Course, index: number, baseline: ReturnType<typeof plan>) {
  const moved = timeline === 'scenario' && !!scenario && baseline.placements[c.id] !== index;
  const selected = editorOpen && c.id === selectedId;
  return `<button class="course area-${c.area.toLowerCase()} ${selected ? 'selected' : ''} ${moved ? 'moved' : ''}" data-course="${c.id}" aria-label="Explore impact: ${c.title}, ${c.credits} credits${moved ? `, moved from ${termLabel(baseline.placements[c.id])}` : ''}" aria-haspopup="dialog">
    <span class="course-top"><span>${c.code}</span></span>
    <span class="course-title">${c.title}${moved ? `<small class="moved-from">Was ${termLabel(baseline.placements[c.id])}</small>` : ''}</span>
    <span class="course-credit" title="${c.credits} credits · ${c.area}">${c.credits}</span>
  </button>`;
}
function pager(kind: string, page: number, pages: number, label: string) {
  return pages>1 ? `<div class="list-pager" role="group" aria-label="${label}"><button data-page-kind="${kind}" data-page="${page-1}" ${page===0?'disabled':''} aria-label="Previous ${label}">‹</button><span>${page+1} / ${pages}</span><button data-page-kind="${kind}" data-page="${page+1}" ${page>=pages-1?'disabled':''} aria-label="Next ${label}">›</button></div>` : '';
}
function resultPanel(baseline: ReturnType<typeof plan>, result: ReturnType<typeof plan>, preview = true, context = 'roadmap') {
  const impact = describeImpact(baseline, result);
  const delta = result.terms.length - baseline.terms.length;
  const edits = scenarioChanges(scenario);
  editPage = Math.min(editPage,Math.max(0,Math.ceil(edits.length/3)-1));
  const color = coverageColor(impact.targetPercent);
  return `<section class="result-panel status-${impact.status}" style="--result-color:${color}" aria-label="Change preview">
    <div class="result-heading"><span class="result-eyebrow">Result</span></div>
    <h3>${!preview ? 'Choose an action to preview its impact' : !result.finish ? `${result.blocked.length} required courses blocked` : delta > 0 ? `Finish ${delta} semester${delta === 1 ? '' : 's'} later` : 'Your finish stays on track'}</h3>
    ${result.blocked.length ? `<div class="blocked-notification" role="status"><span>${result.blocked.length} requirements blocked. Only ${result.terms.length} semester${result.terms.length===1?'':'s'} of coursework can be scheduled.</span><button popovertarget="blocked-${context}">View requirements ${branch}</button></div><div id="blocked-${context}" popover class="blocked-popover"><div><h3>Blocked requirements</h3><button popovertarget="blocked-${context}" popovertargetaction="hide" aria-label="Close blocked requirements">×</button></div><p>These required courses cannot be completed under your current changes. Try restoring a course or taking it later.</p><div class="dependency-chips">${result.blocked.map(c=>`<button data-course="${c.id}">${escape(c.title)} ${branch}</button>`).join('')}</div></div>` : ''}
    ${preview && scenario ? `<div class="plan-edit-list">${edits.slice(editPage*3,editPage*3+3).map(change=>`<div class="changed-course"><strong>${courses.find(c=>c.id===change.courseId)!.title}</strong><span>${termLabel(baseline.placements[change.courseId])} ${arrow} ${result.placements[change.courseId] === undefined ? 'Not scheduled' : termLabel(result.placements[change.courseId])}</span><button data-remove-change="${change.courseId}" aria-label="Undo change to ${courses.find(c=>c.id===change.courseId)!.title}">Undo</button></div>`).join('')}${pager('edits',editPage,Math.ceil(edits.length/3),'course edits')}</div>` : ''}
    <div class="finish-comparison"><div><small>Original finish</small><strong>${baseline.finish}</strong></div><span class="finish-transition" tabindex="0" role="img" aria-label="Original plan to what-if plan">${arrow}</span><div><small>What-if finish</small><strong>${result.finish ?? 'Incomplete'}</strong></div></div>
    <div class="projection"><div><strong>Projected coverage by ${baseline.finish}</strong><b>${impact.targetPercent}%</b></div><div class="projection-track"><i style="width:${impact.targetPercent}%"></i></div><span>${impact.targetCredits} / ${impact.requiredCredits} earned or planned credits</span><small>Your ${impact.earnedCredits} earned credits stay unchanged.</small></div>
    <div class="result-stats"><div><strong>${impact.moved.length}</strong><span>placements changed</span></div><div><strong>${impact.delayed.length}</strong><span>courses later</span></div><div><strong>${result.blocked.length}</strong><span>blocked</span></div></div>
  </section>`;
}
function termProjection(index: number, baseline: ReturnType<typeof plan>, active: ReturnType<typeof plan>) {
  const original = coveragePercent(projectedCreditsThrough(baseline, index));
  const proposed = coveragePercent(projectedCreditsThrough(active, index));
  return `<div class="term-projection" aria-label="Projected degree coverage at end of ${termLabel(index)}"><span>Projected coverage <strong>${proposed}%</strong></span><div class="semester-progress original" title="Original: ${original}%"><i style="width:${original}%"></i></div><div class="semester-progress proposed" style="--coverage-color:${coverageColor(proposed)}" title="Displayed plan: ${proposed}%"><i style="width:${proposed}%"></i></div><small>${timeline === 'scenario' && scenario ? `Original ${original}% → what-if ${proposed}%` : 'Earned + planned credits by term end'}</small></div>`;
}
function renderTerm(t: ReturnType<typeof plan>['terms'][number], baseline: ReturnType<typeof plan>, active: ReturnType<typeof plan>) {
  const slots=innerHeight<760 ? (scenario && timeline==='scenario'?2:3) : innerHeight<900 && scenario && timeline==='scenario'?3:4;
  const pages=Math.ceil(t.courses.length/slots);
  const page=Math.min(termCoursePages[t.index]??0,Math.max(0,pages-1));
  termCoursePages[t.index]=page;
  return `<section class="term"><header><div><span class="term-number">${String(t.index+1).padStart(2,'0')}</span><h3>${t.label}</h3></div><span class="term-credit-total" aria-label="${t.credits} of ${creditLimit} credits"><strong>${t.credits}</strong> / ${creditLimit} credits</span></header><div class="term-meter" aria-hidden="true" style="--load:${100*t.credits/creditLimit}%"></div>${termProjection(t.index,baseline,active)}<div class="term-courses">${t.courses.length?t.courses.slice(page*slots,(page+1)*slots).map(c=>courseCard(c,t.index,baseline)).join(''):'<p class="empty-term">Waiting for prerequisites.</p>'}</div>${pager(`term-${t.index}`,page,pages,`${t.label} courses`)}</section>`;
}
function courseEditor(baseline: ReturnType<typeof plan>) {
  const course = courses.find(c=>c.id===selectedId)!;
  const deps = dependencies(selectedId);
  const edit = scenarioChanges(scenario).find(change=>change.courseId===selectedId);
  const result = scenario ? plan(creditLimit, scenario) : baseline;
  const terms = baseline.terms.filter(t=>courseTerm === 'all' || String(t.index) === courseTerm);
  const visibleCourses = terms.flatMap(t=>t.courses);
  coursePage=Math.min(coursePage,Math.max(0,Math.ceil(visibleCourses.length/4)-1));
  const shownCourses=visibleCourses.slice(coursePage*4,coursePage*4+4);
  const related = (items: Course[]) => items.length ? items.map(c=>`<button data-course="${c.id}">${escape(c.title)} ${branch}</button>`).join('') : '<span class="no-dependencies">None in the remaining sample</span>';
  const severity = Math.min(1, result.blocked.length ? .3 + result.blocked.length / courses.length * .7 : Math.max(0,result.terms.length-baseline.terms.length)/5);
  const actionColor = `hsl(${47*(1-severity)} 90% ${50-severity*12}%)`;
  return `<dialog id="course-editor" class="course-dialog" aria-labelledby="editor-title"><div class="scenario-panel">
    <div class="editor-heading"><div><span class="panel-kicker">${branch} EXPLORE A CHANGE</span><h2 id="editor-title">${escape(course.title)}</h2><p class="compact-preview">${scenario ? `${result.finish ?? 'Incomplete'} · ${scenarioChanges(scenario).length} course changes` : 'Choose a course and try a change'}</p></div><button id="close-editor" class="close-editor" aria-label="Close course options">×</button></div>
    <div class="editor-workspace"><div class="editor-controls">
      <h3>Semester</h3><div class="semester-choices" role="group" aria-label="Choose semester"><button data-term="all" aria-pressed="${courseTerm==='all'}">All</button>${baseline.terms.map(t=>`<button data-term="${t.index}" aria-pressed="${courseTerm===String(t.index)}">${t.label}</button>`).join('')}</div>
      <h3 class="course-list-title">Courses <small>${courseTerm==='all'?'All semesters':termLabel(Number(courseTerm))}</small></h3>
      <div class="course-choices" role="group" aria-label="Choose course">${shownCourses.map(c=>{const change=scenarioChanges(scenario).find(item=>item.courseId===c.id);return `<button data-pick-course="${c.id}" aria-pressed="${c.id===selectedId}" aria-label="Edit ${c.title}" title="Explore ${c.title}"><span><strong>${c.title}</strong><small>${c.code} · ${c.credits} cr${courseTerm==='all'?` · ${termLabel(baseline.placements[c.id])}`:''}${change?` · ${change.action==='exclude'?'Excluded':`${change.delay} terms later`}`:''}</small></span><span class="picker-mark">${branch}</span></button>`;}).join('')}</div>${pager('courses',coursePage,Math.ceil(visibleCourses.length/4),'courses')}
      <h3 class="action-title">Try a change <small>${escape(course.title)}</small></h3>
      <button class="choice ${edit?.action==='defer'?'chosen':''}" id="defer" aria-pressed="${edit?.action==='defer'}"><span class="choice-icon">↗</span><span><strong>Take it later</strong></span><span class="radio-dot"></span></button>
      ${edit?.action==='defer'?`<div class="delay-field"><label for="delay">Move at least</label><select id="delay">${[1,2,3,4].map(n=>`<option value="${n}" ${edit.delay===n?'selected':''}>${n} semester${n===1?'':'s'} later</option>`).join('')}</select><small>No earlier than ${termLabel(baseline.placements[selectedId]+edit.delay)}.</small></div>`:''}
      <button class="choice ${edit?.action==='exclude'?'chosen':''}" id="exclude" aria-pressed="${edit?.action==='exclude'}"><span class="choice-icon">−</span><span><strong>Explore without it</strong></span><span class="radio-dot"></span></button>
      ${edit?`<button class="undo-course" data-remove-change="${selectedId}">Undo this course change</button>`:''}
      <p class="editor-note">${scenarioChanges(scenario).length} course changes in this plan. Other edits stay when you select a class.</p>
    </div><div class="editor-output"><div class="editor-tabs" role="group" aria-label="Editor view"><button data-editor-tab="result" aria-pressed="${editorTab==='result'}">Result</button><button data-editor-tab="connections" aria-pressed="${editorTab==='connections'}">Connections · ${deps.direct.length+deps.downstream.length}</button></div><div class="editor-view" aria-live="polite">${editorTab==='result'?resultPanel(baseline,result,!!scenario,'editor'):`<section class="connection-panel"><h3>Course connections</h3><h4>Directly unlocks</h4><div class="dependency-chips">${related(deps.direct)}</div><h4>Further down the path</h4><div class="dependency-chips">${related(deps.downstream)}</div><h4>This course needs</h4><p>${course.prerequisites.map(id=>courses.find(c=>c.id===id)?.title ?? (id==='calc1'?'Calculus I (completed)':'Programming I (completed)')).join(' · ') || 'No prerequisites in this sample'}</p></section>`}</div></div></div>
    <div class="editor-actions"><button class="done-button" data-save-plan ${!scenario?'disabled':''}>${navIcons[2]} Save plan locally</button><button id="done-editor" class="primary-button severity-action" style="--action-color:${actionColor};--action-ink:${severity>.6?'#fff':'#171300'}">${scenario?'Create roadmap':'Back to roadmap'} ${branch}</button></div>
  </div></dialog>`;
}
function render() {
  if (!showSample) {
    renderStudent(app, () => { showSample = true; view = 'plan'; render(); });
    return;
  }
  const baseline = plan(creditLimit);
  const result = scenario ? plan(creditLimit, scenario) : baseline;
  const active = timeline === 'baseline' ? baseline : result;
  const delta = result.terms.length - baseline.terms.length;
  const complete = result.finish !== null;
  const roadmapSize=matchMedia('(max-width:650px)').matches?1:matchMedia('(max-width:1200px)').matches?2:3;
  roadmapPage=Math.min(roadmapPage,Math.max(0,Math.ceil(active.terms.length/roadmapSize)-1));
  app.innerHTML = `
    <div class="sample-banner">Sample curriculum <span>·</span> Independent student prototype</div>
    <aside class="sidebar"><a href="#" class="brand" aria-label="DegreePath home"><span class="brand-mark">${branch}</span><span>DegreePath<small>KSU AI HACKATHON</small></span></a><div class="nav-category">ACADEMIC PLANNING</div><nav aria-label="Main navigation">${[['plan', 'My plan'], ['compare', 'Compare paths'], ['saved', 'Saved plans']].map(([id, label],i) => `<button data-view="${id}" class="nav-link ${view === id ? 'active' : ''}" ${view === id ? 'aria-current="page"' : ''}>${navIcons[i]}<span>${label}</span>${id === 'saved' && saved.length ? `<span class="count">${saved.length}</span>` : ''}</button>`).join('')}</nav><div class="sidebar-bottom"><span class="sidebar-label">YOUR DEGREE</span><strong>Computing B.S.</strong><span>60 of 120 credits completed</span><div class="sidebar-progress"><i></i></div><span class="sidebar-footnote">Fictional sample · No KSU connection</span></div></aside>
    <header class="topbar"><div class="program-context">${branch}<span>PROGRAM</span><strong>Computing B.S.</strong><span class="catalog-label">Sample catalog</span></div><div class="profile"><button id="student-progress-home" class="student-link">My progress</button><span class="theme-control"><span class="theme-end" aria-hidden="true">${sun}</span><button id="theme-toggle" class="theme-switch" role="switch" aria-label="Dark mode" aria-checked="${theme === 'dark'}"><span class="switch-thumb"></span></button><span class="theme-end" aria-hidden="true">${moon}</span></span></div></header>
    <main class="${view==='plan'?'plan-page':''}"><div class="page-heading"><div><div class="eyebrow">DEGREEPATH / ${view === 'compare' ? 'EXPLORE' : view === 'saved' ? 'YOUR OPTIONS' : 'OVERVIEW'}</div><h1>${view === 'compare' ? 'COMPARE PATHS' : view === 'saved' ? 'SAVED PLANS' : 'MY DEGREE PLAN'}</h1></div>${view === 'plan' ? `<div class="heading-actions"><a class="done-button" href="${agentHref()}" target="_blank" rel="noopener noreferrer">Compare options ${branch}</a><button id="new-scenario" class="primary-button">${branch} Explore a change</button></div>` : ''}</div>
      <div class="notice" role="status" aria-live="polite">${escape(notice)}</div>
      ${view === 'plan' ? `

      <section class="summary-grid" aria-label="Plan summary">
        <div class="summary-card"><span class="summary-label">COMPLETED CREDITS</span><strong>60 <span>/ 120</span></strong><div class="metric-progress"><i></i></div></div>
        <div class="summary-card"><span class="summary-label">COURSES REMAINING</span><strong>18</strong><small>60 credits to complete</small></div>
        <div class="summary-card"><span class="summary-label">${timeline === 'scenario' && scenario ? 'WHAT-IF FINISH' : 'BASELINE FINISH'}</span><strong class="finish-value">${active.finish ?? 'Incomplete'}</strong><small>${timeline === 'scenario' && scenario ? !complete ? 'Required courses blocked' : delta > 0 ? `+${delta} semester${delta === 1 ? '' : 's'} vs. baseline` : delta < 0 ? `${delta} semesters vs. baseline` : 'No change to finish' : `${baseline.terms.length} semesters · fall / spring`}</small></div>
        <div class="summary-card workload"><label class="summary-label" for="credits">SEMESTER PACE</label><select id="credits">${[12, 15, 18].map(n => `<option value="${n}" ${creditLimit === n ? 'selected' : ''}>${n} credits</option>`).join('')}</select><small>Maximum credits per term</small></div>
      </section>
      <div class="workspace"><section class="timeline-section" aria-labelledby="timeline-heading">
        <div class="roadmap-toolbar"><div><h2 id="timeline-heading">Semester roadmap</h2><span class="roadmap-subtitle">${active.finish?'':'Partial schedule · '}${active.terms.length} semester${active.terms.length===1?'':'s'} <span>·</span> ${timeline === 'baseline' ? 'Viewing original schedule' : scenario ? 'Viewing your changes' : 'Choose a course to start'}</span></div><div class="plan-controls" role="group" aria-label="Displayed plan"><button data-timeline="baseline" class="${timeline === 'baseline' ? 'active' : ''}" aria-pressed="${timeline === 'baseline'}">${check}<span>Baseline<small>Original schedule</small></span></button><button data-timeline="scenario" class="${timeline === 'scenario' ? 'active' : ''}" aria-pressed="${timeline === 'scenario'}">${branch}<span>What-if plan<small>${scenario ? 'View your changes' : 'Create your first change'}</small></span>${scenario ? '<i class="change-dot"></i>' : ''}</button></div></div>
        <div class="roadmap-tip"><span>Select a course to try a change</span><span class="roadmap-legend">Credits shown at right</span>${pager('roadmap',roadmapPage,Math.ceil(active.terms.length/roadmapSize),'semesters')}</div>
        ${scenario ? `<div class="scenario-strip"><span>${branch}<strong>${scenarioChanges(scenario).length} course change${scenarioChanges(scenario).length===1?'':'s'}</strong> in your plan</span><div class="scenario-actions"><button data-edit-current>Edit change</button><button data-compare-current>Compare result</button><button class="primary-button" data-save-plan>Save plan locally</button><button id="reset">Reset <span aria-hidden="true">↺</span></button></div></div>` : ''}
        <div id="roadmap-result" tabindex="-1" class="roadmap-result">${scenario && timeline === 'scenario' ? `<div class="roadmap-outcome"><div><strong>${result.finish ?? 'Incomplete · partial schedule'}</strong><span>${result.blocked.length ? `${result.blocked.length} requirements blocked · ${result.terms.length} schedulable semester${result.terms.length===1?'':'s'}` : `${delta>0?`+${delta} semesters`:'No finish delay'} · ${describeImpact(baseline,result).moved.length} placements changed`}</span></div><button popovertarget="full-roadmap-result">View result ${branch}</button></div><div id="full-roadmap-result" popover class="roadmap-popover"><button class="popover-close" popovertarget="full-roadmap-result" popovertargetaction="hide" aria-label="Close result">×</button>${resultPanel(baseline,result)}</div>` : ''}</div>
        <div class="terms">${active.terms.slice(roadmapPage*roadmapSize,(roadmapPage+1)*roadmapSize).map(t=>renderTerm(t,baseline,active)).join('')}</div>

        <div class="estimate-access"><button popovertarget="estimate-assumptions">What goes into this estimate?</button></div><div id="estimate-assumptions" popover class="blocked-popover"><button popovertarget="estimate-assumptions" popovertargetaction="hide" aria-label="Close estimate details">×</button><h3>Estimate assumptions</h3><p>This fictional sample starts Spring 2027 with 60 earned credits; only Calculus I and Programming I are individually modeled. The greedy planner assumes every remaining course is offered every fall and spring, with prerequisites completed in earlier terms. It does not guarantee the earliest possible finish. Summer, grades, corequisites, electives allocation, transfer rules, admission gates, and real availability are not modeled.</p></div>
      </section>
      </div>${courseEditor(baseline)}` : view === 'compare' ? comparison() : savedPage()}
      <footer><span>Sample curriculum · Not an official KSU degree audit</span><span>DegreePath</span></footer>
    </main>`;
  bind();
  app.querySelector('#student-progress-home')?.addEventListener('click', () => {
    editorOpen = false;
    showSample = false;
    render();
  });
  if (editorOpen && view === 'plan') app.querySelector<HTMLDialogElement>('#course-editor')?.showModal();
}
function comparison() {
  const baseline = plan(creditLimit);
  const result = scenario ? plan(creditLimit, scenario) : undefined;
  const moved = result ? courses.filter(c => result.placements[c.id] !== baseline.placements[c.id]) : [];
  const name = scenario ? scenarioChanges(scenario).length>1 ? `${scenarioChanges(scenario).length} course changes` : courses.find(c => c.id === scenario!.courseId)!.title : '';
  return `<section class="comparison"><div class="comparison-tabs" role="group" aria-label="Comparison type"><button data-comparison="scenario" aria-pressed="${comparisonView === 'scenario'}">${branch} My scenario</button><button data-comparison="degrees" aria-pressed="${comparisonView === 'degrees'}">${navIcons[1]} Degree previews <span class="sample-label">PREVIEW</span></button></div>${comparisonView === 'degrees' ? degreePreviews() : `<div class="comparison-note"><span class="sample-label">SAMPLE PLAN</span><span>Calculated from the same fictional curriculum and ${creditLimit}-credit limit.</span></div>${result && scenario ? `<div class="comparison-heading"><div><h2>${escape(name)}</h2><p>${scenarioChanges(scenario).length>1 ? 'Combined result of all course edits' : scenario.action === 'defer' ? `At least ${scenario.delay} semesters later` : 'Excluded from this plan'}</p></div><div class="scenario-actions"><button class="primary-button" data-save-plan>Save plan locally</button><button class="done-button" data-edit-current>Edit change ${arrow}</button><button class="done-button" data-view="plan">View roadmap ${arrow}</button></div></div><div class="comparison-table-wrap"><table class="result-table"><caption>Baseline versus what-if result</caption><thead><tr><th scope="col">Measure</th><th scope="col">Baseline</th><th scope="col">What-if plan</th></tr></thead><tbody><tr><th scope="row">Estimated finish</th><td>${baseline.finish}</td><td>${result.finish ?? 'Incomplete'}</td></tr><tr><th scope="row">Scheduled semesters</th><td>${baseline.terms.length}</td><td>${result.terms.length}${!result.finish ? ' · partial plan' : ''}</td></tr><tr><th scope="row">Scheduled credits</th><td>${baseline.terms.reduce((n,t)=>n+t.credits,0)}</td><td>${result.terms.reduce((n,t)=>n+t.credits,0)}</td></tr><tr><th scope="row">Blocked requirements</th><td>0</td><td>${result.blocked.length}</td></tr></tbody></table></div><h3 class="impact-list-title">${moved.length} course placements changed</h3><ul class="impact-list">${moved.map(c=>`<li><strong>${escape(c.title)}</strong><span>${termLabel(baseline.placements[c.id])} ${arrow} ${result.placements[c.id] === undefined ? 'Not scheduled · blocked' : termLabel(result.placements[c.id])}</span></li>`).join('') || '<li>No course placements changed.</li>'}</ul>` : `<div class="empty-state"><span class="empty-icon">${branch}</span><h2>Compare your first change</h2><p>Choose a course and try taking it later. See both results here.</p><button class="primary-button" data-start-change>Explore a change ${arrow}</button></div>`}`}</section>`;
}
function degreePreviews() {
  const icons = [
    '<path d="m8 7-5 5 5 5m8-10 5 5-5 5m-3-13-2 16"/>',
    '<rect x="3" y="3" width="7" height="7" rx="2"/><rect x="14" y="14" width="7" height="7" rx="2"/><path d="M14 6h4v4M6 14v4h4"/>',
    '<path d="m15 3 6 6-11 11-7 1 1-7Z M12 6l6 6M4 14l6 6"/>'
  ];
  return `<section class="comparison"><div class="comparison-note"><span class="sample-label">PREVIEW</span><span>Degree requirements aren't connected yet. Explore the concepts below.</span></div><div class="compare-grid">${[
    ['Computing B.S.', 'Current degree', 'Code. Build. Solve.', ['Programming', 'Algorithms', 'Systems']],
    ['Information Systems B.S.', 'Concept degree', 'Where business meets technology.', ['Business', 'Data', 'Technology']],
    ['Digital Design B.S.', 'Concept degree', 'Make technology more human.', ['Design', 'Interaction', 'Creative practice']],
  ].map(([title, tag, description, focus], i) => `<article class="compare-card compare-${i} ${selectedDegree === i ? 'selected-degree' : ''}"><div class="compare-art"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.2" aria-hidden="true">${icons[i]}</svg><span class="art-orbit"></span></div><span class="eyebrow">${tag}</span><h2>${title}</h2><p>${description}</p><div class="focus-tags">${(focus as string[]).map(f => `<span>${f}</span>`).join('')}</div><div class="degree-status"><span>Credit fit & finish</span><strong>Not evaluated</strong></div><button class="degree-preview-button" data-degree="${i}" aria-pressed="${selectedDegree === i}">${selectedDegree === i ? check : arrow} ${selectedDegree === i ? 'Preview selected' : 'View degree preview'}</button>${selectedDegree === i ? `<div class="degree-preview-detail"><strong>${title} · preview only</strong><p>Focus: ${(focus as string[]).join(', ')}. ${i === 0 ? 'This is the fictional curriculum used in My plan.' : 'Switching your actual plan to this program is not available yet.'}</p><p>Credit allocation, catalog rules, admission conditions and offerings must be verified before a degree-change timeline can be calculated.</p></div>` : ''}</article>`).join('')}</div></section>`;
}
function savedPage() {
  return `<section class="saved-page">${!storageAvailable ? '<p class="comparison-note">Browser storage is unavailable. Saved plans only last for this session.</p>' : ''}${saved.length ? `<div class="saved-grid">${saved.map(s => `<article class="saved-card"><div class="panel-kicker">${branch} SAVED PLAN</div><h2>${escape(s.name)}</h2><p>${s.scenario.creditLimit} credits per semester · ${escape(new Date(s.date).toLocaleDateString())}</p><div><button class="primary-button" data-restore="${escape(s.id)}">Open scenario ${arrow}</button><button class="text-button" data-delete="${escape(s.id)}">Delete</button></div></article>`).join('')}</div>` : `<div class="empty-state"><span class="empty-icon">${branch}</span><h2>No saved plans yet.</h2><p>Choose a course, try a change, then save your plan.</p><button class="primary-button" data-start-change>Explore a change ${arrow}</button></div>`}<p class="storage-note">${storageAvailable ? 'Stored on this device in this browser · survives refresh · not synced to teammates' : 'Session only · browser storage unavailable'}<br>${saved.length} / 10 saved plans</p></section>`;
}
function setScenario(action: 'defer' | 'exclude') {
  scenario = updateCourseChange(scenario, {courseId:selectedId, action, delay:scenarioChanges(scenario).find(c=>c.courseId===selectedId)?.delay ?? 2}, creditLimit);
  timeline = 'scenario'; editorTab='result'; editPage=Math.floor((scenarioChanges(scenario).length-1)/3); roadmapPage=0; notice = ''; render();
}
function bind() {
  app.querySelector<HTMLButtonElement>('#new-scenario')?.addEventListener('click', () => { editorOpen = true; render(); });
  const themeButton = app.querySelector<HTMLButtonElement>('#theme-toggle');
  if (themeButton) themeButton.onclick = () => { theme = theme === 'dark' ? 'light' : 'dark'; document.documentElement.dataset.theme = theme; try { localStorage.setItem('degreepath.theme', theme); } catch {} render(); app.querySelector<HTMLElement>('#theme-toggle')?.focus(); };
  const closeEditor = () => { editorOpen = false; render(); app.querySelector<HTMLElement>(`[data-course="${selectedId}"]`)?.focus({preventScroll:true}); };
  const showRoadmap = () => { if (scenario) timeline = 'scenario'; editorOpen = false; render(); const target = app.querySelector<HTMLElement>(scenario ? '#roadmap-result' : '#timeline-heading'); target?.focus({preventScroll:true}); target?.scrollIntoView({block:'start', behavior:'instant'}); };
  const dialog = app.querySelector<HTMLDialogElement>('#course-editor');
  if (dialog) { dialog.oncancel = e => { e.preventDefault(); closeEditor(); }; dialog.onclick = e => { if (e.target === dialog) { const r = dialog.getBoundingClientRect(); if (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom) closeEditor(); } }; }
  app.querySelector<HTMLButtonElement>('#close-editor')?.addEventListener('click', closeEditor);
  app.querySelector<HTMLButtonElement>('#done-editor')?.addEventListener('click', showRoadmap);
  app.querySelector('.brand')?.addEventListener('click', e => { e.preventDefault(); view = 'plan'; render(); });
  app.querySelectorAll<HTMLButtonElement>('[data-view]').forEach(b => b.onclick = () => { if (view === 'compare' && b.dataset.view === 'plan' && scenario) timeline = 'scenario'; view = b.dataset.view as typeof view; editorOpen = false; notice = ''; render(); });
  app.querySelectorAll<HTMLButtonElement>('[data-start-change]').forEach(b => b.onclick = () => { view = 'plan'; editorOpen = true; notice = ''; render(); });
  app.querySelectorAll<HTMLButtonElement>('[data-edit-current]').forEach(b => b.onclick = () => { if (scenario) selectedId = scenario.courseId; view = 'plan'; editorOpen = true; notice = ''; render(); });
  app.querySelectorAll<HTMLButtonElement>('[data-compare-current]').forEach(b => b.onclick = () => { view = 'compare'; comparisonView = 'scenario'; editorOpen = false; notice = ''; render(); });
  app.querySelectorAll<HTMLButtonElement>('[data-degree-previews]').forEach(b => b.onclick = () => { view = 'compare'; comparisonView = 'degrees'; editorOpen = false; render(); });
  app.querySelectorAll<HTMLButtonElement>('[data-comparison]').forEach(b => b.onclick = () => { comparisonView = b.dataset.comparison as typeof comparisonView; render(); app.querySelector<HTMLElement>(`[data-comparison="${comparisonView}"]`)?.focus(); });
  app.querySelectorAll<HTMLButtonElement>('[data-degree]').forEach(b => b.onclick = () => { selectedDegree = Number(b.dataset.degree); render(); app.querySelector<HTMLElement>(`[data-degree="${selectedDegree}"]`)?.focus(); });
  app.querySelectorAll<HTMLButtonElement>('[data-course]').forEach(b => b.onclick = () => { selectedId = b.dataset.course!; courseTerm = String(plan(creditLimit).placements[selectedId]); coursePage=0; editorOpen = true; notice = ''; render(); });
  app.querySelectorAll<HTMLButtonElement>('[data-pick-course]').forEach(b=>b.onclick=()=>{selectedId=b.dataset.pickCourse!;render();app.querySelector<HTMLElement>(`[data-pick-course="${selectedId}"]`)?.focus({preventScroll:true});});
  app.querySelectorAll<HTMLButtonElement>('[data-term]').forEach(b=>b.onclick=()=>{courseTerm=b.dataset.term!;coursePage=0;const group=plan(creditLimit).terms.find(t=>String(t.index)===courseTerm);if(group&&!group.courses.some(c=>c.id===selectedId))selectedId=group.courses[0].id;render();app.querySelector<HTMLElement>(`[data-term="${courseTerm}"]`)?.focus({preventScroll:true});});
  app.querySelectorAll<HTMLButtonElement>('[data-remove-change]').forEach(b=>b.onclick=()=>{if(scenario)scenario=removeCourseChange(scenario,b.dataset.removeChange!);if(!scenario)timeline='baseline';render();});
  app.querySelectorAll<HTMLButtonElement>('[data-timeline]').forEach(b => b.onclick = () => { if (b.dataset.timeline === 'scenario' && !scenario) { editorOpen = true; } else { timeline = b.dataset.timeline as typeof timeline; } render(); });
  app.querySelectorAll<HTMLButtonElement>('[data-editor-tab]').forEach(b=>b.onclick=()=>{editorTab=b.dataset.editorTab as typeof editorTab;render();});
  app.querySelectorAll<HTMLButtonElement>('[data-page-kind]').forEach(b=>b.onclick=()=>{const page=Number(b.dataset.page);if(b.dataset.pageKind==='courses'){coursePage=page;const items=plan(creditLimit).terms.filter(t=>courseTerm==='all'||String(t.index)===courseTerm).flatMap(t=>t.courses);selectedId=items[page*4].id;}else if(b.dataset.pageKind==='edits')editPage=page;else if(b.dataset.pageKind?.startsWith('term-'))termCoursePages[Number(b.dataset.pageKind.slice(5))]=page;else roadmapPage=page;render();});
  const credits = app.querySelector<HTMLSelectElement>('#credits');
  if (credits) credits.onchange = () => { creditLimit = Number(credits.value); if (scenario) scenario.creditLimit = creditLimit; render(); app.querySelector<HTMLElement>('#credits')?.focus(); };
  const defer = app.querySelector<HTMLButtonElement>('#defer'); if (defer) defer.onclick = () => { setScenario('defer'); app.querySelector<HTMLElement>('#delay')?.focus(); };
  const exclude = app.querySelector<HTMLButtonElement>('#exclude'); if (exclude) exclude.onclick = () => { setScenario('exclude'); app.querySelector<HTMLElement>('#exclude')?.focus(); };
  const delay = app.querySelector<HTMLSelectElement>('#delay'); if (delay) delay.onchange = () => { scenario=updateCourseChange(scenario,{courseId:selectedId,action:'defer',delay:Number(delay.value)},creditLimit);render();app.querySelector<HTMLElement>('#delay')?.focus(); };
  const reset = app.querySelector<HTMLButtonElement>('#reset'); if (reset) reset.onclick = () => { scenario = undefined; timeline = 'baseline'; notice = 'Original plan restored. Your saved plans are unchanged.'; render(); };
  app.querySelectorAll<HTMLButtonElement>('[data-save-plan]').forEach(save => save.onclick = () => {
    if (!scenario) return;
    const c = courses.find(c => c.id === scenario!.courseId)!;
    const name = scenarioChanges(scenario).length>1 ? `${scenarioChanges(scenario).length} course changes · ${creditLimit} credits` : scenario.action === 'defer' ? `${c.title} · ${scenario.delay} semesters later` : `Explore without ${c.title}`;
    const others = saved.filter(s => scenarioKey(s.scenario) !== scenarioKey(scenario!));
    if (others.length >= 10) { notice = 'You have 10 saved plans. Delete one in Saved plans before saving another.'; editorOpen = false; render(); return; }
    saved = [{ id: crypto.randomUUID(), name, date: new Date().toISOString(), scenario: structuredClone(scenario) }, ...others];
    if (persist()) notice = 'Plan saved locally in this browser. Open Saved plans to return to it.';
    editorOpen = false; render();
  });
  app.querySelectorAll<HTMLButtonElement>('[data-restore]').forEach(b => b.onclick = () => {
    const s = saved.find(s => s.id === b.dataset.restore)!;
    scenario = structuredClone(s.scenario); creditLimit = scenario.creditLimit; selectedId = scenario.courseId; courseTerm=String(plan(creditLimit).placements[selectedId]);
    view = 'plan'; editorOpen = false; timeline = 'scenario'; notice = 'Option restored.'; render();
  });
  app.querySelectorAll<HTMLButtonElement>('[data-delete]').forEach(b => b.onclick = () => { saved = saved.filter(s => s.id !== b.dataset.delete); persist(); render(); });
}
render();

let resizeTimer: ReturnType<typeof setTimeout>;
window.addEventListener('resize',()=>{clearTimeout(resizeTimer);resizeTimer=setTimeout(()=>{if(showSample)render();},120);});
