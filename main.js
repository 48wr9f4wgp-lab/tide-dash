// TIDE DASH v0.5
const C={name:"内浦",sub:"沼津",st:"UC",lat:35.0167,lon:138.8833,refresh:30,cache:"TideDashCacheV05",
t:{bg1:"#061824",bg2:"#0A3147",panel:"#0E3A50",fg:"#F7FBFF",sub:"#9AB5C7",muted:"#6F91A6",a:"#39E0DB",b:"#6AA8FF",grid:"#34566A",warn:"#FFBD55"}};
const fm=FileManager.local(),dir=fm.joinPath(fm.documentsDirectory(),C.cache);if(!fm.fileExists(dir))fm.createDirectory(dir,true);
const p2=n=>String(n).padStart(2,"0"),dk=d=>`${d.getFullYear()}-${p2(d.getMonth()+1)}-${p2(d.getDate())}`,hk=d=>`${dk(d)}T${p2(d.getHours())}:00`,
minDay=d=>d.getHours()*60+d.getMinutes()+d.getSeconds()/60,addDay=(d,n)=>{let x=new Date(d);x.setDate(x.getDate()+n);return x},
clock=e=>`${p2(Math.floor(e.minute/60))}:${p2(e.minute%60)}`,left=m=>{m=Math.max(0,Math.round(m));let h=Math.floor(m/60),x=m%60;return h?`あと${h}時間${p2(x)}分`:`あと${x}分`};
const dir8=d=>{if(d==null||Number.isNaN(d))return"--";return["北","北東","東","南東","南","南西","西","北西"][Math.round((((d%360)+360)%360)/45)%8]},
wx=c=>c==null?"·":c===0?"☀︎":[1,2].includes(c)?"🌤":c===3?"☁︎":[45,48].includes(c)?"霧":[51,53,55,56,57,61,63,65,66,67,80,81,82].includes(c)?"☂︎":[71,73,75,77,85,86].includes(c)?"雪":[95,96,99].includes(c)?"雷":"·",
f1=(v,s="")=>v==null?"--":`${Number(v).toFixed(1)}${s}`;

async function cache(url,key,ttl){let path=fm.joinPath(dir,key);if(fm.fileExists(path)){let m=fm.modificationDate(path);if(m&&Date.now()-m.getTime()<ttl)return fm.readString(path)}
try{let r=new Request(url);r.timeoutInterval=15;let s=await r.loadString();fm.writeString(path,s);return s}catch(e){if(fm.fileExists(path))return fm.readString(path);throw e}}
const cj=async(u,k,t)=>JSON.parse(await cache(u,k,t));

function parseLine(line){
 if(!line||line.length<136)return null;let hourly=[];
 for(let i=0;i<24;i++){let r=line.slice(i*3,i*3+3),v=parseInt(r.trim(),10);if(!r.trim()||!Number.isFinite(v))return null;hourly.push(v)}
 let yy=parseInt(line.slice(72,74).trim(),10),mo=parseInt(line.slice(74,76).trim(),10),da=parseInt(line.slice(76,78).trim(),10);if(![yy,mo,da].every(Number.isFinite))return null;
 let year=yy>=70?1900+yy:2000+yy;
 const ev=(off,type)=>{let out=[];for(let i=0;i<4;i++){let b=off+i*7,hm=line.slice(b,b+4),lv=line.slice(b+4,b+7);if(!hm.trim()||!lv.trim()||hm==="9999"||lv==="999")continue;
 let h=parseInt(hm.slice(0,2).trim(),10),m=parseInt(hm.slice(2,4),10),l=parseInt(lv.trim(),10);if([h,m,l].every(Number.isFinite)&&h>=0&&h<24&&m>=0&&m<60)out.push({type,minute:h*60+m,level:l})}return out};
 return{key:`${year}-${p2(mo)}-${p2(da)}`,hourly,events:[...ev(80,"high"),...ev(108,"low")].sort((a,b)=>a.minute-b.minute)}
}
function parseAnnual(s){let m=new Map();for(let line of s.split(/\r?\n/)){let d=parseLine(line);if(d)m.set(d.key,d)}return m}
async function annual(y){let u=`https://www.data.jma.go.jp/gmd/kaiyou/data/db/tide/suisan/txt/${y}/${C.st}.txt`;return parseAnnual(await cache(u,`jma_${C.st}_${y}.txt`,12*3600000))}

