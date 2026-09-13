// TIDE DASH v0.3
// Scriptable iPhone widget
// Tide: Japan Meteorological Agency (JMA) astronomical tide table
// Weather / wind / waves: Open-Meteo

const CONFIG = {
  title: "内浦",
  subtitle: "沼津",
  jmaStation: "UC",
  latitude: 35.0167,
  longitude: 138.8833,
  refreshMinutes: 30,
  cacheFolder: "TideDashCacheV03",
  theme: {
    bgTop: "#061824",
    bgBottom: "#0A3147",
    panel: "#0E3A50",
    primary: "#F7FBFF",
    secondary: "#9AB5C7",
    muted: "#6F91A6",
    accent: "#39E0DB",
    accent2: "#6AA8FF",
    grid: "#34566A",
    warning: "#FFBD55"
  }
};

const fm = FileManager.local();
const cacheDir = fm.joinPath(fm.documentsDirectory(), CONFIG.cacheFolder);
if (!fm.fileExists(cacheDir)) fm.createDirectory(cacheDir, true);

function pad2(n) { return String(n).padStart(2, "0"); }
function dateKey(d) { return `${d.getFullYear()}-${pad2(d.getMonth()+1)}-${pad2(d.getDate())}`; }
function localHourKey(d) { return `${dateKey(d)}T${pad2(d.getHours())}:00`; }
function minutesOfDay(d) { return d.getHours()*60 + d.getMinutes() + d.getSeconds()/60; }
function addDays(d, n) { const x = new Date(d); x.setDate(x.getDate()+n); return x; }
function eventClock(e) { return `${pad2(Math.floor(e.minute/60))}:${pad2(e.minute%60)}`; }

function countdownLabel(totalMin) {
  totalMin = Math.max(0, Math.round(totalMin));
  const h = Math.floor(totalMin/60);
  const m = totalMin % 60;
  return h > 0 ? `あと${h}時間${pad2(m)}分` : `あと${m}分`;
}

function windDir8(deg) {
  if (deg == null || Number.isNaN(deg)) return "--";
  const dirs = ["北","北東","東","南東","南","南西","西","北西"];
  return dirs[Math.round((((deg % 360)+360)%360)/45)%8];
}

function weatherEmoji(code) {
  if (code == null) return "·";
  if (code === 0) return "☀︎";
  if ([1,2].includes(code)) return "🌤";
  if (code === 3) return "☁︎";
  if ([45,48].includes(code)) return "霧";
  if ([51,53,55,56,57,61,63,65,66,67,80,81,82].includes(code)) return "☂︎";
  if ([71,73,75,77,85,86].includes(code)) return "雪";
  if ([95,96,99].includes(code)) return "雷";
  return "·";
}

function fmt1(v, suffix="") {
  return v == null ? "--" : `${Number(v).toFixed(1)}${suffix}`;
}

async function cachedString(url, key, ttlMs) {
  const path = fm.joinPath(cacheDir, key);
  if (fm.fileExists(path)) {
    const mod = fm.modificationDate(path);
    if (mod && Date.now() - mod.getTime() < ttlMs) return fm.readString(path);
  }
  try {
    const req = new Request(url);
    req.timeoutInterval = 15;
    const str = await req.loadString();
    fm.writeString(path, str);
    return str;
  } catch (e) {
    if (fm.fileExists(path)) return fm.readString(path);
    throw e;
  }
}

async function cachedJSON(url, key, ttlMs) {
  return JSON.parse(await cachedString(url, key, ttlMs));
}

