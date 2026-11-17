/** Proposed integration contract. Independent of the current hard-coded UI planner. */
export type ReviewState = 'synthetic' | 'draft' | 'reviewed' | 'needs_review';
export interface Evidence {
  id: string; sourceKind: 'catalog' | 'audit' | 'forecast' | 'schedule' | 'manual' | 'synthetic';
  locator: string; retrievedOn: string; reviewState: ReviewState;
}
export interface TermKey { year: number; season: 'SP' | 'SU' | 'FA' }
export type Condition =
  | { kind: 'course'; courseId: string; minimumGrade?: string; allowConcurrent?: boolean }
  | { kind: 'all' | 'any'; conditions: Condition[] }
  | { kind: 'permission'; description: string }
  | { kind: 'unknown'; description: string };
export interface CatalogCourse {
  id: string; code: string; aliases: string[]; title: string; credits: number;
  creditRange?: { minimum: number; maximum: number; step: number };
  repeatable?: { maximumEarnableCredits: number; approvalRequired: boolean };
  prerequisite: Condition; corequisites: string[]; evidenceIds: string[];
}
export interface RequirementGroup {
  id: string; label: string; kind: 'all_courses' | 'choose_credits';
  courseIds: string[]; minimumCredits: number; shareCredits: boolean; evidenceIds: string[];
}
export interface ProgramVersion {
  id: string; title: string; institutionId: string; catalogYear: string;
  credentialCategory?: 'bachelor' | 'master' | 'specialist' | 'doctorate' | 'minor' | 'undergraduate_certificate' | 'graduate_certificate' | 'endorsement';
  nonCourseConditions?: { id: string; description: string; evidenceIds: string[]; supported: boolean }[];
  minimumCredits: number; groups: RequirementGroup[]; evidenceIds: string[];
}
export interface ProgramCoverage {
  discoveryEntryId: string; programVersionId: string | null;
  stage: 'name_discovered' | 'catalog_pinned' | 'rules_parsed' | 'rules_reviewed' | 'audit_matched' | 'schedule_tested';
  unresolvedRuleIds: string[]; reviewedBy: string | null; reviewedOn: string | null;
}
export interface OfferingEvidence {
  courseId: string; term: TermKey; status: 'published' | 'forecast' | 'historical' | 'unknown';
  expected: boolean | null; formats: string[]; evidenceIds: string[];
}
export interface CatalogSnapshot {
  schemaVersion: '1.0'; snapshotId: string; institutionId: string;
  courses: CatalogCourse[]; programs: ProgramVersion[]; evidence: Evidence[];
  offerings: OfferingEvidence[];
}
export interface CourseAttempt {
  attemptId: string; courseId: string | null; rawCode: string; normalizedCode: string;
  term: string; status: 'completed' | 'in_progress' | 'withdrawn' | 'incomplete' | 'planned';
  grade: string | null; attemptedCredits: number; earnedCredits: number;
  originInstitution: string; equivalency: 'institutional' | 'approved' | 'pending';
  sourceLocator: string;
}
export interface StudentSnapshot {
  schemaVersion: '1.0'; snapshotId: string; institutionId: string;
  programId: string; catalogYear: string; auditAsOf: string;
  attempts: CourseAttempt[];
}
/** Input rows are normalized structurally; their academic meaning still needs review. */
export type StudentImport = Omit<StudentSnapshot, 'attempts'> & {
  attempts: Omit<CourseAttempt, 'courseId' | 'normalizedCode'>[];
};
export type ScenarioOperation =
  | { kind: 'add_course'; courseId: string; preferredTerm?: string }
  | { kind: 'remove_from_term'; courseId: string; term: string }
  | { kind: 'exclude_course'; courseId: string }
  | { kind: 'no_earlier_than'; courseId: string; term: string }
  | { kind: 'project_attempt_outcome'; attemptId: string; outcome: 'pass' | 'fail' | 'withdraw' }
  | { kind: 'set_term_credit_limit'; term: string; credits: number };
export interface ScenarioDraft {
  id: string; studentSnapshotId: string; catalogSnapshotId: string;
  operations: ScenarioOperation[]; revision: number;
}
export interface PlanIssue { code: string; courseIds: string[]; evidenceIds: string[]; message: string }
export interface ProposedPlanResult {
  revision: number; status: 'feasible' | 'infeasible' | 'needs_review' | 'search_limit';
  finishTerm: string | null; issues: PlanIssue[];
  assignments: { courseId: string; term: string; reasonEvidenceIds: string[] }[];
}
