# UI-N4 — Screenshot-reviewed release acceptance

## Evidence inspected before this change

The previous UI-N3 exact-head `Check MathLab` run [#276](https://github.com/thiepn/mathlab/actions/runs/37897027570) passed and produced the `ui-n3-viewport-reference` artifact (ID `11600593040`). The ZIP contains 20 reference screenshots: Work, Tools, Visualize, Proof and Practice at 1440, 820, 390 and 320 CSS pixels.

The visuals were inspected on 2026-10-09. Findings:

| Severity | Widths | Evidence | Action |
| --- | --- | --- | --- |
| High | 320 / 390 / 820 | Mobile bottom navigation used a *white button background* with pale labels inherited from the dark instrument style. Text was barely distinguishable. | Scope dark background, transparent button surfaces, light inactive labels and high-contrast active state to the actual `.mobile-nav-primary`. |
| Medium | 320 / 390 | Visualization's introduction and status block occupied most of the first screen. Plot controls appeared at the bottom; the plot was not yet visible. | Make headline/description concise and convert metrics into a compact scientific data strip. Compress the mobile source and toolbar chrome. |
| Medium | 320 / 390 | Proof mode selector used tall descriptions in horizontally scrollable cards; first control area pushed the proof editor offscreen. | Show concise controls on phones; full selected-mode details remain available in the editor header. |
| Low | 320 / 390 | The Practice overview introduced its features at excessive vertical length before the course controls. | Reduce mobile typography and metric tile heights without losing readable type. |

There is no evidence of engine regression in this design review; mathematical correctness remains covered by the existing CI suite and separate course-material qualification.

## Acceptance gate

1. Strict build, existing mathematical tests and full Playwright multi-browser release suite pass at the exact UI-N4 head.
2. The N4 visual contract test explicitly verifies computed mobile navigation contrast at or above 4.5:1 for all three destinations and catches page-level overflow at 1440, 820, 390 and 320 pixels.
3. The new 20 `ui-n4-*.png` viewport captures are uploaded as the `ui-n4-viewport-acceptance` artifact. They must be inspected rather than treated as an automatic visual sign-off.
4. PRs #55, #56, #57 and N4 are merged in order only if all required checks are green and the combined tree has no unresolved conflicts.
5. Production deployment and live smoke verification pass for the *actual final main commit*.

## Design boundary

N4 is a targeted correction pass. No additional theme, gradient, remote font, fabricated statistics, math-operation expansion, account changes, or new user data collection. The app remains local-first. Device/assistive technology and real university exercise qualification remain tracked in issues #51 and #52 independently of software QA.
