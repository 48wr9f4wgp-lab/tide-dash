from pathlib import Path
import json, re

app_path = Path('app-candidate.js')
manifest_path = Path('manifest.json')
app = app_path.read_text(encoding='utf-8')

app = app.replace('// TIDE DASH v0.11.4 — Visual Simplify Pass', '// TIDE DASH v0.11.5 — Visual Simplify Pass: less clutter, stronger hierarchy')
app = app.replace('// TIDE DASH v0.11.3 — Duplication Pass: clearer hierarchy / day rollover / non-redundant event row', '// TIDE DASH v0.11.5 — Visual Simplify Pass: less clutter, stronger hierarchy')

app = app.replace('badge:d>=C.farKm?`◎ AUTO · 遠方基準点 ${d}km`:`◎ AUTO · 基準点 ${d}km`,', 'badge:`◎ AUTO · ${d}km`,')

repls = {
    'if(p<.12){stage="始まり";meaning="潮位変化が出始める"}': 'if(p<.12){stage="始まり";meaning="変化し始める"}',
    'else if(p<.35){stage="前半";meaning="潮位変化が大きくなりやすい"}': 'else if(p<.35){stage="前半";meaning="変化大きめへ"}',
    'else if(p<.65){stage="中盤";meaning="潮位変化が大きい時間帯"}': 'else if(p<.65){stage="中盤";meaning="変化大きめ"}',
    'else if(p<.88){stage="後半";meaning="潮位変化は小さくなりやすい"}': 'else if(p<.88){stage="後半";meaning="変化小さめへ"}',
}
for a,b in repls.items():
    app = app.replace(a,b)

app = app.replace('b.setPadding(6,7,6,7);\n  text(b,l,8,C.t.sub);text(b,v,11,C.t.fg,true);if(d)text(b,d,8,C.t.muted);return b;',
                  'b.setPadding(7,8,7,8);\n  text(b,l,9,C.t.sub);text(b,v,12,C.t.fg,true);if(d)text(b,d,9,C.t.muted);return b;')

app = app.replace('const im=w.addImage(graph(t));im.imageSize=new Size(large?325:310,large?110:82);im.applyFittingContentMode();',
                  'const im=w.addImage(graph(t));im.imageSize=new Size(large?325:310,large?128:88);im.applyFittingContentMode();')
app = app.replace('w.addSpacer(large?9:5);\n  if(we){', 'w.addSpacer(large?12:6);\n  if(we){')

app, n = re.subn(r'\n  if\(large&&wp\?\.slots\?\.length\)\{.*?\n  \}\n\n  if\(err\)', '\n\n  if(err)', app, flags=re.S)
if n != 1:
    raise SystemExit(f'forecast block removal count={n}')

manifest = json.loads(manifest_path.read_text(encoding='utf-8'))
manifest['candidateVersion'] = '0.11.5'
manifest['candidateEnabled'] = True
manifest['updatedAt'] = '2026-09-13T14:12:00Z'

required = [
    'TIDE DASH v0.11.5',
    'badge:`◎ AUTO · ${d}km`',
    '潮読み  ${tr.meaning}',
    '釣り目安 ›',
    'large?128:88',
]
for token in required:
    if token not in app:
        raise SystemExit(f'missing required token: {token}')
if 'if(large&&wp?.slots?.length)' in app:
    raise SystemExit('dense forecast strip still present')

app_path.write_text(app, encoding='utf-8')
manifest_path.write_text(json.dumps(manifest, ensure_ascii=False, separators=(',', ':')) + '\n', encoding='utf-8')
print('patched v0.11.5 visual simplify pass')
