// TIDE DASH v0.7 — AUTO nearest station without distance cutoff
const C = {
  refresh: 30,
  cache: "TideDashCacheV07",
  prefs: "TideDashPrefs.json",
  catalog: "TideDashStations.json",
  defaultFav: { code:"UC", name:"内浦", lat:35.0167, lon:138.8833, area:"沼津" },
  t: {
    bg1:"#061824", bg2:"#0A3147", panel:"#0E3A50",
    fg:"#F7FBFF", sub:"#9AB5C7", muted:"#6F91A6",
    a:"#39E0DB", b:"#6AA8FF", grid:"#34566A", warn:"#FFBD55"
  }
};

const fm = FileManager.local();
const cacheDir = fm.joinPath(fm.documentsDirectory(), C.cache);
if (!fm.fileExists(cacheDir)) fm.createDirectory(cacheDir, true);
const prefPath = fm.joinPath(fm.documentsDirectory(), C.prefs);
const catPath = fm.joinPath(fm.documentsDirectory(), C.catalog);

const p2 = n => String(n).padStart(2,"0");
const dateKey = d => `${d.getFullYear()}-${p2(d.getMonth()+1)}-${p2(d.getDate())}`;
const hourKey = d => `${dateKey(d)}T${p2(d.getHours())}:00`;
const minDay = d => d.getHours()*60 + d.getMinutes() + d.getSeconds()/60;
const addDay = (d,n) => { const x=new Date(d); x.setDate(x.getDate()+n); return x; };
const clock = e => `${p2(Math.floor(e.minute/60))}:${p2(e.minute%60)}`;
const leftText = m => {
  m=Math.max(0,Math.round(m)); const h=Math.floor(m/60), mm=m%60;
  return h ? `あと${h}時間${p2(mm)}分` : `あと${mm}分`;
};
const dir8 = d => {
  if (d==null || Number.isNaN(d)) return "--";
  return ["北","北東","東","南東","南","南西","西","北西"][Math.round((((d%360)+360)%360)/45)%8];
};
const weatherIcon = c => c==null?"·":c===0?"☀︎":[1,2].includes(c)?"🌤":c===3?"☁︎":[45,48].includes(c)?"霧":[51,53,55,56,57,61,63,65,66,67,80,81,82].includes(c)?"☂︎":[71,73,75,77,85,86].includes(c)?"雪":[95,96,99].includes(c)?"雷":"·";
const f1 = (v,s="") => v==null ? "--" : `${Number(v).toFixed(1)}${s}`;

function loadPrefs(){
  const base={mode:"auto",favorite:C.defaultFav,lastStation:C.defaultFav,lastLocation:null};
  try { return {...base,...JSON.parse(fm.readString(prefPath))}; }
  catch(_) { return base; }
}
function savePrefs(p){ fm.writeString(prefPath,JSON.stringify(p)); }

