# MathLab dependency security remediation — 14 November 2026

## Scope
This is a narrowly scoped development-tool security correction on draft PR #62. The prior production IndexedDB persistence test was independently reproduced and corrected at the live origin. This dependency repair neither changes React/application source nor authorizes a deployment.

## Confirmed CI finding
The mandatory `npm audit --audit-level=high` gate failed on the original locked dependency graph:
- `vite@7.3.6`, subject to the high-severity advisories listed in GitHub's 14 November audit log (including `GHSA-rq7h-c2jc-7f22`, `GHSA-9jrq-w75r-8gcw`).
- `vitest@4.1.11` and `@vitest/mocker@4.1.11`, subject to two moderate advisories `GHSA-qxg6-89mg-rqv8` and `GHSA-xp26-3454-mjgp`.

## Patch and reproducibility
- Exact `package.json` devDependency pins: `vite@7.3.8`, `vitest@4.1.12`. No other top-level versions changed.
- The npm lockfile updates only the root dependency declarations plus Vite and the eight Vitest family package entries. No new package appears and no unrelated dependency changes.
- The first lockfile regeneration attempted with npm 10.9.9 aborted in npm Arborist with `Cannot read properties of null (reading 'edgesOut')`, a separate npm resolver bug.
- A subsequent read-only GitHub Actions generator used pinned npm CLI `11.21.2` to resolve the same requested dependency graph without weakening peer checks. Its `npm ci --ignore-scripts --no-audit --no-fund` and `npm audit --audit-level=high` passed with **zero reported vulnerabilities** in the ephemeral generator environment ([Actions #43619784928](https://github.com/thiepn/mathlab/actions/runs/43619784928)).
- Normal mandatory CI remains unchanged, including `npm ci`, `npm audit --audit-level=high`, all product audits, tests, build, budget and browser qualifications. The regenerated lockfile and exact pin change must pass those normal gates at the final PR HEAD before any merge could be considered.

## Strict release policy
Keep PR #62 draft; no deployment or merge while any mandatory exact-head gate fails or while an independent production-origin check has not passed. Do not claim a Vite security patch as evidence of improved mathematical correctness, device acceptance, or runtime release readiness.
