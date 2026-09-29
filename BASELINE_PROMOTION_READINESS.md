# TIDE DASH BASELINE PROMOTION READINESS

Date: **2026-09-29 JST**  
Candidate: **v0.20.0-dev.18**  
Decision state: **PROMOTION_READY**  
Current confirmed VERIFIED_BASELINE: **v0.20.0-dev.10**  
Release status: **Not released / no RELEASE_APPROVAL**

## Conclusion

No remaining item is a Hard Blocker for promoting **the verified dev.18 scope**.

The candidate is promotion-ready because:
- the exact app artifact is pinned and matches the currently deployed candidate;
- the large iPhone field view, target suggestions, saved summary and Full Evidence paths have real-device evidence;
- the official-source auto-update path has been observed end-to-end on-device;
- GitHub Actions successfully generated all three supported live regions;
- live source adapters fail closed;
- stale/fallback behavior is bounded in code;
- ranking semantics do not claim absolute recreational catch probability;
- recovery paths remain available.

Promotion must preserve the explicit waivers and the mutable-pipeline governance lock below.

## Exact immutable app artifact

- version: **0.20.0-dev.18**
- source commit: `fa7292f48fc02c35ccdea1cbb12d03dfec954da7`
- Git blob: `caf605f7d746a93b500dcc9cb3f233aa60a8affd`
- SHA256: `c15a85e29a2ed516580c1bab452e109ae1471ccf528ed502c83f2d432691122b`
- manifest candidate URL is pinned to the immutable source commit
- stable recovery: **v0.12.0**

Identity audit PASS:
- current `app-candidate.js` blob matches the pinned candidate blob.

## Auto-update behavioral dependency

Pipeline snapshot verified for this candidate:
- workflow `.github/workflows/update-live-signals.yml`
  - blob: `f20378eb047a2123d5350b546d1ba8158fabf3c2`
- updater `scripts/update_live_signals.py`
  - blob: `c00fa8e611dbad8930db14adff74a6bcca94f094`
- regional prior schema
  - `regional_target_priors_v3.json`
  - blob: `23a51c462a0a7875057b305e0ff52e0e47b60e4f`
- species evidence
  - `fish_species_evidence_v2.json`
  - blob: `4ed73be17150b1982480db1843035827e385ffa6`
- Niigata historical prior
  - `historical_target_priors_v1.json`
  - blob: `ede36fee8359c5339701d2637278a5699a9877f7`

Live JSON snapshot observed during verification:
- `live_regional_signals.json`
- blob: `a4f66c92159c137bfb96174c818b771087e27f4c`
- generatedAt: `2026-09-29T07:25:08+00:00`
- regions:
  - `IBARAKI_PACIFIC`
  - `NIIGATA_JAPAN_SEA`
  - `SHIZUOKA_EAST_IZU`

Recent observed updater runs:
- four consecutive push-triggered runs completed successfully after adapter hardening.

### Mutable-pipeline governance lock

The **future contents of live_regional_signals.json are intentionally mutable** and are not frozen by the baseline.

Allowed without creating a new app artifact:
- new official fishery values flowing through the already-verified schema and source adapters;
- changes in ranking caused only by those new official values and existing freshness/confidence rules.

Requires WORKING_HEAD + revalidation before the auto-update scope can again be called VERIFIED:
- workflow behavior changes;
- updater/parser logic changes;
- live JSON schema/policy changes;
- regional-prior rule changes;
- species-evidence rule changes;
- confidence/freshness/ranking semantics changes.

This is the key condition that makes a dynamic-data baseline auditable.

## Promotion scope supported by evidence

### Large iPhone field view — PASS

Real-device validation covers:
- tide state / next high-low / tide graph
- high/low/current/solar graph markers
- tide-cycle label
- wind / direction / gust
- significant wave height / direction / mean period
- sea-surface temperature
- rain
- target-suggestion footer
- no recurrence of the dev.6 heavy-renderer timeout path

### Target suggestions — PASS within supported evidence scope

Real-device evidence:
- Ibaraki / Otsu: `ヒラメB・イナダB・サワラC`
- East Izu static prior: `ソウダB・カマスB・サバB`
- East Izu live signal: `ソウダA・カマスA・サバA`

