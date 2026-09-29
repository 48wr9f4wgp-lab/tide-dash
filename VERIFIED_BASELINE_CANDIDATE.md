# TIDE DASH VERIFIED BASELINE CANDIDATE

Recorded at: **2026-09-29 JST**  
Candidate version: **v0.20.0-dev.18**  
State: **VERIFIED_BASELINE_CANDIDATE**  
Current confirmed VERIFIED_BASELINE: **v0.20.0-dev.10**  
Stable recovery: **v0.12.0**  
Release status: **Not released / no RELEASE_APPROVAL**

## 1. Immutable app artifact

- App source commit: `fa7292f48fc02c35ccdea1cbb12d03dfec954da7`
- App Git blob: `caf605f7d746a93b500dcc9cb3f233aa60a8affd`
- App SHA256: `c15a85e29a2ed516580c1bab452e109ae1471ccf528ed502c83f2d432691122b`
- Candidate URL is pinned to the immutable source commit above.
- Runtime/bootstrap remains the existing `main.js`.

The app artifact is immutable for this candidate. Future app-code changes start a new WORKING_HEAD.

## 2. Auto-update pipeline snapshot

The live fishery data is intentionally **mutable** and is not treated as a fixed app artifact.

Pipeline state recorded at candidate fixation:
- workflow: `.github/workflows/update-live-signals.yml`
  - Git blob: `f20378eb047a2123d5350b546d1ba8158fabf3c2`
- updater: `scripts/update_live_signals.py`
  - Git blob: `c00fa8e611dbad8930db14adff74a6bcca94f094`
- regional prior schema: `regional_target_priors_v3.json`
  - Git blob: `23a51c462a0a7875057b305e0ff52e0e47b60e4f`
- species evidence: `fish_species_evidence_v2.json`
  - Git blob: `4ed73be17150b1982480db1843035827e385ffa6`
- Niigata historical prior: `historical_target_priors_v1.json`
  - Git blob: `ede36fee8359c5339701d2637278a5699a9877f7`
- live JSON snapshot at fixation: `live_regional_signals.json`
  - Git blob: `a4f66c92159c137bfb96174c818b771087e27f4c`
  - generatedAt: `2026-09-29T07:25:08+00:00`

The baseline candidate verifies the **pipeline semantics, source policy, freshness rules and fallbacks**, not the exact future contents of the mutable live JSON.

## 3. Verified device scope — PASS

### Large field view
Real iPhone validation confirms:
- tide state / next high-low / graph
- tide-cycle label
- wind / direction / gust
- significant wave height / direction / mean period
- sea-surface temperature
- rain
- sunrise / sunset
- no recurrence of the dev.6 timeout architecture

### Evidence-backed target suggestions
Native validation confirms:
- Ibaraki / Otsu: `ヒラメB・イナダB・サワラC`
- East Izu / Ito static prior: `ソウダB・カマスB・サバB`
- East Izu live auto-update: `ソウダA・カマスA・サバA`

### Auto-update end-to-end
Real iPhone validation confirms the complete path:

`official source -> GitHub Actions -> live_regional_signals.json -> Scriptable -> target rank -> saved snapshot -> Full Evidence`

Observed live transition:
- dev.16/static: `ソウダB・カマスB・サバB`
- dev.17/18 live: `ソウダA・カマスA・サバA`

Native Full Evidence confirms:
- heading: `狙い目（自動更新）`
- per-species live source month / tonnage
- basis: auto-updated official set-net evidence
- official source URL
- live JSON/cache state
- commercial catch is not converted into recreational catch probability
- A/B/C confidence definitions

### Snapshot integrity
PASS:
- Detail summary retains the exact target result and field values from the widget display time.
- Full Evidence uses the saved snapshot rather than silently replacing it with a newer live packet.

## 4. Verified automated scope — PASS

### dev.17 auto-update consumer
**28/28 targeted checks PASS**, including:
- syntax
- graph byte-identical to dev.16
- small/medium forecast branches byte-identical
- official-only live payload validation
- 2-hour app-side live cache
- 7-day last-known-good live fallback
- 10-second bounded live request
- Shizuoka live A path with <=62-day freshness bound
- Niigata live reinforcement only with <=45-day freshness
- stale Niigata signal not applied
- Ibaraki bait context updates without rank boost
- live state in Full Evidence
- live fetch parallel with weather/marine
- snapshot retains live packet
- Detail does not refetch live data
- no generic tide/lunar bonus
- dev.6 heavy renderer remains absent

### dev.18 wording-only fix
**14/14 targeted checks PASS**.

Compared with dev.17, only four source lines changed:
1. source header
2. version
3. live/static evidence-label variable
4. Full Evidence heading

Ranking, updater, cache/fallback, tide and marine/weather logic are unchanged.

### Updater pipeline
GitHub Actions execution was observed successful after source-adapter hardening.

The live JSON successfully contained:
- `IBARAKI_PACIFIC`
- `NIIGATA_JAPAN_SEA`
- `SHIZUOKA_EAST_IZU`

The source adapters are fail-closed: one source parse failure does not erase other valid regions.

## 5. Evidence semantics

- A = compatible fresh official species signal
- B = official multi-year / regional prior as primary evidence
- C = transferred or supporting evidence only

Hard rules:
- no absolute recreational catch probability
- no generic spring/neap tide bonus
- no generic lunar bonus
- commercial landing/set-net data is regional presence evidence, not direct shore-angling success
- Ibaraki shirasu is context only and does not boost rank
- Niigata stale live signal is ignored for rank reinforcement
- East-Izu set-net numbers are not silently transferred to south/west Izu or Numazu

## 6. Accepted unverified scope / waivers

The following are **not claimed as native PASS for dev.18**:

- Niigata target-ranking Large/Detail native revalidation after target feature addition
- Niigata live A-reinforcement native path; current detected source was too old to qualify
- Ibaraki live-bait JSON refresh observed on-device after dev.17
- live JSON network-failure -> 7-day fallback path on a real device
- static `狙い目（過去傾向）` heading re-check on dev.18 native device
- small Home Screen face native revalidation after dev.10
- medium Home Screen face native revalidation after dev.10
- native location-permission-denied flow
- long-duration iOS background refresh cadence
- long-duration GitHub scheduled-run reliability beyond observed successful runs
- future resilience to arbitrary upstream HTML/PDF format changes
- formal outdoor direct-sunlight accessibility
- battery / thermal profiling

These are scope boundaries, not implied failures.

## 7. Recovery

- Current confirmed VERIFIED_BASELINE remains **v0.20.0-dev.10**.
- Immediate candidate rollback remains **v0.20.0-dev.17** via `deployments/rollback-v0.20.0-dev.17.json`.
- Stable recovery remains **v0.12.0**.
- The live-data consumer itself falls back:
  1. current live JSON
  2. last valid live cache for up to 7 days
  3. static regional prior / evidence logic

## 8. Promotion rule

This candidate is **not yet the confirmed VERIFIED_BASELINE**.

Promotion requires a separate explicit state change that:
- preserves this exact app artifact identity;
- records the verified device/automated scope;
- preserves the accepted waivers;
- explicitly records the mutable auto-update pipeline as a behavioral dependency;
- keeps RELEASE_APPROVAL separate.

Do not infer promotion from deployment, successful updater runs, or UI acceptance.
