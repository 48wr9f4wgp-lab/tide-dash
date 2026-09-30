// TIDE DASH v0.12 Runtime Bootstrap
// Stable/Candidate failover layer. Keep this file small and rarely changed.

const RUNTIME={
  manifestURL:"https://raw.githubusercontent.com/48wr9f4wgp-lab/tide-dash/main/manifest.json",
  stableCache:"TIDE_DASH_APP_STABLE.js",
  stableMeta:"TIDE_DASH_APP_STABLE_META.json",
  lastGoodCache:"TIDE_DASH_APP_LAST_GOOD.js",
  lastGoodMeta:"TIDE_DASH_APP_LAST_GOOD_META.json",
  version:"0.12.0",
  timeoutSec:12,
  fallbackStableURL:"https://raw.githubusercontent.com/48wr9f4wgp-lab/tide-dash/main/app-stable.js"
};

const fm=FileManager.local();
const docs=fm.documentsDirectory();
const stablePath=fm.joinPath(docs,RUNTIME.stableCache);
const metaPath=fm.joinPath(docs,RUNTIME.stableMeta);
const lastGoodPath=fm.joinPath(docs,RUNTIME.lastGoodCache);
const lastGoodMetaPath=fm.joinPath(docs,RUNTIME.lastGoodMeta);

