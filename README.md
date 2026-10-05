# MathLab

MathLab is a **local-first university mathematics workbench** built around persistent mathematical objects rather than disconnected calculator pages.

**Current stable release: v2.0.0**

The stable v2 engine spans algebra, calculus, multivariable/vector calculus, visualization, linear algebra, real and complex analysis, probability/statistics, numerical mathematics, ODEs, transforms, discrete mathematics/algorithms, number theory, finite algebraic structures, foundational topology/geometry, PDE templates, optimization, practice, and deterministic proof verification.

## Product model

MathLab follows one shared mathematical pipeline:

```text
Input → AST → Semantic Object → Capability
      → Worker / Engine → Structured Result
      → Workspace / Visualization / Practice
```

That means a function, matrix, distribution, graph, recurrence, ODE, or other supported object can be saved once and reused across compatible operations.

## Product shell

MathLab exposes three primary destinations rather than six competing top-level pages.

### Work
The day-to-day mathematical environment.

- **Workbench** — keyboard-first mathematical input, native MathML preview, persistent objects, assumptions, dependencies, exact/approximate result provenance, IndexedDB persistence and workspace exchange;
- **Tools** — searchable complete capability catalog with contextual availability, examples and direct handoff back into the workbench;
- **Proof** — deterministic transformation, derivation-chain and theorem verification with explicit **verified**, **conditionally valid**, **invalid**, and **not proven** outcomes.

### Visualize
A dedicated exploration environment for Cartesian, parametric, polar and implicit curves; contours/scalar fields; vector and gradient fields; phase portraits; 3D surfaces; feature overlays; keyboard pan/zoom; and SVG/PNG export.

### Learn
The learning environment.

- **Practice** — course-oriented authored/generated exercises, adaptive review, spaced scheduling, exams and mastery tracking;
- **Reference** — mathematical capability/course reference generated from the stable engine plus the fixed 22-domain completeness audit.

The six underlying hash routes remain stable deep links, but the interface groups them by user intent: **do mathematics, explore it visually, or learn it**.

## Mathematical coverage

The current fixed-rubric audit reports:

- **66/100** university-domain breadth;
- **66/100** maturity inside implemented domains;
- **9 strong** domains;
- **11 partial** domains;
- **2 narrow** domains;
- **0 missing/incidental** tracked domains;
- **0 comprehensive** domains.

MathLab deliberately does not claim Mathematica-level CAS breadth or general theorem-prover completeness. Unsupported mathematics should fail explicitly or remain **not proven** rather than receiving a plausible-looking guess.

See `docs/E12_MATHEMATICAL_REAUDIT.md` for the detailed boundary.

## Local-first and offline

MathLab has no application account requirement, telemetry backend, or remote mathematics service. Workspace and practice data stay on the device unless explicitly exported.

The PWA includes:

- service-worker-backed offline navigation;
- installable icons and manifest;
- local workspace persistence and recovery;
- live deployment verification on the production custom domain.

## Accessibility and device support

The post-v2 hardening layer includes:

- automated WCAG A/AA route scans with axe-core;
- keyboard skip-link/focus checks;
- 320px + 200% text reflow certification;
- reduced-motion and forced-colors checks;
- phone/tablet browser-engine emulation in portrait and landscape;
- WCAG 2.2 minimum touch-target checks;
- native MathML for mathematical output.

Physical-device and screen-reader validation remains an explicit external evidence boundary. See `docs/ACCESSIBILITY_DEVICE_CERTIFICATION.md`.

## Development

```bash
npm install
npm run dev
```

Core quality gate:

```bash
npm run check:release
npm run test:e2e
```

GitHub Actions additionally runs dependency security checks, real Chromium/Firefox/WebKit browser tests, GitHub Pages deployment, and live custom-domain verification.

## Documentation

- `docs/ARCHITECTURE.md` — system architecture
- `docs/ROADMAP.md` — completed development eras and current maintenance direction
- `docs/E12_MATHEMATICAL_REAUDIT.md` — current mathematical coverage
- `docs/RELEASE_CERTIFICATION.md` — stable-release evidence
- `docs/ACCESSIBILITY_DEVICE_CERTIFICATION.md` — accessibility/device evidence boundary
- `docs/SECURITY_REVIEW.md` — current security model
