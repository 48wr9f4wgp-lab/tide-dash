from pathlib import Path

p = Path("app-candidate.js")
s = p.read_text(encoding="utf-8")

s = s.replace(
    "// TIDE DASH v0.11 — Beginner Guide: transparent fishing chance / tide explanation",
    "// TIDE DASH v0.11.1 — Tide Literacy: teach the current tide without duplicating fishing advice",
    1,
)

anchor = "\nasync function showGuide(){"
insert = r'''

function tideRead(t){
  const p=t.phaseProgress==null?.5:Math.max(0,Math.min(1,t.phaseProgress));
  const down=t.previousEvent?.type==="high"&&t.nextEvent?.type==="low";
  const up=t.previousEvent?.type==="low"&&t.nextEvent?.type==="high";
  const direction=down?"下げ":up?"上げ":"転流";
  const target=down?"干潮へ":up?"満潮へ":"転流付近";
  let stage,meaning;
  if(p<.12){stage="始まり";meaning="流れが出始める"}
  else if(p<.35){stage="前半";meaning="流れが強まりやすい"}
  else if(p<.65){stage="中盤";meaning="潮が動きやすい"}
  else if(p<.88){stage="後半";meaning="流れは弱まりやすい"}
  else{stage="終盤";meaning="潮止まりが近い"}
  return{p,direction,target,stage,meaning,summary:`${direction}${stage}｜${target}・${meaning}`};
}

async function showTideHelp(){
  const r=await resolveStation(false),now=new Date();
  let t;
  try{t=await tide(now,r.station)}catch(_){
    const a=new Alert();a.title="潮の見方";a.message="潮位データを取得できません";a.addAction("閉じる");await a.presentAlert();return;
  }
  const tr=tideRead(t),pct=t.phaseProgress==null?"--":`${Math.round(t.phaseProgress*100)}%`;
  const next=t.nextEvent?`${t.nextEvent.type==="high"?"満潮":"干潮"} ${eventClock(t.nextEvent)} / ${t.nextEvent.level}cm`:"--";
  const a=new Alert();
  a.title="🌊 潮の見方";
  a.message=[
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
    "満潮・干潮の前後は潮流が緩みやすく、その中間は動きやすい傾向があります。ただし潮位と実際の潮流は同じではなく、地形・風・河川・海峡などで変わります。"
  ].join("\n");
  a.addAction("閉じる");
  await a.presentAlert();
}
'''
if "function tideRead(t){" not in s:
    if anchor not in s:
        raise SystemExit("showGuide anchor not found")
    s = s.replace(anchor, insert + anchor, 1)

old_urls = 'const we=wp?.current??null,settingsURL=scriptURL("settings"),refreshURL=scriptURL("refresh"),guideURL=scriptURL("guide");'
new_urls = 'const we=wp?.current??null,settingsURL=scriptURL("settings"),refreshURL=scriptURL("refresh"),guideURL=scriptURL("guide"),tideHelpURL=scriptURL("tidehelp");'
if old_urls in s:
    s = s.replace(old_urls, new_urls, 1)
elif new_urls not in s:
    raise SystemExit("widget URL anchor not found")

old_line = '  if(large)text(cur,`🎣 ${fg.label} · ${fg.shortReason}`,9,C.t.a,true);'
new_line = '''  if(large){
    const tr=tideRead(t),teach=text(cur,`潮読み  ${tr.summary}`,9,C.t.a,true);
    if(tideHelpURL)teach.url=tideHelpURL;
  }'''
if old_line in s:
    s = s.replace(old_line, new_line, 1)
elif '潮読み  ${tr.summary}' not in s:
    raise SystemExit("duplicate fishing line anchor not found")

old_action = '  if(config.runsInApp&&action==="guide"){await showGuide();return null;}'
new_action = '''  if(config.runsInApp&&action==="tidehelp"){await showTideHelp();return null;}
  if(config.runsInApp&&action==="guide"){await showGuide();return null;}'''
if old_action in s:
    s = s.replace(old_action, new_action, 1)
elif 'action==="tidehelp"' not in s:
    raise SystemExit("guide action anchor not found")

p.write_text(s, encoding="utf-8")
print("Patched app-candidate.js to v0.11.1 tide literacy")
