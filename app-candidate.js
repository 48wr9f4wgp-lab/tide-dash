// TIDE DASH v0.20.0-dev.15 | Region-aware evidence-backed target suggestions; tide/field logic unchanged
const APP_VERSION="0.20.0-dev.15";
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
const NET={fallbacks:[]}; // Legacy JMA cache path; forecast caching is isolated below.

const p2=n=>String(n).padStart(2,"0");
const JST_OFFSET_MS=9*3600000;
const jstDate=d=>new Date(d.getTime()+JST_OFFSET_MS);
const dateKey=d=>{const z=jstDate(d);return `${z.getUTCFullYear()}-${p2(z.getUTCMonth()+1)}-${p2(z.getUTCDate())}`};
const hourKey=d=>`${dateKey(d)}T${p2(jstDate(d).getUTCHours())}:00`;
const minDay=d=>{const z=jstDate(d);return z.getUTCHours()*60+z.getUTCMinutes()+z.getUTCSeconds()/60};
const addDay=(d,n)=>new Date(d.getTime()+n*86400000);
const clockJST=d=>{const z=jstDate(d);return `${p2(z.getUTCHours())}:${p2(z.getUTCMinutes())}`};
const stampJST=d=>`${dateKey(d).slice(5).replace("-","/")} ${clockJST(d)}`;
const eventClock=e=>clockFromAbs(e.absoluteMinute??e.minute);
const clockFromAbs=m=>{if(!Number.isFinite(m))return "--:--";m=((Math.round(m)%1440)+1440)%1440;return `${p2(Math.floor(m/60))}:${p2(m%60)}`};
const dir8=d=>!Number.isFinite(d)?"--":["北","北東","東","南東","南","南西","西","北西"][Math.round((((d%360)+360)%360)/45)%8];
const f1=(v,s="")=>Number.isFinite(v)?`${v.toFixed(1)}${s}`:"--";
const signedTide=v=>{if(!Number.isFinite(v))return "--";const n=Math.round(v);return n>0?`+${n}`:n<0?`−${Math.abs(n)}`:"0"};
const NIIGATA_HISTORICAL_PRIOR={"1":{"source":"https://www.pref.niigata.lg.jp/uploaded/attachment/449179.pdf","aji":21,"saba":94,"iwashi":0.1,"buri":82.3,"sawara":4.7,"hirame":0.2},"4":{"source":"https://www.pref.niigata.lg.jp/uploaded/attachment/451323.pdf","aji":50.8,"saba":10.3,"iwashi":32.8,"buri":37.8,"sawara":7,"hirame":1.2},"5":{"source":"https://www.pref.niigata.lg.jp/uploaded/attachment/455461.pdf","aji":115.7,"saba":43.9,"iwashi":19.3,"buri":143.4,"sawara":11.5,"hirame":6.6},"6":{"source":"https://www.pref.niigata.lg.jp/uploaded/attachment/466455.pdf","aji":93.7,"saba":68,"iwashi":4.6,"buri":47.8,"sawara":6.7,"hirame":3.6},"7":{"source":"https://www.pref.niigata.lg.jp/uploaded/attachment/466457.pdf","aji":39.3,"saba":9.1,"iwashi":1.1,"buri":15.7,"sawara":5.7,"hirame":0.7},"8":{"source":"https://www.pref.niigata.lg.jp/uploaded/attachment/466261.pdf","aji":8.7,"saba":1.9,"iwashi":0.2,"buri":8.1,"sawara":2.6,"hirame":0.3},"9":{"source":"https://www.pref.niigata.lg.jp/uploaded/attachment/468148.pdf","aji":8.5,"saba":1.9,"iwashi":0.2,"buri":3.5,"sawara":0.3,"hirame":0.2},"10":{"source":"https://www.pref.niigata.lg.jp/uploaded/attachment/471497.pdf","aji":29.9,"saba":24.1,"iwashi":0.9,"buri":42.8,"sawara":8.9,"hirame":0.4},"11":{"source":"https://www.pref.niigata.lg.jp/uploaded/attachment/474241.pdf","aji":47.3,"saba":60.8,"iwashi":0.8,"buri":66.1,"sawara":10.8,"hirame":0.9}};
function targetSuggestions(S,reference,wp){
  const area=String(S?.area||""),name=String(S?.name||"");
  if(!area.includes("新潟")&&!name.includes("柏崎")&&!name.includes("新潟"))return null;
  const month=jstDate(reference).getUTCMonth()+1,p=NIIGATA_HISTORICAL_PRIOR[String(month)];
  if(!p)return null;
  const rows=[
    {id:"MA_AJI",name:"アジ",tons:p.aji},{id:"BURI",name:"ブリ",tons:p.buri},
    {id:"SABA",name:"サバ",tons:p.saba},{id:"SAWARA",name:"サゴシ",tons:p.sawara},
    {id:"IWASHI",name:"イワシ",tons:p.iwashi},{id:"HIRAME",name:"ヒラメ",tons:p.hirame}
  ].filter(x=>Number.isFinite(x.tons)&&x.tons>0);
  const sst=wp?.current?.sst;
  for(const x of rows){
    x.reasons=[`新潟県定置網の同月5年平均 ${x.tons.toFixed(1)}t`];x.score=Math.log1p(x.tons);x.confidence="B";
    if(x.id==="BURI"&&month>=7&&month<=10){x.score+=.18;x.reasons.push("日本海の季節移動研究と整合");}
    if(x.id==="SABA"&&Number.isFinite(sst)&&sst>=14.72&&sst<=25.72){x.score+=.12;x.reasons.push(`海水温${sst.toFixed(1)}℃は転用研究の漁場水温範囲内`);}
  }
  rows.sort((x,y)=>y.score-x.score||y.tons-x.tons);
  return{basis:"過去傾向",month,source:p.source,top:rows.slice(0,3),caveat:"新潟県内主要定置網の5年平均を地域・季節のpriorとして使用。遊漁の釣果を数値予測していません。"};
}
function ibarakiTargetSuggestions(S,reference,wp){
  const area=String(S?.area||""),name=String(S?.name||"");
  if(!area.includes("茨城")&&!name.includes("大津")&&!name.includes("平潟")&&!name.includes("大洗"))return null;
  const z=jstDate(reference),month=z.getUTCMonth()+1,day=z.getUTCDate();
  if(!((month===9&&day>=19)||(month===10&&day<=2)))return null;
  const rows=[
    {id:"HIRAME",name:"ヒラメ",score:2.2,confidence:"B",reasons:["2024・2025の同時期公式週報で小型船漁獲を確認"]},
    {id:"BURI",name:"イナダ",score:2.0,confidence:"B",reasons:["2024・2025の同時期公式週報で小型船漁獲を確認"]},
    {id:"SAWARA",name:"サワラ",score:1.1,confidence:"C",reasons:["2024同時期の公式週報で小型船漁獲を確認"]},
    {id:"MAGOCHI",name:"マゴチ",score:1.0,confidence:"C",reasons:["2024同時期の公式週報で小型船漁獲を確認"]}
  ];
  rows.sort((x,y)=>y.score-x.score);
  const otsu=name.includes("大津");
  return{
    basis:"同時期の公的漁況",
    source:"https://www.pref.ibaraki.jp/nourinsuisan/suishi/gyogyo/data/gyokaikyo/gyokaikyou-sokuhou.html",
    sources:[
      "https://www.pref.ibaraki.jp/nourinsuisan/suishi/gyogyo/data/gyokaikyo/documents/06-26f.pdf",
      "https://www.pref.ibaraki.jp/nourinsuisan/suishi/documents/07-27f.pdf",
      "https://www.pref.ibaraki.jp/nourinsuisan/suishi/kaiyu/funabiki/funabiki-toppage.html"
    ],
    top:rows.slice(0,3),
    context:otsu?"大津では2026/09/25にシラス512kg・8隻（64.0kg/隻）、09/28に335kg・8隻（41.9kg/隻）の公式漁況あり。ベイト状況の参考で、対象魚の順位加点には未使用。":null,
    caveat:"茨城県の同時期公式漁海況速報を地域priorとして使用。商業漁獲を遊漁の釣果確率へ変換していません。"
  };
}
function targetSuggestions(S,reference,wp){
  return ibarakiTargetSuggestions(S,reference,wp)||targetSuggestions(S,reference,wp);
}

