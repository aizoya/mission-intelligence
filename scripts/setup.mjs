import { createInterface } from 'node:readline';
import { Writable } from 'node:stream';
import { open } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';

export function configuration(crusoe,you) {
  for(const key of [crusoe,you]) {
    if(typeof key!=='string'||key.length<8||key.length>1000||!/^[A-Za-z0-9_.$:+/=-]+$/.test(key))throw new Error('Key format rejected; use the original provider key without whitespace or quotes.');
  }
  return `CRUSOE_API_KEY='${crusoe}'\nYOU_API_KEY='${you}'\nCRUSOE_MODEL=nvidia/NVIDIA-Nemotron-3-Super-120B-A12B\nCRUSOE_WORKER_MODEL=nvidia/Nemotron-3.5-Lightning-30B-A3B\nALLOW_LIVE_CALLS=false\nPORT=3400\nMAX_MODEL_CALLS=14\nMAX_SEARCH_CALLS=8\nMAX_TOTAL_TOKENS=60000\n`;
}

export async function saveConfiguration(path,content) {
  const file=await open(path,'wx',0o600);
  try{await file.writeFile(content);}finally{await file.close();}
}

async function main() {
  if(!process.stdin.isTTY||!process.stdout.isTTY)throw new Error('Run setup in a private interactive terminal. Secret values are not accepted as command arguments or piped input.');
  let muted=false;
  const output=new Writable({write(chunk,encoding,done){if(!muted)process.stdout.write(chunk,encoding);done();}});
  const rl=createInterface({input:process.stdin,output,terminal:true,historySize:0});
  const secret=label=>new Promise((resolve,reject)=>{
    process.stdout.write(label);muted=true;
    const closed=()=>reject(new Error('Setup cancelled.'));
    rl.once('close',closed);
    rl.question('',value=>{rl.off('close',closed);muted=false;process.stdout.write('\n');resolve(value);});
  });
  try{
    console.log('Private local setup. Keys are hidden while entered. No provider requests will be made.');
    const crusoe=await secret('Crusoe API key: ');
    const you=await secret('You.com API key: ');
    await saveConfiguration('.env',configuration(crusoe,you));
    console.log('Saved private .env with owner-only permissions. Live calls remain disabled. Run npm run readiness next.');
  }finally{muted=false;rl.close();}
}

if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href)main().catch(e=>{
  console.error(e.code==='EEXIST'?'Existing .env was preserved. Update it privately instead of rerunning setup.':e.message);
  process.exitCode=1;
});
