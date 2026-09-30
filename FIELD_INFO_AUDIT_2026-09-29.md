# TIDE DASH field-information audit

Date: 2026-09-29 JST
Context: shore / pier / rock fishing large Home Screen widget
Decision basis: immediate field actionability + evidence quality + display cost

## Keep on the large face

### Tide state / next high-low / tide cycle
Reason:
- already core to the product;
- directly affects water level and access/timing context;
- tide-cycle label is descriptive astronomy only, not a catch score.

### Wind speed / direction / gust
Reason:
- changes casting, line control and shore comfort/safety;
- already supplied by the weather model;
- gust remains explicitly model forecast, not observation.

### Significant wave height / direction / mean period
Reason:
- height alone is insufficient;
- direction changes how a coast/harbour receives waves;
- period materially changes coastal behaviour.

JMA wave guidance notes that long-period swell can grow at shallow coasts and affect coastal leisure even when offshore height is modest:
- https://www.jma.go.jp/jma/kishou/know/expert/pdf/r7_text/r7_harouyosoku-jirei.pdf
- https://www.data.jma.go.jp/kaiyou/db/wave/comment/elmknwl.html

### Sea-surface temperature
Decision: **show on the large face**.

Reason:
- water temperature is a fundamental species/habitat variable;
- FRA routinely publishes surface and subsurface temperature fields as fishery/ocean-condition information;
- recreational-fisheries habitat models also use SST as a predictor.

Official Japanese operational context:
- https://www.fra.go.jp/shigen/marine_environment/js_sokuho/index.html
- https://fra-roms.fra.go.jp/

Peer-reviewed context:
- Olds et al. 2017, Fish and Fisheries: surf-zone assemblages vary with water temperature and wave climate.
- Brodie et al. 2015, Fisheries Oceanography: SST and oceanographic covariates were significant in recreational-fisheries habitat models for pelagic species.

Caveat:
- Open-Meteo SST is modelled sea-surface temperature close to the surface, not a sensor reading at the angler's feet.

### Rain
Decision updated 2026-09-30: **remove preceding-hour rain from the Large face; retain in Detail / Full Evidence**.

Reason:
- the Large face is a glance surface for immediate field decisions;
- the currently available value is the preceding-hour accumulation, so it is backward-looking at glance time;
- its incremental value is lower than tide / wind / wave / SST / official safety information on the constrained Large face;
- runoff / turbidity context may still matter, so the value remains available in Detail / Full Evidence rather than being discarded.

## Fetch and retain in Detail, but do not permanently occupy the face

### Primary swell height / direction / period / peak period
Decision: **fetch and show in Detail**.

Reason:
- JMA explicitly warns that long-period swell can become dangerous at shallow coasts;
- important for shore/pier/rock fishing;
- always showing a second wave family would overcrowd the main face.

Open-Meteo Marine officially exposes:
- swell_wave_height
- swell_wave_direction
- swell_wave_period
- swell_wave_peak_period
- wave_peak_period

Source:
- https://open-meteo.com/en/docs/marine-weather-api

Future UI option:
- conditionally surface official wave/swell warnings rather than inventing local danger thresholds.

### Broad ocean-current model
Decision: **Detail only**.

Reason:
- potentially useful for species models;
- Open-Meteo states tides/currents are around 8 km model resolution and coastal accuracy is limited;
- not suitable for coastal navigation.

Therefore the face must not imply the displayed current is the actual harbour/rock-edge flow.

## Do not add as permanent face fields

### Barometric pressure
- common fishing lore exists, but species-general causal use is not strong enough for a permanent field;
- may be used later only when a species-specific evidence profile supports it.

### Air temperature
- useful for personal comfort, but low incremental fishing-decision value relative to scarce face space;
- already available from the weather payload.

### Generic moon-phase / solunar score
- not used;
- lunar effects are species- and gear-dependent in the literature;
- tide-cycle label remains descriptive, not a catch bonus.

### Model sea-level height
- not used because JMA astronomical tide remains the product's primary tide source;
- avoids mixing incompatible datums and model sea level with the tide table.

## Conditional safety layer: next priority

The next safety feature should be **official hazard information**, not an internally invented safety score.

Priority candidates:
1. JMA thunder nowcast / lightning activity
2. JMA wave warning/advisory context
3. tsunami / urgent coastal warning path where technically appropriate

JMA thunder nowcast:
- 1 km grid
- updated every 10 minutes
- forecasts 10–60 minutes ahead
- https://www.jma.go.jp/jma/kishou/know/toppuu/thunder2-1.html

JMA high-wave guidance explicitly warns people not to approach the coast when wave warnings/advisories are issued:
- https://www.jma.go.jp/jma/kishou/know/ame_chuui/ame_chuui_p7.html

## dev.13 face decision

Large face:
- wind: speed + direction + gust
- wave: significant height + direction + mean period
- sea-surface temperature
- existing tide / tide-cycle / solar markers
- preceding-hour rain removed from face on 2026-09-30

Detail:
- all Large-face information
- preceding-hour rain
- wave peak period
- primary swell height / direction / mean period / peak period
- broad current model with coastal-accuracy caveat

Not added:
- pressure
- generic fish-activity score
- current on face
- air temperature on face
