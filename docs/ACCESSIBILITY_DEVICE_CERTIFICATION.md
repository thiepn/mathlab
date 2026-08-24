# MathLab v2 — Accessibility & Device Certification

## Automated certification boundary

This layer strengthens the stable v2 release gate with deterministic accessibility, reflow, preference, touch-device and PWA checks. It is additive to the existing mathematical, persistence, browser-engine and production verification gates.

The automated gate certifies the following on the exact tested Git head:

- axe-core automated WCAG A/AA analysis on Workspace, Tools, Visualize, Proof Lab, Practice and Reference;
- keyboard-first skip-link order and visible focus indication;
- 320 CSS-pixel viewport reflow with 200% root text sizing and no page-level horizontal scrolling;
- `prefers-reduced-motion: reduce` behavior, including disabling smooth scrolling and long motion timings;
- Windows forced-colors/high-contrast media behavior with visible keyboard focus;
- Chromium desktop, Firefox desktop and WebKit desktop regression coverage;
- Android-like Chromium phone emulation;
- iOS-like WebKit phone emulation;
- Android-like Chromium tablet emulation;
- iPad-like WebKit tablet emulation;
- portrait and landscape overflow/usability checks for every touch project;
- WCAG 2.2 24 CSS-pixel minimum target-size checks for primary touch controls;
- manifest identity, standalone display mode, start URL/scope, 192/512 icons and maskable icon;
- successful service-worker registration/activation in the production-mode preview;
- the existing installed service-worker offline reload and IndexedDB persistence checks.

Automated axe analysis is a useful regression gate, but it cannot prove full WCAG conformance. Browser/device emulation is not physical-device certification, and automated accessibility analysis is not screen-reader certification.

## CI enforcement

`npm run audit:accessibility` statically verifies that the accessibility/device contracts remain wired into the repository. Both pull-request CI and the GitHub Pages deployment build execute that audit before publishing.

`npm run test:e2e` executes the behavioral checks using the real Chromium, Firefox and WebKit engines provided by Playwright. Device projects configure touch/mobile viewports and browser engines; they do not claim to be the corresponding physical products.

Any product, CSS, test, dependency, workflow or release-documentation change invalidates the previous exact-head evidence and requires a fresh complete gate.

## Physical-device and assistive-technology validation

The following checks require external hardware or real assistive-technology environments and therefore remain deliberately outside CI. Completion must be recorded with device/OS/browser or AT version, date, evidence and pass/fail result.

| Validation target | Required evidence | Status |
|---|---|---|
| Physical Android phone — Chrome | workspace, math execution, portrait/landscape, virtual keyboard, touch navigation, offline reload | External manual validation required |
| Physical iPhone — Safari | workspace, math execution, safe-area behavior, portrait/landscape, virtual keyboard, touch navigation, offline reload | External manual validation required |
| Physical iPad — Safari | tablet layout, portrait/landscape, touch/keyboard interaction, offline reload | External manual validation required |
| Installed Android PWA | add/install, standalone launch, offline relaunch, upgrade after new deployment | External manual validation required |
| Installed iOS/iPadOS web app | Add to Home Screen, standalone launch, offline relaunch, safe-area behavior | External manual validation required |
| VoiceOver on iOS/iPadOS | landmarks, route navigation, form labels, mathematical-result reading spot checks, dialogs/focus | External manual validation required |
| TalkBack on Android | landmarks, route navigation, form labels, mathematical-result reading spot checks, dialogs/focus | External manual validation required |
| NVDA on Windows with Chrome/Firefox | landmarks, headings, controls, input/result announcements, dialog/focus spot checks | External manual validation required |
| Windows High Contrast on physical Windows | focus visibility, controls, result/status legibility | External manual validation required |

These items are post-release compatibility evidence. They must not be marked complete solely because the Playwright emulation and axe gates pass.

## Acceptance rule

The accessibility/device stage is repository-complete when:

1. the static accessibility audit passes;
2. the full unit and strict build gates remain green;
3. the expanded Playwright matrix is green without hidden retries/flaky acceptance;
4. the axe route scan reports zero configured WCAG A/AA violations;
5. the exact certified branch head is merged using expected-head protection;
6. the merged `main` deployment again reaches `mathlab-production: success` on the live custom domain.

Physical-device and assistive-technology validation remains a separate external checklist and is not a blocker that CI can truthfully self-certify.
