import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';

test('legacy and provisional reports display explicit completion status, and running missions cannot resume',async()=>{
 const nodes=new Map();
 const node=()=>({children:[],hidden:false,textContent:'',replaceChildren(...items){this.children=items;},append(...items){this.children.push(...items);},prepend(...items){this.children.unshift(...items);},addEventListener(){},setAttribute(k,v){this[k]=v;}});
 const get=id=>{if(!nodes.has(id))nodes.set(id,node());return nodes.get(id);};
 const context=vm.createContext({document:{getElementById:get,createElement:node,querySelectorAll:()=>[]},fetch:async()=>({ok:true,json:async()=>({})}),localStorage:{getItem:()=>null},clearInterval(){},setInterval(){},setTimeout(){},console,Date,Blob,URL});
 vm.runInContext(await readFile(new URL('../public/app.js',import.meta.url),'utf8'),context);
 context.mission={id:'fixture-id',status:'running',mode:'fixture',calls:{search:1,model:1},sources:[],events:[],report:{findings:[],unknowns:[],nextSteps:[],limitations:[]}};
 vm.runInContext('render(mission)',context);
 assert.match(get('completion-checks').children[0].textContent,/NEEDS REVIEW.*unavailable/);
 assert.equal(get('resume').hidden,true);
 context.mission.status='blocked';context.mission.report.completionChecks=[{passed:false,label:'Final workflow checks pending; report is provisional'}];
 vm.runInContext('render(mission)',context);
 assert.match(get('completion-checks').children[0].textContent,/NEEDS REVIEW.*provisional/);
 assert.equal(get('resume').hidden,false);
});


test('team visuals stop on blocked and cancelled missions; narration does not declare truth',async()=>{
 const nodes=new Map();
 const node=()=>({children:[],hidden:false,textContent:'',replaceChildren(...items){this.children=items;},append(...items){this.children.push(...items);},prepend(...items){this.children.unshift(...items);},addEventListener(){},setAttribute(k,v){this[k]=v;}});
 const get=id=>{if(!nodes.has(id))nodes.set(id,node());return nodes.get(id);};
 const context=vm.createContext({document:{getElementById:get,createElement:node,querySelectorAll:()=>[]},fetch:async()=>({ok:true,json:async()=>({})}),localStorage:{getItem:()=>null},clearInterval(){},setInterval(){},setTimeout(){},Date,Blob,URL});
 vm.runInContext(await readFile(new URL('../public/app.js',import.meta.url),'utf8'),context);
 context.mission={id:'fixture',objective:'Example vendor',status:'running',mode:'fixture',phase:'research',tasks:[{id:'t1',status:'running',question:'Inspect official evidence'}],sources:[],events:[],calls:{search:1,model:1}};
 vm.runInContext('render(mission)',context);
 assert.match(get('agent-errands').className,/agent-working/);
 context.mission.status='blocked';context.mission.error='Provider rate limit reached';
 vm.runInContext('render(mission)',context);
 for(const key of ['grace','errands','reviewer'])assert.doesNotMatch(get('agent-'+key).className,/agent-working/);
 assert.doesNotMatch(get('team-stage').className,/is-active/);
 assert.match(get('team-message').textContent,/progress is saved/);
 assert.match(get('task-board').children[0].children[0].children[0].textContent,/PAUSED/);
 context.mission.status='running';context.mission.phase='verify';
 vm.runInContext('render(mission)',context);
 assert.match(get('agent-reviewer').className,/agent-working/);
 context.mission.status='cancelled';vm.runInContext('render(mission)',context);
 assert.equal(get('reviewer-state').textContent,'Stopped');
 vm.runInContext("selectedAgent='reviewer';renderTeam(mission)",context);
 assert.match(get('team-message').textContent,/not proof/);
});
