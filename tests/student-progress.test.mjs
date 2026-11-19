import { test } from 'node:test';
import assert from 'node:assert/strict';
import { importDegreeWorks } from '../src/data/student-progress.ts';

test('DegreeWorks imports keep in-progress credit separate and drop identity fields', () => {
  const course = { id: 'current', discipline: 'CS', number: '3305', credits: '3' };
  const progress = importDegreeWorks(JSON.stringify({
    auditHeader: { studentId: 'private-id', studentEmail: 'private-email', residentApplied: '26.5',
      transferApplied: '8', residentAppliedInProgress: '3' },
    blockArray: [{ requirementType: 'DEGREE', title: 'Degree', creditsRequired: '124',
      ruleArray: [{ label: 'Major requirements', percentComplete: '50' }] }],
    classInformation: { classArray: [course] },
    inProgress: { classArray: [course] },
  }));
  assert.equal(progress.applied, 34.5);
  assert.equal(progress.required, 124);
  assert.deepEqual(progress.courses.map(({ code, status }) => [code, status]), [['CS 3305', 'In progress']]);
  assert.deepEqual(progress.requirements[0].rules, ['Major requirements']);
  assert.doesNotMatch(JSON.stringify(progress), /private-id|private-email/);
});

test('an audit without a credit total stays unknown and unrelated JSON is rejected', () => {
  const progress = importDegreeWorks('\uFEFF' + JSON.stringify({
    auditHeader: { residentApplied: '10', transferApplied: '0' }, blockArray: [],
  }));
  assert.equal(progress.required, null);
  assert.throws(() => importDegreeWorks('{"student":{}}'), /full DegreeWorks audit/);
});
