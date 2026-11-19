import test from 'node:test';
import assert from 'node:assert/strict';
import { parseAudit } from '../src/core/audit.ts';
import { parseCourseInfo, parsePrereqRows, prereqText } from '../src/core/catalog.ts';
import { buildPlan, defaultSettings, diffPlans, emptyEdits } from '../src/core/plan.ts';
import { nextTerm } from '../src/core/terms.ts';
import { audit, courseRaw } from './fixtures.mjs';

const pathway = parseAudit(JSON.stringify(audit));
const catalog = Object.fromEntries(Object.entries(courseRaw).map(([c, raw]) => [c, parseCourseInfo(raw, c)]));

test('audit import keeps the pathway and drops identity and grades', () => {
  const text = JSON.stringify(pathway);
  for (const secret of ['Test, Student', '000000000', 'x@example.edu', '3.9', 'letterGrade', 'gpa', 'REGD']) {
    assert.ok(!text.includes(secret), `leaked ${secret}`);
  }
  assert.equal(pathway.activeTerm, 'Fall 2026');
  assert.equal(pathway.credits.applied, 110);
  assert.equal(pathway.credits.inProgress, 6);
  assert.deepEqual(pathway.inProgress.map(c => c.code), ['IT 4823', 'IT 4983']);
  assert.equal(pathway.completed.length, 3);
  assert.equal(pathway.concentration, 'Cyber Operations Security');
});

test('open rules separate in-progress coverage from real gaps and strip wildcards', () => {
  const cap = pathway.open.find(r => r.id === 'r-cap');
  const elec = pathway.open.find(r => r.id === 'r-elec');
  assert.equal(cap.credits, 0);
  assert.deepEqual(cap.satisfiedBy, ['IT 4983']);
  assert.equal(elec.credits, 3);
  assert.deepEqual(elec.options, ['IT 4833', 'IT 4893']);
});

test('banner prerequisite rows become a boolean tree', () => {
  assert.equal(prereqText(catalog['IT 4983'].prereq), 'IT 3423 and IT 4323 (same term ok) and IT 4823 (same term ok)');
  assert.equal(prereqText(catalog['IT 4823'].prereq), 'CSE 2300 or MATH 2345');
  assert.equal(prereqText(catalog['IT 4833'].prereq), 'IT 4323 or ECET 3400');
  assert.equal(parsePrereqRows([]).kind, 'none');
});

test('term stepping skips summer unless enabled', () => {
  assert.equal(nextTerm('Fall 2026', false), 'Spring 2027');
  assert.equal(nextTerm('Spring 2027', false), 'Fall 2027');
  assert.equal(nextTerm('Spring 2027', true), 'Summer 2027');
});

test('baseline schedules the open elective in its published term', () => {
  const plan = buildPlan(pathway, catalog, emptyEdits(), defaultSettings());
  assert.equal(plan.terms[0].label, 'Fall 2026');
  assert.equal(plan.terms[1].label, 'Spring 2027');
  assert.deepEqual(plan.terms[1].courses.map(c => c.code), ['IT 4833']);
  assert.equal(plan.terms[1].courses[0].risk, 'watch'); // only 2 seats
  assert.equal(plan.finish, 'Spring 2027');
  assert.equal(plan.terms.at(-1).percentAfter, 100);
});

test('dropping capstone retakes it next spring, and both drops pair as co-requisites', () => {
  const base = buildPlan(pathway, catalog, emptyEdits(), defaultSettings());
  const one = buildPlan(pathway, catalog, { ...emptyEdits(), drop: ['IT 4983'] }, defaultSettings());
  const spring = one.terms.find(t => t.label === 'Spring 2027');
  assert.ok(spring.courses.some(c => c.code === 'IT 4983' && c.risk === 'moved'));
  assert.deepEqual(diffPlans(base, one).map(m => [m.code, m.from, m.to]), [['IT 4983', 'Fall 2026', 'Spring 2027']]);

  const both = buildPlan(pathway, catalog, { ...emptyEdits(), drop: ['IT 4983', 'IT 4823'] }, defaultSettings());
  const s = both.terms.find(t => t.label === 'Spring 2027').courses.map(c => c.code);
  assert.ok(s.includes('IT 4823') && s.includes('IT 4983'));
  assert.ok(s.indexOf('IT 4823') < s.indexOf('IT 4983'));
});

test('deferring past the published schedule assumes the same season repeats, flagged', () => {
  const plan = buildPlan(pathway, catalog, { ...emptyEdits(), drop: ['IT 4983'], defer: { 'IT 4983': 'Fall 2027' } }, defaultSettings());
  assert.equal(plan.finish, 'Spring 2028');
  const cap = plan.terms.find(t => t.label === 'Spring 2028').courses.find(c => c.code === 'IT 4983');
  assert.equal(cap.risk, 'moved');
  assert.match(cap.notes.join(' '), /Beyond the published schedule/);
});

test('a fall-only course skips spring and waits for the next fall', () => {
  const fallOnly = { ...catalog, 'IT 4983': { ...catalog['IT 4983'], offered: ['Fall 2026'] } };
  const plan = buildPlan(pathway, fallOnly, { ...emptyEdits(), drop: ['IT 4983'], defer: { 'IT 4983': 'Spring 2027' } }, { maxCredits: 15, summer: false });
  assert.ok(plan.terms.some(t => t.label === 'Fall 2027' && t.courses.some(c => c.code === 'IT 4983')));
});

test('unpublished courses can still be chosen but are flagged to watch', () => {
  const plan = buildPlan(pathway, catalog, { ...emptyEdits(), choose: { 'r-elec': ['IT 4893'] } }, defaultSettings());
  const c = plan.terms.flatMap(t => t.courses).find(x => x.code === 'IT 4893');
  assert.equal(c.risk, 'watch');
  assert.match(c.notes.join(' '), /published/);
});

test('credit cap pushes overflow to a later term', () => {
  const plan = buildPlan(pathway, catalog, { ...emptyEdits(), drop: ['IT 4983', 'IT 4823'] }, { maxCredits: 3, summer: true });
  assert.ok(plan.terms.every(t => t.credits <= 3));
  assert.equal(plan.terms.find(t => t.courses.some(c => c.code === 'IT 4823')).label, 'Spring 2027');
});

test('a far deferral is honored instead of giving up on empty terms', () => {
  const plan = buildPlan(pathway, catalog, { ...emptyEdits(), drop: ['IT 4823', 'IT 4983'], defer: { 'IT 4823': 'Fall 2029' } }, defaultSettings());
  const t = plan.terms.find(x => x.courses.some(c => c.code === 'IT 4823'));
  assert.equal(t.label, 'Spring 2030');
  assert.ok(plan.terms.find(x => x.label === 'Spring 2030').courses.some(c => c.code === 'IT 4983'));
});

test('blocked courses explain why in plain words', () => {
  const summerOnly = { ...catalog, 'IT 4823': { ...catalog['IT 4823'], offered: ['Summer 2027'] } };
  const plan = buildPlan(pathway, summerOnly, { ...emptyEdits(), drop: ['IT 4823', 'IT 4983'] }, defaultSettings());
  const why = Object.fromEntries(plan.blocked.map(b => [b.code, b.reason]));
  assert.match(why['IT 4823'], /Only offered in summer/);
  assert.match(why['IT 4983'], /Waits on IT 4823/);
});
