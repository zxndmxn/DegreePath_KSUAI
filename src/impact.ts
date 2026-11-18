import { courses, type Plan } from './planner.ts';

const earnedCredits = 60;
const requiredCredits = earnedCredits + courses.reduce((sum, course) => sum + course.credits, 0);

/** Projected coverage includes planned credits, never changes the earned transcript. */
export function projectedCreditsThrough(result: Plan, termIndex = Infinity): number {
  return earnedCredits + result.terms.filter(term => term.index <= termIndex).reduce((sum, term) => sum + term.credits, 0);
}
export function coveragePercent(credits: number): number {
  return Math.round(100 * credits / requiredCredits);
}
export function coverageColor(percent: number): string {
  const value = Math.max(0,Math.min(100,percent));
  return `hsl(${value*.47} 90% ${38+value*.12}%)`;
}
export function describeImpact(baseline: Plan, result: Plan) {
  const targetIndex = baseline.terms.at(-1)?.index ?? -1;
  const targetCredits = projectedCreditsThrough(result, targetIndex);
  return {
    earnedCredits, requiredCredits, targetCredits,
    targetPercent: coveragePercent(targetCredits),
    plannedCredits: projectedCreditsThrough(result),
    moved: courses.filter(course => result.placements[course.id] !== baseline.placements[course.id]),
    delayed: courses.filter(course => result.placements[course.id] !== undefined && result.placements[course.id] > baseline.placements[course.id]),
    status: !result.finish ? 'blocked' : result.terms.length > baseline.terms.length ? 'delayed' : 'on-track',
  };
}