async function tide(now){
 let yd=addDay(now,-1),td=addDay(now,1),yrs=[...new Set([yd.getFullYear(),now.getFullYear(),td.getFullYear()])],maps=await Promise.all(yrs.map(annual)),all=new Map();for(let m of maps)for(let [k,v] of m)all.set(k,v);
 let prev=all.get(dk(yd)),today=all.get(dk(now)),next=all.get(dk(td));if(!today)throw Error(`JMA tide data missing for ${dk(now)}`);
 let levels=[...today.hourly,next?next.hourly[0]:today.hourly[23]],nm=minDay(now),h=Math.min(23.999,nm/60),i=Math.floor(h),f=h-i,current=levels[i]+(levels[i+1]-levels[i])*f,events=[];
 if(prev)for(let e of prev.events)events.push({...e,absoluteMinute:e.minute-1440});for(let e of today.events)events.push({...e,absoluteMinute:e.minute});if(next)for(let e of next.events)events.push({...e,absoluteMinute:1440+e.minute});events.sort((a,b)=>a.absoluteMinute-b.absoluteMinute);
 let pe=[...events].reverse().find(e=>e.absoluteMinute<=nm)||null,ne=events.find(e=>e.absoluteMinute>nm)||null,prog=null;
 if(pe&&ne&&ne.absoluteMinute>pe.absoluteMinute)prog=Math.max(0,Math.min(1,(nm-pe.absoluteMinute)/(ne.absoluteMinute-pe.absoluteMinute)));
 let phase=ne?(ne.type==="high"?"up":"down"):"slack";
 let levs=today.events.map(e=>e.level),range=levs.length?Math.max(...levs)-Math.min(...levs):Math.max(...today.hourly)-Math.min(...today.hourly);
 return{today,levels,current,nowMin:nm,previousEvent:pe,nextEvent:ne,phaseProgress:prog,phase,dailyRange:range}
}

async function weather(now){
 let tz="Asia%2FTokyo",wu=`https://api.open-meteo.com/v1/forecast?latitude=${C.lat}&longitude=${C.lon}&hourly=temperature_2m,precipitation,weather_code,wind_speed_10m,wind_direction_10m&daily=sunrise,sunset&wind_speed_unit=ms&timezone=${tz}&forecast_days=2`,
 mu=`https://marine-api.open-meteo.com/v1/marine?latitude=${C.lat}&longitude=${C.lon}&hourly=wave_height,wave_direction,wave_period&timezone=${tz}&forecast_days=2&cell_selection=sea`,
 [w,m]=await Promise.all([cj(wu,"weather_v05.json",25*60000),cj(mu,"marine_v05.json",25*60000).catch(()=>null)]),k=hk(now),wi=w.hourly?.time?.indexOf(k)??-1,mi=m?.hourly?.time?.indexOf(k)??-1;
 let cur={temp:wi>=0?w.hourly.temperature_2m[wi]:null,precip:wi>=0?w.hourly.precipitation[wi]:null,weatherCode:wi>=0?w.hourly.weather_code[wi]:null,
 wind:wi>=0?w.hourly.wind_speed_10m[wi]:null,windDir:wi>=0?w.hourly.wind_direction_10m[wi]:null,wave:mi>=0?m.hourly.wave_height[mi]:null,waveDir:mi>=0?m.hourly.wave_direction[mi]:null,wavePeriod:mi>=0?m.hourly.wave_period[mi]:null,
 sunrise:w.daily?.sunrise?.[0]?.slice(11,16)??"--:--",sunset:w.daily?.sunset?.[0]?.slice(11,16)??"--:--"},slots=[],sh=Math.ceil(now.getHours()/3)*3;
 for(let n=0;n<4;n++){let d=new Date(now);d.setMinutes(0,0,0);d.setHours(sh+n*3);let a=w.hourly?.time?.indexOf(hk(d))??-1,b=m?.hourly?.time?.indexOf(hk(d))??-1;if(a<0)continue;
 slots.push({time:`${p2(d.getHours())}:00`,weatherCode:w.hourly.weather_code[a],temp:w.hourly.temperature_2m[a],precip:w.hourly.precipitation[a],wind:w.hourly.wind_speed_10m[a],wave:b>=0?m.hourly.wave_height[b]:null})}
 return{current:cur,slots}
}

