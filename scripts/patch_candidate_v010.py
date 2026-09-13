from pathlib import Path

path = Path("app-candidate.js")
code = path.read_text(encoding="utf-8")

if "TIDE DASH v0.9" not in code and "TIDE DASH v0.10" not in code:
    raise SystemExit("Unexpected candidate version")

code = code.replace(
    "// TIDE DASH v0.9 — UX Lock: rolling 24h / explicit refresh / simplified station flow",
    "// TIDE DASH v0.10 — Reliability: static station master / stale cache visibility"
)
code = code.replace(
    '  catalog:"TideDashStations.json",\n  farKm:50,',
    '  catalog:"TideDashStations.json",\n  stationCatalogURL:"https://raw.githubusercontent.com/48wr9f4wgp-lab/tide-dash/main/stations.json",\n  farKm:50,'
)
code = code.replace(
    'const prefPath=fm.joinPath(fm.documentsDirectory(),C.prefs);\nconst catPath=fm.joinPath(fm.documentsDirectory(),C.catalog);',
    'const prefPath=fm.joinPath(fm.documentsDirectory(),C.prefs);\nconst catPath=fm.joinPath(fm.documentsDirectory(),C.catalog);\nconst NET={fallbacks:[]};'
)

start = code.index("async function stationCatalog(){")
end = code.index("\nfunction km(", start)
station_catalog = r'''async function stationCatalog(){
  let local=null;
  try{
    if(fm.fileExists(catPath)){
      const o=JSON.parse(fm.readString(catPath));
      if(Array.isArray(o.stations)&&o.stations.length>200)local=o;
      if(local?.savedAt&&Date.now()-local.savedAt<7*86400000)return local.stations;
    }
  }catch(_){}

  // Primary catalog: versioned static snapshot generated from the official JMA list.
  try{
    const r=new Request(C.stationCatalogURL+(C.stationCatalogURL.includes("?")?"&":"?")+"t="+Date.now());
    r.timeoutInterval=12;
    r.headers={"Cache-Control":"no-cache"};
    const remote=JSON.parse(await r.loadString());
    if(remote?.complete===true&&Array.isArray(remote.stations)&&remote.stations.length>200){
      const packed={...remote,savedAt:Date.now()};
      fm.writeString(catPath,JSON.stringify(packed));
      return remote.stations;
    }
  }catch(_){}

  // Network failure: a previously validated full catalog is safer than a tiny fallback set.
  if(local?.stations?.length>200)return local.stations;

  // Legacy recovery path only. This is not the normal runtime path.
  try{
    const r=new Request("https://www.data.jma.go.jp/kaiyou/db/tide/suisan/station");
    r.timeoutInterval=15;
    const st=parseStations(await r.loadString());
    if(st.length>200){
      fm.writeString(catPath,JSON.stringify({savedAt:Date.now(),complete:true,count:st.length,stations:st}));
      return st;
    }
  }catch(_){}

  return [
    C.defaultFav,
    {code:"TK",name:"東京",lat:35.65,lon:139.7667,area:"東京湾"},
    {code:"D3",name:"大洗",lat:36.3,lon:140.5667,area:"茨城"},
    {code:"D2",name:"鹿島",lat:35.9333,lon:140.7,area:"茨城"},
    {code:"CS",name:"銚子漁港",lat:35.75,lon:140.8667,area:"千葉"},
    {code:"QL",name:"千葉",lat:35.5667,lon:140.05,area:"千葉"},
    {code:"QS",name:"横浜",lat:35.45,lon:139.65,area:"神奈川"},
    {code:"QN",name:"横須賀",lat:35.2833,lon:139.65,area:"神奈川"},
    {code:"OD",name:"小田原",lat:35.2333,lon:139.15,area:"神奈川"},
    {code:"Z3",name:"伊東",lat:34.9,lon:139.1333,area:"伊東"},
    {code:"G9",name:"石廊崎",lat:34.6167,lon:138.85,area:"南伊豆"},
    {code:"D6",name:"下田",lat:34.6833,lon:138.9667,area:"下田"},
    {code:"SM",name:"清水港",lat:35.0167,lon:138.5167,area:"清水"}
  ];
}'''
code = code[:start] + station_catalog + code[end:]

start = code.index("async function cache(url,key,ttl){")
end = code.index("\nconst cachedJSON=", start)
cache_fn = r'''async function cache(url,key,ttl){
  const path=fm.joinPath(cacheDir,key);
  if(fm.fileExists(path)){
    const m=fm.modificationDate(path);
    if(m&&Date.now()-m.getTime()<ttl)return fm.readString(path);
  }
  try{
    const r=new Request(url);r.timeoutInterval=15;
    const s=await r.loadString();fm.writeString(path,s);return s;
  }catch(e){
    if(fm.fileExists(path)){
      const mod=fm.modificationDate(path);
      const ageMin=mod?Math.max(0,Math.round((Date.now()-mod.getTime())/60000)):null;
      if(key.startsWith("weather_")||key.startsWith("marine_"))NET.fallbacks.push({key,ageMin});
      return fm.readString(path);
    }
    throw e;
  }
}'''
code = code[:start] + cache_fn + code[end:]

start = code.index("async function buildCurrent(forceLocation=false){")
end = code.index("\nasync function present(", start)
build_fn = r'''async function buildCurrent(forceLocation=false){
  NET.fallbacks.length=0;
  const r=await resolveStation(forceLocation),now=new Date();
  let t,wp=null,err=null;
  try{t=await tide(now,r.station)}
  catch(e){
    const w=new ListWidget();w.backgroundColor=new Color(C.t.bg1);w.setPadding(14,14,14,14);
    text(w,"TIDE DASH",18,C.t.fg,true);w.addSpacer(8);text(w,"潮位データを取得できません",13,C.t.warn,true);w.addSpacer(4);text(w,String(e),9,C.t.sub);return w;
  }
  try{wp=await weather(now,r.station)}catch(_){err="⚠ 天気/波を取得できません"}
  if(!err&&NET.fallbacks.length){
    const ages=NET.fallbacks.map(x=>x.ageMin).filter(x=>x!=null);
    const age=ages.length?Math.max(...ages):null;
    if(age==null)err="⚠ 天気/波はキャッシュ表示";
    else if(age<60)err=`⚠ 天気/波 キャッシュ ${age}分前`;
    else err=`⚠ 天気/波 キャッシュ ${Math.floor(age/60)}時間前`;
  }
  return widget(t,wp,r.station,r.badge,r.badgeColor,err);
}'''
code = code[:start] + build_fn + code[end:]

required = [
    "stationCatalogURL",
    "remote.stations.length>200",
    "NET.fallbacks",
    "キャッシュ",
    "rolling 24h" if False else "graphStart=nm-120",
]
for needle in required:
    if needle not in code:
        raise SystemExit(f"Patch validation failed: {needle}")

path.write_text(code, encoding="utf-8")
print("Patched app-candidate.js to v0.10 reliability candidate")
