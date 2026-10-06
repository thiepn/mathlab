# P6 — Dynamic Exploration

## Goal

Turn MathLab visualization from a static rendering destination into a linked mathematical exploration workspace.

P6 adds three synchronized representations of the same mathematical state:

1. **Formula** — the currently resolved AST after workspace bindings and temporary exploration parameters.
2. **Graph** — the existing deterministic visualization renderer driven by that resolved AST.
3. **Table / result** — sampled and point-evaluated values derived from the exact same resolved AST.

P6 does not create a second parser, graph engine, evaluator, or persistence model.

## Dynamic parameters

The P6 model lives in `src/app/dynamicExploration.ts`.

A visual parameter is any symbol in the selected visualizable object's value AST that is not one of the object's independent visualization variables.

For example:

```text
a := 2
f(x) := a*x^2 + b
```

The independent variable is `x`. P6 therefore exposes `a` and `b` as dynamic parameters.

If a matching scalar/expression already exists in the workspace, its numeric value seeds the slider. Otherwise the parameter begins from a bounded default value. Exploration overrides are temporary and never mutate the saved workspace object.

## Resolution order

The exploration AST is built deterministically:

```text
selected semantic object
  ↓
substitute ordinary workspace scalar/expression bindings
  ↓
apply temporary P6 parameter overrides
  ↓
resolved exploration AST
  ├─ graph renderer
  ├─ table sampler
  └─ point evaluator
```

Independent variables and actively overridden parameter names are protected from ordinary workspace substitution. This lets a workspace value seed a parameter while still allowing the slider to override it locally.

## Parameter controls

Each parameter exposes:

- numeric value entry;
- range slider;
- editable minimum;
- editable maximum;
- editable step;
- origin label indicating workspace-seeded or free parameter state;
- reset back to the current workspace/default seed.

Invalid ranges are rejected by the pure state update function. Values are clamped to the active slider range.

## Linked Cartesian exploration

Cartesian graphs gain explicit **Pan** and **Trace** interaction modes.

Trace mode publishes a `GraphTraceSnapshot` containing:

- current x-coordinate;
- current pointer y-coordinate;
- exact current values for every visible series;
- the presentation identity of each series.

P6 consumes this trace to update the linked result card.

The value table samples the current graph x-domain using the same graph-series ASTs. Selecting an x-value in the table sets the graph trace position, making the link bidirectional:

```text
graph trace → result
table row   → graph trace → result
parameter   → formula + graph + table + result
viewport    → graph + table
```

## Advanced visualization modes

Parameter substitution happens before every existing advanced renderer as well:

- parametric curves;
- polar curves;
- implicit curves;
- contours;
- scalar fields;
- vector fields;
- gradient fields;
- phase portraits;
- 3D graph surfaces;
- parametric surfaces.

The full table/result surface is currently meaningful only for Cartesian one-variable series, so non-Cartesian modes keep the live formula and parameter controls while using their existing renderer-specific summaries.

## GraphCanvas extension

`GraphCanvas` now accepts an optional controlled `traceX`.

This preserves existing pointer tracing while also allowing another linked surface, such as the table, to position the graph trace. The controlled trace is rendered only when it lies inside the current viewport.

Existing pan, zoom, keyboard and export behavior is unchanged.

## Accessibility and responsive behavior

P6 adds:

- labelled slider and numeric controls;
- keyboard-operable Pan/Trace controls;
- keyboard-selectable table x-values;
- a focusable scroll region for wide value tables;
- sticky table headers and x-column;
- responsive single-column exploration layout;
- forced-colors borders and active-row treatment.

The existing WCAG A/AA, 320px/200%-text, forced-colors, touch-target and device/browser gates remain mandatory.

## Non-goals

P6 does not:

- mutate workspace scalar values when a slider moves;
- persist exploration parameter overrides across sessions;
- add a spreadsheet engine;
- add arbitrary animation timelines;
- replace exact symbolic operations with sampled conclusions;
- add new mathematical domains;
- change the P4 capability registry;
- start P7 Wirtschaftsmathematik expansion.

## Acceptance gate

P6 is complete only when the exact branch head passes:

1. all existing release/E12/stable/accessibility/worksheet/input/P4/P5 audits;
2. the P6 dynamic-exploration audit;
3. pure parameter-resolution and linked-table unit tests;
4. complete existing unit regression suite;
5. strict TypeScript and production build;
6. browser acceptance for parameter → graph updates;
7. browser acceptance for table → graph trace linking;
8. full Chromium / Firefox / WebKit + phone/tablet matrix;
9. live custom-domain verification after merge.

No earlier gate is weakened.