// JMA fixed-width format:
// 1-72 hourly tide (3 chars x 24)
// 73-78 YYMMDD
// 79-80 station
// 81-108 high tides: (HHMM + 3-char level) x4
// 109-136 low tides: (HHMM + 3-char level) x4
function parseJmaLine(line) {
  if (!line || line.length < 136) return null;

  const hourly = [];
  for (let i=0; i<24; i++) {
    const raw = line.slice(i*3, i*3+3);
    if (!raw.trim()) return null;
    const v = Number.parseInt(raw.trim(), 10);
    if (!Number.isFinite(v)) return null;
    hourly.push(v);
  }

  const yy = Number.parseInt(line.slice(72,74).trim(),10);
  const mm = Number.parseInt(line.slice(74,76).trim(),10);
  const dd = Number.parseInt(line.slice(76,78).trim(),10);
  if (![yy,mm,dd].every(Number.isFinite)) return null;

  const year = yy >= 70 ? 1900+yy : 2000+yy;
  const station = line.slice(78,80).trim();

  const parseEvents = (offset, type) => {
    const out = [];
    for (let i=0; i<4; i++) {
      const base = offset + i*7;
      const hmRaw = line.slice(base, base+4);
      const lvRaw = line.slice(base+4, base+7);

      if (hmRaw === "9999" || lvRaw === "999" || !hmRaw.trim() || !lvRaw.trim()) continue;

      // JMA may left-pad HHMM, e.g. " 630" = 06:30, " 017" = 00:17.
      // Preserve the 4-char field while splitting hours/minutes.
      const hh = Number.parseInt(hmRaw.slice(0,2).trim(), 10);
      const mi = Number.parseInt(hmRaw.slice(2,4), 10);
      const level = Number.parseInt(lvRaw.trim(), 10);

      if ([hh,mi,level].every(Number.isFinite) && hh >= 0 && hh <= 23 && mi >= 0 && mi <= 59) {
        out.push({ type, minute: hh*60 + mi, level });
      }
    }
    return out;
  };

  return {
    key: `${year}-${pad2(mm)}-${pad2(dd)}`,
    year, month:mm, day:dd, station, hourly,
    events: [
      ...parseEvents(80, "high"),
      ...parseEvents(108, "low")
    ].sort((a,b)=>a.minute-b.minute)
  };
}

function parseJmaAnnual(text) {
  const map = new Map();
  for (const line of text.split(/\r?\n/)) {
    const d = parseJmaLine(line);
    if (d) map.set(d.key, d);
  }
  return map;
}

async function loadAnnual(year) {
  const s = CONFIG.jmaStation;
  const url = `https://www.data.jma.go.jp/gmd/kaiyou/data/db/tide/suisan/txt/${year}/${s}.txt`;
  const text = await cachedString(url, `jma_${s}_${year}.txt`, 12*60*60*1000);
  return parseJmaAnnual(text);
}

async function loadTideBundle(now) {
  const yesterday = addDays(now, -1);
  const tomorrow = addDays(now, 1);
  const years = [...new Set([
    yesterday.getFullYear(),
    now.getFullYear(),
    tomorrow.getFullYear()
  ])];
  const maps = await Promise.all(years.map(loadAnnual));

  const all = new Map();
  for (const m of maps) for (const [k,v] of m.entries()) all.set(k,v);

  const prevDay = all.get(dateKey(yesterday));
  const today = all.get(dateKey(now));
  const next = all.get(dateKey(tomorrow));
  if (!today) throw new Error(`JMA tide data missing for ${dateKey(now)}`);

  const levels = [...today.hourly, next ? next.hourly[0] : today.hourly[23]];
  const nowMin = minutesOfDay(now);
  const h = Math.min(23.999, nowMin/60);
  const i = Math.floor(h);
  const f = h-i;
  const current = levels[i] + (levels[i+1]-levels[i])*f;
  const slope = levels[i+1]-levels[i];

  const events = [];
  if (prevDay) {
    for (const e of prevDay.events) {
      events.push({...e, absoluteMinute:e.minute-1440});
    }
  }
  for (const e of today.events) {
    events.push({...e, absoluteMinute:e.minute});
  }
  if (next) {
    for (const e of next.events) {
      events.push({...e, absoluteMinute:1440+e.minute});
    }
  }
  events.sort((a,b)=>a.absoluteMinute-b.absoluteMinute);

  const previousEvent = [...events].reverse().find(e=>e.absoluteMinute<=nowMin) ?? null;
  const nextEvent = events.find(e=>e.absoluteMinute>nowMin) ?? null;

  let phaseProgress = null;
  if (previousEvent && nextEvent && nextEvent.absoluteMinute > previousEvent.absoluteMinute) {
    phaseProgress = Math.max(
      0,
      Math.min(
        1,
        (nowMin - previousEvent.absoluteMinute) /
        (nextEvent.absoluteMinute - previousEvent.absoluteMinute)
      )
    );
  }

  const dailyRange = Math.max(...today.hourly)-Math.min(...today.hourly);

  return {
    today,
    next,
    levels,
    current,
    slope,
    nowMin,
    previousEvent,
    nextEvent,
    phaseProgress,
    dailyRange
  };
}

