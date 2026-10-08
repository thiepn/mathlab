# MathLab — Final release acceptance contract

This checklist replaces open-ended feature-phase expansion with demonstrable acceptance criteria. It applies to the **current exact Git commit**, not to earlier branches, screenshots or prior releases.

## 1. Automated release gate

- All release, E12, accessibility, persistence, capability, learning, visualization, mathematical and architecture audits pass.
- Strict TypeScript and the production Vite build pass.
- Dependency security check has no findings at the configured high-severity gate.
- Unit tests pass, including direct mathematical oracles for DGL, Stochastik, TI and AMP.
- Chromium, Firefox, WebKit and the touch-emulation projects pass the browser suite; do not accept known failures solely by raising timeouts.
- Production bundle budgets pass.

**Do not merge a failed or unfinished exact-head check.**

## 2. Deployment gate

- Merge only with an expected-head SHA guard.
- Verify the **merged main commit** has `mathlab-production: success`, not merely that the PR passed.
- Confirm the public site at https://thiepn.dev/mathlab/ passes the live smoke test, including its build-scoped service worker.
- Confirm /mathlab/qa/ is published when the device-evidence change ships.
- Any subsequent commit invalidates the previous commit-specific production result.

## 3. Physical accessibility and PWA compatibility (external)

The nine targets in ACCESSIBILITY_DEVICE_CERTIFICATION.md must be exercised on actual devices or real assistive-technology setups. The /qa/ evidence collector records results locally; neither browser emulation nor a downloaded self-reported JSON report is certification. An independent reviewer must assess the supplied evidence and any repaired defects.

**Current category remains unverified until external evidence is recorded.**

## 4. Real-course mathematics acceptance (external)

Use actual lecture sheets and past exam problems, not generic example exercises, across Differentialgleichungen, Stochastik, Theoretische Informatik and Algorithmische Mathematik und Programmieren. Each attempted question must record:

- exercise source, input, selected MathLab operation and assumptions;
- independent expected mathematical result or proof;
- actual result, exact/approximate classification and any warnings;
- outcome: correct, incorrect, unsupported, or UX-blocked;
- reproducible bug report and retest evidence for failures.

MathLab explicitly does **not** claim comprehensive TI automata, formal-language or computability support. The frozen E12 breadth audit of **66/100** is not an overall quality rating and must not be inflated because a release passes CI.

## 5. Finalization stop rule

Declare the **software release complete** only after gates 1 and 2 are green for the final exact SHA. Declare the **external qualification complete** only after gates 3 and 4 have actual evidence. Until then:

- maintain the most recent certified release;
- fix correctness, regression, accessibility and persistence defects ahead of features;
- record unsupported mathematical classes honestly;
- avoid another feature series without a documented user need.
