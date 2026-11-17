import type { CatalogSnapshot, CourseAttempt, StudentSnapshot } from './contracts';

export interface IntakeIssue { severity: 'error' | 'review' | 'warning'; path: string; code: string; message: string }
export interface IntakeResult { candidate: StudentSnapshot | null; readyForReview: boolean; readyToPlan: boolean; issues: IntakeIssue[] }
const object = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);
const text = (v: unknown): v is string => typeof v === 'string' && v.trim().length > 0 && v.length <= 256;
export const normalizeCourseCode = (v: string) => v.trim().toUpperCase().replace(/\s+/g, ' ');
const statuses = ['completed', 'in_progress', 'withdrawn', 'incomplete', 'planned'];
const grades = ['A', 'B', 'C', 'D', 'F', 'W', 'WF', 'I', 'IP', 'S', 'U', 'P', 'NP', 'TC'];
const date = (v: unknown) => typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v) && Number.isFinite(Date.parse(v)) && new Date(v).toISOString().slice(0, 10) === v;

/** Pure staging function: never overwrites a current student record and never evaluates degree eligibility. */
export function inspectStudentImport(input: unknown, catalog: CatalogSnapshot): IntakeResult {
  const issues: IntakeIssue[] = [];
  const issue = (severity: IntakeIssue['severity'], path: string, code: string, message: string) => issues.push({ severity, path, code, message });
  const finish = (candidate: StudentSnapshot | null): IntakeResult => {
    const valid = candidate !== null && !issues.some(i => i.severity === 'error');
    // Even structurally valid imports require confirmation and academic evaluation. This adapter cannot declare a plan ready.
    return { candidate: valid ? candidate : null, readyForReview: valid, readyToPlan: false, issues };
  };
  if (!object(input)) { issue('error', '$', 'INVALID_OBJECT', 'Expected a student snapshot object.'); return finish(null); }
  if (input.schemaVersion !== '1.0') issue('error', 'schemaVersion', 'SCHEMA_VERSION', 'Only version 1.0 is supported.');
  for (const field of ['snapshotId', 'institutionId', 'programId', 'catalogYear']) if (!text(input[field])) issue('error', field, 'REQUIRED_FIELD', 'A bounded nonempty string is required.');
  if (!date(input.auditAsOf)) issue('error', 'auditAsOf', 'INVALID_DATE', 'Use a real YYYY-MM-DD audit date.');
  if (input.institutionId !== catalog.institutionId) issue('review', 'institutionId', 'INSTITUTION_MISMATCH', 'Confirm the institution before mapping coursework.');
  const program = catalog.programs.find(p => p.id === input.programId && p.catalogYear === input.catalogYear);
  if (!program) issue('review', 'programId', 'PROGRAM_NOT_SUPPORTED', 'The exact program and catalog year are not supported by this snapshot.');
  if (!Array.isArray(input.attempts) || input.attempts.length > 2000) {
    issue('error', 'attempts', 'INVALID_ROWS', 'Expected an array containing at most 2,000 attempts.'); return finish(null);
  }
  if (!input.attempts.length) issue('review', 'attempts', 'EMPTY_RECORD', 'Confirm that this is a new student rather than a failed extraction.');
  const codes = new Map<string, string>();
  const ambiguousCodes = new Set<string>();
  for (const c of catalog.courses) for (const raw of [c.code, ...c.aliases]) {
    const key = normalizeCourseCode(raw);
    if (codes.has(key) && codes.get(key) !== c.id) ambiguousCodes.add(key);
    codes.set(key, c.id);
  }
  const attempts: CourseAttempt[] = [];
  const seen = new Map<string, string>();
  input.attempts.forEach((row: unknown, index: number) => {
    const path = `attempts[${index}]`;
    if (!object(row)) { issue('error', path, 'INVALID_ROW', 'Expected an attempt object.'); return; }
    const before = issues.filter(i => i.severity === 'error').length;
    for (const field of ['attemptId', 'rawCode', 'originInstitution', 'sourceLocator']) if (!text(row[field])) issue('error', `${path}.${field}`, 'REQUIRED_FIELD', 'A bounded nonempty string is required.');
    if (typeof row.term !== 'string' || !/^\d{4}-(SP|SU|FA)$/.test(row.term)) issue('error', `${path}.term`, 'INVALID_TERM', 'Expected YYYY-SP, YYYY-SU, or YYYY-FA.');
    if ((typeof row.status !== 'string' || !statuses.includes(row.status))) issue('error', `${path}.status`, 'INVALID_STATUS', 'Status is not supported.');
    if (row.grade !== null && (typeof row.grade !== 'string' || !grades.includes(row.grade))) issue('error', `${path}.grade`, 'UNKNOWN_GRADE', 'Preserve the row for correction; do not guess the grade.');
    for (const field of ['attemptedCredits', 'earnedCredits']) if (typeof row[field] !== 'number' || !Number.isFinite(row[field]) || row[field] < 0 || row[field] > 30) issue('error', `${path}.${field}`, 'INVALID_CREDITS', 'Expected a finite number from 0 through 30.');
    if (typeof row.earnedCredits === 'number' && typeof row.attemptedCredits === 'number' && row.earnedCredits > row.attemptedCredits) issue('error', `${path}.earnedCredits`, 'CREDIT_CONFLICT', 'Earned credits exceed attempted credits.');
    if ((typeof row.equivalency !== 'string' || !['institutional', 'approved', 'pending'].includes(row.equivalency))) issue('error', `${path}.equivalency`, 'INVALID_EQUIVALENCY', 'Record institutional, approved, or pending equivalency explicitly.');
    if (row.status !== 'completed' && row.earnedCredits !== 0) issue('error', `${path}.earnedCredits`, 'UNFINISHED_CREDIT', 'Unfinished, withdrawn, and planned attempts cannot be earned credit.');
    if (typeof row.grade === 'string' && ['F', 'W', 'WF', 'U', 'NP', 'I', 'IP'].includes(row.grade) && row.earnedCredits !== 0) issue('error', `${path}.earnedCredits`, 'GRADE_CREDIT_CONFLICT', 'This grade cannot be reported as earned credit.');
    if (issues.filter(i => i.severity === 'error').length !== before) return;
    const normalizedCode = normalizeCourseCode(row.rawCode as string);
    const courseId = ambiguousCodes.has(normalizedCode) ? null : codes.get(normalizedCode) ?? null;
    if (!courseId) issue('review', `${path}.rawCode`, 'UNRESOLVED_COURSE', 'No unique course match. Keep the original code for review.');
    if (row.equivalency === 'pending') issue('review', `${path}.equivalency`, 'PENDING_TRANSFER', 'Transfer equivalency needs confirmation.');
    if (row.status === 'in_progress' || row.status === 'incomplete') issue('review', `${path}.status`, 'PROJECTED_OUTCOME', 'Do not treat this attempt as a completed prerequisite.');
    if (row.status === 'completed' && row.grade === null) issue('review', `${path}.grade`, 'MISSING_GRADE', 'Academic eligibility cannot be evaluated without a supported grade.');
    const c = catalog.courses.find(c => c.id === courseId);
    if (c && row.attemptedCredits !== c.credits) issue('review', `${path}.attemptedCredits`, 'CREDIT_MISMATCH', 'Imported credit differs from this catalog version; do not silently overwrite either value.');
    const candidate = { attemptId: row.attemptId, rawCode: row.rawCode, normalizedCode, courseId, term: row.term, status: row.status, grade: row.grade, attemptedCredits: row.attemptedCredits, earnedCredits: row.earnedCredits, originInstitution: row.originInstitution, equivalency: row.equivalency, sourceLocator: row.sourceLocator } as CourseAttempt;
    const signature = JSON.stringify(candidate);
    const previous = seen.get(candidate.attemptId);
    if (previous) { issue(previous === signature ? 'warning' : 'error', path, previous === signature ? 'DUPLICATE_ROW' : 'CONFLICTING_ATTEMPT', previous === signature ? 'Exact duplicate attempt collapsed.' : 'Same attempt ID has conflicting values.'); return; }
    seen.set(candidate.attemptId, signature); attempts.push(candidate);
  });
  return finish({ schemaVersion: '1.0', snapshotId: input.snapshotId, institutionId: input.institutionId, programId: input.programId, catalogYear: input.catalogYear, auditAsOf: input.auditAsOf, attempts } as StudentSnapshot);
}

export function inspectStudentJson(raw: string, catalog: CatalogSnapshot): IntakeResult {
  if (new TextEncoder().encode(raw).byteLength > 2 * 1024 * 1024) return { candidate: null, readyForReview: false, readyToPlan: false, issues: [{ severity: 'error', path: '$', code: 'FILE_TOO_LARGE', message: 'Normalized JSON is limited to 2 MiB.' }] };
  let parsed: unknown;
  try { parsed = JSON.parse(raw); }
  catch { return { candidate: null, readyForReview: false, readyToPlan: false, issues: [{ severity: 'error', path: '$', code: 'INVALID_JSON', message: 'JSON is incomplete or malformed. The existing record is unchanged.' }] }; }
  return inspectStudentImport(parsed, catalog);
}
