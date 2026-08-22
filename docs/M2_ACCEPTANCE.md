# M2 — Mathematical Typesetting Reconstruction

## Goal

Make mathematical notation a first-class visual language throughout MathLab. Mathematical values should render through the existing AST → native MathML pipeline whenever they can be represented safely, while prose, status labels, explanations, and editable source syntax remain normal interface text.

## Acceptance criteria

### Core renderer

- Existing AST mathematics renders with native MathML; no `innerHTML`, remote renderer, KaTeX, or MathJax dependency is introduced.
- Fractions use stacked MathML fractions, powers use superscripts, radicals use square-root notation, matrices use mathematical tables and brackets, and systems/sets remain structured.
- Symbol rendering supports common Greek identifiers, blackboard domains (`ℝ`, `ℂ`, `ℚ`, `ℤ`, `ℕ`), infinity, and identifier subscripts such as `a_n` and `x_1`.
- Supported calls gain mathematical forms where appropriate, including absolute value, floor, ceiling, and bounded sum notation.
- Rendered mathematics exposes a meaningful plain-text `aria-label`.

### Display-only values

- A bounded `displayMath` adapter attempts to upgrade safe mathematical display strings into the existing AST model.
- Exact rationals, equations/comparisons, short symbolic expressions, sets, matrices, coordinate/list values, and common mathematical constants are eligible for upgrade.
- Relations not represented by the core AST, such as arrows or membership, can be rendered structurally with MathML without changing the parser grammar.
- Ordinary prose such as `Unique solution`, theorem explanations, warnings, and status messages is not intentionally reclassified as mathematics.
- If a mathematical-looking value cannot be parsed safely, MathLab uses the mathematical font as a fallback rather than fabricating an AST.

### Result surfaces

- Primary answers render through the mathematical value component even when a result has only a display string and no `resultAst`.
- Structured result facts render mathematical labels/values through the same pipeline where appropriate.
- Before/after derivation lines use typeset mathematics; explanatory prose remains prose.
- Existing Copy and LaTeX actions remain available for AST-backed answers.

### Visualization

- Function expressions in the series rack and series analysis cards render mathematically.
- Graph coordinate ranges render as mathematical inequalities.
- Variables, mathematical feature labels, and supported real-domain notes use the mathematical value renderer.
- Graph sampling/rendering behavior and exact/numeric feature classification remain unchanged.

### Practice

- Exercise prompts, choices, hints, solutions, and grading feedback can contain inline typeset mathematical fragments while retaining normal prose around them.
- Mathematical expected answers and submitted exam answers receive dedicated typeset answer surfaces.
- Editable answer fields remain source-syntax inputs so grading behavior is unchanged.

### Proof Lab

- Source textareas remain editable deterministic input.
- Every current/proposed line, chain line, premise, conclusion, and explicit assumption receives a rendered mathematical preview underneath the editor.
- Verification logic and P13 proof statuses are unchanged.

### Styling and delivery

- Mathematical values use the M1 mathematical font stack and scale appropriately for primary answers, compact facts, derivations, graphs, Practice, and Proof Lab.
- Long mathematical output may scroll horizontally rather than being shrunk into unreadable text.
- Mobile mathematical output remains legible.
- PWA shell/runtime cache names are rotated to the M2 version so deployed clients do not stay on stale M1 CSS/JS.

### Regression / CI

- `tests/typesetting.test.ts` covers the display-string adapter, prose guard, exact rationals, set reconstruction, Unicode normalization, and nesting-aware list splitting.
- Pull requests to `main` now execute the release audit, dependency installation, Vitest suite, and production build before merge through `.github/workflows/ci.yml`.

## Correctness boundary

M2 is a presentation reconstruction, not a new CAS or full LaTeX parser. It does not reinterpret arbitrary English, arbitrary TeX, theorem prose, or unsupported mathematical notation into mathematical ASTs. When MathLab cannot identify a display value reliably, the content stays visible using a safe prose or math-font fallback. No mathematical engine algorithms, exactness semantics, grading rules, verification rules, or graph calculations are changed by M2.
