// D2L workload, titles and dates only. Grades, submissions and feedback are never read.

export interface WorkItem { title: string; type: 'Assignment' | 'Quiz' | 'Discussion' | 'Exam' | 'Item'; due: string; done: boolean }
export interface CourseWork { code: string; name: string; items: WorkItem[] }
export interface Workload { connected: boolean; fetchedAt: string; courses: Record<string, CourseWork> }

type Row = Record<string, unknown>;
const rec = (v: unknown): Row => (v && typeof v === 'object' && !Array.isArray(v) ? (v as Row) : {});
const rows = (v: unknown): Row[] => (Array.isArray(v) ? v.map(rec) : []);
const str = (v: unknown) => (typeof v === 'string' ? v.trim() : '');

// "CO.430.IT4983.85844.20272" -> "IT 4983"
export function codeFromD2L(orgCode: string): string | null {
  const m = /(?:^|\.)([A-Z]{2,4})(\d{4}[A-Z]?)(?:\.|$)/.exec(orgCode.toUpperCase());
  return m ? `${m[1]} ${m[2]}` : null;
}

function kind(row: Row): WorkItem['type'] {
  const name = str(row.ItemName).toLowerCase();
  if (/(^|[^a-z])(exam|midterm)/.test(name)) return 'Exam';
  if (/(^|[^a-z])quiz/.test(name)) return 'Quiz';
  if (/(^|[^a-z])(discussion|forum)/.test(name)) return 'Discussion';
  const t = Number(row.ItemType);
  return t === 1 ? 'Assignment' : t === 2 ? 'Quiz' : t === 3 ? 'Discussion' : 'Item';
}

export function parseWorkload(coursesRaw: unknown, dueRaw: unknown, now = new Date()): Workload {
  const courses: Record<string, CourseWork> = {};
  const byOrg = new Map<string, string>();
  for (const c of rows(coursesRaw)) {
    const ou = rec(c.OrgUnit);
    if (rec(c.Access).IsActive === false) continue;
    const code = codeFromD2L(str(ou.Code));
    if (!code) continue;
    byOrg.set(String(ou.Id), code);
    courses[code] ??= { code, name: str(ou.Name).replace(/\s+(Section|Group)\b.*$/i, '').slice(0, 120), items: [] };
  }
  for (const r of rows(dueRaw)) {
    const code = byOrg.get(String(r.OrgUnitId));
    const due = str(r.DueDate) || str(r.EndDate);
    if (!code || !due || r.IsExempt === true) continue;
    courses[code].items.push({ title: str(r.ItemName).slice(0, 140) || 'Untitled item', type: kind(r), due, done: !!r.DateCompleted });
  }
  for (const c of Object.values(courses)) c.items.sort((a, b) => a.due.localeCompare(b.due));
  return { connected: true, fetchedAt: now.toISOString(), courses };
}

export const remaining = (c?: CourseWork, now = Date.now()) => (c?.items ?? []).filter(i => !i.done && Date.parse(i.due) >= now - 864e5);

export function dueWithin(w: Workload | null, days: number, now = Date.now()) {
  if (!w) return [];
  const end = now + days * 864e5;
  return Object.values(w.courses).flatMap(c => remaining(c, now).filter(i => Date.parse(i.due) <= end).map(i => ({ ...i, code: c.code })))
    .sort((a, b) => a.due.localeCompare(b.due));
}

export function shortDate(iso: string): string {
  // D2L stores end-of-day Eastern as 04:59 UTC the next day; shift back so dates read as students expect.
  const d = new Date(Date.parse(iso) - 5 * 3600e3);
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', timeZone: 'UTC' });
}

export function workloadLine(c?: CourseWork, now = Date.now()): string | null {
  const left = remaining(c, now);
  if (!c) return null;
  if (!left.length) return 'Nothing left due on D2L';
  return `${left.length} due left · next ${shortDate(left[0].due)}`;
}
