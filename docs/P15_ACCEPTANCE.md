# P15 — Release Hardening Acceptance Specification

P15 is a release-quality phase. It must not broaden the mathematical feature surface unless a defect requires a compatibility fix. The objective is to turn the completed P0–P14 product into a defensible v1.0 release candidate.

## Release identity

- Package version: `1.0.0-rc.2`.
- User-facing development-phase labels are removed from primary navigation/workflows.
- The product exposes an explicit v1.0 RC2 release badge and local/offline state.
- No dead header controls ship in the release candidate.

## Persistence and migration

- P14 workspace data under `workspace:p3:default` migrates automatically into `workspace:p15:default` without modifying the source record.
- P14 practice progress under `practice:p14:default` migrates automatically into `practice:p15:default`.
- Workspace and practice writes keep a last-known-good recovery snapshot.
- A corrupt primary record must fall back to a valid recovery record before an empty state is returned.
- Workspace imports are schema-checked and capped at 5 MB.
- Invalid JSON, unsupported export versions, excessive object/assumption counts, and structurally corrupt objects are rejected before replacing the current state.
- Import is explicitly confirmed because it replaces the active workspace; the previous autosave remains recoverable.
- Storage failures are visible rather than producing unhandled promise rejections.

## Worker reliability

- Local Worker requests have a 30-second release safety limit.
- Worker crashes reject the pending operation and reset the Worker instead of leaving the UI permanently in a running state.
- Existing P4–P14 deterministic math behavior remains unchanged.

## PWA / offline

- The manifest includes installable 192×192 and 512×512 PNG icons plus an Apple touch icon.
- Manifest start/scope URLs remain relative so GitHub Pages subpath hosting is supported.
- Service-worker runtime caching is same-origin only.
- Only successful `basic` responses are written to the runtime cache.
- Navigation requests use a network-first strategy with cached-document/index fallback.
- Static/runtime cache names are versioned for v1.0 and old MathLab caches are removed during activation.
- Failed service-worker registration is contained and does not crash the application.

## Accessibility and responsive hardening

- A keyboard skip link reaches the application content.
- Route changes update the document title.
- Current primary navigation exposes `aria-current="page"`.
- Focus-visible styling includes buttons, inputs, textareas, selects, links and programmatically focusable elements.
- The command palette restores prior focus, traps Tab focus, and closes with Escape.
- Muted foreground text meets normal-text contrast against white more safely than the P14 token.
- Mobile primary/practice actions have at least 44 px touch-height where practical.
- Reduced-motion behavior remains present.
- An application-level React error boundary provides a recoverable failure screen instead of a blank page.

## Packaging / security / privacy

- MathLab remains local-first and adds no analytics, ad, telemetry, account, or remote-math dependency.
- No `eval`/dynamic code execution is introduced by P15.
- Runtime service-worker caching does not cache cross-origin requests.
- Release archives contain no `node_modules`, build directory, package lockfiles, or `.tsbuildinfo` artifacts.
- `npm run audit:release` performs dependency-free static release certification of required safety/PWA/package invariants.

## Validation requirements

Required in this environment:

- dependency-free release audit: PASS;
- strict TypeScript compile of math/storage/main-thread Worker client: PASS;
- strict TypeScript compile of the Worker entry under WebWorker libraries: PASS;
- full TS/TSX structural compile with temporary React/Vitest/Vite declarations: PASS;
- complete existing P0–P14 test corpus through the dependency-independent compatibility runner: **161/161 PASS across 19 test files**;
- ZIP integrity and forbidden-artifact scan: PASS.

The compatibility runner is a certification fallback, not Vitest. The final dependency-backed `npm run test` and `npm run build` must be reported separately. If React/Vite/Vitest dependencies cannot be installed in the execution environment, P15 may be packaged as a release candidate but must not falsely claim a dependency-backed v1.0 certification.
