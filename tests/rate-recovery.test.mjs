import test from 'node:test';
import assert from 'node:assert/strict';
import {Engine} from '../src/engine.mjs';
import {ProviderError} from '../src/providers.mjs';
const mission=()=>({id:'retry-test',calls:{model:0,search:0,tokens:0},events:[]});
const limited=()=>{const e=new ProviderError('Rate limited');e.status=429;return e;};
test('live 429 retries wait, count every attempt, and stop after two retries',async()=>{
 const waits=[];const engine=new Engine({save:async()=>{}},{label:'live'},{},{sleep:async ms=>waits.push(ms)});
 const m=mission();let calls=0;
 assert.equal(await engine.bounded(m,'model',async()=>{if(++calls<3)throw limited();return 'recovered';}),'recovered');
 assert.deepEqual(waits,[60000,120000]);assert.equal(m.calls.model,3);
 calls=0;await assert.rejects(engine.bounded(mission(),'model',async()=>{calls++;throw limited();}),e=>e.status===429);assert.equal(calls,3);
});
test('long cooldown, exhausted budget, and stop prevent another request',async()=>{
 let calls=0;let sleeps=0;const m=mission();
 const engine=new Engine({save:async()=>{}},{label:'live'},{modelCalls:1},{sleep:async()=>{sleeps++;}});
 await assert.rejects(engine.bounded(m,'model',async()=>{calls++;throw limited();}),/budget/);assert.equal(calls,1);
 const other=new Engine({save:async()=>{}},{label:'live'},{},{sleep:async()=>{throw Error('Must not shorten cooldown');}});
 await assert.rejects(other.bounded(mission(),'model',async()=>{const e=limited();e.retryAt=new Date(Date.now()+3600000).toISOString();throw e;}),e=>e.status===429);
 const stopped=mission();const stopping=new Engine({save:async()=>{}},{label:'live'},{},{sleep:async()=>{stopping.stops.add(stopped.id);}});calls=0;
 await assert.rejects(stopping.bounded(stopped,'model',async()=>{calls++;throw limited();}),/stopped/);assert.equal(calls,1);
});