function series(levels,step=15){let a=[],n=levels.length;for(let mn=0;mn<=1440;mn+=step){let x=mn/60,i1=Math.min(23,Math.floor(x)),t=Math.min(1,x-i1),i0=Math.max(0,i1-1),i2=Math.min(n-1,i1+1),i3=Math.min(n-1,i1+2),
 p0=levels[i0],p1=levels[i1],p2v=levels[i2],p3=levels[i3],t2=t*t,t3=t2*t,y=.5*((2*p1)+(-p0+p2v)*t+(2*p0-5*p1+4*p2v-p3)*t2+(-p0+3*p1-3*p2v+p3)*t3),lo=Math.min(p1,p2v),hi=Math.max(p1,p2v);a.push({minute:mn,level:Math.max(lo,Math.min(hi,y))})}return a}
function graph(t,width=650,height=220){
 let c=new DrawContext();c.size=new Size(width,height);c.opaque=false;c.respectScreenScale=true;let L=8,R=8,T=18,B=28,W=width-L-R,H=height-T-B,s=series(t.levels),mn=Math.min(...s.map(p=>p.level)),mx=Math.max(...s.map(p=>p.level));
 if(Math.abs(mx-mn)<10){mx+=5;mn-=5}let pd=Math.max(5,(mx-mn)*.08);mn-=pd;mx+=pd;let X=m=>L+m/1440*W,Y=l=>T+(1-(l-mn)/(mx-mn))*H;
 let area=new Path();area.move(new Point(X(s[0].minute),T+H));for(let p of s)area.addLine(new Point(X(p.minute),Y(p.level)));area.addLine(new Point(X(s.at(-1).minute),T+H));area.closeSubpath();c.addPath(area);c.setFillColor(new Color(C.t.a,.10));c.fillPath();
 c.setStrokeColor(new Color(C.t.grid,.42));c.setLineWidth(1);for(let hh of[0,6,12,18,24]){let p=new Path(),x=X(hh*60);p.move(new Point(x,T));p.addLine(new Point(x,T+H));c.addPath(p);c.strokePath()}for(let q of[.33,.66]){let p=new Path(),y=T+H*q;p.move(new Point(L,y));p.addLine(new Point(L+W,y));c.addPath(p);c.strokePath()}
 let p=new Path();s.forEach((q,i)=>{let pt=new Point(X(q.minute),Y(q.level));i?p.addLine(pt):p.move(pt)});c.addPath(p);c.setStrokeColor(new Color(C.t.a));c.setLineWidth(5);c.strokePath();
 for(let e of t.today.events){c.setFillColor(new Color(e.type==="high"?C.t.a:C.t.b));c.fillEllipse(new Rect(X(e.minute)-5,Y(e.level)-5,10,10))}
 let x=X(t.nowMin),y=Y(t.current),nl=new Path();nl.move(new Point(x,T));nl.addLine(new Point(x,T+H));c.addPath(nl);c.setStrokeColor(new Color(C.t.fg,.60));c.setLineWidth(2);c.strokePath();c.setFillColor(new Color(C.t.fg));c.fillEllipse(new Rect(x-9,y-9,18,18));c.setFillColor(new Color(C.t.b));c.fillEllipse(new Rect(x-5,y-5,10,10));
 c.setFont(Font.semiboldSystemFont(18));c.setTextColor(new Color(C.t.sub));for(let [m,z] of[[0,"0"],[360,"6"],[720,"12"],[1080,"18"],[1440,"24"]]){let xx=X(m),tw=42;c.drawTextInRect(z,new Rect(Math.max(0,Math.min(width-tw,xx-tw/2)),height-24,tw,20))}return c.getImage()
}
function txt(st,s,z,col,b=false){let t=st.addText(s);t.font=b?Font.boldSystemFont(z):Font.systemFont(z);t.textColor=new Color(col);t.lineLimit=1;t.minimumScaleFactor=.72;return t}
function metric(p,l,v,d=null){let b=p.addStack();b.layoutVertically();b.backgroundColor=new Color(C.t.panel,.55);b.cornerRadius=10;b.setPadding(5,7,5,7);txt(b,l,8,C.t.sub);txt(b,v,11,C.t.fg,true);if(d)txt(b,d,8,C.t.muted);return b}
function phaseLabel(t){return t.phase==="up"?"↗ 上げ":t.phase==="down"?"↘ 下げ":"→ 転流付近"}

