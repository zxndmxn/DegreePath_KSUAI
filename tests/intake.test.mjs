import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { inspectStudentImport, inspectStudentJson } from '../src/data/intake.ts';
const fixture = async name => JSON.parse(await readFile(new URL(`../data/fixtures/${name}.json`, import.meta.url), 'utf8'));
const catalog = await fixture('synthetic-catalog.v1');
const midpoint = await fixture('student-midpoint');

test('synthetic catalog has 48 distinct courses, three internally consistent 120-credit programs, and 576 offering records', () => {
  const byId = new Map(catalog.courses.map(c => [c.id, c]));
  assert.equal(byId.size, 48);
  assert.equal(catalog.programs.length, 3);
  assert.equal(catalog.offerings.length, 576);
  for (const p of catalog.programs) {
    assert.equal(p.groups.reduce((n, g) => n + g.minimumCredits, 0), 120);
    const used = new Set();
    for (const g of p.groups) {
      assert.ok(g.courseIds.every(id => byId.has(id)));
      assert.equal(new Set(g.courseIds).size, g.courseIds.length);
      assert.ok(g.courseIds.every(id => !used.has(id)));
      for (const id of g.courseIds) used.add(id);
      const available = g.courseIds.reduce((n, id) => n + byId.get(id).credits, 0);
      assert.ok(available >= g.minimumCredits);
      if (g.kind === 'all_courses') assert.equal(available, g.minimumCredits);
    }
  }
  for (const o of catalog.offerings) assert.ok(byId.has(o.courseId));
});

test('all six student fixtures stage for review; no import claims academic readiness', async () => {
  for (const name of ['student-new', 'student-midpoint', 'student-transfer', 'student-repeat', 'student-near-finish', 'student-unresolved']) {
    const source = await fixture(name);
    const before = JSON.stringify(source);
    const result = inspectStudentImport(source, catalog);
    assert.ok(result.candidate, `${name}: ${JSON.stringify(result.issues)}`);
    assert.equal(result.readyForReview, true);
    assert.equal(result.readyToPlan, false);
    assert.equal(JSON.stringify(source), before, 'Importer mutated source input');
  }
});

test('unknown and pending transfer courses retain provenance without invented equivalencies', async () => {
  const result = inspectStudentImport(await fixture('student-transfer'), catalog);
  const unresolved = result.candidate.attempts.find(a => a.rawCode === 'EXT 9999');
  assert.equal(unresolved.courseId, null);
  assert.equal(unresolved.equivalency, 'pending');
  assert.ok(unresolved.sourceLocator);
  assert.ok(result.issues.some(i => i.code === 'PENDING_TRANSFER'));
  assert.ok(result.issues.some(i => i.code === 'UNRESOLVED_COURSE'));
});

test('failed attempts, repeats, withdrawals, and in-progress work are preserved separately', async () => {
  const result = inspectStudentImport(await fixture('student-repeat'), catalog);
  const repeated = result.candidate.attempts.filter(a => a.courseId === 'demo-1001');
  assert.equal(repeated.length, 2);
  assert.deepEqual(repeated.map(a => a.grade), ['F', 'B']);
  assert.equal(result.candidate.attempts.find(a => a.grade === 'IP').earnedCredits, 0);
  assert.equal(result.candidate.attempts.find(a => a.grade === 'W').earnedCredits, 0);
  assert.ok(result.issues.some(i => i.code === 'PROJECTED_OUTCOME'));
});

test('malformed last row and conflicting IDs reject the entire staged import without changing current state', async () => {
  const current = inspectStudentImport(midpoint, catalog).candidate;
  const before = JSON.stringify(current);
  for (const name of ['invalid-final-row', 'invalid-duplicate-conflict']) {
    const result = inspectStudentImport(await fixture(name), catalog);
    assert.equal(result.candidate, null);
    assert.equal(result.readyForReview, false);
    assert.ok(result.issues.some(i => i.severity === 'error'));
    assert.equal(JSON.stringify(current), before);
  }
});

test('exact duplicate attempt is collapsed but distinct repeated attempts are retained', () => {
  const input = structuredClone(midpoint);
  input.attempts.push(structuredClone(input.attempts[0]));
  const result = inspectStudentImport(input, catalog);
  assert.equal(result.candidate.attempts.length, midpoint.attempts.length);
  assert.ok(result.issues.some(i => i.code === 'DUPLICATE_ROW'));
});

test('aliases normalize without dropping lab suffixes, inventing courses, or forcing credit values', async () => {
  const result = inspectStudentImport(await fixture('student-unresolved'), catalog);
  assert.equal(result.candidate.attempts[2].courseId, 'demo-1003');
  assert.equal(result.candidate.attempts[3].attemptedCredits, 3);
  assert.ok(result.issues.some(i => i.code === 'CREDIT_MISMATCH'));
  const input = structuredClone(midpoint);
  input.attempts[0].rawCode += 'L';
  assert.equal(inspectStudentImport(input, catalog).candidate.attempts[0].courseId, null);
});

test('bad JSON, oversized files, impossible dates, and a 2,001-row import return issues rather than throwing', () => {
  assert.equal(inspectStudentJson('{', catalog).issues[0].code, 'INVALID_JSON');
  assert.equal(inspectStudentJson(' '.repeat(2 * 1024 * 1024 + 1), catalog).issues[0].code, 'FILE_TOO_LARGE');
  const input = structuredClone(midpoint);
  input.auditAsOf = '2026-02-30';
  assert.equal(inspectStudentImport(input, catalog).candidate, null);
  input.attempts = Array(2001).fill(input.attempts[0]);
  assert.ok(inspectStudentImport(input, catalog).issues.some(i => i.code === 'INVALID_ROWS'));
});

test('malformed field values return results without unsafe coercion', () => {
  for (const field of ['status', 'grade', 'equivalency', 'attemptedCredits', 'earnedCredits', 'rawCode', 'term']) {
    for (const value of [null, [], { toString: null }, true, -1, 'unsupported']) {
      const input = structuredClone(midpoint);
      input.attempts[0][field] = value;
      assert.doesNotThrow(() => inspectStudentImport(input, catalog));
    }
  }
  for (const root of [null, [], 'text', 12]) assert.equal(inspectStudentImport(root, catalog).candidate, null);
});

test('real program discovery is a provenance-bearing index, never advertised as verified planning coverage', async () => {
  const index = JSON.parse(await readFile(new URL('../data/research/ksu-program-discovery.json', import.meta.url), 'utf8'));
  assert.equal(index.entries.length, 291);
  assert.equal(index.sources.length, 8);
  assert.equal(new Set(index.entries.map(e => e.entryId)).size, index.entries.length);
  for (const entry of index.entries) {
    assert.equal(entry.coverage, 'name_discovered');
    assert.equal(entry.plannerSupported, false);
    assert.equal(entry.rulesReviewed, false);
    assert.equal(entry.catalogYear, null);
    assert.ok(entry.discoveredFrom.startsWith('https://www.kennesaw.edu/degrees-programs/'));
    assert.ok(entry.sourceLocator);
  }
});
