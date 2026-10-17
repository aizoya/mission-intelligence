import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';

test('legacy and provisional reports display explicit completion status, and running missions cannot resume',async()=>{
 const nodes=new Map();
 const node=()=>({children:[],hidden:false,textContent:'',replaceChildren(...items){this.children=items;},append(...items){this.children.push(...items);},prepend(...items){this.children.unshift(...items);},addEventListener(){}});
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