function stripHtml(s){
  return s.replace(/<br\s*\/?>/gi," ")
    .replace(/<[^>]+>/g,"")
    .replace(/&nbsp;|&#160;/g," ")
    .replace(/&amp;/g,"&")
    .replace(/&#39;|&apos;/g,"'")
    .replace(/&quot;/g,'"')
    .trim();
}
function coord(s){
  const a=(s.match(/\d+/g)||[]).map(Number);
  return a.length ? a[0]+(a[1]||0)/60 : null;
}
function parseStations(html){
  const out=[];
  for (const row of html.match(/<tr[\s\S]*?<\/tr>/gi)||[]){
    const cells=[...row.matchAll(/<td[^>]*>([\s\S]*?)<\/td>/gi)].map(m=>stripHtml(m[1]));
    if (cells.length<5) continue;
    const code=cells[1]?.trim();
    const name=cells[2]?.replace(/\s+/g,"");
    const lat=coord(cells[3]||"");
    const lon=coord(cells[4]||"");
    if (/^[A-Z0-9]{2}$/.test(code) && name && lat && lon) out.push({code,name,lat,lon,area:""});
  }
  return out;
}
async function stationCatalog(){
  try {
    if (fm.fileExists(catPath)){
      const o=JSON.parse(fm.readString(catPath));
      if (o.savedAt && Date.now()-o.savedAt<7*86400000 && o.stations?.length>50) return o.stations;
    }
  } catch(_){}
  try {
    const r=new Request("https://www.data.jma.go.jp/kaiyou/db/tide/suisan/station");
    r.timeoutInterval=15;
    const html=await r.loadString();
    const st=parseStations(html);
    if (st.length>50){
      fm.writeString(catPath,JSON.stringify({savedAt:Date.now(),stations:st}));
      return st;
    }
  } catch(_){}
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
  const R=6371,to=x=>x*Math.PI/180;
  const p1=to(a),p2=to(c),dp=to(c-a),dl=to(d-b);
  const x=Math.sin(dp/2)**2+Math.cos(p1)*Math.cos(p2)*Math.sin(dl/2)**2;
  return 2*R*Math.asin(Math.sqrt(x));
}
function nearest(st,loc){
  let best=null;
  for (const s of st){
    const d=km(loc.latitude,loc.longitude,s.lat,s.lon);
    if (!best || d<best.distanceKm) best={...s,distanceKm:d};
  }
  return best;
}
async function currentLocation(){
  Location.setAccuracyToKilometer();
  return await Location.current();
}

async function resolveStation(force=false){
  const p=loadPrefs();
  const stations=await stationCatalog();

  if (p.mode==="fixed"){
    return {station:p.favorite||C.defaultFav,prefs:p,badge:"★ 固定"};
  }

  let loc=null;
  try {
    const fresh=p.lastLocation && Date.now()-p.lastLocation.savedAt<20*60000 && !force;
    if (fresh) loc=p.lastLocation;
    else {
      const q=await currentLocation();
      loc={latitude:q.latitude,longitude:q.longitude,savedAt:Date.now()};
      p.lastLocation=loc;
      savePrefs(p);
    }
  } catch(_){}

  if (loc){
    const n=nearest(stations,loc);
    if (n){
      p.lastStation=n;
      savePrefs(p);
      return {
        station:n,
        prefs:p,
        badge:`◎ AUTO ${Math.round(n.distanceKm)}km`
      };
    }
  }

  if (p.lastStation){
    return {station:p.lastStation,prefs:p,badge:"◎ AUTO 前回地点"};
  }
  return {station:p.favorite||C.defaultFav,prefs:p,badge:"⚠ 位置情報なし"};
}

async function chooseFavorite(p){
  const st=await stationCatalog();
  const a=new Alert();
  a.title="お気に入り地点を検索";
  a.message="例：東京 / 大洗 / 横浜 / 内浦 / 下田";
  a.addTextField("地点名",p.favorite?.name||"");
  a.addAction("検索");
  a.addCancelAction("キャンセル");
  if (await a.presentAlert()<0) return;
  const q=a.textFieldValue(0).trim();
  if (!q) return;
  const hits=st.filter(x=>x.name.includes(q)).slice(0,12);
  if (!hits.length){
    const z=new Alert(); z.title="見つかりません"; z.message="別の地点名で検索してください"; z.addAction("OK");
    await z.presentAlert(); return chooseFavorite(p);
  }
  const b=new Alert(); b.title="地点を選択";
  hits.forEach(x=>b.addAction(x.name));
  b.addCancelAction("キャンセル");
  const i=await b.presentSheet();
  if (i>=0){ p.favorite=hits[i]; savePrefs(p); }
}

async function settings(){
  const p=loadPrefs();
  const a=new Alert();
  a.title="TIDE DASH 地点設定";
  a.message=`モード：${p.mode==="fixed"?"お気に入り固定":"AUTO"}\nお気に入り：${p.favorite?.name||C.defaultFav.name}`;
  a.addAction("◎ AUTO 現在地から最寄り");
  a.addAction("★ お気に入りを固定");
  a.addAction("🔎 お気に入りを変更");
  a.addAction("📍 今いる場所の最寄りをお気に入り");
  a.addCancelAction("閉じる");
  const i=await a.presentSheet();

  if (i===0){
    p.mode="auto";
    p.lastLocation=null;
    savePrefs(p);
    await resolveStation(true).catch(()=>{});
  } else if (i===1){
    p.mode="fixed";
    savePrefs(p);
  } else if (i===2){
    await chooseFavorite(p);
  } else if (i===3){
    try{
      const st=await stationCatalog();
      const loc=await currentLocation();
      const n=nearest(st,loc);
      if (n){ p.favorite=n; savePrefs(p); }
    }catch(_){
      const z=new Alert(); z.title="位置情報を取得できません";
      z.message="iPhoneの設定でScriptableの位置情報を許可してください";
      z.addAction("OK"); await z.presentAlert();
    }
  }
}

async function cache(url,key,ttl){
  const path=fm.joinPath(cacheDir,key);
  if (fm.fileExists(path)){
    const m=fm.modificationDate(path);
    if (m && Date.now()-m.getTime()<ttl) return fm.readString(path);
  }
  try{
    const r=new Request(url); r.timeoutInterval=15;
    const s=await r.loadString(); fm.writeString(path,s); return s;
  }catch(e){
    if (fm.fileExists(path)) return fm.readString(path);
    throw e;
  }
}
const cachedJSON=async(u,k,t)=>JSON.parse(await cache(u,k,t));

function parseLine(line){
  if (!line || line.length<136) return null;
  const hourly=[];
  for (let i=0;i<24;i++){
    const raw=line.slice(i*3,i*3+3);
    const v=parseInt(raw.trim(),10);
    if (!raw.trim() || !Number.isFinite(v)) return null;
    hourly.push(v);
  }
  const yy=parseInt(line.slice(72,74).trim(),10);
  const mo=parseInt(line.slice(74,76).trim(),10);
  const da=parseInt(line.slice(76,78).trim(),10);
  if (![yy,mo,da].every(Number.isFinite)) return null;
  const year=yy>=70?1900+yy:2000+yy;

  const ev=(off,type)=>{
    const out=[];
    for (let i=0;i<4;i++){
      const b=off+i*7, hm=line.slice(b,b+4), lv=line.slice(b+4,b+7);
      if (!hm.trim() || !lv.trim() || hm==="9999" || lv==="999") continue;
      const h=parseInt(hm.slice(0,2).trim(),10);
      const m=parseInt(hm.slice(2,4),10);
      const l=parseInt(lv.trim(),10);
      if ([h,m,l].every(Number.isFinite) && h>=0 && h<24 && m>=0 && m<60) out.push({type,minute:h*60+m,level:l});
    }
    return out;
  };

  return {
    key:`${year}-${p2(mo)}-${p2(da)}`,
    hourly,
    events:[...ev(80,"high"),...ev(108,"low")].sort((a,b)=>a.minute-b.minute)
  };
}
function parseAnnual(s){
  const m=new Map();
  for (const line of s.split(/\r?\n/)){
    const d=parseLine(line); if (d) m.set(d.key,d);
  }
  return m;
}
async function annual(y,S){
  const u=`https://www.data.jma.go.jp/gmd/kaiyou/data/db/tide/suisan/txt/${y}/${S.code}.txt`;
  return parseAnnual(await cache(u,`jma_${S.code}_${y}.txt`,12*3600000));
}
async function tide(now,S){
  const yd=addDay(now,-1),td=addDay(now,1);
  const yrs=[...new Set([yd.getFullYear(),now.getFullYear(),td.getFullYear()])];
  const maps=await Promise.all(yrs.map(y=>annual(y,S)));
  const all=new Map();
  for (const m of maps) for (const [k,v] of m) all.set(k,v);

  const prev=all.get(dateKey(yd)),today=all.get(dateKey(now)),next=all.get(dateKey(td));
  if (!today) throw Error(`JMA tide data missing for ${dateKey(now)}`);

  const levels=[...today.hourly,next?next.hourly[0]:today.hourly[23]];
  const nm=minDay(now),h=Math.min(23.999,nm/60),i=Math.floor(h),f=h-i;
  const current=levels[i]+(levels[i+1]-levels[i])*f;

  const events=[];
  if (prev) for (const e of prev.events) events.push({...e,absoluteMinute:e.minute-1440});
  for (const e of today.events) events.push({...e,absoluteMinute:e.minute});
  if (next) for (const e of next.events) events.push({...e,absoluteMinute:1440+e.minute});
  events.sort((a,b)=>a.absoluteMinute-b.absoluteMinute);

  const pe=[...events].reverse().find(e=>e.absoluteMinute<=nm)||null;
  const ne=events.find(e=>e.absoluteMinute>nm)||null;
  let progress=null;
  if (pe&&ne&&ne.absoluteMinute>pe.absoluteMinute){
    progress=Math.max(0,Math.min(1,(nm-pe.absoluteMinute)/(ne.absoluteMinute-pe.absoluteMinute)));
  }
  const ext=today.events.map(e=>e.level);
  const range=ext.length?Math.max(...ext)-Math.min(...ext):Math.max(...today.hourly)-Math.min(...today.hourly);

  return {today,levels,current,nowMin:nm,previousEvent:pe,nextEvent:ne,phaseProgress:progress,dailyRange:range};
}

async function weather(now,S){
  const tz="Asia%2FTokyo";
  const wu=`https://api.open-meteo.com/v1/forecast?latitude=${S.lat}&longitude=${S.lon}&hourly=temperature_2m,precipitation,weather_code,wind_speed_10m,wind_direction_10m&daily=sunrise,sunset&wind_speed_unit=ms&timezone=${tz}&forecast_days=2`;
  const mu=`https://marine-api.open-meteo.com/v1/marine?latitude=${S.lat}&longitude=${S.lon}&hourly=wave_height,wave_direction,wave_period&timezone=${tz}&forecast_days=2&cell_selection=sea`;
  const [w,m]=await Promise.all([
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
  for (let n=0;n<4;n++){
    const d=new Date(now); d.setMinutes(0,0,0); d.setHours(sh+n*3);
    const a=w.hourly?.time?.indexOf(hourKey(d))??-1;
    const b=m?.hourly?.time?.indexOf(hourKey(d))??-1;
    if (a<0) continue;
    slots.push({
      time:`${p2(d.getHours())}:00`,
      weatherCode:w.hourly.weather_code[a],
      temp:w.hourly.temperature_2m[a],
      precip:w.hourly.precipitation[a],
      wind:w.hourly.wind_speed_10m[a],
      wave:b>=0?m.hourly.wave_height[b]:null
    });
  }
  return {current,slots};
}

function smooth(levels,step=15){
  const a=[],n=levels.length;
  for(let mn=0;mn<=1440;mn+=step){
    const x=mn/60,i1=Math.min(23,Math.floor(x)),tt=Math.min(1,x-i1);
    const i0=Math.max(0,i1-1),i2=Math.min(n-1,i1+1),i3=Math.min(n-1,i1+2);
    const p0=levels[i0],p1=levels[i1],p2v=levels[i2],p3=levels[i3],t2=tt*tt,t3=t2*tt;
    let y=.5*((2*p1)+(-p0+p2v)*tt+(2*p0-5*p1+4*p2v-p3)*t2+(-p0+3*p1-3*p2v+p3)*t3);
    y=Math.max(Math.min(p1,p2v),Math.min(Math.max(p1,p2v),y));
    a.push({minute:mn,level:y});
  }
  return a;
}
function graph(t,width=650,height=220){
  const c=new DrawContext(); c.size=new Size(width,height); c.opaque=false; c.respectScreenScale=true;
  const L=8,R=8,T=22,B=30,W=width-L-R,H=height-T-B,s=smooth(t.levels);
  let mn=Math.min(...s.map(p=>p.level)),mx=Math.max(...s.map(p=>p.level));
  if (Math.abs(mx-mn)<10){mx+=5;mn-=5}
  const pd=Math.max(5,(mx-mn)*.08); mn-=pd; mx+=pd;
  const X=m=>L+m/1440*W,Y=l=>T+(1-(l-mn)/(mx-mn))*H;

  const area=new Path(); area.move(new Point(X(s[0].minute),T+H));
  for(const p of s) area.addLine(new Point(X(p.minute),Y(p.level)));
  area.addLine(new Point(X(s[s.length-1].minute),T+H)); area.closeSubpath();
  c.addPath(area); c.setFillColor(new Color(C.t.a,.10)); c.fillPath();

  c.setStrokeColor(new Color(C.t.grid,.42)); c.setLineWidth(1);
  for(const h of [0,6,12,18,24]){
    const p=new Path(),x=X(h*60); p.move(new Point(x,T)); p.addLine(new Point(x,T+H)); c.addPath(p); c.strokePath();
  }
  for(const ff of [.33,.66]){
    const p=new Path(),y=T+H*ff; p.move(new Point(L,y)); p.addLine(new Point(L+W,y)); c.addPath(p); c.strokePath();
  }

  const p=new Path();
  s.forEach((q,i)=>{const pt=new Point(X(q.minute),Y(q.level)); i?p.addLine(pt):p.move(pt);});
  c.addPath(p); c.setStrokeColor(new Color(C.t.a)); c.setLineWidth(5); c.strokePath();

  for(const e of t.today.events){
    c.setFillColor(new Color(e.type==="high"?C.t.a:C.t.b));
    c.fillEllipse(new Rect(X(e.minute)-5,Y(e.level)-5,10,10));
  }

  const x=X(t.nowMin),y=Y(t.current),nl=new Path();
  nl.move(new Point(x,T)); nl.addLine(new Point(x,T+H)); c.addPath(nl);
  c.setStrokeColor(new Color(C.t.fg,.60)); c.setLineWidth(2); c.strokePath();
  c.setFillColor(new Color(C.t.fg)); c.fillEllipse(new Rect(x-9,y-9,18,18));
  c.setFillColor(new Color(C.t.b)); c.fillEllipse(new Rect(x-5,y-5,10,10));

  c.setFont(Font.semiboldSystemFont(18)); c.setTextColor(new Color(C.t.sub));
  for(const [m,z] of [[0,"0"],[360,"6"],[720,"12"],[1080,"18"],[1440,"24"]]){
    const xx=X(m),tw=42;
    c.drawTextInRect(z,new Rect(Math.max(0,Math.min(width-tw,xx-tw/2)),height-25,tw,20));
  }
  return c.getImage();
}

function text(st,s,z,col,b=false){
  const t=st.addText(s);
  t.font=b?Font.boldSystemFont(z):Font.systemFont(z);
  t.textColor=new Color(col); t.lineLimit=1; t.minimumScaleFactor=.72; return t;
}
function metric(p,l,v,d=null){
  const b=p.addStack(); b.layoutVertically(); b.backgroundColor=new Color(C.t.panel,.55);
  b.cornerRadius=10; b.setPadding(6,7,6,7);
  text(b,l,8,C.t.sub); text(b,v,11,C.t.fg,true); if(d)text(b,d,8,C.t.muted); return b;
}

function widget(t,wp,S,badge,err=null){
  const w=new ListWidget(),large=(config.widgetFamily||"large")==="large";
  w.setPadding(large?16:12,14,large?14:10,14);
  const g=new LinearGradient(); g.colors=[new Color(C.t.bg1),new Color(C.t.bg2)]; g.locations=[0,1]; w.backgroundGradient=g;
  const we=wp?.current??null;

  const hd=w.addStack(); hd.layoutHorizontally(); hd.centerAlignContent();
  const pl=hd.addStack(); pl.layoutVertically();
  text(pl,S.name,large?22:16,C.t.fg,true);
  text(pl,badge,large?10:8,C.t.a,true);
  hd.addSpacer();
  const rr=hd.addStack(); rr.layoutVertically(); const d=new Date();
  text(rr,`${d.getMonth()+1}/${d.getDate()}`,large?15:12,C.t.fg,true);
  text(rr,we?`☀︎${we.sunrise}  ☾${we.sunset}`:"JMA",large?10:8,C.t.sub);

  w.addSpacer(large?9:5);

  const st=w.addStack(); st.layoutHorizontally(); st.centerAlignContent();
  const cur=st.addStack(); cur.layoutVertically();
  text(cur,`${Math.round(t.current)} cm`,large?34:24,C.t.fg,true);
  const down=t.previousEvent?.type==="high"&&t.nextEvent?.type==="low";
  const up=t.previousEvent?.type==="low"&&t.nextEvent?.type==="high";
  const dr=down?"↘ 下げ":up?"↗ 上げ":"→ 転流付近";
  const ph=t.phaseProgress==null?"":` ${Math.round(t.phaseProgress*100)}%`;
  text(cur,`推算潮位  ${dr}${ph}`,large?11:9,C.t.sub);
  if (large&&t.previousEvent&&t.nextEvent) text(cur,`${t.previousEvent.type==="high"?"満":"干"}${clock(t.previousEvent)} → ${t.nextEvent.type==="high"?"満":"干"}${clock(t.nextEvent)}`,9,C.t.muted);

  st.addSpacer();
  const nx=st.addStack(); nx.layoutVertically(); nx.backgroundColor=new Color(C.t.panel,.48); nx.cornerRadius=12;
  nx.setPadding(large?7:5,large?9:7,large?7:5,large?9:7);
  if (t.nextEvent){
    const e=t.nextEvent;
    text(nx,`${e.type==="high"?"次の満潮":"次の干潮"} ${clock(e)}`,large?17:13,C.t.fg,true);
    text(nx,`${leftText(e.absoluteMinute-t.nowMin)} ${e.level}cm`,large?11:9,C.t.sub);
  }

  w.addSpacer(large?8:3);
  const im=w.addImage(graph(t)); im.imageSize=new Size(large?325:310,large?110:82); im.applyFittingContentMode();
  w.addSpacer(large?6:2);

  const ex=w.addStack(); ex.layoutHorizontally();
  t.today.events.slice(0,4).forEach((e,i,a)=>{
    text(ex,`${e.type==="high"?"▲":"▼"}${clock(e)} ${e.level}`,large?10:8,e.type==="high"?C.t.a:C.t.b,true);
    if(i<a.length-1)ex.addSpacer();
  });

  w.addSpacer(large?9:5);

  if(we){
    const ms=w.addStack(); ms.layoutHorizontally();
    metric(ms,"天気",`${weatherIcon(we.weatherCode)} ${we.temp!=null?Math.round(we.temp)+"℃":"--"}`,`雨 ${we.precip!=null?Number(we.precip).toFixed(1):"--"}mm`);
    ms.addSpacer(5);
    metric(ms,"風",`${f1(we.wind,"m/s")} ${dir8(we.windDir)}`);
    ms.addSpacer(5);
    metric(ms,"波",f1(we.wave,"m"),[we.waveDir!=null?dir8(we.waveDir):null,we.wavePeriod!=null?`${Number(we.wavePeriod).toFixed(0)}秒`:null].filter(Boolean).join("・")||null);
    ms.addSpacer(5);
    metric(ms,"潮差",`${Math.round(t.dailyRange)}cm`,t.phaseProgress==null?null:`${down?"下げ":up?"上げ":"転流"} ${Math.round(t.phaseProgress*100)}%`);
  }

  if(large&&wp?.slots?.length){
    w.addSpacer(10);
    const lb=w.addStack(); lb.layoutHorizontally(); text(lb,"この先",10,C.t.sub,true); lb.addSpacer(); text(lb,"3時間ごと",9,C.t.muted);
    w.addSpacer(5);
    const row=w.addStack(); row.layoutHorizontally();
    wp.slots.slice(0,4).forEach((s,i,a)=>{
      const q=row.addStack(); q.layoutVertically(); q.centerAlignContent();
      q.backgroundColor=new Color(C.t.panel,.38); q.cornerRadius=10; q.setPadding(6,8,6,8);
      text(q,s.time,10,C.t.sub,true); text(q,weatherIcon(s.weatherCode),16,C.t.fg);
      text(q,`${Math.round(s.temp)}℃`,10,C.t.fg,true);
      text(q,`風 ${s.wind!=null?Number(s.wind).toFixed(1):"--"}`,9,C.t.muted);
      text(q,`波 ${s.wave!=null?Number(s.wave).toFixed(1):"--"}`,9,C.t.muted);
      if(i<a.length-1)row.addSpacer(6);
    });
  }

  if(err){ w.addSpacer(4); text(w,err,8,C.t.warn); }
  w.refreshAfterDate=new Date(Date.now()+C.refresh*60000);
  try { w.url=URLScheme.forRunningScript()+"?action=settings"; } catch(_){}
  return w;
}

async function main(){
  if(config.runsInApp && args.queryParameters?.action==="settings"){
    await settings();
    const r=await resolveStation(true),now=new Date();
    const t=await tide(now,r.station);
    const wp=await weather(now,r.station).catch(()=>null);
    const w=widget(t,wp,r.station,r.badge);
    await w.presentLarge();
    return null;
  }

  const r=await resolveStation(false),now=new Date();
  let t,wp=null,err=null;
  try { t=await tide(now,r.station); }
  catch(e){
    const w=new ListWidget(); w.backgroundColor=new Color(C.t.bg1); w.setPadding(14,14,14,14);
    text(w,"TIDE DASH",18,C.t.fg,true); w.addSpacer(8);
    text(w,"潮位データを取得できません",13,C.t.warn,true); w.addSpacer(4);
    text(w,String(e),9,C.t.sub); return w;
  }
  try { wp=await weather(now,r.station); } catch(_) { err="天気/波は一時取得不可"; }
  return widget(t,wp,r.station,r.badge,err);
}

const W=await main();
if(W){
  if(config.runsInWidget) Script.setWidget(W);
  else {
    const f=config.widgetFamily||"large";
    if(f==="medium") await W.presentMedium();
    else await W.presentLarge();
  }
}
Script.complete();
