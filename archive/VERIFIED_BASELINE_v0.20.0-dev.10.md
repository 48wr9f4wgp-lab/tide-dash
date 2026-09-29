# TIDE DASH VERIFIED BASELINE

Verified at: **2026-09-29 JST**  
Version: **v0.20.0-dev.10**  
State: **VERIFIED_BASELINE**  
Previous confirmed baseline: **v0.19.4**  
Release status: **Not released / no RELEASE_APPROVAL**  
Stable recovery version: **v0.12.0**

## Exact artifact

- App source commit: `bf5e3249c21fe05d8d7358efc48fd62d4056d1ce`
- App Git blob: `99500300173aabc2e67430435d85dc917a29589f`
- App SHA256: `189e6b432c2539dfb35a26eec5118d06b6056873bf053d4f1ab5dae1ae29cfeb`
- Candidate URL in the current manifest is pinned to the immutable source commit above.
- Runtime/bootstrap remains the existing `main.js`.
- Promotion changes baseline state only. App code and manifest were not changed by this promotion.

## Verified scope

This baseline is confirmed for the **large Scriptable iPhone Home Screen widget** and the supporting data/recovery behavior listed below.

### Real iPhone device validation — PASS

- Large normal Home Screen rendering
- Field-readable tide / next event / wind / wave / rain presentation
- Graph marker readability:
  - current time
  - next high/low event markers
  - sunrise/sunset markers
- Detail summary and full evidence flow
- No recurrence of the dev.6 Scriptable timeout on dev.7-dev.10
- Airplane-mode / network-loss fallback
- Explicit stale weather/marine warning on-device
- Network recovery after airplane mode + Scriptable restart
- Stale warning clears after recovery
- Tide / wind / wave / rain return to normal rendering after recovery

### Automated regression / abnormal-state validation — PASS

The exact deployed dev.10 artifact passed **22/22** abnormal-state cases in each of:
- Asia/Tokyo
- UTC
- America/Los_Angeles

Covered:
- bounded forecast fallback: 180 minutes maximum
- weather-only failure
- marine-only failure
- no fabricated zero wind/wave values when data is missing
- coordinate-specific cache isolation
- corrupt forecast cache rejection
- cache-write failure disclosure
- explicit refresh with valid-cache fallback
- missing hourly tide anchors
- segmented graph across tide gaps
- total tide-data failure
- no next-event bridge across missing tide coverage
- far / previous / missing location blocking
- snapshot write failure
- corrupt snapshot rejection
- Detail opening without provider refetch
- fixed-location startup without Location dependency
- finite graph geometry

## Verified data semantics

- Tide is **JMA astronomical tide prediction**, not observed local water level or local current speed.
- Tide "up/down" uses adjacent hourly predicted tide values only.
- If an official high/low occurs within the hour, the face uses turning-period wording rather than claiming instantaneous tide direction.
- Graph high/low markers and labels use official event times.
- Current-time, high/low, sunrise and sunset markers use the same graph time-axis mapping.
- Precipitation is shown as the **preceding one-hour forecast interval**.
- Significant wave height is not presented as maximum wave height.
- Offline saved forecast is explicitly marked as old rather than presented as fresh.

## Accepted unverified scope / waivers

The following were **not newly verified on a real iPhone for dev.10** and are intentionally outside this baseline's device-verified scope:

- native location-permission-denied flow
- small Home Screen face after dev.10
- medium Home Screen face after dev.10
- long-duration iOS background refresh cadence
- formal outdoor direct-sunlight accessibility testing
- battery / thermal profiling

These are recorded waivers, not implied PASS results. Automated coverage exists for location-resolution failure paths, but that does not replace native device evidence.

## Recovery

- Previous confirmed baseline **v0.19.4** is archived at `archive/VERIFIED_BASELINE_v0.19.4.md`.
- Stable recovery remains **v0.12.0**.
- Runtime last-good recovery remains enabled.
- Candidate rollback manifests remain under `deployments/`.
- The dev.6 timeout regression is not part of this baseline and its heavy renderer remains absent.

## Evidence

- `VERIFIED_BASELINE_CANDIDATE.md` — promotion pointer/history
- `BASELINE_PROMOTION_READINESS.md` — pre-promotion readiness decision
- `deployments/v0.20.0-dev.10-abnormal-audit.md` — abnormal-state automated + device evidence
- archived candidate record: `archive/VERIFIED_BASELINE_CANDIDATE_v0.20.0-dev.10.md`

## Change policy

Any change after this artifact is **WORKING_HEAD** until the changed scope is revalidated.

A future push, manifest switch, UI approval, or successful run does **not** automatically replace this VERIFIED_BASELINE.
