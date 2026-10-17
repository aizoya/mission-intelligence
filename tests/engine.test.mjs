import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp,rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Engine,checkFindings,validateTasks } from '../src/engine.mjs';
import { Store } from '../src/store.mjs';
import { ProviderError,LiveProviders,parseJSON,requestJSON } from '../src/providers.mjs';
const source={url:'https://example.org/careers',title:'Fictional fixture',text:'Our hiring process never requires applicants to pay an application fee.'};
class FixtureProviders {
 label='offline-fixture';reviews=0;searches=0;permanent=false;failPreflight=false;
 async preflight(){if(this.failPreflight)throw new ProviderError('Fixture preflight blocked');}
 async search(){this.searches++;if(this.permanent)throw new ProviderError('Fixture upstream unavailable',true);return [source];}
 async reason(role){
  let value;
  if(role==='coordinator')value={tasks:[{question:'Check official policy',query:'Example official hiring policy'},{question:'Check advertised role',query:'Example current careers role'}]};
  else if(role==='researcher')value={summary:'Fixture summary',gaps:[]};
  else {this.reviews++;value={findings:[{claim:'The fixture source says fees are not required.',sourceId:'s1',quote:source.text,kind:'fact'}],unknowns:['Private sender not authenticated.'],nextSteps:['Check official contact details.'],followups:this.reviews===1?[{question:'Investigate contradiction',query:'Example official payment warning'}]:[]};}
  return {value,usage:{total_tokens:20},model:'fixture-only'};
 }
}
async function setup(t,p=new FixtureProviders(),limits){const dir=await mkdtemp(join(tmpdir(),'mission-test-'));t.after(()=>rm(dir,{recursive:true,force:true}));const store=new Store(dir);return {store,p,engine:new Engine(store,p,limits)};}
test('recursive follow-up, controlled recovery, persistence, honest completion',async t=>{
 const {engine,store,p}=await setup(t);const m=await engine.create('Investigate the fictional Example offer.',{injectFailure:true});await engine.run(m.id);const d=await store.get(m.id);
 assert.equal(d.status,'needs_review');assert.equal(d.mode,'offline-fixture');assert.equal(d.tasks.length,3);assert.ok(d.tasks[2].parent);assert.ok(d.events.some(e=>e.type==='replan'));assert.ok(d.events.some(e=>e.type==='recovery'&&e.controlled));assert.equal(p.searches,3);assert.equal(d.report.findings.length,1);
 const calls=d.calls.model;await engine.run(m.id);assert.equal((await store.get(m.id)).calls.model,calls);
});
test('failed research remains unresolved, never verified',async t=>{const p=new FixtureProviders();p.permanent=true;const {engine,store}=await setup(t,p);const m=await engine.create('Investigate this fictional public claim.');await engine.run(m.id);const d=await store.get(m.id);assert.equal(d.status,'needs_review');assert.equal(d.report.findings.length,0);assert.ok(d.report.unknowns.some(x=>x.includes('Research incomplete')));assert.ok(d.calls.search<=8);});
test('resume blocked preflight from disk',async t=>{const p=new FixtureProviders();p.failPreflight=true;const {engine,store}=await setup(t,p);const m=await engine.create('Investigate a fictional public job offer.');await engine.run(m.id);assert.equal((await store.get(m.id)).status,'blocked');p.failPreflight=false;await new Engine(store,p).run(m.id);assert.equal((await store.get(m.id)).status,'needs_review');});
test('reject invented citations and quotations',()=>{const c=checkFindings([{claim:'Claim',sourceId:'s9',quote:source.text,kind:'fact'},{claim:'Claim',sourceId:'s1',quote:'This quotation was invented by a model.',kind:'fact'}],[{...source,id:'s1'}]);assert.equal(c.accepted.length,0);assert.equal(c.rejected,2);});
test('reject private and URL-based queries',()=>{for(const query of ['hello@example.org recruiter','https://example.org/link','phone 1234567890','bearer secret'])assert.throws(()=>validateTasks([{question:'Check',query}]));});
test('enforce task count and objective limits',async t=>{assert.throws(()=>validateTasks([]));const {engine}=await setup(t);await assert.rejects(()=>engine.create('tiny'));});
test('stop at model-call budget',async t=>{const {engine,store}=await setup(t,new FixtureProviders(),{modelCalls:1});const m=await engine.create('Investigate this fictional public claim.');await engine.run(m.id);const d=await store.get(m.id);assert.equal(d.status,'blocked');assert.equal(d.calls.model,1);assert.match(d.error,/budget/);});
test('live calls require opt-in and both credentials',async()=>{await assert.rejects(()=>new LiveProviders({}).preflight(),/disabled/);await assert.rejects(()=>new LiveProviders({ALLOW_LIVE_CALLS:'true'}).preflight(),/credentials/);});
test('upstream auth errors never expose response bodies',async()=>{await assert.rejects(()=>requestJSON('https://example.org',{},async()=>({ok:false,status:401,text:async()=>'SECRET'})),e=>e.message==='Provider returned HTTP 401'&&!e.retryable);});
test('malformed model JSON fails closed',()=>{assert.throws(()=>parseJSON('not json'));assert.deepEqual(parseJSON('```json\n{"ok":true}\n```'),{ok:true});});
test('reject path traversal',()=>{assert.throws(()=>new Store('/tmp').path('../../etc/passwd'));});
test('stop during reasoning records usage and prevents the next provider request',async t=>{
 const p=new FixtureProviders();
 let entered,release;
 const started=new Promise(resolve=>{entered=resolve;});
 const pending=new Promise(resolve=>{release=resolve;});
 const original=p.reason.bind(p);
 p.reason=async role=>{entered();await pending;return original(role);};
 const {engine,store}=await setup(t,p);
 const m=await engine.create('Investigate a fictional public job offer.');
 const running=engine.run(m.id);
 await started;engine.stop(m.id);release();await running;
 const d=await store.get(m.id);
 assert.equal(d.status,'cancelled');
 assert.equal(d.calls.model,1);assert.equal(d.calls.tokens,20);
 assert.equal(d.calls.search,0);assert.equal(d.report,null);
 await engine.run(m.id);
 assert.equal((await store.get(m.id)).calls.model,1);
});
test('completion requires every published workflow check to pass',async t=>{
 const p=new FixtureProviders();
 const original=p.reason.bind(p);
 p.reason=async role=>{
   const answer=await original(role);
   if(role==='challenger'){answer.value.unknowns=[];answer.value.followups=[];}
   return answer;
 };
 const {engine,store}=await setup(t,p);
 const m=await engine.create('Investigate a fictional public organization.');
 await engine.run(m.id);
 const d=await store.get(m.id);
 assert.equal(d.status,'complete');
 assert.equal(d.report.completionChecks.length,5);
 assert.ok(d.report.completionChecks.every(x=>x.passed));
 assert.ok(d.report.limitations.some(x=>x.includes('not truth')));
});
