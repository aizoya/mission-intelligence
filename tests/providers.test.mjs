import test from 'node:test';
import assert from 'node:assert/strict';
import { LiveProviders } from '../src/providers.mjs';
const model='fixture/model';
const env={ALLOW_LIVE_CALLS:'true',CRUSOE_API_KEY:'fixture-crusoe-key',YOU_API_KEY:'fixture-you-key',CRUSOE_MODEL:model};
const response=value=>({ok:true,json:async()=>value});

test('provider contracts use separate endpoints, keys, catalog and source normalization',async()=>{
  const calls=[];
  const p=new LiveProviders(env,async(url,options)=>{
    calls.push({url,options});
    if(url.endsWith('/models'))return response({data:[{id:model,supported_parameters:['response_format']}]});
    if(url.endsWith('/chat/completions'))return response({choices:[{finish_reason:'stop',message:{content:'{"tasks":[]}'}}],usage:{total_tokens:12}});
    return response({results:{web:[{url:'https://example.org',title:'Fixture',description:'Public fixture description.',snippets:['Fixture source excerpt.']},{url:'javascript:alert(1)',title:'Rejected'}]}});
  });
  await p.preflight();
  const answer=await p.reason('coordinator','Fixture system',{objective:'Public fixture objective'});
  assert.deepEqual(answer.value,{tasks:[]});
  const sources=await p.search('Public fixture query');
  assert.equal(sources.length,1);
  assert.equal(sources[0].text,'Public fixture description.\nFixture source excerpt.');
  assert.equal(calls[1].url,'https://api.inference.crusoecloud.com/v1/chat/completions');
  const modelBody=JSON.parse(calls[1].options.body);
  assert.equal(modelBody.model,model);
  assert.deepEqual(modelBody.response_format,{type:'json_object'});
  assert.equal(calls[2].url,'https://ydc-index.io/v1/search');
  assert.equal(calls[2].options.method,'POST');
  assert.equal(calls[2].options.headers['X-API-Key'],'fixture-you-key');
  assert.equal(calls[2].options.headers.Authorization,undefined);
  assert.ok(!JSON.stringify(calls[2].options).includes('fixture-crusoe-key'));
});

test('missing catalog model fails before any inference',async()=>{
  let requests=0;
  const p=new LiveProviders(env,async()=>{requests++;return response({data:[]});});
  await assert.rejects(()=>p.preflight(),/not in the live catalog/);
  assert.equal(requests,1);
});

test('truncated reasoning is never accepted as a report',async()=>{
  const p=new LiveProviders(env,async()=>response({choices:[{finish_reason:'length',message:{content:'{"findings":[]}'}}]}));
  await assert.rejects(()=>p.reason('challenger','Fixture',{}),/truncated/);
});

test('HTTP 429 is not rapidly retried and carries a conservative Retry-After cooldown',async()=>{
 const {requestJSON}=await import('../src/providers.mjs');
 for(const header of ['120',new Date(Date.now()+180000).toUTCString(),null,'invalid']) {
  const before=Date.now();
  await assert.rejects(()=>requestJSON('https://example.org',{},async()=>({ok:false,status:429,headers:{get:()=>header}})),e=>{
   assert.equal(e.status,429);assert.equal(e.retryable,false);assert.ok(Date.parse(e.retryAt)>=before+60000);
   if(header==='120')assert.ok(Date.parse(e.retryAt)>=before+120000);
   return true;
  });
 }
});

test('rate diagnostics allow numeric quota headers and never read private error bodies',async()=>{
 const {requestJSON}=await import('../src/providers.mjs');let seen;
 const headers=new Map([['x-ratelimit-limit-tokens','500000'],['x-ratelimit-remaining-tokens','0'],['x-ratelimit-remaining-requests','secret-credential'],['retry-after','120'],['authorization','Bearer SECRET']]);
 await assert.rejects(()=>requestJSON('https://example.org',{},async()=>({ok:false,status:429,headers:{get:key=>headers.get(key)},json:async()=>{throw Error('Must not read body');}}),{provider:'Crusoe',operation:'reason',model,role:'researcher',onResponse:d=>{seen=d;}}),e=>{
  assert.equal(e.diagnostic,seen);assert.equal(e.diagnostic.provider,'Crusoe');assert.equal(e.diagnostic.role,'researcher');
  assert.deepEqual(e.diagnostic.rateLimits,{'x-ratelimit-limit-tokens':500000,'x-ratelimit-remaining-tokens':0});
  assert.ok(!JSON.stringify(e.diagnostic).includes('SECRET'));return true;
 });
});

test('successful responses also expose quota diagnostics and extreme retry headers remain safe',async()=>{
 const {requestJSON}=await import('../src/providers.mjs');let seen;
 await requestJSON('https://example.org',{},async()=>({ok:true,status:200,headers:{get:key=>key==='x-ratelimit-remaining-requests'?'29':null},json:async()=>({ok:true})}),{provider:'You.com',operation:'search',onResponse:d=>{seen=d;}});
 assert.equal(seen.status,200);assert.equal(seen.rateLimits['x-ratelimit-remaining-requests'],29);
 await assert.rejects(()=>requestJSON('https://example.org',{},async()=>({ok:false,status:429,headers:{get:()=> '9'.repeat(310)}})),e=>e.status===429&&Number.isFinite(Date.parse(e.retryAt)));
});
