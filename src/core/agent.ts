import { buildPlan, type Catalog } from './plan.ts';
import type { Pathway, Plan, PlanEdits, PlanSettings } from './types.ts';
import { prereqText } from './catalog.ts';

export type AgentAction =
  | { type: 'drop'; code: string }
  | { type: 'defer'; code: string; term: string }
  | { type: 'add'; code: string }
  | { type: 'restore'; code: string }
  | { type: 'maxCredits'; value: number }
  | { type: 'summer'; value: boolean };

export interface AgentReply { reply: string; actions: AgentAction[] }

export const AGENT_SYSTEM_PROMPT = `You are DegreePath, a planning assistant for Kennesaw State University students.
You help one student explore their path to graduation: what is left, what happens if they drop, delay or add a course, and how to balance their semesters.

Ground rules:
- STUDENT CONTEXT is the only truth. Use only courses, terms, requirements, prerequisites and offerings listed there. Never invent a course, rule, prerequisite, offering or date.
- If the context does not answer something, say so in one sentence and point to their advisor or DegreeWorks.
- You never see grades or personal identifiers. Do not ask for them.
- You do not register, drop or change anything in KSU systems. You propose plan changes; the DegreePath scheduler checks every proposal before the student sees the result.
- Withdrawal deadlines, refunds, financial aid, scholarships, visa status and athletics eligibility can be affected by dropping or reducing credits. When a request touches these, tell the student to confirm with their advisor or the Registrar first.

How to answer:
- Reply in at most 4 short sentences, plain and friendly, no lists unless asked. Lead with the answer.
- When the student wants to try a change, put it in "actions" and state its effect exactly as written in VERIFIED WHAT-IFS. Never compute a finish date yourself.
- If the student's message ends with a [PLANNER RESULT], that result is correct. Restate it in plain words and do not contradict it. The app will show the verified result next to your reply.
- Mention risks you can see in the context: a course not on the published schedule, few open seats, a same-term co-requisite, or a blocked requirement.
- If nothing should change, return an empty "actions" list.

Actions you may propose (codes exactly as written in the context, like "IT 4983"; terms like "Spring 2027"):
- {"type":"drop","code":X}  withdraw from an in-progress course and retake it later
- {"type":"defer","code":X,"term":T}  take X no earlier than term T
- {"type":"add","code":X}  add a course listed in the context
- {"type":"restore","code":X}  undo every change made to X
- {"type":"maxCredits","value":N}  credits per term, 6 to 21
- {"type":"summer","value":true|false}  allow summer terms

Always answer with JSON: {"reply": string, "actions": [...]}`;

export const AGENT_ACTIONS_SCHEMA = {
  type: 'object',
  properties: {
    reply: { type: 'string' },
    actions: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          type: { type: 'string', enum: ['drop', 'defer', 'add', 'restore', 'maxCredits', 'summer'] },
          code: { type: 'string' },
          term: { type: 'string' },
          value: { type: ['number', 'boolean'] },
        },
        required: ['type'],
      },
    },
  },
  required: ['reply', 'actions'],
};

const CODE = /^[A-Z]{2,5} \d{4}[A-Z]?$/;
const TERM = /^(Spring|Summer|Fall) \d{4}$/;
const normCode = (v: unknown) => (typeof v === 'string' ? v.trim().toUpperCase().replace(/^([A-Z]{2,5})\s*(\d{4}[A-Z]?)$/, '$1 $2') : '');

// Pulls the readable part of "reply" out of a JSON answer that is still streaming in.
export function partialReply(raw: string): string {
  const m = /"reply"\s*:\s*"/.exec(raw);
  if (!m) return '';
  let out = '';
  for (let i = m.index + m[0].length; i < raw.length; i++) {
    const ch = raw[i];
    if (ch === '"') break;
    if (ch === '\\') {
      const nx = raw[i + 1];
      if (nx === undefined) break;
      out += nx === 'n' ? '\n' : nx === 't' ? ' ' : nx === 'u' ? '' : nx;
      if (nx === 'u') i += 4;
      i += 1;
      continue;
    }
    out += ch;
  }
  return out;
}

// True when the model returned a fragment instead of an answer (a known failure on some GPU backends).
export function looksBroken(raw: string): boolean {
  const t = raw.trim();
  if (t.length < 8) return true;
  if (t.startsWith('{')) { try { const d = JSON.parse(t); return typeof d?.reply !== 'string' || d.reply.trim().length < 2; } catch { return true; } }
  return false;
}

