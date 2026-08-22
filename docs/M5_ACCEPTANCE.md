# M5 — Visualization Reconstruction Acceptance

M5 rebuilds the P6 visualization experience without changing the deterministic mathematical engine.

## Required UX outcomes

- Visualization is a focused full-width workbench rather than a loose collection of controls and analysis cards.
- Up to six graphable one-variable objects can be toggled from a dedicated plot list.
- Each selected series has a persistent visual identity and can cycle through six color slots and solid/dashed/dotted line styles.
- The plot canvas exposes explicit Pan and Trace interaction modes suitable for pointer and touch use.
- Mouse-wheel zoom remains cursor-centered; toolbar zoom, Home and Fit Y remain available.
- Keyboard graph navigation supports arrow-key panning, plus/minus zoom and `0` reset.
- Users can edit x/y viewport bounds directly, with invalid ranges rejected before application.
- Grid, zeros, extrema, inflections, asymptotes/holes and trace overlays can be independently toggled.
- Trace mode exposes current x plus finite y-values for every visible series in an external readable panel as well as the in-canvas crosshair.
- Axes, tick labels, origin lines, series strokes, asymptotes, special points and the inline legend have a stronger mathematical visual hierarchy.
- Exact and numeric special-point annotations remain visually distinct.
- The old grid of repeated analysis cards is replaced by one focused series inspector with series tabs.
- The selected-series inspector shows the typeset function, variable, branch/sample counts, domain notes, special points and warnings.
- Persisted series can return directly to Workspace.
- SVG and PNG exports preserve series colors and line styles.
- Layout remains usable on tablet/mobile, with plot controls stacking rather than shrinking the graph into an unreadable column.

## Mathematical boundaries

- P6 sampling, discontinuity segmentation, exact calculus annotations and numeric fallbacks remain unchanged.
- M5 does not introduce 3D plots, surfaces, vector fields, contour plots, parametric plots or multivariable visualization.
- Unsupported mathematical objects are never coerced into misleading 2D plots.

## Release gate

Before merge, the pull request must pass:

1. `npm run audit:release`
2. `npm install --no-package-lock`
3. `npm run test`
4. `npm run build`

Dedicated M5 regression coverage validates line-style/color cycling, viewport validation, viewport round-tripping and annotation labels.
