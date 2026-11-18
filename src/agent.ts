import './agent.css';
import {compareRoutes,validateRouteRequest,routeFragment,type RouteRequest,type RouteComparison,type RouteOption} from './route-options';
import {courses} from './planner';

interface ItAPI {
  action(name:string,data:unknown):Promise<unknown>;
  stage(key:string,value:unknown):void;
  commit(name:string):Promise<unknown>;
  onState(fn:(state:Record<string,unknown>)=>void):void;
  store:{get(key:string):unknown;set(key:string,value:unknown):Promise<unknown>};
}
const it=(window as unknown as {It?:ItAPI}).It;
const app=document.querySelector<HTMLDivElement>('#agent-app')!;
const mainURL='http://127.0.0.1:4173/';
const esc=(value:string)=>value.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[c]!);
const mark='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true"><path d="M6 19V5m0 10c0-5 12-2 12-10"/><circle cx="6" cy="4" r="2.2"/><circle cx="18" cy="4" r="2.2"/><circle cx="6" cy="20" r="2.2"/></svg>';
let draft:RouteRequest={requestId:crypto.randomUUID(),revision:0,dataset:'degreepath.sample.v1',creditLimit:15,changes:[],goal:'balanced',context:''};
try{
  if(location.hash.startsWith('#request='))draft=validateRouteRequest(JSON.parse(decodeURIComponent(location.hash.slice(9))));
}catch{}
let reply:RouteComparison|undefined;
let message='Choose what matters. Compare the calculated routes.';
let explanation='';
let error='';
let page=0;
let itReady=false;
let replying=false;
let initialized=false;
let lastHandoff='';
function remember(){if(itReady)void it!.store.set('draft',draft).catch(e=>{error=String(e);render();});}
function changeGoal(goal:RouteRequest['goal']){draft={...draft,goal,revision:draft.revision+1};reply=undefined;explanation='';page=0;remember();render();}
function render(){
  const routes=reply?.routes.slice(page*3,page*3+3)??[];
  app.innerHTML=`<header><a class="brand" href="${mainURL}" target="_blank" rel="noopener noreferrer">${mark}<strong>DegreePath</strong></a><span class="connection">${itReady?'It workspace · two-way actions':'Local route comparison'}</span><a class="back" href="${mainURL+routeFragment(draft.creditLimit,draft.changes)}" target="_blank" rel="noopener noreferrer">My plan ↗</a></header>
  <main><div class="title-row"><div><span class="eyebrow">PLAN WITH YOUR AGENT</span><h1>One decision. See your options.</h1></div><span class="sample">Fictional sample</span></div>
  <section class="preferences" aria-label="Planning preferences"><div><h2>What matters most?</h2><div class="goals" role="group" aria-label="Planning goal">${[['balanced','Compare both'],['lighter','Lighter semesters'],['finish','Earlier finish']].map(([id,label])=>`<button data-goal="${id}" aria-pressed="${draft.goal===id}">${label}</button>`).join('')}</div><div class="draft-changes">${draft.changes.length?draft.changes.map(c=>`<span>${esc(courses.find(item=>item.id===c.courseId)!.title)} · ${c.action==='exclude'?'exclude':`${c.delay} terms later`}</span>`).join(''):'<span>Original sample plan · no course changes</span>'}</div></div><div><label for="agent-context">Tell the agent what matters</label><textarea id="agent-context" maxlength="1000" rows="2" placeholder="For example: explain which route keeps a lighter workload without a later finish.">${esc(draft.context)}</textarea><div class="compare-actions"><button id="compare" class="primary">${itReady?'Ask agent to compare':'Compare calculated routes'} ${mark}</button>${itReady?'<button id="local-preview" class="secondary">Preview locally</button>':''}</div></div></section>
  <div class="demo-presets" role="group" aria-label="Load a demo case"><span>Try a case</span><button data-preset="baseline">On track</button><button data-preset="delay">Delay Calculus II</button><button data-preset="exclude">Exclude Programming II</button>${!it?'<button id="continue-it" class="it-entry">Continue in It ↗</button>':''}</div>
  <div class="status" role="status" aria-live="polite"><span class="status-dot"></span>${esc(message)}</div>${error?`<p class="error" role="alert">${esc(error)}</p>`:''}
  ${reply?`<section class="route-grid" aria-label="Calculated route options">${routes.map(route=>routeCard(route)).join('')}</section>${reply.routes.length>3?`<div class="route-pager"><button id="previous" ${page===0?'disabled':''}>Previous options</button><span>${page+1} / ${Math.ceil(reply.routes.length/3)}</span><button id="next" ${page>=Math.ceil(reply.routes.length/3)-1?'disabled':''}>More options</button></div>`:''}`:`<section class="empty"><div>${mark}</div><h2>Compare real calculations from this sample</h2><p>Credit limits, existing course edits, finish dates and blocked requirements stay connected.</p></section>`}
  ${explanation?`<section class="agent-answer"><h2>Agent explanation</h2><p>${esc(explanation)}</p></section>`:itReady&&replying?'<section class="agent-answer waiting"><h2>Agent request queued</h2><p>The calculated routes are available below. The connected agent can return an explanation here; a route calculation alone is not an AI reply.</p></section>':''}
  <details class="assumptions"><summary>Sources and assumptions</summary><p>${reply?reply.assumptions.map(esc).join(' '):'Fictional 18-course graph. No student account, real audit or official KSU eligibility is connected.'} The agent sees the selected preferences and context when you submit.</p></details></main>`;
  app.querySelectorAll<HTMLButtonElement>('[data-goal]').forEach(b=>b.onclick=()=>changeGoal(b.dataset.goal as RouteRequest['goal']));
  app.querySelector<HTMLTextAreaElement>('#agent-context')!.oninput=e=>{
    draft={...draft,context:(e.target as HTMLTextAreaElement).value,revision:draft.revision+1};
    reply=undefined;explanation='';replying=false;
    app.querySelectorAll('.route-grid,.route-pager,.agent-answer').forEach(el=>el.remove());
    message='Preferences changed. Compare again for an up-to-date response.';
    app.querySelector('.status')!.textContent=message;remember();
  };
  app.querySelector<HTMLButtonElement>('#compare')!.onclick=()=>void compare(!!itReady);
  app.querySelector<HTMLButtonElement>('#local-preview')?.addEventListener('click',()=>void compare(false));
  app.querySelector<HTMLButtonElement>('#continue-it')?.addEventListener('click',async()=>{
    try{
      const handoff={...draft,requestId:crypto.randomUUID(),revision:draft.revision+1};
      const response=await fetch('/__degreepath/it',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(handoff)});
      if(!response.ok)throw new Error('It handoff is unavailable. Keep It running and open this app with npm run dev.');
      location.href='http://localhost:4700/p/degreepath-agent';
    }catch(e){error=e instanceof Error?e.message:String(e);render();}
  });
  app.querySelectorAll<HTMLButtonElement>('[data-preset]').forEach(b=>b.onclick=()=>{
    const preset=b.dataset.preset;draft={...draft,requestId:crypto.randomUUID(),revision:draft.revision+1,creditLimit:15,changes:preset==='baseline'?[]:[{courseId:preset==='delay'?'calc2':'prog2',action:preset==='delay'?'defer':'exclude',delay:2}]};
    reply=undefined;explanation='';page=0;message='Demo case loaded. Compare its routes.';remember();render();
  });
  app.querySelector<HTMLButtonElement>('#previous')?.addEventListener('click',()=>{page--;render();});
  app.querySelector<HTMLButtonElement>('#next')?.addEventListener('click',()=>{page++;render();});
  app.querySelectorAll<HTMLAnchorElement>('[data-use-route]').forEach(a=>a.onclick=()=>{
    const route=reply?.routes.find(r=>r.id===a.dataset.useRoute);if(!route||!reply)return;
    if(itReady)void it!.action('degreepath:choose',{requestId:reply.requestId,revision:reply.revision,routeId:route.id}).catch(e=>{error=String(e);render();});
  });
}
function routeCard(route:RouteOption){
  return `<article class="route-card ${!route.finish?'blocked':''}"><div class="route-kicker">${route.restoredCourses.length?'RESTORE REQUIRED COURSES':`${route.creditLimit} CREDIT LIMIT`}</div><h2>${esc(route.title)}</h2><strong class="route-finish">${route.finish??'Incomplete'}</strong><div class="route-metrics"><span><b>${route.semesters}</b> ${route.finish?'semesters':'partial terms'}</span><span><b>${route.blocked.length}</b> blocked</span><span><b>${route.coverage}%</b> by original finish</span></div><p>${route.restoredCourses.length?`Restores ${esc(route.restoredCourses.join(', '))}.`:route.changes.length?`${route.changes.length} course edits retained.`:'Original course requirements retained.'} ${route.moved.length} placements differ from the original ${draft.creditLimit}-credit plan.</p><a class="use-route" data-use-route="${route.id}" href="${mainURL+routeFragment(route.creditLimit,route.changes)}" target="_blank" rel="noopener noreferrer">Use in My plan ↗</a></article>`;
}
async function compare(sendToAgent:boolean){
  try{
    draft={...draft,requestId:crypto.randomUUID(),revision:draft.revision+1};
    reply=compareRoutes(draft);explanation='';error='';page=0;replying=sendToAgent;remember();
    message=sendToAgent?'Calculated options ready. Sending your request to the agent…':'Calculated with the DegreePath engine. Free text has not been interpreted by an AI.';render();
    if(sendToAgent){it!.stage('request',draft);await it!.commit('degreepath:compare');message='Request delivered through It. Calculated options are ready while the agent reviews them.';render();}
  }catch(e){error=e instanceof Error?e.message:String(e);replying=false;render();}
}
if(it){
  it.onState(state=>{
    let changed=!itReady;
    itReady=true;
    if(!initialized){initialized=true;try{lastHandoff=String(it.store.get('last-handoff')??'');const remembered=it.store.get('draft');if(remembered){draft=validateRouteRequest(remembered);changed=true;}}catch{} }
    try{
      if(state.handoff){const handoff=validateRouteRequest(state.handoff);
        if(handoff.requestId!==lastHandoff){lastHandoff=handoff.requestId;draft=handoff;reply=undefined;explanation='';replying=false;page=0;message='Your current plan is ready. Ask the agent to compare its options.';changed=true;void it.store.set('last-handoff',lastHandoff);remember();}
      }
    }catch{}
    const incoming=state.reply as RouteComparison|undefined;
    if(incoming?.requestId===draft.requestId&&incoming.revision===draft.revision&&incoming.dataset===draft.dataset){
      const nextExplanation=typeof state.explanation==='string'?state.explanation.slice(0,4000):'';
      const nextMessage=typeof state.status==='string'?state.status.slice(0,500):'Agent response received.';
      changed=changed||explanation!==nextExplanation||message!==nextMessage||!reply;
      // Recalculate locally instead of trusting arbitrary route data from a page action.
      reply=compareRoutes(draft);
      explanation=nextExplanation;
      replying=!explanation;message=nextMessage;
    }
    if(changed)render();
  });
}
render();
