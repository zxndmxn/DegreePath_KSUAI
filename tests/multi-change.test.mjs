import test from 'node:test';
import assert from 'node:assert/strict';
import { plan, updateCourseChange, removeCourseChange, scenarioChanges, completed } from '../src/planner.ts';

test('edits to two different courses accumulate and obey both constraints',()=>{
  const baseline=plan(15);
  let scenario=updateCourseChange(undefined,{courseId:'calc2',action:'defer',delay:2},15);
  scenario=updateCourseChange(scenario,{courseId:'networks',action:'defer',delay:3},15);
  const result=plan(15,scenario);
  assert.equal(scenarioChanges(scenario).length,2);
  assert.ok(result.placements.calc2>=baseline.placements.calc2+2);
  assert.ok(result.placements.networks>=baseline.placements.networks+3);
  const earned=new Set(completed);
  for(const term of result.terms){
    assert.ok(term.credits<=15);
    for(const course of term.courses) assert.ok(course.prerequisites.every(id=>earned.has(id)));
    for(const course of term.courses){assert.ok(!earned.has(course.id));earned.add(course.id);}
  }
});
test('updating and removing one edit preserves the other; JSON restore preserves all edits',()=>{
  let scenario=updateCourseChange(undefined,{courseId:'calc2',action:'exclude',delay:2},15);
  scenario=updateCourseChange(scenario,{courseId:'networks',action:'defer',delay:3},15);
  scenario=updateCourseChange(scenario,{courseId:'calc2',action:'defer',delay:1},15);
  assert.equal(scenarioChanges(scenario).length,2);
  const restored=JSON.parse(JSON.stringify(scenario));
  assert.deepEqual(plan(15,restored),plan(15,scenario));
  const reduced=removeCourseChange(restored,'calc2');
  assert.deepEqual(scenarioChanges(reduced),[{courseId:'networks',action:'defer',delay:3}]);
  assert.equal(removeCourseChange(reduced,'networks'),undefined);
});
test('combined exclusions cannot magically satisfy unmet requirements',()=>{
  let scenario=updateCourseChange(undefined,{courseId:'structures',action:'exclude',delay:2},15);
  scenario=updateCourseChange(scenario,{courseId:'networks',action:'exclude',delay:2},15);
  const result=plan(15,scenario);
  assert.equal(result.finish,null);
  assert.ok(result.blocked.some(c=>c.id==='structures'));
  assert.ok(result.blocked.some(c=>c.id==='networks'));
  assert.ok(result.blocked.some(c=>c.id==='security'));
  assert.throws(()=>plan(15,{...scenario,changes:[scenario.changes[0],scenario.changes[0]]}),/Invalid scenario/);
});
test('excluding Calculus II and Programming II leaves one partial semester, not an early graduation',()=>{
  let scenario=updateCourseChange(undefined,{courseId:'calc2',action:'exclude',delay:2},15);
  scenario=updateCourseChange(scenario,{courseId:'prog2',action:'exclude',delay:2},15);
  const result=plan(15,scenario);
  assert.equal(result.finish,null);
  assert.equal(result.blocked.length,14);
  assert.equal(result.terms.length,1);
  assert.equal(result.terms[0].label,'Spring 2027');
  assert.equal(result.terms[0].credits,13);
  assert.deepEqual(result.terms[0].courses.map(c=>c.id),['writing','ethics','physics','elective']);
});
