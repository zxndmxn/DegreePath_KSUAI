import test from 'node:test';
import assert from 'node:assert/strict';
import { codeFromD2L, dueWithin, parseWorkload, shortDate, workloadLine } from '../src/core/d2l.ts';

const courses = [
  { OrgUnit: { Id: 1, Code: 'CO.430.IT4983.85844.20272', Name: 'IT Capstone Project Section 01 Fall Semester 2026 CO' }, Access: { IsActive: true } },
  { OrgUnit: { Id: 2, Code: 'CO.430.IT4883.XLS.IT 6.20272', Name: 'Infrastructure Defense XLS Group IT 6 Fall Semester 2026 CO' }, Access: { IsActive: true } },
  { OrgUnit: { Id: 3, Code: 'Fall2026KSUSeniorOwls', Name: 'Fall 2026 KSU Senior Owls' }, Access: { IsActive: true } },
];
const due = [
  { OrgUnitId: '1', ItemName: 'Final Report', ItemType: 1, DueDate: '2026-12-07T04:59:59.000Z', DateCompleted: null, Grade: 'A', Score: 99 },
  { OrgUnitId: '1', ItemName: 'Sprint 4 Quiz', ItemType: 1, DueDate: '2026-11-23T04:59:59.000Z', DateCompleted: null },
  { OrgUnitId: '2', ItemName: 'Lab 9', ItemType: 1, DueDate: '2026-11-20T04:59:59.000Z', DateCompleted: '2026-11-18T10:00:00Z' },
  { OrgUnitId: '3', ItemName: 'Senior survey', ItemType: 1, DueDate: '2026-11-21T04:59:59.000Z' },
];
const now = Date.parse('2026-11-19T15:00:00Z');

test('D2L section codes map to DegreeWorks course codes', () => {
  assert.equal(codeFromD2L('CO.430.IT4983.85844.20272'), 'IT 4983');
  assert.equal(codeFromD2L('CO.430.IT4883.XLS.IT 6.20272'), 'IT 4883');
  assert.equal(codeFromD2L('Fall2026KSUSeniorOwls'), null);
});

test('workload keeps titles and dates only, never grades', () => {
  const w = parseWorkload(courses, due, new Date(now));
  assert.deepEqual(Object.keys(w.courses).sort(), ['IT 4883', 'IT 4983']);
  assert.equal(w.courses['IT 4983'].name, 'IT Capstone Project');
  assert.equal(w.courses['IT 4983'].items[0].type, 'Quiz');
  const text = JSON.stringify(w);
  assert.ok(!text.includes('"A"') && !text.includes('99') && !text.includes('Senior survey'));
});

test('remaining work and the this-week list skip completed items', () => {
  const w = parseWorkload(courses, due, new Date(now));
  assert.equal(workloadLine(w.courses['IT 4983'], now), '2 due left · next Sun, Nov 22');
  assert.equal(workloadLine(w.courses['IT 4883'], now), 'Nothing left due on D2L');
  assert.deepEqual(dueWithin(w, 7, now).map(i => i.title), ['Sprint 4 Quiz']);
  assert.equal(shortDate('2026-12-07T04:59:59.000Z'), 'Sun, Dec 6');
});

test('item types are read from names like Quiz4 and Midterm2', () => {
  const w = parseWorkload(courses, [{ OrgUnitId: '1', ItemName: 'Quiz4-Risk', ItemType: 1, DueDate: '2026-11-23T04:59:59Z' }, { OrgUnitId: '1', ItemName: 'Midterm2', ItemType: 1, DueDate: '2026-11-24T04:59:59Z' }], new Date(now));
  assert.deepEqual(w.courses['IT 4983'].items.map(i => i.type), ['Quiz', 'Exam']);
});
