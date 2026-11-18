import test from 'node:test';
import assert from 'node:assert/strict';
import { plan } from '../src/planner.ts';
import { describeImpact, projectedCreditsThrough } from '../src/impact.ts';

test('a delayed route reduces projection at the original finish without erasing earned credits', () => {
  const baseline = plan(15);
  const result = plan(15, { courseId:'networks', action:'defer', delay:2, creditLimit:15 });
  const impact = describeImpact(baseline, result);
  assert.equal(impact.earnedCredits, 60);
  assert.equal(impact.plannedCredits, 120);
  assert.ok(impact.targetCredits < 120);
  assert.equal(impact.status, 'delayed');
  assert.ok(impact.moved.some(course => course.id === 'networks'));
});
test('excluded prerequisite reports blocked coverage rather than a probability of graduation', () => {
  const baseline = plan(15);
  const result = plan(15, { courseId:'structures', action:'exclude', delay:2, creditLimit:15 });
  const impact = describeImpact(baseline, result);
  assert.equal(result.blocked.length, 7);
  assert.equal(impact.status, 'blocked');
  assert.equal(impact.earnedCredits, 60);
  assert.ok(impact.targetPercent < 100);
  assert.equal(impact.plannedCredits + result.blocked.reduce((sum,c)=>sum+c.credits,0), 120);
});
test('projection accumulates only through the displayed semester and stays monotonic', () => {
  const baseline = plan(15);
  assert.equal(projectedCreditsThrough(baseline, -1), 60);
  assert.equal(projectedCreditsThrough(baseline, 0), 74);
  assert.equal(projectedCreditsThrough(baseline), 120);
  let previous = 60;
  for (const term of baseline.terms) {
    const current = projectedCreditsThrough(baseline, term.index);
    assert.ok(current >= previous && current <= 120);
    previous = current;
  }
});
