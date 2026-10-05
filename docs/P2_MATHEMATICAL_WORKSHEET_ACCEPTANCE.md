# P2 — Mathematical Worksheet Acceptance

## Goal

Turn the Workbench from a transient “current input + current result” surface into a durable mathematical working record without replacing the semantic-object workspace.

P2 separates two local-first concepts:

- **Workspace state** — named mathematical objects, assumptions, dependencies, pins and object lifecycle.
- **Worksheet state** — chronological committed inputs and deterministic engine results grouped into sessions.

The worksheet is a mathematical calculation log, not a generic rich-text notebook.

## Persistent worksheet model

The worksheet stores:

- versioned worksheet state;
- multiple local sessions;
- one active session;
- chronological input entries;
- chronological successful result entries;
- links from results back to the input they were computed from when available;
- timestamps and session titles.

Storage keys:

- `worksheet:p2:default`
- `worksheet:p2:recovery`
- `worksheet:p2:checkpoints`

State is bounded to prevent unbounded browser-storage growth.

## Input entries

A successful Workbench commit creates an input entry containing:

- original semantic source;
- normalized source;
- recognized mathematical kind;
- associated object id/name when the commit produced a named object;
- creation time.

Invalid parses and semantic errors are not persisted as worksheet mathematics.

## Result entries

Every successful Worker-backed mathematical operation creates a durable result entry containing:

- operation id;
- original mathematical input;
- complete structured `MathResult`;
- exact/approximate/heuristic provenance;
- warnings;
- derivation steps;
- structured result sections where present;
- creation time.

If an operation is executed against a saved object that has no matching input entry in the active session, MathLab first creates a contextual input entry so the result never becomes an orphaned calculation.

Failed operations remain transient errors and do not pollute durable worksheet history.

## Active result vs history

The newest result remains visible in the existing full result panel while it is active.

The same result is already persisted in the worksheet but is temporarily omitted from the timeline to avoid duplicate presentation. When the active result is cleared or after reload, the durable worksheet result appears in chronological history.

## Reuse

Both committed inputs and deterministic results expose a **Use** action.

Using an entry:

- returns to Work;
- loads the selected mathematical source into the universal input;
- clears the previous active result;
- does not automatically mutate the semantic-object workspace;
- lets the user edit before committing.

This preserves user control and avoids treating historical output as an implicit definition.

## Sessions

Users can:

- create a new worksheet session;
- switch between existing sessions;
- rename the active session;
- clear the active session;
- preserve the shared semantic-object workspace across sessions.

Creating a new worksheet session does **not** delete saved mathematical objects or assumptions.

## Undo and redo

P2 provides bounded worksheet-level undo/redo.

Undo/redo covers worksheet mutations such as:

- added input/result entries;
- removed entries;
- session clearing;
- session-title changes;
- checkpoint restoration.

It intentionally does not replace native text-field undo and does not yet provide cross-object semantic undo for the separate named-object workspace.

Undo/redo history is session-scoped and bounded.

## Recovery and versions

Autosave keeps the previous persisted worksheet as a recovery snapshot.

Users can also create explicit manual checkpoints. A checkpoint stores an immutable copy of the active worksheet session and can later restore that session into the currently active slot.

The checkpoint list is bounded and stored independently from the current worksheet.

## Export and import

The worksheet can be exported as a versioned JSON packet:

```text
format: mathlab-worksheet
version: 1
worksheet: WorksheetState
```

Import validates format, version, size and structural boundaries before replacing local worksheet sessions. The previous autosave remains available through Recovery.

Workspace-object export remains separate so P2 does not silently change the established `mathlab-workspace` exchange contract.

## Accessibility and responsive behavior

The worksheet must preserve the existing WCAG 2.2 AA automated boundary:

- meaningful worksheet region name;
- keyboard-operable controls;
- visible focus;
- no page-level overflow at 320px + 200% text;
- usable controls in forced-colors mode;
- reduced-motion behavior remains intact;
- primary actions satisfy the existing touch-target gate;
- mathematical output continues to use native MathML.

Wide mathematics may scroll within its own bounded mathematical surface rather than expanding the document.

## Non-goals

P2 does not add:

- arbitrary rich text blocks;
- Markdown notes;
- images/files inside worksheet entries;
- collaborative/cloud editing;
- semantic-object undo/redo;
- full notebook programming cells;
- AI-generated calculation history;
- StudyOS notes/course management.

Those would violate the deliberately narrow mathematical worksheet boundary or belong to later phases.

## Acceptance gate

P2 is complete only when the exact branch head passes:

1. release audit;
2. E12 mathematical certification audit;
3. stable-release audit;
4. accessibility/device audit;
5. dedicated worksheet audit;
6. locked dependency/security gate;
7. complete unit regression suite including worksheet persistence;
8. strict TypeScript and production build;
9. Chromium / Firefox / WebKit matrix;
10. Android/iOS phone and Android/iPad tablet matrix;
11. worksheet persistence across browser reload;
12. result reuse;
13. worksheet undo/redo;
14. checkpoint/session workflows;
15. post-merge GitHub Pages deployment and live custom-domain verification.
