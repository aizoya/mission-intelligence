import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { once } from 'node:events';

test('local HTTP journey blocks unconfigured calls and protects writes',async()=>{
  const port=35000+Math.floor(Math.random()*10000);
  const base=`http://127.0.0.1:${port}`;
  const child=spawn(process.execPath,['src/server.mjs'],{env:{...process.env,PORT:String(port),ALLOW_LIVE_CALLS:'false',CRUSOE_API_KEY:'',YOU_API_KEY:''},stdio:['ignore','pipe','pipe']});
  try{
    await Promise.race([once(child.stdout,'data'),new Promise((_,reject)=>setTimeout(()=>reject(new Error('Server startup timed out')),5000).unref())]);
    assert.equal((await fetch(`${base}/api/status`)).status,401);
    const home=await fetch(base);
    assert.equal(home.status,200);
    const cookie=home.headers.get('set-cookie').split(';')[0];
    assert.match(await home.text(),/Evidence first/);
    const status=await (await fetch(`${base}/api/status`,{headers:{cookie}})).json();
    assert.equal(status.liveEnabled,false);
    assert.equal(status.crusoeConfigured,false);
    const payload=JSON.stringify({objective:'Investigate the public claims about an example job offer',publicDataConsent:true});
    assert.equal((await fetch(`${base}/api/missions`,{method:'POST',headers:{cookie},body:payload})).status,403);
    const created=await fetch(`${base}/api/missions`,{method:'POST',headers:{cookie,Origin:base},body:payload});
    assert.equal(created.status,202);
    const {id}=await created.json();
    let mission;
    for(let i=0;i<25;i++){
      mission=await (await fetch(`${base}/api/missions/${id}`,{headers:{cookie}})).json();
      if(mission.status==='blocked')break;
      await new Promise(resolve=>setTimeout(resolve,20));
    }
    assert.equal(mission.status,'blocked');
    assert.deepEqual(mission.calls,{model:0,search:0,tokens:0,cachedTokens:0});
    assert.equal(mission.report,null);
  }finally{child.kill();await once(child,'exit');}
});