async function loadWeather(now) {
  const lat = CONFIG.latitude;
  const lon = CONFIG.longitude;
  const tz = "Asia%2FTokyo";

  const weatherURL =
    `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}` +
    `&hourly=temperature_2m,precipitation,weather_code,wind_speed_10m,wind_direction_10m` +
    `&daily=sunrise,sunset&wind_speed_unit=ms&timezone=${tz}&forecast_days=2`;

  const marineURL =
    `https://marine-api.open-meteo.com/v1/marine?latitude=${lat}&longitude=${lon}` +
    `&hourly=wave_height,wave_direction,wave_period&timezone=${tz}&forecast_days=2&cell_selection=sea`;

  const [w,m] = await Promise.all([
    cachedJSON(weatherURL, "weather_v03.json", 25*60*1000),
    cachedJSON(marineURL, "marine_v03.json", 25*60*1000).catch(()=>null)
  ]);

  const key = localHourKey(now);
  const wi = w.hourly?.time?.indexOf(key) ?? -1;
  const mi = m?.hourly?.time?.indexOf(key) ?? -1;

  const current = {
    temp: wi>=0 ? w.hourly.temperature_2m[wi] : null,
    precip: wi>=0 ? w.hourly.precipitation[wi] : null,
    weatherCode: wi>=0 ? w.hourly.weather_code[wi] : null,
    wind: wi>=0 ? w.hourly.wind_speed_10m[wi] : null,
    windDir: wi>=0 ? w.hourly.wind_direction_10m[wi] : null,
    wave: mi>=0 ? m.hourly.wave_height[mi] : null,
    waveDir: mi>=0 ? m.hourly.wave_direction[mi] : null,
    wavePeriod: mi>=0 ? m.hourly.wave_period[mi] : null,
    sunrise: w.daily?.sunrise?.[0]?.slice(11,16) ?? "--:--",
    sunset: w.daily?.sunset?.[0]?.slice(11,16) ?? "--:--"
  };

  const slots = [];
  const startHour = Math.ceil(now.getHours()/3)*3;

  for (let n=0; n<5; n++) {
    const dt = new Date(now);
    dt.setMinutes(0,0,0);
    dt.setHours(startHour+n*3);

    const k = localHourKey(dt);
    const a = w.hourly?.time?.indexOf(k) ?? -1;
    const b = m?.hourly?.time?.indexOf(k) ?? -1;
    if (a < 0) continue;

    slots.push({
      time: `${pad2(dt.getHours())}:00`,
      weatherCode: w.hourly.weather_code[a],
      temp: w.hourly.temperature_2m[a],
      precip: w.hourly.precipitation[a],
      wind: w.hourly.wind_speed_10m[a],
      wave: b>=0 ? m.hourly.wave_height[b] : null
    });
  }

  return { current, slots };
}

function smoothSeries(levels, stepMin=15) {
  const pts = [];
  const n = levels.length;

  for (let min=0; min<=1440; min+=stepMin) {
    const x = min/60;
    const i1 = Math.min(23, Math.floor(x));
    const t = Math.min(1, x-i1);
    const i0 = Math.max(0, i1-1);
    const i2 = Math.min(n-1, i1+1);
    const i3 = Math.min(n-1, i1+2);
    const p0=levels[i0], p1=levels[i1], p2=levels[i2], p3=levels[i3];

    const t2=t*t, t3=t2*t;
    let y = 0.5*((2*p1)+(-p0+p2)*t+(2*p0-5*p1+4*p2-p3)*t2+(-p0+3*p1-3*p2+p3)*t3);
    const lo=Math.min(p1,p2), hi=Math.max(p1,p2);
    y = Math.max(lo, Math.min(hi, y));
    pts.push({ minute:min, level:y });
  }
  return pts;
}

