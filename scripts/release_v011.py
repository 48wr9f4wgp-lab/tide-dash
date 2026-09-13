from pathlib import Path
import json

candidate_path = Path('app-candidate.js')
stable_path = Path('app-stable.js')
manifest_path = Path('manifest.json')

source = candidate_path.read_text(encoding='utf-8')
if not source.startswith('// TIDE DASH v0.10'):
    raise SystemExit('Expected v0.10 candidate')

# Promote the verified v0.10 candidate to stable.
stable_path.write_text(source, encoding='utf-8')

code = source.replace(
    '// TIDE DASH v0.10 — Reliability: static station master / stale cache visibility',
    '// TIDE DASH v0.11 — Beginner Guide: transparent fishing chance / tide explanation',
    1,
)

needle = 'function graph(t,width=650,height=220){'
guide_code = r'''
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
  if(p<=.12||p>=.88)tideReason="潮止まりが近い";
  else if(p<=.30)tideReason="潮が動き始める";
  else if(p<=.70)tideReason="潮が動きやすい";
  else tideReason="潮はまだ動く";
  if(magic>=.65)tideReason=`マヅメ中・${tideReason}`;
  else if(magic>=.25)tideReason=`マヅメ接近・${tideReason}`;

  let condition="";
  if((we?.wind??0)>=8)condition="強風注意";
  else if((we?.wave??0)>=1.5)condition="波高め";
  else if((we?.wind??0)>=5)condition="風やや強め";
  else condition="釣行条件は穏やか";

  return{score,label,stars,shortReason:tideReason,tideMove,magic,range,condition};
}
async function showGuide(){
  const r=await resolveStation(false),now=new Date();
  let t,wp=null;
  try{t=await tide(now,r.station)}catch(e){
    const a=new Alert();a.title="釣りチャンス";a.message="潮位データを取得できません";a.addAction("閉じる");await a.presentAlert();return;
  }
  try{wp=await weather(now,r.station)}catch(_){}
  const we=wp?.current??null,g=fishingGuide(t,we,now);
  const next=t.nextEvent?`${t.nextEvent.type==="high"?"満潮":"干潮"} ${eventClock(t.nextEvent)}`:"--";
  const a=new Alert();
  a.title=`🎣 ${g.label}  ${g.stars}`;
  a.message=[
    `今の目安：${g.score}/100`,
    `潮の動き：${Math.round(g.tideMove*100)}%`,
    `マヅメ要素：${Math.round(g.magic*100)}%`,
    `潮差要素：${Math.round(g.range*100)}%`,
    `次：${next}`,
    `状況：${g.condition}`,
    "",
    "これは『釣れる確率』ではありません。潮の動き・朝夕マヅメ・潮差から作る初心者向けの目安です。魚種、水温、ベイト、地形、仕掛けなどは未考慮です。",
    "",
    "潮の基本：満潮・干潮の直前後は潮が緩みやすく、その中間は潮が動きやすい傾向があります。"
  ].join("\n");
  a.addAction("閉じる");
  await a.presentAlert();
}

'''
if needle not in code:
    raise SystemExit('graph insertion point missing')
code = code.replace(needle, guide_code + needle, 1)

old = '  const we=wp?.current??null,settingsURL=scriptURL("settings"),refreshURL=scriptURL("refresh");'
new = '  const we=wp?.current??null,settingsURL=scriptURL("settings"),refreshURL=scriptURL("refresh"),guideURL=scriptURL("guide");\n  const fg=fishingGuide(t,we,new Date());'
if old not in code:
    raise SystemExit('widget preamble pattern missing')
code = code.replace(old, new, 1)

old = '  if(large&&t.previousEvent&&t.nextEvent)text(cur,`${t.previousEvent.type==="high"?"満":"干"}${eventClock(t.previousEvent)} → ${t.nextEvent.type==="high"?"満":"干"}${eventClock(t.nextEvent)}`,9,C.t.muted);'
new = '  if(large)text(cur,`🎣 ${fg.label} · ${fg.shortReason}`,9,C.t.a,true);'
if old not in code:
    raise SystemExit('current detail pattern missing')
code = code.replace(old, new, 1)

old = '    ms.addSpacer(5);metric(ms,"潮差",`${Math.round(t.dailyRange)}cm`,t.phaseProgress==null?null:`${down?"下げ":up?"上げ":"転流"} ${Math.round(t.phaseProgress*100)}%`);'
new = '    ms.addSpacer(5);const chance=metric(ms,"釣り",fg.stars,fg.label);if(guideURL)chance.url=guideURL;'
if old not in code:
    raise SystemExit('metric pattern missing')
code = code.replace(old, new, 1)

old = '  if(config.runsInApp&&action==="settings"){'
new = '  if(config.runsInApp&&action==="guide"){await showGuide();return null;}\n  if(config.runsInApp&&action==="settings"){'
if old not in code:
    raise SystemExit('main action pattern missing')
code = code.replace(old, new, 1)

candidate_path.write_text(code, encoding='utf-8')

manifest = json.loads(manifest_path.read_text(encoding='utf-8'))
manifest.update({
    'stableVersion':'0.10',
    'candidateVersion':'0.11',
    'candidateEnabled':True,
})
manifest_path.write_text(json.dumps(manifest, ensure_ascii=False, separators=(',',':'))+'\n', encoding='utf-8')

print('Promoted v0.10 stable and built v0.11 candidate')
