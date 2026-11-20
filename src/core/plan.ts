import type { CourseInfo, Pathway, Plan, PlanEdits, PlannedCourse, PlannedTerm, PlanSettings, Prereq, RuleNeed } from './types.ts';
import { compareTerms, nextTerm, parseTerm } from './terms.ts';
import { openCourseNeeds } from './audit.ts';
import { prereqCodes } from './catalog.ts';

export type Catalog = Record<string, CourseInfo | undefined>;

export const emptyEdits = (): PlanEdits => ({ drop: [], defer: {}, add: [], choose: {} });
export const defaultSettings = (): PlanSettings => ({ maxCredits: 15, summer: false });

const MAX_TERMS = 24;

interface Need { code: string; title: string; credits: number; ruleLabel?: string; dropped?: boolean }

// Picks courses for each unfinished rule. Student choices win; otherwise the first
// eligible options that are actually offered, until the rule's credits are covered.
export function pickForRules(p: Pathway, edits: PlanEdits, catalog: Catalog, taken: Set<string>): { picks: Need[]; unresolved: RuleNeed[] } {
  const picks: Need[] = [];
  const unresolved: RuleNeed[] = p.open.filter(rule => rule.reviewReason);
  if (p.percent < 100 && (!p.auditReviewVersion || !p.open.length)) {
    unresolved.push({
      id: 'audit-review', label: 'Degree audit', block: '', percent: p.percent,
      credits: null, classes: null, options: [], satisfiedBy: [],
      reviewReason: p.auditReviewVersion
        ? 'The audit reports incomplete progress without a requirement the planner can schedule.'
        : 'Refresh DegreeWorks to check the requirements in this older saved audit.',
    });
  }
  for (const rule of openCourseNeeds(p).filter(rule => !rule.reviewReason)) {
    const chosen = edits.choose[rule.id];
    const pool = (chosen?.length ? chosen : rule.options).filter(c => !taken.has(c) && !picks.some(x => x.code === c));
    const ranked = chosen?.length ? pool : [...pool].sort((a, b) => offeredScore(catalog[b]) - offeredScore(catalog[a]));
    let credits = rule.credits ?? 0;
    let classes = rule.classes ?? 0;
    const got: Need[] = [];
    for (const code of ranked) {
      if (credits <= 0 && classes <= 0) break;
      const info = catalog[code];
      const cr = info?.credits ?? 3;
      got.push({ code, title: info?.title ?? code, credits: cr, ruleLabel: rule.label });
      credits -= cr;
      classes -= 1;
    }
    if (!got.length || credits > 0 || classes > 0) unresolved.push(rule);
    picks.push(...got);
  }
  return { picks, unresolved };
}

const offeredScore = (info?: CourseInfo) => (info ? (info.offered.length ? 2 : 1) : 0);

type Status = 'done' | 'same' | 'pending' | 'external';

function check(p: Prereq, status: (c: string) => Status, notes: Set<string>): boolean {
  switch (p.kind) {
    case 'none': return true;
    case 'course': {
      const s = status(p.code);
      if (s === 'done') return true;
      if (s === 'same') return p.concurrent;
      if (s === 'pending') return false;
      notes.add(p.code);
      return true; // not in this student's record or plan: can't verify, never block
    }
    case 'and': return p.items.every(x => check(x, status, notes));
    case 'or': {
      const scratch = new Set<string>();
      const ok = p.items.some(x => { scratch.clear(); return check(x, status, scratch) && scratch.size === 0; });
      if (ok) return true;
      return p.items.some(x => check(x, status, notes));
    }
  }
}

function offeredIn(info: CourseInfo | undefined, term: string): 'yes' | 'no' | 'unknown' {
  if (!info || !info.offered.length) return 'unknown';
  if (info.offered.includes(term)) return 'yes';
  const latest = [...info.offered].sort(compareTerms).at(-1)!;
  if (compareTerms(term, latest) <= 0) return 'no';
  // Past the published schedule: assume the same seasons repeat.
  const season = parseTerm(term)?.season;
  return info.offered.some(t => parseTerm(t)?.season === season) ? 'unknown' : 'no';
}

