# MathLab 3.0 · D0 Full Visual & Interaction Audit

**Audit date:** 2026-10-08  
**Baseline:** \`main\` commit \`6265f651d90101e74b530d75616b5caffba26c22\` (live-production certification: success)  
**Target product:** v3.0 presentation overhaul, **not** a mathematical-engine rewrite  
**State:** **Source inspection and first-fold screenshot review completed.** The [rendered screenshot report](./D0_RENDERED_SCREENSHOT_REVIEW.md) records 30 captures, no capture errors, and real page heights. Physical-device observation remains external.

## 0. Evidence boundaries

**Verified by repository inspection:** seven hash-route destinations; primary/secondary navigation; React screen composition and interactions; current design tokens; 21 imported CSS files; Playwright baseline; mathematical workflow and storage boundaries. Existing certified browser tests cover much of basic functionality and accessibility.

**Now verified by screenshot review:** desktop, tablet and phone first-fold images were inspected; measured default page heights are in [D0_RENDERED_SCREENSHOT_REVIEW.md](./D0_RENDERED_SCREENSHOT_REVIEW.md). **Not yet verified:** actual motion smoothness, real-device ergonomics, user task timing, screen-reader narration, every line of extremely tall pages or visual parity across engines. The Playwright screenshot workflow in \`.github/workflows/d0-ui-inventory.yml\` captures reproducible UI images; screenshots must be **visually reviewed** before the D2 design direction is frozen. Browser emulation is not physical-device testing.

**Current release preservation:** Maintain existing math engine, math-object AST/operations, IndexedDB workspaces and recovery, worksheets, worker processing, accessibility contracts, hash-link semantics, import/export, read-only share links, and offline/PWA update behavior. Audit/visual migration must never be treated as evidence for broader mathematical capability.

## 1. Architecture and style baseline — confirmed

- Seven routes: \`workspace\`, \`tools\`, \`visualize\`, \`proof\`, \`practice\`, \`reference\`, \`share\`. Three primary destinations: **Work / Visualize / Learn**. Work secondary navigation: **Workbench / Tools / Proof**; Learn: **Practice / Reference**.
- Presentation source currently imports **21 CSS files**, roughly **226 KB of authored source** (≈5,853 physical lines, misleadingly small for minified one-line files). The cascade mixes foundational styles with layered P-, E- and M-phase additions and ends with an accessibility-specific override file. Example: \`e3.css\` contains ~8.9 KB on two lines.
- Canonical \`tokens.css\` specifies white/paper/light-gray foundations, blue primary interactions, system-first UI/mono/math typography, 4–12px radii, and static left/right shell widths of **268px** and **316px**. \`app.css\` starts from a three-column grid; specialized later styles change layouts.
- **Legacy token mismatch:** the imported CSS refers to names such as \`--ml-border\`, \`--ml-border-strong\`, \`--ml-surface\`, \`--ml-accent\`, \`--ml-accent-soft\`, \`--ml-accent-strong\`, \`--ml-ink-muted\`, \`--ml-ink-faint\`, \`--ml-focus\`, \`--ml-positive\`, \`--ml-negative\` and \`--ml-shadow-sm\` that are **not declared in the imported CSS token system**. Most visibly, \`e3.css\` relies on these names. Some declarations may consequently fall back to browser defaults or become invalid unless set by another runtime source. This is a **code-grounded styling risk**, not yet a measured screenshot defect. D3 must replace aliases with validated canonical tokens and add a check that prevents new undefined variables.
- Default graph rendering is component-owned SVG via \`GraphCanvas.tsx\` and \`E3Canvas.tsx\`, with axis ticks, curves, fields, contours, wireframes, interaction and exports. It is **not** a generic chart library, and preservation of its mathematical semantics is important.
- Current product identity uses the same blue primary accent and familiar card/panel vocabulary over seven mathematically different modes. Graph and learning routes have large introductory heroes. This is a source-observed hierarchy pattern, not a screenshot-verified aesthetic judgement.
- Global reduced-motion and forced-colors styles exist. Playwright projects cover desktop Chromium/Firefox/WebKit and simulated Android/iOS phones/tablets. Automated coverage is **not** a substitute for direct device/AT testing.

## 2. Screen-by-screen audit

Severity: **P0** design direction blocker, **P1** major redesigned workflow, **P2** polishing/optimization. These are visual/UX priorities, not confirmed correctness bugs.

| ID | Screen/state | Source-confirmed present behavior | D0 redesign finding | Priority | Preserve |
| --- | --- | --- | --- | --- | --- |
| D0-01 | Application shell | Sticky header, Work/Visualize/Learn, contextual second row, command search, online indicator and release badge | Navigational layers consume vertical space; ordinary math tasks can require switching route + subnav + drawer. Replace with cohesive compact scientific shell and meaningful context. | P0 | Keyboard search and deep links |
| D0-02 | Empty Workbench | Title/subtitle, universal input, live preview, empty actions, worksheet, data controls | First-use experience is heavy on scaffolding/copy rather than direct mathematical action; no dedicated focused equation canvas. | P0 | Empty state guidance and accessibility |
| D0-03 | Active Workbench | Input → Commit → current-work summary → contextual actions → result → worksheet; sidebar with saved objects | High workflow fragmentation; the same object appears as editor, card and timeline. Visual attention is split before user reaches the result. Need a single coherent document/object stage. | P0 | Named objects, assumptions, dependencies, save/recovery |
| D0-04 | Input & keypad | Plain source text input with preview, suggestions, shortcut editing and keypad | Notation and plain text are visually separated; heavy form affordance; limited visual language for syntax diagnostics. | P0 | Parser grammar, shortcuts, error boundaries and selection editing |
| D0-05 | Result and derivation | Algebra result sections, steps, actions to reuse/copy | Derivation lacks a strong common hierarchy for exact/approximate/conditional/unsupported and long-form mathematics. | P1 | Exactness, warnings, proof provenance |
| D0-06 | Object explorer / worksheet | Sidebar saved objects, pins, activity; timeline with undo/redo and checkpoints | Multiple organizational surfaces and secondary menus increase scanning. Need source-linked, consistent object ownership and fast jump between editor/results/history. | P1 | IndexedDB, checkpoint/undo semantics |
| D0-07 | Tools catalog | Full registry, large search/filter row, list of tool cards, detail inspector and context readiness | Too catalog-like for routine operations; user must understand object category and search terms. Preserve advanced browse but lead with relevant operations and exact preview. | P1 | Registry integrity and applicability gates |
| D0-08 | Visualization empty | Special empty page asking for a visualizable object | The blank state cannot be explored immediately; need an obvious 'create sample function' action while staying mathematically honest. | P1 | Source-object guarantees |
| D0-09 | Graph Studio main | Hero + object rail + plotting stage + mode strip + toolbar + inspector; minimum large graph frame | Stage is surrounded by competing chrome; multiple toolbars/controls and oversized intro reduce available graph. Make canvas primary, controls spatially contextual. | P0 | Exact plot modes, trace, exports, accessibility |
| D0-10 | Dynamic exploration | Sliders, input values, formula panel, graph and table synchronize | Mechanism exists, but controls and canvas are visually disconnected. Need direct mathematical state linking and smooth transition with reduced-motion fallback. | P0 | Slider semantics and synchronized data |
| D0-11 | 3D, fields and contours | E3Canvas SVG scenes, camera parameters, wireframe/field layers | Renderer can be visually enhanced but precision, legibility, z-order and pointer interactions need independent QA. WebGL only where justified and lazy. | P1 | Mathematical geometry and SVG fallback |
| D0-12 | Proof Lab | Hero, mode picker, before/after or multiline textarea, result and verification status | Proof editing feels like a form separated from mathematical derivations; put each step and its verdict into one spatial proof structure. | P1 | Verified/conditional/invalid/not proven boundaries |
| D0-13 | Practice / review | Courses, progress metrics, guided sessions, exam/question rail, feedback and review | Course dashboard presentation competes with the question. Make solving the dominant surface, with progressive hints and natural session navigation. | P1 | Exercise generation, scoring and progress |
| D0-14 | Reference | Large intro, search, E12 breadth audit cards and catalog content | Audit-led, tool-centric reference is not yet a mathematically beautiful textbook. Restore definitions/examples/diagrams as primary reading objects. | P1 | Accurate coverage and stated limitations |
| D0-15 | Share / import / export | Explicit read-only snapshots and copy-to-workspace, local import/export and recovery | Split across separate routes and disclosure menus; standardize user-facing affordances and state transitions without hiding safety-critical copy/recovery. | P1 | No silent overwrite, private local data |
| D0-16 | Mobile | Responsive CSS, bottom Work/Visualize/Learn nav, off-canvas object drawer, touch graph support | The phone structure inherits desktop concepts. Need independent phone task flows, graph-first presentation and a focused math keypad. | P0 | WCAG reflow and touch control coverage |
| D0-17 | Tablet | Touch projects cover narrow-width layout and rotation | Need purpose-built split modes, configurable inspector and portrait/landscape graph allocation. | P1 | Touch/keyboard hybrid |
| D0-18 | Motion, transitions, status | Global reduced-motion, some animations/transitions, lazy-loading fallback | No unified semantic motion primitives for object selection, calculation, graph parameter updates or result replacement. Motion must clarify transitions, never fake computation. | P1 | Reduced motion and stable focus |
| D0-19 | System messages / loading | Saved/loading/worker error states and local/offline status | Different components implement status copy and treatment separately; risk of visual inconsistency and confusing priority. | P1 | No suppression of important errors |
| D0-20 | Overall visual architecture | Layered CSS classes and divergent M/E/P screen families | Repeated cards, intro heroes, filters and typography patterns read as a generic app shell. Establish math-specific design grammar and migrate scoped styles rather than stacking overrides. | P0 | Existing component boundaries until replacements qualify |

### High-priority non-cosmetic observations

1. **The mathematical object is not the screen's organizing unit.** Creating/committing a function, using tools, graphing and proving route through different presentation surfaces. A redesign must connect these states explicitly without implicitly converting uncommitted work.
2. **Information architecture expresses implementation categories.** 'Work / Visualize / Learn' plus secondary tabs is technically sensible but still requires users to translate intent to component location.
3. **Large generic introductory heroes conflict with the user's desired productivity.** Workbench, Tools, Proof, Practice, Reference and Visualization have route-level title/description treatment. Actionable content should lead.
4. **Graph chrome competes with graphs.** E3 uses object rail, horizontal plot-mode strip, multiple toolbars, broad hero and right inspector; control density should be context- and viewport-adaptive.
5. **Styling is vulnerable to cascade drift.** CSS imports span 21 layers and legacy tokens are unresolved at the declared-token level. D3 should use one design-token contract, feature-scoped components and visual regression testing.
6. **Accessibility is a release asset, not disposable polish.** Existing WCAG browser checks, keyboard focus, PWA offline tests and copy/recovery guarantees must remain green during all new animation/layout phases.

## 3. Current user journeys and redesign test questions

| Journey | Current verified application path | Design evaluation questions for D1 |
| --- | --- | --- |
| J1 · Solve | Workbench → input → Commit → context action → Worker result → reuse | Can the input/result/derivation live in a single reading flow? Can we execute a first operation without navigating catalog? |
| J2 · Explore | Save parameter/function → Visualize → select object → choose mode → adjust graph and parameters | Does the user's selected object/parameter persist across route movement? Do interactions occur directly on the mathematical representation? |
| J3 · Prove | Work → Proof → choose one-step/chain/logic → type → verify → inspect verdict | Can proof steps be individually selected, compared and explained without turning into a text-form UI? |
| J4 · Practice | Learn → Practice → course/concept → guided questions → hints → grading/review | Does the question dominate? Are errors explained near the work? Is progress secondary but visible? |
| J5 · Find tool | Work or Tools → search/filter → detail → configure/example → result | Are frequent actions available contextually, with advanced catalog as opt-in? |
| J6 · Reopen | Saved objects/worksheet → select or reload → recovery/checkpoints | Is the active document coherent and unmistakably saved? Does redesign preserve state? |
| J7 · Share | Create read-only snapshot → open shared page → explicit copy into my workspace | Are view/copy/import actions distinguishable, with no silent mutation? |
| J8 · Mobile | Bottom navigation → object drawer/input/keypad → plot/inspect | Can all critical tasks be completed one-handed without losing graph space? |

These are **source-derived flows**; no real user task time or success rate has yet been measured.

## 4. Provisional baseline ratings (source-informed, *not* screenshot or user-test scores)

Score: 1 very weak, 10 excellent. **These are design-risk estimates to prioritize D1/D2**, not objective measurements.

| Dimension | Provisional | Basis |
| --- | ---: | --- |
| Visual identity & differentiation | 4/10 | White/gray/blue generic vocabulary, recurring cards and same hero convention |
| Information hierarchy | 5/10 | Workspace/graph dominated by multiple regions rather than active problem |
| Interaction discoverability | 5/10 | Function-rich but multi-layer navigation and tool search |
| Graph presentation | 6/10 | Powerful SVG source, substantial toolbar/inspector clutter |
| Learning presentation | 5/10 | Functional sessions, heavy catalog/dashboard framing |
| Proof experience | 5/10 | Strong mathematical status logic, textarea-centric editing |
| Cross-screen consistency | 4/10 | CSS cascade and distinct phase-specific presentation systems |
| Motion coherence | 2/10 | No unified interaction/motion language |
| Phone-specific UX | 4/10 | Responsive adaptation, not independently designed phone interaction model |
| Accessibility engineering | 7/10 | Automated WCAG, reduced-motion and keyboard suites exist; manual AT unverified |
| Functional/math preservation baseline | 8/10 | Certified regression-tested math engine, but mathematical breadth remains bounded |

**Do not average these into a product rating.** Re-score on actual screenshots, observed task runs and human review.

## 5. D0 screenshot and review matrix

The automated script \`scripts/capture-d0-screenshots.mjs\` builds a repeatable **30-image rendered capture matrix**: seven routes × three viewports, plus the empty/saved-function Workbench states and optional graph-parameter/keypad states. CI uploads \`d0-visual-inventory\` with a JSON manifest and PNGs. The baseline is **local production build of the tested exact SHA**, not a marketing mockup.

| Device model | Viewport | Required views |
| --- | --- | --- |
| Desktop Chromium | 1440 × 900 | All seven routes; empty/saved workbench; dynamic graph; math keypad |
| Touch tablet emulation | 834 × 1194 | Same routes/states and landscape follow-up |
| Touch phone emulation | 390 × 844 | Same routes/states, keyboard focus and no horizontal overflow |
| Compact desktop | 1024 × 768 | Manual follow-up for cramped multi-column content |
| Narrow phone & large text | 320px / 200% zoom | Retain existing WCAG reflow gate; capture visual defects if any |
| Actual Android/iPhone/iPad | Physical | **Not covered** by emulator captures; issue #51 |

**Required screenshot-review checklist per state:** focal point; visible mathematical content above fold; header/control density; contrast; text size; formula clipping; button discoverability; tooltip/keyboard access; plot label density; empty/error states; source/result distinction; redundant chrome; responsive affordances. Record an image path, reviewer, score and issue for every flagged state. Never label a screenshot as inspected solely because the CI artifact exists.

Follow-up states requiring manual or later automated captures: error diagnostics; symbolic/numeric result; long matrices; 2D contour/3D scene; proof invalid/conditional verdict; timed exam question; reference technical article; import confirmation; offline and storage-error states; loading skeleton; share read-only provenance.

## 6. Preservation and safety requirements for D1–D23

- **Mathematics:** preserve all certified operation IDs and capability gates, AST semantics, exactness classifications, warnings, domain assumptions, symbolic vs approximate distinctions.
- **Data:** no IndexedDB schema break without staged migration/rollback, save verification, import/export parity and explicit recovery. No new cloud account dependency.
- **Navigation:** keep existing \`#/...\` links working; provide redirects/compatibility on any future route changes. Maintain keyboard command search and touch parity.
- **Performance:** lazily load specialized graph/learning/proof renderers; no WebGL mandatory path on low-end devices. Measure graph pan/zoom and parameter sweeps, not just first paint.
- **Accessibility:** retain semantic labels, skip navigation, WCAG 2.2 AA checks, contrast in both themes, focus restoration, readable MathML and reduced motion. Device/screen-reader acceptance continues separately in issue #51.
- **Exports:** ensure screenshot/PDF/vector output uses stable graph styling independent of the current UI theme and respects precision.
- **Release:** develop behind isolated branches with exact-head CI and merged-SHA production verification. Current v2.1 source baseline remains recoverable.

## 7. Mandatory D1 handoff

The following must be resolved **before** approving a v3 visual direction:

1. **Object-centric work model:** Which elements are persistent documents, which are transient selection/inspection, and how does the user move between input, derivation, graph and proof?
2. **Desktop shell:** Which tool surfaces are workspace modes versus distinct pages? Which inspectors are optional? Which controls can be direct actions?
3. **Mobile grammar:** Define a phone-first graph, math input, and calculation result composition independently of desktop.
4. **Graph studio:** Define canonical camera/axis/annotation/parameter controls and scene-renderer contract independent of React layout.
5. **Screen structure:** Eliminate decorative hero templates above working surfaces. Create distinct, purpose-built compositions for Workbench, Plotting, Proof, Practice and Reference.
6. **Design tokens:** Finalize canonical semantic tokens and remove undefined legacy variables with automated token-coverage checks; stop layering additional phase CSS.
7. **Animation policy:** Motion tokens specify duration, distance, interruption, reduced-motion semantics and truthful representation of mathematical state.
8. **D2 acceptance:** Three competing *implemented-state* high-fidelity directions, each with desktop Workbench, graph, Proof, Practice and phone modes—not just landing headers.

### D0 exit verdict

- [x] Inventory current routes, presentation components and style ownership.
- [x] Trace core user actions and preservation constraints from source/tests.
- [x] Document screen-specific UX risks, severity and redesign requirements.
- [x] Establish scoring rubric and screenshot capture/review matrix.
- [x] Implement repeatable screenshot script and CI artifact workflow.
- [x] Run screenshot capture, inspect first-fold rendered images and record findings in the companion screenshot report.
- [ ] Observe physical Android/iOS and assistive-technology usage (external issue #51).
- [ ] Human-approve a visual baseline before D2 selection.

**D0 is complete as a source-and-rendered-baseline audit.** Real-device, assistive-technology and human task research remain independent qualification gates.
