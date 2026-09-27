#!/usr/bin/env python3
import json, math, os, tempfile, urllib.request, zipfile
from pathlib import Path
import shapefile

SOURCE_URL = "https://nlftp.mlit.go.jp/ksj/gml/data/C09/C09-06/C09-06_GML.zip"
ROOT = Path(__file__).resolve().parents[1]
STATIONS = ROOT / "stations.json"
OUT = ROOT / "ports.json"

PREFS = {
"01":"北海道","02":"青森県","03":"岩手県","04":"宮城県","05":"秋田県","06":"山形県","07":"福島県",
"08":"茨城県","09":"栃木県","10":"群馬県","11":"埼玉県","12":"千葉県","13":"東京都","14":"神奈川県",
"15":"新潟県","16":"富山県","17":"石川県","18":"福井県","19":"山梨県","20":"長野県","21":"岐阜県",
"22":"静岡県","23":"愛知県","24":"三重県","25":"滋賀県","26":"京都府","27":"大阪府","28":"兵庫県",
"29":"奈良県","30":"和歌山県","31":"鳥取県","32":"島根県","33":"岡山県","34":"広島県","35":"山口県",
"36":"徳島県","37":"香川県","38":"愛媛県","39":"高知県","40":"福岡県","41":"佐賀県","42":"長崎県",
"43":"熊本県","44":"大分県","45":"宮崎県","46":"鹿児島県","47":"沖縄県"
}

def haversine(lat1, lon1, lat2, lon2):
    r=6371.0
    p1,p2=math.radians(lat1),math.radians(lat2)
    dp=math.radians(lat2-lat1); dl=math.radians(lon2-lon1)
    a=math.sin(dp/2)**2+math.cos(p1)*math.cos(p2)*math.sin(dl/2)**2
    return 2*r*math.asin(math.sqrt(a))

def nearest_station(lat, lon, stations):
    best=None
    for s in stations:
        d=haversine(lat,lon,float(s["lat"]),float(s["lon"]))
        if best is None or d<best[0]:
            best=(d,s)
    return best

def norm_code(v):
    if v is None: return ""
    s=str(v).strip()
    if s.endswith(".0"): s=s[:-2]
    return s

def main():
    stations=json.loads(STATIONS.read_text(encoding="utf-8"))["stations"]
    with tempfile.TemporaryDirectory() as td:
        zpath=Path(td)/"c09.zip"
        urllib.request.urlretrieve(SOURCE_URL,zpath)
        with zipfile.ZipFile(zpath) as z:
            z.extractall(td)
        shp=next(Path(td).rglob("*FishingPort.shp"))
        r=shapefile.Reader(str(shp),encoding="cp932")
        ports=[]
        seen=set()
        for sr in r.iterShapeRecords():
            rec=sr.record.as_dict()
            code=norm_code(rec.get("C09_001"))
            name=str(rec.get("C09_002") or "").strip()
            if not code or not name or not sr.shape.points:
                continue
            if code in seen: continue
            lon,lat=map(float,sr.shape.points[0][:2])
            if not (20<=lat<=50 and 120<=lon<=150):
                continue
            seen.add(code)
            admin=norm_code(rec.get("C09_003")).zfill(5)
            pref_code=admin[:2]
            d,st=nearest_station(lat,lon,stations)
            ports.append({
                "id":f"c09-{code}",
                "name":name,
                "prefecture":PREFS.get(pref_code,""),
                "prefectureCode":pref_code,
                "adminCode":admin,
                "class":norm_code(rec.get("C09_004")),
                "lat":round(lat,6),
                "lon":round(lon,6),
                "code":st["code"],
                "tideName":st["name"],
                "tideDistanceKm":round(d,1),
                "kind":"fishing_port",
                "source":"MLIT-C09-2006"
            })
    ports.sort(key=lambda x:(x["prefectureCode"],x["name"],x["id"]))
    out={
        "schemaVersion":1,
        "generatedFrom":"国土数値情報 漁港 C09-06",
        "sourceURL":SOURCE_URL,
        "dataYear":2006,
        "license":"非商用",
        "notice":"漁港の位置・名称は国土交通省C09 2006年度版。現行の名称・区域・立入可否・釣り可否を保証しません。現地ルールを優先してください。",
        "count":len(ports),
        "ports":ports
    }
    OUT.write_text(json.dumps(out,ensure_ascii=False,separators=(",",":"))+"\n",encoding="utf-8")
    print(f"generated {len(ports)} ports -> {OUT}")

if __name__=="__main__":
    main()
