from pathlib import Path
import json

p = Path('app-candidate.js')
s = p.read_text()

s = s.replace('// TIDE DASH v0.11.3 — Duplication Pass: clearer hierarchy / day rollover / non-redundant event row',
              '// TIDE DASH v0.11.4 — Visual QA: round-hour graph ticks / clearer next-day event row')

old = '  const gridTimes=[t.graphStart,t.graphStart+360,t.graphStart+720,t.graphStart+1080,t.graphEnd];\n'
new = '  const gridTimes=[];\n  const firstGrid=Math.ceil(t.graphStart/360)*360;\n  for(let m=firstGrid;m<=t.graphEnd;m+=360)gridTimes.push(m);\n'
if old not in s:
    raise SystemExit('gridTimes anchor not found')
s = s.replace(old, new, 1)

old = '  if(rest.length){\n    text(ex,"その後",large?8:7,C.t.muted,true);ex.addSpacer(6);\n    let prevDay=t.nextEvent?eventDayIndex(t.nextEvent):eventDayIndex({absoluteMinute:t.nowMin});\n'
new = '  if(rest.length){\n    const firstDay=eventDayIndex(rest[0]);\n    const rowLabel=firstDay===1?"明日":firstDay===2?"明後日":"その後";\n    text(ex,rowLabel,large?8:7,C.t.muted,true);ex.addSpacer(6);\n    let prevDay=firstDay;\n'
if old not in s:
    raise SystemExit('event row anchor not found')
s = s.replace(old, new, 1)

# Avoid redundant day prefix on the first rest event; later day transitions remain explicit.
old = '    rest.forEach((e,i,a)=>{\n      const day=eventDayIndex(e),roll=day!==prevDay?(day===1?"翌 ":day===2?"翌々 ":""):"";\n'
new = '    rest.forEach((e,i,a)=>{\n      const day=eventDayIndex(e),roll=i>0&&day!==prevDay?(day===1?"翌 ":day===2?"翌々 ":""):"";\n'
if old not in s:
    raise SystemExit('rollover anchor not found')
s = s.replace(old, new, 1)

p.write_text(s)

m = Path('manifest.json')
obj = json.loads(m.read_text())
obj['candidateVersion'] = '0.11.4'
obj['updatedAt'] = '2026-09-13T14:00:00Z'
m.write_text(json.dumps(obj, ensure_ascii=False, separators=(',', ':')) + '\n')
