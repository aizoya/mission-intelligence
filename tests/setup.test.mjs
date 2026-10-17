import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp,readFile,stat,rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { configuration,saveConfiguration } from '../scripts/setup.mjs';

test('private setup preserves dollar signs and rejects configuration injection',()=>{
 const content=configuration('fixture$crusoe-key','fixture-you-key');
 assert.ok(content.includes("CRUSOE_API_KEY='fixture$crusoe-key'"));
 assert.ok(content.includes('ALLOW_LIVE_CALLS=false'));
 for(const bad of ['short',"fixture'quote",'fixture\nALLOW_LIVE_CALLS=true','fixture key'])assert.throws(()=>configuration(bad,'fixture-you-key'));
});

test('private setup writes owner-only permissions and never overwrites existing config',async t=>{
 const dir=await mkdtemp(join(tmpdir(),'mission-setup-'));
 t.after(()=>rm(dir,{recursive:true,force:true}));
 const path=join(dir,'.env');
 const content=configuration('fixture-crusoe-key','fixture-you-key');
 await saveConfiguration(path,content);
 assert.equal((await stat(path)).mode&0o777,0o600);
 await assert.rejects(()=>saveConfiguration(path,'overwrite'),{code:'EEXIST'});
 assert.equal(await readFile(path,'utf8'),content);
});
