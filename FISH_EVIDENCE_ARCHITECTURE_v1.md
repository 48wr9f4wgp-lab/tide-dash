# TIDE DASH — Fish Evidence Architecture v1

Date: 2026-09-29 JST
Status: RESEARCH BASELINE
Runtime target: Scriptable iPhone large widget

## Core rule

The widget must never invent a generic "fish are biting" score.

The recommendation pipeline is:

current location + date/time + tide/weather/marine conditions
→ regional candidate fish
→ evidence-supported condition match
→ relative target ranking
→ reasons + confidence + source references

No absolute catch probability unless a validated model directly predicts probability for the matching species/region/gear.

## Runtime architecture

Do NOT parse scientific PDFs or prefectural bulletins on the iPhone.

Use two lightweight, versioned JSON layers:

### 1. species_evidence.json
Durable biological / catchability evidence:
- species id and names
- habitat / seasonal facts
- supported environmental variables
- evidence type
- directness
- geography
- gear/context
- source date
- source URL
- transfer limitations
- allowed ranking use

### 2. regional_signal.json
Fresh operational presence signals derived from official public sources:
- region
- species
- observed/forecast period
- signal: present / increasing / decreasing / unknown
- source type
- published date
- expiry
- source URL
- interpretation limits

The Scriptable runtime only fetches JSON and current environmental data.

## Source hierarchy

A. direct recreational angling catch/CPUE for same species and context
A/B. official current regional fishery/landing/forecast signal
B. official stock/resource assessment or long-term landings
B/C. species-specific peer-reviewed environmental ecology
C. community/social/tackle-shop reports only as corroboration

## Current official operational source registry

### Niigata / Sea of Japan

- Niigata Fisheries and Marine Research Institute — 2026 water-temperature information
  - updated 2026-09-16
  - monthly surface/depth-temperature products
  - https://www.pref.niigata.lg.jp/site/suisan-kenkyu/2026kaikyou.html

- Niigata Fisheries and Marine Research Institute — landing information
  - monthly by major district / fishery type
  - https://www.pref.niigata.lg.jp/site/suisan-kenkyu/mizuage.html

- Niigata major-species trend report
  - includes Japanese jack mackerel, mackerels, sardine, yellowtail, bluefin tuna, common squid, Japanese Spanish mackerel, flounder and others
  - https://www.pref.niigata.lg.jp/site/suisan-kenkyu/gyokakudoko.html

- Niigata yellowtail information
  - Sado winter yellowtail landings
  - https://www.pref.niigata.lg.jp/site/suisan-kenkyu/buri.html

- FRA Japan Sea fishing-ground/ocean-condition bulletin
  - surface/50/100/200 m temperature
  - https://www.fra.go.jp/shigen/marine_environment/js_sokuho/index.html

### Ibaraki / Pacific

- Ibaraki Fisheries Experimental Station weekly fishing/ocean bulletin
  - weekly Friday publication
  - latest source page updated 2026-09-25
  - https://www.pref.ibaraki.jp/nourinsuisan/suishi/gyogyo/data/gyokaikyo/08nendogyokaisokuhou.html

- Ibaraki fisheries station operational sources
  - daily SST satellite imagery
  - fixed-site water temperature
  - weekly fisheries information
  - https://www.pref.ibaraki.jp/nourinsuisan/suishi/

### Shizuoka / Pacific-Izu

- Shizuoka Fisheries and Marine Technology Research Institute — 23 major species resource/ecology profiles
  - 2026 update set includes sardines, mackerels, flounder, horse mackerel, yellowtail, etc.
  - https://fish-exp.pref.shizuoka.jp/02fishery/2-5.html

- Izu branch — bigfin reef squid ecology/resource management
  - spawning season reported as May–July in the cited Izu market work
  - https://fish-exp.pref.shizuoka.jp/izu/0005/08aori.html

## Species evidence profiles — phase 1

### MA_AJI — マアジ / Trachurus japonicus

Current supported ranking inputs:
- region/season presence: YES, official regional reports/landings
- SST/thermal context: YES, but use as ecological compatibility, not direct bite probability
- tide/lunar: NO generic effect
- dawn/dusk: insufficient direct same-species evidence
- wind/wave: insufficient direct same-species evidence

Evidence:
1. Takahashi et al. 2021, Fisheries Oceanography
   - southwestern Sea of Japan juvenile growth/recruitment
   - warmer ambient conditions in the eastern survey area correlated with faster juvenile growth and abundance
   - directness: ecological/recruitment, not angling catchability
   - use: medium-strength thermal compatibility / year-class context only
   - https://consensus.app/papers/linking-environmental-drivers-juvenile-growth-and-takahashi-sassa/62f21a52e4b35923b55699157c38198b/

2. Niigata official major-species trends / landings
   - use: regional presence and seasonal background
   - do not treat commercial landings as recreational success probability

Rule:
- SST may modify ranking only after current regional presence is established.
- Do not award a generic "warm water bonus".

### BURI — ブリ系 / Seriola quinqueradiata

Current supported ranking inputs:
- region/season presence: YES, official Niigata/FRA reports
- migration/thermal context: YES qualitatively
- tide/lunar: NO generic effect
- dawn/dusk: insufficient direct same-species evidence

Evidence:
1. Furukawa et al. 2020, Marine Ecology Progress Series
   - archival-tag study in northeastern Japan Sea
   - adult yellowtail moved north in early summer, resided north through mid-fall, then moved south in late October
   - fish primarily occupied the surface mixed layer and avoided cold offshore water during southward movement
   - directness: movement/habitat, not shore angling catchability
   - https://consensus.app/papers/horizontal-and-vertical-movement-of-yellowtails-seriola-furukawa-kozuka/2ed9c3b5f1455493bfc3942cbea67b13/

