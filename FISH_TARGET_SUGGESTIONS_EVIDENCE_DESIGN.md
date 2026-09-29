# TIDE DASH — Evidence-backed Target Suggestions

Date: 2026-09-29 JST
State: DESIGN LOCK / RESEARCH-FIRST
Current candidate: v0.20.0-dev.12
Verified baseline: v0.20.0-dev.10

## Product direction

Invert the recommendation flow.

Do NOT ask the user to choose a fish first and then score conditions.

Instead:
1. read the current fishing spot and current environmental conditions;
2. generate a candidate set of fish species plausible for that place and season;
3. rank the candidates by source-backed evidence that the current conditions match known catchability / availability conditions;
4. show the top targets with compact reasons and source confidence;
5. let Detail expose the exact evidence and citations.

The output is a relative target recommendation, not an absolute catch probability.

## Required output

Large widget or Detail should eventually show something like:

狙い目
1. アジ        根拠 A
2. サゴシ      根拠 B
3. シーバス    根拠 B

Each fish must expose:
- why it is currently ranked;
- which conditions matched;
- which source(s) support the claim;
- source date / geography / species / gear context;
- whether the evidence is direct recreational catch data, commercial landing/presence data, or ecological research.

Do not show a fish as recommended when the only support is generic fishing lore.

## Evidence hierarchy

### Tier A — direct angling/catch evidence
Preferred when available:
- MAFF / Fisheries Agency recreational catch surveys
- official prefectural recreational-fishery surveys
- peer-reviewed angling catch / CPUE studies for the same or closely matching species, gear and environment

Use for:
- species catchability
- month/season
- diel/light conditions
- tide/lunar effects only when species-specific evidence exists

### Tier A/B — current official fishery presence / local fishery reports
Examples:
- prefectural fisheries research institute weekly/seasonal fishing-condition bulletins
- current official landing information
- FRA fishery forecasts

Use as evidence of:
- regional presence
- seasonal run timing
- current abundance trend

Important: commercial landings are NOT direct recreational-angling success and must never be described as such.

### Tier B — official long-term production / distribution
Examples:
- e-Stat Marine Fishery Production Statistics
- official prefectural species assessments
- FRA stock/resource assessments

Use for:
- regional species presence
- broad seasonality
- longer-term abundance background

Do not use raw landing tonnage as a direct "bite probability".

### Tier B/C — peer-reviewed environmental ecology
Use species-specific studies for:
- SST / temperature
- light / dawn-dusk
- wind
- wave regime
- tide stage
- lunar phase
- habitat / depth

Only transfer findings when species, habitat, geography and gear are reasonably compatible.
Record transfer limitations.

### Tier C / corroboration only
- user-generated catch apps
- tackle-shop reports
- social media
- personal logs

Can corroborate a recommendation but must not be the primary evidence unless explicitly labeled as low-confidence anecdotal/current signal.

## Primary Japanese sources identified

1. MAFF recreational catch survey
   - angling-specific
   - monthly species catch for charter/recreational vessels
   - approximately every five years
   - broad sea-area granularity
   - published caveat: prefecture/species and monthly tables can have large estimation variance
   - https://www.maff.go.jp/j/tokei/kouhyou/yugyo_horyo/

2. e-Stat Marine Fishery Production Statistics
   - official annual fishery production
   - species by prefecture / municipality / fishery type
   - useful for regional presence and long-term background
   - not a direct angling-catchability measure
   - https://www.e-stat.go.jp/stat-search/files?collect_area=100&toukei=00500216

3. Fisheries Research and Education Agency (FRA)
   - fishery/ocean condition forecasts
   - current/seasonal fisheries forecasts for squid, sardine, horse mackerel, mackerel, yellowtail etc.
   - official ocean-temperature analysis
   - https://www.fra.go.jp/shigen/fisheries_resources/forecast/gyokyouyoho_enngann_okiai.html
   - https://www.fra.go.jp/shigen/marine_environment/js_sokuho/index.html

4. Niigata Prefectural Fisheries and Marine Research Institute
   - water temperature
   - landing information
   - fishery forecasts / juvenile surveys
   - yellowtail and major-species trends
   - directly useful for Sea of Japan / Niigata operational context
   - https://www.pref.niigata.lg.jp/site/suisan-kenkyu/

5. Ibaraki Prefectural Fisheries Experiment Station
   - weekly fishery/ocean-condition bulletin
   - current water temperature and fisheries information
   - https://www.pref.ibaraki.jp/nourinsuisan/suishi/gyogyo/data/gyokaikyo/08nendogyokaisokuhou.html

6. Shizuoka Prefectural Fisheries and Marine Technology Research Institute
   - official resource/ecology summaries for 23 major species including horse mackerel, yellowtail, flounder, sea bream, hairtail
   - https://fish-exp.pref.shizuoka.jp/02fishery/2-5.html

## Peer-reviewed caution examples

- Lunar effects differ by species and gear. Pulver 2017 found lunar effects for some reef-fish species but not others.
- Environmental effects on catchability are species-specific; angler/gear variables can be stronger than weather variables.
- Near-real-time catchability models can work when they are trained for a particular species and region with appropriate environmental data.

Therefore:
- no global "大潮 bonus";
- no global "morning bonus";
- no global "good weather bonus";
- each feature contributes only when species-specific evidence supports it.

## Ranking model

Do not expose a fake probability.

Internally compute an evidence-weighted relative rank from independent evidence blocks:

A. current/recent regional presence
B. seasonal availability
C. current environmental match
D. time-of-day/light match
E. tide/lunar match only when supported
F. source quality and geographic transfer penalty
G. data freshness

Each block returns:
- support: positive / neutral / negative / unknown
- strength: high / medium / low
- source_id
- scope match: exact / regional / transferred

The final UI should show:
- target order;
- confidence: A / B / C;
- 1–2 strongest reasons;
- no numeric catch probability unless a future validated model directly predicts one.

## Initial candidate species set

Build species evidence profiles first for common shore-accessible targets:
- マアジ
- サバ類
- イワシ類
- ブリ系（ワカシ / イナダ / ワラサ）
- サワラ / サゴシ
- シーバス
- ヒラメ
- マゴチ
- メバル / カサゴ
- アオリイカ

Species should be added only after a source profile is created.

## Next implementation gate

Before app code:
1. build the source/evidence profile for each initial species;
2. record exact claim -> source mapping;
3. define geography and gear transfer rules;
4. test the ranking offline on known date/location examples;
5. only then add UI.

Do not implement a generic scoring formula first and retrofit citations later.
