// TIDE DASH v0.12.2 — Small Widget polish: compact AUTO distance
const C={
  refresh:30,
  cache:"TideDashCacheV09",
  prefs:"TideDashPrefs.json",
  catalog:"TideDashStations.json",
  stationCatalogURL:"https://raw.githubusercontent.com/48wr9f4wgp-lab/tide-dash/main/stations.json",
  farKm:50,
  maxFavorites:5,
  defaultFav:{code:"UC",name:"内浦",lat:35.0167,lon:138.8833,area:"沼津"},
  t:{
    bg1:"#061824",bg2:"#0A3147",panel:"#0E3A50",
    fg:"#F7FBFF",sub:"#9AB5C7",muted:"#85A7BA",
    a:"#39E0DB",b:"#6AA8FF",grid:"#34566A",warn:"#FFBD55"
  }
};

const fm=FileManager.local();
const cacheDir=fm.joinPath(fm.documentsDirectory(),C.cache);
if(!fm.fileExists(cacheDir))fm.createDirectory(cacheDir,true);
const prefPath=fm.joinPath(fm.documentsDirectory(),C.prefs);
const catPath=fm.joinPath(fm.documentsDirectory(),C.catalog);
const NET={fallbacks:[]};

const p2=n=>String(n).padStart(2,"0");
const dateKey=d=>`${d.getFullYear()}-${p2(d.getMonth()+1)}-${p2(d.getDate())}`;
const hourKey=d=>`${dateKey(d)}T${p2(d.getHours())}:00`;
const minDay=d=>d.getHours()*60+d.getMinutes()+d.getSeconds()/60;
const addDay=(d,n)=>{const x=new Date(d);x.setDate(x.getDate()+n);return x};
const eventClock=e=>`${p2(Math.floor(((e.absoluteMinute??e.minute)%1440+1440)%1440/60))}:${p2(Math.floor(((e.absoluteMinute??e.minute)%60+60)%60))}`;
const clockFromAbs=m=>{m=((Math.round(m)%1440)+1440)%1440;return `${p2(Math.floor(m/60))}:${p2(m%60)}`};
const leftText=m=>{m=Math.max(0,Math.round(m));const h=Math.floor(m/60),mm=m%60;return h?`あと${h}時間${p2(mm)}分`:`あと${mm}分`};
const dir8=d=>{if(d==null||Number.isNaN(d))return"--";return["北","北東","東","南東","南","南西","西","北西"][Math.round((((d%360)+360)%360)/45)%8]};
const weatherIcon=c=>c==null?"·":c===0?"☀︎":[1,2].includes(c)?"🌤":c===3?"☁︎":[45,48].includes(c)?"霧":[51,53,55,56,57,61,63,65,66,67,80,81,82].includes(c)?"☂︎":[71,73,75,77,85,86].includes(c)?"雪":[95,96,99].includes(c)?"雷":"·";
const f1=(v,s="")=>v==null?"--":`${Number(v).toFixed(1)}${s}`;
const signedTide=v=>{const n=Math.round(Number(v));return !Number.isFinite(n)?"--":n>0?`+${n}`:n<0?`−${Math.abs(n)}`:"0"};
const sinD=d=>Math.sin((((d%360)+360)%360)*Math.PI/180);
function newMoonJDE(k){
  const T=k/1236.85,T2=T*T,T3=T2*T,T4=T3*T,E=1-.002516*T-.0000074*T2;
  const M=2.5534+29.10535670*k-.0000014*T2-.00000011*T3;
  const Mp=201.5643+385.81693528*k+.0107582*T2+.00001238*T3-.000000058*T4;
  const F=160.7108+390.67050284*k-.0016118*T2-.00000227*T3+.000000011*T4;
  const O=124.7746-1.56375588*k+.0020672*T2+.00000215*T3;
  const c=-.40720*sinD(Mp)+.17241*E*sinD(M)+.01608*sinD(2*Mp)+.01039*sinD(2*F)
    +.00739*E*sinD(Mp-M)-.00514*E*sinD(Mp+M)+.00208*E*E*sinD(2*M)
    -.00111*sinD(Mp-2*F)-.00057*sinD(Mp+2*F)+.00056*E*sinD(2*Mp+M)
    -.00042*sinD(3*Mp)+.00042*E*sinD(M+2*F)+.00038*E*sinD(M-2*F)
    -.00024*E*sinD(2*Mp-M)-.00017*sinD(O)-.00007*sinD(Mp+2*M)
    +.00004*sinD(2*Mp-2*F)+.00004*sinD(3*M)+.00003*sinD(Mp+M-2*F)
    +.00003*sinD(2*Mp+2*F)-.00003*sinD(Mp+M+2*F)+.00003*sinD(Mp-M+2*F)
    -.00002*sinD(Mp-M-2*F)-.00002*sinD(3*Mp+M)+.00002*sinD(4*Mp);
  return 2451550.09765+29.530588853*k+.0001337*T2-.000000150*T3+.00000000073*T4+c;
}
const jstDayIndex=ms=>Math.floor((ms+9*3600000)/86400000);
function tideCycle(date=new Date()){
  const jd=date.getTime()/86400000+2440587.5,today=jstDayIndex(date.getTime());
  const guess=Math.floor((jd-2451550.09765)/29.530588853);
  let baseDay=null;
  for(let k=guess-2;k<=guess+2;k++){
    const ms=(newMoonJDE(k)-2440587.5)*86400000,di=jstDayIndex(ms);
    if(di<=today&&(baseDay==null||di>baseDay))baseDay=di;
  }
  const lunarDay=Math.max(1,Math.min(30,baseDay==null?1:today-baseDay+1));
  let name;
  if([1,2,14,15,16,17,29,30].includes(lunarDay))name="大潮";
  else if([3,4,5,6,12,13,18,19,20,21,27,28].includes(lunarDay))name="中潮";
  else if([7,8,9,22,23,24].includes(lunarDay))name="小潮";
  else if([10,25].includes(lunarDay))name="長潮";
  else name="若潮";
  return{name,lunarDay};
}

