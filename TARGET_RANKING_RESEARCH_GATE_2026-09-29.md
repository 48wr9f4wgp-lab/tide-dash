# TIDE DASH Target Ranking Research Gate — 2026-09-29

## Completed

- Phase-1 evidence profiles completed for:
  - マアジ
  - サバ類
  - イワシ類
  - ブリ系
  - サワラ / サゴシ
  - シーバス
  - ヒラメ
  - マゴチ
  - カサゴ
  - メバル類
  - アオリイカ

- Current official regional source layer created for:
  - Niigata / central Sea of Japan
  - Ibaraki / Pacific
  - Shizuoka / Izu-Pacific

## Guardrails discovered during research

1. A species can be regionally present without enough evidence for an environmental ranking bonus.
2. Surface SST must not be substituted for bottom temperature in flounder evidence.
3. Juvenile sea-bass tide/light ecology must not be treated as adult recreational catchability.
4. Mebaru and kasago cannot share one generic thermal score.
5. Commercial landings and fisheries forecasts are presence/abundance signals, not recreational catch probability.
6. Official forecasts can disagree by species group; sardine and anchovy must be separated when the outlook differs.
7. A transferred SST range may support habitat compatibility but should receive a geography penalty.
8. UNKNOWN is a valid output and should not be forced into a score.

## Offline ranking rule v1

No numeric "bite score".

For a location/date:
1. Filter species by official regional presence signal where available.
2. Apply seasonality only from region-compatible sources.
3. Apply environmental factors only when the species profile permits that factor.
4. Penalize transferred geography/gear/life-stage evidence.
5. Sort by evidence tier and freshness, then by number of independent supportive blocks.
6. Output confidence A/B/C and top 1–2 reasons.
7. If no species reaches minimum B evidence, show "公的根拠が不足" instead of inventing top targets.

## Test cases

### Kashiwazaki / Niigata / 2026-09-29 / SST 25.4C

Expected:
- Do not produce an A-confidence target from current data.
- Aji / yellowtail / sawara may remain candidates at C until a fresh Niigata species signal is parsed.
- Mackerel can use western-Sea-of-Japan signal only with transfer penalty.
- SST 25.4C must not automatically boost every pelagic species.
- Flounder surface SST is not used as bottom-temperature match.
- "Large tide" does not add generic points.

Result: PASS by design.

### Ibaraki / Sep 2026

Expected:
- Mackerel receives a negative/low current regional signal from FRA.
- Anchovy and sardine are not merged into one positive/negative "iwashi" score because outlooks differ.
- A current Ibaraki weekly bulletin can later override/strengthen a broader FRA signal when species details are parsed.

Result: PASS by design.

### Shizuoka / Sep 2026

Expected:
- Mackerel low current signal.
- Sardine below-prior signal.
- Aori squid may appear only as low-confidence seasonal candidate until a fresh 2026 abundance signal exists.
- No tide/lunar bonus without species-specific source.

Result: PASS by design.

## Gate status

**RESEARCH GATE: PASS for architecture and evidence schema.**

**UI/RUNTIME GATE: HOLD.**

Reason:
The current Niigata layer is not yet fresh enough at species level to support a useful "top 3" at Kashiwazaki with confidence B or higher. The correct next step is to parse the 2026 Niigata forecast/landing detail or another current official Niigata species signal, not to lower the evidence threshold.
