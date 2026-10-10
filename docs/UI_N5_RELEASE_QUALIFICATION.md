# UI-N5 — Integrated release qualification

## Objective
Bring the exact N1–N4 MathLab notebook UI tree into a clean `main` integration history. Preserve the approved mathematical workbench direction, fix branch mergeability without forced merges, certify the integrated tree, then verify the actual GitHub Pages deployment.

## Integration
- N1 was merged as PR #55; N2 as PR #56.
- N3 PR #57 and N4 PR #58 were based on earlier stacked commits and did not merge cleanly after the first two merges.
- The N5 integration branch starts from the latest `main`, then ports the N3/N4 source files, acceptance tests, style layers and workflow updates from the certified N4 tree.
- `tests/browser/stable-release.e2e.ts` already matched the source tree on the updated main, so it was not changed. All other N3/N4 files were reconciled directly.
- The exact N4 screenshot/cross-browser gates remain in the integrated CI.

## Release gates
1. Run the full pull-request workflow on the actual N5 head, not an ancestor. All architecture, dependency, code, math engine, build, Playwright and accessibility gates must pass.
2. On N5, capture the entire five-screen × four-viewport screenshot matrix from the integrated `main` candidate. Contrast tests verify mobile navigation and selected plot formula.
3. Merge N5 only if green and GitHub reports the branch mergeable. Close the superseded PRs #57 and #58 as superseded by the integrated merge; do not falsely mark them merged.
4. The push to `main` triggers `Deploy MathLab`, including exact-head production audit and live browser verification at `https://thiepn.dev/mathlab/`.
5. Consider the release finished only when the `mathlab-production` status for the final main SHA is success and live route/navigation/math input smoke tests pass.
6. Never imply that screenshot and automated browser certification replace manual real-device screen reader/IME testing or external university past-paper coverage.

## QA continuity
The 20 final N4 viewport screenshots, retained from passing workflow run #285, confirmed that the page is distinctly mathematical (warm notebook canvas, technical graphite navigation, real math typography, ruled results and plots) instead of generic AI/SaaS cards. N5 intentionally adds no further design theme.
