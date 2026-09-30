const fs=require('fs'),assert=require('assert'),crypto=require('crypto');
const source=fs.readFileSync(process.argv[2]||'main.js','utf8');
const AsyncFunction=Object.getPrototypeOf(async function(){}).constructor;
const hash=s=>crypto.createHash('sha256').update(s).digest('hex');
const app=(version,label=version,body='')=>'// TIDE DASH Script.complete '+'.'.repeat(1100)+'\nconst APP_VERSION='+JSON.stringify(version)+';globalThis.__runtimeAudit.push('+JSON.stringify(label)+');'+body;
(async()=>{
 const helper=await new AsyncFunction('FileManager',source.slice(0,source.indexOf('try{\n  let manifest=null;'))+'\nreturn {sha256,validCandidate};')({local:()=>({documentsDirectory:()=>'/docs',joinPath:(a,b)=>a+'/'+b})});
 const unicode=['','abc','a'.repeat(55),'a'.repeat(56),'a'.repeat(64),'a'.repeat(100000),'伊東 ⚡🌊\n\r\n','\uD800','\uDC00','\uD800x'];
 for(const text of unicode)assert.equal(helper.sha256(text),hash(text));
 const deployed=fs.readFileSync('app-candidate.js','utf8');assert.equal(helper.sha256(deployed),hash(deployed));
 console.log('SHA256: 10 UTF8/boundary vectors + deployed source PASS');
 let cases=0;
 for(const scenario of ['network-valid','candidate-download-fails','manifest-offline','wrong-hash','missing-hash','wrong-version','disabled-offline','rollback-offline','old-meta-download-fails','cache-corrupt','candidate-throws','stable-fails-active-cache','all-unavailable']){
  globalThis.__runtimeAudit=[];const errors=[];
  const active=app('dev29'),stable=app('stable12'),files=new Map();
  const manifest={stableVersion:'stable12',stableURL:'https://test/stable',candidateEnabled:true,candidateVersion:'dev29',candidateURL:'https://test/active',candidateSHA256:hash(active)};
  const cache=()=>{files.set('/docs/TIDE_DASH_APP_LAST_GOOD.js',active);files.set('/docs/TIDE_DASH_APP_LAST_GOOD_META.json',JSON.stringify({kind:'candidate',version:'dev29',source:'https://test/active',sha256:hash(active)}));};cache();
  files.set('/docs/TIDE_DASH_APP_STABLE.js',stable);files.set('/docs/TIDE_DASH_APP_STABLE_META.json',JSON.stringify({version:'stable12'}));
  if(scenario==='missing-hash')delete manifest.candidateSHA256;
  if(scenario==='disabled-offline')manifest.candidateEnabled=false;
  if(scenario==='rollback-offline'){manifest.candidateVersion='dev28';manifest.candidateURL='https://test/rollback';manifest.candidateSHA256=hash(app('dev28'));}
  if(scenario==='old-meta-download-fails')files.set('/docs/TIDE_DASH_APP_LAST_GOOD_META.json',JSON.stringify({kind:'candidate',version:'dev28',source:'https://test/old'}));
  if(scenario==='cache-corrupt')files.set('/docs/TIDE_DASH_APP_LAST_GOOD.js',app('dev29','corrupt'));
  if(scenario==='candidate-throws')manifest.candidateSHA256=hash(app('dev29','broken',"throw Error('broken');"));
  if(scenario==='stable-fails-active-cache')files.delete('/docs/TIDE_DASH_APP_STABLE.js');
  if(scenario==='all-unavailable')files.clear();
  const fm={documentsDirectory:()=>'/docs',joinPath:(a,b)=>a+'/'+b,fileExists:p=>files.has(p),readString:p=>files.get(p),writeString:(p,s)=>files.set(p,s)};
  class Request{constructor(url){this.url=url;}async loadString(){
   if(this.url.includes('manifest.json')){if(scenario==='manifest-offline')throw Error('offline');return JSON.stringify(manifest);}
   if(this.url.includes('/active')||this.url.includes('/rollback')){
    if(['candidate-download-fails','disabled-offline','rollback-offline','old-meta-download-fails','cache-corrupt','stable-fails-active-cache','all-unavailable'].includes(scenario))throw Error('offline');
    if(scenario==='wrong-hash')return app('dev29','wrong');
    if(scenario==='wrong-version'){const wrong=app('dev28','wrong');manifest.candidateSHA256=hash(wrong);return wrong;}
    if(scenario==='candidate-throws')return app('dev29','broken',"throw Error('broken');");
    return active;
   }
   if(scenario==='stable-fails-active-cache'||scenario==='all-unavailable')throw Error('offline');
   return stable;
  }}
  if(scenario==='wrong-version'){const wrong=app('dev28','wrong');manifest.candidateSHA256=hash(wrong);}
  class ListWidget{setPadding(){}addText(s){errors.push(s);return {};}addSpacer(){}}
  class Color{constructor(){}static white(){return {};}}
  await new AsyncFunction('FileManager','Request','config','ListWidget','Color','Font','Script',source)({local:()=>fm},Request,{runsInWidget:true},ListWidget,Color,{boldSystemFont:()=>({}),systemFont:()=>({})},{setWidget:()=>{},complete:()=>{}});
  const expected=['network-valid','candidate-download-fails','manifest-offline','stable-fails-active-cache'].includes(scenario)?['dev29']:scenario==='candidate-throws'?['broken','stable12']:scenario==='all-unavailable'?[]:['stable12'];
  assert.deepStrictEqual(globalThis.__runtimeAudit,expected,scenario);
  if(scenario==='all-unavailable')assert(errors.includes('安全起動に失敗'));
  if(scenario==='network-valid'){const meta=JSON.parse(files.get('/docs/TIDE_DASH_APP_LAST_GOOD_META.json'));assert.equal(meta.sha256,hash(active));}
  console.log('PASS '+scenario);cases++;
 }
 delete globalThis.__runtimeAudit;console.log(cases+' runtime scenarios PASS');
})().catch(e=>{console.error(e);process.exit(1)});
