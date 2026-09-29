# TIDE DASH VERIFIED BASELINE

Verified at: **2026-09-29 JST**  
Version: **v0.20.0-dev.18**  
State: **VERIFIED_BASELINE**  
Previous confirmed baseline: **v0.20.0-dev.10**  
Release status: **Not released / no RELEASE_APPROVAL**  
Stable recovery version: **v0.12.0**

## Exact immutable app artifact

- App source commit: `fa7292f48fc02c35ccdea1cbb12d03dfec954da7`
- App Git blob: `caf605f7d746a93b500dcc9cb3f233aa60a8affd`
- App SHA256: `c15a85e29a2ed516580c1bab452e109ae1471ccf528ed502c83f2d432691122b`
- Manifest candidate URL remains pinned to the immutable source commit above.
- Runtime/bootstrap remains the existing `main.js`.
- Promotion changes baseline state only. App code, candidate source, updater logic and RELEASE_APPROVAL are unchanged.

## Verified scope

This baseline is confirmed for the **large Scriptable iPhone field widget**, its saved evidence flow, and the documented dynamic fishery-signal behavior below.

### Large iPhone field view — PASS

Real-device validation covers:
- tide state and next high/low
- tide graph and current/high-low/sunrise-sunset markers
- tide-cycle label
- wind / direction / gust
- significant wave height / direction / mean period
- sea-surface temperature
- rain
- target-suggestion footer
- no recurrence of the dev.6 heavy-renderer timeout architecture

### Target suggestions — PASS within supported evidence scope

Native evidence includes:
- Ibaraki / Otsu: `ヒラメB・イナダB・サワラC`
- East Izu static prior: `ソウダB・カマスB・サバB`
- East Izu live auto-update: `ソウダA・カマスA・サバA`

Confidence semantics:
- **A** = compatible fresh official species signal
- **B** = official multi-year or regional prior as primary evidence
- **C** = transferred or supporting evidence only

Hard evidence rules:
- no absolute recreational catch probability
- no generic spring/neap tide bonus
- no generic lunar bonus
- commercial landing/set-net data is regional-presence evidence, not direct shore-angling success
- Ibaraki shirasu is context only and does not boost target rank
- stale Niigata live signal is ignored for rank reinforcement
- East-Izu set-net numbers are not silently transferred to south/west Izu or Numazu

### Auto-update end-to-end — PASS

Real-device validation confirms:

`official public source`
→ `GitHub Actions updater`
→ `live_regional_signals.json`
→ `Scriptable live consumer`
→ target rank
→ saved snapshot
→ Full Evidence

Observed live transition:
- static: `ソウダB・カマスB・サバB`
- live: `ソウダA・カマスA・サバA`

Full Evidence native PASS:
- heading `狙い目（自動更新）`
- per-species live source month / tonnage
- auto-updated official evidence basis
- official source URL
- live JSON/cache state
- commercial-catch caveat
- A/B/C confidence definition

### Snapshot integrity — PASS

- Detail summary retains the exact target result and environmental values from widget display time.
- Full Evidence uses the saved snapshot rather than silently replacing it with a newer live packet.

## Auto-update behavioral dependency

The future contents of `live_regional_signals.json` are intentionally **mutable** and are not part of immutable app-artifact identity.

Promotion-time pipeline snapshot:
- workflow `.github/workflows/update-live-signals.yml`
  - Git blob: `f20378eb047a2123d5350b546d1ba8158fabf3c2`
- updater `scripts/update_live_signals.py`
  - Git blob: `c00fa8e611dbad8930db14adff74a6bcca94f094`
- regional prior `regional_target_priors_v3.json`
  - Git blob: `23a51c462a0a7875057b305e0ff52e0e47b60e4f`
- species evidence `fish_species_evidence_v2.json`
  - Git blob: `4ed73be17150b1982480db1843035827e385ffa6`
- Niigata historical prior `historical_target_priors_v1.json`
  - Git blob: `ede36fee8359c5339701d2637278a5699a9877f7`
- observed live JSON snapshot:
  - blob: `a4f66c92159c137bfb96174c818b771087e27f4c`
  - generatedAt: `2026-09-29T07:25:08+00:00`
  - regions: Ibaraki / Niigata / Shizuoka-East-Izu

### Mutable-pipeline governance lock

Allowed inside this VERIFIED_BASELINE without redefining the app artifact:
- new official fishery values flowing through the already-verified adapters and schema;
- target-rank changes caused only by those new official values under the already-verified freshness/confidence rules.

The auto-update scope becomes **WORKING_HEAD and requires revalidation** if any of the following changes:
- workflow behavior
- updater/parser logic
- live JSON schema or policy
- regional-prior logic
- species-evidence logic
- confidence, freshness or ranking semantics

This lock is part of the baseline.

## Automated verification

### dev.17 live consumer
**28/28 targeted checks PASS**.

### dev.18 wording-only change
**14/14 targeted checks PASS**.

Only four source lines changed from dev.17:
1. source header
2. version
3. live/static evidence-label variable
4. Full Evidence heading

Ranking, updater, cache/fallback, tide and weather/marine logic are unchanged.

### Updater pipeline
Observed:
- four consecutive post-hardening updater runs completed successfully;
- live JSON contained all three supported regions;
- source adapters fail closed rather than deleting unrelated valid regions.

## Accepted unverified scope / waivers

The following are intentionally outside this baseline's verified native scope:

- Niigata target-ranking Large/Detail native revalidation after target-feature addition
- Niigata live A-reinforcement native path
- Ibaraki live-bait refresh observed on-device after dev.17
- real-device live-network-failure -> 7-day fallback path
- dev.18 native re-check of static `狙い目（過去傾向）` heading
- small Home Screen native revalidation after dev.10
- medium Home Screen native revalidation after dev.10
- native location-permission-denied flow
- long-duration iOS background refresh cadence
- scheduled GitHub Actions reliability over multiple days/weeks
- arbitrary future upstream HTML/PDF format changes
- formal outdoor direct-sunlight accessibility
- battery / thermal profiling

These are scope boundaries, not implied PASS results.

## Recovery

- Previous confirmed baseline **v0.20.0-dev.10** is archived at `archive/VERIFIED_BASELINE_v0.20.0-dev.10.md`.
- Promotion candidate record is archived at `archive/VERIFIED_BASELINE_CANDIDATE_v0.20.0-dev.18.md`.
- Immediate candidate rollback remains **v0.20.0-dev.17** through `deployments/rollback-v0.20.0-dev.17.json`.
- Stable recovery remains **v0.12.0**.
- Live consumer fallback remains:
  1. current live JSON
  2. last valid live packet up to 7 days
  3. static prior/evidence logic

## Evidence

- `VERIFIED_BASELINE_CANDIDATE.md` — promotion pointer/history
- `archive/VERIFIED_BASELINE_CANDIDATE_v0.20.0-dev.18.md` — frozen pre-promotion candidate record
- `BASELINE_PROMOTION_READINESS.md` — promotion-readiness audit
- `deployments/v0.20.0-dev.18.md` — deployment/native evidence
- `archive/VERIFIED_BASELINE_v0.20.0-dev.10.md` — previous confirmed baseline

## Change policy

Any app-code change after this artifact is **WORKING_HEAD** until the changed scope is revalidated.

For the dynamic auto-update dependency, changes to workflow/updater/schema/prior/evidence/ranking semantics also create WORKING_HEAD even when app code is unchanged.

A successful updater run or new live fishery value does **not** by itself replace or invalidate this VERIFIED_BASELINE.

RELEASE_APPROVAL remains separate.
