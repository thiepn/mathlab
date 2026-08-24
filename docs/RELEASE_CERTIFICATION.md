# MathLab v2.0.0 — Stable Release Certification Record

## STABLE RELEASE GATE

**Target release: `v2.0.0`.**

This record is valid only for the exact Git head that passes the complete `Check MathLab` workflow after the stable identity is present. Any source, test, workflow, dependency, service-worker, UI-version, or documentation change after that green run invalidates the certification and requires a fresh exact-head run.

Stable promotion is authorized only when that final exact-head workflow is green and contains no browser-test retry/flaky result.

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

The stable release therefore represents a broad university-mathematics environment. It does **not** claim comprehensive coverage of mathematics.

## Stable automated source and browser gates

The exact stable head must pass all of the following before merge:

1. `npm run audit:release`;
2. `npm run audit:e12`;
3. `npm run audit:stable`;
4. dependency installation under Node 22;
5. generated-lockfile `npm audit --audit-level=high` security gate;
6. all Vitest regression tests;
7. strict TypeScript compilation;
8. Vite production build;
9. fixed 22-domain score/status invariants;
10. 22-domain cumulative golden corpus;
11. tool/catalog/capability/control consistency;
12. explicit exactness-provenance checks;
13. PWA/security/persistence static contracts;
14. Playwright Chromium desktop smoke;
15. Playwright Firefox desktop smoke;
16. Playwright WebKit desktop smoke;
17. Android-like Chromium mobile emulation;
18. iOS-like WebKit mobile emulation;
19. 320 / 375 / 768 / 1024 / 1440 responsive-width overflow checks;
20. keyboard command-palette and focus restoration checks;
21. skip-link and primary-input keyboard semantics;
22. real Worker-backed mathematical execution;
23. IndexedDB save → reload persistence;
24. installed service-worker offline application reload.

The final pre-promotion RC run demonstrated **45/45 Vitest files, 432/432 tests**, strict TypeScript, a successful Vite production build, and a clean browser run of **26 passed / 14 intentionally skipped / 0 flaky** after the persistence timing check was hardened.

The final stable `2.0.0` head must repeat that entire gate. The GitHub Pages deployment workflow also repeats the stable audit, dependency security gate, full unit suite, production build, and cross-browser Playwright suite before publishing `main`.

## Browser/device evidence boundary

The automated browser matrix executes real Chromium, Firefox and WebKit engines. The Android and iOS projects are browser/device emulations, not physical hardware.

Accordingly, this certification does **not** claim direct physical-device testing. Physical Android Chrome, physical iOS Safari, installed-PWA behavior on target hardware, and target screen-reader spot checks remain **post-release physical-device validation** items. They are useful compatibility evidence but are not falsely represented as completed by CI.

## Release identity

Stable identity is locked consistently across the release contracts:

- package: `2.0.0`;
- UI badge: `v2.0`;
- E12 target: `2.0.0`;
- P15 release audit: stable-only;
- E12 audit: stable-only;
- stable audit: stable-only;
- service-worker caches: `mathlab-v2-shell` and `mathlab-v2-runtime`.

No RC label may remain in the user-facing release identity.

## Known non-blocking observations

The dependency audit currently reports one **low-severity** `esbuild` development-server advisory. The stable gate rejects high and critical advisories. MathLab is a static production build and does not expose the Vite/esbuild development server as the deployed application.

The Vite build also reports the existing >500 kB minified chunk warning. This is a performance-maintenance issue, not a correctness failure, and remains a candidate for post-v2 code splitting.

## Merge and deployment policy

Only the exact stable branch head with a clean full gate may be squash-merged into `main`. The merge must use the expected tested head SHA so branch drift cannot be silently accepted.

After merge, GitHub Pages must rebuild from `main` and pass the production deployment gate before the deployment is treated as the live stable release. Production verification then checks the deployed site separately from source certification.
