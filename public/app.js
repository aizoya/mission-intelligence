const $=id=>document.getElementById(id);
let current=null;let polling=null;
const text=(tag,value)=>{const el=document.createElement(tag);el.textContent=value;return el;};
async function api(path,options){const r=await fetch(path,options);const data=await r.json();if(!r.ok)throw new Error(data.error||'Request failed');return data;}
async function status(){try{const s=await api('/api/status');$('provider-status').textContent=`Crusoe key: ${s.crusoeConfigured?'configured':'missing'} · You.com key: ${s.youConfigured?'configured':'missing'} · Live calls: ${s.liveEnabled?'enabled':'disabled'}. Configuration is not proof of a successful integration.`;}catch(e){$('provider-status').textContent=e.message;}}
function list(id,items){$(id).replaceChildren(...items.map(x=>text('li',x)));}
function render(m){
 current=m;$('state').textContent=m.status.replaceAll('_',' ').toUpperCase();
 $('start').disabled=['queued','running'].includes(m.status);$('resume').hidden=!['blocked','running','queued'].includes(m.status);
 $('stop').hidden=!['queued','running'].includes(m.status);$('stop').disabled=false;
 $('mission-note').textContent=`Mission ${m.id.slice(0,8)} · ${m.mode} provider mode · saved ${m.updatedAt?new Date(m.updatedAt).toLocaleTimeString():'now'}`;
 $('search-count').textContent=m.calls.search;$('model-count').textContent=m.calls.model;$('source-count').textContent=m.sources.length;
 $('timeline').replaceChildren(...m.events.map(e=>{const li=text('li',e.message);li.className=`event-${e.type}`;li.prepend(text('time',`${new Date(e.at).toLocaleTimeString()} · ${e.type}${e.controlled?' · CONTROLLED TEST FAILURE':''}`));if(e.model)li.append(text('div',e.model));return li;}));
 $('error').textContent=m.error||'';
 $('report').hidden=!m.report;
 if(m.report)list('completion-checks',(m.report.completionChecks||[]).map(c=>`${c.passed?'PASS':'NEEDS REVIEW'} — ${c.label}`));
 if(m.report){$('findings').replaceChildren(...m.report.findings.map(f=>{const d=document.createElement('article');d.className='finding';d.append(text('p',f.claim),text('blockquote',f.quote));const a=text('a',f.url);a.href=f.url;a.target='_blank';a.rel='noopener noreferrer';d.append(a,text('small',f.evidenceStatus));return d;}));list('unknowns',m.report.unknowns.length?m.report.unknowns:['No unresolved questions reported by the model. This is not a guarantee of safety.']);list('next-steps',m.report.nextSteps);$('limitations').textContent=m.report.limitations.join(' ');}
 if(!['running','queued'].includes(m.status)){clearInterval(polling);polling=null;}
}
async function load(id){try{render(await api(`/api/missions/${id}`));}catch(e){$('error').textContent=e.message;clearInterval(polling);$('start').disabled=false;}}
function watch(id){localStorage.setItem('mi_last_mission',id);clearInterval(polling);polling=setInterval(()=>load(id),1400);load(id);}
$('mission-form').addEventListener('submit',async e=>{e.preventDefault();$('error').textContent='';$('start').disabled=true;try{const m=await api('/api/missions',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({objective:$('objective').value,publicDataConsent:$('consent').checked,injectFailure:$('inject').checked})});watch(m.id);}catch(e){$('error').textContent=e.message;$('start').disabled=false;}});
$('resume').addEventListener('click',async()=>{if(!current)return;try{await api(`/api/missions/${current.id}/resume`,{method:'POST'});watch(current.id);}catch(e){$('error').textContent=e.message;}});
$('stop').addEventListener('click',async()=>{if(!current)return;$('stop').disabled=true;try{await api(`/api/missions/${current.id}/stop`,{method:'POST'});$('mission-note').textContent='Stop requested. An in-flight provider request may finish and incur usage; no subsequent request will begin.';}catch(e){$('error').textContent=e.message;}});
$('download').addEventListener('click',()=>{if(!current?.report)return;const blob=new Blob([JSON.stringify(current,null,2)],{type:'application/json'});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=`mission-${current.id}.json`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);});
status();const last=localStorage.getItem('mi_last_mission');if(last)watch(last);

// Optional company identity images are private and may be absent.
for(const img of document.querySelectorAll(".brand img,.mascots img")){const hide=()=>{if(img.closest("figure"))img.closest("figure").hidden=true;else img.hidden=true;};img.addEventListener("error",hide);if(img.complete&&img.naturalWidth===0)hide();}
