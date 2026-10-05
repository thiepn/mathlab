# P3 — Input & Interaction Acceptance

## Goal

Make MathLab mathematical entry fast on a keyboard, practical on touch devices, and structurally aware without replacing the deterministic linear parser with an opaque visual equation editor.

P3 keeps **linear mathematical source as the canonical editable representation** and adds interaction assistance around it.

## Keyboard-first editor

Universal Input must preserve direct typing and add:

- selection-aware structural insertion;
- automatic paired parentheses and brackets;
- wrapping selected text when an opening delimiter is typed;
- skipping an already-present closing delimiter;
- deleting an empty delimiter pair as one editing unit;
- Tab navigation to the next structural boundary when autocomplete is not active;
- Ctrl/⌘+Enter as an explicit commit shortcut;
- existing Enter-to-commit and input-history behavior;
- existing autocomplete with keyboard selection.

Native browser text editing remains available. P3 does not replace text-field undo/redo.

## Structured templates

Templates operate on the current selection/cursor and generate valid or intentionally editable MathLab source.

Required groups:

- **Basic** — fractions, roots, powers, absolute value, grouping and comparison operators;
- **Functions** — elementary functions;
- **Structure** — definitions, piecewise functions, systems, vectors, matrices, finite sets and compound conditions;
- **Data & probability** — datasets, distributions, combinations, conditional probability and IVPs;
- **Symbols** — common constants and Greek identifiers.

When a compatible template is applied to selected text, the selection is wrapped rather than discarded.

## Math keypad

The categorized keypad is optional assistance, not a separate input model.

Desktop:

- retains common quick-entry keys;
- exposes the full categorized keypad on demand.

Phone widths:

- hide the crowded row of individual quick keys;
- retain one clear **Math keypad** trigger;
- keypad keys become touch-friendly;
- categories remain horizontally navigable without page-level overflow.

The keypad inserts source back into the same Universal Input field and returns keyboard focus/cursor ownership there.

## Piecewise syntax

P3 introduces a first-class AST node:

```text
piecewise(value, condition; value, condition; otherwise)
```

Example:

```text
f(x) := piecewise(x^2, x < 0; 2x + 1, x >= 0)
```

Conditions may be:

- comparisons such as `x < 0`, `x >= 2`, `x != 1`;
- equalities such as `x = 0`;
- condition combinations using `and(...)`, `or(...)`, `not(...)`, `xor(...)`, `implies(...)`, or `iff(...)`.

The parser rejects malformed branches rather than degrading them into generic calls.

## Piecewise semantics

Piecewise values participate in:

- symbol/dependency collection;
- domain inference from branch values;
- substitution;
- simplification;
- native MathML cases rendering;
- LaTeX cases export;
- plain-source reconstruction;
- exact point evaluation when the selected condition can be decided;
- numeric graph evaluation.

Constant-false branches may be removed during simplification; a constant-true branch may collapse the piecewise expression.

## Capability boundary

P3 intentionally does **not** claim general symbolic piecewise calculus.

For piecewise functions the stable UI enables:

- **Evaluate function**
- **Graph**

Other global symbolic operations remain unavailable with an explicit reason until branch-boundary continuity/differentiability/integration rules receive their own correctness work.

This prevents a visually valid piecewise function from silently entering symbolic algorithms that were only certified for elementary single-expression functions.

## Visualization boundary

Graph evaluation selects the first true branch at each sampled input and falls back to an optional otherwise branch.

If no condition can be decided or no branch applies, the evaluator returns an undefined/non-finite sample rather than inventing a value.

## Accessibility

P3 must preserve the existing WCAG 2.2 AA automated boundary:

- keypad has an accessible region name;
- category controls use tab semantics;
- all keypad functionality is keyboard operable;
- touch keypad targets satisfy the existing minimum target gate;
- 320px + 200% text remains free of page-level horizontal scrolling with the keypad **open**;
- forced-colors styling keeps selected keypad states visible;
- native MathML remains the mathematical preview/output surface.

## Non-goals

P3 does not add:

- a contenteditable/WYSIWYG equation editor;
- drag-and-drop equation construction;
- arbitrary LaTeX parsing;
- handwriting/OCR input;
- symbolic differentiation/integration of general piecewise functions;
- branch-aware theorem proving;
- rich notebook cells.

Those require separate correctness and product work.

## Acceptance gate

P3 is complete only when the exact branch head passes:

1. release audit;
2. E12 mathematical certification audit;
3. stable-release audit;
4. accessibility/device audit;
5. worksheet audit;
6. dedicated P3 input/interaction audit;
7. complete unit regression suite including structured-editor and piecewise tests;
8. strict TypeScript and production build;
9. Chromium / Firefox / WebKit desktop matrix;
10. Android/iOS phone and Android/iPad tablet matrix;
11. selection wrapping and keyboard-shortcut browser tests;
12. piecewise template/commit browser test;
13. keypad-open 320px + 200% reflow;
14. keypad touch-target certification;
15. post-merge live custom-domain keypad/piecewise verification.
