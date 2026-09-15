from pathlib import Path
import json

p = Path('app-stable.js')
s = p.read_text()

old_header = '// TIDE DASH v0.11.9 — Visual Ergonomics: hierarchy / contrast / signed datum consistency'
new_header = '// TIDE DASH v0.12.0 — Tide Cycle: 大潮/中潮/小潮/長潮/若潮'
if old_header not in s:
    raise SystemExit('v0.11.9 stable header not found')
s = s.replace(old_header, new_header, 1)

marker = 'const signedTide=v=>{const n=Math.round(Number(v));return !Number.isFinite(n)?"--":n>0?`+${n}`:n<0?`−${Math.abs(n)}`:"0"};'
helper = marker + r'''
const sinD=d=>Math.sin((((d%360)+360)%360)*Math.PI/180);
function newMoonJDE(k){
  const T=k/1236.85,T2=T*T,T3=T2*T,T4=T3*T,E=1-.002516*T-.0000074*T2;
  const M=2.5534+29.10535670*k-.0000014*T2-.00000011*T3;
  const Mp=201.5643+385.81693528*k+.0107582*T2+.00001238*T3-.000000058*T4;
  const F=160.7108+390.67050284*k-.0016118*T2-.00000227*T3+.000000011*T4;
  const O=124.7746-1.56375588*k+.0020672*T2+.00000215*T3;
  const c=-.40720*sinD(Mp)+.17241*E*sinD(M)+.01608*sinD(2*Mp)+.01039*sinD(2*F)
    +.00739*E*sinD(Mp-M)-.00514*E*sinD(Mp+M)+.00208*E*E*sinD(2*M)
    -.00111*sinD(Mp-2*F)-.00057*sinD(Mp+2*F)+.00056*E*sinD(2*Mp+M)
    -.00042*sinD(3*Mp)+.00042*E*sinD(M+2*F)+.00038*E*sinD(M-2*F)
    -.00024*E*sinD(2*Mp-M)-.00017*sinD(O)-.00007*sinD(Mp+2*M)
    +.00004*sinD(2*Mp-2*F)+.00004*sinD(3*M)+.00003*sinD(Mp+M-2*F)
    +.00003*sinD(2*Mp+2*F)-.00003*sinD(Mp+M+2*F)+.00003*sinD(Mp-M+2*F)
    -.00002*sinD(Mp-M-2*F)-.00002*sinD(3*Mp+M)+.00002*sinD(4*Mp);
  return 2451550.09765+29.530588853*k+.0001337*T2-.000000150*T3+.00000000073*T4+c;
}
const jstDayIndex=ms=>Math.floor((ms+9*3600000)/86400000);
function tideCycle(date=new Date()){
  const jd=date.getTime()/86400000+2440587.5,today=jstDayIndex(date.getTime());
  const guess=Math.floor((jd-2451550.09765)/29.530588853);
  let baseDay=null;
  for(let k=guess-2;k<=guess+2;k++){
    const ms=(newMoonJDE(k)-2440587.5)*86400000,di=jstDayIndex(ms);
    if(di<=today&&(baseDay==null||di>baseDay))baseDay=di;
  }
  const lunarDay=Math.max(1,Math.min(30,baseDay==null?1:today-baseDay+1));
  let name;
  if([1,2,14,15,16,17,29,30].includes(lunarDay))name="大潮";
  else if([3,4,5,6,12,13,18,19,20,21,27,28].includes(lunarDay))name="中潮";
  else if([7,8,9,22,23,24].includes(lunarDay))name="小潮";
  else if([10,25].includes(lunarDay))name="長潮";
  else name="若潮";
  return{name,lunarDay};
}'''
if marker not in s:
    raise SystemExit('signed tide marker not found')
s = s.replace(marker, helper, 1)

old = 'const nd=new Date();text(md,`${nd.getMonth()+1}/${nd.getDate()}`,10,C.t.fg,true);'
new = 'const nd=new Date(),mtc=tideCycle(nd);text(md,`${nd.getMonth()+1}/${nd.getDate()}・${mtc.name}`,10,C.t.fg,true);'
if old not in s:
    raise SystemExit('medium date marker not found')
s = s.replace(old, new, 1)

old = 'const d=new Date();text(info,`${d.getMonth()+1}/${d.getDate()}`,large?15:12,C.t.fg,true);'
new = 'const d=new Date(),tc=tideCycle(d);text(info,`${d.getMonth()+1}/${d.getDate()}・${tc.name}`,large?15:12,C.t.fg,true);'
if old not in s:
    raise SystemExit('large date marker not found')
s = s.replace(old, new, 1)

old = 'const tr=tideRead(t),pct=t.phaseProgress==null?"--":`${Math.round(t.phaseProgress*100)}%`;'
new = 'const tr=tideRead(t),pct=t.phaseProgress==null?"--":`${Math.round(t.phaseProgress*100)}%`,tc=tideCycle(now);'
if old not in s:
    raise SystemExit('tide help marker not found')
s = s.replace(old, new, 1)

old = '''a.message=[
    `いま：${tr.direction}${tr.stage}（${pct}）`,'''
new = '''a.message=[
    `潮回り：${tc.name}`,
    `いま：${tr.direction}${tr.stage}（${pct}）`,'''
if old not in s:
    raise SystemExit('tide help message marker not found')
s = s.replace(old, new, 1)

old = '"この表示は潮位の変化を読んだ目安です。潮位と実際の潮流（流れの速さ・向き）は同じではなく、地形・風・河川・海峡などで変わります。"'
new = '"潮回りは新月日を1日目とする一般的な旧暦基準の区分です。地域により呼び方が異なる場合があります。",\n    "",\n    "この表示は潮位の変化を読んだ目安です。潮位と実際の潮流（流れの速さ・向き）は同じではなく、地形・風・河川・海峡などで変わります。"'
if old not in s:
    raise SystemExit('tide help caveat marker not found')
s = s.replace(old, new, 1)

Path('app-candidate.js').write_text(s)
manifest = {
    'schemaVersion': 1,
    'stableVersion': '0.11.9',
    'stableURL': 'https://raw.githubusercontent.com/48wr9f4wgp-lab/tide-dash/main/app-stable.js',
    'candidateVersion': '0.12.0',
    'candidateURL': 'https://raw.githubusercontent.com/48wr9f4wgp-lab/tide-dash/main/app-candidate.js',
    'candidateEnabled': True,
    'updatedAt': '2026-09-15T09:55:00+09:00'
}
Path('manifest.json').write_text(json.dumps(manifest, ensure_ascii=False, separators=(',', ':')) + '\n')
