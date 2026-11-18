export interface Course {
  id: string; code: string; title: string; credits: number;
  prerequisites: string[]; area: 'Major' | 'Core' | 'Elective';
}
export type Action = 'defer' | 'exclude';
export interface CourseChange { courseId: string; action: Action; delay: number }
export interface Scenario extends CourseChange { creditLimit: number; changes?: CourseChange[] }
export function scenarioChanges(scenario?: Scenario): CourseChange[] {
  return scenario ? scenario.changes ?? [{ courseId: scenario.courseId, action: scenario.action, delay: scenario.delay }] : [];
}
export function updateCourseChange(scenario: Scenario | undefined, change: CourseChange, creditLimit: number): Scenario {
  return { ...change, creditLimit, changes: [...scenarioChanges(scenario).filter(item=>item.courseId!==change.courseId), {...change}] };
}
export function removeCourseChange(scenario: Scenario, courseId: string): Scenario | undefined {
  const changes = scenarioChanges(scenario).filter(item=>item.courseId!==courseId);
  return changes.length ? {...changes.at(-1)!, creditLimit:scenario.creditLimit, changes} : undefined;
}
export interface Term { index: number; label: string; courses: Course[]; credits: number }
export interface Plan { terms: Term[]; blocked: Course[]; placements: Record<string, number>; finish: string | null }
export const completed = ['calc1', 'prog1'];
export const courses: Course[] = [
  { id: 'calc2', code: 'MATH 1202', title: 'Calculus II', credits: 4, prerequisites: ['calc1'], area: 'Major' },
  { id: 'prog2', code: 'COMP 1202', title: 'Programming II', credits: 4, prerequisites: ['prog1'], area: 'Major' },
  { id: 'writing', code: 'ENGL 2100', title: 'Technical Writing', credits: 3, prerequisites: [], area: 'Core' },
  { id: 'ethics', code: 'PHIL 2200', title: 'Technology & Ethics', credits: 3, prerequisites: [], area: 'Core' },
  { id: 'structures', code: 'COMP 2300', title: 'Data Structures', credits: 4, prerequisites: ['prog2'], area: 'Major' },
  { id: 'physics', code: 'PHYS 1100', title: 'Applied Physics', credits: 4, prerequisites: ['calc1'], area: 'Core' },
  { id: 'linear', code: 'MATH 2300', title: 'Linear Algebra', credits: 3, prerequisites: ['calc2'], area: 'Major' },
  { id: 'web', code: 'COMP 2400', title: 'Web Foundations', credits: 3, prerequisites: ['prog2'], area: 'Major' },
  { id: 'algorithms', code: 'COMP 3100', title: 'Algorithms', credits: 3, prerequisites: ['structures', 'calc2'], area: 'Major' },
  { id: 'database', code: 'COMP 3200', title: 'Database Systems', credits: 4, prerequisites: ['structures'], area: 'Major' },
  { id: 'networks', code: 'COMP 3300', title: 'Computer Networks', credits: 3, prerequisites: ['prog2'], area: 'Major' },
  { id: 'design', code: 'COMP 3400', title: 'Human-Centered Design', credits: 3, prerequisites: ['web'], area: 'Major' },
  { id: 'systems', code: 'COMP 4100', title: 'Operating Systems', credits: 3, prerequisites: ['algorithms'], area: 'Major' },
  { id: 'software', code: 'COMP 3500', title: 'Software Engineering', credits: 3, prerequisites: ['structures'], area: 'Major' },
  { id: 'security', code: 'COMP 4200', title: 'Information Security', credits: 3, prerequisites: ['networks'], area: 'Major' },
  { id: 'elective', code: 'ELEC 3000', title: 'Open Elective', credits: 3, prerequisites: [], area: 'Elective' },
  { id: 'capstone1', code: 'COMP 4801', title: 'Capstone I', credits: 3, prerequisites: ['systems', 'software', 'linear'], area: 'Major' },
  { id: 'capstone2', code: 'COMP 4802', title: 'Capstone II', credits: 4, prerequisites: ['capstone1', 'database', 'security', 'design'], area: 'Major' },
];
export function termLabel(index: number): string {
  return `${index % 2 === 0 ? 'Spring' : 'Fall'} ${2027 + Math.floor(index / 2)}`;
}
export function dependencies(id: string): { direct: Course[]; downstream: Course[] } {
  const direct = courses.filter(c => c.prerequisites.includes(id));
  const affected = new Set(direct.map(c => c.id));
  for (let changed = true; changed;) {
    changed = false;
    for (const c of courses) if (!affected.has(c.id) && c.prerequisites.some(p => affected.has(p))) {
      affected.add(c.id); changed = true;
    }
  }
  return { direct, downstream: courses.filter(c => affected.has(c.id) && !direct.includes(c)) };
}
export function plan(creditLimit = 15, scenario?: Scenario): Plan {
  if (![12, 15, 18].includes(creditLimit)) throw new Error('Choose a 12, 15, or 18 credit limit.');
  const changes = scenarioChanges(scenario);
  if ((scenario && !changes.length) || changes.length > courses.length || new Set(changes.map(c=>c.courseId)).size !== changes.length || changes.some(change => !courses.some(c => c.id === change.courseId) || !['defer', 'exclude'].includes(change.action)
    || !Number.isInteger(change.delay) || change.delay < 1 || change.delay > 4)) throw new Error('Invalid scenario.');
  const baseline = scenario ? plan(creditLimit) : undefined;
  const constraints = new Map(changes.map(change=>[change.courseId, {...change, earliest: change.action === 'defer' ? baseline!.placements[change.courseId] + change.delay : 0}]));
  const placements: Record<string, number> = {};
  const terms: Term[] = [];
  const earned = new Set(completed);
  let remaining = [...courses];
  for (let index = 0; index < 24 && remaining.length; index++) {
    const selected: Course[] = [];
    let credits = 0;
    for (const c of remaining) {
      const constraint = constraints.get(c.id);
      if (constraint && (constraint.action === 'exclude' || index < constraint.earliest)) continue;
      if (credits + c.credits <= creditLimit && c.prerequisites.every(p => earned.has(p))) {
        selected.push(c); credits += c.credits; placements[c.id] = index;
      }
    }
    terms.push({ index, label: termLabel(index), courses: selected, credits });
    for (const c of selected) earned.add(c.id);
    remaining = remaining.filter(c => !earned.has(c.id));
    if (!selected.length && !remaining.some(c=>{const constraint=constraints.get(c.id); return constraint?.action === 'defer' && index < constraint.earliest;})) break;
  }
  while (terms.length && !terms.at(-1)!.courses.length) terms.pop();
  return { terms, placements, blocked: remaining, finish: remaining.length ? null : terms.at(-1)?.label ?? null };
}