function validDateKey(s){
  if(!/^\d{4}-\d{2}-\d{2}$/.test(s||""))return false;
  const d=new Date(`${s}T00:00:00+09:00`);
  return Number.isFinite(d.getTime())&&dateKey(d)===s;
}
function validJSTStamp(s){
  if(!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(s||""))return false;
  return validDateKey(s.slice(0,10))&&Number(s.slice(11,13))<24&&Number(s.slice(14,16))<60;
}
function hmMinute(s){
  if(!/^\d{2}:\d{2}$/.test(s||""))return null;
  const [h,m]=s.split(":").map(Number);
  return h<24&&m<60?h*60+m:null;
}
function eventDayWord(e){
  const d=Math.floor((e.absoluteMinute??e.minute)/1440);
  return d===0?"":d===1?"明日 ":d===-1?"昨日 ":`${d}日後 `;
}

const degNorm=x=>((x%360)+360)%360;
const degSin=x=>Math.sin(x*Math.PI/180);
function julianDay(date){return date.getTime()/86400000+2440587.5}
function sunEclipticLongitude(jd){
  const T=(jd-2451545.0)/36525;
  const L0=degNorm(280.46646+36000.76983*T+0.0003032*T*T);
  const M=degNorm(357.52911+35999.05029*T-0.0001537*T*T);
  const C=(1.914602-0.004817*T-0.000014*T*T)*degSin(M)
    +(0.019993-0.000101*T)*degSin(2*M)+0.000289*degSin(3*M);
  return degNorm(L0+C);
}
function moonEclipticLongitude(jd){
  const T=(jd-2451545.0)/36525,T2=T*T,T3=T2*T,T4=T3*T;
  const L=degNorm(218.3164477+481267.88123421*T-0.0015786*T2+T3/538841-T4/65194000);
  const D=degNorm(297.8501921+445267.1114034*T-0.0018819*T2+T3/545868-T4/113065000);
  const M=degNorm(357.5291092+35999.0502909*T-0.0001536*T2+T3/24490000);
  const Mp=degNorm(134.9633964+477198.8675055*T+0.0087414*T2+T3/69699-T4/14712000);
  const F=degNorm(93.2720950+483202.0175233*T-0.0036539*T2-T3/3526000+T4/863310000);
  return degNorm(L
    +6.289*degSin(Mp)+1.274*degSin(2*D-Mp)+0.658*degSin(2*D)+0.214*degSin(2*Mp)
    -0.186*degSin(M)-0.114*degSin(2*F)+0.059*degSin(2*D-2*Mp)
    +0.057*degSin(2*D-M-Mp)+0.053*degSin(2*D+Mp)+0.046*degSin(2*D-M)
    +0.041*degSin(M-Mp)-0.035*degSin(D)-0.031*degSin(M+Mp)
    -0.015*degSin(2*F-2*D)+0.011*degSin(Mp-4*D));
}
function tideCycle(reference){
  const key=dateKey(reference);
  const midnight=new Date(`${key}T00:00:00+09:00`);
  const elongation=degNorm(moonEclipticLongitude(julianDay(midnight))-sunEclipticLongitude(julianDay(midnight)));
  let name;
  if(elongation>=348||elongation<36)name="大潮";
  else if(elongation<72)name="中潮";
  else if(elongation<108)name="小潮";
  else if(elongation<120)name="長潮";
  else if(elongation<132)name="若潮";
  else if(elongation<168)name="中潮";
  else if(elongation<216)name="大潮";
  else if(elongation<252)name="中潮";
  else if(elongation<288)name="小潮";
  else if(elongation<300)name="長潮";
  else if(elongation<312)name="若潮";
  else name="中潮";
  const boundaries=[0,36,72,108,120,132,168,216,252,288,300,312,348,360];
  const boundaryDistance=Math.min(...boundaries.map(b=>Math.abs(elongation-b)));
  return{name,elongation,boundaryNear:boundaryDistance<1};
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
  text(w,detail,9,C.t.sub);w.addSpacer(5);text(w,`${APP_VERSION} / 作成 ${stampJST(new Date())} JST`,7,C.t.muted);w.url=scriptURL("refresh");w.refreshAfterDate=new Date(Date.now()+C.refresh*60000);
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

// JMA text format: hourly heights (cm), YY MM DD, station, four high and four low events.
// Source: https://www.data.jma.go.jp/kaiyou/db/tide/suisan/readme.html
function parseLine(line){
  if(typeof line!=="string"||line.length<136)return null;
  const integer=s=>/^-?\d+$/.test(s.trim())?Number(s.trim()):null;
  const yy=integer(line.slice(72,74)),mo=integer(line.slice(74,76)),da=integer(line.slice(76,78));
  if(![yy,mo,da].every(Number.isFinite)||yy<0||yy>99)return null;
  const year=yy>=70?1900+yy:2000+yy,key=`${year}-${p2(mo)}-${p2(da)}`,code=line.slice(78,80);
  if(!validDateKey(key)||!/^[A-Z0-9]{2}$/.test(code))return null;
  const hourly=[];
  for(let i=0;i<24;i++){
    const v=integer(line.slice(i*3,i*3+3));
    // Invalid or sentinel-like input is missing, never zero or an enormous tide.
    hourly.push(v===999?null:v);
  }
  const ev=(off,type)=>{
    const out=[];
    for(let i=0;i<4;i++){
      const b=off+i*7,hm=line.slice(b,b+4),lv=line.slice(b+4,b+7);
      if(hm==="9999"&&lv==="999")continue;
      const h=integer(hm.slice(0,2)),m=integer(hm.slice(2,4)),level=integer(lv);
      if([h,m,level].every(Number.isFinite)&&h>=0&&h<24&&m>=0&&m<60&&level!==999){
        out.push({type,minute:h*60+m,level});
      }
    }
    return out;
  };
  return{key,code,rawLine:line.slice(0,136),hourly,events:[...ev(80,"high"),...ev(108,"low")].sort((a,b)=>a.minute-b.minute)};
}
function parseAnnual(s,expectedCode=null,expectedYear=null){
  const out=new Map(),duplicates=new Set();
  for(const line of String(s).split(/\r?\n/)){
    const d=parseLine(line);if(!d)continue;
    if(expectedCode&&d.code!==expectedCode)continue;
    if(expectedYear&&Number(d.key.slice(0,4))!==expectedYear)continue;
    if(out.has(d.key)||duplicates.has(d.key)){out.delete(d.key);duplicates.add(d.key);continue;}
    out.set(d.key,d);
  }
  return out;
}
async function annual(y,S){
  if(!Number.isInteger(y)||!/^[A-Z0-9]{2}$/.test(S?.code||""))throw Error("invalid JMA request");
  const url=`https://www.data.jma.go.jp/gmd/kaiyou/data/db/tide/suisan/txt/${y}/${S.code}.txt`;
  const raw=await cache(url,`jma_${S.code}_${y}.txt`,12*3600000,{
    validator:s=>parseAnnual(s,S.code,y).size>300
  });
  return parseAnnual(raw,S.code,y);
}
function absHourly(day,offset){
  return day?day.hourly.map((level,h)=>({minute:offset+h*60,level})):[];
}
function interpolateHourly(points,minute){
  if(!Array.isArray(points)||!Number.isFinite(minute))return null;
  // Iterate ordered hourly anchors. Never remove null points before this check.
  for(let i=0;i<points.length;i++){
    const a=points[i];
    if(a.minute===minute)return Number.isFinite(a.level)?a.level:null;
    const b=points[i+1];
    if(!b||minute<=a.minute||minute>=b.minute)continue;
    if(b.minute-a.minute!==60||!Number.isFinite(a.level)||!Number.isFinite(b.level))return null;
    return a.level+(b.level-a.level)*(minute-a.minute)/60;
  }
  return null;
}
function continuousTide(points,start,end){
  if(!Number.isFinite(start)||!Number.isFinite(end)||start>end)return false;
  if(interpolateHourly(points,start)==null||interpolateHourly(points,end)==null)return false;
  for(let m=Math.floor(start/60)*60+60;m<end;m+=60){
    if(interpolateHourly(points,m)==null)return false;
  }
  return true;
}
function splitTideSeries(series,step=15){
  const segments=[];let segment=[];
  const finish=()=>{if(segment.length)segments.push(segment);segment=[]};
  for(const p of series||[]){
    if(!Number.isFinite(p?.level)||!Number.isFinite(p?.minute)){finish();continue;}
    if(segment.length&&p.minute-segment[segment.length-1].minute!==step)finish();
    segment.push(p);
  }
  finish();return segments;
}
function assembleTide(all,now){
  const days=[-1,0,1,2].map(offset=>({offset,day:all.get(dateKey(addDay(now,offset)))}));
  const today=days[1].day;
  if(!today)throw Error(`JMA tide data missing for ${dateKey(now)}`);
  const hourly=days.flatMap(({offset,day})=>absHourly(day,offset*1440));
  const events=days.flatMap(({offset,day})=>(day?.events||[]).map(e=>({...e,absoluteMinute:offset*1440+e.minute})));
  events.sort((a,b)=>a.absoluteMinute-b.absoluteMinute);
  const nowMin=minDay(now),current=interpolateHourly(hourly,nowMin);
  const graphStart=Math.floor((nowMin-120)/30)*30,graphEnd=graphStart+1440,graphSeries=[];
  for(let minute=graphStart;minute<=graphEnd;minute+=15){
    graphSeries.push({minute,level:interpolateHourly(hourly,minute)});
  }
  const graphEvents=events.filter(e=>e.absoluteMinute>=graphStart&&e.absoluteMinute<=graphEnd);
  // An event printed on a later available day is not necessarily the next event across a gap.
  const candidates=events.filter(e=>e.absoluteMinute>nowMin);
  const nextEvent=candidates.find(e=>continuousTide(hourly,nowMin,e.absoluteMinute))||null;
  const referenceDate=dateKey(now);
  return{today,hourly,events,graphEvents,current,nowMin,nextEvent,graphStart,graphEnd,graphSeries,
    referenceDate,referenceAt:now.getTime(),hasGaps:graphSeries.some(p=>p.level==null),
    evidence:{source:"JMA",format:"fixed_136",scope:"relevant_daily_records",
      records:days.filter(d=>d.day).map(({day})=>({key:day.key,code:day.code,rawLine:day.rawLine||null,hourly:day.hourly,events:day.events})),
      sourceURLs:[...new Set(days.filter(d=>d.day).map(({day})=>`https://www.data.jma.go.jp/gmd/kaiyou/data/db/tide/suisan/txt/${day.key.slice(0,4)}/${day.code}.txt`))]},
    source:"JMA",kind:"astronomical_prediction",unit:"cm",method:"hourly_linear_interpolation"};
}
async function tide(now,S){
  const years=[...new Set([-1,0,1,2].map(n=>Number(dateKey(addDay(now,n)).slice(0,4))))];
  // Keep the current year's valid data when a neighboring year's file is unavailable.
  const maps=await Promise.all(years.map(y=>annual(y,S).catch(()=>new Map()))),all=new Map();
  for(const map of maps)for(const [k,v] of map)all.set(k,v);
  return assembleTide(all,now);
}
function tideRead(t){
  const unknown={label:"判定不可",deltaCm:null,from:null,to:null,meaning:"隣接する毎時潮位予測が不足"};
  if(!t||!Number.isFinite(t.current)||!Number.isFinite(t.nowMin))return unknown;
  const from=Math.floor(t.nowMin/60)*60,to=from+60;
  const a=interpolateHourly(t.hourly,from),b=interpolateHourly(t.hourly,to);
  if(a==null||b==null||!continuousTide(t.hourly,from,to))return unknown;
  const deltaCm=b-a;
  // An hourly average trend cannot describe the instant of an extremum within that hour.
  // Include both boundaries conservatively, including an event exactly on the next hour.
  const turns=(t.events||[]).filter(e=>Number.isFinite(e.absoluteMinute)&&
    e.absoluteMinute>=from&&e.absoluteMinute<=to&&["high","low"].includes(e.type));
  if(turns.length){
    const kinds=[...new Set(turns.map(e=>e.type))];
    const name=kinds.length>1?"満干潮":kinds[0]==="high"?"満潮":"干潮";
    return{label:`${name}を含む時間`,compactLabel:`${name}の時間帯`,kind:"turning",deltaCm,from,to,turns,
      meaning:`${clockFromAbs(from)}〜${clockFromAbs(to)} は ${turns.map(e=>`${e.type==="high"?"満潮":"干潮"} ${eventClock(e)}`).join(" / ")} を含む時間です。毎時値の差だけで瞬間の上げ・下げを判定しません。潮止まりや流速の判定ではありません。`};
  }
  const label=deltaCm>0?"上げ":deltaCm<0?"下げ":"毎時値同じ";
  return{label,kind:"hourly",deltaCm,from,to,turns:[],meaning:`${clockFromAbs(from)}→${clockFromAbs(to)} の予測潮位差 ${signedTide(deltaCm)}cm。潮流速度ではありません。`};
}
function tideEventSummary(t){
  const e=t?.nextEvent;
  return e?{title:`次の${e.type==="high"?"満潮":"干潮"}`,value:`${eventDayWord(e)}${eventClock(e)}`}:
    {title:"次の満干潮",value:"データ不足"};
}

// The request identity includes coordinates, variables, units, timezone and cache schema.
// A short filename hash is only an index: the FULL identity is checked on every read.
function shortHash(s){let h=2166136261;for(let i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,16777619)}return(h>>>0).toString(16)}
function forecastRequest(kind,S){
  if(![S?.lat,S?.lon].every(Number.isFinite)||Math.abs(S.lat)>90||Math.abs(S.lon)>180)throw Error("invalid forecast location");
  const units=kind==="weather"?{
    temperature_2m:"°C",precipitation:"mm",weather_code:"wmo code",wind_speed_10m:"m/s",wind_direction_10m:"°",wind_gusts_10m:"m/s"
  }:{wave_height:"m",wave_direction:"°",wave_period:"s",wave_peak_period:"s",swell_wave_height:"m",swell_wave_direction:"°",swell_wave_period:"s",swell_wave_peak_period:"s",sea_surface_temperature:"°C",ocean_current_velocity:"km/h",ocean_current_direction:"°"};
  if(!["weather","marine"].includes(kind))throw Error("invalid forecast kind");
  const base=kind==="weather"?"https://api.open-meteo.com/v1/forecast":"https://marine-api.open-meteo.com/v1/marine";
  const query=`latitude=${S.lat}&longitude=${S.lon}&hourly=${Object.keys(units).join(",")}&timezone=Asia%2FTokyo&forecast_days=2`;
  const options=kind==="weather"?"&daily=sunrise,sunset&wind_speed_unit=ms&temperature_unit=celsius&precipitation_unit=mm":"&length_unit=metric&cell_selection=sea";
  const url=`${base}?${query}${options}`,identity=JSON.stringify({schema:2,kind,url,units});
  const key=`forecast_v2_${kind}_${String(S.lat)}_${String(S.lon)}_${shortHash(identity)}`;
  return{kind,url,identity,key,units,lat:S.lat,lon:S.lon};
}
function forecastValue(o,name,index,unit){
  if(index<0||o?.hourly_units?.[name]!==unit)return null;
  const v=o?.hourly?.[name]?.[index];
  if(!Number.isFinite(v))return null;
  if(/direction/.test(name)&&(v<0||v>360))return null;
  if(["wind_speed_10m","wind_gusts_10m","precipitation","wave_height","wave_period","wave_peak_period","swell_wave_height","swell_wave_period","swell_wave_peak_period","ocean_current_velocity"].includes(name)&&v<0)return null;
  return v;
}
function validForecast(o,req,now){
  if(o?.error||o?.utc_offset_seconds!==32400||o?.timezone!=="Asia/Tokyo")return false;
  if(![o?.latitude,o?.longitude].every(Number.isFinite)||Math.abs(o.latitude)>90||Math.abs(o.longitude)>180)return false;
  const times=o?.hourly?.time,key=hourKey(now);
  if(!Array.isArray(times)||!times.every(validJSTStamp))return false;
  if(times.some((t,i)=>i>0&&t<=times[i-1]))return false;
  const i=times.indexOf(key);if(i<0)return false;
  for(const [field,unit]of Object.entries(req.units)){
    const a=o.hourly[field];
    if(a!=null&&(!Array.isArray(a)||a.length!==times.length))return false;
    if(a?.some(v=>v!=null&&!Number.isFinite(v)))return false;
    if(a?.some(Number.isFinite)&&o?.hourly_units?.[field]!==unit)return false;
  }
  // Partial data is allowed, but not an empty/invalid forecast masquerading as success.
  const fields=req.kind==="weather"?["wind_speed_10m","precipitation","temperature_2m"]:["wave_height"];
  return fields.some(name=>forecastValue(o,name,i,req.units[name])!=null);
}
function forecastEnvelopeValid(envelope,req,now){
  if(envelope?.schema!==2||envelope.identity!==req.identity)return false;
  if(!Number.isFinite(envelope.fetchedAt))return false;
  const age=Date.now()-envelope.fetchedAt;
  return age>=0&&age<=C.weatherFallbackMaxMin*60000&&validForecast(envelope.payload,req,now);
}
async function forecastCached(req,now,force=false){
  // Alternating slots preserve the last valid response if a cache write is interrupted.
  const paths=["a","b"].map(slot=>fm.joinPath(cacheDir,`${req.key}_${slot}.json`));
  const existing=[];
  for(let slot=0;slot<paths.length;slot++){
    try{
      if(!fm.fileExists(paths[slot]))continue;
      const envelope=JSON.parse(fm.readString(paths[slot]));
      if(forecastEnvelopeValid(envelope,req,now))existing.push({slot,envelope});
    }catch(_){}
  }
  existing.sort((a,b)=>b.envelope.fetchedAt-a.envelope.fetchedAt);
  const last=existing[0]||null;
  const packet=(e,cacheState,cacheWriteFailed=false)=>({
    payload:e.payload,kind:req.kind,requestLat:req.lat,requestLon:req.lon,
    gridLat:e.payload.latitude,gridLon:e.payload.longitude,
    gridKm:km(req.lat,req.lon,e.payload.latitude,e.payload.longitude),
    fetchedAt:e.fetchedAt,cacheState,cacheWriteFailed,validTime:hourKey(now),
    modelRunAt:null,source:"Open-Meteo",model:"best_match",units:req.units
  });
  if(!force&&last&&Date.now()-last.envelope.fetchedAt<25*60000)return packet(last.envelope,"cached");
  let envelope;
  try{
    const r=new Request(req.url);r.timeoutInterval=15;r.headers={"Cache-Control":"no-cache"};
    const payload=JSON.parse(await r.loadString());
    if(!validForecast(payload,req,now))throw Error("invalid forecast payload");
    envelope={schema:2,identity:req.identity,fetchedAt:Date.now(),payload};
  }catch(e){
    // Recheck TTL and validity after the network wait, not only before it.
    if(last&&forecastEnvelopeValid(last.envelope,req,now))return packet(last.envelope,"fallback");
    throw e;
  }
  let cacheWriteFailed=false;
  try{
    const slot=last?1-last.slot:0,raw=JSON.stringify(envelope);
    fm.writeString(paths[slot],raw);
    if(fm.readString(paths[slot])!==raw)throw Error("cache readback mismatch");
  }catch(_){cacheWriteFailed=true}
  return packet(envelope,"network",cacheWriteFailed);
}
function dailySolar(payload,key,field){
  const times=payload?.daily?.time;
  if(!Array.isArray(times)||times.filter(x=>x===key).length!==1)return null;
  const i=times.indexOf(key),stamp=payload.daily[field]?.[i];
  return validJSTStamp(stamp)&&stamp.slice(0,10)===key?stamp:null;
}
function forecastSummaryIssues(w,m,current){
  const issues=[];
  if(!w)issues.push("天気取得不可");
  if(!m)issues.push("海況取得不可");
  if(w&&(current.wind==null||current.precip==null))issues.push("気象値の一部欠測");
  for(const [name,p]of [["天気",w],["海況",m]]){
    if(p?.cacheState==="fallback")issues.push(`${name}は保存予報`);
    if(p?.cacheWriteFailed)issues.push(`${name}の保存不可`);
    if(p&&p.gridKm>=30)issues.push(`${name}格子 約${Math.round(p.gridKm)}km先`);
  }
  return issues;
}
async function weather(now,S,force=false){
  const [w,m]=await Promise.all(["weather","marine"].map(kind=>forecastCached(forecastRequest(kind,S),now,force).catch(()=>null)));
  const key=hourKey(now),todayKey=dateKey(now),nextKey=dateKey(addDay(now,1));
  const wp=w?.payload,mp=m?.payload,wi=wp?.hourly?.time?.indexOf(key)??-1,mi=mp?.hourly?.time?.indexOf(key)??-1;
  const val=(p,i,n,u)=>forecastValue(p,n,i,u);
  const current={
    validTime:key,
    temp:val(wp,wi,"temperature_2m","°C"),precip:val(wp,wi,"precipitation","mm"),
    weatherCode:val(wp,wi,"weather_code","wmo code"),wind:val(wp,wi,"wind_speed_10m","m/s"),windDir:val(wp,wi,"wind_direction_10m","°"),windGust:val(wp,wi,"wind_gusts_10m","m/s"),
    wave:val(mp,mi,"wave_height","m"),waveDir:val(mp,mi,"wave_direction","°"),wavePeriod:val(mp,mi,"wave_period","s"),wavePeakPeriod:val(mp,mi,"wave_peak_period","s"),
    swell:val(mp,mi,"swell_wave_height","m"),swellDir:val(mp,mi,"swell_wave_direction","°"),swellPeriod:val(mp,mi,"swell_wave_period","s"),swellPeakPeriod:val(mp,mi,"swell_wave_peak_period","s"),
    sst:val(mp,mi,"sea_surface_temperature","°C"),currentVelocity:val(mp,mi,"ocean_current_velocity","km/h"),currentDir:val(mp,mi,"ocean_current_direction","°"),
    sunrise:dailySolar(wp,todayKey,"sunrise"),sunset:dailySolar(wp,todayKey,"sunset"),
    sunriseNext:dailySolar(wp,nextKey,"sunrise"),sunsetNext:dailySolar(wp,nextKey,"sunset")
  };
  return{current,weatherMeta:w?{...w,payload:undefined}:null,marineMeta:m?{...m,payload:undefined}:null,
    evidence:{weather:w?{request:forecastRequest("weather",S),payload:wp}:null,
      marine:m?{request:forecastRequest("marine",S),payload:mp}:null},
    issues:forecastSummaryIssues(w,m,current),request:{lat:S.lat,lon:S.lon},referenceAt:now.getTime()};
}
function solarEvents(t,wp){
  const out=[],we=wp?.current;
  for(const [name,field]of [["日の出","sunrise"],["日の入り","sunset"],["日の出","sunriseNext"],["日の入り","sunsetNext"]]){
    const stamp=we?.[field];if(!validJSTStamp(stamp)||!t?.referenceDate)continue;
    const minute=(new Date(`${stamp}:00+09:00`).getTime()-new Date(`${t.referenceDate}T00:00:00+09:00`).getTime())/60000;
    out.push({label:name,minute,stamp});
  }
  return out.sort((a,b)=>a.minute-b.minute);
}
function sourceTimeText(p){
  if(!p)return "未取得";
  const state=p.cacheState==="fallback"?"保存予報":p.cacheState==="cached"?"キャッシュ":"通信取得";
  return `${stampJST(new Date(p.fetchedAt))} JST (${state})`;
}
function rainInterval(stamp){
  if(!validJSTStamp(stamp))return "対象時刻不明";
  const end=new Date(`${stamp}:00+09:00`),start=new Date(end.getTime()-3600000);
  return `${stampJST(start)}〜${clockJST(end)} JST`;
}

