from pathlib import Path
import json

app_path = Path('app-candidate.js')
manifest_path = Path('manifest.json')
app = app_path.read_text(encoding='utf-8')

old_header = '// TIDE DASH v0.11.6 — Final Visual Polish: calmer AUTO, clearer tide literacy'
new_header = '// TIDE DASH v0.11.7 — Medium Hardening: compact hierarchy / tap regression prep'
if old_header not in app:
    raise SystemExit('expected v0.11.6 header not found')
app = app.replace(old_header, new_header, 1)

needle = '  const fg=fishingGuide(t,we,new Date());\n\n  const hd=w.addStack();'
if needle not in app:
    raise SystemExit('widget insertion point not found')

medium = r'''  const fg=fishingGuide(t,we,new Date());

  // Dedicated medium layout. Keep tide-first hierarchy and preserve tap targets
  // without trying to squeeze the large widget into a shorter canvas.
  if(!large){
    const mh=w.addStack();mh.layoutHorizontally();mh.centerAlignContent();
    const ml=mh.addStack();ml.layoutVertically();
    text(ml,S.name,15,C.t.fg,true);
    text(ml,`${badge}  ▾`,8,badgeColor||C.t.sub,true);
    if(settingsURL)ml.url=settingsURL;
    mh.addSpacer();
    const md=mh.addStack();md.layoutVertically();
    const nd=new Date();text(md,`${nd.getMonth()+1}/${nd.getDate()}`,10,C.t.fg,true);
    mh.addSpacer(7);
    const mrf=mh.addStack();mrf.layoutVertically();mrf.backgroundColor=new Color(C.t.panel,.55);mrf.cornerRadius=9;mrf.setPadding(3,6,3,6);
    text(mrf,"↻",14,C.t.a,true);if(refreshURL)mrf.url=refreshURL;

    w.addSpacer(3);
    const ms=w.addStack();ms.layoutHorizontally();ms.centerAlignContent();
    const mc=ms.addStack();mc.layoutVertically();
    text(mc,`${Math.round(t.current)} cm`,24,C.t.fg,true);
    const mdown=t.previousEvent?.type==="high"&&t.nextEvent?.type==="low",mup=t.previousEvent?.type==="low"&&t.nextEvent?.type==="high";
    const mdr=mdown?"↘ 下げ":mup?"↗ 上げ":"→ 転流",mph=t.phaseProgress==null?"":`${Math.round(t.phaseProgress*100)}%`,mtr=tideRead(t);
    const stateLine=text(mc,`${mdr}${mph?" "+mph:""}・${mtr.stage}｜${mtr.meaning}`,8,C.t.a,true);
    if(tideHelpURL)stateLine.url=tideHelpURL;
    ms.addSpacer();
    if(t.nextEvent){
      const e=t.nextEvent,mn=ms.addStack();mn.layoutVertically();mn.backgroundColor=new Color(C.t.panel,.45);mn.cornerRadius=10;mn.setPadding(4,7,4,7);
      text(mn,`${e.type==="high"?"満潮":"干潮"} ${eventDayWord(e)}${eventClock(e)}`,12,C.t.fg,true);
      text(mn,`${leftText(e.absoluteMinute-t.nowMin)} · ${e.level}cm`,8,C.t.sub);
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

  const hd=w.addStack();'''
app = app.replace(needle, medium, 1)

manifest = json.loads(manifest_path.read_text(encoding='utf-8'))
manifest['candidateVersion'] = '0.11.7'
manifest['candidateEnabled'] = True
manifest['updatedAt'] = '2026-09-14T08:00:00+09:00'

required = [
    'TIDE DASH v0.11.7',
    'if(!large){',
    'mi.imageSize=new Size(310,62)',
    'if(tideHelpURL)stateLine.url=tideHelpURL',
    'if(guideURL)fish.url=guideURL',
]
for token in required:
    if token not in app:
        raise SystemExit(f'missing required token: {token}')

app_path.write_text(app, encoding='utf-8')
manifest_path.write_text(json.dumps(manifest, ensure_ascii=False, separators=(',', ':')) + '\n', encoding='utf-8')
print('patched v0.11.7 medium hardening')
