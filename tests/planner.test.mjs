import test from 'node:test';
import assert from 'node:assert/strict';
import { courses, completed, plan, dependencies } from '../src/planner.ts';

function checkPlan(result, limit) {
  const seen = new Set(completed);
  for (const term of result.terms) {
    assert.ok(term.credits <= limit);
    assert.equal(term.credits, term.courses.reduce((n, c) => n + c.credits, 0));
    for (const course of term.courses) {
      assert.ok(!seen.has(course.id), `Duplicate ${course.id}`);
      assert.ok(course.prerequisites.every(p => seen.has(p)), `Prerequisites for ${course.id}`);
      assert.equal(result.placements[course.id], term.index);
    }
    for (const c of term.courses) seen.add(c.id);
  }
  assert.equal(seen.size - completed.length + result.blocked.length, courses.length);
}

test('sample has 18 remaining courses, 60 credits, and a six-term baseline', () => {
  assert.equal(courses.length, 18);
  assert.equal(courses.reduce((n, c) => n + c.credits, 0), 60);
  const baseline = plan();
  assert.equal(baseline.terms.length, 6);
  assert.equal(baseline.finish, 'Fall 2029');
  assert.deepEqual(baseline.blocked, []);
  checkPlan(baseline, 15);
});
test('two-term Calculus II deferral has one-term graduation impact', () => {
  const result = plan(15, { courseId: 'calc2', action: 'defer', delay: 2, creditLimit: 15 });
  assert.equal(result.placements.calc2, 2);
  assert.equal(result.terms.length, 7);
  assert.equal(result.finish, 'Spring 2030');
});
test('one-term deferral fits existing slack without a later finish', () => {
  const result = plan(15, { courseId: 'calc2', action: 'defer', delay: 1, creditLimit: 15 });
  assert.equal(result.finish, plan(15).finish);
  assert.ok(result.placements.calc2 >= 1);
});
test('excluding Calculus II blocks it and every dependent course', () => {
  const result = plan(15, { courseId: 'calc2', action: 'exclude', delay: 2, creditLimit: 15 });
  const { direct, downstream } = dependencies('calc2');
  assert.equal(result.finish, null);
  assert.deepEqual(new Set(result.blocked.map(c => c.id)), new Set(['calc2', ...direct.map(c => c.id), ...downstream.map(c => c.id)]));
  assert.ok(result.terms.some(t => t.courses.some(c => c.id === 'database')));
});
test('all 270 defer/avoid combinations respect capacity, ordering, and constraints', () => {
  let count = 0;
  for (const limit of [12, 15, 18]) for (const course of courses) {
    const baseline = plan(limit);
    checkPlan(baseline, limit);
    for (const delay of [1, 2, 3, 4]) {
      const result = plan(limit, { courseId: course.id, action: 'defer', delay, creditLimit: limit });
      checkPlan(result, limit);
      assert.equal(result.blocked.length, 0);
      assert.ok(result.placements[course.id] >= baseline.placements[course.id] + delay);
      count++;
    }
    const excluded = plan(limit, { courseId: course.id, action: 'exclude', delay: 2, creditLimit: limit });
    checkPlan(excluded, limit);
    assert.ok(excluded.blocked.some(c => c.id === course.id));
    assert.equal(excluded.finish, null);
    count++;
  }
  assert.equal(count, 270);
});