function readJSON(path){
  try{return fm.fileExists(path)?JSON.parse(fm.readString(path)):null}catch(_){return null}
}
function writeJSON(path,obj){
  try{fm.writeString(path,JSON.stringify(obj))}catch(_){}
}
function validCode(code){
  return typeof code==="string"&&code.length>1000&&code.includes("TIDE DASH")&&code.includes("Script.complete");
}
// Pure JavaScript SHA-256 over UTF-8; no WebView or third-party dependency.
function sha256(text){
  const bytes=[];
  for(let i=0;i<text.length;i++){
    let c=text.charCodeAt(i);
    if(c>=0xD800&&c<=0xDBFF){
      const next=text.charCodeAt(i+1);
      if(next>=0xDC00&&next<=0xDFFF){c=0x10000+((c-0xD800)<<10)+(next-0xDC00);i++;}else c=0xFFFD;
    }else if(c>=0xDC00&&c<=0xDFFF)c=0xFFFD;
    if(c<0x80)bytes.push(c);
    else if(c<0x800)bytes.push(0xC0|(c>>6),0x80|(c&63));
    else if(c<0x10000)bytes.push(0xE0|(c>>12),0x80|((c>>6)&63),0x80|(c&63));
    else bytes.push(0xF0|(c>>18),0x80|((c>>12)&63),0x80|((c>>6)&63),0x80|(c&63));
  }
  const length=bytes.length;bytes.push(0x80);while(bytes.length%64!==56)bytes.push(0);
  const hi=Math.floor(length/0x20000000),lo=(length*8)>>>0;
  for(const n of [hi,lo])for(let shift=24;shift>=0;shift-=8)bytes.push((n>>>shift)&255);
  const k=[0x428a2f98,0x71374491,0xb5c0fbcf,0xe9b5dba5,0x3956c25b,0x59f111f1,0x923f82a4,0xab1c5ed5,0xd807aa98,0x12835b01,0x243185be,0x550c7dc3,0x72be5d74,0x80deb1fe,0x9bdc06a7,0xc19bf174,0xe49b69c1,0xefbe4786,0x0fc19dc6,0x240ca1cc,0x2de92c6f,0x4a7484aa,0x5cb0a9dc,0x76f988da,0x983e5152,0xa831c66d,0xb00327c8,0xbf597fc7,0xc6e00bf3,0xd5a79147,0x06ca6351,0x14292967,0x27b70a85,0x2e1b2138,0x4d2c6dfc,0x53380d13,0x650a7354,0x766a0abb,0x81c2c92e,0x92722c85,0xa2bfe8a1,0xa81a664b,0xc24b8b70,0xc76c51a3,0xd192e819,0xd6990624,0xf40e3585,0x106aa070,0x19a4c116,0x1e376c08,0x2748774c,0x34b0bcb5,0x391c0cb3,0x4ed8aa4a,0x5b9cca4f,0x682e6ff3,0x748f82ee,0x78a5636f,0x84c87814,0x8cc70208,0x90befffa,0xa4506ceb,0xbef9a3f7,0xc67178f2];
  const h=[0x6a09e667,0xbb67ae85,0x3c6ef372,0xa54ff53a,0x510e527f,0x9b05688c,0x1f83d9ab,0x5be0cd19],ro=(n,b)=>(n>>>b)|(n<<(32-b));
  for(let offset=0;offset<bytes.length;offset+=64){
    const w=[];for(let i=0;i<16;i++)w[i]=(bytes[offset+4*i]<<24)|(bytes[offset+4*i+1]<<16)|(bytes[offset+4*i+2]<<8)|bytes[offset+4*i+3];
    for(let i=16;i<64;i++){const x=w[i-15],y=w[i-2];w[i]=(w[i-16]+(ro(x,7)^ro(x,18)^(x>>>3))+w[i-7]+(ro(y,17)^ro(y,19)^(y>>>10)))>>>0;}
    let [a,b,c,d,e,f,g,z]=h;
    for(let i=0;i<64;i++){const t1=(z+(ro(e,6)^ro(e,11)^ro(e,25))+((e&f)^(~e&g))+k[i]+w[i])>>>0,t2=((ro(a,2)^ro(a,13)^ro(a,22))+((a&b)^(a&c)^(b&c)))>>>0;z=g;g=f;f=e;e=(d+t1)>>>0;d=c;c=b;b=a;a=(t1+t2)>>>0;}
    [a,b,c,d,e,f,g,z].forEach((v,i)=>h[i]=(h[i]+v)>>>0);
  }
  return h.map(v=>v.toString(16).padStart(8,"0")).join("");
}
function validCandidate(code,manifest){
  const expected=manifest?.candidateSHA256;
  if(!validCode(code)||typeof expected!=="string"||!/^[a-f0-9]{64}$/i.test(expected)||sha256(code)!==expected.toLowerCase())return false;
  const version=code.match(/const\s+APP_VERSION\s*=\s*["']([^"']+)["']/)?.[1];
  return version===manifest.candidateVersion;
}
async function getText(url){
  const r=new Request(url+(url.includes("?")?"&":"?")+"t="+Date.now());
  r.timeoutInterval=RUNTIME.timeoutSec;
  r.headers={"Cache-Control":"no-cache"};
  return await r.loadString();
}
async function getJSON(url){return JSON.parse(await getText(url))}
function compile(code){
  const AsyncFunction=Object.getPrototypeOf(async function(){}).constructor;
  return new AsyncFunction(code);
}
async function execute(code){
  if(!validCode(code))throw new Error("code validation failed");
  const fn=compile(code); // syntax errors fail before execution
  await fn();
}
function saveLastGood(code,meta){
  try{
    if(!validCode(code))return;
    fm.writeString(lastGoodPath,code);
    writeJSON(lastGoodMetaPath,{...meta,sha256:sha256(code),savedAt:new Date().toISOString()});
  }catch(_){}
}
async function runLastGood(manifest=null){
  if(!fm.fileExists(lastGoodPath))return false;
  try{
    const code=fm.readString(lastGoodPath),meta=readJSON(lastGoodMetaPath);
    if(meta?.sha256&&sha256(code)!==meta.sha256)return false;
    if(manifest){
      if(meta?.kind==="candidate"){
        if(!manifest.candidateEnabled||meta.version!==manifest.candidateVersion||meta.source!==manifest.candidateURL||!validCandidate(code,manifest))return false;
      }else if(meta?.kind!=="stable"||meta.version!==manifest.stableVersion||meta.source!==manifest.stableURL)return false;
    }
    await execute(code);return true;
  }catch(_){return false}
}
async function runStable(manifest,candidateError){
  const wanted=manifest?.stableVersion||"unknown";
  const meta=readJSON(metaPath);

  // When the manifest itself is unavailable (typically offline), prefer the
  // most recently executed good app over an older stable build.
  if(!manifest&&await runLastGood())return;

  // Prefer the locally cached known-good stable build when versions match.
  if(fm.fileExists(stablePath)&&meta?.version===wanted){
    try{
      await execute(fm.readString(stablePath));
      return;
    }catch(_){}
  }

  // Refresh stable from the repository. Promote only after successful execution.
  const stableURL=manifest?.stableURL||RUNTIME.fallbackStableURL;
  try{
    const code=await getText(stableURL);
    await execute(code);
    fm.writeString(stablePath,code);
    writeJSON(metaPath,{version:wanted,savedAt:new Date().toISOString(),source:stableURL});
    saveLastGood(code,{kind:"stable",version:wanted,source:stableURL});
    return;
  }catch(stableError){
    // Last resort: any previously successful stable cache, even if version metadata is old.
    if(fm.fileExists(stablePath)){
      try{await execute(fm.readString(stablePath));return}catch(_){}
    }
    if(await runLastGood(manifest))return;
    throw new Error(`candidate=${candidateError||"n/a"}; stable=${stableError}`);
  }
}
async function showRuntimeError(error){
  const w=new ListWidget();
  w.backgroundColor=new Color("#061824");
  w.setPadding(14,14,14,14);
  const a=w.addText("TIDE DASH");a.font=Font.boldSystemFont(18);a.textColor=Color.white();
  w.addSpacer(8);
  const b=w.addText("安全起動に失敗");b.font=Font.boldSystemFont(13);b.textColor=new Color("#FFBD55");
  w.addSpacer(4);
  const c=w.addText(String(error));c.font=Font.systemFont(9);c.textColor=new Color("#9AB5C7");c.lineLimit=5;
  if(config.runsInWidget)Script.setWidget(w);else await w.presentMedium();
  Script.complete();
}

try{
  let manifest=null;
  try{manifest=await getJSON(RUNTIME.manifestURL)}catch(_){}

  let candidateError=null;
  if(manifest?.candidateEnabled&&manifest?.candidateURL){
    try{
      // Candidate is never promoted to the stable cache here.
      // A bad candidate therefore cannot destroy the last known-good stable build.
      let code,usedLastGood=false;
      try{code=await getText(manifest.candidateURL);}catch(downloadError){
        // Only a transport failure may reuse this exact active candidate.
        if(await runLastGood(manifest))usedLastGood=true;
        else throw downloadError;
      }
      if(!usedLastGood){
        if(!validCandidate(code,manifest))throw Error("candidate identity/hash mismatch");
        await execute(code);
        saveLastGood(code,{kind:"candidate",version:manifest.candidateVersion,source:manifest.candidateURL});
      }
    }catch(e){
      candidateError=String(e);
      await runStable(manifest,candidateError);
    }
  }else{
    await runStable(manifest,null);
  }
}catch(e){
  await showRuntimeError(e);
}

