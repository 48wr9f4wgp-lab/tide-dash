# TIDE DASH BASELINE PROMOTION READINESS

Date: 2026-09-29 JST  
Candidate: **v0.20.0-dev.10**  
Decision state: **PROMOTION_READY**  
Current confirmed baseline: **v0.19.4**

## Conclusion

The candidate is ready for an explicit promotion decision **for the verified large-widget scope**.

No remaining item is a Hard Blocker for promoting the verified scope because:
- the primary large Home Screen information is readable on-device;
- the candidate has survived real-device normal rendering, network loss, stale-cache disclosure, and network recovery;
- the dev.6 timeout regression was removed and has not recurred on dev.7-dev.10;
- abnormal automated tests cover missing/invalid forecast, tide, cache, snapshot, and location-resolution states;
- recovery paths remain available.

Promotion should record the intentionally unverified scope below instead of pretending it was tested.

## Exact artifact

- version: 0.20.0-dev.10
- source commit: bf5e3249c21fe05d8d7358efc48fd62d4056d1ce
- Git blob: 99500300173aabc2e67430435d85dc917a29589f
- SHA256: 189e6b432c2539dfb35a26eec5118d06b6056873bf053d4f1ab5dae1ae29cfeb
- manifest candidate URL is pinned to the immutable source commit
- stable recovery: v0.12.0
- existing confirmed baseline before promotion: v0.19.4

## Promotion scope supported by evidence

### Real iPhone
PASS:
- large normal Home Screen rendering
- field-readable tide / next event / wind / wave / rain layout
- graph current/high-low/sunrise-sunset marker readability
- Detail summary and full evidence path
- airplane-mode fallback using bounded saved forecast
- explicit old-forecast warning
- network recovery after airplane mode and Scriptable restart
- no dev.6 timeout recurrence on dev.7-dev.10

### Automated
PASS:
- exact deployed-artifact identity
- abnormal-state suite: 22/22 in Asia/Tokyo
- abnormal-state suite: 22/22 in UTC
- abnormal-state suite: 22/22 in America/Los_Angeles
- weather-only / marine-only failure
- no fabricated zero wind/wave
- stale-cache expiry
- coordinate isolation
- corrupt-cache rejection
- cache-write failure disclosure
- tide gaps / total tide failure
- no gap-bridged next event
- far / previous / missing location blocking
- snapshot failure / corruption
- Detail without provider refetch
- fixed-location entry
- finite graph geometry

## Intentionally unverified / non-blocking gaps

These must remain explicit if the candidate is promoted:
- native location-permission-denied flow was not manually exercised on dev.10
- small face was not newly revalidated on real iPhone after dev.10
- medium face was not newly revalidated on real iPhone after dev.10
- long-duration iOS background refresh cadence was not measured
- outdoor direct-sunlight accessibility was not formally tested
- battery / thermal profiling was not performed

Rationale for non-blocking classification:
- current acceptance target is the large Home Screen widget;
- small/medium/latest-location-failure paths are covered by automated checks or inherited code paths but are not claimed as device-verified;
- background cadence, sunlight, battery, and thermal behavior are quality/operational observations, not demonstrated blockers for the verified large interactive scope;
- promotion records verified scope, not universal perfection.

## Promotion action

An explicit promotion should:
1. replace the confirmed baseline record with the exact dev.10 artifact;
2. preserve the intentionally unverified list above;
3. keep stable recovery v0.12.0;
4. keep release status separate (no App Store / external release implication);
5. archive the old v0.19.4 baseline inside the new baseline record as the previous confirmed baseline;
6. not change app code or manifest merely to record the baseline state.

Until that state change, v0.19.4 remains the confirmed VERIFIED_BASELINE.
