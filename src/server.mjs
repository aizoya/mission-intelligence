import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { randomBytes, timingSafeEqual } from 'node:crypto';
import { Store } from './store.mjs';
import { Engine } from './engine.mjs';
import { LiveProviders } from './providers.mjs';

const root=fileURLToPath(new URL('../',import.meta.url));
const store=new Store(`${root}.data`);
const providers=new LiveProviders();
const budget=(name,fallback)=>{const n=Number(process.env[name]);return Number.isSafeInteger(n)&&n>0?Math.min(n,fallback):fallback;};
const engine=new Engine(store,providers,{modelCalls:budget('MAX_MODEL_CALLS',14),searchCalls:budget('MAX_SEARCH_CALLS',8),tokens:budget('MAX_TOTAL_TOKENS',60000)});
const session=randomBytes(24).toString('hex');
const port=Number(process.env.PORT)||3400;
function authorized(req) {
  const token=(req.headers.cookie||'').split(';').map(x=>x.trim()).find(x=>x.startsWith('mi_session='))?.slice(11)||'';
  return token.length===session.length && timingSafeEqual(Buffer.from(token),Buffer.from(session));
}
function json(res,status,value) {res.writeHead(status,{'Content-Type':'application/json','Cache-Control':'no-store'});res.end(JSON.stringify(value));}
async function body(req) {
  let data='';for await(const chunk of req){data+=chunk;if(data.length>20000)throw new Error('Request too large');}return JSON.parse(data);
}
const server=createServer(async(req,res)=>{
  res.setHeader('X-Content-Type-Options','nosniff');
  res.setHeader('Referrer-Policy','no-referrer');
  res.setHeader('Content-Security-Policy',"default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; connect-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'");
  try {
    const host=req.headers.host||'';
    if(![`127.0.0.1:${port}`,`localhost:${port}`].includes(host))return json(res,403,{error:'Local development host only'});
    const url=new URL(req.url,`http://${host}`);
    if(req.method==='GET'&&['/brand/symbol.png','/brand/wordmark.png','/brand/grace.webp','/brand/errands.png'].includes(url.pathname)) {
      res.setHeader('Content-Type',url.pathname.endsWith('.webp')?'image/webp':'image/png');
      return res.end(await readFile(`${root}public${url.pathname}`));
    }
    if(req.method==='GET'&&['/','/app.js','/style.css'].includes(url.pathname)) {
      const name=url.pathname==='/'?'index.html':url.pathname.slice(1);
      if(name==='index.html')res.setHeader('Set-Cookie',`mi_session=${session}; HttpOnly; SameSite=Strict; Path=/`);
      res.setHeader('Content-Type',name.endsWith('.js')?'text/javascript':name.endsWith('.css')?'text/css':'text/html');
      return res.end(await readFile(`${root}public/${name}`));
    }
    if(!authorized(req))return json(res,401,{error:'Open the local app first'});
    if(req.method!=='GET' && req.headers.origin!==`http://${host}`)return json(res,403,{error:'Origin check failed'});
    if(req.method==='GET'&&url.pathname==='/api/status')return json(res,200,{mode:'live integrations; not yet verified',crusoeConfigured:!!process.env.CRUSOE_API_KEY,youConfigured:!!process.env.YOU_API_KEY,liveEnabled:process.env.ALLOW_LIVE_CALLS==='true',model:providers.model('coordinator'),workerModel:providers.model('researcher'),publicDeployment:false});
    if(req.method==='POST'&&url.pathname==='/api/missions') {
      if(engine.active.size)return json(res,409,{error:'One investigation at a time in this local MVP'});
      const input=await body(req);
      if(input.publicDataConsent!==true)return json(res,400,{error:'Confirm public or redacted input before starting'});
      const mission=await engine.create(input.objective,{injectFailure:input.injectFailure===true});
      void engine.run(mission.id);return json(res,202,{id:mission.id});
    }
    const match=url.pathname.match(/^\/api\/missions\/([a-f0-9-]{36})(\/(?:resume|stop))?$/);
    if(match) {
      if(req.method==='GET'&&!match[2])return json(res,200,await store.get(match[1]));
      if(req.method==='POST'&&match[2]==='/stop') {engine.stop(match[1]);return json(res,202,{id:match[1],stopRequested:true});}
      if(req.method==='POST'&&match[2]==='/resume') {
        if(engine.active.size)return json(res,409,{error:'An investigation is already running'});
        await store.get(match[1]);
        void engine.run(match[1]);return json(res,202,{id:match[1]});
      }
    }
    json(res,404,{error:'Not found'});
  }catch(e){json(res,e.code==='ENOENT'?404:400,{error:e.code==='ENOENT'?'Mission not found':e.message});}
});
server.listen(port,'127.0.0.1',()=>console.log(`Mission Intelligence local MVP: http://127.0.0.1:${port}`));
