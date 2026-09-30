# Runtime bootstrap v0.12.0 — prepared, not installed
Date: 2026-10-01 JST
Scope: A03/A04; runtime only. App candidate remains dev.29.

Behavior:
- Compute candidate UTF-8 SHA256 before execution, require manifest hash and APP_VERSION match.
- On candidate transport failure, prefer last-good code only when kind/version/source/current manifest hash match.
- Explicit candidate disabled and rollback manifests cannot reuse a different candidate.
- Hash/version/compile/execute failure uses stable recovery; never executes the rejected fetched code for hash/version failures.
- New last-good metadata includes a content hash; checked before cache execution. Manifest-offline retains legacy last-good compatibility when hash metadata is absent. This is not a signature or manifest authenticity system.
- Stable source/caches keep existing recovery behavior and do not gain candidate hash enforcement.

Tests: node tests/runtime-v012.cjs
13 scenarios PASS: current download, download-only fail, manifest-offline, wrong/missing hash, wrong version, disabled offline, rollback offline, wrong metadata, corrupt cache, candidate throws, stable network unavailable with exact active cache, all paths unavailable error widget.
SHA256 compared with Node crypto: 10 vectors (UTF-8/Japanese/emoji/unpaired surrogates/padding boundaries/100k text), plus actual dev.29 source. Mock tests are not iPhone performance measurements or native acceptance.

Source commit: e1608ff93a724786609b8010b119410b05136ffb
Git blob: 0f1136f04d2af2e200a78726aff52e6311d7c38d
SHA256: 85fc9717319aca090ca1d0b57a5458346272e650c4e07e68f97633aff0dd478e
Prior bootstrap is main.js at b655bdee7392464f1c863662e08d64e0ba7889ff.

Install after repository approval:
1. Keep the existing Scriptable script name so Home Screen routing remains valid.
2. Preserve a copy of its old contents.
3. Replace that script's contents with this runtime main.js, save and run.
4. Verify dev.29 loads and Detail opens. On-device transport-failure/rollback checks remain pending.

Repository main.js is not automatically loaded by the old bootstrap. Repository merge does not install this runtime into the user's Scriptable script. Do not label user runtime ACTIVE until installation is evidenced. Prefer downloading the pinned source above, not mutable main when reproducing this artifact.

IMG_3148.jpeg: native Full Evidence VPWS50/伊東市, report01:30, fetched01:39 cache, no-warning result. Runtime/app version not visible; no dev.29-specific unknown-state PASS inferred.
VERIFIED_BASELINE dev.18 and recovery app v0.12.0 stay unchanged (bootstrap version and recovery app version are different artifacts).
Remaining: A05 future signal validation, A06 schedule operation, A08 workflow noise, A09 duplicate guide declaration, native dev.29 unknown-state scope.
