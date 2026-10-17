const $=id=>document.getElementById(id);
let current=null;let polling=null;
const text=(tag,value)=>{const el=document.createElement(tag);el.textContent=value;return el;};
async function api(path,options){const r=await fetch(path,options);const data=await r.json();if(!r.ok)throw new Error(data.error||'Request failed');return data;}
async function status(){try{const s=await api('/api/status');$('provider-status').textContent=`Crusoe key: ${s.crusoeConfigured?'configured':'missing'} · You.com key: ${s.youConfigured?'configured':'missing'} · Live calls: ${s.liveEnabled?'enabled':'disabled'}. Configuration is not proof of a successful integration.`;}catch(e){$('provider-status').textContent=e.message;}}
function list(id,items){$(id).replaceChildren(...items.map(x=>text('li',x)));}
let selectedAgent='grace';
let taskSignature='';
const agents={grace:{name:'Grace',role:'Your guide',description:'I coordinate the investigation and help you understand what the evidence supports.'},errands:{name:'Errands',role:'Evidence explorer',description:'I gather public sources and assess their relevance to your question.'},reviewer:{name:'Clue',role:'Evidence detective',description:'Let’s look a little closer. I review captured evidence, check quotations, and identify gaps. A matched quote is not proof that a claim is true.'}};
function teamView(m){
 const active=m&&['queued','running'].includes(m.status);
 const states={grace:'Ready',errands:'Ready',reviewer:'Ready'};
 let working=null,message='Hi! What are we curious about today? Give me a question and we’ll explore it together.';
 if(m){
  if(active){
   working=m.phase==='research'?'errands':m.phase==='verify'?'reviewer':'grace';
   states.grace='Coordinating';states.errands='Waiting';states.reviewer='Waiting';
   if(working==='grace'){states.grace='Planning';message='Let’s turn your question into a few focused investigations.';}
   if(working==='errands'){states.errands='Exploring';message='Errands is following the sources. We’ll keep what fits your question and flag what doesn’t.';}
   if(working==='reviewer'){states.errands='Research paused';states.reviewer='Reviewing';message='Let’s challenge what we found. Clue is checking the evidence and looking for gaps.';}
  }else if(m.status==='blocked'){
   Object.keys(states).forEach(k=>states[k]='Paused');
   message='We’ve hit a blocker. Your progress is saved. '+(m.error||'Review the activity details before continuing.');
   if(m.retryAt)message+=' Earliest manual retry: '+new Date(m.retryAt).toLocaleTimeString()+'. This is not a guarantee of provider availability.';
  }else if(m.status==='cancelled'){
   Object.keys(states).forEach(k=>states[k]='Stopped');message='We’ve stopped here. Your saved evidence is still available to review.';
  }else{
   Object.keys(states).forEach(k=>states[k]='At rest');
   message=m.status==='complete'?'Your evidence brief is ready. Let’s review the findings and decide what to check next.':'We have a partial brief, with open questions. Let’s review those before making a decision.';
  }
 }
 return {states,working,message,active:!!active};
}
function prismSummary(m){
 if(!m?.report)return 'Let’s make sense of what we find. I’m waiting for a report; no results are ready to present yet.';
 const r=m.report;const complete=m.status==='complete'&&r.completionChecks?.length>0&&r.completionChecks.every(c=>c.passed===true);
 return `${complete?'The workflow is complete.':'This brief is provisional or needs review.'} We have ${r.findings.length} cited findings, ${r.unknowns.length} listed open questions, and ${r.nextSteps.length} next steps. Inspect each citation before relying on a claim.`;
}
function renderTeam(m){
 const v=teamView(m);
 $('team-stage').className='team-stage'+(v.active?' is-active':'');
 $('room-mode').textContent=!m?'READY TO EXPLORE':m.mode==='live'?'LIVE PROVIDER MODE':'MODE: '+m.mode;
 for(const key of Object.keys(agents)){
  $('agent-'+key).className='agent-card'+(v.working===key?' agent-working':'')+(m?.status==='blocked'?' agent-paused':'');
  $('agent-'+key).setAttribute('aria-pressed',String(selectedAgent===key));
  $(key+'-state').textContent=v.states[key];
 }
 $('speaker').textContent=agents[selectedAgent].name.toUpperCase()+' / '+agents[selectedAgent].role.toUpperCase();
 // Authored narration describes saved workflow state, never private model reasoning.
 $('team-message').textContent=selectedAgent==='grace'?v.message:agents[selectedAgent].description;
 const task=(m?.tasks||[]).find(t=>t.status==='running')||(m?.tasks||[]).find(t=>t.status==='pending');
 $('agent-detail').textContent=selectedAgent==='errands'&&task?'Current assignment: '+task.question:selectedAgent==='reviewer'&&m?.report?`${m.report.findings.length} quoted findings in the current brief. Open the report to inspect each citation.`:m?'Your question: '+m.objective:'Select a teammate to see their role and current work.';
 renderTasks(m);
}
function sourceLink(s){
 const card=document.createElement('div');card.className='source-chip';
 let valid=false;try{valid=['https:','http:'].includes(new URL(s.url).protocol);}catch{}
 if(valid){const a=text('a',s.title||s.url);a.href=s.url;a.target='_blank';a.rel='noopener noreferrer';card.append(a);}else card.append(text('span',s.title||'Source URL unavailable'));
 card.append(text('small',s.eligible===false?'Excluded from report evidence':s.assessment?'Included after model relevance assessment · not independent authentication':'Captured source · inspect before relying on it'));
 return card;
}
function renderTasks(m){
 const signature=JSON.stringify([m?.id,m?.status,m?.tasks,m?.sources]);if(signature===taskSignature)return;taskSignature=signature;
 const cards=(m?.tasks||[]).map(t=>{
  const previous=document.getElementById('task-'+t.id);const d=document.createElement('details');d.className='task-card';d.id='task-'+t.id;d.open=previous?.open||false;
  const summary=text('summary',t.question);const state=t.status==='running'&&!['queued','running'].includes(m.status)?'PAUSED':(t.status||'pending').toUpperCase();
  const badge=text('span',`ERRANDS / ${state}${t.parent?' / FOLLOW-UP':''}`);badge.className='task-state';summary.prepend(badge);d.append(summary);
  if(t.summary)d.append(text('p',t.summary));if(t.error)d.append(text('p',t.error));
  const accepted=(m.sources||[]).filter(s=>s.taskId===t.id);
  d.append(text('p',`${accepted.length} included sources · ${(t.rejectedSources||[]).length} excluded sources`));
  accepted.forEach(s=>d.append(sourceLink(s)));
  if(t.rejectedSources?.length){const excluded=document.createElement('details');excluded.append(text('summary','Inspect excluded sources'));t.rejectedSources.forEach(s=>excluded.append(sourceLink({...s,eligible:false})));d.append(excluded);}
  return d;
 });
 if(!cards.length)cards.push(text('p',m?'Research assignments will appear after planning completes.':'Your team’s assignments and source trail will appear here.'));
 $('task-board').replaceChildren(...cards);
}
for(const key of Object.keys(agents))$('agent-'+key).addEventListener('click',()=>{selectedAgent=key;renderTeam(current);});
let motionPaused=false;
$('motion-toggle').addEventListener('click',()=>{motionPaused=!motionPaused;document.querySelector('.team-room').classList.toggle('motion-paused',motionPaused);$('motion-toggle').setAttribute('aria-pressed',String(motionPaused));$('motion-toggle').textContent=motionPaused?'Allow movement':'Pause movement';});
renderTeam(null);

