import type { Course, Pathway, RequirementBlock, RuleNeed } from './types.ts';

// Turns a raw DegreeWorks audit (dw --json audit) into a Pathway.
// Privacy: grades, GPA, grade points, name, student ID and email are never read.

type Row = Record<string, unknown>;

const rec = (v: unknown): Row => (v && typeof v === 'object' && !Array.isArray(v) ? (v as Row) : {});
const rows = (v: unknown): Row[] => (Array.isArray(v) ? v.map(rec) : []);
const str = (v: unknown, max = 200): string => (typeof v === 'string' ? v.trim().slice(0, max) : '');
const num = (v: unknown): number => {
  const n = typeof v === 'number' ? v : typeof v === 'string' && /^\d+(\.\d+)?$/.test(v.trim()) ? Number(v) : NaN;
  return Number.isFinite(n) ? n : 0;
};

export const courseCode = (subject: unknown, number: unknown): string => {
  const s = str(subject, 8).toUpperCase();
  const n = str(number, 8).toUpperCase();
  return s && n && !s.includes('@') && !n.includes('@') ? `${s} ${n}` : '';
};

function toCourse(r: Row): Course | null {
  const code = courseCode(r.discipline, r.number);
  if (!code) return null;
  return { code, title: str(r.courseTitle), credits: num(r.credits), term: str(r.termLiteral, 30) || undefined };
}

export function parseAudit(input: string | unknown): Pathway {
  let raw: unknown = input;
  if (typeof input === 'string') {
    if (input.length > 5_000_000) throw new Error('This audit is too large to import.');
    try { raw = JSON.parse(input.replace(/^﻿/, '')); }
    catch { throw new Error('This file is not valid JSON. Export it again with dw --json audit.'); }
  }
  const audit = rec(raw);
  const header = rec(audit.auditHeader);
  if (!Object.keys(header).length || !Array.isArray(audit.blockArray)) {
    throw new Error('This is not a full DegreeWorks audit. Use dw --json audit.');
  }

  const degree = rows(rec(audit.degreeInformation).degreeDataArray)[0] ?? {};
  const goals = rows(rec(audit.degreeInformation).goalArray);
  const goal = (code: string) => str(goals.find(g => g.code === code)?.valueLiteral);

  const classes = rows(rec(audit.classInformation).classArray);
  const currentIds = new Set(rows(rec(audit.inProgress).classArray).map(r => str(r.id, 40)).filter(Boolean));
  const completed: Course[] = [];
  const inProgress: Course[] = [];
  const seen = new Set<string>();
  for (const r of classes) {
    const c = toCourse(r);
    if (!c) continue;
    const key = `${c.code}|${c.term ?? ''}`;
    if (seen.has(key)) continue;
    seen.add(key);
    if (r.inProgress === 'Y' || r.preregistered === 'Y' || currentIds.has(str(r.id, 40))) inProgress.push(c);
    else if (r.passed !== 'N') completed.push(c);
  }
  const inProgressCodes = new Set(inProgress.map(c => c.code));

  const blocks: RequirementBlock[] = [];
  const open: RuleNeed[] = [];
  const auditBlocks = rows(audit.blockArray);
  const normalizedLabel = (value: unknown) => str(value).toLowerCase().replace(/\s+/g, ' ');
  for (const block of auditBlocks) {
    const title = str(block.title);
    if (!title) continue;
    const ruleSummary: RequirementBlock['rules'] = [];
    const walk = (list: Row[], depth: number) => {
      for (const rule of list) {
        const label = str(rule.label);
        const percent = Math.min(100, num(rule.percentComplete));
        const children = rows(rule.ruleArray);
        if (depth === 0 && label) ruleSummary.push({ label, percent, done: percent >= 100 });
        if (rule.ruleType === 'Course' && percent < 100) {
          const req = rec(rule.requirement);
          const needCredits = num(req.creditsBegin) || null;
          const needClasses = num(req.classesBegin) || null;
          const applied = rows(rec(rule.classesAppliedToRule).classArray)
            .map(c => courseCode(c.discipline, c.number)).filter(Boolean);
          const satisfiedBy = applied.filter(c => inProgressCodes.has(c));
          const creditsLeft = needCredits === null ? null : Math.max(0, needCredits - num(rule.creditsApplied));
          const classesLeft = needClasses === null ? null : Math.max(0, needClasses - num(rule.classesApplied));
          const options = [...new Set(rows(req.courseArray).map(c => courseCode(c.discipline, c.number)).filter(Boolean))];
          const id = str(rule.ruleId, 40) || `${title}:${label}`;
          const coveredByCurrent = rule.inProgressIncomplete === 'Yes' && satisfiedBy.length > 0
            && (creditsLeft ?? 0) === 0 && (classesLeft ?? 0) === 0;
          if (!open.some(o => o.id === id)) {
            open.push({
              id, label, block: title, percent,
              credits: creditsLeft, classes: classesLeft,
              options, satisfiedBy,
              ...(!coveredByCurrent && (creditsLeft ?? 0) === 0 && (classesLeft ?? 0) === 0
                ? { reviewReason: 'DegreeWorks lists this as incomplete without a remaining course or credit count.' } : {}),
            });
          }
        } else if (percent < 100 && !children.length && (label || str(rule.ruleType))) {
          const linkedBlock = rule.ruleType === 'Block' && label && auditBlocks.some(other =>
            other !== block && rows(other.ruleArray).length > 0 &&
            (normalizedLabel(other.title) === normalizedLabel(label) || rows(other.ruleArray).some(summary =>
              summary.ruleType !== 'Block' && normalizedLabel(summary.label) === normalizedLabel(label))));
          if (linkedBlock) continue;
          const id = `review:${str(rule.ruleId, 40) || `${title}:${label}`}`;
          if (!open.some(o => o.id === id)) open.push({
            id, label: label || title, block: title, percent, credits: null, classes: null,
            options: [], satisfiedBy: [],
            reviewReason: 'DegreePath cannot calculate this requirement. Check the rule in DegreeWorks.',
          });
        }
        walk(children, depth + 1);
      }
    };
    walk(rows(block.ruleArray), 0);
    blocks.push({ title, percent: Math.min(100, num(block.percentComplete)), rules: ruleSummary });
  }

  const resident = num(header.residentApplied);
  const transfer = num(header.transferApplied);
  return {
    source: 'DegreeWorks',
    importedAt: new Date().toISOString(),
    program: str(degree.degreeLiteral) || str(blocks[0]?.title),
    catalog: str(degree.catalogYearLit, 20),
    concentration: goal('CONC'),
    major: goal('MAJOR'),
    level: str(degree.studentLevelLiteral, 30),
    activeTerm: str(degree.activeTermLiteral, 30),
    percent: Math.min(100, num(header.percentComplete)),
    credits: {
      applied: resident + transfer,
      inProgress: inProgress.reduce((s, c) => s + c.credits, 0),
      transfer,
    },
    blocks,
    open,
    auditReviewVersion: 1,
    completed,
    inProgress,
  };
}

// Course codes that still need a seat in a future term, before any student edits.
export function openCourseNeeds(p: Pathway): RuleNeed[] {
  return p.open.filter(r => (r.credits ?? 0) > 0 || (r.classes ?? 0) > 0);
}
