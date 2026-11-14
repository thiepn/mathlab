# MathLab production IndexedDB reload — reproduced and isolated

Date: 14 November 2026. Repository: `thiepn/mathlab`. Deployed `main` baseline: `f516d20d08c62ab3df15ac5a54e231ea14f24e23`. Production origin: https://thiepn.dev/mathlab/.

## Original failure

Actions [#39239041773](https://github.com/thiepn/mathlab/actions/runs/39239041773), 19 October 2026, passed build and deployment but failed the independent production check: 17 tests passed, 2 failed, one skipped. The only failures occurred after the IndexedDB object was persisted, upon requesting a heading named `Working on production_probe`. Both Chromium and iOS WebKit failed the same assertion. The run's log references Playwright traces and screenshots, but GitHub's workflow artifact list is now empty (original upload retention: seven days). **Those old binary traces were not inspected, and should not be claimed as reviewed.**

## Fresh production-origin reproduction

Isolated pull-request job [#43617027536](https://github.com/thiepn/mathlab/actions/runs/43617027536) ran the **unchanged** production IndexedDB test against the deployed public site. It reproduced **2/2 failures** at the exact stale-heading assertion, one per browser. A separate new Playwright test then verified the real IndexedDB saved object, `activeObjectId`, workspace H1 and mathematical editor value across reload at the **same production origin**, passing **2/2** browser variants. No simulated local site, test stub or saved-profile artifact was used for this acceptance.

## Source-based root cause

The deployed source `src/app/components/Workspace.tsx` renders `<h1>{controller.activeObject?.name ? controller.activeObject.name : 'The workbench'}</h1>`. Thus the heading is `production_probe`, **not** `Working on production_probe`. Existing local browser test `tests/browser/stable-release.e2e.ts` correctly expects the bare object name. The production assertion was stale; **the live data persistence loss was not reproduced**.

## Fix scope

- Change only the stale production assertion to check `.workspace-main h1` has text `production_probe`.
- Keep the independent production-origin IndexedDB/selection/editor test as a stricter regression test.
- No change to React state, IndexedDB storage, release source, production Worker, deployment, data, or any other repository.
- Existing release and dependency-security gates remain enforced.

## Separate release gate

The existing PR check on 14 November stopped at `npm audit --audit-level=high`: Vite 7.0.0–7.3.6 flagged high severity plus two moderate Vitest/mocker advisories. This failure is independent of the stale heading assertion. **Do not merge or deploy the MathLab fix as a release-qualified change while required CI is failing**. Security dependency updates require separately reviewed fixes and a successful full gate.

## Acceptance required

For the exact final fix head, require a fresh production-origin Playwright pass of the corrected test and independent record/selection/editor after-reload test in Chromium and WebKit, then all mandatory source/test/browser/security checks before merge or deployment. Passing a targeted forensic job does not substitute for required CI.