// Display evidence is local only. IDs in deep links contain no station or coordinates.
const SNAPSHOT={schema:1,days:7,maxRecords:128,maxChars:300000};
const validSnapshotID=id=>typeof id==="string"&&/^[a-z0-9-]{12,80}$/.test(id);
function snapshotDir(){return fm.joinPath(cacheDir,"display_snapshots_v1")}
function snapshotFile(id){return validSnapshotID(id)?fm.joinPath(snapshotDir(),`${id}.json`):null}
function pruneSnapshots(keepID){
  try{
    const dir=snapshotDir(),cutoff=Date.now()-SNAPSHOT.days*86400000;
    const rows=fm.listContents(dir).filter(name=>name.endsWith(".json")&&validSnapshotID(name.slice(0,-5)))
      .map(name=>({name,at:fm.modificationDate(fm.joinPath(dir,name))?.getTime()??0}))
      .sort((a,b)=>b.at-a.at);
    let retained=1;
    for(const row of rows){
      if(row.name===`${keepID}.json`)continue;
      if(row.at<cutoff||retained>=SNAPSHOT.maxRecords){fm.remove(fm.joinPath(dir,row.name));}
      else retained++;
    }
  }catch(_){} // Cleanup must not prevent displaying a validated forecast.
}
function saveDisplaySnapshot(t,r,wp,family){
  try{
    const id=typeof UUID!=="undefined"?UUID.string().toLowerCase():
      `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}`;
    if(!validSnapshotID(id))throw Error("invalid snapshot ID");
    const data={schema:1,id,version:APP_VERSION,createdAt:Date.now(),family,t,r,wp,
      detail:tideDetail(t,r,wp)};
    const payload=JSON.stringify(data);
    if(payload.length>SNAPSHOT.maxChars)throw Error("snapshot too large");
    const raw=JSON.stringify({schema:1,id,checksum:shortHash(payload),payload});
    const dir=snapshotDir();if(!fm.fileExists(dir))fm.createDirectory(dir,true);
    const file=snapshotFile(id);
    if(fm.fileExists(file))throw Error("snapshot collision");
    fm.writeString(file,raw);
    if(fm.readString(file)!==raw)throw Error("snapshot readback mismatch");
    pruneSnapshots(id);
    return{id,saved:true};
  }catch(_){return{id:null,saved:false};}
}
function readDisplaySnapshot(id){
  try{
    const file=snapshotFile(id);if(!file||!fm.fileExists(file))return null;
    const raw=fm.readString(file);if(raw.length>SNAPSHOT.maxChars*2)return null;
    const e=JSON.parse(raw);
    if(e?.schema!==1||e.id!==id||typeof e.payload!=="string"||e.checksum!==shortHash(e.payload))return null;
    const data=JSON.parse(e.payload),age=Date.now()-data.createdAt;
    if(data.schema!==1||data.id!==id||!Number.isFinite(data.createdAt)||age<0||age>SNAPSHOT.days*86400000)return null;
    if(typeof data.detail!=="string"||!Number.isFinite(data.t?.referenceAt)||!data.r?.station)return null;
    return data;
  }catch(_){return null;}
}
function snapshotGuideURL(id){
  const base=scriptURL("guide");
  return base&&id?`${base}&snapshot=${encodeURIComponent(id)}`:base;
}

