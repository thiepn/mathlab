# MathLab RC2 Security Review

## Application boundary

MathLab is a client-only, local-first application. There is no application analytics, telemetry, account backend, remote mathematics service, `eval`, dynamic `Function`, or application-layer network fetch path. The only runtime `fetch` calls are inside the service worker and are restricted to same-origin GET caching.

## Toolchain corrections

### Vite

RC1 declared Vite `7.1.3`. The v1 promotion audit identified 2026 Vite advisories whose affected ranges include this version. RC2 pins `7.3.5`, the patched 7.x release covering the June 2026 alternate-path file-access issue and earlier April 2026 7.3.2 security fixes.

The dev and preview servers also default explicitly to loopback (`127.0.0.1`) rather than network exposure.

### Vitest

RC1 declared Vitest `3.2.4`. RC2 pins `3.2.5` because 3.2.4 falls inside affected browser/UI-server advisory ranges and 3.2.5 carries the applicable 3.x patch. MathLab itself runs tests in Node mode, but retaining a known-vulnerable development dependency is unnecessary release risk.

### React

MathLab declares client-side `react` and `react-dom`; it does not declare any `react-server-dom-*` package or an RSC framework. The published React Server Component vulnerabilities therefore do not describe MathLab's shipped architecture.

## Build information exposure

RC2 disables production source maps. The source archive still contains readable source code by design, but a normal production build no longer emits `.map` files by default.

## Browser metadata

- PWA `id`, `start_url`, and `scope` remain relative for subpath deployment.
- Referrer policy is `no-referrer`.
- Service-worker caches accept same-origin GET requests only and cache only successful `basic` responses.
- Old MathLab cache generations are removed at activation.

## Remaining security gate

A real dependency installation and generated lockfile must still be checked for high/critical transitive advisories before final v1 promotion. The current container cannot resolve `registry.npmjs.org`, so that lockfile-level audit cannot be performed here.
