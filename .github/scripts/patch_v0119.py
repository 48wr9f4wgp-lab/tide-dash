from pathlib import Path
import json

p = Path('app-candidate.js')
s = p.read_text()

old_header = '// TIDE DASH v0.11.8 — Signed Tide Level: explicit datum-relative current height'
new_header = '// TIDE DASH v0.11.9 — Visual Ergonomics: hierarchy / contrast / signed datum consistency'
if old_header not in s:
    raise SystemExit('v0.11.8 header not found')
s = s.replace(old_header, new_header, 1)

if 'muted:"#6F91A6"' not in s:
    raise SystemExit('muted palette marker not found')
s = s.replace('muted:"#6F91A6"', 'muted:"#85A7BA"', 1)

old_auto = '''badge:`AUTO · ${d}km`,
        badgeColor:d>=C.farKm?C.t.warn:C.t.muted'''
new_auto = '''badge:d>=C.farKm?`AUTO · ⚠ ${d}km`:`AUTO · ${d}km`,
        badgeColor:C.t.muted'''
if old_auto not in s:
    raise SystemExit('AUTO badge marker not found')
s = s.replace(old_auto, new_auto, 1)

marker = '''function metric(p,l,v,d=null){
  const b=p.addStack();b.layoutVertically();b.backgroundColor=new Color(C.t.panel,.55);b.cornerRadius=10;b.setPadding(7,8,7,8);
  text(b,l,9,C.t.sub);text(b,v,12,C.t.fg,true);if(d)text(b,d,9,C.t.muted);return b;
}'''
helper = marker + '''
function badgeLine(st,badge,z,col){
  const m=String(badge).match(/^(.*?)(⚠.*)$/);
  if(!m)return text(st,badge,z,col,true);
  const r=st.addStack();r.layoutHorizontally();
  text(r,m[1],z,col,true);text(r,m[2],z,C.t.warn,true);return r;
}'''
if marker not in s:
    raise SystemExit('metric marker not found')
s = s.replace(marker, helper, 1)

pairs = [
    ('text(ml,`${badge}  ▾`,8,badgeColor||C.t.sub,true);', 'badgeLine(ml,`${badge}  ▾`,8,badgeColor||C.t.sub);'),
    ('text(pl,`${badge}  ▾`,large?9:8,badgeColor||C.t.muted,true);', 'badgeLine(pl,`${badge}  ▾`,large?9:8,badgeColor||C.t.muted);'),
    ('text(mrf,"↻",14,C.t.a,true)', 'text(mrf,"↻",14,C.t.sub,true)'),
    ('text(rf,"↻",large?18:15,C.t.a,true)', 'text(rf,"↻",large?18:15,C.t.sub,true)'),
]
for a,b in pairs:
    if a not in s:
        raise SystemExit(f'marker not found: {a}')
    s = s.replace(a,b,1)

old_current = '''const cur=st.addStack();cur.layoutVertically();
  text(cur,`${signedTide(t.current)} cm`,large?34:24,C.t.fg,true);'''
new_current = '''const cur=st.addStack();cur.layoutVertically();
  text(cur,"推算潮位",9,C.t.sub,true);
  text(cur,`${signedTide(t.current)} cm`,large?34:24,C.t.fg,true);'''
if old_current not in s:
    raise SystemExit('large current block not found')
s = s.replace(old_current, new_current, 1)

old_state = 'text(cur,`推算潮位  ${dr}${ph} · ${tr.stage}`,large?11:9,C.t.sub);'
new_state = 'text(cur,`${dr}${ph} · ${tr.stage}`,large?11:9,C.t.sub);'
if old_state not in s:
    raise SystemExit('large state line not found')
s = s.replace(old_state, new_state, 1)

old_teach = '''if(large){
    const teach=text(cur,`潮読み  ${tideBrief(tr)}  ›`,10,C.t.a,true);
    if(tideHelpURL)teach.url=tideHelpURL;
  }'''
new_teach = '''if(large){
    text(cur,`潮読み  ${tideBrief(tr)}  ›`,10,C.t.a,true);
    if(tideHelpURL)cur.url=tideHelpURL;
  }'''
if old_teach not in s:
    raise SystemExit('large tide-help target not found')
s = s.replace(old_teach, new_teach, 1)

old_mtarget = '''const stateLine=text(mc,`${mdr}${mph?" "+mph:""}・${mtr.stage}｜${mtr.meaning}`,8,C.t.a,true);
    if(tideHelpURL)stateLine.url=tideHelpURL;'''
new_mtarget = '''text(mc,`${mdr}${mph?" "+mph:""}・${mtr.stage}｜${mtr.meaning}`,8,C.t.a,true);
    if(tideHelpURL)mc.url=tideHelpURL;'''
if old_mtarget not in s:
    raise SystemExit('medium tide-help target not found')
s = s.replace(old_mtarget, new_mtarget, 1)

replacements = {
    '${leftText(e.absoluteMinute-t.nowMin)} · ${e.level}cm': '${leftText(e.absoluteMinute-t.nowMin)} · ${signedTide(e.level)}cm',
    '${leftText(e.absoluteMinute-t.nowMin)} ${e.level}cm': '${leftText(e.absoluteMinute-t.nowMin)} ${signedTide(e.level)}cm',
    '${roll}${e.type==="high"?"▲":"▼"}${eventClock(e)} ${e.level}': '${roll}${e.type==="high"?"▲":"▼"}${eventClock(e)} ${signedTide(e.level)}',
    '${t.nextEvent.level}cm': '${signedTide(t.nextEvent.level)}cm',
}
for a,b in replacements.items():
    if a not in s:
        raise SystemExit(f'signed event marker not found: {a}')
    s = s.replace(a,b)

Path('app-candidate.js').write_text(s)
manifest = {
    'schemaVersion': 1,
    'stableVersion': '0.11.7',
    'stableURL': 'https://raw.githubusercontent.com/48wr9f4wgp-lab/tide-dash/main/app-stable.js',
    'candidateVersion': '0.11.9',
    'candidateURL': 'https://raw.githubusercontent.com/48wr9f4wgp-lab/tide-dash/main/app-candidate.js',
    'candidateEnabled': True,
    'updatedAt': '2026-09-14T14:00:00+09:00',
}
Path('manifest.json').write_text(json.dumps(manifest, ensure_ascii=False, separators=(',', ':')) + '\n')