2. Niigata yellowtail information / FRA Japan Sea forecasts
   - use: current/seasonal presence signal

Rule:
- regional-current presence signal dominates.
- SST is supporting context, not a fixed optimal range unless a matching regional model is sourced.

### SAWARA — サワラ / サゴシ / Scomberomorus niphonius

Current supported ranking inputs:
- region/season presence: YES via Niigata official species trends / landings
- broad environmental distribution: PARTIAL
- current SST threshold: NOT YET LOCKED
- tide/lunar: NO generic effect

Evidence:
1. Ohshimo et al. 2021, Regional Studies in Marine Science
   - distribution and relative abundance across Yellow Sea, East China Sea, Sea of Japan
   - abstract unavailable in current research record, so no environmental threshold is adopted yet
   - https://consensus.app/papers/fluctuations-in-distribution-and-relative-abundance-of-ohshimo-muko/3c19ed5d5d175acc9c84163d4195b3d0/

2. Niigata major-species trends / landings
   - use: regional presence/background

Rule:
- rank from regional presence/season first.
- do not invent a temperature optimum until a usable study is sourced.

### HIRAME — ヒラメ / Paralichthys olivaceus

Current supported ranking inputs:
- regional presence: YES via prefectural resource information
- depth/bottom-temperature context: YES
- surface SST as direct proxy: NO
- tide/lunar: NO generic effect

Evidence:
1. Kurita et al. 2021, Fisheries Science
   - Pacific coast of northeastern Japan
   - adult flounder mainly <100 m depth; seasonal extension deeper in winter
   - experienced approximately 4.6–21.0°C in the study
   - study variable is habitat/bottom temperature, not shore surface SST
   - https://consensus.app/papers/seasonal-changes-in-depth-and-temperature-of-habitat-for-kurita-sakuma/b2c8afbfc1c15c568c54a6300de51dfa/

2. Shizuoka / Niigata official species information
   - use: regional presence and broad seasonality

Rule:
- do NOT directly score the widget's surface SST against bottom-temperature ranges.
- future ranking needs shore/depth/habitat context or stronger shore-catch evidence.

### AO_RI_IKA — アオリイカ / Sepioteuthis lessoniana complex

Current supported ranking inputs:
- season/life-history: YES
- water-temperature/recruitment context: YES
- immediate bite probability from SST: NO
- tide/lunar: not yet supported for ranking

Evidence:
1. Shizuoka Izu branch
   - local study reports spawning season May–July
   - juveniles of that year's cohort reach about 13 cm by October in the cited market observations
   - use: strong local seasonal/life-history context
   - https://fish-exp.pref.shizuoka.jp/izu/0005/08aori.html

2. Ueta, Tokai & Segawa 1999, Fisheries Science
   - Tokushima year-class landings related to 10 m water temperature and salinity during Apr–Sep
   - high temperature + high salinity associated with successful recruitment in that study
   - directness: year-class abundance, not same-day angling catchability
   - https://consensus.app/papers/relationship-between-yearclass-abundance-of-the-oval-ueta-tokai/712d27d1806a5a34a3a0ec933a60ba8f/

Rule:
- use season/local presence strongly.
- use SST only as low/medium supporting context.
- never convert the recruitment regression into same-day catch probability.

## Species still requiring stronger evidence before ranking

- SABA — サバ類
- IWASHI — イワシ類
- SEABASS — シーバス
- MAGOCHI — マゴチ
- ROCKFISH — メバル / カサゴ

These may still appear as regional candidates once an official current signal exists, but environmental bonuses/penalties remain UNKNOWN until claim-source mapping is completed.

## General environmental evidence

- Olds et al. 2017, Fish and Fisheries review:
  surf-zone fish assemblages vary with water temperature and wave climate.
  This supports keeping SST/wave variables visible, but does NOT justify species-specific ranking by itself.
  https://consensus.app/papers/the-ecology-of-fish-in-the-surf-zones-of-ocean-beaches-a-olds-vargas-fonseca/45292e8225565a7eb66bd1170e7340b3/

- Brodie et al. 2015, Fisheries Oceanography:
  SST and other oceanographic variables were significant predictors in recreational-fisheries habitat models for pelagic species.
  This supports the architecture of species-specific models, not a universal SST rule.
  https://consensus.app/papers/modelling-the-oceanic-habitats-of-two-pelagic-species-brodie-hobday/a4dea958414e5ab4842452cb7e94faf2/

## Ranking blocks v1

For each species:
- presence_current: official regional signal, highest weight
- seasonality: official / peer-reviewed
- thermal_match: only when species-specific and context-compatible
- light_match: only with direct species-specific evidence
- tide_match: only with direct species-specific evidence
- lunar_match: only with direct species-specific evidence
- habitat_match: coast/estuary/surf/rock/depth where available
- freshness: source expiry
- geography_penalty
- gear_penalty
- evidence_confidence

Output:
- rank order
- confidence A/B/C
- strongest 1–2 reasons
- exact source ids
- explicit UNKNOWN where evidence does not support a factor

## Confidence rubric

A:
- current official regional presence + at least one direct/strong species-specific condition signal

B:
- current official presence + seasonal/biological support, but environmental transfer is indirect

C:
- only broad regional/seasonal presence or transferred ecology

Do not render a species as A just because many weak sources agree.

## Next research gate

Before runtime ranking code:
1. complete SABA / IWASHI / SEABASS / MAGOCHI / ROCKFISH profiles;
2. define region map for Niigata / Ibaraki / Shizuoka;
3. build current regional_signal JSON from the latest official bulletins;
4. test rankings for historical/current examples;
5. only then add the "狙い目" UI.
