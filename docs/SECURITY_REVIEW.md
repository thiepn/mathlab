# MathLab v2.0.0 Security Review

## Application boundary

MathLab is a client-only, local-first application.

The shipped product has:

- no analytics or telemetry backend;
- no account backend;
- no remote mathematics service;
- no application use of `eval` or dynamic `Function`;
- no application-layer remote fetch path for mathematical computation.

Runtime network activity is limited to static application delivery and the service worker's same-origin cache behavior.

## Dependency and toolchain boundary

MathLab pins its direct React, Vite, Vitest, TypeScript, Playwright and accessibility dependencies.

Pull-request and deployment workflows perform a real npm dependency installation and execute:

```bash
npm audit --audit-level=high
```

The security claim is therefore scoped to the exact dependency graph resolved and audited at the tested commit. It is not a permanent assertion that future registry resolution or newly published advisories cannot change dependency risk.

A committed npm lockfile remains desirable for fully reproducible transitive dependency resolution and is tracked as post-v2 build-system hardening.

## Vite

MathLab uses Vite `7.3.5`. Production source maps are disabled.

## Vitest

MathLab uses Vitest `3.2.7` and runs the complete deterministic regression suite in GitHub Actions.

## React

MathLab uses client-side `react` and `react-dom` only. It does not ship an RSC framework or `react-server-dom-*` package.

## Browser and PWA boundary

- manifest `id`, `start_url`, and `scope` are relative for the `/mathlab/` deployment;
- referrer policy is `no-referrer`;
- service-worker runtime caching rejects cross-origin requests;
- only successful basic same-origin responses are cached;
- navigation fallback is explicit;
- obsolete MathLab cache generations are deleted during activation;
- manifest and icon contracts are included in automated release checks.

## Persistence hardening

Workspace and practice persistence use IndexedDB and include:

- schema/version handling;
- last-known-good recovery snapshots;
- blocked/version-change handling;
- oversized/corrupt workspace import rejection;
- explicit replacement confirmation before import;
- bounded histories where applicable.

Browser-local storage is not presented as a remote backup.

## Execution hardening

Mathematical operations run through a dedicated Worker boundary.

The release controls include:

- Worker error/crash handling;
- a 30-second operation timeout;
- structured operation requests rather than runtime code evaluation;
- deterministic exact/approximate/heuristic provenance;
- explicit unsupported-operation failures.

## Application safety controls

The inherited release audits enforce:

- top-level React error handling;
- no application `eval` or dynamic `Function`;
- no hidden application-layer remote mathematics calls;
- workspace import-size guard;
- recovery storage;
- required PWA artifacts;
- no generated build/cache artifacts committed into the source release tree.

## Stable-release boundary

**v2.0.0 is the current stable release.**

Any source, dependency, workflow, PWA, accessibility, or release-control change invalidates prior exact-head certification and requires fresh automated evidence before the new head is treated as certified.

Physical Android/iPhone/iPad behavior and assistive-technology validation are separately documented in `ACCESSIBILITY_DEVICE_CERTIFICATION.md` and must not be inferred from browser emulation alone.
