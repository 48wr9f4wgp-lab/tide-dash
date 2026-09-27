# TIDE DASH delivery workflow

Scope: Scriptable iPhone Home Screen widget only. Not FISH TARGET or App Store submission.

## Normal updates

Use the existing loader -> main.js -> manifest.json -> candidate app path. Do not require the user to download/import a separate .js file for ordinary approved updates.

Before switching the manifest, verify the current repository head, preserve intervening changes, rerun the relevant regression tests, compare the candidate Git blob against the tested local artifact, and prepare a pinned previous-version rollback manifest. Keep stable recovery and existing location preferences intact.

Pin candidateURL to an immutable source commit, not a moving working branch. Moving main must be a non-force fast-forward. Do not replace VERIFIED_BASELINE merely because delivery succeeds.

User authorization is scoped to the requested build and existing widget delivery action. This workflow is not blanket authorization for future publication, contracts, costs, or data deletion.

## On-device verification

Delivery confirmed, code/runtime checks passed, and actual device behavior are different states. Record real iPhone results only after observing them. No guarantee of immediate Home Screen redraw: the refresh schedule is controlled partly by iOS.

A separate preview is optional when device verification or an incompatible migration genuinely needs isolation, not the routine path forced on the user. If a preview is needed, prefer a reachable remote channel over manual file imports when feasible.

## Recovery

The unchanged runtime retains stable v0.12.0 and last-successful-code recovery. A manual rollback to the previous v0.19.4 candidate is prepared in deployments/rollback-v0.19.4.json. Recovery to old code also restores old functional/data limitations; it must not be presented as retaining the new evidence-first fixes.
