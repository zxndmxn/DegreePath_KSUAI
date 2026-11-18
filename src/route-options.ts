import { courses, plan, type CourseChange, type Scenario } from './planner.ts';
import { describeImpact } from './impact.ts';

export interface RouteRequest {
  requestId: string; revision: number; dataset: 'degreepath.sample.v1';
  creditLimit: number; changes: CourseChange[]; goal: 'balanced' | 'lighter' | 'finish'; context: string;
}
export interface RouteOption {
  id: string; title: string; creditLimit: number; changes: CourseChange[];
  finish: string | null; semesters: number; blocked: string[]; coverage: number;
  moved: { title: string; from: string; to: string }[];
  restoredCourses: string[];
}
export interface RouteComparison {
  requestId: string; revision: number; dataset: RouteRequest['dataset']; baselineFinish: string | null;
  routes: RouteOption[]; assumptions: string[];
}
const limits = [12,15,18];
export function validateRouteRequest(raw: unknown): RouteRequest {
  if (!raw || typeof raw !== 'object') throw new Error('A structured planning request is required.');
  const value = raw as RouteRequest;
  if (value.dataset !== 'degreepath.sample.v1') throw new Error('This demo supports only the fictional sample dataset.');
  if (typeof value.requestId !== 'string' || !/^[a-zA-Z0-9_-]{1,80}$/.test(value.requestId)
    || !Number.isInteger(value.revision) || value.revision<0 || value.revision>1e9) throw new Error('Invalid request identity or revision.');
  if (!limits.includes(value.creditLimit) || !['balanced','lighter','finish'].includes(value.goal)
    || typeof value.context !== 'string' || value.context.length>1000 || !Array.isArray(value.changes)
    || value.changes.length>courses.length) throw new Error('Invalid planning preferences.');
  const changes=value.changes.map(change=>{
    if (!change || !courses.some(c=>c.id===change.courseId) || !['defer','exclude'].includes(change.action)
      || !Number.isInteger(change.delay) || change.delay<1 || change.delay>4) throw new Error('Invalid course change.');
    return {courseId:change.courseId,action:change.action,delay:change.delay};
  });
  if (new Set(changes.map(c=>c.courseId)).size!==changes.length) throw new Error('A course has conflicting duplicate changes.');
  return {requestId:value.requestId,revision:value.revision,dataset:value.dataset,creditLimit:value.creditLimit,goal:value.goal,context:value.context,changes};
}
export function scenarioForRoute(creditLimit: number, changes: CourseChange[]): Scenario | undefined {
  return changes.length ? {...changes.at(-1)!,creditLimit,changes:changes.map(c=>({...c}))} : undefined;
}
export function compareRoutes(raw: unknown): RouteComparison {
  const request=validateRouteRequest(raw);
  const baseline=plan(request.creditLimit);
  const candidates=limits.map(creditLimit=>({id:`cap-${creditLimit}`,title:creditLimit===12?'Lighter semesters':creditLimit===18?'Higher credit capacity':'Standard pace',creditLimit,changes:request.changes}));
  if(request.changes.some(c=>c.action==='exclude')) candidates.push({id:'restore-required',title:'Restore excluded courses',creditLimit:request.creditLimit,changes:request.changes.filter(c=>c.action!=='exclude')});
  const routes: RouteOption[]=candidates.map(candidate=>{
    const result=plan(candidate.creditLimit,scenarioForRoute(candidate.creditLimit,candidate.changes));
    const impact=describeImpact(baseline,result);
    return {...candidate,changes:candidate.changes.map(c=>({...c})),finish:result.finish,semesters:result.terms.length,
      blocked:result.blocked.map(c=>c.title),coverage:impact.targetPercent,
      moved:impact.moved.map(c=>({title:c.title,from:baseline.terms.find(t=>t.index===baseline.placements[c.id])!.label,to:result.terms.find(t=>t.index===result.placements[c.id])?.label ?? 'Not scheduled'})),
      restoredCourses:request.changes.filter(c=>c.action==='exclude'&&!candidate.changes.some(item=>item.courseId===c.courseId)).map(c=>courses.find(item=>item.id===c.courseId)!.title)};
  });
  routes.sort((a,b)=>{
    if (!!a.finish!==!!b.finish) return a.finish?-1:1;
    if(request.goal==='lighter') return a.creditLimit-b.creditLimit || a.id.localeCompare(b.id);
    if(request.goal==='finish') return a.semesters-b.semesters || a.creditLimit-b.creditLimit;
    return Number(b.creditLimit===request.creditLimit)-Number(a.creditLimit===request.creditLimit) || a.creditLimit-b.creditLimit;
  });
  return {requestId:request.requestId,revision:request.revision,dataset:request.dataset,baselineFinish:baseline.finish,routes,
    assumptions:['Fictional 18-course curriculum; 60 earned credits remain unchanged.','Every remaining course is assumed offered each fall and spring.','Deferrals are relative to the baseline at each candidate credit limit.','Only these candidate routes were evaluated; the greedy scheduler does not prove an optimal finish.','Context is for the agent to interpret; free text never changes academic constraints automatically.']};
}
export function routeFragment(creditLimit: number, changes: CourseChange[]): string {
  return '#route='+encodeURIComponent(JSON.stringify({creditLimit,changes}));
}
export function parseRouteFragment(hash: string): {creditLimit:number;changes:CourseChange[]} | null {
  if(!hash.startsWith('#route=')) return null;
  if(hash.length>16000) throw new Error('Route link is too large.');
  const raw=JSON.parse(decodeURIComponent(hash.slice(7)));
  const request=validateRouteRequest({...raw,requestId:'route-link',revision:0,dataset:'degreepath.sample.v1',goal:'balanced',context:''});
  return {creditLimit:request.creditLimit,changes:request.changes};
}
