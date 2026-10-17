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
