# MathLab v1.0.0-rc.2 — v1.0 Certification / Promotion Record

## Decision

**RC2 accepted. Final `v1.0.0` promotion is not certified in this runtime.**

The P0–P14 product surface remains frozen. This certification pass found and corrected release-toolchain/security defects, expanded deterministic regression from a representative subset to the complete existing test suite, and re-ran the source/persistence/PWA/package audits. The only remaining blockers are dependency-backed bundling/test execution and real built-application browser/device QA.

## Corrections made during the promotion pass

- Upgraded and pinned Vite from `7.1.3` to security-patched `7.3.5`.
- Upgraded and pinned Vitest from `3.2.4` to security-patched `3.2.5`.
- Pinned every top-level runtime/dev dependency to an exact version so a release checkout does not silently float to a different top-level toolchain.
- Declared the Node runtime floor required by Vite 7: `^20.19.0 || >=22.12.0`.
- Disabled production source-map emission in `vite.config.ts`.
- Explicitly bound Vite dev and preview servers to `127.0.0.1` by default.
- Added a stable relative PWA manifest `id` and language metadata.
- Added `no-referrer` document policy metadata.
- Extended `npm run audit:release` to reject known-vulnerable Vite/Vitest versions, floating top-level dependency ranges, source-map re-enablement, non-loopback Vite defaults, and PWA identity regression.

## Security review basis

The Vite 7.1.3 release used by RC1 is inside the affected range of multiple 2026 Vite dev-server file-access advisories. Vite 7.3.5 is the 7.x patched release for the June 2026 Windows alternate-path `server.fs.deny` bypass and also includes the earlier 7.3.2 fixes.

Vitest 3.2.4 is inside the affected range of 2026 Vitest browser/UI server advisories. Version 3.2.5 contains the patch for the relevant 3.x browser-mode issue. MathLab's configured test environment is Node, not browser mode, but a release toolchain should not intentionally retain a known-vulnerable test runner.

React Server Component advisories affecting React 19.x target the `react-server-dom-*` packages. MathLab declares only client-side `react` and `react-dom` and does not include an RSC framework/package, so those specific advisories do not apply to the shipped application architecture.

## Certification gates passed in this runtime

- Dependency-free P15/RC2 release audit: **PASS**.
- Strict TypeScript — all `src/lib` main-thread math/storage/Worker-client code: **PASS**.
- Strict TypeScript — Worker entry under WebWorker libraries: **PASS**.
- Complete source + tests TS/TSX structural compile with temporary dependency declarations: **PASS**.
- Complete existing test-suite execution through a temporary assertion-compatible runner: **161/161 PASS across 19 test files**.
- PWA icon dimensions: **PASS** (`192×192`, `512×512`, `512×512` maskable, `180×180` Apple touch).
- Workspace/practice migration, import and recovery tests included in the 161-test pass: **PASS**.
- Static dynamic-code/network-source scan: **PASS**.
- Package forbidden-artifact scan after temporary certification files are removed: **PASS required before archive**.

### What the 161/161 run means

The temporary compatibility runner executes the project's existing test files and assertion bodies without modifying their mathematical content. It is useful independent evidence that every existing test passes after the RC2 changes.

It is **not** reported as a genuine Vitest run because the actual `vitest` npm package cannot be installed in this container.

## Dependency-backed gate — BLOCKED BY ENVIRONMENT

A fresh install was attempted with retries disabled:

```text
npm install --prefer-offline --no-audit --no-fund --fetch-retries=0 --fetch-timeout=10000
```

The command fails before package resolution with:

```text
EAI_AGAIN registry.npmjs.org
```

No `node_modules` directory or generated lockfile is retained.

Therefore the following commands cannot be honestly certified here:

```text
npm run test
npm run build
```

This is a network/DNS limitation of the execution environment, not a passing or failing result for MathLab.

## GitHub CI fallback check

The connected GitHub account was inspected for an existing MathLab repository. None exists, so there is no project CI environment to use as a legitimate substitute for the blocked local npm registry. Unrelated repositories were not repurposed for certification.

## Final `v1.0.0` promotion gate

Do **not** change the package to `1.0.0` until a dependency-enabled checkout passes all of the following on the RC2 source:

1. `npm install`
2. `npm run test`
3. `npm run build`
4. `npm run audit:release`
5. Serve the built `dist/` and smoke-test current Chromium and Firefox desktop.
6. Smoke-test Android Chrome and iOS Safari/WebKit.
7. Install the PWA from the real deployment path; verify first load, install, offline reload, online refresh, and service-worker upgrade.
8. Verify IndexedDB migration from a real P14 browser state for both workspace and practice data.
9. Keyboard-only check: skip link, global shortcuts, command palette trap/restore, Workspace, Proof Lab, Practice, import flow.
10. Screen-reader spot check for navigation, input labels, result status, Proof Lab verification status, Practice feedback, and dialogs.
11. Visual regression at 320, 375, 768, 1024, and 1440 CSS px widths, including zoom/pan visualization and long mathematical results.
12. Confirm no high/critical dependency advisories are introduced by the generated lockfile.

Only after all twelve gates pass should RC2 be promoted unchanged to **MathLab v1.0.0**.
