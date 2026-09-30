const fs=require('fs'),assert=require('assert');
const AsyncFunction=Object.getPrototypeOf(async function(){}).constructor;
const source=fs.readFileSync(process.argv[2]||'main.js','utf8');
const app=label=>'// TIDE DASH Script.complete '+'.'.repeat(1100)+'\nglobalThis.__tideAudit.push('+JSON.stringify(label)+');';
(async()=>{
 for(const scenario of ['manifest-offline','candidate-download-fails','candidate-corrupt-hash']){
  globalThis.__tideAudit=[];
  const files=new Map([['/docs/TIDE_DASH_APP_LAST_GOOD.js',app('dev28')],['/docs/TIDE_DASH_APP_STABLE.js',app('stable12')],['/docs/TIDE_DASH_APP_STABLE_META.json',JSON.stringify({version:'0.12.0'})]]);
  const fm={documentsDirectory:()=>'/docs',joinPath:(a,b)=>a+'/'+b,fileExists:p=>files.has(p),readString:p=>files.get(p),writeString:(p,s)=>files.set(p,s)};
  const manifest={stableVersion:'0.12.0',candidateEnabled:true,candidateVersion:'dev28',candidateURL:'https://test/candidate',candidateSHA256:'0'.repeat(64)};
  class Request{constructor(url){this.url=url;}async loadString(){if(this.url.includes('manifest.json')){if(scenario==='manifest-offline')throw Error('offline');return JSON.stringify(manifest);}if(this.url.includes('candidate')){if(scenario==='candidate-download-fails')throw Error('network');return app('wrong-hash-executed');}throw Error('offline');}}
  await new AsyncFunction('FileManager','Request','config',source)({local:()=>fm},Request,{runsInWidget:true});
  if(scenario==='manifest-offline')assert.deepStrictEqual(globalThis.__tideAudit,['dev28']);
  if(scenario==='candidate-download-fails')assert.deepStrictEqual(globalThis.__tideAudit,['stable12']);
  if(scenario==='candidate-corrupt-hash')assert.deepStrictEqual(globalThis.__tideAudit,['wrong-hash-executed']);
  console.log(scenario+': '+globalThis.__tideAudit.join(','));
 }
 delete globalThis.__tideAudit;
})().catch(e=>{console.error(e);process.exit(1)});