function scriptURL(action){
  try{
    const base=URLScheme.forRunningScript();
    return `${base}${base.includes("?")?"&":"?"}action=${encodeURIComponent(action)}`;
  }catch(_){return null}
}

function stationKey(s){return s?.code||""}
function uniqueStations(a){
  const seen=new Set(),out=[];
  for(const s of a||[]){
    if(!s||!s.code||seen.has(s.code))continue;
    seen.add(s.code);out.push(s);
  }
  return out;
}
function loadPrefs(){
  const base={mode:"auto",favorites:[C.defaultFav],fixedStation:C.defaultFav,lastStation:C.defaultFav,lastLocation:null};
  try{
    const old=JSON.parse(fm.readString(prefPath));
    let favorites=old.favorites;
    if(!Array.isArray(favorites))favorites=[old.favorite||C.defaultFav];
    favorites=uniqueStations(favorites);
    if(!favorites.length)favorites=[C.defaultFav];
    return {...base,...old,favorites,fixedStation:old.fixedStation||old.favorite||favorites[0]};
  }catch(_){return base}
}
function savePrefs(p){
  p.favorites=uniqueStations(p.favorites).slice(0,C.maxFavorites);
  fm.writeString(prefPath,JSON.stringify(p));
}

function stripHtml(s){
  return s.replace(/<br\s*\/?>/gi," ").replace(/<[^>]+>/g,"")
    .replace(/&nbsp;|&#160;/g," ").replace(/&amp;/g,"&")
    .replace(/&#39;|&apos;/g,"'").replace(/&quot;/g,'"').trim();
}
function coord(s){const a=(s.match(/\d+/g)||[]).map(Number);return a.length?a[0]+(a[1]||0)/60:null}
function parseStations(html){
  const out=[];
  for(const row of html.match(/<tr[\s\S]*?<\/tr>/gi)||[]){
    const cells=[...row.matchAll(/<td[^>]*>([\s\S]*?)<\/td>/gi)].map(m=>stripHtml(m[1]));
    if(cells.length<5)continue;
    const code=cells[1]?.trim(),name=cells[2]?.replace(/\s+/g,""),lat=coord(cells[3]||""),lon=coord(cells[4]||"");
    if(/^[A-Z0-9]{2}$/.test(code)&&name&&lat&&lon)out.push({code,name,lat,lon,area:""});
  }
  return out;
}
async function stationCatalog(){
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
}
function km(a,b,c,d){
  const R=6371,to=x=>x*Math.PI/180,p1=to(a),p2v=to(c),dp=to(c-a),dl=to(d-b);
  const x=Math.sin(dp/2)**2+Math.cos(p1)*Math.cos(p2v)*Math.sin(dl/2)**2;
  return 2*R*Math.asin(Math.sqrt(x));
}
function nearest(st,loc){
  let best=null;
  for(const s of st){
    const d=km(loc.latitude,loc.longitude,s.lat,s.lon);
    if(!best||d<best.distanceKm)best={...s,distanceKm:d};
  }
  return best;
}
async function currentLocation(){Location.setAccuracyToKilometer();return await Location.current()}

async function resolveStation(force=false){
  const p=loadPrefs(),stations=await stationCatalog();
  if(p.mode==="fixed"){
    return{station:p.fixedStation||p.favorites[0]||C.defaultFav,prefs:p,badge:"★ 固定",badgeColor:C.t.a};
  }
  let loc=null;
  try{
    const fresh=p.lastLocation&&Date.now()-p.lastLocation.savedAt<20*60000&&!force;
    if(fresh)loc=p.lastLocation;
    else{
      const q=await currentLocation();
      loc={latitude:q.latitude,longitude:q.longitude,savedAt:Date.now()};
      p.lastLocation=loc;savePrefs(p);
    }
  }catch(_){}
  if(loc){
    const n=nearest(stations,loc);
    if(n){
      p.lastStation=n;savePrefs(p);
      const d=Math.round(n.distanceKm);
      return{
        station:n,prefs:p,
        badge:d>=C.farKm?`AUTO · ⚠ ${d}km`:`AUTO · ${d}km`,
        badgeColor:C.t.muted
      };
    }
  }
  if(p.lastStation)return{station:p.lastStation,prefs:p,badge:"AUTO · 前回地点",badgeColor:C.t.muted};
  return{station:p.favorites[0]||C.defaultFav,prefs:p,badge:"⚠ 位置情報なし",badgeColor:C.t.warn};
}

async function searchAndFix(p){
  const st=await stationCatalog(),a=new Alert();
  a.title="地点を検索";
  a.message="潮位基準点名で検索します";
  a.addTextField("例：大洗 / 下田 / 東京","");
  a.addAction("検索");a.addCancelAction("キャンセル");
  if(await a.presentAlert()<0)return false;
  const q=a.textFieldValue(0).trim();if(!q)return false;
  const hits=st.filter(x=>x.name.includes(q)).slice(0,12);
  if(!hits.length){
    const z=new Alert();z.title="見つかりません";z.message="別の地点名で検索してください";z.addAction("OK");await z.presentAlert();
    return searchAndFix(p);
  }
  const b=new Alert();b.title="固定する地点";
  hits.forEach(x=>b.addAction(x.name));b.addCancelAction("キャンセル");
  const i=await b.presentSheet();if(i<0)return false;
  const s=hits[i];
  p.mode="fixed";p.fixedStation=s;p.favorites=uniqueStations([s,...p.favorites]);savePrefs(p);
  return true;
}
async function addCurrentFavorite(p){
  try{
    const st=await stationCatalog(),loc=await currentLocation(),n=nearest(st,loc);
    if(!n)return false;
    p.favorites=uniqueStations([n,...p.favorites]);p.fixedStation=n;p.mode="fixed";savePrefs(p);
    return true;
  }catch(_){
    const z=new Alert();z.title="位置情報を取得できません";z.message="iPhoneの設定でScriptableの位置情報を許可してください";z.addAction("OK");await z.presentAlert();
    return false;
  }
}
async function settings(){
  const p=loadPrefs(),a=new Alert();
  a.title="TIDE DASH 地点";
  a.message=p.mode==="auto"?"現在：AUTO":"現在：固定";
  a.addAction("◎ AUTO　現在地から選ぶ");
  const favs=p.favorites.slice(0,C.maxFavorites);
  favs.forEach(s=>a.addAction(`★ ${s.name}`));
  a.addAction("🔎 地点を検索");
  a.addAction("＋ 現在の最寄りをお気に入り");
  a.addCancelAction("閉じる");
  const i=await a.presentSheet();
  if(i<0)return;
  if(i===0){
    p.mode="auto";p.lastLocation=null;savePrefs(p);await resolveStation(true).catch(()=>{});return;
  }
  if(i>=1&&i<=favs.length){
    const s=favs[i-1];p.mode="fixed";p.fixedStation=s;savePrefs(p);return;
  }
  if(i===1+favs.length){await searchAndFix(p);return}
  if(i===2+favs.length){await addCurrentFavorite(p)}
}

async function cache(url,key,ttl){
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
}
const cachedJSON=async(u,k,t)=>JSON.parse(await cache(u,k,t));

function parseLine(line){
  if(!line||line.length<136)return null;
  const hourly=[];
  for(let i=0;i<24;i++){
    const raw=line.slice(i*3,i*3+3),v=parseInt(raw.trim(),10);
    if(!raw.trim()||!Number.isFinite(v))return null;
    hourly.push(v);
  }
  const yy=parseInt(line.slice(72,74).trim(),10),mo=parseInt(line.slice(74,76).trim(),10),da=parseInt(line.slice(76,78).trim(),10);
  if(![yy,mo,da].every(Number.isFinite))return null;
  const year=yy>=70?1900+yy:2000+yy;
  const ev=(off,type)=>{
    const out=[];
    for(let i=0;i<4;i++){
      const b=off+i*7,hm=line.slice(b,b+4),lv=line.slice(b+4,b+7);
      if(!hm.trim()||!lv.trim()||hm==="9999"||lv==="999")continue;
      const h=parseInt(hm.slice(0,2).trim(),10),m=parseInt(hm.slice(2,4),10),l=parseInt(lv.trim(),10);
      if([h,m,l].every(Number.isFinite)&&h>=0&&h<24&&m>=0&&m<60)out.push({type,minute:h*60+m,level:l});
    }
    return out;
  };
  return{key:`${year}-${p2(mo)}-${p2(da)}`,hourly,events:[...ev(80,"high"),...ev(108,"low")].sort((a,b)=>a.minute-b.minute)};
}
function parseAnnual(s){
  const m=new Map();
  for(const line of s.split(/\r?\n/)){const d=parseLine(line);if(d)m.set(d.key,d)}
  return m;
}
async function annual(y,S){
  const u=`https://www.data.jma.go.jp/gmd/kaiyou/data/db/tide/suisan/txt/${y}/${S.code}.txt`;
  return parseAnnual(await cache(u,`jma_${S.code}_${y}.txt`,12*3600000));
}
function absHourly(day,offset){
  if(!day)return[];
  return day.hourly.map((level,h)=>({minute:offset+h*60,level}));
}
function interpolateHourly(points,m){
  if(!points.length)return null;
  if(m<=points[0].minute)return points[0].level;
  if(m>=points[points.length-1].minute)return points[points.length-1].level;
  let i=0;
  while(i<points.length-1&&points[i+1].minute<m)i++;
  const a=points[i],b=points[i+1],f=(m-a.minute)/(b.minute-a.minute);
  return a.level+(b.level-a.level)*f;
}
async function tide(now,S){
  const yd=addDay(now,-1),td=addDay(now,1),t2=addDay(now,2);
  const yrs=[...new Set([yd.getFullYear(),now.getFullYear(),td.getFullYear(),t2.getFullYear()])];
  const maps=await Promise.all(yrs.map(y=>annual(y,S))),all=new Map();
  for(const m of maps)for(const[k,v]of m)all.set(k,v);
  const prev=all.get(dateKey(yd)),today=all.get(dateKey(now)),next=all.get(dateKey(td)),next2=all.get(dateKey(t2));
  if(!today)throw Error(`JMA tide data missing for ${dateKey(now)}`);

  const hourly=[
    ...absHourly(prev,-1440),
    ...absHourly(today,0),
    ...absHourly(next,1440),
    ...absHourly(next2,2880)
  ].sort((a,b)=>a.minute-b.minute);

  const nm=minDay(now),current=interpolateHourly(hourly,nm);
  const events=[];
  if(prev)for(const e of prev.events)events.push({...e,absoluteMinute:e.minute-1440});
  for(const e of today.events)events.push({...e,absoluteMinute:e.minute});
  if(next)for(const e of next.events)events.push({...e,absoluteMinute:1440+e.minute});
  if(next2)for(const e of next2.events)events.push({...e,absoluteMinute:2880+e.minute});
  events.sort((a,b)=>a.absoluteMinute-b.absoluteMinute);

  const pe=[...events].reverse().find(e=>e.absoluteMinute<=nm)||null;
  const futureEvents=events.filter(e=>e.absoluteMinute>nm).slice(0,4);
  const ne=futureEvents[0]||null;
  let progress=null;
  if(pe&&ne&&ne.absoluteMinute>pe.absoluteMinute)progress=Math.max(0,Math.min(1,(nm-pe.absoluteMinute)/(ne.absoluteMinute-pe.absoluteMinute)));
  const ext=today.events.map(e=>e.level),range=ext.length?Math.max(...ext)-Math.min(...ext):Math.max(...today.hourly)-Math.min(...today.hourly);

  const graphStart=nm-120,graphEnd=nm+1320;
  const graphSeries=[];
  for(let m=graphStart;m<=graphEnd;m+=15)graphSeries.push({minute:m,level:interpolateHourly(hourly,m)});
  return{today,hourly,current,nowMin:nm,previousEvent:pe,nextEvent:ne,futureEvents,phaseProgress:progress,dailyRange:range,graphStart,graphEnd,graphSeries};
}

async function weather(now,S){
  const tz="Asia%2FTokyo";
  const wu=`https://api.open-meteo.com/v1/forecast?latitude=${S.lat}&longitude=${S.lon}&hourly=temperature_2m,precipitation,weather_code,wind_speed_10m,wind_direction_10m&daily=sunrise,sunset&wind_speed_unit=ms&timezone=${tz}&forecast_days=2`;
  const mu=`https://marine-api.open-meteo.com/v1/marine?latitude=${S.lat}&longitude=${S.lon}&hourly=wave_height,wave_direction,wave_period&timezone=${tz}&forecast_days=2&cell_selection=sea`;
  const[w,m]=await Promise.all([
    cachedJSON(wu,`weather_${S.code}.json`,25*60000),
    cachedJSON(mu,`marine_${S.code}.json`,25*60000).catch(()=>null)
  ]);
  const k=hourKey(now),wi=w.hourly?.time?.indexOf(k)??-1,mi=m?.hourly?.time?.indexOf(k)??-1;
  const current={
    temp:wi>=0?w.hourly.temperature_2m[wi]:null,
    precip:wi>=0?w.hourly.precipitation[wi]:null,
    weatherCode:wi>=0?w.hourly.weather_code[wi]:null,
    wind:wi>=0?w.hourly.wind_speed_10m[wi]:null,
    windDir:wi>=0?w.hourly.wind_direction_10m[wi]:null,
    wave:mi>=0?m.hourly.wave_height[mi]:null,
    waveDir:mi>=0?m.hourly.wave_direction[mi]:null,
    wavePeriod:mi>=0?m.hourly.wave_period[mi]:null,
    sunrise:w.daily?.sunrise?.[0]?.slice(11,16)??"--:--",
    sunset:w.daily?.sunset?.[0]?.slice(11,16)??"--:--"
  };
  const slots=[],sh=Math.ceil(now.getHours()/3)*3;
  for(let n=0;n<4;n++){
    const d=new Date(now);d.setMinutes(0,0,0);d.setHours(sh+n*3);
    const a=w.hourly?.time?.indexOf(hourKey(d))??-1,b=m?.hourly?.time?.indexOf(hourKey(d))??-1;
    if(a<0)continue;
    slots.push({time:`${p2(d.getHours())}:00`,weatherCode:w.hourly.weather_code[a],temp:w.hourly.temperature_2m[a],precip:w.hourly.precipitation[a],wind:w.hourly.wind_speed_10m[a],wave:b>=0?m.hourly.wave_height[b]:null});
  }
  return{current,slots};
}


function hmMinute(s){
  if(!/^\d{2}:\d{2}$/.test(s||""))return null;
  const [h,m]=s.split(":").map(Number);
  return h*60+m;
}
function cyclicMinuteDistance(a,b){
  if(a==null||b==null)return Infinity;
  const d=Math.abs(a-b)%1440;
  return Math.min(d,1440-d);
}
function fishingGuide(t,we,now=new Date()){
  const p=t.phaseProgress==null?.5:Math.max(0,Math.min(1,t.phaseProgress));
  const tideMove=Math.max(0,Math.sin(Math.PI*p));
  const range=Math.max(0,Math.min(1,(t.dailyRange-40)/140));
  const nm=minDay(now);
  const sunrise=hmMinute(we?.sunrise),sunset=hmMinute(we?.sunset);
  const lightDist=Math.min(cyclicMinuteDistance(nm,sunrise),cyclicMinuteDistance(nm,sunset));
  const magic=Number.isFinite(lightDist)?Math.max(0,1-lightDist/90):0;
  const score=Math.round(100*(.70*tideMove+.20*magic+.10*range));
  let label,stars;
  if(score>=78){label="かなり狙い目";stars="★★★★★"}
  else if(score>=62){label="狙い目";stars="★★★★☆"}
  else if(score>=45){label="まだ狙える";stars="★★★☆☆"}
  else if(score>=28){label="やや弱い";stars="★★☆☆☆"}
  else{label="潮待ち";stars="★☆☆☆☆"}

  let tideReason;
  if(p<=.12||p>=.88)tideReason="満干潮が近い";
  else if(p<=.30)tideReason="潮位変化が増えやすい";
  else if(p<=.70)tideReason="潮位変化が大きい時間帯";
  else tideReason="潮位変化が小さくなりやすい";
  if(magic>=.65)tideReason=`マヅメ中・${tideReason}`;
  else if(magic>=.25)tideReason=`マヅメ接近・${tideReason}`;

  let condition="";
  if((we?.wind??0)>=8)condition="強風注意";
  else if((we?.wave??0)>=1.5)condition="波高め";
  else if((we?.wind??0)>=5)condition="風やや強め";
  else condition="釣行条件は穏やか";

  return{score,label,stars,shortReason:tideReason,tideMove,magic,range,condition};
}

function eventDayIndex(e){
  const m=e?.absoluteMinute??e?.minute??0;
  return Math.floor(m/1440);
}
function eventDayWord(e){
  const d=eventDayIndex(e);
  return d===1?"明日 ":d===2?"明後日 ":"";
}

function tideRead(t){
  const p=t.phaseProgress==null?.5:Math.max(0,Math.min(1,t.phaseProgress));
  const down=t.previousEvent?.type==="high"&&t.nextEvent?.type==="low";
  const up=t.previousEvent?.type==="low"&&t.nextEvent?.type==="high";
  const direction=down?"下げ":up?"上げ":"転流";
  const target=down?"干潮へ":up?"満潮へ":"転流付近";
  let stage,meaning;
  if(p<.12){stage="始まり";meaning="変化し始める"}
  else if(p<.35){stage="前半";meaning="変化大きめへ"}
  else if(p<.65){stage="中盤";meaning="変化大きめ"}
  else if(p<.88){stage="後半";meaning="変化小さめへ"}
  else{stage="終盤";meaning="満干潮が近い"}
  return{p,direction,target,stage,meaning,summary:`${direction}${stage}｜${target}・${meaning}`};
}
function tideBrief(tr){
  const target=tr.target==="干潮へ"?"干潮":tr.target==="満潮へ"?"満潮":"転流";
  if(tr.p>=.88)return `${target}直前・変化かなり小さめ`;
  if(tr.p>=.65)return `${target}近く・変化小さめ`;
  if(tr.p>=.35)return "変化大きめ";
  if(tr.p>=.12)return "変化が大きくなる";
  return "変化し始め";
}

async function showTideHelp(){
  const r=await resolveStation(false),now=new Date();
  let t;
  try{t=await tide(now,r.station)}catch(_){
    const a=new Alert();a.title="潮の見方";a.message="潮位データを取得できません";a.addAction("閉じる");await a.presentAlert();return;
  }
  const tr=tideRead(t),pct=t.phaseProgress==null?"--":`${Math.round(t.phaseProgress*100)}%`,tc=tideCycle(now);
  const next=t.nextEvent?`${t.nextEvent.type==="high"?"満潮":"干潮"} ${eventDayWord(t.nextEvent)}${eventClock(t.nextEvent)} / ${signedTide(t.nextEvent.level)}cm`:"--";
  const a=new Alert();
  a.title="🌊 潮の見方";
  a.message=[
    `潮回り：${tc.name}`,
    `いま：${tr.direction}${tr.stage}（${pct}）`,
    `意味：${tr.target}。${tr.meaning}目安`,
    `次：${next}`,
    "",
    "グラフの基本",
    "↗ 右上がり＝上げ潮（干潮→満潮）",
    "↘ 右下がり＝下げ潮（満潮→干潮）",
    "▲＝満潮　▼＝干潮　NOW＝現在",
    "",
    "％は『前の満干潮から次の満干潮まで、時間がどこまで進んだか』です。流速そのものではありません。",
    "",
    "潮回りは新月日を1日目とする一般的な旧暦基準の区分です。地域により呼び方が異なる場合があります。",
    "",
    "この表示は潮位の変化を読んだ目安です。潮位と実際の潮流（流れの速さ・向き）は同じではなく、地形・風・河川・海峡などで変わります。"
  ].join("\n");
  a.addAction("閉じる");
  await a.presentAlert();
}

async function showGuide(){
  const r=await resolveStation(false),now=new Date();
  let t,wp=null;
  try{t=await tide(now,r.station)}catch(e){
    const a=new Alert();a.title="釣りチャンス";a.message="潮位データを取得できません";a.addAction("閉じる");await a.presentAlert();return;
  }
  try{wp=await weather(now,r.station)}catch(_){}
  const we=wp?.current??null,g=fishingGuide(t,we,now);
  const next=t.nextEvent?`${t.nextEvent.type==="high"?"満潮":"干潮"} ${eventDayWord(t.nextEvent)}${eventClock(t.nextEvent)}`:"--";
  const a=new Alert();
  a.title=`🎣 ${g.label}  ${g.stars}`;
  a.message=[
    `今の目安：${g.score}/100`,
    `潮位変化要素：${Math.round(g.tideMove*100)}%`,
    `マヅメ要素：${Math.round(g.magic*100)}%`,
    `潮差要素：${Math.round(g.range*100)}%`,
    `次：${next}`,
    `状況：${g.condition}`,
    "",
    "これは『釣れる確率』ではありません。潮位変化・朝夕マヅメ・潮差から作る初心者向けの目安です。魚種、水温、ベイト、地形、仕掛けなどは未考慮です。",
    "",
    "潮の基本：満干潮の中間ほど潮位変化が大きくなりやすい傾向があります。実際の潮流の速さ・向きとは別物です。"
  ].join("\n");
  a.addAction("閉じる");
  await a.presentAlert();
}

function graph(t,width=650,height=220){
  const c=new DrawContext();c.size=new Size(width,height);c.opaque=false;c.respectScreenScale=true;
  const L=8,R=8,T=22,B=30,W=width-L-R,H=height-T-B,s=t.graphSeries.filter(p=>p.level!=null);
  let mn=Math.min(...s.map(p=>p.level)),mx=Math.max(...s.map(p=>p.level));
  if(Math.abs(mx-mn)<10){mx+=5;mn-=5}
  const pd=Math.max(5,(mx-mn)*.08);mn-=pd;mx+=pd;
  const X=m=>L+(m-t.graphStart)/(t.graphEnd-t.graphStart)*W,Y=l=>T+(1-(l-mn)/(mx-mn))*H;

  const area=new Path();area.move(new Point(X(s[0].minute),T+H));
  for(const p of s)area.addLine(new Point(X(p.minute),Y(p.level)));
  area.addLine(new Point(X(s[s.length-1].minute),T+H));area.closeSubpath();
  c.addPath(area);c.setFillColor(new Color(C.t.a,.10));c.fillPath();

  c.setStrokeColor(new Color(C.t.grid,.42));c.setLineWidth(1);
  const gridTimes=[];
  const firstGrid=Math.ceil(t.graphStart/360)*360;
  for(let m=firstGrid;m<=t.graphEnd;m+=360)gridTimes.push(m);
  for(const m of gridTimes){
    const p=new Path(),x=X(m);p.move(new Point(x,T));p.addLine(new Point(x,T+H));c.addPath(p);c.strokePath();
  }
  for(const ff of[.33,.66]){
    const p=new Path(),y=T+H*ff;p.move(new Point(L,y));p.addLine(new Point(L+W,y));c.addPath(p);c.strokePath();
  }

  const path=new Path();
  s.forEach((q,i)=>{const pt=new Point(X(q.minute),Y(q.level));i?path.addLine(pt):path.move(pt)});
  c.addPath(path);c.setStrokeColor(new Color(C.t.a));c.setLineWidth(5);c.strokePath();

  for(const e of t.futureEvents){
    if(e.absoluteMinute>t.graphEnd)continue;
    c.setFillColor(new Color(e.type==="high"?C.t.a:C.t.b));
    c.fillEllipse(new Rect(X(e.absoluteMinute)-5,Y(e.level)-5,10,10));
  }

  const x=X(t.nowMin),y=Y(t.current),nl=new Path();nl.move(new Point(x,T));nl.addLine(new Point(x,T+H));c.addPath(nl);
  c.setStrokeColor(new Color(C.t.fg,.75));c.setLineWidth(2);c.strokePath();
  c.setFillColor(new Color(C.t.fg));c.fillEllipse(new Rect(x-9,y-9,18,18));
  c.setFillColor(new Color(C.t.b));c.fillEllipse(new Rect(x-5,y-5,10,10));

  c.setFont(Font.semiboldSystemFont(18));c.setTextColor(new Color(C.t.sub));
  for(const m of gridTimes){
    const label=clockFromAbs(m),xx=X(m),tw=56;
    c.drawTextInRect(label,new Rect(Math.max(0,Math.min(width-tw,xx-tw/2)),height-25,tw,20));
  }
  c.setFont(Font.boldSystemFont(15));c.setTextColor(new Color(C.t.fg,.85));
  c.drawTextInRect("NOW",new Rect(Math.max(0,x-25),2,50,18));
  return c.getImage();
}

function miniGraph(t,width=420,height=118){
  const c=new DrawContext();c.size=new Size(width,height);c.opaque=false;c.respectScreenScale=true;
  const L=4,R=4,T=6,B=5,W=width-L-R,H=height-T-B,s=t.graphSeries.filter(p=>p.level!=null);
  let mn=Math.min(...s.map(p=>p.level)),mx=Math.max(...s.map(p=>p.level));
  if(Math.abs(mx-mn)<10){mx+=5;mn-=5}
  const pd=Math.max(5,(mx-mn)*.08);mn-=pd;mx+=pd;
  const X=m=>L+(m-t.graphStart)/(t.graphEnd-t.graphStart)*W,Y=l=>T+(1-(l-mn)/(mx-mn))*H;

  const area=new Path();area.move(new Point(X(s[0].minute),T+H));
  for(const p of s)area.addLine(new Point(X(p.minute),Y(p.level)));
  area.addLine(new Point(X(s[s.length-1].minute),T+H));area.closeSubpath();
  c.addPath(area);c.setFillColor(new Color(C.t.a,.10));c.fillPath();

  const path=new Path();
  s.forEach((q,i)=>{const pt=new Point(X(q.minute),Y(q.level));i?path.addLine(pt):path.move(pt)});
  c.addPath(path);c.setStrokeColor(new Color(C.t.a));c.setLineWidth(5);c.strokePath();

  for(const e of t.futureEvents){
    if(e.absoluteMinute>t.graphEnd)continue;
    c.setFillColor(new Color(e.type==="high"?C.t.a:C.t.b));
    c.fillEllipse(new Rect(X(e.absoluteMinute)-5,Y(e.level)-5,10,10));
  }

  const x=X(t.nowMin),y=Y(t.current),nl=new Path();nl.move(new Point(x,T));nl.addLine(new Point(x,T+H));c.addPath(nl);
  c.setStrokeColor(new Color(C.t.fg,.75));c.setLineWidth(2);c.strokePath();
  c.setFillColor(new Color(C.t.fg));c.fillEllipse(new Rect(x-8,y-8,16,16));
  c.setFillColor(new Color(C.t.b));c.fillEllipse(new Rect(x-4,y-4,8,8));
  return c.getImage();
}

function text(st,s,z,col,b=false){
  const t=st.addText(s);t.font=b?Font.boldSystemFont(z):Font.systemFont(z);t.textColor=new Color(col);t.lineLimit=1;t.minimumScaleFactor=.72;return t;
}
function metric(p,l,v,d=null){
  const b=p.addStack();b.layoutVertically();b.backgroundColor=new Color(C.t.panel,.55);b.cornerRadius=10;b.setPadding(7,8,7,8);
  text(b,l,9,C.t.sub);text(b,v,12,C.t.fg,true);if(d)text(b,d,9,C.t.muted);return b;
}
function badgeLine(st,badge,z,col){
  const m=String(badge).match(/^(.*?)(⚠.*)$/);
  if(!m)return text(st,badge,z,col,true);
  const r=st.addStack();r.layoutHorizontally();
  text(r,m[1],z,col,true);text(r,m[2],z,C.t.warn,true);return r;
}

function widget(t,wp,S,badge,badgeColor,err=null){
  const family=config.widgetFamily||"large",small=family==="small",large=family==="large";
  const w=new ListWidget();
  w.setPadding(large?16:12,14,large?14:10,14);
  const g=new LinearGradient();g.colors=[new Color(C.t.bg1),new Color(C.t.bg2)];g.locations=[0,1];w.backgroundGradient=g;
  const we=wp?.current??null,settingsURL=scriptURL("settings"),refreshURL=scriptURL("refresh"),guideURL=scriptURL("guide"),tideHelpURL=scriptURL("tidehelp");
  const fg=fishingGuide(t,we,new Date());

  // Dedicated small layout A: tide-first hierarchy for quick glances.
  if(small){
    w.setPadding(9,10,9,10);

    const sh=w.addStack();sh.layoutHorizontally();sh.centerAlignContent();
    const sl=sh.addStack();sl.layoutVertically();
    text(sl,S.name,14,C.t.fg,true);
    const smallBadge=String(badge).replace(/AUTO\s*·\s*/,"AUTO ").replace(/\s+/g," ").trim();
    badgeLine(sl,`${smallBadge}  ▾`,7,badgeColor||C.t.muted);
    if(settingsURL)sl.url=settingsURL;
    sh.addSpacer();
    const sd=new Date(),stc=tideCycle(sd),sr=sh.addStack();sr.layoutVertically();
    text(sr,`${sd.getMonth()+1}/${sd.getDate()}・${stc.name}`,8,C.t.fg,true);
    const rr=sr.addStack();rr.layoutHorizontally();rr.addSpacer();
    const rtxt=text(rr,"↻",11,C.t.sub,true);if(refreshURL)rtxt.url=refreshURL;

    w.addSpacer(4);
    const main=w.addStack();main.layoutHorizontally();main.centerAlignContent();
    const sc=main.addStack();sc.layoutVertically();
    text(sc,"推算潮位",7,C.t.sub,true);
    const cv=sc.addStack();cv.layoutHorizontally();cv.centerAlignContent();
    text(cv,signedTide(t.current),27,C.t.fg,true);cv.addSpacer(2);text(cv,"cm",12,C.t.fg,true);
    const sdown=t.previousEvent?.type==="high"&&t.nextEvent?.type==="low",sup=t.previousEvent?.type==="low"&&t.nextEvent?.type==="high";
    const sdir=sdown?"↘ 下げ":sup?"↗ 上げ":"→ 転流",spct=t.phaseProgress==null?"":`${Math.round(t.phaseProgress*100)}%`,str=tideRead(t);
    text(sc,`${sdir}${spct?" "+spct:""}・${str.stage}`,8,C.t.a,true);
    if(tideHelpURL)sc.url=tideHelpURL;

    main.addSpacer();
    if(t.nextEvent){
      const e=t.nextEvent,sn=main.addStack();sn.layoutVertically();sn.backgroundColor=new Color(C.t.panel,.45);sn.cornerRadius=9;sn.setPadding(4,6,4,6);
      text(sn,`${e.type==="high"?"次の満潮":"次の干潮"} ${eventClock(e)}`,9,C.t.fg,true);
      text(sn,leftText(e.absoluteMinute-t.nowMin),7,C.t.sub);
      text(sn,`${signedTide(e.level)}cm`,7,C.t.sub);
    }

    w.addSpacer(4);
    const simg=w.addImage(miniGraph(t));simg.imageSize=new Size(138,43);simg.applyFittingContentMode();
    w.addSpacer(3);

    const sf=w.addStack();sf.layoutHorizontally();sf.centerAlignContent();
    if(we&&(we.wind??0)>=8){
      text(sf,`⚠ 風 ${Number(we.wind).toFixed(1)}m/s`,8,C.t.warn,true);
    }else if(we&&(we.wave??0)>=1.5){
      text(sf,`⚠ 波 ${Number(we.wave).toFixed(1)}m`,8,C.t.warn,true);
    }else{
      const fish=text(sf,`🎣 ${fg.stars}`,8,C.t.fg,true);if(guideURL)fish.url=guideURL;
    }
    sf.addSpacer();
    if(we)text(sf,`波 ${we.wave!=null?Number(we.wave).toFixed(1)+"m":"--"}`,7,C.t.muted);

    if(err){w.addSpacer(2);text(w,err,7,C.t.warn)}
    w.refreshAfterDate=new Date(Date.now()+C.refresh*60000);
    return w;
  }

  // Dedicated medium layout. Keep tide-first hierarchy and preserve tap targets
  // without trying to squeeze the large widget into a shorter canvas.
  if(!large){
    const mh=w.addStack();mh.layoutHorizontally();mh.centerAlignContent();
    const ml=mh.addStack();ml.layoutVertically();
    text(ml,S.name,15,C.t.fg,true);
    badgeLine(ml,`${badge}  ▾`,8,badgeColor||C.t.sub);
    if(settingsURL)ml.url=settingsURL;
    mh.addSpacer();
    const md=mh.addStack();md.layoutVertically();
    const nd=new Date(),mtc=tideCycle(nd);text(md,`${nd.getMonth()+1}/${nd.getDate()}・${mtc.name}`,10,C.t.fg,true);
    mh.addSpacer(7);
    const mrf=mh.addStack();mrf.layoutVertically();mrf.backgroundColor=new Color(C.t.panel,.55);mrf.cornerRadius=9;mrf.setPadding(3,6,3,6);
    text(mrf,"↻",14,C.t.sub,true);if(refreshURL)mrf.url=refreshURL;

    w.addSpacer(3);
    const ms=w.addStack();ms.layoutHorizontally();ms.centerAlignContent();
    const mc=ms.addStack();mc.layoutVertically();
    text(mc,`${signedTide(t.current)} cm`,24,C.t.fg,true);
    const mdown=t.previousEvent?.type==="high"&&t.nextEvent?.type==="low",mup=t.previousEvent?.type==="low"&&t.nextEvent?.type==="high";
    const mdr=mdown?"↘ 下げ":mup?"↗ 上げ":"→ 転流",mph=t.phaseProgress==null?"":`${Math.round(t.phaseProgress*100)}%`,mtr=tideRead(t);
    text(mc,`${mdr}${mph?" "+mph:""}・${mtr.stage}｜${mtr.meaning}`,8,C.t.a,true);
    if(tideHelpURL)mc.url=tideHelpURL;
    ms.addSpacer();
    if(t.nextEvent){
      const e=t.nextEvent,mn=ms.addStack();mn.layoutVertically();mn.backgroundColor=new Color(C.t.panel,.45);mn.cornerRadius=10;mn.setPadding(4,7,4,7);
      text(mn,`${e.type==="high"?"満潮":"干潮"} ${eventDayWord(e)}${eventClock(e)}`,12,C.t.fg,true);
      text(mn,`${leftText(e.absoluteMinute-t.nowMin)} · ${signedTide(e.level)}cm`,8,C.t.sub);
    }

    w.addSpacer(2);
    const mi=w.addImage(graph(t));mi.imageSize=new Size(310,62);mi.applyFittingContentMode();
    w.addSpacer(2);

    const foot=w.addStack();foot.layoutHorizontally();foot.centerAlignContent();
    if(we){
      text(foot,`${weatherIcon(we.weatherCode)} ${we.temp!=null?Math.round(we.temp)+"℃":"--"}`,8,C.t.sub,true);
      foot.addSpacer(8);
      text(foot,`風 ${we.wind!=null?Number(we.wind).toFixed(1):"--"}${we.wind!=null?"m/s":""} ${dir8(we.windDir)}`,8,C.t.sub,true);
      foot.addSpacer(8);
      text(foot,`波 ${we.wave!=null?Number(we.wave).toFixed(1)+"m":"--"}`,8,C.t.sub,true);
      foot.addSpacer();
      const fish=text(foot,`🎣 ${fg.stars}`,8,C.t.fg,true);if(guideURL)fish.url=guideURL;
    }else{
      const future=t.futureEvents.slice(1,3).map(e=>`${e.type==="high"?"▲":"▼"}${eventClock(e)}`).join("  ");
      text(foot,future||"JMA tide",8,C.t.sub,true);
    }
    if(err){w.addSpacer(2);text(w,err,7,C.t.warn)}
    w.refreshAfterDate=new Date(Date.now()+C.refresh*60000);
    return w;
  }

  const hd=w.addStack();hd.layoutHorizontally();hd.centerAlignContent();
  const pl=hd.addStack();pl.layoutVertically();
  text(pl,S.name,large?22:16,C.t.fg,true);
  badgeLine(pl,`${badge}  ▾`,large?9:8,badgeColor||C.t.muted);
  if(settingsURL)pl.url=settingsURL;
  hd.addSpacer();

  const info=hd.addStack();info.layoutVertically();
  const d=new Date(),tc=tideCycle(d);text(info,`${d.getMonth()+1}/${d.getDate()}・${tc.name}`,large?15:12,C.t.fg,true);
  text(info,we?`☀︎${we.sunrise}  ☾${we.sunset}`:"JMA",large?10:8,C.t.sub);
  hd.addSpacer(8);

  const rf=hd.addStack();rf.layoutVertically();rf.backgroundColor=new Color(C.t.panel,.6);rf.cornerRadius=10;rf.setPadding(5,8,5,8);
  text(rf,"↻",large?18:15,C.t.sub,true);if(refreshURL)rf.url=refreshURL;

  w.addSpacer(large?9:5);

  const st=w.addStack();st.layoutHorizontally();st.centerAlignContent();
  const cur=st.addStack();cur.layoutVertically();
  text(cur,"推算潮位",9,C.t.sub,true);
  text(cur,`${signedTide(t.current)} cm`,large?34:24,C.t.fg,true);
  const down=t.previousEvent?.type==="high"&&t.nextEvent?.type==="low",up=t.previousEvent?.type==="low"&&t.nextEvent?.type==="high";
  const dr=down?"↘ 下げ":up?"↗ 上げ":"→ 転流付近",ph=t.phaseProgress==null?"":` ${Math.round(t.phaseProgress*100)}%`;
  const tr=tideRead(t);
  text(cur,`${dr}${ph} · ${tr.stage}`,large?11:9,C.t.sub);
  if(large){
    text(cur,`潮読み  ${tideBrief(tr)}  ›`,10,C.t.a,true);
    if(tideHelpURL)cur.url=tideHelpURL;
  }

  st.addSpacer();
  const nx=st.addStack();nx.layoutVertically();nx.backgroundColor=new Color(C.t.panel,.48);nx.cornerRadius=12;nx.setPadding(large?7:5,large?9:7,large?7:5,large?9:7);
  if(t.nextEvent){
    const e=t.nextEvent;text(nx,`${e.type==="high"?"次の満潮":"次の干潮"} ${eventDayWord(e)}${eventClock(e)}`,large?17:13,C.t.fg,true);
    text(nx,`${leftText(e.absoluteMinute-t.nowMin)} ${signedTide(e.level)}cm`,large?11:9,C.t.sub);
  }

  w.addSpacer(large?8:3);
  const im=w.addImage(graph(t));im.imageSize=new Size(large?325:310,large?128:88);im.applyFittingContentMode();
  w.addSpacer(large?6:2);

  const ex=w.addStack();ex.layoutHorizontally();
  const rest=t.futureEvents.slice(1,large?4:3);
  if(rest.length){
    const firstDay=eventDayIndex(rest[0]);
    const rowLabel=firstDay===1?"明日":firstDay===2?"明後日":"その後";
    text(ex,rowLabel,large?8:7,C.t.muted,true);ex.addSpacer(6);
    let prevDay=firstDay;
    rest.forEach((e,i,a)=>{
      const day=eventDayIndex(e),roll=i>0&&day!==prevDay?(day===1?"翌 ":day===2?"翌々 ":""):"";
      text(ex,`${roll}${e.type==="high"?"▲":"▼"}${eventClock(e)} ${signedTide(e.level)}`,large?10:8,e.type==="high"?C.t.a:C.t.b,true);
      prevDay=day;if(i<a.length-1)ex.addSpacer();
    });
  }

  w.addSpacer(large?12:6);
  if(we){
    const ms=w.addStack();ms.layoutHorizontally();
    metric(ms,"天気",`${weatherIcon(we.weatherCode)} ${we.temp!=null?Math.round(we.temp)+"℃":"--"}`,`雨 ${we.precip!=null?Number(we.precip).toFixed(1):"--"}mm`);
    ms.addSpacer(5);metric(ms,"風",`${f1(we.wind,"m/s")} ${dir8(we.windDir)}`);
    ms.addSpacer(5);metric(ms,"波",f1(we.wave,"m"),[we.waveDir!=null?dir8(we.waveDir):null,we.wavePeriod!=null?`${Number(we.wavePeriod).toFixed(0)}秒`:null].filter(Boolean).join("・")||null);
    ms.addSpacer(5);const chance=metric(ms,"釣り目安 ›",fg.stars,fg.label);if(guideURL)chance.url=guideURL;
  }


  if(err){w.addSpacer(4);text(w,err,8,C.t.warn)}
  w.refreshAfterDate=new Date(Date.now()+C.refresh*60000);
  return w;
}

async function buildCurrent(forceLocation=false){
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
}
async function present(w){
  const f=config.widgetFamily||"large";
  if(f==="small")await w.presentSmall();
  else if(f==="medium")await w.presentMedium();
  else await w.presentLarge();
}
async function main(){
  const action=args.queryParameters?.action;
  if(config.runsInApp&&action==="tidehelp"){await showTideHelp();return null;}
  if(config.runsInApp&&action==="guide"){await showGuide();return null;}
  if(config.runsInApp&&action==="settings"){
    await settings();const w=await buildCurrent(true);await present(w);return null;
  }
  if(config.runsInApp&&action==="refresh"){
    const p=loadPrefs();
    if(p.mode==="auto"){p.lastLocation=null;savePrefs(p)}
    const w=await buildCurrent(true);await present(w);return null;
  }
  return await buildCurrent(false);
}
const W=await main();
if(W){
  if(config.runsInWidget)Script.setWidget(W);
  else await present(W);
}
Script.complete();
