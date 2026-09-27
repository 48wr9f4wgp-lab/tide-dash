// TIDE DASH v0.19.4 — Post-QA cleanup / production failure copy / verified baseline candidate
const C={
  refresh:30,
  cache:"TideDashCacheV09",
  prefs:"TideDashPrefs.json",
  catalog:"TideDashStations.json",
  spotCatalog:"TideDashSpots.json",
  portCatalog:"TideDashPorts.json",
  stationCatalogURL:"https://raw.githubusercontent.com/48wr9f4wgp-lab/tide-dash/main/stations.json",
  spotCatalogURL:"https://raw.githubusercontent.com/48wr9f4wgp-lab/tide-dash/main/spots.json",
  portCatalogURL:"https://raw.githubusercontent.com/48wr9f4wgp-lab/tide-dash/main/ports.json",
  farKm:50,
  maxFavorites:10,
  mazumeCoreMin:30,
  mazumeFadeMin:90,
  weatherFallbackMaxMin:180,
  tideRefCautionKm:30,
  tideRefWarnKm:50,
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
const spotPath=fm.joinPath(fm.documentsDirectory(),C.spotCatalog);
const portPath=fm.joinPath(fm.documentsDirectory(),C.portCatalog);
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

function stationKey(s){return s?.id||s?.code||""}
function uniqueStations(a){
  const seen=new Set(),out=[];
  for(const s of a||[]){
    const key=stationKey(s);
    if(!s||!s.code||!key||seen.has(key))continue;
    seen.add(key);out.push(s);
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
async function fishingSpotCatalog(){
  let local=null;
  try{
    if(fm.fileExists(spotPath)){
      const o=JSON.parse(fm.readString(spotPath));
      if(Array.isArray(o.spots)&&o.spots.length>=40)local=o;
      if(local?.savedAt&&Date.now()-local.savedAt<7*86400000)return local.spots.map(x=>({...x,kind:"spot"}));
    }
  }catch(_){}
  try{
    const r=new Request(C.spotCatalogURL+(C.spotCatalogURL.includes("?")?"&":"?")+"t="+Date.now());
    r.timeoutInterval=12;r.headers={"Cache-Control":"no-cache"};
    const remote=JSON.parse(await r.loadString());
    if(remote?.schemaVersion===1&&Array.isArray(remote.spots)&&remote.spots.length>=40){
      const packed={...remote,savedAt:Date.now()};
      fm.writeString(spotPath,JSON.stringify(packed));
      return remote.spots.map(x=>({...x,kind:"spot"}));
    }
  }catch(_){}
  if(local?.spots?.length>=40)return local.spots.map(x=>({...x,kind:"spot"}));
  return [];
}
async function fishingPortCatalog(){
  let local=null;
  try{
    if(fm.fileExists(portPath)){
      const o=JSON.parse(fm.readString(portPath));
      if(Array.isArray(o.ports)&&o.ports.length>=2000)local=o;
      if(local?.savedAt&&Date.now()-local.savedAt<7*86400000){
        return local.ports.map(x=>({...x,kind:"fishing_port",sourceYear:local.dataYear||2006}));
      }
    }
  }catch(_){}
  try{
    const r=new Request(C.portCatalogURL+(C.portCatalogURL.includes("?")?"&":"?")+"t="+Date.now());
    r.timeoutInterval=15;r.headers={"Cache-Control":"no-cache"};
    const remote=JSON.parse(await r.loadString());
    if(remote?.schemaVersion===1&&Array.isArray(remote.ports)&&remote.ports.length>=2000){
      const packed={...remote,savedAt:Date.now()};
      fm.writeString(portPath,JSON.stringify(packed));
      return remote.ports.map(x=>({...x,kind:"fishing_port",sourceYear:remote.dataYear||2006}));
    }
  }catch(_){}
  if(local?.ports?.length>=2000)return local.ports.map(x=>({...x,kind:"fishing_port",sourceYear:local.dataYear||2006}));
  return [];
}

const PORT_REGIONS={
  "北海道":["北海道"],
  "東北":["青森県","岩手県","宮城県","秋田県","山形県","福島県"],
  "関東":["茨城県","千葉県","東京都","神奈川県"],
  "北陸":["新潟県","富山県","石川県","福井県"],
  "東海":["静岡県","愛知県","三重県"],
  "近畿":["京都府","大阪府","兵庫県","和歌山県"],
  "中国":["鳥取県","島根県","岡山県","広島県","山口県"],
  "四国":["徳島県","香川県","愛媛県","高知県"],
  "九州":["福岡県","佐賀県","長崎県","熊本県","大分県","宮崎県","鹿児島県"],
  "沖縄":["沖縄県"]
};
function prefShort(s){return String(s||"").replace(/[都府県]$/,"")}
function spotInPref(x,pref){
  const q=prefShort(pref);
  return x?.prefecture===pref||String(x?.area||"").includes(q);
}
function locationChoiceLabel(x){
  if(x.kind==="spot")return `🎣 ${x.name}｜${x.area||x.type||""}（潮:${x.tideName||x.code}）`;
  if(x.kind==="fishing_port")return `⚓ ${x.name}｜${x.prefecture||""}（潮:${x.tideName||x.code} ${Number.isFinite(x.tideDistanceKm)?x.tideDistanceKm+"km":""}）`;
  if(x.kind==="area")return `📍 ${x.name}｜沿岸エリア（潮:${x.tideName||x.code}）`;
  return `🌊 ${x.name}｜潮位基準点`;
}
function fixLocation(p,x){
  if(!x)return false;
  p.mode="fixed";p.fixedStation=x;p.favorites=uniqueStations([x,...p.favorites]);savePrefs(p);return true;
}
async function pickPaged(items,title,labelFn,page=0,message=""){
  const size=16,total=Math.max(1,Math.ceil(items.length/size));
  page=Math.max(0,Math.min(total-1,page));
  const start=page*size,chunk=items.slice(start,start+size),a=new Alert();
  a.title=`${title}  ${page+1}/${total}`;
  if(message)a.message=message;
  chunk.forEach(x=>a.addAction(labelFn(x)));
  const hasPrev=page>0,hasNext=start+size<items.length;
  if(hasPrev)a.addAction("← 前へ");
  if(hasNext)a.addAction("次へ →");
  a.addCancelAction("キャンセル");
  const i=await a.presentSheet();
  if(i<0)return null;
  if(i<chunk.length)return chunk[i];
  let k=chunk.length;
  if(hasPrev&&i===k++)return pickPaged(items,title,labelFn,page-1,message);
  if(hasNext&&i===k++)return pickPaged(items,title,labelFn,page+1,message);
  return null;
}
async function browseFishingPorts(p,spots,ports){
  const ra=new Alert();ra.title="地方から選ぶ";
  const regions=Object.keys(PORT_REGIONS);
  regions.forEach(x=>ra.addAction(x));ra.addCancelAction("キャンセル");
  const ri=await ra.presentSheet();if(ri<0)return false;
  const region=regions[ri],prefs=PORT_REGIONS[region].filter(pref=>ports.some(x=>x.prefecture===pref)||spots.some(x=>spotInPref(x,pref)));
  const pa=new Alert();pa.title=`${region}｜都道府県`;
  prefs.forEach(x=>pa.addAction(x));pa.addCancelAction("キャンセル");
  const pi=await pa.presentSheet();if(pi<0)return false;
  const pref=prefs[pi];
  const curated=spots.filter(x=>spotInPref(x,pref));
  const official=ports.filter(x=>x.prefecture===pref);
  const items=[...curated,...official];
  const picked=await pickPaged(
    items,
    pref,
    locationChoiceLabel,
    0,
    `🎣厳選 ${curated.length}件 / ⚓全国漁港基礎データ ${official.length}件\n漁港位置は2006年度版。現況・立入可否・釣り可否は現地確認。`
  );
  return fixLocation(p,picked);
}
async function keywordLocationSearch(p,st,spots,ports,coastalAreas){
  const a=new Alert();
  a.title="キーワード検索";
  a.message="港・海岸・磯・地域名・都道府県・潮位基準点名で検索します。";
  a.addTextField("例：大洗 / 伊豆 / 寺泊 / 城ヶ島","");
  a.addAction("検索");a.addCancelAction("キャンセル");
  if(await a.presentAlert()<0)return false;
  const query=a.textFieldValue(0).trim();if(!query)return false;
  const matchSpot=x=>[x.name,x.area,x.type,x.prefecture,...(x.keywords||[])].some(v=>String(v||"").includes(query));
  const spotHits=spots.filter(matchSpot).slice(0,6);
  const portHits=ports.filter(matchSpot).slice(0,10);
  const areaHits=coastalAreas.filter(matchSpot).slice(0,5);
  const stationHits=st.filter(x=>x.name.includes(query)).map(x=>({...x,kind:"station"})).slice(0,3);
  const seen=new Set(),hits=[];
  for(const x of [...spotHits,...portHits,...areaHits,...stationHits]){
    const key=`${x.kind}:${x.id||x.code}:${x.name}`;
    if(seen.has(key))continue;seen.add(key);hits.push(x);
    if(hits.length>=18)break;
  }
  if(!hits.length){
    const z=new Alert();z.title="見つかりません";z.message="別の港・地域名で検索してください";z.addAction("OK");await z.presentAlert();
    return keywordLocationSearch(p,st,spots,ports,coastalAreas);
  }
  const picked=await pickPaged(hits,"検索結果",locationChoiceLabel,0,
    "⚓全国漁港は国土数値情報2006年度版を検索用基礎データとして使用。現況要確認。");
  return fixLocation(p,picked);
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
function tideReferenceFor(place,stations){
  if(!place?.code)return null;
  const ref=stations.find(x=>x.code===place.code)||null;
  const name=place.tideName||ref?.name||place.code;
  let distanceKm=null;
  if(ref&&Number.isFinite(place?.lat)&&Number.isFinite(place?.lon)){
    distanceKm=km(place.lat,place.lon,ref.lat,ref.lon);
  }else if(Number.isFinite(place?.tideDistanceKm)){
    distanceKm=Number(place.tideDistanceKm);
  }
  return{name,distanceKm,code:place.code};
}
function tideReferenceUI(ref){
  if(!ref?.name||!Number.isFinite(ref.distanceKm))return{text:"",shortText:"",level:"unknown"};
  const d=ref.distanceKm,ds=d<10?d.toFixed(1):String(Math.round(d)),shortDs=String(Math.round(d));
  if(d>=C.tideRefWarnKm)return{
    text:`⚠ 潮基準:${ref.name} ${ds}km`,
    shortText:`⚠${ref.name} ${shortDs}km`,
    level:"warn"
  };
  if(d>=C.tideRefCautionKm)return{
    text:`潮基準:${ref.name} ${ds}km 参考`,
    shortText:`${ref.name} ${shortDs}km 参考`,
    level:"caution"
  };
  return{
    text:`潮基準:${ref.name} ${ds}km`,
    shortText:`${ref.name} ${shortDs}km`,
    level:"near"
  };
}
async function currentLocation(){Location.setAccuracyToKilometer();return await Location.current()}

async function resolveStation(force=false){
  const p=loadPrefs(),stations=await stationCatalog();
  if(p.mode==="fixed"){
    const fixed=p.fixedStation||p.favorites[0]||C.defaultFav;
    return{
      station:fixed,prefs:p,badge:"★ 固定",badgeColor:C.t.a,distanceKm:null,
      locationState:"fixed",tideRef:tideReferenceFor(fixed,stations)
    };
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
        badgeColor:C.t.muted,distanceKm:d,locationState:d>=C.farKm?"far":"current",
        tideRef:{name:n.name,distanceKm:0,code:n.code}
      };
    }
  }
  if(p.lastStation)return{station:p.lastStation,prefs:p,badge:"AUTO · 前回地点",badgeColor:C.t.muted,distanceKm:Number.isFinite(p.lastStation?.distanceKm)?Math.round(p.lastStation.distanceKm):null,locationState:"previous"};
  return{station:p.favorites[0]||C.defaultFav,prefs:p,badge:"⚠ 位置情報なし",badgeColor:C.t.warn,distanceKm:null,locationState:"missing"};
}

function locationBlockedResult(r){return ["far","previous","missing"].includes(r?.locationState)}
function locationBlockMessage(r){
  if(r?.locationState==="far")return `最寄り潮位地点まで ${Math.round(r.distanceKm)}km。釣り地点を選択してください。`;
  if(r?.locationState==="previous")return "現在地を取得できず前回地点しか確認できません。現在地を更新してください。";
  return "現在地を取得できません。位置情報を確認するか釣り地点を固定してください。";
}
async function guardLocationForDetail(r,title){
  if(!locationBlockedResult(r))return false;
  const a=new Alert();a.title=title;a.message=locationBlockMessage(r);a.addAction("閉じる");await a.presentAlert();
  return true;
}
async function searchAndFix(p){
  const [st,spots,ports]=await Promise.all([stationCatalog(),fishingSpotCatalog(),fishingPortCatalog()]);
  const coastalAreas=st.map(x=>({
    ...x,id:`area-${x.code}`,name:`${x.name}周辺`,area:"沿岸エリア",type:"沿岸",
    kind:"area",tideName:x.name,keywords:[x.name]
  }));
  const a=new Alert();
  a.title="釣り地点を探す";
  a.message=`🎣 厳選スポット ${spots.length}件\n⚓ 全国漁港基礎データ ${ports.length}件\n📍 JMA沿岸エリア ${coastalAreas.length}件`;
  a.addAction("🔎 キーワード検索");
  a.addAction("🗾 地方・都道府県から選ぶ");
  a.addCancelAction("キャンセル");
  const i=await a.presentSheet();if(i<0)return false;
  if(i===0)return keywordLocationSearch(p,st,spots,ports,coastalAreas);
  if(i===1)return browseFishingPorts(p,spots,ports);
  return false;
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
function tideFailureWidget(detail="通信状況を確認して再読み込みしてください"){
  const w=new ListWidget();w.backgroundColor=new Color(C.t.bg1);w.setPadding(14,14,14,14);
  text(w,"TIDE DASH",18,C.t.fg,true);w.addSpacer(8);
  text(w,"潮位データを取得できません",13,C.t.warn,true);w.addSpacer(4);
  text(w,detail,9,C.t.sub);w.refreshAfterDate=new Date(Date.now()+C.refresh*60000);
  return w;
}

async function settings(){
  const p=loadPrefs(),a=new Alert();
  a.title="TIDE DASH 地点";
  a.message=p.mode==="auto"?"現在：AUTO":"現在：固定";
  a.addAction("◎ AUTO　現在地から選ぶ");
  const favs=p.favorites.slice(0,C.maxFavorites);
  favs.forEach(s=>a.addAction(`★ ${s.name}`));
  a.addAction("🔎 釣り地点を探す");
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
  if(i===2+favs.length){await addCurrentFavorite(p);return}
}

function cacheAgeMin(path){
  if(!fm.fileExists(path))return null;
  const mod=fm.modificationDate(path);
  return mod?Math.max(0,Math.round((Date.now()-mod.getTime())/60000)):null;
}
function validCachedRaw(raw,validator){
  try{return typeof raw==="string"&&raw.length>0&&(!validator||validator(raw))}catch(_){return false}
}
async function cache(url,key,ttl,opts={}){
  const path=fm.joinPath(cacheDir,key),validator=opts.validator||null,maxFallbackMin=opts.maxFallbackMin??null;
  const readValid=()=>{
    if(!fm.fileExists(path))return null;
    const raw=fm.readString(path);
    return validCachedRaw(raw,validator)?raw:null;
  };
  if(fm.fileExists(path)){
    const m=fm.modificationDate(path);
    if(m&&Date.now()-m.getTime()<ttl){
      const raw=readValid();
      if(raw!=null)return raw;
    }
  }
  try{
    const r=new Request(url);r.timeoutInterval=15;
    const raw=await r.loadString();
    if(!validCachedRaw(raw,validator))throw new Error(`invalid payload: ${key}`);
    fm.writeString(path,raw);
    return raw;
  }catch(e){
    const ageMin=cacheAgeMin(path),raw=readValid();
    const withinLimit=maxFallbackMin==null||(ageMin!=null&&ageMin<=maxFallbackMin);
    if(raw!=null&&withinLimit){
      if(key.startsWith("weather_")||key.startsWith("marine_"))NET.fallbacks.push({key,ageMin});
      return raw;
    }
    throw e;
  }
}
const cachedJSON=async(u,k,t,validateObj=null,maxFallbackMin=null)=>{
  const validator=raw=>{
    let obj;
    try{obj=JSON.parse(raw)}catch(_){return false}
    return !validateObj||validateObj(obj);
  };
  return JSON.parse(await cache(u,k,t,{validator,maxFallbackMin}));
};

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
  const raw=await cache(u,`jma_${S.code}_${y}.txt`,12*3600000,{validator:x=>parseAnnual(x).size>300});
  return parseAnnual(raw);
}
function absHourly(day,offset){
  if(!day)return[];
  return day.hourly.map((level,h)=>({minute:offset+h*60,level}));
}
function interpolateHourly(points,m){
  if(!points.length)return null;
  if(m<points[0].minute||m>points[points.length-1].minute)return null;
  if(m===points[0].minute)return points[0].level;
  if(m===points[points.length-1].minute)return points[points.length-1].level;
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
  if(current==null)throw Error("JMA tide coverage missing for current time");
  const dataStart=hourly.length?hourly[0].minute:null,dataEnd=hourly.length?hourly[hourly.length-1].minute:null;
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

  const graphStart=Math.floor((nm-120)/30)*30,graphEnd=graphStart+1440;
  const graphSeries=[];
  for(let m=graphStart;m<=graphEnd;m+=15)graphSeries.push({minute:m,level:interpolateHourly(hourly,m)});
  return{today,hourly,current,nowMin:nm,events,previousEvent:pe,nextEvent:ne,futureEvents,phaseProgress:progress,dailyRange:range,graphStart,graphEnd,graphSeries,dataStart,dataEnd};
}

async function weather(now,S){
  const tz="Asia%2FTokyo";
  const wu=`https://api.open-meteo.com/v1/forecast?latitude=${S.lat}&longitude=${S.lon}&hourly=temperature_2m,precipitation,weather_code,wind_speed_10m,wind_direction_10m&daily=sunrise,sunset&wind_speed_unit=ms&timezone=${tz}&forecast_days=2`;
  const mu=`https://marine-api.open-meteo.com/v1/marine?latitude=${S.lat}&longitude=${S.lon}&hourly=wave_height,wave_direction,wave_period,sea_surface_temperature,ocean_current_velocity,ocean_current_direction&timezone=${tz}&forecast_days=2&cell_selection=sea`;
  const k=hourKey(now),todayKey=dateKey(now),nextKey=dateKey(addDay(now,1));
  const validWeather=o=>{
    if(!Array.isArray(o?.hourly?.time)||!Array.isArray(o?.daily?.time))return false;
    const hi=o.hourly.time.indexOf(k),di=o.daily.time.indexOf(todayKey),dni=o.daily.time.indexOf(nextKey);
    if(hi<0||di<0||dni<0)return false;
    const nums=[
      o.hourly?.precipitation?.[hi],
      o.hourly?.wind_speed_10m?.[hi],
      o.hourly?.wind_direction_10m?.[hi]
    ];
    const sun=[o.daily?.sunrise?.[di],o.daily?.sunset?.[di],o.daily?.sunrise?.[dni],o.daily?.sunset?.[dni]];
    return nums.every(Number.isFinite)&&sun.every(x=>typeof x==="string"&&x.length>=16);
  };
  const validMarine=o=>{
    if(!Array.isArray(o?.hourly?.time))return false;
    const hi=o.hourly.time.indexOf(k);
    return hi>=0&&Number.isFinite(o?.hourly?.wave_height?.[hi]);
  };
  const w=await cachedJSON(wu,`weather_${S.code}.json`,25*60000,validWeather,C.weatherFallbackMaxMin);
  let m=null,marineIssue=null;
  try{m=await cachedJSON(mu,`marine_${S.code}.json`,25*60000,validMarine,C.weatherFallbackMaxMin)}catch(_){marineIssue="波を取得できません"}
  const wi=w.hourly.time.indexOf(k),mi=m?.hourly?.time?.indexOf(k)??-1;
  if(wi<0)throw Error("weather current hour missing");
  const di=w.daily.time.indexOf(todayKey),dni=w.daily.time.indexOf(nextKey);
  const current={
    temp:w.hourly.temperature_2m?.[wi]??null,
    precip:w.hourly.precipitation?.[wi]??null,
    weatherCode:w.hourly.weather_code?.[wi]??null,
    wind:w.hourly.wind_speed_10m?.[wi]??null,
    windDir:w.hourly.wind_direction_10m?.[wi]??null,
    wave:mi>=0?(m?.hourly?.wave_height?.[mi]??null):null,
    waveDir:mi>=0?(m?.hourly?.wave_direction?.[mi]??null):null,
    wavePeriod:mi>=0?(m?.hourly?.wave_period?.[mi]??null):null,
    sst:mi>=0?(m?.hourly?.sea_surface_temperature?.[mi]??null):null,
    currentVelocity:mi>=0?(m?.hourly?.ocean_current_velocity?.[mi]??null):null,
    currentDir:mi>=0?(m?.hourly?.ocean_current_direction?.[mi]??null):null,
    sunrise:di>=0?(w.daily.sunrise?.[di]?.slice(11,16)??"--:--"):"--:--",
    sunset:di>=0?(w.daily.sunset?.[di]?.slice(11,16)??"--:--"):"--:--",
    sunriseNext:dni>=0?(w.daily.sunrise?.[dni]?.slice(11,16)??"--:--"):"--:--",
    sunsetNext:dni>=0?(w.daily.sunset?.[dni]?.slice(11,16)??"--:--"):"--:--"
  };
  if(current.wave==null&&!marineIssue)marineIssue="波を取得できません";
  const slots=[],sh=Math.ceil(now.getHours()/3)*3;
  for(let n=0;n<4;n++){
    const d=new Date(now);d.setMinutes(0,0,0);d.setHours(sh+n*3);
    const a=w.hourly?.time?.indexOf(hourKey(d))??-1,b=m?.hourly?.time?.indexOf(hourKey(d))??-1;
    if(a<0)continue;
    slots.push({time:`${p2(d.getHours())}:00`,weatherCode:w.hourly.weather_code?.[a],temp:w.hourly.temperature_2m?.[a],precip:w.hourly.precipitation?.[a],wind:w.hourly.wind_speed_10m?.[a],wave:b>=0?(m?.hourly?.wave_height?.[b]??null):null});
  }
  const marineSeries=[];
  const baseDay=Date.UTC(now.getFullYear(),now.getMonth(),now.getDate());
  for(let i=0;i<(m?.hourly?.time?.length??0);i++){
    const ts=m.hourly.time[i],ymd=ts?.slice(0,10)?.split("-").map(Number),hm=ts?.slice(11,16)?.split(":").map(Number);
    if(!ymd||ymd.length!==3||!hm||hm.length!==2)continue;
    const [y,mo,da]=ymd,[hh,mm]=hm,day=(Date.UTC(y,mo-1,da)-baseDay)/86400000;
    const velocity=m.hourly?.ocean_current_velocity?.[i],direction=m.hourly?.ocean_current_direction?.[i];
    if(Number.isFinite(velocity))marineSeries.push({minute:day*1440+hh*60+mm,velocity,direction:Number.isFinite(direction)?direction:null});
  }
  return{current,slots,marineSeries,issues:marineIssue?[marineIssue]:[]};
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
function tideTurnAt(t,m){
  const ev=t.events||[];
  if(!ev.length)return 0;
  const d=Math.min(...ev.map(e=>Math.abs(e.absoluteMinute-m)));
  if(d<=30)return 1;
  if(d>=90)return 0;
  return Math.max(0,Math.min(1,(90-d)/60));
}
function tideOpportunityAt(t,m){
  const move=tideMoveAt(t,m),turn=tideTurnAt(t,m);

  // Two distinct tide modes with an intentional valley between them:
  // 1) "moving tide" only becomes meaningful once the phase is well underway,
  //    then peaks around the midpoint between high/low.
  // 2) "high/low window" stays a short provisional opportunity around extrema.
  // This prevents the two modes from covering nearly the whole day.
  const moveGate=Math.max(0,Math.min(1,(move-.55)/.45));
  const moveMode=.85*Math.pow(moveGate,1.45);
  const turnMode=.85*Math.pow(turn,1.15);

  return{move,turn,moveMode,turnMode,core:Math.max(moveMode,turnMode)};
}
function fishingScoreAt(t,we,m){
  if(!Number.isFinite(t?.dataStart)||!Number.isFinite(t?.dataEnd)||m<t.dataStart||m>t.dataEnd){
    return{score:null,valid:false,tide:{move:0,turn:0,moveMode:0,turnMode:0,core:0},magic:0,mazumeMode:0,overlap:0,range:0};
  }
  const tide=tideOpportunityAt(t,m);
  const range=Math.max(0,Math.min(1,(t.dailyRange-40)/140));
  const magic=lightFactorAt(m,we);

  // Mazume is now an independent opportunity mode, not merely a small bonus.
  // At the center of mazume, this mode is strong enough to make a "good" window
  // even when tide timing is weak. Tide + mazume overlap receives a synergy boost.
  const mazumeMode=.78*Math.pow(magic,1.10);
  const core=Math.max(tide.core,mazumeMode);
  const overlap=Math.min(tide.core,mazumeMode);
  const score=Math.round(100*(.75*core+.15*overlap+.10*range));

  return{score,valid:true,tide,magic,mazumeMode,overlap,range};
}
function fishingGuide(t,we,now=new Date()){
  const nm=minDay(now),calc=fishingScoreAt(t,we,nm),tide=calc.tide,range=calc.range,magic=calc.magic,mazumeMode=calc.mazumeMode,overlap=calc.overlap,score=calc.score;
  let label,stars;
  if(score>=78){label="かなり良い";stars="★★★★★"}
  else if(score>=62){label="良い";stars="★★★★☆"}
  else if(score>=45){label="まずまず";stars="★★★☆☆"}
  else if(score>=28){label="やや弱い";stars="★★☆☆☆"}
  else{label="弱い";stars="★☆☆☆☆"}

  let tideReason;
  if(tide.turn>=.7)tideReason="満干潮前後の候補";
  else if(tide.move>=.75)tideReason="潮がよく動く時間帯";
  else if(tide.turn>tide.move)tideReason="満干潮へ近づく時間帯";
  else tideReason="潮の動きは弱め";
  if(magic>=.65)tideReason=`マヅメ中・${tideReason}`;
  else if(magic>=.25)tideReason=`マヅメ接近・${tideReason}`;

  let condition="";
  if((we?.wind??0)>=8)condition="強風注意";
  else if((we?.wave??0)>=1.5)condition="波高め";
  else if((we?.wind??0)>=5)condition="風やや強め";
  else condition="釣行条件は穏やか";

  return{score,label,stars,shortReason:tideReason,tideMove:tide.move,tideTurn:tide.turn,tideCore:tide.core,magic,mazumeMode,overlap,range,condition};
}

function tideMoveAt(t,m){
  const ev=t.events||[];
  const pe=[...ev].reverse().find(e=>e.absoluteMinute<=m),ne=ev.find(e=>e.absoluteMinute>m);
  if(!pe||!ne||ne.absoluteMinute<=pe.absoluteMinute)return 0;
  const p=Math.max(0,Math.min(1,(m-pe.absoluteMinute)/(ne.absoluteMinute-pe.absoluteMinute)));
  return Math.max(0,Math.sin(Math.PI*p));
}
function lightFactorAt(m,we){
  const pts=[];
  const sr=hmMinute(we?.sunrise),ss=hmMinute(we?.sunset),sr2=hmMinute(we?.sunriseNext),ss2=hmMinute(we?.sunsetNext);
  if(sr!=null)pts.push(sr);if(ss!=null)pts.push(ss);
  if(sr2!=null)pts.push(1440+sr2);if(ss2!=null)pts.push(1440+ss2);
  if(!pts.length)return 0;
  const d=Math.min(...pts.map(x=>Math.abs(m-x)));
  if(d<=C.mazumeCoreMin)return 1;
  if(d>=C.mazumeFadeMin)return 0;
  return Math.max(0,Math.min(1,(C.mazumeFadeMin-d)/(C.mazumeFadeMin-C.mazumeCoreMin)));
}
function fishingWindowLabel(start,end){
  const ds=Math.floor(start/1440),de=Math.floor(end/1440);
  const prefix=d=>d===0?"":d===1?"明日 ":"明後日 ";
  if(ds===de)return `${prefix(ds)}${clockFromAbs(start)}〜${clockFromAbs(end)}`;
  return `${prefix(ds)}${clockFromAbs(start)}〜${prefix(de)}${clockFromAbs(end)}`;
}
function fishingPeaks(t,we,start,end){
  const samples=[],from=Math.floor(start/30)*30,to=Math.ceil(end/30)*30;
  for(let minute=from;minute<=to;minute+=30){
    const calc=fishingScoreAt(t,we,minute);
    samples.push({minute,score:Number.isFinite(calc.score)?calc.score:-1,tideMove:calc.tide.move,tideTurn:calc.tide.turn,tideCore:calc.tide.core,magic:calc.magic});
  }
  const peaks=[];
  for(let i=1;i<samples.length-1;i++){
    const a=samples[i-1],b=samples[i],c=samples[i+1];
    const localMax=b.score>=a.score&&b.score>=c.score&&(b.score>a.score||b.score>c.score);
    if(localMax&&b.score>=45)peaks.push(b);
  }
  return peaks;
}
function bestFishingWindow(t,we){
  const start=t.nowMin-60,end=t.nowMin+1320,peaks=fishingPeaks(t,we,start,end);
  const currentCalc=fishingScoreAt(t,we,t.nowMin);
  const currentPeak=currentCalc.score>=62
    ?peaks.find(p=>Math.abs(p.minute-t.nowMin)<=30&&p.score>=62)
    :null;
  const nextGood=peaks.find(p=>p.minute>t.nowMin&&p.score>=62);
  const nextCandidate=peaks.find(p=>p.minute>t.nowMin&&p.score>=45);
  let peak=currentPeak||nextGood||nextCandidate;

  if(!peak){
    let fallback=null;
    const from=Math.ceil(t.nowMin/30)*30;
    for(let minute=from;minute<=end;minute+=30){
      const calc=fishingScoreAt(t,we,minute);
      if(!Number.isFinite(calc.score))continue;
      if(!fallback||calc.score>fallback.score)fallback={minute,score:calc.score,tideMove:calc.tide.move,tideTurn:calc.tide.turn,tideCore:calc.tide.core,magic:calc.magic};
    }
    if(fallback?.score>=45)peak=fallback;
  }
  if(!peak)return null;

  const inPeak=!!currentPeak&&currentCalc.score>=62;
  const delta=Math.max(0,peak.minute-t.nowMin),windowStart=peak.minute-30,windowEnd=peak.minute+30;
  return{...peak,currentScore:currentCalc.score,delta,windowStart,windowEnd,display:inPeak?"今":fishingWindowLabel(windowStart,windowEnd)};
}

function mazumeWindows(t,we){
  const out=[];
  const add=(minute,label)=>{
    if(minute==null)return;
    const start=minute-C.mazumeFadeMin,end=minute+C.mazumeFadeMin;
    if(end<t.graphStart||start>t.graphEnd)return;
    out.push({
      kind:"mazume",start,end,minute,label,
      coreStart:minute-C.mazumeCoreMin,
      coreEnd:minute+C.mazumeCoreMin
    });
  };
  add(hmMinute(we?.sunrise),"朝まずめ");
  add(hmMinute(we?.sunset),"夕まずめ");
  const sr2=hmMinute(we?.sunriseNext),ss2=hmMinute(we?.sunsetNext);
  add(sr2==null?null:1440+sr2,"朝まずめ");
  add(ss2==null?null:1440+ss2,"夕まずめ");
  return out;
}
function timingBands(t,we,best){
  return mazumeWindows(t,we);
}
function eventDayIndex(e){
  const m=e?.absoluteMinute??e?.minute??0;
  return Math.floor(m/1440);
}
function eventDayWord(e){
  const d=eventDayIndex(e);
  return d===1?"明日 ":d===2?"明後日 ":"";
}

function hasMazumeData(we){
  return hmMinute(we?.sunrise)!=null||hmMinute(we?.sunset)!=null||
    hmMinute(we?.sunriseNext)!=null||hmMinute(we?.sunsetNext)!=null;
}
function indexTitle(we){return hasMazumeData(we)?"潮・まずめ":"潮のみ"}
function peakSummary(best){
  if(best?.display==="今")return{title:"ピーク中",value:null};
  return{title:"次のピーク",value:best?.display||"候補なし"};
}

function tideRead(t){
  const p=t.phaseProgress==null?.5:Math.max(0,Math.min(1,t.phaseProgress));
  const down=t.previousEvent?.type==="high"&&t.nextEvent?.type==="low";
  const up=t.previousEvent?.type==="low"&&t.nextEvent?.type==="high";
  const direction=down?"下げ":up?"上げ":"転流";
  const target=down?"干潮":up?"満潮":"転流";
  let stage,meaning;
  if(p<.12){
    stage="始め";
    meaning=up?"満潮へ向けて上がり始め":down?"干潮へ向けて下がり始め":"潮が動き始め";
  }else if(p<.35){
    stage="前半";
    meaning=up?"満潮へ向けて上昇中":down?"干潮へ向けて下降中":"潮が動いている";
  }else if(p<.65){
    stage="中盤";
    meaning=up?"潮位が大きく上がる時間帯":down?"潮位が大きく下がる時間帯":"潮位変化が大きい時間帯";
  }else if(p<.88){
    stage="後半";
    meaning=up?"満潮へ近づき上がり方が緩やか":down?"干潮へ近づき下がり方が緩やか":"潮位変化が緩やか";
  }else{
    stage="間近";
    meaning=up?"満潮間近":down?"干潮間近":"潮止まり付近";
  }
  return{p,direction,target,stage,meaning,up,down};
}
function tideStateText(t,tr){
  const pct=t.phaseProgress==null?"":`${Math.round(t.phaseProgress*100)}%`;
  if(!tr.up&&!tr.down)return `→ 潮止まり付近${pct?" "+pct:""}`;
  if(tr.p<.12)return `${tr.up?"↗":"↘"} ${tr.direction}始め${pct?" "+pct:""}`;
  if(tr.p>=.88)return `${tr.up?"▲ 満潮":"▼ 干潮"}間近${pct?" "+pct:""}`;
  return `${tr.up?"↗":"↘"} ${tr.direction}${tr.stage}${pct?" "+pct:""}`;
}
function tideBrief(tr){return tr.meaning}
function displayed1(v){
  if(v==null||Number.isNaN(Number(v)))return null;
  return Math.round(Number(v)*10)/10;
}
function windGuide(v){
  v=displayed1(v);if(v==null)return "--";
  if(v<3)return "穏やか";
  if(v<5)return "まずまず";
  if(v<8)return "風強め";
  return "強風";
}
function waveGuide(v){
  v=displayed1(v);if(v==null)return "--";
  if(v<.5)return "低い";
  if(v<1)return "やや波";
  if(v<1.5)return "波高め";
  return "高波";
}
function rainGuide(v){
  v=displayed1(v);if(v==null)return "--";
  if(v<=0)return "ほぼなし";
  if(v<1)return "小雨";
  if(v<3)return "雨";
  return "強め";
}
async function showTideHelp(){
  const r=await resolveStation(false),now=new Date();
  if(await guardLocationForDetail(r,"潮の見方"))return;
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
    `いま：${tideStateText(t,tr)}`,
    `意味：${tr.meaning}`,
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
  NET.fallbacks.length=0;
  const r=await resolveStation(false),now=new Date();
  if(await guardLocationForDetail(r,"潮・まずめ"))return;
  let t,wp=null;
  try{t=await tide(now,r.station)}catch(e){
    const a=new Alert();a.title="潮・まずめ";a.message="潮位データを取得できません";a.addAction("閉じる");await a.presentAlert();return;
  }
  let guideWarning=null;
  try{wp=await weather(now,r.station)}catch(_){guideWarning="天気/波を取得できません"}
  if(!guideWarning&&wp?.issues?.length)guideWarning=wp.issues.join(" / ");
  if(!guideWarning&&NET.fallbacks.length){
    const ages=NET.fallbacks.map(x=>x.ageMin).filter(x=>x!=null),age=ages.length?Math.max(...ages):null;
    const labels=[...new Set(NET.fallbacks.map(x=>x.key.startsWith("marine_")?"波":"天気"))].join("/");
    guideWarning=age==null?`${labels} 過去のデータ`:age<60?`${labels} ${age}分前のデータ`:`${labels} ${Math.floor(age/60)}時間前のデータ`;
  }
  const we=wp?.current??null,g=fishingGuide(t,we,now),best=bestFishingWindow(t,we),hasLight=hasMazumeData(we),idxTitle=indexTitle(we);
  const next=t.nextEvent?`${t.nextEvent.type==="high"?"満潮":"干潮"} ${eventDayWord(t.nextEvent)}${eventClock(t.nextEvent)}`:"--";
  const a=new Alert();
  a.title=`🌊 ${idxTitle} ${g.stars}`;
  a.message=[
    ["spot","area","fishing_port"].includes(r.station?.kind)
      ?`地点：${r.station.name} / 潮位基準点：${r.tideRef?.name||r.station.tideName||r.station.code}${Number.isFinite(r.tideRef?.distanceKm)?" "+(r.tideRef.distanceKm<10?r.tideRef.distanceKm.toFixed(1):Math.round(r.tideRef.distanceKm))+"km":""}`
      :`地点：${r.station.name}`,
    Number.isFinite(r.tideRef?.distanceKm)&&r.tideRef.distanceKm>=C.tideRefWarnKm
      ?"潮位注意：基準点が50km以上離れているため参考表示です。"
      :Number.isFinite(r.tideRef?.distanceKm)&&r.tideRef.distanceKm>=C.tideRefCautionKm
        ?"潮位注意：基準点が30km以上離れているため参考として見てください。"
        :"",
    r.station?.kind==="fishing_port"?"漁港位置：国土数値情報2006年度版（現況要確認）":"",
    `${idxTitle}指数：${g.score}/100`,
    `潮の動き：${Math.round(g.tideMove*100)}%`,
    `満干潮前後：${Math.round(g.tideTurn*100)}%`,
    `まずめ：${hasLight?Math.round(g.magic*100)+"%":"取得できず"}`,
    `まずめモード：${hasLight?Math.round(g.mazumeMode*100)+"%":"--"}`,
    `潮差：${Math.round(g.range*100)}%`,
    `次の満干潮：${next}`,
    `次のピーク：${best?.display??"候補なし"}`,
    guideWarning?`データ注意：${guideWarning}`:"データ注意：なし",
    `風：${we?.wind!=null?Number(we.wind).toFixed(1)+"m/s "+dir8(we.windDir)+" / "+windGuide(we.wind):"--"}`,
    `波：${we?.wave!=null?Number(we.wave).toFixed(1)+"m / "+waveGuide(we.wave):"--"}`,
    `雨：${we?.precip!=null?Number(we.precip).toFixed(1)+"mm / "+rainGuide(we.precip):"--"}`,
    we?.wavePeriod!=null?`波周期：${Number(we.wavePeriod).toFixed(0)}秒`:"波周期：--",
    we?.sst!=null?`水温モデル：${Number(we.sst).toFixed(1)}℃`:"水温モデル：--",
    we?.currentVelocity!=null?`海流モデル：${Number(we.currentVelocity).toFixed(1)}km/h →${dir8(we.currentDir)}`:"海流モデル：--",
    "",
    hasLight?"これは『釣れる確率』や総合地合いではありません。潮の動き・満干潮前後・朝夕まずめ・潮差だけから作る『潮・まずめ指数』です。まずめは日の出・日の入り±30分を中心帯、±90分を評価範囲として、グラフ表示と計算で同じ範囲を使います。魚種、水温適性、ベイト、地形、仕掛けなどは未考慮です。":"天気データを取得できないため、現在はまずめを除いた『潮のみ指数』です。",
    "",
    "海流モデルは広域予測です。港内・瀬戸・磯際などの局地的な潮流そのものではありません。",
    "",
    "潮は『満干潮の中間付近で潮位変化が大きい時間』と『満干潮前後の短い暫定候補』を別々に評価します。朝夕まずめも独立モードとして評価し、潮とまずめが重なる時間を最も強くします。満干潮前後は実際の潮止まり時刻を示すものではありません。"
  ].join("\n");
  a.addAction("閉じる");
  await a.presentAlert();
}

function graph(t,width=650,height=348,bands=null,we=null){
  const c=new DrawContext();c.size=new Size(width,height);c.opaque=false;c.respectScreenScale=true;
  const L=8,R=8,T=40,W=width-L-R,s=t.graphSeries.filter(p=>p.level!=null);
  const tideH=168,eventY=T+tideH+5,barLabelY=eventY+21,barY=barLabelY+18,barH=34;
  const timeY=height-35,dateY=height-15;
  let mn=Math.min(...s.map(p=>p.level)),mx=Math.max(...s.map(p=>p.level));
  if(Math.abs(mx-mn)<10){mx+=5;mn-=5}
  const pd=Math.max(5,(mx-mn)*.08);mn-=pd;mx+=pd;
  const X=m=>L+(m-t.graphStart)/(t.graphEnd-t.graphStart)*W,Y=l=>T+(1-(l-mn)/(mx-mn))*tideH;

  // Mazume stays as a faint tide-area overlay.
  if(Array.isArray(bands)){
    for(const b of bands){
      if(b.kind!=="mazume")continue;
      const bs=Math.max(t.graphStart,b.start),be=Math.min(t.graphEnd,b.end);
      if(be<=bs)continue;
      const x1=X(bs),x2=X(be),label=b.label||"";
      c.setFillColor(new Color(C.t.warn,.025));
      c.fillRect(new Rect(x1,T,Math.max(2,x2-x1),tideH));

      const cs=Math.max(t.graphStart,b.coreStart),ce=Math.min(t.graphEnd,b.coreEnd);
      if(ce>cs){
        c.setFillColor(new Color(C.t.warn,.075));
        c.fillRect(new Rect(X(cs),T,Math.max(2,X(ce)-X(cs)),tideH));
      }

      if(label&&x2-x1>48){
        const labelW=Math.max(52,Math.min(90,x2-x1)),cx=X(b.minute),lx=Math.max(L,Math.min(L+W-labelW,cx-labelW/2));
        c.setFont(Font.boldSystemFont(14));c.setTextColor(new Color(C.t.warn,.93));
        c.drawTextInRect(label,new Rect(lx,2,labelW,18));
      }
    }
  }

  const area=new Path();area.move(new Point(X(s[0].minute),T+tideH));
  for(const p of s)area.addLine(new Point(X(p.minute),Y(p.level)));
  area.addLine(new Point(X(s[s.length-1].minute),T+tideH));area.closeSubpath();
  c.addPath(area);c.setFillColor(new Color(C.t.a,.10));c.fillPath();

  c.setStrokeColor(new Color(C.t.grid,.42));c.setLineWidth(1);
  const gridTimes=[],firstGrid=Math.ceil(t.graphStart/360)*360;
  for(let m=firstGrid;m<=t.graphEnd;m+=360)gridTimes.push(m);
  for(const m of gridTimes){const p=new Path(),x=X(m);p.move(new Point(x,T));p.addLine(new Point(x,T+tideH));c.addPath(p);c.strokePath()}
  for(const ff of[.33,.66]){const p=new Path(),y=T+tideH*ff;p.move(new Point(L,y));p.addLine(new Point(L+W,y));c.addPath(p);c.strokePath()}

  // Day boundary: vertical line across tide + score lane, date under its 00:00 tick.
  const baseDate=new Date(),dateMarks=[];
  const firstBoundary=Math.ceil(t.graphStart/1440)*1440;
  for(let bm=firstBoundary;bm<=t.graphEnd;bm+=1440){
    if(bm<=t.graphStart)continue;
    const bx=X(bm),bp=new Path();bp.move(new Point(bx,T));bp.addLine(new Point(bx,barY+barH));c.addPath(bp);
    c.setStrokeColor(new Color(C.t.sub,.32));c.setLineWidth(1);c.strokePath();
    const bd=new Date(baseDate);bd.setDate(baseDate.getDate()+Math.floor(bm/1440));
    dateMarks.push({x:bx,label:`${bd.getMonth()+1}/${bd.getDate()}`});
  }

  const path=new Path();
  s.forEach((q,i)=>{const pt=new Point(X(q.minute),Y(q.level));i?path.addLine(pt):path.move(pt)});
  c.addPath(path);c.setStrokeColor(new Color(C.t.a));c.setLineWidth(5);c.strokePath();

  const graphEvents=t.futureEvents.filter(e=>e.absoluteMinute<=t.graphEnd).slice(0,3);
  graphEvents.forEach(e=>{
    const ex=X(e.absoluteMinute),ey=Y(e.level),col=e.type==="high"?C.t.a:C.t.b;
    c.setFillColor(new Color(col));c.fillEllipse(new Rect(ex-5,ey-5,10,10));
    const lw=70,lx=Math.max(L,Math.min(L+W-lw,ex-lw/2));
    c.setFont(Font.boldSystemFont(14));c.setTextColor(new Color(col,.98));
    c.drawTextInRect(`${e.type==="high"?"満":"干"} ${eventClock(e)}`,new Rect(lx,eventY,lw,16));
  });

  // 48 half-hour bars. One bar per 30 minutes across the rolling 24h horizon.
  // This matches the scoring/peak engine's 30-minute cadence and makes high/low + mazume timing easier to read.
  if(we){
    c.setFillColor(new Color(C.t.grid,.30));c.fillRect(new Rect(L,barY+barH-1,W,1));
    const n=48,gap=1.5,bw=(W-gap*(n-1))/n;
    const next=bestFishingWindow(t,we);
    const nextIndex=next&&next.minute>=t.graphStart&&next.minute<=t.graphEnd
      ?Math.max(0,Math.min(n-1,Math.floor((next.minute-t.graphStart)/30)))
      :null;
    const nowIndex=Math.max(0,Math.min(n-1,Math.floor((t.nowMin-t.graphStart)/30)));

    for(let i=0;i<n;i++){
      const slotStart=t.graphStart+i*30;
      // Use the slot center normally; NOW uses the exact current score so the white-outlined bar
      // always agrees with the upper current-score card.
      const score=i===nowIndex
        ?fishingScoreAt(t,we,t.nowMin).score
        :fishingScoreAt(t,we,slotStart+15).score;
      if(!Number.isFinite(score))continue;

      // Three visible levels, still one amber hue:
      // Weak <45        = hidden
      // Candidate 45-61 = low / faint
      // Good 62-77      = medium / clear
      // Strong >=78     = tall / solid
      if(score<45)continue;

      let heightRatio,alpha;
      if(score>=78){heightRatio=1;alpha=1}
      else if(score>=62){heightRatio=.66;alpha=.62}
      else{heightRatio=.32;alpha=.28}

      if(i===nextIndex)alpha=Math.min(1,alpha+.12);

      const bh=Math.max(2,barH*heightRatio);
      const bx=L+i*(bw+gap),by=barY+barH-bh;
      c.setFillColor(new Color(C.t.warn,alpha));
      c.fillRect(new Rect(bx,by,Math.max(2,bw),bh));

      // NOW gets a white outline only when the current 30-minute slot is a visible candidate.
      if(i===nowIndex){
        const outline=new Path();
        outline.addRect(new Rect(bx-1,Math.max(barY,by-1),Math.max(3,bw+2),Math.min(barH,barY+barH-Math.max(barY,by-1))));
        c.addPath(outline);c.setStrokeColor(new Color(C.t.fg,.9));c.setLineWidth(1.4);c.strokePath();
      }
    }
  }

  const x=X(t.nowMin),y=Y(t.current),nl=new Path();nl.move(new Point(x,T));nl.addLine(new Point(x,barY+barH));c.addPath(nl);
  c.setStrokeColor(new Color(C.t.fg,.75));c.setLineWidth(2);c.strokePath();
  c.setFillColor(new Color(C.t.fg));c.fillEllipse(new Rect(x-9,y-9,18,18));
  c.setFillColor(new Color(C.t.b));c.fillEllipse(new Rect(x-5,y-5,10,10));
  c.setFont(Font.boldSystemFont(15));c.setTextColor(new Color(C.t.fg,.88));
  c.drawTextInRect("NOW",new Rect(Math.max(L,x-25),T+2,50,18));

  c.setFont(Font.semiboldSystemFont(17));c.setTextColor(new Color(C.t.sub));
  for(const m of gridTimes){
    const label=clockFromAbs(m),xx=X(m),tw=52;
    c.drawTextInRect(label,new Rect(Math.max(0,Math.min(width-tw,xx-tw/2)),timeY,tw,18));
  }
  c.setFont(Font.boldSystemFont(11));c.setTextColor(new Color(C.t.sub,.9));
  for(const dm of dateMarks){
    const dw=42,dx=Math.max(L,Math.min(L+W-dw,dm.x-dw/2));
    c.drawTextInRect(dm.label,new Rect(dx,dateY,dw,13));
  }
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
function metric(p,l,v,d=null,d2=null,width=null){
  const b=p.addStack();b.layoutVertically();if(width)b.size=new Size(width,0);b.backgroundColor=new Color(C.t.panel,.55);b.cornerRadius=10;
  const py=width?11:7;b.setPadding(py,8,py,8);
  text(b,l,width?11:9,C.t.sub);text(b,v,width?15:12,C.t.fg,true);if(d)text(b,d,width?11:10,C.t.muted);if(d2)text(b,d2,7,C.t.warn,true);return b;
}
function badgeLine(st,badge,z,col){
  const m=String(badge).match(/^(.*?)(⚠.*)$/);
  if(!m)return text(st,badge,z,col,true);
  const r=st.addStack();r.layoutHorizontally();
  text(r,m[1],z,col,true);text(r,m[2],z,C.t.warn,true);return r;
}

function widget(t,wp,S,badge,badgeColor,err=null,distanceKm=null,locationState="current",tideRef=null){
  const family=config.widgetFamily||"large",small=family==="small",large=family==="large";
  const w=new ListWidget();
  w.setPadding(large?4:12,14,large?4:10,14);
  const g=new LinearGradient();g.colors=[new Color(C.t.bg1),new Color(C.t.bg2)];g.locations=[0,1];w.backgroundGradient=g;
  const we=wp?.current??null,settingsURL=scriptURL("settings"),refreshURL=scriptURL("refresh"),guideURL=scriptURL("guide"),tideHelpURL=scriptURL("tidehelp");
  const farAuto=locationState==="far";
  const locationBlocked=farAuto||locationState==="previous"||locationState==="missing";
  const fg=locationBlocked?null:fishingGuide(t,we,new Date()),best=locationBlocked?null:bestFishingWindow(t,we),bands=locationBlocked?[]:timingBands(t,we,best);
  const idxTitle=locationBlocked?"潮・まずめ":indexTitle(we),peakUI=peakSummary(best);
  const showTideRef=locationState==="fixed"&&["spot","area","fishing_port"].includes(S?.kind);
  const tideRefUI=showTideRef?tideReferenceUI(tideRef):{text:"",level:"unknown"};
  const blockTitle=farAuto?"⚠ 釣り地点を選択":"⚠ 現在地を確認できません";
  const blockShort=farAuto
    ?`最寄り潮位地点まで ${Math.round(distanceKm)}km`
    :locationState==="previous"?"現在地を取得できず前回地点を使用中":"現在地を取得できません";
  const blockDetail=farAuto
    ?"この距離では潮・まずめ指数や風・波を釣行判断に使えないため非表示にしています。"
    :"現在地を確認できないため、潮・まずめ指数や風・波を非表示にしています。";

  // Dedicated small layout: fishing-first glance.
  if(small){
    w.setPadding(9,10,9,10);
    w.url=locationBlocked?(settingsURL||refreshURL):(guideURL||settingsURL);

    const sh=w.addStack();sh.layoutHorizontally();sh.centerAlignContent();
    const sl=sh.addStack();sl.layoutVertically();
    text(sl,S.name,14,C.t.fg,true);
    const smallBadge=String(badge).replace(/AUTO\s*·\s*/,"AUTO ").replace(/\s+/g," ").trim();
    badgeLine(sl,`${smallBadge}${tideRefUI.shortText?" · "+tideRefUI.shortText:""}  ▾`,7,badgeColor||C.t.muted);
    if(settingsURL)sl.url=settingsURL;
    sh.addSpacer();
    const sd=new Date(),stc=tideCycle(sd),sr=sh.addStack();sr.layoutVertically();
    text(sr,`${sd.getMonth()+1}/${sd.getDate()}・${stc.name}`,8,C.t.fg,true);
    const rr=sr.addStack();rr.layoutHorizontally();rr.addSpacer();
    const rTap=rr.addStack();rTap.setPadding(2,5,2,5);
    text(rTap,"↻",11,C.t.sub,true);if(refreshURL)rTap.url=refreshURL;

    if(locationBlocked){
      w.addSpacer(8);
      const fw=w.addStack();fw.layoutVertically();fw.backgroundColor=new Color(C.t.panel,.48);fw.cornerRadius=10;fw.setPadding(7,8,7,8);
      text(fw,blockTitle,10,C.t.warn,true);
      text(fw,blockShort,7,C.t.muted);
      text(fw,"地点設定後に潮・まずめ・風・波を表示",7,C.t.sub);
      if(settingsURL)fw.url=settingsURL;
      w.refreshAfterDate=new Date(Date.now()+C.refresh*60000);
      return w;
    }

    w.addSpacer(5);
    const decision=w.addStack();decision.layoutHorizontally();decision.centerAlignContent();
    const nowBox=decision.addStack();nowBox.layoutVertically();
    text(nowBox,idxTitle,7,C.t.sub,true);
    text(nowBox,fg.stars,12,C.t.fg,true);
    text(nowBox,fg.label,7,C.t.muted,true);
    decision.addSpacer();
    const peakBox=decision.addStack();peakBox.layoutVertically();
    if(peakUI.value==null){
      text(peakBox,"ピーク中",9,C.t.warn,true);
    }else{
      text(peakBox,peakUI.title,7,C.t.sub,true);
      text(peakBox,peakUI.value,8,C.t.warn,true);
    }
    if(guideURL)decision.url=guideURL;

    w.addSpacer(4);
    const simg=w.addImage(miniGraph(t));simg.imageSize=new Size(138,43);simg.applyFittingContentMode();
    w.addSpacer(3);

    const sf=w.addStack();sf.layoutHorizontally();sf.centerAlignContent();
    const stale=!!err;
    if(stale){
      const msg=err.includes("前のデータ")||err.includes("過去のデータ")?"⚠ データ古い":err.includes("波")&&!err.includes("天気")?"⚠ 波取得できず":"⚠ データ取得不可";
      text(sf,msg,8,C.t.warn,true);
    }else{
      text(sf,`風 ${we?.wind!=null?Number(we.wind).toFixed(1)+"m/s":"--"}`,7,(we?.wind??0)>=8?C.t.warn:C.t.muted,true);
      sf.addSpacer();
      text(sf,`波 ${we?.wave!=null?Number(we.wave).toFixed(1)+"m":"--"}`,7,(we?.wave??0)>=1.5?C.t.warn:C.t.muted,true);
    }
    w.refreshAfterDate=new Date(Date.now()+C.refresh*60000);
    return w;
  }
  // Dedicated medium layout: fishing-first summary.
  if(!large){
    const mh=w.addStack();mh.layoutHorizontally();mh.centerAlignContent();
    const ml=mh.addStack();ml.layoutVertically();
    text(ml,S.name,15,C.t.fg,true);
    badgeLine(ml,`${badge}${tideRefUI.text?" · "+tideRefUI.text:""}  ▾`,8,badgeColor||C.t.sub);
    if(settingsURL)ml.url=settingsURL;
    mh.addSpacer();
    const md=mh.addStack();md.layoutVertically();
    const nd=new Date(),mtc=tideCycle(nd);text(md,`${nd.getMonth()+1}/${nd.getDate()}・${mtc.name}`,10,C.t.fg,true);
    mh.addSpacer(7);
    const mrf=mh.addStack();mrf.layoutVertically();mrf.backgroundColor=new Color(C.t.panel,.55);mrf.cornerRadius=9;mrf.setPadding(3,6,3,6);
    text(mrf,"↻",14,C.t.sub,true);if(refreshURL)mrf.url=refreshURL;

    if(locationBlocked){
      w.addSpacer(7);
      const fw=w.addStack();fw.layoutVertically();fw.backgroundColor=new Color(C.t.panel,.48);fw.cornerRadius=10;fw.setPadding(7,9,7,9);
      text(fw,blockTitle,12,C.t.warn,true);
      text(fw,blockShort,8,C.t.muted);
      text(fw,"地点設定後に 潮・まずめ・風・波 を表示",8,C.t.sub);
      if(settingsURL)fw.url=settingsURL;
      w.refreshAfterDate=new Date(Date.now()+C.refresh*60000);
      return w;
    }

    w.addSpacer(4);
    const ms=w.addStack();ms.layoutHorizontally();ms.centerAlignContent();
    const nowBox=ms.addStack();nowBox.layoutVertically();
    text(nowBox,idxTitle,8,C.t.sub,true);
    const nl=nowBox.addStack();nl.layoutHorizontally();nl.centerAlignContent();
    text(nl,fg.stars,13,C.t.fg,true);nl.addSpacer(4);text(nl,fg.label,8,C.t.muted,true);
    ms.addSpacer();
    const peakBox=ms.addStack();peakBox.layoutVertically();
    if(peakUI.value==null){
      text(peakBox,"ピーク中",11,C.t.warn,true);
    }else{
      text(peakBox,peakUI.title,8,C.t.sub,true);
      text(peakBox,peakUI.value,10,C.t.warn,true);
    }

    if(guideURL)ms.url=guideURL;

    w.addSpacer(3);
    const mi=w.addImage(miniGraph(t,620,118));mi.imageSize=new Size(310,56);mi.applyFittingContentMode();
    w.addSpacer(3);

    const foot=w.addStack();foot.layoutHorizontally();foot.centerAlignContent();
    if(we){
      const mediumCard=(label,value,detail)=>{
        const b=foot.addStack();b.layoutVertically();b.size=new Size(96,0);
        b.backgroundColor=new Color(C.t.panel,.46);b.cornerRadius=8;b.setPadding(4,6,4,6);
        text(b,label,7,C.t.sub);
        text(b,value,9,C.t.fg,true);
        text(b,detail,7,C.t.muted);
        return b;
      };
      mediumCard("風",`${we.wind!=null?Number(we.wind).toFixed(1)+"m/s":"--"} ${dir8(we.windDir)}`,windGuide(we.wind));
      foot.addSpacer(5);
      mediumCard("波",`${we.wave!=null?Number(we.wave).toFixed(1)+"m":"--"}`,waveGuide(we.wave));
      foot.addSpacer(5);
      mediumCard("雨",`${we.precip!=null?Number(we.precip).toFixed(1)+"mm":"--"}`,rainGuide(we.precip));
    }
    if(err){w.addSpacer(2);text(w,err,7,C.t.warn)}
    w.refreshAfterDate=new Date(Date.now()+C.refresh*60000);
    return w;
  }
  const hd=w.addStack();hd.layoutHorizontally();hd.centerAlignContent();
  const pl=hd.addStack();pl.layoutVertically();
  text(pl,locationBlocked?`${S.name}（参考）`:S.name,27,C.t.fg,true);
  badgeLine(pl,`${badge}${tideRefUI.text?" · "+tideRefUI.text:""}  ▾`,10,badgeColor||C.t.muted);
  if(settingsURL)pl.url=settingsURL;
  hd.addSpacer();

  const info=hd.addStack();info.layoutVertically();
  const d=new Date(),tc=tideCycle(d);text(info,`${d.getMonth()+1}/${d.getDate()}・${tc.name}`,18,C.t.fg,true);
  text(info,locationBlocked?"地点未確定":we?`☀︎↑${we.sunrise}  ☀︎↓${we.sunset}`:"天気データなし",11,locationBlocked?C.t.warn:(we?C.t.sub:C.t.warn));
  hd.addSpacer(8);

  const rf=hd.addStack();rf.layoutVertically();rf.backgroundColor=new Color(C.t.panel,.6);rf.cornerRadius=10;rf.setPadding(5,8,5,8);
  text(rf,"↻",20,C.t.sub,true);if(refreshURL)rf.url=refreshURL;

  w.addSpacer(4);

  if(locationBlocked){
    const gate=w.addStack();gate.layoutVertically();gate.backgroundColor=new Color(C.t.panel,.48);gate.cornerRadius=14;gate.setPadding(14,14,14,14);
    text(gate,blockTitle,17,C.t.warn,true);
    gate.addSpacer(4);
    text(gate,blockShort,10,C.t.fg,true);
    text(gate,blockDetail,9,C.t.sub);
    gate.addSpacer(10);
    const cta=gate.addStack();cta.layoutHorizontally();cta.backgroundColor=new Color(C.t.bg2,.95);cta.cornerRadius=10;cta.setPadding(8,10,8,10);
    text(cta,"釣り地点を選ぶ  ›",12,C.t.fg,true);cta.addSpacer();
    if(settingsURL){gate.url=settingsURL;cta.url=settingsURL;}
    w.addSpacer(10);
    const note=w.addStack();note.layoutVertically();
    text(note,"地点設定後に表示",9,C.t.muted,true);
    text(note,"潮グラフ・潮/まずめ指数・朝夕まずめ・満干潮・次のピーク・風・波・雨",9,C.t.sub);
  }else{
    const decision=w.addStack();decision.layoutHorizontally();decision.centerAlignContent();decision.backgroundColor=new Color(C.t.panel,.34);decision.cornerRadius=12;decision.setPadding(9,10,9,10);
    const nowBox=decision.addStack();nowBox.layoutVertically();
    text(nowBox,idxTitle,10,C.t.sub,true);
    const nowLine=nowBox.addStack();nowLine.layoutHorizontally();nowLine.centerAlignContent();
    text(nowLine,fg.stars,20,C.t.fg,true);nowLine.addSpacer(6);text(nowLine,fg.label,11,C.t.muted,true);
    decision.addSpacer();
    const future=decision.addStack();future.layoutVertically();
    if(peakUI.value==null){
      text(future,"ピーク中",14,C.t.warn,true);
    }else{
      text(future,peakUI.title,9,C.t.sub,true);
      text(future,peakUI.value,13,C.t.warn,true);
    }
    if(guideURL)decision.url=guideURL;
  
    w.addSpacer(2);
    const im=w.addImage(graph(t,650,348,bands,we));im.imageSize=new Size(325,174);im.applyFittingContentMode();
  
    w.addSpacer(2);
    if(we){
      const ms=w.addStack();ms.layoutHorizontally();
      metric(ms,"風",`${we.wind!=null?Number(we.wind).toFixed(1)+"m/s":"--"} ${dir8(we.windDir)}`,windGuide(we.wind),null,101);
      ms.addSpacer(6);
      metric(ms,"波",`${we.wave!=null?Number(we.wave).toFixed(1)+"m":"--"}`,waveGuide(we.wave),null,101);
      ms.addSpacer(6);
      metric(ms,"雨",`${we.precip!=null?Number(we.precip).toFixed(1)+"mm":"--"}`,rainGuide(we.precip),null,101);
    }
  }

  if(err&&!locationBlocked){w.addSpacer(4);text(w,err,8,C.t.warn)}
  w.refreshAfterDate=new Date(Date.now()+C.refresh*60000);
  return w;
}

async function buildCurrent(forceLocation=false){
  NET.fallbacks.length=0;
  const r=await resolveStation(forceLocation),now=new Date();
  const locationBlocked=["far","previous","missing"].includes(r.locationState);
  if(locationBlocked){
    return widget(null,null,r.station,r.badge,r.badgeColor,null,r.distanceKm,r.locationState,r.tideRef);
  }
  let t,wp=null,err=null;
  try{t=await tide(now,r.station)}
  catch(_){return tideFailureWidget()}
  try{wp=await weather(now,r.station)}catch(_){err="⚠ 天気/波を取得できません"}
  if(!err&&wp?.issues?.length)err=`⚠ ${wp.issues.join(" / ")}`;
  if(NET.fallbacks.length){
    const ages=NET.fallbacks.map(x=>x.ageMin).filter(x=>x!=null);
    const age=ages.length?Math.max(...ages):null;
    const labels=[...new Set(NET.fallbacks.map(x=>x.key.startsWith("marine_")?"波":"天気"))].join("/");
    const stale=age==null?`⚠ ${labels} 過去のデータ`:age<60?`⚠ ${labels} ${age}分前のデータ`:`⚠ ${labels} ${Math.floor(age/60)}時間前のデータ`;
    err=err?`${err} / ${stale}`:stale;
  }
  return widget(t,wp,r.station,r.badge,r.badgeColor,err,r.distanceKm,r.locationState,r.tideRef);
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
