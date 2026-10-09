# UI-N3 — Visual QA and Interaction Refinement

## Scope
This is not a third design theme. UI-N3 repairs verified code-level friction at responsive widths and records reproducible visual evidence for human review. It extends UI-N1 and UI-N2.

## Repairs
1. **Tools:** Legacy CSS placed the detail panel before the searchable index on narrow viewports. UI-N3 restores the index-first layout, scrolls directly to the selected operation on mobile, and adds bottom-of-page detail with a consistent responsive order. Empty searches do not display stale details.
2. **Visualization:** The compact source rail becomes a horizontal selection index at intermediate widths so plots retain vertical room. Missing legacy plot palette variables are mapped to the notebook palette, preserving color distinctions for curves, axes, critical points and warnings.
3. **Proof Lab:** E11 advanced certificate tools extend the main verification document as a labelled region. This avoids duplicate `main` landmarks; exact, conditional, invalid and unsupported outcomes retain their established semantics.
4. **Practice:** Improve the legibility of exam-sheet prompts, focus states, course navigation and feedback without changing grading or review scheduling.

## Automated evidence
`tests/browser/ui-n3-visual-qa.e2e.ts` asserts visible core surfaces, no page-wide overflow at 1440/820/390/320 CSS pixels, mobile tool selection behavior, and single-main Proof Lab semantics. Its capture pass creates viewport PNGs for Work, Tools, Visualize, Proof and Practice at all four widths. The pull-request workflow uploads them as the `ui-n3-viewport-reference` artifact when produced.

Screenshots are **evidence to inspect**, not proof the design is successful. The author must examine the 20 reference captures for cropped content, typography hierarchy, touch affordances, visual collisions, plot prominence, focus indicator and readability. Do not mark visual sign-off without inspection.

## Acceptance and merge order
- First stabilize UI-N1 (#55) on exact-head green CI.
- Then UI-N2 (#56), built from UI-N1, on exact-head green CI.
- Only then merge UI-N3. A successful check on an older parent commit never certifies a later commit.
- Verify production deployment and final live smoke for the merged main SHA. Continue to preserve Q1/Q2 external evidence boundaries.

## User-facing quality standard
A calculation must feel like a mathematical notebook, a visualization like a plotting instrument, a proof like verifiable reasoning, and Practice like studying mathematics. Avoid blue cards, oversized landing-page heroes, redundant ribbons, gradients, ornamental statistics and generic AI dashboard tropes.
