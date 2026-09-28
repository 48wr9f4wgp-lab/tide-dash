# TIDE DASH VERIFIED BASELINE CANDIDATE

Recorded at: 2026-09-28 JST  
Candidate version: **v0.20.0-dev.10**  
State: **VERIFIED_BASELINE_CANDIDATE**  
Current confirmed baseline: **v0.19.4**  
Release status: **Not released / no RELEASE_APPROVAL**  
Stable recovery version: **v0.12.0**

## Identity

- App source commit: `bf5e3249c21fe05d8d7358efc48fd62d4056d1ce`
- App Git blob: `99500300173aabc2e67430435d85dc917a29589f`
- App SHA256: `189e6b432c2539dfb35a26eec5118d06b6056873bf053d4f1ab5dae1ae29cfeb`
- Candidate URL is pinned to the immutable source commit above.
- Manifest candidateVersion: `0.20.0-dev.10`
- Runtime/bootstrap remains the existing `main.js`.
- Current confirmed baseline file remains `VERIFIED_BASELINE.md` at v0.19.4.

## Verified scope

### Real iPhone / device evidence

PASS:
- Large Home Screen normal rendering
- Large field-readable layout and graph marker readability
- No recurrence of the dev.6 Scriptable timeout on dev.7-dev.10
- Detail first screen and full evidence navigation
- Airplane-mode / network-loss fallback
- Stale weather/marine forecast warning visible on device
- Network recovery after airplane mode + Scriptable restart
- Stale warning clears after recovery
- Tide / wind / wave / rain return to normal presentation after recovery

### Automated evidence

PASS:
- Exact deployed-artifact identity
- Abnormal-state suite: **22/22** in Asia/Tokyo
- Abnormal-state suite: **22/22** in UTC
- Abnormal-state suite: **22/22** in America/Los_Angeles

Covered by the abnormal-state suite:
- bounded forecast fallback (180 minutes)
- weather-only failure
- marine-only failure
- no fabricated zero values for missing wind/wave
- coordinate-specific cache isolation
- corrupt cache rejection
- cache write failure disclosure
- force-refresh fallback behavior
- missing tide anchors / segmented graph
- total tide failure
- no next-event bridge across missing tide coverage
- far / previous / missing location blocking
- snapshot write failure / corrupt snapshot rejection
- Detail opening without provider refetch
- fixed-location entry without Location dependency
- finite graph geometry

### Data semantics verified

- Tide source is JMA astronomical tide prediction, not observed local water level/current speed.
- Current tide trend is derived only from adjacent hourly predicted tide values.
- A high/low event inside the hour prevents misleading instantaneous "up/down" wording.
- Graph high/low markers and labels use official event times.
- Sunrise/sunset and tide/current markers share the same graph time-axis mapping.
- Precipitation is shown as the preceding one-hour forecast interval.
- Significant wave height remains described in full evidence and is not presented as maximum wave height.
- Saved forecast is explicitly marked as old when used offline.

## Unverified / not promoted scope

The candidate is **not yet the confirmed VERIFIED_BASELINE** because the following are not newly revalidated on dev.10:

- native location-permission-denied flow (automated PASS only)
- small Home Screen face on dev.10 after the latest large-face-only changes
- medium Home Screen face on dev.10 after the latest large-face-only changes
- long-duration iOS background refresh timing
- outdoor direct-sunlight accessibility testing
- broader battery / thermal profiling

These do not invalidate the candidate scope above; they define the boundary of what is actually verified.

## Recovery

- Current confirmed VERIFIED_BASELINE remains v0.19.4.
- Stable recovery remains v0.12.0.
- Runtime last-good recovery remains enabled.
- Immediate candidate rollback is preserved through the manifest rollback records in `deployments/`.

## Promotion rule

Promote this candidate to `VERIFIED_BASELINE` only by explicit state change that records:
- commit / artifact / config
- verified scope
- verified result
- verified_at
- any intentionally waived gaps

Do not infer promotion from the candidate being deployed, pushed, or visually accepted.
