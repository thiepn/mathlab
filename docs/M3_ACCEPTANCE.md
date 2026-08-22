# M3 — Workspace UX Reconstruction

## Goal

Turn MathLab's workspace from a permanently dense three-panel engineering interface into a focused mathematical workflow:

**input → live typeset preview → current object → suggested action → answer / steps**

Advanced controls remain available without permanently occupying the viewport.

## Acceptance criteria

- Workspace uses a two-column desktop layout: object library + mathematical work area.
- The right ContextPanel is not permanently visible.
- Advanced operations and object controls open in an explicit Tools & Inspector drawer.
- Non-workspace routes do not reserve workspace sidebars.
- The current mathematical object is summarized once in a compact card rather than repeated as another full-size preview.
- High-value operations are surfaced directly based on the resolved semantic object.
- Operations requiring additional parameters are not incorrectly presented as one-click actions.
- All available operations remain reachable through the Tools & Inspector drawer.
- Results retain Answer / Steps views and become the focused destination after a computation.
- Object relationships and assumptions use progressive disclosure.
- Export, import, and recovery are consolidated into a Workspace data menu.
- Workspace objects remain accessible on mobile through the existing drawer interaction.
- PWA cache version is rotated so deployed clients receive M3.
- Existing mathematical engine behavior is unchanged.
- Existing release audit, Vitest suite, and Vite production build pass.
- Dedicated M3 tests verify contextual action prioritization and controlled-operation exclusion.

## Keyboard

- `Ctrl/Cmd + K`: command palette.
- `Ctrl/Cmd + N`: new work.
- `Ctrl/Cmd + .`: toggle Tools & Inspector from the workspace.
- `Escape`: close transient workspace UI.