function text(st,s,z,col,b=false){
  const t=st.addText(String(s));t.font=b?Font.boldSystemFont(z):Font.systemFont(z);
  t.textColor=new Color(col);t.lineLimit=1;t.minimumScaleFactor=.8;return t;
}
function badgeLine(st,badge,z,col){return text(st,badge,z,col,true)}
function forecastClock(wp){return validJSTStamp(wp?.current?.validTime)?wp.current.validTime.slice(11,16):"--:--"}
function gridDescription(p){
  return p?`${p.gridLat.toFixed(4)}, ${p.gridLon.toFixed(4)} / 要求地点から約${p.gridKm.toFixed(1)}km`:"未取得";
}
function tideReferenceLabel(S,ref){return ref?.name||S?.tideName||S?.name||S?.code||"未確認"}
function tideDetail(t,r,wp){
  const state=tideRead(t),event=tideEventSummary(t),c=wp?.current,solar=solarEvents(t,wp),cycle=tideCycle(new Date(t.referenceAt)),targets=targetSuggestions(r.station,new Date(t.referenceAt),wp);
  const lines=[
    `TIDE DASH ${APP_VERSION}`,
    `表示基準: ${stampJST(new Date(t.referenceAt))} JST`,
    `地点: ${r.station.name}`,
    `要求座標: ${r.station.lat}, ${r.station.lon}`,
    `潮位基準点: ${tideReferenceLabel(r.station,r.tideRef)} (${r.station.code})`,
    Number.isFinite(r.tideRef?.distanceKm)?`基準点距離: 約${r.tideRef.distanceKm.toFixed(1)}km`:"基準点距離: 未確認",
    `潮回り: ${cycle.name} / 月-太陽黄経差 約${cycle.elongation.toFixed(1)}° (JST 0時・気象庁方式区分)${cycle.boundaryNear?" / 区分境界付近":""}`,
    "潮回りは月と太陽の位置関係による一般的な区分です。現地の実際の潮差・潮流速度そのものではありません。",
    "",
    "潮位: 気象庁の天文潮位予測。現地の実測値ではありません。",
    `基準時刻の潮位: ${signedTide(t.current)}cm (毎時予測値の線形補間)`,
    `毎時予測の傾向: ${state.label}`,
    state.meaning,
    `${event.title}: ${event.value}`,
    ...t.graphEvents.map(e=>`${e.type==="high"?"満潮":"干潮"} ${eventDayWord(e)}${eventClock(e)} / ${signedTide(e.level)}cm (JMA原表)`),
    "高さは当該地点の潮位表基準面から。海底までの水深ではありません。",
    "曲線は毎時値の線形補間です。灰色の破線・下段の満干潮時刻は原表から。欠測は接続しません。",
    "縦軸はcmで自動拡大しています。原表の満干潮時刻と毎時曲線の山谷は一致しない場合があります。",
    (()=>{const scale=tideScale(t.graphSeries);return scale?`グラフ表示範囲の補間値: ${scale.dataMin.toFixed(1)}〜${scale.dataMax.toFixed(1)}cm (日全体の満干潮差ではありません)`:"潮位の表示範囲: データなし";})(),
    "潮位の上下と、流れの速さ・向きは別の情報です。",
    t.hasGaps?"注意: グラフの一部に潮位データ不足があります。":"表示範囲の毎時潮位データに欠測はありません。",
    "",
    "日の出・日の入り: Open-Meteoの日付別時刻",
    ...solar.map(e=>`${e.label}: ${e.stamp.replace("T"," ")} JST`),
    solar.length?"日の出入りを地合いや魚の活性のピークに換算していません。":"日の出入りを取得できません。",
    "",
    `風・海況の予報対象: ${c?.validTime?.replace("T"," ")||"未取得"} JST`,
    `風 (地上10m): ${f1(c?.wind,"m/s")} ${Number.isFinite(c?.windDir)?dir8(c.windDir)+"から":"方向不明"} / 突風 ${f1(c?.windGust,"m/s")}`,
    `有義波高: ${f1(c?.wave,"m")} / 平均周期 ${f1(c?.wavePeriod,"秒")} / ピーク周期 ${f1(c?.wavePeakPeriod,"秒")}`,
    `波向: ${Number.isFinite(c?.waveDir)?dir8(c.waveDir)+"から":"未取得"}`,
    `うねり: ${f1(c?.swell,"m")} ${Number.isFinite(c?.swellDir)?dir8(c.swellDir)+"から":"方向不明"} / 平均周期 ${f1(c?.swellPeriod,"秒")} / ピーク周期 ${f1(c?.swellPeakPeriod,"秒")}`,
    "突風はOpen-Meteoの地上10m gust予測値で、現地観測値ではありません。モデルや時間間隔で最大値の定義が異なる場合があります。",
    "波周期は平均波、ピーク周期はスペクトル上の卓越周期、うねり周期はうねり成分の周期予測です。",
    `降水: ${f1(c?.precip,"mm/1h")} / ${rainInterval(c?.validTime)}`,
    "降水は直前1時間の積算予測 (雪などを含む)。降水確率ではありません。",
    `海面水温予測: ${f1(c?.sst,"℃")}`,
    "海面水温は数値モデルの海面付近予測で、足元の実測水温ではありません。",
    `広域海流モデル: ${f1(c?.currentVelocity,"km/h")} ${Number.isFinite(c?.currentDir)?dir8(c.currentDir)+"へ":"方向不明"}`,
    "海流は港内・磯際の局所的な流れや、潮止まり時刻を保証しません。",
    "有義波高は最大波高ではありません。実際にはこれより高い波もあります。",
    "安全・釣行可否の判定ではありません。現地状況と公的な警報・規制を確認してください。",
    "",
    targets?`狙い目（過去傾向）: ${targets.top.map((x,i)=>`${i+1}.${x.name}[${x.confidence}]`).join(" / ")}`:"狙い目（過去傾向）: 対応する公的月別データなし",
    ...(targets?.top||[]).map(x=>`${x.name}[${x.confidence}]: ${x.reasons.join(" / ")}`),
    targets?`狙い目根拠: ${targets.basis}`:null,
    targets?`主な出典: ${targets.source}`:null,
    targets?.context||null,
    targets?targets.caveat:null,
    "信頼度A=最新の公的魚種signalあり / B=公的な複数年地域priorを主根拠 / C=転用・補助根拠のみ。",
    "",
    `気象データ取得: ${sourceTimeText(wp?.weatherMeta)}`,
    `海況データ取得: ${sourceTimeText(wp?.marineMeta)}`,
    `気象予測格子: ${gridDescription(wp?.weatherMeta)}`,
    `海況予測格子: ${gridDescription(wp?.marineMeta)}`,
    "格子距離や基準点距離が近くても、地形・海域への適合や現地の正確性は保証しません。",
    "上流モデルの更新時刻: この応答では未取得。取得時刻とは区別しています。",
    ...(wp?.issues||[]).map(s=>`データ注意: ${s}`),
    "",
    "データ: 気象庁 / Open-Meteo (各提供機関の数値モデル、DWD等)。取得時の具体的モデル名は未確定。",
    "Scriptable/iOSの更新は指定時刻に保証されません。表示基準日時を確認してください。",
    r.station?.kind==="fishing_port"?"漁港位置は国土数値情報2006年度版。現況・立入可否・釣り可否は別途確認。":"",
    "距離の30/50km注意区分はアプリの運用上のしきい値で、精度の保証値ではありません。"
  ];
  return lines.filter(s=>s!==null).join("\n");
}
async function showGuide(){
  const saved=readDisplaySnapshot(args.queryParameters?.snapshot),a=new Alert();
  a.title=saved?"表示した潮位・予報の根拠":"表示記録を確認できません";
  a.message=saved?saved.detail+
    `\n\n表示作成: ${stampJST(new Date(saved.createdAt))} JST / ${saved.version}\nこの記録は端末内の保存データです。タップ時の新しい予報へ置き換えていません。`:
    "この画面に対応する保存記録がありません。旧版の表示、保存失敗、保存期限（7日・最大128件）切れなどが考えられます。別の地点・時刻のデータで代用しません。";
  a.addAction("最新に更新");a.addCancelAction("閉じる");
  const choice=await a.presentAlert();
  if(choice===0){const w=await buildCurrent(true);await present(w);}
}
async function showTideHelp(){return await showGuide()}
function sunSummary(t,wp){
  const items=solarEvents(t,wp).filter(e=>e.minute>=t.nowMin).slice(0,2);
  return items.length?items.map(e=>`${eventDayWord({minute:e.minute}).replace("明日","翌日")}${e.label==="日の入り"?"日没":e.label} ${clockFromAbs(e.minute)}`).join(" / "):"日の出入り 未取得";
}
function tideScale(series){
  const values=(series||[]).map(p=>p.level).filter(Number.isFinite);
  if(!values.length)return null;
  const dataMin=Math.min(...values),dataMax=Math.max(...values),range=Math.max(2,dataMax-dataMin);
  const raw=range/3,power=10**Math.floor(Math.log10(raw));
  const step=([1,2,5,10].find(n=>n*power>=raw)||10)*power;
  let min=Math.floor(dataMin/step)*step,max=Math.ceil(dataMax/step)*step;
  if(min===max){min-=step;max+=step;}
  const ticks=[];for(let n=0;n<=6;n++){const v=min+n*step;if(v>max+step*.01)break;ticks.push(Math.round(v*1000)/1000);}
  return{min,max,ticks,dataMin,dataMax};
}
function graphLayout(width,height,compact){
  const small=width<=420;
  const L=small?52:50,R=14,T=compact?26:50,B=compact?44:78;
  return{L,R,T,B,W:width-L-R,H:height-T-B,small};
}
function graph(t,width=650,height=348,wp=null,compact=false){
  const c=new DrawContext();c.size=new Size(width,height);c.opaque=false;c.respectScreenScale=true;
  const {L,R,T,B,W,H,small}=graphLayout(width,height,compact);
  const X=m=>L+(m-t.graphStart)/(t.graphEnd-t.graphStart)*W;
  const segments=splitTideSeries(t.graphSeries),s=segments.flat(),eventY=T+H+6;
  const font=compact?(small?20:16):18;
  const drawLabel=(label,x,y,w=88,size=font,col=C.t.sub)=>{
    c.setFont(Font.systemFont(size));c.setTextColor(new Color(col));
    c.drawTextInRect(label,new Rect(Math.max(0,Math.min(width-w,x-w/2)),y,w,size+3));
  };
  const drawLine=(x1,y1,x2,y2,col,alpha=.6,lineWidth=1)=>{
    const path=new Path();path.move(new Point(x1,y1));path.addLine(new Point(x2,y2));
    c.addPath(path);c.setStrokeColor(new Color(col,alpha));c.setLineWidth(lineWidth);c.strokePath();
  };
  const gridTimes=[];
  for(let minute=Math.ceil(t.graphStart/360)*360;minute<=t.graphEnd;minute+=360){
    gridTimes.push(minute);const x=X(minute);
    drawLine(x,T,x,T+H,C.t.grid,.42);
    // A date is an additional label; it never replaces midnight's time.
    if(!small||minute%720===0)drawLabel(clockFromAbs(minute),Math.max(L+(small?34:38),x),height-(small?47:44),small?68:76,font);
    if(minute%1440===0){
      const date=dateKey(addDay(new Date(t.referenceAt),Math.floor(minute/1440))).slice(5).replace("-","/");
      drawLabel(date,Math.max(L+(small?33:35),x),height-22,small?66:70,small?18:font-1);
    }
  }
  if(!s.length){drawLabel("潮位データなし",width/2,T+H/2-10,220,font+1,C.t.warn);return c.getImage();}
  const scale=tideScale(s),Y=v=>T+(1-(v-scale.min)/(scale.max-scale.min))*H;
  const ticks=compact?[scale.ticks[0],scale.ticks[scale.ticks.length-1]]:scale.ticks;
  drawLabel("cm",L/2,compact?1:26,L-4,font,C.t.fg);
  for(const value of ticks){
    const y=Y(value);drawLine(L,y,L+W,y,C.t.grid,.5);
    const label=String(value).replace("-","−");
    drawLabel(label,L/2,Math.max(T,y-font/2),L-4,font,C.t.fg);
  }
  // Missing segments are never connected, including the filled area below each curve.
  for(const segment of segments){
    if(segment.length<2)continue;
    const area=new Path();area.move(new Point(X(segment[0].minute),T+H));
    for(const p of segment)area.addLine(new Point(X(p.minute),Y(p.level)));
    area.addLine(new Point(X(segment[segment.length-1].minute),T+H));area.closeSubpath();
    c.addPath(area);c.setFillColor(new Color(C.t.a,.10));c.fillPath();
    const line=new Path();segment.forEach((p,i)=>i?line.addLine(new Point(X(p.minute),Y(p.level))):line.move(new Point(X(p.minute),Y(p.level))));
    c.addPath(line);c.setStrokeColor(new Color(C.t.a));c.setLineWidth(compact?4:5);c.strokePath();
  }
  // Large face: keep only the same next-two extrema that receive labels.
  // Compact faces preserve the prior full marker behavior.
  const visibleEvents=compact?(t.graphEvents||[]):(t.graphEvents||[]).filter(e=>e.absoluteMinute>=t.nowMin).slice(0,2);
  for(const e of visibleEvents){
    const x=X(e.absoluteMinute);
    for(let y=T;y<T+H;y+=10)drawLine(x,y,x,Math.min(y+4,T+H),C.t.sub,.5,1.3);
  }
  const solar=solarEvents(t,wp).filter(e=>e.minute>=t.graphStart&&e.minute<=t.graphEnd);
  const usedSolar=[[],[]];
  for(const e of solar){
    const x=X(e.minute);drawLine(x,T,x,T+H,C.t.warn,.52);
    if(!compact){c.setFillColor(new Color(C.t.warn,.95));c.fillEllipse(new Rect(x-3,T-3,6,6));}
    // Small charts use the readable text summary below the chart instead of tiny overlays.
    if(small)continue;
    const day=Math.floor(e.minute/1440),prefix=day===1?"翌日 ":day===-1?"前日 ":day===0?"":`${day}日後 `;
    const label=`${prefix}${e.label==="日の入り"?"日没":"日の出"} ${clockFromAbs(e.minute)}`;
    const lw=prefix?205:155,lx=Math.max(L,Math.min(width-lw,x-lw/2));
    const lanes=compact?1:2;
    for(let lane=0;lane<lanes;lane++){
      if(usedSolar[lane].some(b=>lx<b[1]+8&&lx+lw>b[0]-8))continue;
      drawLabel(label,lx+lw/2,1+lane*22,lw,font,C.t.warn);usedSolar[lane].push([lx,lx+lw]);break;
    }
  }
  if(!compact){
    const accepted=[];
    const events=visibleEvents;
    for(const e of events){
      const x=X(e.absoluteMinute),lw=112,lx=Math.max(L,Math.min(width-lw,x-lw/2)),cx=lx+lw/2;
      if(accepted.some(b=>lx<b[1]+4&&lx+lw>b[0]-4))continue;
      c.setFillColor(new Color(C.t.sub,.9));c.fillEllipse(new Rect(x-3,T+H-3,6,6));
      drawLine(x,T+H,cx,eventY-2,C.t.sub,.72,1.2);
      drawLabel(`${e.type==="high"?"満潮":"干潮"} ${eventClock(e)}`,cx,eventY,lw,18);
      accepted.push([lx,lx+lw]);
    }
  }
  const x=X(t.nowMin);drawLine(x,T,x,T+H,C.t.fg,.92,compact?2:2.8);
  if(Number.isFinite(t.current)){
    const y=Y(t.current);c.setFillColor(new Color(C.t.fg));c.fillEllipse(new Rect(x-5,y-5,10,10));
  }
  if(!compact)drawLabel("今",x,T+H-24,42,16,C.t.fg);
  if(t.hasGaps)drawLabel("欠測あり",width-62,T+H-25,110,font,C.t.warn);
  return c.getImage();
}
function miniGraph(t,width=620,height=132,wp=null){return graph(t,width,height,wp,true)}

