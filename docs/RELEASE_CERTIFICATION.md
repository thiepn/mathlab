# MathLab v2.1.0 — Release Promotion Certification Record

## STABLE RELEASE GATE

**Product release: `v2.1.0`.**

MathLab v2.1.0 is the product-release promotion for the completed post-v2 P0–P9 sequence. The exact source head is eligible for stable promotion only after all source/browser gates pass, it is merged to `main`, GitHub Pages deploys that exact merge SHA, and the independent custom-domain verifier reports `mathlab-production: success`.

This promotion does **not** rewrite the E-series history. E12 remains the frozen mathematical-certification baseline for the v2 engine at `v2.0.0`; v2.1.0 packages later product-shell, worksheet, interaction, learning, exploration, Wirtschaftsmathematik, sharing, accessibility/device and architecture work on top of that certified mathematical baseline.

## Included post-v2 product work

v2.1.0 incorporates the completed post-v2 sequence:

- P0 — integrity repair;
- P1 — product-shell consolidation;
- P2 — persistent mathematical worksheet and recovery;
- P3 — structured/mobile mathematical input;
- P4 — unified capability registry;
- P5 — Learning v2;
- P6 — dynamic exploration;
- P7 — Wirtschaftsmathematik expansion;
- P8 — immutable local-first sharing and explicit recipient copy;
- P9 — route splitting, atomic cross-tab persistence, storage health, build-scoped PWA caches and bundle budgets.

The mathematical breadth score remains the E12 fixed-rubric result: **66/100** breadth and **66/100** implemented-domain maturity, with 9 strong, 11 partial, 2 narrow and 0 comprehensive domains.

## Exact-head automated gate

The promotion candidate must pass:

1. `npm run audit:release`;
2. `npm run audit:e12` for the frozen mathematical baseline;
3. `npm run audit:stable`;
4. `npm run audit:accessibility`;
5. P2–P9 dedicated product audits;
6. `npm ci` under Node 22;
7. `npm audit --audit-level=high`;
8. the full Vitest regression suite;
9. strict TypeScript compilation;
10. Vite production build;
11. the production bundle-budget audit;
12. real Chromium, Firefox and WebKit browser certification;
13. Android/iOS phone emulation and Android/iPad tablet emulation;
14. responsive/reflow, keyboard/focus, axe A/AA, reduced-motion, forced-colors and touch-target checks;
15. Worker-backed mathematics;
16. IndexedDB persistence/recovery;
17. installed service-worker offline reload;
18. P9 lazy-route, storage-health and build-scoped-cache certification.

The CI log for the exact candidate head is authoritative for current test totals.

## Product release identity

The current product identity is locked consistently as:

- package: `2.1.0`;
- UI badge: `v2.1`;
- UI title: `MathLab v2.1.0 stable release`;
- local fallback build identity: `local-v2.1.0`;
- deployed service-worker generation: `mathlab-build-<commit>-shell` and `mathlab-build-<commit>-runtime`.

The service worker no longer uses the old fixed `mathlab-v2-*` cache generation. P9 scopes caches to the deployed build identity and deletes obsolete MathLab generations on activation.

## Mathematical-certification identity

The product version and the mathematical-certification baseline are intentionally separate concepts.

- `src/app/e12Certification.ts` remains locked to `E12_TARGET_VERSION = '2.0.0'`.
- The unchanged M7/E12 22-domain rubric remains the mathematical evidence baseline.
- Product releases after v2.0 may improve UX, learning, applied workflows, persistence, sharing, performance or architecture without pretending that the original E12 mathematical audit happened at a later version.
- Any future material mathematical expansion must receive its own explicit evidence rather than silently relabeling E12.

## Live production gate

After merge, GitHub Pages rebuilds from the exact `main` SHA. A separate live suite targets `https://thiepn.dev/mathlab/` and verifies:

- the v2.1 product identity;
- all primary routes;
- published manifest/icons and build-scoped service worker;
- exact Worker-backed mathematics;
- live IndexedDB persistence;
- no page-level horizontal overflow;
- deployed offline reload;
- Chromium and iOS-like WebKit production paths;
- commit-scoped service-worker registration.

The release is considered production-certified only when that exact merged SHA receives `mathlab-production: success`.

The deployment pipeline now records a `mathlab-production: pending` status before its build starts and publishes a terminal success/failure status through an unconditional aggregate status job. Failed or skipped build, Pages deploy, or live verification stages therefore produce an explicit failure instead of leaving a commit with no result. The existing live browser verifier remains mandatory for success.

An earlier merged SHA without a terminal production status must not inherit certification merely because its PR gate was green.

## Accessibility and device evidence boundary

The automated matrix uses real browser engines and touch/mobile emulation, but it is not physical-device or screen-reader certification.

Physical Android/iPhone/iPad behavior, installed-PWA behavior on target hardware, VoiceOver, TalkBack, NVDA and physical Windows High Contrast remain external evidence items in `ACCESSIBILITY_DEVICE_CERTIFICATION.md`. Those rows must not be marked passed without real evidence.

## Merge policy

Only an exact branch head with a clean complete PR gate may be merged. The merge must use the tested expected-head SHA. Any source change after a successful gate requires a fresh gate.

After merge, the release is not complete until the custom-domain production status is successful.