export function validateAgentReply(raw: string): AgentReply {
  let data: Record<string, unknown> = {};
  try { data = JSON.parse(raw); } catch { return { reply: raw.trim().slice(0, 1200) || 'I could not form an answer. Try asking another way.', actions: [] }; }
  const reply = typeof data.reply === 'string' ? data.reply.trim().slice(0, 1200) : '';
  const actions: AgentAction[] = [];
  for (const a of Array.isArray(data.actions) ? data.actions.slice(0, 6) : []) {
    const r = (a ?? {}) as Record<string, unknown>;
    const code = normCode(r.code);
    if ((r.type === 'drop' || r.type === 'add' || r.type === 'restore') && CODE.test(code)) actions.push({ type: r.type, code });
    else if (r.type === 'defer' && CODE.test(code) && typeof r.term === 'string' && TERM.test(r.term.trim())) actions.push({ type: 'defer', code, term: r.term.trim() });
    else if (r.type === 'maxCredits' && typeof r.value === 'number' && r.value >= 6 && r.value <= 21) actions.push({ type: 'maxCredits', value: Math.round(r.value) });
    else if (r.type === 'summer' && typeof r.value === 'boolean') actions.push({ type: 'summer', value: r.value });
  }
  return { reply: reply || 'Here is what I would try.', actions };
}

// Applies one agent action to the student's edits and settings. Unknown courses are ignored.
export function applyAction(a: AgentAction, edits: PlanEdits, settings: PlanSettings, known: Set<string>, inProgress: Set<string>):
  { edits: PlanEdits; settings: PlanSettings } | null {
  const e: PlanEdits = { drop: [...edits.drop], defer: { ...edits.defer }, add: [...edits.add], choose: { ...edits.choose } };
  switch (a.type) {
    case 'drop':
      if (!inProgress.has(a.code)) return null;
      if (!e.drop.includes(a.code)) e.drop.push(a.code);
      return { edits: e, settings };
    case 'defer':
      if (!known.has(a.code)) return null;
      e.defer[a.code] = a.term;
      if (inProgress.has(a.code) && !e.drop.includes(a.code)) e.drop.push(a.code);
      return { edits: e, settings };
    case 'add':
      if (!known.has(a.code) || e.add.includes(a.code)) return null;
      e.add.push(a.code);
      return { edits: e, settings };
    case 'restore':
      e.drop = e.drop.filter(c => c !== a.code);
      e.add = e.add.filter(c => c !== a.code);
      delete e.defer[a.code];
      return { edits: e, settings };
    case 'maxCredits': return { edits: e, settings: { ...settings, maxCredits: a.value } };
    case 'summer': return { edits: e, settings: { ...settings, summer: a.value } };
  }
}

export function describeAction(a: AgentAction): string {
  switch (a.type) {
    case 'drop': return `Drop ${a.code}`;
    case 'defer': return `Move ${a.code} to ${a.term}+`;
    case 'add': return `Add ${a.code}`;
    case 'restore': return `Restore ${a.code}`;
    case 'maxCredits': return `${a.value} credits per term`;
    case 'summer': return a.value ? 'Allow summer' : 'No summer';
  }
}

