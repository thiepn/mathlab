# E12 Acceptance — Mathematical Integration & v2 Certification

## Status

**Accepted for `v2.0.0-rc.1` source release-candidate certification. Stable `v2.0.0` is not certified by E12 source CI alone.**

E12 is the final E-series integration phase. It adds no new mathematics domain. Its purpose is to verify that the P/M/E implementation composes as one honest product and to freeze the evidence boundary for a v2 release candidate.

## Fixed mathematical audit

E12 reuses the exact 22-domain M7 rubric instead of inventing a more favorable scale. The current conservative result is:

- university-domain breadth: **66/100**;
- implemented-domain maturity: **66/100**;
- strong domains: **9**;
- partial domains: **11**;
- narrow domains: **2**;
- missing/incidental domains: **0**;
- comprehensive domains: **0**.

Zero missing domains means every audited area now has a first-class MathLab workflow. It does **not** mean MathLab is mathematically comprehensive.

See `E12_MATHEMATICAL_REAUDIT.md` for the domain evidence and remaining boundaries.

## Automated certification baseline

E12 adds deterministic integration gates for:

1. the fixed 22-domain rubric and status/score invariants;
2. a one-case-per-domain cumulative golden mathematical corpus;
3. cumulative routing through the production `E11MathEngine` and visualization stack;
4. capability ↔ tool-catalog consistency for the golden corpus;
5. controlled Workspace operation ↔ global discovery consistency;
6. tool metadata and production-parser example validation, with dedicated Proof Lab grammar kept separate;
7. explicit exact / approximate / heuristic provenance;
8. inherited P15 release/PWA/security static contracts;
9. complete Vitest regression;
10. strict TypeScript;
11. Vite production build.

`npm run audit:e12` statically verifies that the certification artifacts, release-candidate identity, fixed 22-domain registry, CI/deployment gates, and stable-release withholding remain intact.

## Golden corpus policy

`src/app/e12Certification.ts` owns exactly one integration smoke case for each M7 domain. These cases are not substitutes for the deeper phase/domain tests. They are cross-domain sentinels proving that the cumulative product still resolves, routes, executes, and labels representative mathematics through the final engine architecture.

The corpus intentionally contains both exact and approximate work. `unknown` exactness is not accepted in the certification corpus.

## Release identity

The accepted candidate identity is:

`2.0.0-rc.1`

The UI must identify it as **v2.0 RC1**. The package and release audits reject stable `2.0.0` during this source-certification stage.

## External gates deliberately not fabricated

The following require real deployed/browser/device evidence and are **not** certified by repository CI:

- current Chromium desktop smoke test;
- current Firefox desktop smoke test;
- Android Chrome smoke test;
- iOS Safari/WebKit smoke test;
- real deployed PWA install, offline reload, online refresh, and service-worker upgrade cycle;
- keyboard-only end-to-end review;
- screen-reader spot checks;
- visual regression at target mobile/tablet/desktop widths.

Until those gates are actually completed, **stable `v2.0.0` remains NOT CERTIFIED**.

## Explicit non-claims

E12 does not claim:

- Mathematica/Maple-level general CAS coverage;
- comprehensive university mathematics;
- a general theorem prover;
- rigorous numerical error enclosures for every approximate workflow;
- full browser/device/PWA/accessibility certification from unit CI;
- stable `v2.0.0` release authorization.

## Freeze rule

After the exact final E12 branch head passes both audits, every test, strict TypeScript, and the Vite production build, that exact SHA may be squash-merged as the `v2.0.0-rc.1` source candidate. Any later source change requires a fresh exact-head gate.
