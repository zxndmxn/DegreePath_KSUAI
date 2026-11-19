import type { CourseInfo, Prereq } from './types.ts';
import { courseCode } from './audit.ts';

type Row = Record<string, unknown>;
const rec = (v: unknown): Row => (v && typeof v === 'object' && !Array.isArray(v) ? (v as Row) : {});
const rows = (v: unknown): Row[] => (Array.isArray(v) ? v.map(rec) : []);
const str = (v: unknown) => (typeof v === 'string' ? v.trim() : '');

type Tok = '(' | ')' | 'A' | 'O' | Prereq;

// Banner prerequisite rows -> boolean tree. AND binds tighter than OR.
export function parsePrereqRows(list: Row[]): Prereq {
  const toks: Tok[] = [];
  for (const r of list) {
    const conn = str(r.connector).toUpperCase();
    if (conn === 'A' || conn === 'O') toks.push(conn);
    for (const _ of str(r.leftParenthesis)) toks.push('(');
    const code = courseCode(r.subjectCodePrerequisite, r.courseNumberPrerequisite);
    if (code) toks.push({ kind: 'course', code, concurrent: str(r.concurrencyIndicator) === 'Y' });
    else if (str(r.tescCode)) toks.push({ kind: 'none' }); // test score: cannot verify, never blocks
    for (const _ of str(r.rightParenthesis)) toks.push(')');
  }
  // Drop connectors that have no left operand, e.g. "( O IT 4323".
  const clean: Tok[] = [];
  for (const t of toks) {
    const prev = clean[clean.length - 1];
    if ((t === 'A' || t === 'O') && (prev === undefined || prev === '(' || prev === 'A' || prev === 'O')) continue;
    clean.push(t);
  }
  let i = 0;
  const peek = () => clean[i];
  const primary = (): Prereq => {
    const t = clean[i++];
    if (t === '(') {
      const inner = orExpr();
      if (peek() === ')') i++;
      return inner;
    }
    if (t && typeof t === 'object') return t;
    return { kind: 'none' };
  };
  const andExpr = (): Prereq => {
    const items = [primary()];
    while (peek() === 'A') { i++; items.push(primary()); }
    return items.length === 1 ? items[0] : { kind: 'and', items };
  };
  function orExpr(): Prereq {
    const items = [andExpr()];
    while (peek() === 'O') { i++; items.push(andExpr()); }
    return items.length === 1 ? items[0] : { kind: 'or', items };
  }
  if (!clean.length) return { kind: 'none' };
  const tree = orExpr();
  return simplify(tree);
}

function simplify(p: Prereq): Prereq {
  if (p.kind !== 'and' && p.kind !== 'or') return p;
  const items = p.items.map(simplify).filter(x => x.kind !== 'none' || p.kind === 'or');
  if (p.kind === 'or' && items.some(x => x.kind === 'none')) return { kind: 'none' };
  if (!items.length) return { kind: 'none' };
  return items.length === 1 ? items[0] : { kind: p.kind, items };
}

// before: courses finished in earlier terms. same: courses in the same term.
export function prereqMet(p: Prereq, before: Set<string>, same: Set<string>): boolean {
  switch (p.kind) {
    case 'none': return true;
    case 'course': return before.has(p.code) || (p.concurrent && same.has(p.code));
    case 'and': return p.items.every(x => prereqMet(x, before, same));
    case 'or': return p.items.some(x => prereqMet(x, before, same));
  }
}

export function prereqCodes(p: Prereq): string[] {
  if (p.kind === 'course') return [p.code];
  if (p.kind === 'and' || p.kind === 'or') return [...new Set(p.items.flatMap(prereqCodes))];
  return [];
}

export function prereqText(p: Prereq): string {
  switch (p.kind) {
    case 'none': return '';
    case 'course': return p.concurrent ? `${p.code} (same term ok)` : p.code;
    case 'and': return p.items.map(x => (x.kind === 'or' ? `(${prereqText(x)})` : prereqText(x))).join(' and ');
    case 'or': return p.items.map(x => (x.kind === 'and' ? `(${prereqText(x)})` : prereqText(x))).join(' or ');
  }
}

export function parseCourseInfo(raw: unknown, code: string): CourseInfo | null {
  const course = rows(rec(rec(raw).courseInformation).courses)[0];
  if (!course) return null;
  const offered: string[] = [];
  const seats: Record<string, number> = {};
  for (const s of rows(course.sections)) {
    const term = str(s.termLiteral);
    if (!term) continue;
    if (!offered.includes(term)) offered.push(term);
    const open = Number(str(s.seatsAvailable));
    seats[term] = (seats[term] ?? 0) + (Number.isFinite(open) ? Math.max(0, open) : 0);
  }
  const credits = Number(str(course.creditHourLow));
  return {
    code,
    title: str(course.title) || code,
    credits: Number.isFinite(credits) && credits > 0 ? credits : 3,
    prereq: parsePrereqRows(rows(course.prerequisites)),
    offered,
    seats,
    fetchedAt: new Date().toISOString(),
  };
}