// Glance-only presentation. These helpers never modify the domain result or its evidence.
function glanceState(state){
  if(state?.deltaCm==null)return {label:"潮は不明",short:"潮は不明",known:false};
  if(state.kind==="turning")return {label:state.compactLabel||"満干潮の時間帯",short:state.compactLabel||"満干潮の時間帯",known:true};
  if(state.deltaCm>0)return {label:"↗ 潮が上がる",short:"↗ 上がる",known:true};
  if(state.deltaCm<0)return {label:"↘ 潮が下がる",short:"↘ 下がる",known:true};
  return {label:"高さは変わらず",short:"同じ高さ",known:true};
}
function glanceHour(minute){
  const h=Math.floor((((minute%1440)+1440)%1440)/60);
  return String(h);
}
function glanceRainTime(stamp){
  if(!validJSTStamp(stamp))return "時刻不明";
  const end=hmMinute(stamp.slice(11,16));
  return `${end===0?"前日":""}${glanceHour(end-60)}〜${glanceHour(end)}時`;
}
function glanceIssues(issues){
  return [...new Set(issues)].map(s=>String(s)
    .replace(/天気取得不可/g,"天気が未取得")
    .replace(/海況取得不可/g,"波が未取得")
    .replace(/気象値の一部欠測/g,"天気の一部が不明")
    .replace(/天気・海況取得不可/g,"天気・波が未取得")
    .replace(/海況/g,"波")
    .replace(/格子 約/g,"は約")
    .replace(/は保存予報/g,"は古い予報")
    .replace(/潮位に欠測/g,"潮の一部が不明")
    .replace(/表示根拠の保存不可/g,"詳細を保存できず")
    .replace(/潮位は離れた基準点の参考値/g,"潮は離れた地点の予測"));
}

