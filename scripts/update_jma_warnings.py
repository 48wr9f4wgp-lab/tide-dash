#!/usr/bin/env python3
"""
Build jma_warning_signals.json from the official JMA Pull-type disaster XML feed.

Design goals:
- official JMA data only;
- use post-2026 warning product VPWS50 (aggregate current state);
- keep the iPhone/Scriptable client lightweight by publishing a compact JSON snapshot;
- fail closed: incomplete area coverage, stale source XML, parse errors, or network errors
  must not overwrite the last valid snapshot.
"""
from __future__ import annotations

import datetime as dt
import json
import re
import urllib.request
import xml.etree.ElementTree as ET
from pathlib import Path

OUT = Path("jma_warning_signals.json")
SPOTS = Path("spots.json")
UTC = dt.timezone.utc
JST = dt.timezone(dt.timedelta(hours=9))

# JMA Pull-type Atom feeds. The long feed is required because the high-frequency
# feed only contains a short recent window and absence there is not "no warning".
FEEDS = (
    "https://www.data.jma.go.jp/developer/xml/feed/extra_l.xml",
    "https://www.data.jma.go.jp/developer/xml/feed/extra.xml",
)
PRODUCT = "VPWS50"
UA = "TIDE-DASH-jma-warning-updater/2.0 (+official-JMA-data-only)"
MAX_SOURCE_AGE_MIN = 120
FUTURE_TOLERANCE_MIN = 15

TARGET_WARNING_CODES = {"14", "16", "07", "37"}
TARGET_META = {
    "37": {"name": "波浪特別警報", "severity": 4},
    "07": {"name": "波浪警報", "severity": 3},
    "16": {"name": "波浪注意報", "severity": 2},
    "14": {"name": "雷注意報", "severity": 1},
}


def lname(tag: str) -> str:
    return tag.rsplit("}", 1)[-1] if "}" in tag else tag


def children(el, name: str):
    return [x for x in list(el) if lname(x.tag) == name]


def child(el, name: str):
    for x in list(el):
        if lname(x.tag) == name:
            return x
    return None


def text_of(el, name: str) -> str | None:
    x = child(el, name)
    if x is None or x.text is None:
        return None
    s = x.text.strip()
    return s or None


def first_text(root, name: str) -> str | None:
    for x in root.iter():
        if lname(x.tag) == name and x.text:
            s = x.text.strip()
            if s:
                return s
    return None


def parse_dt(value: str | None) -> dt.datetime | None:
    if not value:
        return None
    try:
        v = value.replace("Z", "+00:00")
        d = dt.datetime.fromisoformat(v)
        if d.tzinfo is None:
            d = d.replace(tzinfo=JST)
        return d.astimezone(UTC)
    except ValueError:
        return None


def iso_now() -> str:
    return dt.datetime.now(UTC).replace(microsecond=0).isoformat().replace("+00:00", "Z")


def fetch_bytes(url: str) -> tuple[bytes, str]:
    req = urllib.request.Request(
        url,
        headers={"User-Agent": UA, "Cache-Control": "no-cache", "Accept": "application/xml,text/xml,*/*"},
    )
    with urllib.request.urlopen(req, timeout=30) as res:
        return res.read(), res.geturl()


def target_areas() -> dict[str, str]:
    o = json.loads(SPOTS.read_text(encoding="utf-8"))
    out: dict[str, str] = {}
    for spot in o.get("spots", []):
        codes = [str(x) for x in spot.get("jmaWarningAreaCodes", [])]
        names = [str(x) for x in spot.get("jmaWarningAreaNames", [])]
        for i, code in enumerate(codes):
            if not re.fullmatch(r"\d{7}", code):
                continue
            name = names[i] if i < len(names) and names[i] else code
            out.setdefault(code, name)
    if not out:
        raise RuntimeError("no target JMA warning area codes in spots.json")
    return out


def atom_entries(feed_xml: bytes):
    root = ET.fromstring(feed_xml)
    entries = []
    for e in root.iter():
        if lname(e.tag) != "entry":
            continue
        updated = None
        title = ""
        urls = []
        for x in list(e):
            n = lname(x.tag)
            if n == "updated" and x.text:
                updated = parse_dt(x.text.strip())
            elif n == "title" and x.text:
                title = x.text.strip()
            elif n == "id" and x.text:
                urls.append(x.text.strip())
            elif n == "link" and x.attrib.get("href"):
                urls.append(x.attrib["href"].strip())

        # JMA Atom data URLs do not consistently expose the telegram code in
        # the URL. Prefer an explicit VPWS50 URL when present, otherwise use
        # the official entry title for the 2026 aggregate current-state product.
        product_url = next((u for u in urls if re.search(r"(?:_|/)VPWS50(?:_|\\.|$)", u)), None)
        is_aggregate = "集約通報" in title or "集約速報" in title
        if product_url or is_aggregate:
            url = product_url or next((u for u in urls if u.startswith("https://")), None)
            if url:
                entries.append((updated or dt.datetime.min.replace(tzinfo=UTC), url))
    return entries


def latest_product_url() -> tuple[str, dt.datetime]:
    found = []
    errors = []
    for feed in FEEDS:
        try:
            raw, _ = fetch_bytes(feed)
            found.extend(atom_entries(raw))
        except Exception as exc:
            errors.append(f"{feed}: {exc}")
    if not found:
        raise RuntimeError("VPWS50 not found in JMA Pull feed; " + " | ".join(errors))
    found.sort(key=lambda x: x[0], reverse=True)
    return found[0][1], found[0][0]


