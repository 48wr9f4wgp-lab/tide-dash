from pathlib import Path
import json

app_path = Path('app-candidate.js')
manifest_path = Path('manifest.json')
app = app_path.read_text(encoding='utf-8')

app = app.replace(
    '// TIDE DASH v0.11.5 — Visual Simplify Pass: less clutter, stronger hierarchy',
    '// TIDE DASH v0.11.6 — Final Visual Polish: calmer AUTO, clearer tide literacy'
)

# AUTOは常時主張させず、距離だけを静かに表示。遠方時のみ警告色を残す。
app = app.replace(
    'badge:`◎ AUTO · ${d}km`,\n        badgeColor:d>=C.farKm?C.t.warn:C.t.a',
    'badge:`AUTO · ${d}km`,\n        badgeColor:d>=C.farKm?C.t.warn:C.t.muted'
)
app = app.replace(
    'if(p.lastStation)return{station:p.lastStation,prefs:p,badge:"◎ AUTO · 前回基準点",badgeColor:C.t.warn};',
    'if(p.lastStation)return{station:p.lastStation,prefs:p,badge:"AUTO · 前回地点",badgeColor:C.t.muted};'
)

# 潮読みは初心者向けに「次の満干潮との関係 + 潮位変化」を短く翻訳する。
anchor = 'function tideRead(t){\n'
if anchor not in app:
    raise SystemExit('missing tideRead anchor')

insert_after = '  return{p,direction,target,stage,meaning,summary:`${direction}${stage}｜${target}・${meaning}`};\n}\n'
brief_fn = '''  return{p,direction,target,stage,meaning,summary:`${direction}${stage}｜${target}・${meaning}`};\n}\nfunction tideBrief(tr){\n  const target=tr.target==="干潮へ"?"干潮":tr.target==="満潮へ"?"満潮":"転流";\n  if(tr.p>=.88)return `${target}直前・変化かなり小さめ`;\n  if(tr.p>=.65)return `${target}近く・変化小さめ`;\n  if(tr.p>=.35)return "変化大きめ";\n  if(tr.p>=.12)return "変化が大きくなる";\n  return "変化し始め";\n}\n'''
if insert_after not in app:
    raise SystemExit('missing tideRead return block')
app = app.replace(insert_after, brief_fn, 1)

app = app.replace(
    'const teach=text(cur,`潮読み  ${tr.meaning}  ›`,9,C.t.a,true);',
    'const teach=text(cur,`潮読み  ${tideBrief(tr)}  ›`,10,C.t.a,true);'
)

# 地点サブ行を一段弱くして主役を潮位へ戻す。
app = app.replace(
    'text(pl,`${badge}  ▾`,large?10:8,badgeColor||C.t.a,true);',
    'text(pl,`${badge}  ▾`,large?9:8,badgeColor||C.t.muted,true);'
)

manifest = json.loads(manifest_path.read_text(encoding='utf-8'))
manifest['candidateVersion'] = '0.11.6'
manifest['candidateEnabled'] = True
manifest['updatedAt'] = '2026-09-13T14:45:00Z'

required = [
    'TIDE DASH v0.11.6',
    'badge:`AUTO · ${d}km`',
    'function tideBrief(tr)',
    '潮読み  ${tideBrief(tr)}',
    'large?9:8',
]
for token in required:
    if token not in app:
        raise SystemExit(f'missing required token: {token}')

app_path.write_text(app, encoding='utf-8')
manifest_path.write_text(json.dumps(manifest, ensure_ascii=False, separators=(',', ':')) + '\n', encoding='utf-8')
print('patched v0.11.6 final visual polish')
