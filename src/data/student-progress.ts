export interface StudentCourse {
  code: string;
  title: string;
  credits: number | null;
  term: string;
  status: 'History' | 'In progress';
}

export interface Requirement {
  title: string;
  percent: number | null;
  rules: string[];
}

export interface StudentProgress {
  source: 'DegreeWorks' | 'Manual';
  program: string;
  catalog: string;
  applied: number | null;
  required: number | null;
  courses: StudentCourse[];
  requirements: Requirement[];
}

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}

function rows(value: unknown): Record<string, unknown>[] {
  return Array.isArray(value) ? value.map(record) : [];
}

function label(value: unknown): string {
  return typeof value === 'string' ? value.trim().slice(0, 300) : '';
}

export function creditNumber(value: unknown): number | null {
  if (typeof value !== 'number' && (typeof value !== 'string' || !/^\d+(\.\d+)?$/.test(value.trim()))) return null;
  const number = Number(value);
  return Number.isFinite(number) && number >= 0 && number <= 1000 ? number : null;
}

function auditCourse(row: Record<string, unknown>, inProgress: boolean): StudentCourse | null {
  const code = [label(row.discipline), label(row.number)].filter(Boolean).join(' ');
  if (!code) return null;
  return {
    code, title: label(row.courseTitle), credits: creditNumber(row.credits),
    term: label(row.term),
    status: inProgress || row.inProgress === 'Y' || row.letterGrade === 'REGD' ? 'In progress' : 'History',
  };
}

function requirementRules(value: unknown): string[] {
  const pending = rows(value).reverse();
  const result: string[] = [];
  while (pending.length) {
    const rule = pending.pop()!;
    const percent = creditNumber(rule.percentComplete);
    const title = label(rule.label);
    if (title && (percent === null || percent < 100)) result.push(title);
    for (const child of rows(rule.ruleArray).reverse()) pending.push(child);
  }
  return [...new Set(result)];
}

export function importDegreeWorks(input: string): StudentProgress {
  if (input.length > 5_000_000) throw new Error('This audit is too large to import.');
  let payload: unknown;
  try {
    payload = JSON.parse(input.replace(/^\uFEFF/, ''));
  } catch {
    throw new Error('This file is not valid JSON. Export it again using dw --json audit.');
  }
  const audit = record(payload);
  if (!Object.keys(record(audit.auditHeader)).length || !Array.isArray(audit.blockArray)) {
    throw new Error('Choose the full DegreeWorks audit from dw --json audit.');
  }
  const header = record(audit.auditHeader);
  const degree = rows(record(audit.degreeInformation).degreeDataArray)[0] ?? {};
  const blocks = rows(audit.blockArray);
  const degreeBlock = blocks.find(block => block.requirementType === 'DEGREE');
  const resident = creditNumber(header.residentApplied);
  const transfer = creditNumber(header.transferApplied);
  const applied = resident === null || transfer === null ? null : resident + transfer;

  const history = rows(record(audit.classInformation).classArray);
  const current = rows(record(audit.inProgress).classArray);
  const currentIds = new Set(current.map(row => label(row.id)).filter(Boolean));
  const historyIds = new Set(history.map(row => label(row.id)).filter(Boolean));
  const courses = [
    ...history.map(row => auditCourse(row, currentIds.has(label(row.id)))),
    ...current.filter(row => !historyIds.has(label(row.id))).map(row => auditCourse(row, true)),
  ].filter((course): course is StudentCourse => course !== null);

  return {
    source: 'DegreeWorks', program: label(degree.degreeLiteral) || label(degreeBlock?.title),
    catalog: label(degree.catalogYearLit), applied,
    required: creditNumber(degreeBlock?.creditsRequired),
    courses,
    requirements: blocks.flatMap(block => {
      const title = label(block.title);
      const percent = creditNumber(block.percentComplete);
      return title ? [{
        title, percent: percent !== null && percent <= 100 ? percent : null,
        rules: requirementRules(block.ruleArray),
      }] : [];
    }),
  };
}
