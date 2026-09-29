#!/usr/bin/env python3
import json
import urllib.request
from pathlib import Path

SPOTS = Path("spots.json")
AREA_URL = "https://www.jma.go.jp/bosai/common/const/area.json"
UA = "TIDE-DASH-jma-warning-area-resolver/1.0"

def fetch_json(url):
    req=urllib.request.Request(url,headers={"User-Agent":UA,"Cache-Control":"no-cache"})
    with urllib.request.urlopen(req,timeout=30) as r:
        return json.loads(r.read().decode("utf-8"))

def norm(s):
    return str(s or "").replace("　","").replace(" ","").strip()

spots=json.loads(SPOTS.read_text(encoding="utf-8"))
area=fetch_json(AREA_URL)
class20=area.get("class20s") or {}
if not class20:
    raise SystemExit("JMA area.json class20s missing")

name_to_codes={}
for code,meta in class20.items():
    name=norm(meta.get("name"))
    if not name:
        continue
    name_to_codes.setdefault(name,[]).append(str(code))

fail=[]
resolved=0
for spot in spots.get("spots",[]):
    aliases=[norm(x) for x in spot.get("jmaAreaAliases",[]) if norm(x)]
    codes=[]
    names=[]
    for c in spot.get("jmaWarningAreaCodes",[]) or []:
        c=str(c)
        if c in class20 and c not in codes:
            codes.append(c)
            names.append(norm(class20[c].get("name")))
    for alias in aliases:
        exact=name_to_codes.get(alias,[])
        if exact:
            for c in exact:
                if c not in codes:
                    codes.append(c); names.append(alias)
            continue
        # Conservative fallback: only accept unique class20 prefix/suffix name match.
        matches=[]
        for name,cs in name_to_codes.items():
            if alias in name or name in alias:
                for c in cs:
                    matches.append((c,name))
        uniq=[]
        seen=set()
        for c,name in matches:
            if c not in seen:
                uniq.append((c,name));seen.add(c)
        if len(uniq)==1:
            c,name=uniq[0]
            if c not in codes:
                codes.append(c);names.append(name)
    if not codes:
        fail.append({"id":spot.get("id"),"aliases":aliases})
        continue
    spot["jmaWarningAreaCodes"]=codes
    spot["jmaWarningAreaNames"]=names
    resolved+=1

if fail:
    raise SystemExit("Unresolved JMA warning areas: "+json.dumps(fail,ensure_ascii=False))

spots.setdefault("jmaWarningMapping",{})
spots["jmaWarningMapping"].update({
    "source":AREA_URL,
    "mode":"resolved class20 codes",
    "resolvedCount":resolved,
    "status":"RESOLVED"
})

new=json.dumps(spots,ensure_ascii=False,indent=2)+"\n"
old=SPOTS.read_text(encoding="utf-8")
if new==old:
    print("No JMA warning-area changes")
else:
    SPOTS.write_text(new,encoding="utf-8")
    print(f"Resolved {resolved} fishing spots")