// Detail presentation only. The saved evidence and all domain values stay unchanged.
function guideSummary(saved){
  const t=saved?.t,r=saved?.r,wp=saved?.wp,state=tideRead(t),view=glanceState(state),next=tideEventSummary(t),c=wp?.current,targets=t&&r?.station?targetSuggestions(r.station,new Date(t.referenceAt),wp):null;
  const when=Number.isFinite(t?.referenceAt)?new Date(t.referenceAt):null;
  const place=r?.station?.name||"地点不明";
  const wind=Number.isFinite(c?.wind)?`${f1(c.wind,"m/s")}${Number.isFinite(c?.windDir)?` ${dir8(c.windDir)}から`:""}${Number.isFinite(c?.windGust)?` / 突風 ${f1(c.windGust,"m/s")}`:""}`:"--";
  const wave=Number.isFinite(c?.wave)?`${f1(c.wave,"m")}${Number.isFinite(c?.waveDir)?` ${dir8(c.waveDir)}から`:""}${Number.isFinite(c?.wavePeriod)?` / 周期 ${f1(c.wavePeriod,"秒")}`:""}`:"--";
  const rain=Number.isFinite(c?.precip)?`${f1(c.precip,"mm")} (${glanceRainTime(c?.validTime)})`:"--";
  const sst=Number.isFinite(c?.sst)?f1(c.sst,"℃"):"--";
  return [
    when?`${dateKey(when).slice(5).replace("-","/")} ${clockJST(when)}時点`:"表示時刻不明",
    place,
    "",
    `潮　${view.label} / ${tideCycle(new Date(t.referenceAt)).name}`,
    `${next.title.replace("次の","")}　${next.value}`,
    "",
    `風　${wind}`,
    `波　${wave}`,
    `海水温　${sst}`,
    `雨　${rain}`,
    targets?`狙い目　${targets.top.map(x=>`${x.name}${x.confidence}`).join(" / ")}`:"",
    "",
    "この表示を作った時の情報です。"
  ].join("\n");
}
async function showFullEvidence(saved){
  const a=new Alert();
  a.title="詳しい根拠";
  a.message=saved.detail+
    `\n\n表示作成: ${stampJST(new Date(saved.createdAt))} JST / ${saved.version}\nこの記録は端末内の保存データです。開いた時点の新しい予報へ置き換えていません。`;
  a.addCancelAction("閉じる");
  await a.presentAlert();
}
// This later declaration intentionally replaces the old full-text first screen.
// Keeping the old declaration above preserves the already-verified evidence/domain block byte-for-byte.
async function showGuide(){
  const saved=readDisplaySnapshot(args.queryParameters?.snapshot),a=new Alert();
  if(saved){
    a.title="この表示の内容";
    a.message=guideSummary(saved);
    a.addAction("詳しい根拠");
    a.addAction("最新に更新");
    a.addCancelAction("閉じる");
    const choice=await a.presentAlert();
    if(choice===0){await showFullEvidence(saved);return;}
    if(choice===1){const w=await buildCurrent(true);await present(w);}
    return;
  }
  a.title="表示記録を確認できません";
  a.message="この画面に対応する保存記録がありません。別の地点・時刻の情報では代用しません。最新に更新すると新しい表示と記録を作ります。";
  a.addAction("最新に更新");a.addCancelAction("閉じる");
  if(await a.presentAlert()===0){const w=await buildCurrent(true);await present(w);}
}
function widget(t,wp,S,badge,badgeColor,err=null,distanceKm=null,locationState="current",tideRef=null){
  const family=config.widgetFamily||"large",small=family==="small",large=family==="large";
  const w=new ListWidget(),now=new Date(),reference=t?new Date(t.referenceAt):now,cycle=t?tideCycle(reference):null;
  w.setPadding(small?9:large?9:6,small?10:14,small?8:large?7:5,small?10:14);
  const background=new LinearGradient();background.colors=[new Color(C.t.bg1),new Color(C.t.bg2)];background.locations=[0,1];w.backgroundGradient=background;
  const settingsURL=scriptURL("settings"),refreshURL=scriptURL("refresh");
  const blocked=["far","previous","missing"].includes(locationState);
  const snapshot=blocked?null:saveDisplaySnapshot(t,{station:S,tideRef,locationState,distanceKm},wp,family);
  const guideURL=snapshotGuideURL(snapshot?.id);
  w.url=blocked?settingsURL:guideURL;w.refreshAfterDate=new Date(now.getTime()+C.refresh*60000);

  const header=w.addStack();header.layoutHorizontally();header.centerAlignContent();
  const place=header.addStack();place.layoutVertically();
  text(place,S.name,small?13:large?22:14,C.t.fg,true);
  const refName=tideReferenceLabel(S,tideRef);
  const dist=Number.isFinite(tideRef?.distanceKm)&&tideRef.distanceKm>0?`・${Math.round(tideRef.distanceKm)}km先`:"";
  text(place,blocked?badge:`潮：${refName}${dist}${large&&cycle?` ｜ ${cycle.name}`:""}`,small?7:large?10:8,C.t.sub);
  if(settingsURL)place.url=settingsURL;
  header.addSpacer();
  const dates=header.addStack();dates.layoutVertically();
  text(dates,dateKey(reference).slice(5).replace("-","/"),small?8:large?12:9,C.t.fg,true);
  text(dates,`${clockJST(reference)}時点`,small?7:large?10:8,C.t.sub);
  if(!small){header.addSpacer(6);const refresh=header.addStack();if(large){refresh.size=new Size(44,44);refresh.setPadding(5,9,5,9);refresh.centerAlignContent();}text(refresh,"↻",large?21:16,C.t.sub);if(refreshURL)refresh.url=refreshURL;}
  if(blocked){
    w.addSpacer(9);text(w,"釣り地点を選ぶ",small?12:large?18:14,C.t.warn,true);
    const a=text(w,locationBlockMessage({locationState,distanceKm}),small?8:11,C.t.sub);a.lineLimit=small?3:2;
    text(w,"タップして設定",small?8:11,C.t.fg,true);return w;
  }

  const c=wp?.current,state=tideRead(t),view=glanceState(state),next=tideEventSummary(t),targets=targetSuggestions(S,reference,wp);
  w.addSpacer(large?6:3);
  const hero=w.addStack();hero.layoutHorizontally();hero.centerAlignContent();
  const tideBox=hero.addStack();tideBox.layoutVertically();
  const range=Number.isFinite(state.from)?`${glanceHour(state.from)}〜${glanceHour(state.to)}時の予測`:"潮の予測";
  text(tideBox,range,small?7:large?10:8,C.t.sub);
  text(tideBox,small?view.short:view.label,small?13:large?(state.kind==="turning"?22:25):16,view.known?C.t.fg:C.t.warn,true);
  hero.addSpacer();
  const nextBox=hero.addStack();nextBox.layoutVertically();
  text(nextBox,next.title,small?7:large?10:8,C.t.sub);
  text(nextBox,next.value,small?11:large?24:17,C.t.fg,true);
  if(guideURL)hero.url=guideURL;

  w.addSpacer(large?5:2);
  const image=w.addImage(large?graph(t,650,348,wp):miniGraph(t,small?420:620,small?132:112,wp));
  image.imageSize=large?new Size(325,160):small?new Size(138,43):new Size(310,56);image.applyFittingContentMode();
  if(guideURL)image.url=guideURL;

  const forecastAt=forecastClock(wp),rainTime=glanceRainTime(c?.validTime);
  w.addSpacer(large?4:2);
  if(small){
    text(w,`${forecastAt}予報 風${f1(c?.wind)}m/s 波${f1(c?.wave)}m`,7,C.t.fg);
    text(w,`${rainTime}の雨 ${f1(c?.precip)}mm`,7,C.t.sub);
  }else if(!large){
    const row=w.addStack();row.layoutHorizontally();row.centerAlignContent();
    for(const [i,label,value,unit] of [[0,"風",c?.wind,"m/s"],[1,"波",c?.wave,"m"],[2,"雨",c?.precip,"mm"]]){
      if(i)row.addSpacer();
      const item=row.addStack();item.layoutHorizontally();item.centerAlignContent();
      text(item,label,9,C.t.sub);item.addSpacer(3);
      text(item,f1(value),14,C.t.fg,true);text(item,unit,9,C.t.sub);
      if(guideURL)item.url=guideURL;
    }
  }else{
    const forecastLabel=w.addStack();forecastLabel.layoutHorizontally();
    text(forecastLabel,`${forecastAt}予報`,10,C.t.sub);
    w.addSpacer(2);
    const row=w.addStack();row.layoutHorizontally();row.centerAlignContent();
    const card=(label,value,unit,detail)=>{
      const box=row.addStack();box.layoutVertically();box.backgroundColor=new Color(C.t.panel,.58);box.cornerRadius=10;
      box.size=new Size(157,0);box.setPadding(4,8,4,8);
      text(box,label,12,C.t.sub,true);
      const number=box.addStack();number.layoutHorizontally();number.centerAlignContent();
      text(number,f1(value),28,C.t.fg,true);number.addSpacer(3);text(number,unit,13,C.t.sub);
      text(box,detail||" ",10,C.t.sub);
      if(guideURL)box.url=guideURL;
    };
    card("風",c?.wind,"m/s",[Number.isFinite(c?.windDir)?`${dir8(c.windDir)}から`:"向き不明",Number.isFinite(c?.windGust)?`突風 ${f1(c.windGust)}m/s`:null].filter(Boolean).join("・"));row.addSpacer(5);
    card("波",c?.wave,"m",[Number.isFinite(c?.waveDir)?`${dir8(c.waveDir)}から`:null,Number.isFinite(c?.wavePeriod)?`周期 ${f1(c.wavePeriod)}秒`:"周期不明"].filter(Boolean).join("・"));
    w.addSpacer(3);
    const fieldRow=w.addStack();fieldRow.layoutHorizontally();fieldRow.centerAlignContent();if(guideURL)fieldRow.url=guideURL;
    text(fieldRow,"海水温",11,C.t.sub);fieldRow.addSpacer(5);
    text(fieldRow,f1(c?.sst),18,C.t.fg,true);fieldRow.addSpacer(2);text(fieldRow,"℃",11,C.t.sub);
    fieldRow.addSpacer();
    text(fieldRow,`${rainTime}の雨`,10,C.t.sub);fieldRow.addSpacer(5);
    text(fieldRow,f1(c?.precip),17,C.t.fg,true);fieldRow.addSpacer(2);text(fieldRow,"mm",10,C.t.sub);
  }

  const issues=[...(wp?.issues||[])];
  if(t.hasGaps)issues.push("潮位に欠測");
  if(snapshot&&!snapshot.saved)issues.push("表示根拠の保存不可");
  if(Number.isFinite(tideRef?.distanceKm)&&tideRef.distanceKm>=C.tideRefCautionKm)issues.push("潮位は離れた基準点の参考値");
  if(err)issues.push(err);
  w.addSpacer(large?5:2);
  if(issues.length){
    const labels=glanceIssues(issues),msg=labels.slice(0,2).join(" / ")+(labels.length>2?` / 他${labels.length-2}件`:"");
    const notice=text(w,`⚠ ${msg}`,small?7:large?10:8,C.t.warn);notice.lineLimit=large?2:1;if(guideURL)notice.url=guideURL;
  }
  if(!small){
    const footer=w.addStack();footer.layoutHorizontally();
    if(!large)text(footer,`予報 ${forecastAt} / 雨 ${rainTime}`,8,C.t.sub);
    else if(targets){const tt=text(footer,`狙い目 ${targets.top.map(x=>`${x.name}${x.confidence}`).join("・")}`,9,C.t.sub);if(guideURL)tt.url=guideURL;}
    footer.addSpacer();
    const detail=text(footer,"詳細 ›",large?10:8,C.t.sub);if(guideURL)detail.url=guideURL;
  }
  return w;
}
async function buildCurrent(forceLocation=false){
  const r=await resolveStation(forceLocation),now=new Date();
  if(locationBlockedResult(r))return widget(null,null,r.station,r.badge,r.badgeColor,null,r.distanceKm,r.locationState,r.tideRef);
  let t;
  try{t=await tide(now,r.station)}catch(_){return tideFailureWidget()}
  const wp=await weather(now,r.station,forceLocation).catch(()=>null);
  return widget(t,wp,r.station,r.badge,r.badgeColor,wp?null:"天気・海況取得不可",r.distanceKm,r.locationState,r.tideRef);
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