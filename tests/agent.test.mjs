import test from 'node:test';
import assert from 'node:assert/strict';
import { parseAudit } from '../src/core/audit.ts';
import { parseCourseInfo } from '../src/core/catalog.ts';
import { buildPlan, defaultSettings, emptyEdits } from '../src/core/plan.ts';
import { applyAction, buildContext, groundQuestion, groundQuestionResult, looksBroken, partialReply, validateAgentReply } from '../src/core/agent.ts';
import { audit, courseRaw } from './fixtures.mjs';

const p = parseAudit(audit);
const catalog = Object.fromEntries(Object.entries(courseRaw).map(([c, raw]) => [c, parseCourseInfo(raw, c)]));

test('asked-for credit limits and named drops return only the corresponding planner actions', () => {
  const settings = defaultSettings();
  const edits = emptyEdits();
  const credits = groundQuestionResult('What if I take 21 credits next term?', p, catalog, edits, settings);
  assert.match(credits.reply, /At 21 credit hours per term/);
  assert.deepEqual(credits.actions, [{ type: 'maxCredits', value: 21 }]);
  const drop = groundQuestionResult('What happens if I drop my capstone?', p, catalog, edits, settings);
  assert.deepEqual(drop.actions, [{ type: 'drop', code: 'IT 4983' }]);
});

test('agent replies are parsed, normalized and stripped of unsafe actions', () => {
  const r = validateAgentReply(JSON.stringify({ reply: 'Try this.', actions: [
    { type: 'drop', code: 'it4983' },
    { type: 'defer', code: 'IT 4983', term: 'Spring 2027' },
    { type: 'defer', code: 'IT 4983', term: 'whenever' },
    { type: 'maxCredits', value: 40 },
    { type: 'rm -rf', code: 'IT 4983' },
    { type: 'summer', value: true },
  ] }));
  assert.equal(r.reply, 'Try this.');
  assert.deepEqual(r.actions, [
    { type: 'drop', code: 'IT 4983' },
    { type: 'defer', code: 'IT 4983', term: 'Spring 2027' },
    { type: 'summer', value: true },
  ]);
  assert.deepEqual(validateAgentReply('plain text answer').actions, []);
});

test('actions only touch courses the student actually has', () => {
  const known = new Set(Object.keys(catalog));
  const inProgress = new Set(p.inProgress.map(c => c.code));
  const e = emptyEdits(); const st = defaultSettings();
  assert.equal(applyAction({ type: 'drop', code: 'IT 4833' }, e, st, known, inProgress), null); // not in progress
  assert.equal(applyAction({ type: 'add', code: 'XYZ 9999' }, e, st, known, inProgress), null); // unknown course
  const deferred = applyAction({ type: 'defer', code: 'IT 4983', term: 'Spring 2027' }, e, st, known, inProgress);
  assert.deepEqual(deferred.edits.drop, ['IT 4983']);
  const restored = applyAction({ type: 'restore', code: 'IT 4983' }, deferred.edits, st, known, inProgress);
  assert.deepEqual(restored.edits, emptyEdits());
});

test('model context carries the plan and live offerings but no identity or grades', () => {
  const plan = buildPlan(p, catalog, emptyEdits(), defaultSettings());
  const ctx = buildContext(p, plan, emptyEdits(), defaultSettings(), catalog, plan.finish);
  assert.match(ctx, /IT 4983 IT Capstone Project, 3 cr\. Offered: Spring 2027/);
  assert.match(ctx, /Original finish: Spring 2027/);
  for (const secret of ['Test, Student', '000000000', 'x@example.edu', '3.9', 'REGD']) assert.ok(!ctx.includes(secret));
});

test('garbled model output is detected so the bridge can retry', () => {
  assert.ok(looksBroken('{'));
  assert.ok(looksBroken('{"reply": "'));
  assert.ok(!looksBroken('{"reply":"You have two courses left.","actions":[]}'));
});

test('context spells out what is left, including blocked courses', () => {
  const plan = buildPlan(p, catalog, { ...emptyEdits(), drop: ['IT 4983'] }, defaultSettings());
  const ctx = buildContext(p, plan, { ...emptyEdits(), drop: ['IT 4983'] }, defaultSettings(), catalog, 'Spring 2027');
  assert.match(ctx, /WHAT IS LEFT TO GRADUATE: pass IT 4823 this term; take .*IT 4983 in Spring 2027/);
});

test('a half-streamed JSON answer shows its reply text so far', () => {
  assert.equal(partialReply('{"reply": "You have two cour'), 'You have two cour');
  assert.equal(partialReply('{"reply":"Say \\"hi\\"\\nnow","actions":[]}'), 'Say "hi"\nnow');
  assert.equal(partialReply('{"act'), '');
});

test('verified what-ifs give the model real outcomes, including summer-only courses', () => {
  const plan = buildPlan(p, catalog, emptyEdits(), defaultSettings());
  const ctx = buildContext(p, plan, emptyEdits(), defaultSettings(), catalog, plan.finish);
  assert.match(ctx, /- Drop IT 4983 IT Capstone Project: finish Spring 2027/);
  assert.match(ctx, /VERIFIED WHAT-IFS/);
});

test('questions about a course are answered from the planner, by code or by name', () => {
  const byName = groundQuestion('If I drop my capstone project, when do I graduate?', p, catalog, emptyEdits(), defaultSettings());
  assert.match(byName, /If the student drops IT 4983 IT Capstone Project, graduation stays Spring 2027 \(no change\)/);
  const byCode = groundQuestion('what if i drop it4823', p, catalog, emptyEdits(), defaultSettings());
  assert.match(byCode, /drops IT 4823/);
  assert.equal(groundQuestion('hello', p, catalog, emptyEdits(), defaultSettings()), null);
  assert.match(groundQuestion('can I finish sooner?', p, catalog, emptyEdits(), defaultSettings()), /Options:/);
});
