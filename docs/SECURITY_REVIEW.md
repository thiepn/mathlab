# MathLab v2.0.0-rc.1 Security Review

## Application boundary

MathLab remains a client-only, local-first application. There is no application analytics, telemetry, account backend, remote mathematics service, `eval`, dynamic `Function`, or application-layer network fetch path. Runtime `fetch` is confined to the service worker and same-origin caching behavior.

## Toolchain

### Vite

MathLab pins Vite `7.3.5`, the patched 7.x line selected during release hardening. Dev and preview servers default explicitly to loopback (`127.0.0.1`). Production source maps remain disabled.

### Vitest

MathLab pins Vitest `3.2.7` and executes the complete regression suite in Node mode through GitHub Actions.

### React

MathLab declares client-side `react` and `react-dom`; it does not declare `react-server-dom-*` or an RSC framework. React Server Component vulnerability classes therefore do not describe the shipped MathLab architecture.

## Browser/PWA metadata

- PWA `id`, `start_url`, and `scope` remain relative for `/mathlab/` subpath deployment.
- Referrer policy is `no-referrer`.
- Service-worker runtime caching rejects cross-origin requests and caches only successful basic same-origin responses.
- Navigation fallback is explicit.
- old MathLab cache generations are removed during activation.
- release icons and manifest artifacts remain part of the static release audit.

## Persistence and execution hardening

The inherited P15 release audit continues to enforce:

- top-level error boundary;
- Worker crash listener and 30-second timeout;
- workspace/practice recovery snapshots;
- workspace import-size guard;
- no application `eval` / dynamic `Function`;
- no application-layer `fetch` / `XMLHttpRequest` path;
- no generated build/cache artifacts inside the source release tree.

E12 does not weaken any of these controls while expanding the release identity to v2 RC1.

## Current dependency evidence

GitHub Actions performs a real npm dependency installation for every E12 pull-request gate. At the E12 certification checkpoint, npm reports **one low-severity advisory** and no high/critical advisory in the install summary. This is a non-blocking RC maintenance item, not evidence that future installs are permanently vulnerability-free.

## Stable-release security boundary

`v2.0.0-rc.1` is a source release candidate. Stable `v2.0.0` still requires a fresh final dependency-advisory review together with real browser/device/PWA validation. Security claims must remain scoped to the exact dependency graph and source SHA actually certified.
