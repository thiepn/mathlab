# P1 — Universal Mathematical Input Acceptance

Status: **Implemented**

## Acceptance gates

- [x] Deterministic tokenizer with source-positioned tokens.
- [x] AST parser for numbers, symbols, unary operators, arithmetic, powers, calls, equations, vectors and matrices.
- [x] Correct conventional precedence, including `-x^2` and right-associative powers.
- [x] Implicit multiplication for forms such as `3x`, `2(x+1)` and `(x+1)(x-1)`.
- [x] Common function syntax such as `sin(x)`, `sqrt(x)`, `ln(x)` and `f(x)=...`.
- [x] Unicode mathematical identifiers such as `λ`, `α` and `β`.
- [x] Common LaTeX paste normalization for `\\frac`, `\\sqrt`, `\\pi`, `\\cdot`, `\\times`, `\\left`, `\\right`, and braced powers/subscripts.
- [x] Unicode normalization for minus, multiplication, division, π, ² and ³.
- [x] Live MathML preview generated from the AST rather than raw input HTML.
- [x] Inline diagnostics with source offsets for malformed input.
- [x] Autocomplete for common mathematical functions and constructs.
- [x] Keyboard helpers and input-history recall.
- [x] Input history persisted locally through the P0 IndexedDB layer.
- [x] Copy normalized result as LaTeX.
- [x] Current input classification drives the context inspector.
- [x] Computation actions remain explicitly locked; P1 does not fabricate results.

## Intentionally deferred

- Symbol-table-aware arbitrary user-defined function calls: P2.
- Full mathematical object semantics and assumptions: P2.
- General-purpose LaTeX grammar: later input hardening; P1 supports the common subset above.
- Algebraic computation and equation solving: P4.
- Calculus computation: P5.
- Matrix computation: P7/P8.
- Proof parsing: P13.
