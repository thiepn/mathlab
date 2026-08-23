# MathLab v2.0.0-rc.1 — E12 Release Certification Record

## Decision

**`v2.0.0-rc.1` source release candidate: CERTIFIABLE after the final exact-head E12 CI gate.**

**Stable `v2.0.0`: NOT CERTIFIED.**

E12 is the final P/M/E integration pass. The repository now has real dependency-backed GitHub CI and a deployed GitHub Pages workflow, so the old v1-era record about unavailable npm/GitHub infrastructure is obsolete.

## Mathematical evidence

E12 re-runs the unchanged M7 22-domain rubric against the actual E1–E11 implementation.

Current result:

- breadth: **66/100**;
- implemented-domain maturity: **66/100**;
- 9 strong domains;
- 11 partial domains;
- 2 narrow domains;
- 0 missing/incidental domains;
- 0 comprehensive domains.

See `E12_MATHEMATICAL_REAUDIT.md`.

The release candidate therefore represents a broad university-mathematics environment, not a claim of comprehensive mathematics coverage.

## E12 automated source gates

The promotion branch must pass all of the following on the **same exact head SHA** before merge:

1. `npm run audit:release`
2. `npm run audit:e12`
3. dependency installation under Node 22
4. complete `npm run test`
5. strict TypeScript through `npm run build`
6. Vite production build
7. fixed 22-domain score/status invariants
8. 22-domain cumulative golden corpus
9. tool/catalog/capability/control consistency
10. explicit exactness-provenance checks
11. inherited P15 static PWA/security/persistence contracts

The pre-promotion E12 implementation already demonstrated **45/45 test files and 432/432 tests** plus strict TypeScript and a successful production build before the RC identity/docs/workflow promotion. The final promoted head receives the same full gate again before merge.

## Release-candidate identity

The E12 candidate is intentionally prerelease-only:

- package: `2.0.0-rc.1`
- UI badge: `v2.0 RC1`
- stable `2.0.0` is rejected by the release/certification policy at this stage.

## External stable-release gates

Repository CI cannot honestly certify real interaction on every target browser/device. Stable `v2.0.0` remains blocked until actual deployed evidence covers:

1. current Chromium desktop smoke test;
2. current Firefox desktop smoke test;
3. Android Chrome smoke test;
4. iOS Safari/WebKit smoke test;
5. PWA install from the real deployment path;
6. installed/offline reload and return-online refresh;
7. service-worker upgrade behavior;
8. migration from a real existing browser workspace/practice state;
9. keyboard-only navigation and dialogs;
10. screen-reader spot checks for navigation, math input/results, Proof Lab and Practice status;
11. visual regression at representative phone/tablet/desktop widths;
12. dependency-advisory review appropriate to the final stable release.

Until those gates are actually run, **do not tag or describe the product as stable `v2.0.0`**.

## Known non-blocking observations

Current CI installation reports one low-severity npm advisory. The Vite build also reports the existing >500 kB minified chunk warning. Neither currently violates the automated RC gate, but both remain valid performance/security-maintenance items for stable-release hardening.

## Merge policy

Only the exact E12 branch head that passes both audits, the complete test suite, strict TypeScript and Vite production build may be merged. Any source or documentation change after a green gate invalidates that certification and requires a fresh run.