function mediumWidget(t,we){
 let w=new ListWidget();w.setPadding(10,14,8,14);let g=new LinearGradient();g.colors=[new Color(C.t.bg1),new Color(C.t.bg2)];g.locations=[0,1];w.backgroundGradient=g;
 let h=w.addStack();h.layoutHorizontally();let l=h.addStack();l.layoutVertically();txt(l,C.name,14,C.t.fg,true);txt(l,C.sub,8,C.t.sub);h.addSpacer();let d=new Date();txt(h,`${d.getMonth()+1}/${d.getDate()}`,11,C.t.fg,true);
 w.addSpacer(3);let s=w.addStack();s.layoutHorizontally();txt(s,`${Math.round(t.current)} cm`,22,C.t.fg,true);s.addSpacer(8);txt(s,`${phaseLabel(t)} ${t.phaseProgress==null?"":Math.round(t.phaseProgress*100)+"%"}`,10,C.t.sub,true);s.addSpacer();
 if(t.nextEvent){let e=t.nextEvent;txt(s,`${e.type==="high"?"次満":"次干"} ${clock(e)}`,11,C.t.fg,true)}
 w.addSpacer(2);let im=w.addImage(graph(t,650,145));im.imageSize=new Size(310,66);im.applyFittingContentMode();w.addSpacer(1);
 let ex=w.addStack();ex.layoutHorizontally();t.today.events.slice(0,4).forEach((e,i,a)=>{txt(ex,`${e.type==="high"?"▲":"▼"}${clock(e)} ${e.level}`,8,e.type==="high"?C.t.a:C.t.b,true);if(i<a.length-1)ex.addSpacer()});
 w.refreshAfterDate=new Date(Date.now()+C.refresh*60000);return w
}

