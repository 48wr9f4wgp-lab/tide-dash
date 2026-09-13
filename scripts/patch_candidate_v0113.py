from pathlib import Path
import json

p = Path('app-candidate.js')
s = p.read_text(encoding='utf-8')

repls = {
'// TIDE DASH v0.11.2 — Tide Literacy Polish: clearer beginner wording and tap affordance': '// TIDE DASH v0.11.3 — Duplication Pass: clearer hierarchy / day rollover / non-redundant event row',
'''  let tideReason;\n  if(p<=.12||p>=.88)tideReason="潮止まりが近い";\n  else if(p<=.30)tideReason="潮が動き始める";\n  else if(p<=.70)tideReason="潮が動きやすい";\n  else tideReason="潮はまだ動く";''': '''  let tideReason;\n  if(p<=.12||p>=.88)tideReason="満干潮が近い";\n  else if(p<=.30)tideReason="潮位変化が増えやすい";\n  else if(p<=.70)tideReason="潮位変化が大きい時間帯";\n  else tideReason="潮位変化が小さくなりやすい";''',
'''    `潮の動き：${Math.round(g.tideMove*100)}%`,''': '''    `潮位変化要素：${Math.round(g.tideMove*100)}%`,''',
'''    "これは『釣れる確率』ではありません。潮の動き・朝夕マヅメ・潮差から作る初心者向けの目安です。魚種、水温、ベイト、地形、仕掛けなどは未考慮です。",''': '''    "これは『釣れる確率』ではありません。潮位変化・朝夕マヅメ・潮差から作る初心者向けの目安です。魚種、水温、ベイト、地形、仕掛けなどは未考慮です。",''',
'''    "潮の基本：満潮・干潮の直前後は潮が緩みやすく、その中間は潮が動きやすい傾向があります。"''': '''    "潮の基本：満干潮の中間ほど潮位変化が大きくなりやすい傾向があります。実際の潮流の速さ・向きとは別物です。"''',
'''    const teach=text(cur,`潮読み  ${tr.target} · ${tr.meaning}  ›`,9,C.t.a,true);''': '''    const teach=text(cur,`潮読み  ${tr.meaning}  ›`,9,C.t.a,true);''',
'''    const e=t.nextEvent;text(nx,`${e.type==="high"?"次の満潮":"次の干潮"} ${eventClock(e)}`,large?17:13,C.t.fg,true);''': '''    const e=t.nextEvent;text(nx,`${e.type==="high"?"次の満潮":"次の干潮"} ${eventDayWord(e)}${eventClock(e)}`,large?17:13,C.t.fg,true);''',
'''  const ex=w.addStack();ex.layoutHorizontally();\n  t.futureEvents.slice(0,4).forEach((e,i,a)=>{\n    text(ex,`${e.type==="high"?"▲":"▼"}${eventClock(e)} ${e.level}`,large?10:8,e.type==="high"?C.t.a:C.t.b,true);\n    if(i<a.length-1)ex.addSpacer();\n  });''': '''  const ex=w.addStack();ex.layoutHorizontally();\n  const rest=t.futureEvents.slice(1,large?4:3);\n  if(rest.length){\n    text(ex,"その後",large?8:7,C.t.muted,true);ex.addSpacer(6);\n    let prevDay=t.nextEvent?eventDayIndex(t.nextEvent):eventDayIndex({absoluteMinute:t.nowMin});\n    rest.forEach((e,i,a)=>{\n      const day=eventDayIndex(e),roll=day!==prevDay?(day===1?"翌 ":day===2?"翌々 ":""):"";\n      text(ex,`${roll}${e.type==="high"?"▲":"▼"}${eventClock(e)} ${e.level}`,large?10:8,e.type==="high"?C.t.a:C.t.b,true);\n      prevDay=day;if(i<a.length-1)ex.addSpacer();\n    });\n  }'''
}

for old, new in repls.items():
    if old not in s:
        raise SystemExit(f'Missing expected pattern:\n{old[:160]}')
    s = s.replace(old, new, 1)

anchor = '''function tideRead(t){'''
helper = '''function eventDayIndex(e){\n  const m=e?.absoluteMinute??e?.minute??0;\n  return Math.floor(m/1440);\n}\nfunction eventDayWord(e){\n  const d=eventDayIndex(e);\n  return d===1?"明日 ":d===2?"明後日 ":"";\n}\n\n'''
if helper.strip() not in s:
    if anchor not in s:
        raise SystemExit('Missing tideRead anchor')
    s = s.replace(anchor, helper + anchor, 1)

s = s.replace('`${t.nextEvent.type==="high"?"満潮":"干潮"} ${eventClock(t.nextEvent)} / ${t.nextEvent.level}cm`', '`${t.nextEvent.type==="high"?"満潮":"干潮"} ${eventDayWord(t.nextEvent)}${eventClock(t.nextEvent)} / ${t.nextEvent.level}cm`')
s = s.replace('`${t.nextEvent.type==="high"?"満潮":"干潮"} ${eventClock(t.nextEvent)}`', '`${t.nextEvent.type==="high"?"満潮":"干潮"} ${eventDayWord(t.nextEvent)}${eventClock(t.nextEvent)}`')

p.write_text(s, encoding='utf-8')

m = Path('manifest.json')
data = json.loads(m.read_text(encoding='utf-8'))
data['candidateVersion'] = '0.11.3'
data['updatedAt'] = '2026-09-13T13:40:00Z'
m.write_text(json.dumps(data, ensure_ascii=False, separators=(',', ':')) + '\n', encoding='utf-8')
