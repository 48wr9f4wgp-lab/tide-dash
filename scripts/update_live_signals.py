#!/usr/bin/env python3
"""
Build live_regional_signals.json from official fisheries sources.

Fail-closed rules:
- each source adapter updates only its own region when parsing succeeds;
- parser failure preserves the last valid region payload;
- no scraped value is converted into recreational catch probability;
- JSON is rewritten only when semantic source data changed.
"""
from __future__ import annotations

import datetime as dt
import hashlib
import io
import json
import re
import urllib.parse
import urllib.request
from pathlib import Path

from bs4 import BeautifulSoup
from pypdf import PdfReader

OUT = Path("live_regional_signals.json")
JST = dt.timezone(dt.timedelta(hours=9))
UA = "TIDE-DASH-live-signal-updater/1.0 (+official-public-data-only)"

IBARAKI_SHIRASU = "https://www.pref.ibaraki.jp/nourinsuisan/suishi/kaiyu/funabiki/funabiki-toppage.html"
SHIZUOKA_COASTAL = "https://fish-exp.pref.shizuoka.jp/02fishery/2-1-1.html"
SHIZUOKA_INDEX = "https://fish-exp.pref.shizuoka.jp/02fishery/2-1.html"
NIIGATA_2026 = "https://www.pref.niigata.lg.jp/site/suisan-kenkyu/2026mizuage.html"

TARGET_NAMES = {
    "MA_AJI": ["マアジ"],
    "SABA": ["サバ類", "さば類"],
    "IWASHI": ["イワシ類", "いわし類"],
    "BURI": ["イナダ", "小ブリ", "中ブリ", "大ブリ", "ブリ"],
    "SAWARA": ["サワラ"],
    "HIRAME": ["ヒラメ"],
}


def fetch(url: str, binary: bool = False):
    req = urllib.request.Request(url, headers={"User-Agent": UA, "Cache-Control": "no-cache"})
    with urllib.request.urlopen(req, timeout=30) as res:
        data = res.read()
        final_url = res.geturl()
        charset = res.headers.get_content_charset()
    if binary:
        return data, final_url
    tried = []
    for enc in [charset, "utf-8", "cp932", "shift_jis"]:
        if not enc or enc in tried:
            continue
        tried.append(enc)
        try:
            return data.decode(enc), final_url
        except (UnicodeDecodeError, LookupError):
            pass
    return data.decode("utf-8", errors="replace"), final_url


def compact_text(html: str) -> str:
    return re.sub(r"\s+", " ", BeautifulSoup(html, "html.parser").get_text(" ", strip=True)).strip()


def parse_jp_date(text: str):
    m = re.search(r"令和8年\s*(\d{1,2})月\s*(\d{1,2})日", text)
    if not m:
        return None
    return f"2026-{int(m.group(1)):02d}-{int(m.group(2)):02d}"


def parse_ibaraki(previous_region):
    html, _ = fetch(IBARAKI_SHIRASU)
    soup = BeautifulSoup(html, "html.parser")
    rows = []
    current_date = None
    for h2 in soup.find_all("h2"):
        current_date = parse_jp_date(h2.get_text(" ", strip=True))
        if not current_date:
            continue
        table = h2.find_next("table")
        if not table:
            continue
        for tr in table.find_all("tr"):
            cells = [re.sub(r"\s+", " ", x.get_text(" ", strip=True)).strip() for x in tr.find_all(["th", "td"])]
            if "大津" not in cells:
                continue
            # Common shape: [シラス?, 大津, boats, kg, cpue, price]
            try:
                idx = cells.index("大津")
                boats_s = cells[idx + 1] if idx + 1 < len(cells) else ""
                kg_s = cells[idx + 2] if idx + 2 < len(cells) else ""
                cpue_s = cells[idx + 3] if idx + 3 < len(cells) else ""
                if "なし" in boats_s:
                    continue
                num = lambda x: float(re.sub(r"[^0-9.]", "", x.replace(",", ""))) if re.search(r"\d", x) else None
                boats = num(boats_s)
                kg = num(kg_s)
                cpue = num(cpue_s)
                if boats is None or kg is None or cpue is None:
                    continue
                rows.append({"date": current_date, "boats": int(boats), "kg": kg, "cpueKgPerBoat": cpue})
            except Exception:
                continue
    dedup = {}
    for row in rows:
        dedup[row["date"]] = row
    recent = [dedup[k] for k in sorted(dedup.keys(), reverse=True)[:4]]
    if not recent:
        raise ValueError("Ibaraki: no numeric Otsu shirasu rows parsed")
    return {
        "regionId": "IBARAKI_PACIFIC",
        "sourceType": "official_fresh_bait_context",
        "source": IBARAKI_SHIRASU,
        "publishedDate": recent[0]["date"],
        "freshBaitContext": {
            "species": "シラス",
            "district": "大津",
            "rows": recent,
            "rankingEffect": "none",
            "note": "ベイト状況の参考。対象魚順位への自動加点には使用しない。"
        }
    }