function largeWidget(t,wp,err=null){
 let w=new ListWidget();w.setPadding(10,14,10,14);let g=new LinearGradient();g.colors=[new Color(C.t.bg1),new Color(C.t.bg2)];g.locations=[0,1];w.backgroundGradient=g;let we=wp?.current??null;
 let hd=w.addStack();hd.layoutHorizontally();hd.centerAlignContent();let pl=hd.addStack();pl.layoutVertically();txt(pl,C.name,21,C.t.fg,true);txt(pl,C.sub,10,C.t.sub);hd.addSpacer();let rr=hd.addStack();rr.layoutVertically();let d=new Date();txt(rr,`${d.getMonth()+1}/${d.getDate()}`,14,C.t.fg,true);txt(rr,we?`☀︎${we.sunrise}  ☾${we.sunset}`:"JMA",9,C.t.sub);
 w.addSpacer(5);let st=w.addStack();st.layoutHorizontally();st.centerAlignContent();let cur=st.addStack();cur.layoutVertically();txt(cur,`${Math.round(t.current)} cm`,31,C.t.fg,true);let dr=phaseLabel(t),ph=t.phaseProgress==null?"":` ${Math.round(t.phaseProgress*100)}%`;txt(cur,`推算潮位  ${dr}${ph}`,10,C.t.sub);
 if(t.previousEvent&&t.nextEvent)txt(cur,`${t.previousEvent.type==="high"?"満":"干"}${clock(t.previousEvent)} → ${t.nextEvent.type==="high"?"満":"干"}${clock(t.nextEvent)}`,8,C.t.muted);
 st.addSpacer();let nx=st.addStack();nx.layoutVertically();nx.backgroundColor=new Color(C.t.panel,.48);nx.cornerRadius=11;nx.setPadding(6,8,6,8);if(t.nextEvent){let e=t.nextEvent;txt(nx,`${e.type==="high"?"次の満潮":"次の干潮"} ${clock(e)}`,15,C.t.fg,true);txt(nx,`${left(e.absoluteMinute-t.nowMin)}  ${e.level}cm`,9,C.t.sub)}
 w.addSpacer(4);let im=w.addImage(graph(t));im.imageSize=new Size(325,101);im.applyFittingContentMode();w.addSpacer(2);
 let ex=w.addStack();ex.layoutHorizontally();t.today.events.slice(0,4).forEach((e,i,a)=>{txt(ex,`${e.type==="high"?"▲":"▼"}${clock(e)} ${e.level}`,9,e.type==="high"?C.t.a:C.t.b,true);if(i<a.length-1)ex.addSpacer()});
 w.addSpacer(5);let ms=w.addStack();ms.layoutHorizontally();if(we){metric(ms,"天気",`${wx(we.weatherCode)} ${we.temp!=null?Math.round(we.temp)+"℃":"--"}`,`雨 ${we.precip!=null?Number(we.precip).toFixed(1):"--"}mm`);ms.addSpacer(4);
 metric(ms,"風",`${f1(we.wind,"m/s")} ${dir8(we.windDir)}`);ms.addSpacer(4);metric(ms,"波",f1(we.wave,"m"),[we.waveDir!=null?dir8(we.waveDir):null,we.wavePeriod!=null?`${Number(we.wavePeriod).toFixed(0)}秒`:null].filter(Boolean).join("・")||null);ms.addSpacer(4);
 metric(ms,"潮差",`${Math.round(t.dailyRange)}cm`,`${dr.replace("↗ ","").replace("↘ ","").replace("→ ","")} ${t.phaseProgress==null?"":Math.round(t.phaseProgress*100)+"%"}`)}
 if(wp?.slots?.length){w.addSpacer(6);let lb=w.addStack();lb.layoutHorizontally();txt(lb,"この先",9,C.t.sub,true);lb.addSpacer();txt(lb,"3時間ごと",8,C.t.muted);w.addSpacer(3);let row=w.addStack();row.layoutHorizontally();
 wp.slots.slice(0,4).forEach((s,i,a)=>{let q=row.addStack();q.layoutVertically();q.centerAlignContent();q.backgroundColor=new Color(C.t.panel,.38);q.cornerRadius=9;q.setPadding(4,7,4,7);txt(q,s.time,9,C.t.sub,true);txt(q,wx(s.weatherCode),14,C.t.fg);txt(q,`${Math.round(s.temp)}℃`,9,C.t.fg,true);txt(q,`風${s.wind!=null?Number(s.wind).toFixed(1):"--"}`,8,C.t.muted);txt(q,`波${s.wave!=null?Number(s.wave).toFixed(1):"--"}`,8,C.t.muted);if(i<a.length-1)row.addSpacer(5)})}
 if(err){w.addSpacer(2);txt(w,err,8,C.t.warn)}w.refreshAfterDate=new Date(Date.now()+C.refresh*60000);return w
}

async function main(){
 let n=new Date(),t,wp=null,e=null;try{t=await tide(n)}catch(x){let w=new ListWidget();w.backgroundColor=new Color(C.t.bg1);w.setPadding(14,14,14,14);txt(w,"TIDE DASH",18,C.t.fg,true);w.addSpacer(8);txt(w,"潮位データを取得できません",13,C.t.warn,true);w.addSpacer(4);txt(w,String(x),9,C.t.sub);return w}
 try{wp=await weather(n)}catch(x){e="天気/波は一時取得不可"}let f=config.widgetFamily||"large";return f==="medium"?mediumWidget(t,wp?.current):largeWidget(t,wp,e)
}
const W=await main();if(config.runsInWidget)Script.setWidget(W);else{let f=config.widgetFamily||"large";if(f==="medium")await W.presentMedium();else await W.presentLarge()}Script.complete();