def parse_vpws50(xml_bytes: bytes, targets: dict[str, str]):
    root = ET.fromstring(xml_bytes)
    control_title = None
    publishing_office = None
    report_dt_s = None

    # Control title / office
    for el in root.iter():
        n = lname(el.tag)
        if n == "Title" and control_title is None and el.text:
            control_title = el.text.strip()
        elif n == "PublishingOffice" and publishing_office is None and el.text:
            publishing_office = el.text.strip()
        elif n == "ReportDateTime" and report_dt_s is None and el.text:
            report_dt_s = el.text.strip()

    report_dt = parse_dt(report_dt_s)
    if report_dt is None:
        raise RuntimeError("VPWS50 ReportDateTime missing/invalid")

    now = dt.datetime.now(UTC)
    age_min = (now - report_dt).total_seconds() / 60
    if age_min < -FUTURE_TOLERANCE_MIN:
        raise RuntimeError(f"VPWS50 future ReportDateTime: {report_dt_s}")
    if age_min > MAX_SOURCE_AGE_MIN:
        raise RuntimeError(f"VPWS50 stale: age={age_min:.1f}min report={report_dt_s}")

    areas = {code: {"name": name, "warnings": []} for code, name in targets.items()}
    matched = set()

    for warning in root.iter():
        if lname(warning.tag) != "Warning":
            continue
        wtype = str(warning.attrib.get("type", ""))
        if "市町村等" not in wtype:
            continue
        for item in children(warning, "Item"):
            area = child(item, "Area")
            if area is None:
                continue
            code = text_of(area, "Code")
            if code not in targets:
                continue
            matched.add(code)
            area_name = text_of(area, "Name") or targets[code]
            current = {}
            for kind in children(item, "Kind"):
                code2 = text_of(kind, "Code")
                name = text_of(kind, "Name")
                status = text_of(kind, "Status") or ""
                if code2 not in TARGET_WARNING_CODES:
                    continue
                # VPWS50 is the current-state aggregate. "解除" is not active.
                if "解除" in status:
                    continue
                meta = TARGET_META[code2]
                current[code2] = {
                    "code": code2,
                    "name": name or meta["name"],
                    "status": status or "発表中",
                    "severity": meta["severity"],
                }
            areas[code] = {
                "name": area_name,
                "warnings": sorted(current.values(), key=lambda x: (-x["severity"], x["code"])),
            }

    missing = sorted(set(targets) - matched)
    if missing:
        raise RuntimeError(f"VPWS50 target coverage incomplete: {len(missing)} missing; first={missing[:10]}")

    return {
        "controlTitle": control_title,
        "publishingOffice": publishing_office,
        "reportDatetime": report_dt_s,
        "areas": areas,
    }


def semantic_view(o: dict) -> dict:
    # generatedAt / Atom updated can change without a meaningful warning-state change.
    return {
        "schemaVersion": o.get("schemaVersion"),
        "source": {
            "product": o.get("source", {}).get("product"),
            "reportDatetime": o.get("source", {}).get("reportDatetime"),
            "entryURL": o.get("source", {}).get("entryURL"),
            "publishingOffice": o.get("source", {}).get("publishingOffice"),
        },
        "areas": o.get("areas"),
        "policy": o.get("policy"),
    }


def main():
    targets = target_areas()
    url, atom_updated = latest_product_url()
    raw, final_url = fetch_bytes(url)
    parsed = parse_vpws50(raw, targets)

    payload = {
        "schemaVersion": 2,
        "generatedAt": iso_now(),
        "source": {
            "agency": "気象庁",
            "kind": "JMA Pull disaster XML",
            "feedURL": FEEDS[0],
            "product": PRODUCT,
            "entryURL": final_url,
            "atomUpdated": atom_updated.astimezone(UTC).replace(microsecond=0).isoformat().replace("+00:00", "Z"),
            "reportDatetime": parsed["reportDatetime"],
            "publishingOffice": parsed["publishingOffice"],
            "controlTitle": parsed["controlTitle"],
        },
        "policy": {
            "officialSourcesOnly": True,
            "aggregateCurrentState": True,
            "targetProducts": ["VPWS50"],
            "clientRelevantWarningCodes": sorted(TARGET_WARNING_CODES),
            "maxSourceAgeMinutes": MAX_SOURCE_AGE_MIN,
            "failClosed": True,
        },
        "targetAreaCount": len(targets),
        "areas": parsed["areas"],
    }

    if OUT.exists():
        try:
            old = json.loads(OUT.read_text(encoding="utf-8"))
            if semantic_view(old) == semantic_view(payload):
                print(f"No semantic warning-state change; source report {parsed['reportDatetime']}")
                return
        except Exception:
            pass

    raw_out = json.dumps(payload, ensure_ascii=False, indent=2, sort_keys=True) + "\n"
    # Write atomically in the Actions workspace.
    tmp = OUT.with_suffix(".json.tmp")
    tmp.write_text(raw_out, encoding="utf-8")
    json.loads(tmp.read_text(encoding="utf-8"))
    tmp.replace(OUT)
    active = sum(1 for a in parsed["areas"].values() if a["warnings"])
    print(
        f"Wrote {OUT}: targets={len(targets)} active_target_areas={active} "
        f"report={parsed['reportDatetime']} source={final_url}"
    )


if __name__ == "__main__":
    main()
