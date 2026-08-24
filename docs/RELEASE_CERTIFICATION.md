# MathLab v2.0.0 — Stable Release Certification Record

## STABLE RELEASE GATE

**Release: `v2.0.0`.**

MathLab v2.0.0 has passed the source, browser, GitHub Pages and live custom-domain release gates. This record remains exact-head based: any source, test, workflow, dependency, service-worker, UI-version or certification-document change requires a fresh complete gate before that newer head inherits the certification.

The post-v2 accessibility/device hardening layer is additive. It does not change the mathematical release identity or invent a new E-series phase.

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

## Automated source, browser, accessibility and device gates

The exact certified head must pass all of the following:

1. `npm run audit:release`;
2. `npm run audit:e12`;
3. `npm run audit:stable`;
4. `npm run audit:accessibility`;
5. dependency installation under Node 22;
6. generated-lockfile `npm audit --audit-level=high` security gate;
7. all Vitest regression tests;
8. strict TypeScript compilation;
9. Vite production build;
10. fixed 22-domain score/status invariants;
11. 22-domain cumulative golden corpus;
12. tool/catalog/capability/control consistency;
13. explicit exactness-provenance checks;
14. PWA/security/persistence static contracts;
15. Playwright Chromium desktop smoke;
16. Playwright Firefox desktop smoke;
17. Playwright WebKit desktop smoke;
18. Android-like Chromium phone emulation;
19. iOS-like WebKit phone emulation;
20. Android-like Chromium tablet emulation;
21. iPad-like WebKit tablet emulation;
22. 320 / 375 / 768 / 1024 / 1440 responsive-width overflow checks;
23. 320 CSS-pixel + 200% root-text reflow check;
24. keyboard command-palette and focus restoration checks;
25. first-focus skip-link ordering and visible focus indication;
26. automated axe-core WCAG A/AA scans across every primary route;
27. `prefers-reduced-motion` behavior;
28. forced-colors/high-contrast focus behavior;
29. portrait/landscape checks across every touch project;
30. WCAG 2.2 24 CSS-pixel minimum target-size checks for primary touch controls;
31. real Worker-backed mathematical execution;
32. IndexedDB save → reload persistence;
33. manifest/start-url/scope/icon/maskable-icon installability source contract;
34. active service-worker registration;
35. installed service-worker offline application reload.

The exact CI log is authoritative for current test totals. Historical pre-promotion totals remain historical evidence rather than being rewritten after new regression tests are added.

The GitHub Pages deployment workflow repeats the stable and accessibility audits, dependency security gate, full unit suite, production build, and complete browser/accessibility matrix before publishing `main`. After deployment, a separate live suite verifies the custom domain and emits the `mathlab-production` commit status.

## Live production evidence

The stable production gate separately verifies the deployed `https://thiepn.dev/mathlab/` build rather than assuming a successful source build equals a successful deployment.

It checks:

- primary route resolution;
- stable v2 identity;
- published manifest, icons and service worker;
- Worker-backed exact mathematics;
- IndexedDB persistence across a real production reload;
- page-level horizontal overflow;
- deployed offline reload behavior;
- Chromium and iOS-like WebKit production paths.

A deployment is accepted only after the exact merged `main` SHA receives `mathlab-production: success`.

## Browser/device evidence boundary

The automated browser matrix executes real Chromium, Firefox and WebKit engines. Its Android, iOS and tablet projects configure mobile/touch browser emulation; they are **not physical hardware**.

Axe-core is an automated accessibility regression tool. Zero configured axe violations is useful evidence, but it is **not full WCAG conformance** and **not screen-reader certification**.

Accordingly, this certification does **not** claim direct physical-device testing. Physical Android Chrome, physical iPhone/iPad Safari, installed-PWA behavior on target hardware, VoiceOver, TalkBack, NVDA and physical Windows High Contrast remain external validation items recorded in `ACCESSIBILITY_DEVICE_CERTIFICATION.md`.

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

The dependency audit currently reports one **low-severity** `esbuild` development-server advisory. The gate rejects high and critical advisories. MathLab is a static production build and does not expose the Vite/esbuild development server as the deployed application.

The Vite build also reports the existing >500 kB minified chunk warning. This is a performance-maintenance issue, not a correctness failure, and remains a candidate for post-v2 code splitting.

## Merge and deployment policy

Only an exact branch head with a clean complete gate may be squash-merged into `main`. The merge must use the tested expected-head SHA so branch drift cannot be silently accepted.

After merge, GitHub Pages must rebuild from that `main` SHA and the live custom-domain suite must return `mathlab-production: success` before the newer head is treated as production-certified.