export function buildPlan(p: Pathway, catalog: Catalog, edits: PlanEdits, settings: PlanSettings): Plan {
  const done = new Set(p.completed.map(c => c.code));
  const current = p.inProgress.filter(c => !edits.drop.includes(c.code));
  const taken = new Set([...done, ...p.inProgress.map(c => c.code)]);
  const ruleFor = (code: string) => p.open.find(r => r.satisfiedBy.includes(code) || r.options.includes(code))?.label;

  const { picks, unresolved } = pickForRules(p, edits, catalog, taken);
  const needs: Need[] = [];
  const push = (n: Need) => { if (!needs.some(x => x.code === n.code) && !done.has(n.code)) needs.push(n); };
  for (const c of p.inProgress.filter(c => edits.drop.includes(c.code))) {
    push({ code: c.code, title: c.title, credits: c.credits, ruleLabel: ruleFor(c.code), dropped: true });
  }
  picks.forEach(push);
  for (const code of edits.add) {
    if (current.some(c => c.code === code)) continue;
    const info = catalog[code];
    push({ code, title: info?.title ?? code, credits: info?.credits ?? 3, ruleLabel: 'Added by you' });
  }

  const terms: PlannedTerm[] = [];
  const total = p.credits.applied + p.credits.inProgress - p.inProgress.filter(c => edits.drop.includes(c.code)).reduce((s, c) => s + c.credits, 0)
    + needs.reduce((s, n) => s + n.credits, 0);
  let earned = p.credits.applied;
  const pct = (n: number) => (total > 0 ? Math.min(100, Math.round((n / total) * 100)) : 100);

  if (current.length) {
    earned += current.reduce((s, c) => s + c.credits, 0);
    terms.push({
      label: p.activeTerm || 'Current term',
      credits: current.reduce((s, c) => s + c.credits, 0),
      percentAfter: pct(earned),
      courses: current.map(c => ({ ...c, status: 'in-progress', risk: 'good', notes: [], ruleLabel: ruleFor(c.code) })),
    });
  }

  const before = new Set([...done, ...current.map(c => c.code)]);
  const pending = new Set(needs.map(n => n.code));
  let term = p.activeTerm || 'Fall 2026';
  let idle = 0;
  for (let t = 0; t < MAX_TERMS && pending.size && idle < 6; t++) {
    term = nextTerm(term, settings.summer);
    const isSummer = parseTerm(term)?.season === 'Summer';
    const cap = isSummer ? Math.min(settings.maxCredits, 9) : settings.maxCredits;
    const placed: PlannedCourse[] = [];
    const same = new Set<string>();
    let credits = 0;
    let progress = true;
    while (progress) {
      progress = false;
      for (const n of needs) {
        if (!pending.has(n.code) || same.has(n.code)) continue;
        if (credits + n.credits > cap) continue;
        const floor = edits.defer[n.code];
        if (floor && compareTerms(term, floor) < 0) continue;
        const info = catalog[n.code];
        const offer = offeredIn(info, term);
        if (offer === 'no') continue;
        if (offer === 'unknown' && isSummer) continue;
        const notes = new Set<string>();
        const status = (c: string): Status => before.has(c) ? 'done' : same.has(c) ? 'same' : pending.has(c) ? 'pending' : 'external';
        if (info && !check(info.prereq, status, notes)) continue;
        const why: string[] = [];
        let risk: PlannedCourse['risk'] = 'good';
        if (n.dropped) { risk = 'moved'; why.push(`Retake after dropping in ${p.activeTerm}`); }
        if (floor) { risk = 'moved'; why.push(`You chose ${floor} or later`); }
        if (!info) { risk = risk === 'good' ? 'watch' : risk; why.push('Offerings not checked yet'); }
        else if (offer === 'unknown') { risk = risk === 'good' ? 'watch' : risk; why.push(info.offered.length ? 'Beyond the published schedule' : 'Not on the published schedule yet'); }
        else if ((info.seats[term] ?? 99) <= 3) { risk = risk === 'good' ? 'watch' : risk; why.push(`Only ${info.seats[term]} open seats now`); }
        if (notes.size) why.push(`Confirm prerequisite: ${[...notes].join(', ')}`);
        placed.push({ code: n.code, title: n.title, credits: n.credits, status: 'planned', risk, notes: why, ruleLabel: n.ruleLabel });
        same.add(n.code);
        credits += n.credits;
        progress = true;
      }
    }
    for (const c of placed) { pending.delete(c.code); before.add(c.code); }
    earned += credits;
    if (placed.length) { idle = 0; terms.push({ label: term, credits, courses: placed, percentAfter: pct(earned) }); }
    else if (![...pending].some(c => edits.defer[c] && compareTerms(edits.defer[c], term) > 0)) idle += 1;
  }

  const stuck = new Set(needs.filter(n => pending.has(n.code)).map(n => n.code));
  const blocked = needs.filter(n => stuck.has(n.code)).map(n => ({ code: n.code, title: n.title, reason: blockReason(n.code, catalog[n.code], edits, settings, stuck) }));
  const remainingCredits = needs.reduce((s, n) => s + n.credits, 0);
  const finish = blocked.length || unresolved.length ? null : terms.at(-1)?.label ?? p.activeTerm ?? null;
  return { terms, finish, blocked, remainingCredits, unresolved };
}