function drawGraph(tide, width=650, height=220) {
  const ctx = new DrawContext();
  ctx.size = new Size(width,height);
  ctx.opaque = false;
  ctx.respectScreenScale = true;

  const left=8, right=8, top=22, bottom=30;
  const plotW=width-left-right;
  const plotH=height-top-bottom;

  const series=smoothSeries(tide.levels);
  let minV=Math.min(...series.map(p=>p.level));
  let maxV=Math.max(...series.map(p=>p.level));
  if (Math.abs(maxV-minV)<10) { maxV+=5; minV-=5; }
  const pad=Math.max(5,(maxV-minV)*0.08);
  minV-=pad; maxV+=pad;

  const xFor = minute => left+(minute/1440)*plotW;
  const yFor = level => top+(1-(level-minV)/(maxV-minV))*plotH;

  // Soft area fill
  const area = new Path();
  area.move(new Point(xFor(series[0].minute), top+plotH));
  for (const p of series) area.addLine(new Point(xFor(p.minute), yFor(p.level)));
  area.addLine(new Point(xFor(series[series.length-1].minute), top+plotH));
  area.closeSubpath();
  ctx.addPath(area);
  ctx.setFillColor(new Color(CONFIG.theme.accent, 0.10));
  ctx.fillPath();

  // Grid
  ctx.setStrokeColor(new Color(CONFIG.theme.grid, 0.42));
  ctx.setLineWidth(1);
  for (const hr of [0,6,12,18,24]) {
    const p = new Path();
    const x = xFor(hr*60);
    p.move(new Point(x,top));
    p.addLine(new Point(x,top+plotH));
    ctx.addPath(p);
    ctx.strokePath();
  }
  for (const frac of [0.33,0.66]) {
    const p = new Path();
    const y = top+plotH*frac;
    p.move(new Point(left,y));
    p.addLine(new Point(left+plotW,y));
    ctx.addPath(p);
    ctx.strokePath();
  }

  // Tide line
  const path = new Path();
  series.forEach((p,idx)=>{
    const pt=new Point(xFor(p.minute), yFor(p.level));
    if (idx===0) path.move(pt); else path.addLine(pt);
  });
  ctx.addPath(path);
  ctx.setStrokeColor(new Color(CONFIG.theme.accent));
  ctx.setLineWidth(5);
  ctx.strokePath();

  // High/low markers
  for (const e of tide.today.events) {
    const x=xFor(e.minute), y=yFor(e.level);
    ctx.setFillColor(new Color(e.type==="high" ? CONFIG.theme.accent : CONFIG.theme.accent2));
    ctx.fillEllipse(new Rect(x-5,y-5,10,10));
  }

  // Current marker
  const nowX=xFor(tide.nowMin), nowY=yFor(tide.current);
  const nowLine=new Path();
  nowLine.move(new Point(nowX,top));
  nowLine.addLine(new Point(nowX,top+plotH));
  ctx.addPath(nowLine);
  ctx.setStrokeColor(new Color(CONFIG.theme.primary,0.60));
  ctx.setLineWidth(2);
  ctx.strokePath();

  ctx.setFillColor(new Color(CONFIG.theme.primary));
  ctx.fillEllipse(new Rect(nowX-9,nowY-9,18,18));
  ctx.setFillColor(new Color(CONFIG.theme.accent2));
  ctx.fillEllipse(new Rect(nowX-5,nowY-5,10,10));

  // Hour labels
  ctx.setFont(Font.semiboldSystemFont(18));
  ctx.setTextColor(new Color(CONFIG.theme.secondary));
  for (const [m,txt] of [[0,"0"],[360,"6"],[720,"12"],[1080,"18"],[1440,"24"]]) {
    const x=xFor(m), tw=42;
    ctx.drawTextInRect(txt,new Rect(Math.max(0,Math.min(width-tw,x-tw/2)),height-25,tw,20));
  }

  return ctx.getImage();
}

function addText(stack, text, size, color, bold=false) {
  const t = stack.addText(text);
  t.font = bold ? Font.boldSystemFont(size) : Font.systemFont(size);
  t.textColor = new Color(color);
  t.lineLimit = 1;
  t.minimumScaleFactor = 0.72;
  return t;
}

function addPill(parent, text, color) {
  const s=parent.addStack();
  s.backgroundColor=new Color(CONFIG.theme.panel,0.75);
  s.cornerRadius=8;
  s.setPadding(3,7,3,7);
  addText(s,text,9,color,true);
  return s;
}

function addMetric(parent, label, value, detail=null) {
  const box=parent.addStack();
  box.layoutVertically();
  box.backgroundColor=new Color(CONFIG.theme.panel,0.55);
  box.cornerRadius=10;
  box.setPadding(6,7,6,7);
  addText(box,label,8,CONFIG.theme.secondary);
  addText(box,value,11,CONFIG.theme.primary,true);
  if (detail) addText(box,detail,8,CONFIG.theme.muted);
  return box;
}

