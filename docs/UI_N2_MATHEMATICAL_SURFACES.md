# UI-N2 — Mathematical Surfaces

## Purpose

MathLab should read like a mathematical instrument rather than a generic SaaS dashboard. UI-N1 established the dark technical masthead, object index, paper and live input/type-setting composition. UI-N2 applies that visual language to all four primary work surfaces without changing mathematical engine behavior.

## Surface conventions

| Surface | Structure | Essential interaction |
| --- | --- | --- |
| Tools | Numbered searchable operation index + active specimen inspector | A filtered search or category never leaves the detail pane on an absent tool |
| Visualization | Source rail + plotting stage + parameter inspector | Modes, zoom, camera, curves, exports and overlays remain reachable |
| Proof & Verification | Claim / assumptions / step / verdict, with ruled typeset previews | Exact, conditional, invalid and unsupported must remain visually distinct |
| Practice | Course index + study path; session as an exam sheet | Hints, review scheduling, answer grading and closed-help exams remain intact |

## Design invariants

- **No generic AI cards.** Use typographic information hierarchy, axes, rules, numbered rows and compact scientific controls.
- **No distracting ornament.** No gradients in page chrome, fake mathematics, emojis, blurred-glass widgets, achievement dashboards or arbitrary shadows.
- **Mathematical content stays primary.** Visualizations retain legible plots. Equations and evidence retain enough whitespace for typesetting.
- **Progress and state are meaningful.** Selection, tool applicability, grader/verifier outcomes and save status must remain clear without relying on color alone.
- **No network dependency.** Use installed system font stacks, local styles and existing offline assets.
- **Accessible input.** Preserve existing keyboard names, live semantic math, visible focus, responsive touch controls and forced-colors adaptation.

## Automated acceptance

The existing repository gate runs accessibility audits, strict typecheck/build, mathematical tests and the multi-engine browser matrix. `tests/browser/notebook-surfaces.e2e.ts` adds targeted verification of indexed tool selection, category filtering, four-route reachability and no document-level overflow on desktop and mobile.

UI-N1 additionally corrects old test assumptions about the changed heading and fixes the shared-link test to explicitly close its modal before returning to editing.

## Release boundary

This phase is a **working implementation**, not an externally reviewed visual design. Approval requires screenshots at 1440px, 820px, 390px and 320px, checking empty, populated and error states, plus real-device review where possible. Do not merge failed or unfinished exact-head CI. After merging UI-N1 and UI-N2 in order, certify the final `main` commit through the production deployment workflow and live smoke verification.

## Next

UI-N3 should examine visual density and affordances in the actual browser, then correct interaction friction and contrast found in the screenshots. Do not add another theme or dashboard before obtaining visual evidence.