function blockReason(code: string, info: CourseInfo | undefined, edits: PlanEdits, settings: PlanSettings, stuck: Set<string>): string {
  if (!info) return 'Could not look this course up';
  if (!info.offered.length) return 'Not on any published KSU schedule yet';
  const seasons = new Set(info.offered.map(t => parseTerm(t)?.season));
  if (!settings.summer && [...seasons].every(x => x === 'Summer')) return 'Only offered in summer. Turn on Summer to place it';
  const waits = prereqCodes(info.prereq).filter(c => stuck.has(c) && c !== code);
  if (waits.length) return `Waits on ${waits.join(', ')}, which can't be placed`;
  return 'Offerings and prerequisites never line up';
}

export interface Move { code: string; title: string; from: string | null; to: string | null; wasBlocked: boolean; isBlocked: boolean }

export function diffPlans(base: Plan, next: Plan): Move[] {
  const where = (plan: Plan) => {
    const m = new Map<string, { term: string; title: string }>();
    for (const t of plan.terms) for (const c of t.courses) m.set(c.code, { term: t.label, title: c.title });
    for (const b of plan.blocked) m.set(b.code, { term: '', title: b.title });
    return m;
  };
  const a = where(base);
  const b = where(next);
  const codes = new Set([...a.keys(), ...b.keys()]);
  const moves: Move[] = [];
  for (const code of codes) {
    const from = a.get(code)?.term || null;
    const to = b.get(code)?.term || null;
    const wasBlocked = a.get(code)?.term === '';
    const isBlocked = b.get(code)?.term === '';
    if (from !== to || wasBlocked !== isBlocked) {
      moves.push({ code, title: b.get(code)?.title ?? a.get(code)?.title ?? code, from, to, wasBlocked, isBlocked });
    }
  }
  return moves;
}

// Every course the planner might need offering data for.
export function codesToLookUp(p: Pathway, edits: PlanEdits): string[] {
  const codes = new Set<string>();
  p.inProgress.forEach(c => codes.add(c.code));
  openCourseNeeds(p).forEach(r => r.options.slice(0, 12).forEach(c => codes.add(c)));
  edits.add.forEach(c => codes.add(c));
  Object.values(edits.choose).flat().forEach(c => codes.add(c));
  return [...codes];
}
