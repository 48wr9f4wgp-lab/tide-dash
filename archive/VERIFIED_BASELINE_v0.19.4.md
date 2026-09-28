# TIDE DASH VERIFIED BASELINE

Verified at: 2026-09-27  
Version: **v0.19.4**  
State: **VERIFIED_BASELINE**  
Release status: **Not released / no RELEASE_APPROVAL**  
Stable recovery version: **v0.12.0**

## Baseline scope

This baseline covers the Scriptable iPhone widget implementation and its runtime/recovery path.

### Visual QA passed on device
- Large normal state
- Medium normal state
- Small normal state
- Far AUTO / unconfirmed fishing location
- Marine-only failure
- Stale weather/marine data
- Weather/marine total failure with tide-only fallback
- Tide-data failure

### Functional / static regression
- Final regression: **29 / 29 PASS**
- Candidate, runtime bootstrap, and loader syntax: PASS
- Current candidate enabled by manifest: v0.19.4
- Stable remains v0.12.0
- Last-good runtime recovery retained

## Location data

- Curated fishing areas: **60**
- Nationwide fishing-port catalog: **2,896**
- JMA tide-station catalog: **239**
- Fishing-port browser supports keyword search and region -> prefecture -> paged port selection.
- Fixed fishing spots disclose the JMA tide reference and distance.
- Tide-reference distance display:
  - <30 km: normal
  - 30-49 km: reference/caution
  - >=50 km: warning/reference

## Data trust rules

- Far AUTO / previous location / missing location: fishing judgment data is blocked.
- Weather/marine fallback cache is bounded to 180 minutes.
- Remote payloads are validated before replacing known-good cache.
- Sunrise/sunset are matched to the requested date.
- Marine-only failure is surfaced independently.
- Missing future tide coverage is not extrapolated as a flat tide.
- Opportunity scoring is disabled outside valid tide-data coverage.

## Recovery

- Loader caches bootstrap only after successful execution.
- Runtime keeps a last-successful app cache.
- Stable v0.12.0 remains the explicit recovery baseline and has not been promoted or replaced.

## Known caveats

- The nationwide fishing-port position catalog is based on MLIT C09 **2006** data and is for location search/reference only.
- Current port names, boundaries, access, fishing permission, and restrictions are not guaranteed by that catalog.
- Local rules and current official restrictions take precedence.
- Tide data is predicted astronomical tide from the linked JMA tide reference, not observed local water level or local current speed.

## Change policy

Changes after v0.19.4 are WORKING_HEAD until they pass regression/device validation and are explicitly adopted as a new VERIFIED_BASELINE.
