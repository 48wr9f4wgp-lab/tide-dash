# TIDE DASH MILESTONE CLOSEOUT

Date: 2026-09-29 JST  
Milestone: **Evidence-first + field-readable large Home Screen widget**  
Status: **CLOSED / MAINTENANCE**

## Verified baseline

- Version: **v0.20.0-dev.10**
- App source commit: `bf5e3249c21fe05d8d7358efc48fd62d4056d1ce`
- Git blob: `99500300173aabc2e67430435d85dc917a29589f`
- SHA256: `189e6b432c2539dfb35a26eec5118d06b6056873bf053d4f1ab5dae1ae29cfeb`
- Authority: `VERIFIED_BASELINE.md`
- Stable runtime recovery: **v0.12.0**

## What is frozen

Do not change without a new, concrete user goal or observed defect:
- large-face information hierarchy
- tide/current-event graph semantics
- evidence-first wording policy
- no fishing-success stars/scores
- coordinate-specific forecast cache rules
- 180-minute saved-forecast upper bound
- missing tide-data segmentation
- two-stage Detail evidence flow
- offline stale-data disclosure

## Current working state

There is **no active app-code WORKING_HEAD beyond the verified baseline**.

Repository `main` may advance with documentation/state commits, but those commits do not redefine the app artifact. Any future app-code edit starts a new WORKING_HEAD and must be identified separately from the verified baseline.

## Accepted waivers

Remain outside the device-verified baseline scope:
- native location-permission-denied flow
- small face dev.10 native revalidation
- medium face dev.10 native revalidation
- long-duration iOS background refresh cadence
- formal outdoor direct-sunlight accessibility
- battery / thermal profiling

These are not active blockers and should not trigger work unless the user asks, a real defect appears, or a future change touches the relevant scope.

## Reopen triggers

Reopen development only when at least one applies:
1. real-device defect or misleading data presentation is observed;
2. the user requests a specific new capability;
3. JMA/Open-Meteo/Scriptable behavior changes materially;
4. a waiver becomes important to the actual use case;
5. a future code change requires regression against this baseline.

## Next-state rule

Until a reopen trigger exists:
- keep dev.10 as VERIFIED_BASELINE;
- do not polish for its own sake;
- do not revive rejected scoring/peak concepts;
- treat field observations as evidence before modifying code;
- retain rollback and stable recovery.

This closeout is a maintenance-state record, not release approval.
