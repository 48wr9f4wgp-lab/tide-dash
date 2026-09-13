from pathlib import Path
import json

APP = Path('app-candidate.js')
MANIFEST = Path('manifest.json')

s = APP.read_text(encoding='utf-8')

s = s.replace(
    '// TIDE DASH v0.11.1 — Tide Literacy: teach the current tide without duplicating fishing advice',
    '// TIDE DASH v0.11.2 — Tide Literacy Polish: clearer beginner wording and tap affordance'
)

old = '''function tideRead(t){
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
}'''
new = '''function tideRead(t){
  const p=t.phaseProgress==null?.5:Math.max(0,Math.min(1,t.phaseProgress));
  const down=t.previousEvent?.type==="high"&&t.nextEvent?.type==="low";
  const up=t.previousEvent?.type==="low"&&t.nextEvent?.type==="high";
  const direction=down?"下げ":up?"上げ":"転流";
  const target=down?"干潮へ":up?"満潮へ":"転流付近";
  let stage,meaning;
  if(p<.12){stage="始まり";meaning="潮位変化が出始める"}
  else if(p<.35){stage="前半";meaning="潮位変化が大きくなりやすい"}
  else if(p<.65){stage="中盤";meaning="潮位変化が大きい時間帯"}
  else if(p<.88){stage="後半";meaning="潮位変化は小さくなりやすい"}
  else{stage="終盤";meaning="満干潮が近い"}
  return{p,direction,target,stage,meaning,summary:`${direction}${stage}｜${target}・${meaning}`};
}'''
if old not in s:
    raise SystemExit('tideRead block not found')
s = s.replace(old, new)

old = '''  const dr=down?"↘ 下げ":up?"↗ 上げ":"→ 転流付近",ph=t.phaseProgress==null?"":` ${Math.round(t.phaseProgress*100)}%`;
  text(cur,`推算潮位  ${dr}${ph}`,large?11:9,C.t.sub);
  if(large){
    const tr=tideRead(t),teach=text(cur,`潮読み  ${tr.summary}`,9,C.t.a,true);
    if(tideHelpURL)teach.url=tideHelpURL;
  }'''
new = '''  const dr=down?"↘ 下げ":up?"↗ 上げ":"→ 転流付近",ph=t.phaseProgress==null?"":` ${Math.round(t.phaseProgress*100)}%`;
  const tr=tideRead(t);
  text(cur,`推算潮位  ${dr}${ph} · ${tr.stage}`,large?11:9,C.t.sub);
  if(large){
    const teach=text(cur,`潮読み  ${tr.target} · ${tr.meaning}  ›`,9,C.t.a,true);
    if(tideHelpURL)teach.url=tideHelpURL;
  }'''
if old not in s:
    raise SystemExit('widget tide literacy block not found')
s = s.replace(old, new)

old = '    ms.addSpacer(5);const chance=metric(ms,"釣り",fg.stars,fg.label);if(guideURL)chance.url=guideURL;'
new = '    ms.addSpacer(5);const chance=metric(ms,"釣り目安 ›",fg.stars,fg.label);if(guideURL)chance.url=guideURL;'
if old not in s:
    raise SystemExit('fishing metric block not found')
s = s.replace(old, new)

# Tighten the help wording so beginners do not confuse tide height with current speed.
s = s.replace(
    '"満潮・干潮の前後は潮流が緩みやすく、その中間は動きやすい傾向があります。ただし潮位と実際の潮流は同じではなく、地形・風・河川・海峡などで変わります。"',
    '"この表示は潮位の変化を読んだ目安です。潮位と実際の潮流（流れの速さ・向き）は同じではなく、地形・風・河川・海峡などで変わります。"'
)

APP.write_text(s, encoding='utf-8')

m = json.loads(MANIFEST.read_text(encoding='utf-8'))
m['candidateVersion'] = '0.11.2'
m['candidateEnabled'] = True
m['updatedAt'] = '2026-09-13T13:02:00Z'
MANIFEST.write_text(json.dumps(m, ensure_ascii=False, separators=(',', ':')) + '\n', encoding='utf-8')

# Static release guards.
checks = [
    'TIDE DASH v0.11.2',
    '潮読み  ${tr.target} · ${tr.meaning}  ›',
    '釣り目安 ›',
    '潮位変化が大きい時間帯',
    'action==="tidehelp"',
]
for token in checks:
    if token not in s:
        raise SystemExit(f'missing release guard: {token}')
if '🎣 ${fg.label} · ${fg.shortReason}' in s:
    raise SystemExit('duplicated fishing advice still present in top block')
print('v0.11.2 patch + release guards: OK')