// Compact, grade-free context the model sees on every turn.
export function buildContext(p: Pathway, plan: Plan, edits: PlanEdits, settings: PlanSettings, catalog: Catalog, baselineFinish: string | null, upcoming: { code: string; title: string; type: string; due: string }[] = []): string {
  const lines: string[] = [];
  lines.push(`Program: ${p.program}${p.concentration ? `, concentration ${p.concentration}` : ''}. Catalog ${p.catalog}. ${p.level}.`);
  lines.push(`Current term: ${p.activeTerm}. DegreeWorks says ${p.percent}% complete. Credits applied ${p.credits.applied}, in progress ${p.credits.inProgress}.`);
  lines.push(`In progress now: ${p.inProgress.map(c => `${c.code} ${c.title} (${c.credits})`).join('; ') || 'none'}.`);
  const open = p.open.filter(r => (r.credits ?? 0) > 0 || (r.classes ?? 0) > 0);
  lines.push(`Unfinished requirements: ${open.length ? open.map(r => `${r.label} needs ${r.credits ?? r.classes} ${r.credits ? 'credits' : 'classes'} from ${r.options.slice(0, 10).join(', ') || 'any course'}`).join(' | ') : 'none beyond courses in progress'}.`);
  const planned = plan.terms.flatMap(t => t.courses.filter(c => c.status === 'planned').map(c => `${c.code} in ${t.label}`));
  const finishing = plan.terms.flatMap(t => t.courses.filter(c => c.status === 'in-progress').map(c => c.code));
  lines.push(`WHAT IS LEFT TO GRADUATE: ${[
    finishing.length ? `pass ${finishing.join(', ')} this term` : '',
    planned.length ? `take ${planned.join(', ')}` : '',
    plan.blocked.length ? `still needed but cannot be scheduled with current changes: ${plan.blocked.map(b => `${b.code} (${b.reason})`).join(', ')}` : '',
  ].filter(Boolean).join('; ') || 'nothing; every requirement is complete'}. DegreeWorks lists no other open requirements${open.length ? ' beyond the unfinished ones above' : ''}.`);
  lines.push(`Settings: max ${settings.maxCredits} credit hours per term, summer ${settings.summer ? 'allowed' : 'off'}.`);
  const edited = [...edits.drop.map(c => `dropped ${c}`), ...Object.entries(edits.defer).map(([c, t]) => `${c} no earlier than ${t}`), ...edits.add.map(c => `added ${c}`)];
  lines.push(`Student changes so far: ${edited.join(', ') || 'none'}.`);
  lines.push(`Original finish: ${baselineFinish ?? 'not reachable'}. Finish with current changes: ${plan.finish ?? 'not reachable'}.`);
  lines.push('CURRENT PLAN:');
  for (const t of plan.terms) lines.push(`- ${t.label} (${t.credits} cr): ${t.courses.map(c => `${c.code}${c.status === 'in-progress' ? ' [in progress]' : ''}${c.notes.length ? ` [${c.notes.join('; ')}]` : ''}`).join(', ')}`);
  for (const b of plan.blocked) lines.push(`- BLOCKED ${b.code}: ${b.reason}`);
  lines.push('VERIFIED WHAT-IFS (computed by the DegreePath planner; use these numbers, never guess):');
  lines.push(...whatIfFacts(p, catalog, edits, settings));
  if (upcoming.length) {
    lines.push('UPCOMING ON D2L (titles and due dates only):');
    for (const u of upcoming.slice(0, 20)) lines.push(`- ${u.code} ${u.type}: ${u.title}, due ${u.due.slice(0, 10)}`);
  }
  lines.push('COURSE FACTS:');
  for (const info of Object.values(catalog)) {
    if (!info) continue;
    const seats = Object.entries(info.seats).map(([t, n]) => `${t} ${n} seats`).join(', ');
    lines.push(`- ${info.code} ${info.title}, ${info.credits} cr. Offered: ${info.offered.join(', ') || 'not on published schedule'}${seats ? ` (${seats})` : ''}. Prereqs: ${prereqText(info.prereq) || 'none'}.`);
  }
  return lines.join('\n').slice(0, 38_000);
}

// Pre-computes the outcomes students ask about most, so the model reads answers instead of guessing.
export function whatIfFacts(p: Pathway, catalog: Catalog, edits: PlanEdits, settings: PlanSettings): string[] {
  const out: string[] = [];
  const describe = (e: PlanEdits, st: PlanSettings) => {
    const r = buildPlan(p, catalog, e, st);
    return r.finish ? `finish ${r.finish}` : `graduation not reachable (${r.blocked.map(b => `${b.code}: ${b.reason}`).join('; ') || 'a requirement has no course picked'})`;
  };
  const current = p.inProgress.filter(c => !edits.drop.includes(c.code));
  for (const c of current) {
    const e = { ...edits, drop: [...edits.drop, c.code] };
    let line = `- Drop ${c.code} ${c.title}: ${describe(e, settings)}`;
    if (!settings.summer) {
      const withSummer = describe(e, { ...settings, summer: true });
      if (withSummer !== describe(e, settings)) line += `; with summer allowed: ${withSummer}`;
    }
    out.push(line);
  }
  const planned = buildPlan(p, catalog, edits, settings).terms.flatMap(t => t.courses.filter(c => c.status === 'planned').map(c => ({ c, term: t.label })));
  for (const { c, term } of planned.slice(0, 8)) {
    const later = nextAfter(term, settings.summer);
    out.push(`- Move ${c.code} to ${later} or later: ${describe({ ...edits, defer: { ...edits.defer, [c.code]: later } }, settings)}`);
  }
  for (const n of [12, 18]) if (n !== settings.maxCredits) out.push(`- ${n} credit hours per term instead of ${settings.maxCredits}: ${describe(edits, { ...settings, maxCredits: n })}`);
  if (!settings.summer) out.push(`- Allow summer terms: ${describe(edits, { ...settings, summer: true })}`);
  return out.length ? out : ['- No alternatives to compute.'];
}

function nextAfter(term: string, summer: boolean): string {
  const m = /^(Spring|Summer|Fall) (\d{4})$/.exec(term);
  if (!m) return term;
  const y = Number(m[2]);
  if (m[1] === 'Fall') return `Spring ${y + 1}`;
  if (m[1] === 'Spring') return summer ? `Summer ${y}` : `Fall ${y}`;
  return `Fall ${y}`;
}