function render(m){
 renderTeam(m);
 $('prism-summary').textContent=prismSummary(m);
 $('prism-title').textContent=m.status==='complete'&&m.report?.completionChecks?.length>0&&m.report.completionChecks.every(c=>c.passed===true)?'Your brief is ready':'Here’s what we know so far';
 current=m;$('download').hidden=false;$('state').textContent=m.status.replaceAll('_',' ').toUpperCase();
 $('start').disabled=['queued','running'].includes(m.status);$('resume').hidden=m.status!=='blocked';
 $('stop').hidden=!['queued','running'].includes(m.status);$('stop').disabled=false;
 $('mission-note').textContent=`Mission ${m.id.slice(0,8)} · ${m.mode} provider mode · saved ${m.updatedAt?new Date(m.updatedAt).toLocaleTimeString():'now'}`;
 $('search-count').textContent=m.calls.search;$('model-count').textContent=m.calls.model;$('source-count').textContent=m.sources.length;
 $('timeline').replaceChildren(...m.events.map(e=>{const li=text('li',e.message);li.className=`event-${e.type}`;li.prepend(text('time',`${new Date(e.at).toLocaleTimeString()} · ${e.type}${e.controlled?' · CONTROLLED TEST FAILURE':''}`));if(e.model)li.append(text('div',e.model));if(e.error)li.append(text('div',e.error));return li;}));
 $('error').textContent=m.error||'';
 $('report').hidden=!m.report;
 $('report-jump').hidden=!m.report;
 $('checks-summary').textContent=m.report?.completionChecks?.length?`Workflow checks · ${m.report.completionChecks.filter(c=>c.passed===true).length}/${m.report.completionChecks.length} passed · inspect details`:'Workflow checks unavailable · needs review';
 if(m.report)list('completion-checks',(m.report.completionChecks?.length?m.report.completionChecks:[{passed:false,label:'Completion checks unavailable; report requires review'}]).map(c=>`${c.passed?'PASS':'NEEDS REVIEW'} — ${c.label}`));
 if(m.report){$('findings').replaceChildren(...m.report.findings.map(f=>{const d=document.createElement('article');d.className='finding';d.append(text('p',f.claim),text('blockquote',f.quote));const a=text('a',f.url);a.href=f.url;a.target='_blank';a.rel='noopener noreferrer';d.append(a,text('small',f.evidenceStatus));return d;}));list('unknowns',m.report.unknowns.length?m.report.unknowns:['No unresolved questions reported by the model. This is not a guarantee of safety.']);list('next-steps',m.report.nextSteps);$('limitations').textContent=m.report.limitations.join(' ');}
 if(!['running','queued'].includes(m.status)){clearInterval(polling);polling=null;}
}
async function load(id){try{render(await api(`/api/missions/${id}`));}catch(e){$('error').textContent=e.message;clearInterval(polling);$('start').disabled=false;$('team-stage').className='team-stage';for(const key of Object.keys(agents)){$('agent-'+key).className='agent-card agent-paused';$(key+'-state').textContent='Connection lost';}$('team-message').textContent='We lost contact with the local app. The display is paused; server activity is unknown. Reconnect before retrying.';}}
function watch(id){localStorage.setItem('mi_last_mission',id);clearInterval(polling);polling=setInterval(()=>load(id),1400);load(id);}
$('mission-form').addEventListener('submit',async e=>{e.preventDefault();$('error').textContent='';$('start').disabled=true;try{const m=await api('/api/missions',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({objective:$('objective').value,publicDataConsent:$('consent').checked,injectFailure:$('inject').checked})});watch(m.id);}catch(e){$('error').textContent=e.message;$('start').disabled=false;}});
$('resume').addEventListener('click',async()=>{if(!current)return;try{await api(`/api/missions/${current.id}/resume`,{method:'POST'});watch(current.id);}catch(e){$('error').textContent=e.message;}});
$('stop').addEventListener('click',async()=>{if(!current)return;$('stop').disabled=true;try{await api(`/api/missions/${current.id}/stop`,{method:'POST'});$('mission-note').textContent='Stop requested. An in-flight provider request may finish and incur usage; no subsequent request will begin.';}catch(e){$('error').textContent=e.message;}});
$('download').addEventListener('click',()=>{if(!current)return;const blob=new Blob([JSON.stringify(current,null,2)],{type:'application/json'});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=`mission-${current.id}.json`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);});
status();const requestedMission=globalThis.location?.search?new URLSearchParams(globalThis.location.search).get('mission'):null;const last=requestedMission&&/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(requestedMission)?requestedMission:localStorage.getItem('mi_last_mission');if(last)watch(last);

// Optional company identity images are private and may be absent.
for(const img of document.querySelectorAll(".brand img,.avatar img")){const hide=()=>{if(img.closest("figure"))img.closest("figure").hidden=true;else {img.hidden=true;const fallback=img.parentElement?.querySelector('.asset-fallback');if(fallback)fallback.hidden=false;}};img.addEventListener("error",hide);if(img.complete&&img.naturalWidth===0)hide();}