Full Evidence PASS:
- target order and confidence
- per-species reason
- official source URL
- commercial-catch caveat
- A/B/C definition
- live/static evidence label

### Auto-update end-to-end — PASS

Observed native path:

`official public source`
→ `GitHub Actions updater`
→ `live_regional_signals.json`
→ `Scriptable live consumer`
→ `B -> A rank transition`
→ `saved snapshot`
→ `Full Evidence`

The Full Evidence heading was corrected in dev.18 and confirmed natively as:
- live: `狙い目（自動更新）`

### Snapshot integrity — PASS

- saved summary retained the exact target result and environmental values from display time;
- Full Evidence retained the same live packet and did not silently refetch/replace it.

## Automated evidence

### dev.17 live consumer
**28/28 targeted checks PASS**.

Covered:
- syntax
- graph unchanged
- small/medium forecast branches unchanged
- official-only payload validation
- 2-hour live cache
- 7-day last-known-good live fallback
- 10-second request bound
- Shizuoka live A freshness rule
- Niigata 45-day reinforcement freshness rule
- stale Niigata signal not applied
- Ibaraki bait context not scored
- live status in evidence
- parallel weather/live fetch
- snapshot live packet retention
- Detail no-refetch behavior
- no generic tide/lunar bonus
- dev.6 heavy renderer absent

### dev.18 wording-only change
**14/14 targeted checks PASS**.

Compared with dev.17, only four source lines changed:
- source header
- version
- live/static evidence-label variable
- Full Evidence heading

Ranking, auto-update, cache/fallback, tide and weather/marine logic are unchanged.

## Hard-blocker audit

### Artifact drift
**PASS / no blocker**
- app blob matches the pinned candidate artifact.

### Known user-visible defect
**PASS / no blocker**
- the dev.17 live/static heading mismatch is resolved and confirmed on-device.

### Auto-update generation
**PASS / no blocker**
- all three supported regions were generated in live JSON after adapter hardening.

### Dynamic-source safety
**PASS / no blocker**
- source adapters are fail-closed;
- app live request is bounded;
- last-known-good cache is bounded;
- static prior fallback remains.

### Evidence integrity
**PASS / no blocker**
- commercial fishery data is not labelled as recreational catch probability;
- generic tide/lunar bonuses remain absent;
- confidence semantics are explicit.

### Recovery
**PASS / no blocker**
- immediate candidate rollback: **v0.20.0-dev.17**
- confirmed baseline recovery: **v0.20.0-dev.10**
- stable recovery: **v0.12.0**
- live consumer fallback:
  1. current live JSON
  2. last valid live packet up to 7 days
  3. static prior

## Intentionally unverified / non-blocking waivers

These remain outside the verified dev.18 scope:

- Niigata target-ranking Large/Detail native revalidation after target feature addition
- Niigata live A-reinforcement native path
- Ibaraki live-bait refresh observed on-device after dev.17
- real-device live-network-failure -> 7-day fallback path
- dev.18 native re-check of the static `狙い目（過去傾向）` heading
- small Home Screen native revalidation after dev.10
- medium Home Screen native revalidation after dev.10
- native location-permission-denied flow
- long-duration iOS background refresh cadence
- scheduled GitHub Actions reliability over multiple days/weeks
- arbitrary future upstream HTML/PDF format changes
- formal outdoor direct-sunlight accessibility
- battery / thermal profiling

Why these are non-blocking:
- promotion records a bounded verified scope rather than universal coverage;
- the primary large field view and live East-Izu E2E path are natively verified;
- missing native paths either retain automated/static coverage or have explicit fallback behavior;
- future source-format resilience is an operational dependency, not something that can be proven once forever.

## Promotion action

An explicit promotion should:

1. set **v0.20.0-dev.18** as the confirmed VERIFIED_BASELINE;
2. preserve the exact app artifact identity above;
3. archive the current dev.10 baseline;
4. preserve all waivers above;
5. record the mutable-pipeline governance lock;
6. record the verified workflow/updater blobs as the promotion-time pipeline snapshot;
7. keep live JSON itself mutable and outside immutable artifact identity;
8. keep stable recovery **v0.12.0**;
9. keep RELEASE_APPROVAL separate;
10. not change app code merely to record the baseline state.

Until that explicit promotion state change, **v0.20.0-dev.10 remains the confirmed VERIFIED_BASELINE**.