// Finds the change a question is about and computes its real outcome with the planner,
// so the model phrases a verified answer instead of inventing dates.
export function groundQuestion(question: string, p: Pathway, catalog: Catalog, edits: PlanEdits, settings: PlanSettings): string | null {
  const q = question.toLowerCase();
  const compact = q.replace(/\s+/g, '');
  const plan = buildPlan(p, catalog, edits, settings);
  const placed = new Map(plan.terms.flatMap(t => t.courses.map(c => [c.code, { title: c.title, term: t.label, now: c.status === 'in-progress' }] as const)));
  const titles = new Map<string, string>([...p.inProgress.map(c => [c.code, c.title] as const), ...[...placed].map(([c, v]) => [c, v.title] as const)]);
  const mentioned = [...titles].filter(([code, title]) =>
    compact.includes(code.toLowerCase().replace(' ', '')) || (title.length >= 6 && q.includes(title.toLowerCase())) ||
    titleHit(title, q));
  const outcome = (e: PlanEdits, st: PlanSettings) => {
    const r = buildPlan(p, catalog, e, st);
    return r.finish ? `graduation moves to ${r.finish}` : `graduation is not reachable (${r.blocked.map(b => `${b.code}: ${b.reason}`).join('; ')})`;
  };
  const facts: string[] = [];
  const now = plan.finish ? `Current finish is ${plan.finish}.` : 'Graduation is currently not reachable.';
  const wantsDrop = /\b(drop|withdraw|remove|quit|skip|fail)\b/.test(q);
  const wantsLater = /\b(later|delay|postpone|push|defer|move|wait|next (semester|term|year))\b/.test(q);
  for (const [code, title] of mentioned.slice(0, 2)) {
    const where = placed.get(code);
    if (wantsDrop || (!wantsLater && where?.now)) {
      if (p.inProgress.some(c => c.code === code)) {
        const e = { ...edits, drop: [...new Set([...edits.drop, code])] };
        let f = `If the student drops ${code} ${title}, ${outcome(e, settings)}.`;
        if (!settings.summer) { const w = outcome(e, { ...settings, summer: true }); if (w !== outcome(e, settings)) f += ` If they also allow summer terms, ${w}.`; }
        facts.push(f);
      }
    }
    if (wantsLater && where) {
      const after = buildPlan(p, catalog, { ...edits, defer: { ...edits.defer, [code]: nextLabel(where.term) } }, settings);
      const e = { ...edits, defer: { ...edits.defer, [code]: nextLabel(where.term) }, drop: where.now ? [...new Set([...edits.drop, code])] : edits.drop };
      facts.push(`If ${code} waits until ${nextLabel(where.term)} or later, ${outcome(e, settings)}.${after ? '' : ''}`);
    }
  }
  const credit = /\b(\d{1,2})\s*(credit|hour|hrs)/.exec(q);
  if (credit && +credit[1] >= 6 && +credit[1] <= 21) facts.push(`At ${credit[1]} credit hours per term, ${outcome(edits, { ...settings, maxCredits: +credit[1] })}.`);
  else if (/\blighter\b|\bfewer\b|\bless\b/.test(q)) facts.push(`At 12 credit hours per term, ${outcome(edits, { ...settings, maxCredits: 12 })}.`);
  if (/\bsummer\b/.test(q) && !settings.summer) facts.push(`With summer terms allowed, ${outcome(edits, { ...settings, summer: true })}.`);
  if (/\bsooner\b|\bfaster\b|\bearlier\b/.test(q)) {
    const best = [{ ...settings, summer: true }, { ...settings, maxCredits: 18 }, { ...settings, summer: true, maxCredits: 18 }]
      .map(st => ({ st, r: buildPlan(p, catalog, edits, st) })).filter(x => x.r.finish);
    facts.push(best.length ? `Options: ${best.map(x => `${x.st.maxCredits} credit hrs${x.st.summer ? ' with summer' : ''} finishes ${x.r.finish}`).join('; ')}.` : 'No faster option exists with these courses.');
  }
  if (!facts.length) return null;
  return `${now} ${facts.join(' ')}`;
}

function nextLabel(term: string): string {
  const m = /^(Spring|Summer|Fall) (\d{4})$/.exec(term);
  if (!m) return term;
  return m[1] === 'Fall' ? `Spring ${+m[2] + 1}` : `Fall ${m[2]}`;
}

const STOP = new Set(['and', 'the', 'for', 'with', 'intro', 'introduction', 'project', 'course', 'advanced', 'principles', 'information', 'systems', 'technology']);
// A course is "mentioned" when a distinctive title word (6+ letters) or two title words appear.
function titleHit(title: string, q: string): boolean {
  const words = title.toLowerCase().replace(/[^a-z ]/g, ' ').split(/\s+/).filter(w => w.length > 3 && !STOP.has(w));
  const hits = words.filter(w => new RegExp(`\\b${w}`).test(q));
  return hits.some(w => w.length >= 6) || hits.length >= 2;
}
