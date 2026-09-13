// TIDE DASH v0.10 Runtime Bootstrap
// Stable/Candidate failover layer. Keep this file small and rarely changed.

const RUNTIME={
  manifestURL:"https://raw.githubusercontent.com/48wr9f4wgp-lab/tide-dash/main/manifest.json",
  stableCache:"TIDE_DASH_APP_STABLE.js",
  stableMeta:"TIDE_DASH_APP_STABLE_META.json",
  timeoutSec:12,
  fallbackStableURL:"https://raw.githubusercontent.com/48wr9f4wgp-lab/tide-dash/main/app-stable.js"
};

const fm=FileManager.local();
const docs=fm.documentsDirectory();
const stablePath=fm.joinPath(docs,RUNTIME.stableCache);
const metaPath=fm.joinPath(docs,RUNTIME.stableMeta);

function readJSON(path){
  try{return fm.fileExists(path)?JSON.parse(fm.readString(path)):null}catch(_){return null}
}
function writeJSON(path,obj){
  try{fm.writeString(path,JSON.stringify(obj))}catch(_){}
}
function validCode(code){
  return typeof code==="string"&&code.length>1000&&code.includes("TIDE DASH")&&code.includes("Script.complete");
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
async function fetchAndRun(url){
  const code=await getText(url);
  await execute(code);
  return code;
}
async function runStable(manifest,candidateError){
  const wanted=manifest?.stableVersion||"unknown";
  const meta=readJSON(metaPath);

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
    return;
  }catch(stableError){
    // Last resort: any previously successful stable cache, even if version metadata is old.
    if(fm.fileExists(stablePath)){
      try{await execute(fm.readString(stablePath));return}catch(_){}
    }
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
      await fetchAndRun(manifest.candidateURL);
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