def parse_shizuoka(previous_region):
    html, _ = fetch(SHIZUOKA_COASTAL)
    text = compact_text(html)
    fw = str.maketrans("０１２３４５６７８９", "0123456789")
    normalized = text.translate(fw)
    month_candidates = [int(x) for x in re.findall(r"(?:R8年|令和8年)?\s*(\d{1,2})月計", normalized)]
    if not month_candidates:
        index_html, _ = fetch(SHIZUOKA_INDEX)
        index_text = compact_text(index_html).translate(fw)
        month_candidates = [int(x) for x in re.findall(r"令和8年\s*(\d{1,2})月分掲載中", index_text)]
    month_candidates = [x for x in month_candidates if 1 <= x <= 12]
    if not month_candidates:
        raise ValueError("Shizuoka: report month not found")
    month = max(month_candidates)
    patterns = [
        ("MARUSOUDA", "ソウダ", r"マルソウダは\s*([0-9.]+)トン"),
        ("KAMASU", "カマス", r"ヤマトカマスは\s*([0-9.]+)トン"),
        ("SABA", "サバ", r"さば類は\s*([0-9.]+)トン"),
        ("MA_AJI", "アジ", r"マアジは\s*([0-9.]+)トン"),
        ("BURI", "ブリ", r"ブリは\s*([0-9.]+)トン"),
    ]
    species = []
    for sid, name, pat in patterns:
        m = re.search(pat, text)
        if not m:
            continue
        tons = float(m.group(1))
        species.append({"id": sid, "name": name, "tons": tons})
    if len(species) < 3:
        raise ValueError(f"Shizuoka: only {len(species)} species parsed")
    species.sort(key=lambda x: x["tons"], reverse=True)
    # The official page currently publishes the preceding month's report.
    now = dt.datetime.now(JST)
    year = now.year if month <= now.month else now.year - 1
    source_month = f"{year:04d}-{month:02d}"
    return {
        "regionId": "SHIZUOKA_EAST_IZU",
        "sourceType": "official_recent_monthly_set_net",
        "source": SHIZUOKA_COASTAL,
        "sourceMonth": source_month,
        "ranking": species,
        "note": "伊豆東岸大型定置網の最新公表月実績。商業漁獲を遊漁釣果確率へ変換しない。"
    }


def pdf_text(data: bytes) -> str:
    reader = PdfReader(io.BytesIO(data))
    return "\n".join((page.extract_text() or "") for page in reader.pages)


def parse_niigata(previous_region):
    html, base = fetch(NIIGATA_2026)
    soup = BeautifulSoup(html, "html.parser")
    pdf_by_month = {}
    for a in soup.find_all("a", href=True):
        label = re.sub(r"\s+", "", a.get_text("", strip=True))
        m = re.match(r"^(\d{1,2})月.*PDF", label, flags=re.I)
        if not m:
            continue
        href = urllib.parse.urljoin(base, a["href"])
        if ".pdf" not in href.lower():
            continue
        pdf_by_month[int(m.group(1))] = href
    if not pdf_by_month:
        raise ValueError("Niigata: no monthly PDF links parsed")
    month = max(pdf_by_month)
    pdf_url = pdf_by_month[month]
    data, _ = fetch(pdf_url, binary=True)
    text = re.sub(r"\s+", " ", pdf_text(data))
    if "定置網" not in text:
        raise ValueError("Niigata: fixed-net section missing in PDF text")
    section = text.split("定置網", 1)[1]
    for marker in ["浮魚", "まき網", "底びき"]:
        if marker in section:
            section = section.split(marker, 1)[0]
            break

    absent = set()
    for sentence in re.findall(r"[^。]*水揚げはありませんでした。?", section):
        for sid, names in TARGET_NAMES.items():
            if any(name in sentence for name in names):
                absent.add(sid)

    observed = []
    for sid, names in TARGET_NAMES.items():
        if sid in absent:
            continue
        if any(name in section for name in names):
            observed.append(sid)

    return {
        "regionId": "NIIGATA_JAPAN_SEA",
        "sourceType": "official_latest_monthly_fixed_net",
        "source": pdf_url,
        "sourceMonth": f"2026-{month:02d}",
        "observedSpecies": observed,
        "explicitAbsentSpecies": sorted(absent),
        "note": "最新月PDFの定置網節から魚種の記載有無を抽出。数量ランキングはhistorical priorを維持し、fresh signalは補強に限定。"
    }


def load_previous():
    if not OUT.exists():
        return {"schemaVersion": 1, "regions": {}}
    try:
        obj = json.loads(OUT.read_text(encoding="utf-8"))
        return obj if obj.get("schemaVersion") == 1 else {"schemaVersion": 1, "regions": {}}
    except Exception:
        return {"schemaVersion": 1, "regions": {}}


def semantic(obj):
    clone = json.loads(json.dumps(obj, ensure_ascii=False))
    clone.pop("generatedAt", None)
    clone.pop("errors", None)
    return clone


previous = load_previous()
regions = dict(previous.get("regions") or {})
errors = {}

for region_id, parser in [
    ("IBARAKI_PACIFIC", parse_ibaraki),
    ("SHIZUOKA_EAST_IZU", parse_shizuoka),
    ("NIIGATA_JAPAN_SEA", parse_niigata),
]:
    try:
        regions[region_id] = parser(regions.get(region_id))
    except Exception as exc:
        errors[region_id] = str(exc)

payload = {
    "schemaVersion": 1,
    "generatedAt": dt.datetime.now(dt.timezone.utc).replace(microsecond=0).isoformat(),
    "policy": {
        "officialSourcesOnly": True,
        "absoluteCatchProbability": False,
        "failClosed": True,
        "freshSignalRole": "booster_or_override_only_when_adapter_supports_it"
    },
    "regions": regions,
}
if errors:
    payload["errors"] = errors

if errors:
    print("Adapter errors:", json.dumps(errors, ensure_ascii=False))

if semantic(payload) == semantic(previous):
    print("No semantic live-signal changes")
    raise SystemExit(0)

OUT.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
print(f"Wrote {OUT}")
for key in sorted(regions):
    print(key, json.dumps(regions[key], ensure_ascii=False))
if errors:
    print("Adapter errors:", json.dumps(errors, ensure_ascii=False))
