# P9 — Architecture Stabilization

## Goal

P9 stabilizes the post-v2 product after the P1–P8 feature sequence without changing mathematical semantics.

The phase targets four structural risks that had accumulated:

1. major routes and transient surfaces were eagerly pulled into the application graph;
2. the PWA used one hard-coded v2 cache generation even after route-level chunks became desirable;
3. Workspace/Worksheet Recovery replacement was ordered only inside one tab, not atomic across tabs;
4. storage capacity/durability state was invisible to the user.

P9 fixes those risks and adds measurable regression budgets.

## 1. Domain and route module boundary

The always-loaded shell remains responsible for hash routing, Workspace object state, worksheet state, parser/semantic resolution needed by the Workbench, Worker dispatch, and primary navigation.

Heavy or intermittent product surfaces are loaded through src/app/routeModules.tsx with React.lazy:

- Tools;
- Visualize;
- Proof;
- Practice;
- Reference;
- shared-snapshot viewer;
- contextual tools/inspector drawer;
- command palette.

Workspace also defers capability action resolution until there is an active mathematical object and defers share-snapshot creation UI until Share is actually opened.

This preserves stable hash routes while allowing Vite to generate independent dynamic chunks.

P9 deliberately does not split parser/semantic Workspace dependencies merely to make the graph smaller. Those modules are required for the first interactive Workbench state and would only replace useful startup work with an artificial waterfall.

## 2. Production bundle budget

vite.config.ts now emits a production manifest.

scripts/bundle-budget.mjs verifies the built artifact rather than relying on source-file guesses.

Required dynamic entries include the major route/transient modules listed above.

Budgets:

- initial application entry: ≤ 800 KiB raw and ≤ 260 KiB gzip;
- any JavaScript asset: ≤ 1.8 MiB raw and ≤ 600 KiB gzip;
- total CSS: ≤ 320 KiB raw.

The high per-chunk ceiling deliberately accommodates MathLab's local Worker mathematics engine while still preventing accidental multi-megabyte route regressions. The initial-entry limit is much tighter because startup responsiveness is the target.

Both PR CI and deployment CI run the bundle budget after vite build.

## 3. Atomic local persistence

Before P9, same-tab React saves were serialized, but Workspace and Worksheet persistence still performed current-record read, Recovery write, and replacement write as separate IndexedDB transactions.

Two tabs on the same origin could interleave those operations.

P9 adds MathLabDatabase.replaceVersionedWithRecovery.

The following now occur in one readwrite transaction:

- read current revision;
- reject an older delayed snapshot;
- write the valid current value to Recovery;
- replace the current value.

Same-tab queues remain in place to preserve deterministic mutation ordering.

The database wrapper also resets a rejected blocked-open promise so a later retry can succeed after the conflicting tab closes, and aborts a transaction when a synchronous transaction action throws.

No Workspace or Worksheet schema version changes are introduced by P9.

## 4. Storage health and durability

The Workspace data menu now exposes local storage health on demand.

It reports IndexedDB readiness, browser quota usage when available, normal/elevated/critical quota pressure, and persistent-storage status when supported.

Thresholds:

- normal: < 75%;
- elevated: 75–89.9%;
- critical: ≥ 90%.

Where the Storage API supports it, the user can explicitly request durable storage. MathLab does not request persistence automatically and does not imply that browsers must grant it.

Export and Recovery remain valid regardless of Storage API support.

## 5. Build-scoped PWA cache generations

The previous service worker used fixed mathlab-v2-shell and mathlab-v2-runtime cache names.

That becomes unsafe once deployment N and deployment N+1 can have different lazy chunk graphs.

P9 injects a build identity:

- GitHub Actions: first 12 characters of GITHUB_SHA;
- explicit local override: MATHLAB_BUILD_ID;
- local fallback: local-v2.0.0.

The application registers sw.js?v=<build-id>.

The service worker derives:

- mathlab-build-<build-id>-shell;
- mathlab-build-<build-id>-runtime.

Activation deletes obsolete build-scoped caches and legacy mathlab-v2-* generations.

Runtime cache lookups are intentionally restricted to the current shell/runtime pair. A new build therefore cannot satisfy a lazy chunk request from an old runtime cache.

The production verifier requires the live service-worker registration URL to contain the 12-character deployed commit identity.

## 6. Accessibility and physical-device boundary

P9 preserves the full automated certification matrix: Chromium/Firefox/WebKit; Android/iOS phone emulation; Android/iPad tablet emulation; portrait/landscape; axe WCAG A/AA; keyboard/focus; 320 px + 200% text reflow; reduced motion; forced colors; target size; and installed service-worker/offline reload.

P9 also adds browser certification for lazy route loading, storage-health inspection, and build-scoped service-worker registration/cache names.

Physical hardware and assistive-technology evidence cannot be generated by repository CI. The existing physical Android/iPhone/iPad, installed PWA, VoiceOver, TalkBack, NVDA and physical Windows High Contrast matrix remains explicitly external in ACCESSIBILITY_DEVICE_CERTIFICATION.md.

P9 stabilizes the architecture for that testing and does not falsely mark those external rows as passed.

## 7. React quality boundary

P9's lazy-loading architecture follows these rules:

- dynamic imports are statically analyzable;
- expensive routes are loaded only when entered;
- no route fetch waterfalls are introduced after a route module is selected;
- transient modals/drawers remain separate from normal route rendering;
- Suspense fallbacks expose a status to assistive technology;
- no new global mutable module state is added.

## Acceptance gate

P9 is complete only when the exact candidate head passes:

1. every pre-existing P0–P8 release audit;
2. the P9 architecture-stabilization audit;
3. dependency security;
4. the full unit suite;
5. strict TypeScript;
6. production build;
7. bundle-budget inspection of the actual dist manifest/assets;
8. full cross-browser/device/accessibility certification;
9. P9 lazy-module, storage-health and build-cache browser tests;
10. GitHub Pages deployment;
11. independent live custom-domain verification.

Physical-device and assistive-technology validation remains external evidence and is not fabricated as part of CI completion.
