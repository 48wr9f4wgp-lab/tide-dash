#!/usr/bin/env python3
import datetime as dt
import html as html_lib
import json
import re
import urllib.request
from pathlib import Path

URL = "https://www.data.jma.go.jp/kaiyou/db/tide/suisan/station"
OUT = Path("stations.json")


def clean(value: str) -> str:
    value = re.sub(r"<br\s*/?>", " ", value, flags=re.I)
    value = re.sub(r"<[^>]+>", "", value)
    value = html_lib.unescape(value)
    return re.sub(r"\s+", " ", value).strip()


def coord(value: str):
    nums = [int(x) for x in re.findall(r"\d+", value)]
    if not nums:
        return None
    deg = nums[0]
    minute = nums[1] if len(nums) > 1 else 0
    return round(deg + minute / 60.0, 6)


req = urllib.request.Request(URL, headers={"User-Agent": "TIDE-DASH-station-updater/1.0"})
with urllib.request.urlopen(req, timeout=30) as res:
    source = res.read().decode("utf-8", errors="replace")

stations = []
for row in re.findall(r"<tr[^>]*>([\s\S]*?)</tr>", source, flags=re.I):
    cells = [clean(x) for x in re.findall(r"<td[^>]*>([\s\S]*?)</td>", row, flags=re.I)]
    if len(cells) < 5:
        continue
    code = cells[1].strip()
    name = re.sub(r"\s+", "", cells[2])
    lat = coord(cells[3])
    lon = coord(cells[4])
    if re.fullmatch(r"[A-Z0-9]{2}", code) and name and lat is not None and lon is not None:
        stations.append({"code": code, "name": name, "lat": lat, "lon": lon})

# Fail closed: do not replace a good catalog with a partial parse.
if len(stations) < 200:
    raise SystemExit(f"Parsed only {len(stations)} stations; refusing to write stations.json")

seen = set()
deduped = []
for station in stations:
    if station["code"] in seen:
        continue
    seen.add(station["code"])
    deduped.append(station)

payload = {
    "schemaVersion": 1,
    "source": URL,
    "sourceYear": 2026,
    "generatedAt": dt.datetime.now(dt.timezone.utc).replace(microsecond=0).isoformat(),
    "complete": True,
    "count": len(deduped),
    "stations": deduped,
}
OUT.write_text(json.dumps(payload, ensure_ascii=False, separators=(",", ":")) + "\n", encoding="utf-8")
print(f"Wrote {len(deduped)} stations to {OUT}")
