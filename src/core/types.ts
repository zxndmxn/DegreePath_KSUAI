// Shared shapes. Nothing here carries grades, GPA, name, student ID or email.

export type TermSeason = 'Spring' | 'Summer' | 'Fall';

export interface Term {
  season: TermSeason;
  year: number;
}

export interface Course {
  code: string;        // "IT 4983"
  title: string;
  credits: number;
  term?: string;       // "Fall 2026" for taken or in-progress courses
}

export interface RuleNeed {
  id: string;
  label: string;
  block: string;
  percent: number;
  credits: number | null;   // credits still required by this rule, when stated
  classes: number | null;   // classes still required, when stated
  options: string[];        // eligible course codes (wildcards removed)
  satisfiedBy: string[];    // in-progress codes that complete this rule
  reviewReason?: string;    // requirement the planner cannot resolve
}

export interface RequirementBlock {
  title: string;
  percent: number;
  rules: { label: string; percent: number; done: boolean }[];
}

export interface Pathway {
  source: 'DegreeWorks';
  importedAt: string;
  program: string;
  catalog: string;
  concentration: string;
  major: string;
  level: string;
  activeTerm: string;            // "Fall 2026"
  percent: number;               // official DegreeWorks percent complete
  credits: { applied: number; inProgress: number; transfer: number };
  blocks: RequirementBlock[];
  open: RuleNeed[];              // unfinished rules
  auditReviewVersion?: 1;
  completed: Course[];
  inProgress: Course[];
}

export type Prereq =
  | { kind: 'course'; code: string; concurrent: boolean }
  | { kind: 'and' | 'or'; items: Prereq[] }
  | { kind: 'none' };

export interface CourseInfo {
  code: string;
  title: string;
  credits: number;
  prereq: Prereq;
  offered: string[];        // published terms with sections, e.g. ["Spring 2027"]
  seats: Record<string, number>; // open seats per published term
  fetchedAt: string;
  stale?: boolean;          // last known details after a failed refresh
}

export interface PlanEdits {
  drop: string[];                       // in-progress courses the student drops
  defer: Record<string, string>;        // code -> earliest term label
  add: string[];                        // extra courses the student wants
  choose: Record<string, string[]>;     // rule id -> chosen options
}

export interface PlanSettings {
  maxCredits: number;
  summer: boolean;
}

export type Risk = 'done' | 'good' | 'watch' | 'moved' | 'blocked';

export interface PlannedCourse extends Course {
  status: 'in-progress' | 'planned';
  risk: Risk;
  notes: string[];
  ruleLabel?: string;
}

export interface PlannedTerm {
  label: string;
  credits: number;
  courses: PlannedCourse[];
  percentAfter: number;
}

export interface Plan {
  terms: PlannedTerm[];
  finish: string | null;
  blocked: { code: string; title: string; reason: string }[];
  remainingCredits: number;
  unresolved: RuleNeed[];  // open rules with no schedulable option picked
}