function buildWidget(tide, weatherPack, errorText=null) {
  const w=new ListWidget();
  const family=config.widgetFamily || "large";
  const isLarge=family==="large";

  w.setPadding(isLarge ? 16 : 12, 14, isLarge ? 14 : 10, 14);

  const grad=new LinearGradient();
  grad.colors=[new Color(CONFIG.theme.bgTop),new Color(CONFIG.theme.bgBottom)];
  grad.locations=[0,1];
  w.backgroundGradient=grad;

  const weather=weatherPack?.current ?? null;

  // Brand row
  const brand=w.addStack();
  brand.layoutHorizontally();
  brand.centerAlignContent();
  addText(brand,"TIDE DASH",9,CONFIG.theme.accent,true);
  brand.addSpacer();
  const updated=new Date();
  addText(brand,`更新 ${pad2(updated.getHours())}:${pad2(updated.getMinutes())}`,8,CONFIG.theme.muted);
  brand.addSpacer(6);
  addPill(brand,"天文潮位",CONFIG.theme.secondary);

  w.addSpacer(isLarge ? 8 : 4);

  // Header
  const header=w.addStack();
  header.layoutHorizontally();
  header.centerAlignContent();

  const place=header.addStack();
  place.layoutVertically();
  addText(place,CONFIG.title,isLarge ? 22 : 16,CONFIG.theme.primary,true);
  addText(place,CONFIG.subtitle,isLarge ? 11 : 9,CONFIG.theme.secondary);

  header.addSpacer();

  const right=header.addStack();
  right.layoutVertically();
  const d=new Date();
  addText(right,`${d.getMonth()+1}/${d.getDate()}`,isLarge ? 15 : 12,CONFIG.theme.primary,true);
  addText(right,weather ? `☀︎${weather.sunrise}  ☾${weather.sunset}` : "JMA",isLarge ? 10 : 8,CONFIG.theme.secondary);

  w.addSpacer(isLarge ? 9 : 5);

  // Current status
  const status=w.addStack();
  status.layoutHorizontally();
  status.centerAlignContent();

  const current=status.addStack();
  current.layoutVertically();
  addText(current,`${Math.round(tide.current)} cm`,isLarge ? 34 : 24,CONFIG.theme.primary,true);

  const dir=tide.slope>0.5 ? "↗ 上げ" : tide.slope<-0.5 ? "↘ 下げ" : "→ 転流付近";
  const phaseText=tide.phaseProgress==null ? "" : `  ${Math.round(tide.phaseProgress*100)}%`;
  addText(current,`推算潮位  ${dir}${phaseText}`,isLarge ? 11 : 9,CONFIG.theme.secondary);

  if (isLarge && tide.previousEvent && tide.nextEvent) {
    const prevLabel=tide.previousEvent.type==="high" ? "満" : "干";
    const nextLabel=tide.nextEvent.type==="high" ? "満" : "干";
    addText(
      current,
      `${prevLabel}${eventClock(tide.previousEvent)} → ${nextLabel}${eventClock(tide.nextEvent)}`,
      9,
      CONFIG.theme.muted
    );
  }

  status.addSpacer();

  const next=status.addStack();
  next.layoutVertically();
  next.backgroundColor=new Color(CONFIG.theme.panel,0.48);
  next.cornerRadius=12;
  next.setPadding(isLarge ? 7 : 5,isLarge ? 9 : 7,isLarge ? 7 : 5,isLarge ? 9 : 7);

  if (tide.nextEvent) {
    const e=tide.nextEvent;
    const label=e.type==="high" ? "次の満潮" : "次の干潮";
    addText(next,`${label} ${eventClock(e)}`,isLarge ? 17 : 13,CONFIG.theme.primary,true);
    addText(next,`${countdownLabel(e.absoluteMinute-tide.nowMin)}  ${e.level}cm`,isLarge ? 11 : 9,CONFIG.theme.secondary);
  } else {
    addText(next,"次の満干潮 --",isLarge ? 17 : 13,CONFIG.theme.primary,true);
  }

  w.addSpacer(isLarge ? 8 : 3);

  // Tide graph
  const graph=w.addImage(drawGraph(tide));
  graph.imageSize=new Size(isLarge ? 325 : 310, isLarge ? 110 : 82);
  graph.applyFittingContentMode();

  w.addSpacer(isLarge ? 6 : 2);

  // High/low row
  const extrema=w.addStack();
  extrema.layoutHorizontally();
  const ev=tide.today.events.slice(0,4);
  ev.forEach((e,idx)=>{
    const symbol=e.type==="high" ? "▲" : "▼";
    addText(extrema,`${symbol}${eventClock(e)} ${e.level}`,isLarge ? 10 : 8,e.type==="high" ? CONFIG.theme.accent : CONFIG.theme.accent2,true);
    if (idx<ev.length-1) extrema.addSpacer();
  });

  w.addSpacer(isLarge ? 9 : 5);

  // Current conditions
  const metrics=w.addStack();
  metrics.layoutHorizontally();

  if (weather) {
    addMetric(
      metrics,
      "天気",
      `${weatherEmoji(weather.weatherCode)} ${weather.temp!=null ? Math.round(weather.temp)+"℃" : "--"}`,
      `雨 ${weather.precip!=null ? Number(weather.precip).toFixed(1) : "--"}mm`
    );
    metrics.addSpacer(5);

    addMetric(
      metrics,
      "風",
      `${fmt1(weather.wind,"m/s")} ${windDir8(weather.windDir)}`
    );
    metrics.addSpacer(5);

    const waveDetail = [
      weather.waveDir!=null ? windDir8(weather.waveDir) : null,
      weather.wavePeriod!=null ? `${Number(weather.wavePeriod).toFixed(0)}秒` : null
    ].filter(Boolean).join("・");

    addMetric(
      metrics,
      "波",
      fmt1(weather.wave,"m"),
      waveDetail || null
    );
    metrics.addSpacer(5);

    addMetric(
      metrics,
      "潮差",
      `${Math.round(tide.dailyRange)}cm`,
      tide.phaseProgress==null ? null : `${dir.replace("↗ ","").replace("↘ ","").replace("→ ","")} ${Math.round(tide.phaseProgress*100)}%`
    );
  } else {
    addText(metrics,"天気データ取得不可",10,CONFIG.theme.secondary);
  }

  // Large widget: use lower half for 3-hour outlook
  if (isLarge && weatherPack?.slots?.length) {
    w.addSpacer(10);

    const divider=w.addStack();
    divider.backgroundColor=new Color(CONFIG.theme.grid,0.55);
    divider.size=new Size(0,1);

    w.addSpacer(8);

    const label=w.addStack();
    label.layoutHorizontally();
    addText(label,"この先",10,CONFIG.theme.secondary,true);
    label.addSpacer();
    addText(label,"3時間ごと",9,CONFIG.theme.muted);

    w.addSpacer(5);

    const row=w.addStack();
    row.layoutHorizontally();

    weatherPack.slots.forEach((s,idx)=>{
      const c=row.addStack();
      c.layoutVertically();
      c.centerAlignContent();
      addText(c,s.time,9,CONFIG.theme.secondary,true);
      addText(c,weatherEmoji(s.weatherCode),14,CONFIG.theme.primary);
      addText(c,`${Math.round(s.temp)}℃`,9,CONFIG.theme.primary,true);
      addText(c,`風${s.wind!=null ? Number(s.wind).toFixed(1) : "--"}`,8,CONFIG.theme.muted);
      addText(c,`波${s.wave!=null ? Number(s.wave).toFixed(1) : "--"}`,8,CONFIG.theme.muted);
      addText(c,`雨${s.precip!=null ? Number(s.precip).toFixed(1) : "--"}`,8,CONFIG.theme.muted);
      if (idx<weatherPack.slots.length-1) row.addSpacer();
    });
  }

  if (errorText) {
    w.addSpacer(4);
    addText(w,errorText,8,CONFIG.theme.warning);
  }

  w.refreshAfterDate=new Date(Date.now()+CONFIG.refreshMinutes*60*1000);
  w.url=`https://www.data.jma.go.jp/kaiyou/db/tide/suisan/suisan.php?stn=${CONFIG.jmaStation}`;
  return w;
}

async function main() {
  const now=new Date();
  let tide;
  let weatherPack=null;
  let warning=null;

  try {
    tide=await loadTideBundle(now);
  } catch (e) {
    const w=new ListWidget();
    w.backgroundColor=new Color(CONFIG.theme.bgTop);
    w.setPadding(14,14,14,14);
    addText(w,"TIDE DASH",18,CONFIG.theme.primary,true);
    w.addSpacer(8);
    addText(w,"潮位データを取得できません",13,CONFIG.theme.warning,true);
    w.addSpacer(4);
    addText(w,String(e),9,CONFIG.theme.secondary);
    return w;
  }

  try {
    weatherPack=await loadWeather(now);
  } catch (e) {
    warning="天気/波は一時取得不可";
  }

  return buildWidget(tide,weatherPack,warning);
}

const widget=await main();

if (config.runsInWidget) {
  Script.setWidget(widget);
} else {
  const family=config.widgetFamily || "large";
  if (family==="small") await widget.presentSmall();
  else if (family==="medium") await widget.presentMedium();
  else await widget.presentLarge();
}

Script.complete();
