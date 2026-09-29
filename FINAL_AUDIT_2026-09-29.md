# TIDE DASH FINAL AUDIT — 2026-09-29

State: **PASS WITH OPERATIONAL OBSERVATIONS**  
Confirmed baseline: **v0.20.0-dev.18**  
App code changed by this audit: **No**  
RELEASE_APPROVAL changed: **No**

## Final conclusion

The verified large iPhone field widget is operationally complete for the current scope:
- tide / next event / tide-cycle
- wind / gust
- wave height / direction / period
- sea-surface temperature
- rain
- evidence-backed target suggestions
- saved Detail / Full Evidence
- official-source live signal ingestion
- recovery/fallback semantics

No app-code blocker was found.

## Native screenshot audit

Latest observed screen:
- selected spot: 伊東周辺
- phone clock: 19:26
- widget display reference: 18:25
- displayed conditions remained internally coherent
- target footer remained visible: ソウダA / カマスA / サバA
- no clipping, timeout or graph regression visible

Operational observation:
- widget reference time was about 61 minutes behind the phone clock.
- This is consistent with the known iOS/Scriptable background-refresh limitation and remains outside guaranteed cadence.
- The reference timestamp and manual refresh control are visible, so the data age is disclosed rather than hidden.
- Long-duration native background cadence remains a recorded waiver.

## Baseline identity

- version: v0.20.0-dev.18
- source commit: fa7292f48fc02c35ccdea1cbb12d03dfec954da7
- app blob: caf605f7d746a93b500dcc9cb3f233aa60a8affd
- SHA256: c15a85e29a2ed516580c1bab452e109ae1471ccf528ed502c83f2d432691122b

Baseline identity is intact.

## Auto-update pipeline audit

Verified behavior:
- updater logic has completed successfully on push-triggered runs
- live JSON contains Ibaraki, Niigata and East-Izu regions
- app-side live consumer and B -> A transition are device-verified
- Full Evidence retains source / cache state / confidence semantics
- fail-closed and static fallback logic remain in place

Operational observation:
- workflow cron includes four daily schedules: 06:17 / 12:17 / 18:17 / 00:17 JST
- as of the final audit, successful updater runs observed in Actions were push-triggered
- an 18:17 JST schedule-triggered run had not yet appeared by approximately 19:26 JST
- therefore scheduled-run reliability is **not yet considered long-duration verified**
- this is already covered by the baseline waiver for multi-day/week scheduled reliability

This does not invalidate the verified app behavior, but it remains the most important live-operations item to observe.

## Repository hygiene observation

Legacy workflows:
- .github/workflows/patch-candidate-v0119.yml
- .github/workflows/patch-candidate-v0120.yml

are still producing failed runs on normal pushes.

They do not affect the dev.18 runtime or auto-update data path, but they add Actions noise and should be retired separately if no longer needed.

Do not remove them as part of this final audit because that is a repository workflow change outside the verified app artifact.

## Remaining scope boundaries

Not blockers:
- small/medium native revalidation
- native location-permission-denied flow
- Niigata live-A native path
- live-network-failure -> 7-day fallback native exercise
- long-duration iOS background cadence
- long-duration scheduled GitHub Actions reliability
- future upstream HTML/PDF format resilience
- outdoor sunlight accessibility
- battery/thermal profiling

## Next major capability, if development reopens

Official safety layer:
- JMA thunder / lightning
- JMA wave warning/advisory context
- urgent coastal hazard path where technically appropriate

This is intentionally not part of the current baseline and should be a new WORKING_HEAD if implemented.

## Final state

**VERIFIED_BASELINE v0.20.0-dev.18 remains valid.**

The product should now stay in observation/maintenance unless:
- a real-device defect appears,
- scheduled live updater behavior remains absent or fails,
- an upstream source format changes,
- or a new user-requested capability is explicitly opened.
