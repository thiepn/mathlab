# P3 Acceptance — Core Workspace

P3 converts the P2 semantic model into a persistent daily-use mathematical workspace. It deliberately does not add symbolic or numerical computation.

## Implemented

### Durable vs temporary work

- named definitions are persistent workspace objects;
- anonymous expressions/equations are temporary scratch objects;
- scratch work does not fill the object sidebar or long-term storage;
- selecting a saved object reopens its source in the universal input editor.

### Object lifecycle

- select/reopen;
- update by recommitting the same named definition;
- rename;
- rename propagates through dependent definitions and object-scoped assumptions;
- duplicate with collision-safe names (`A_2`, `A_3`, ...);
- pin/unpin;
- delete with dependency warning;
- pinned objects sort ahead of ordinary objects.

### Relationships

- direct dependencies shown as `Depends on`;
- direct reverse dependencies shown as `Used by`;
- object assumptions remain visible;
- deletion warns when another saved object references the target.

### Activity and navigation

- persistent recent-activity stream for create/update/rename/duplicate/delete/assumption/import events;
- activity entries can reopen surviving objects;
- `Ctrl/Cmd + K` searches commands and saved objects;
- `Ctrl/Cmd + N` starts new scratch work;
- command palette supports keyboard navigation.

### Persistence and recovery

- P3 workspace schema (`version: 3`);
- automatic P2-to-P3 migration;
- debounced IndexedDB autosave;
- visible saved/saving/error state;
- previous autosave snapshot retained for recovery;
- recovery action restores the previous snapshot;
- invalid active/pinned IDs are normalized away.

### Import/export

- complete workspace JSON export;
- explicit `mathlab-workspace` packet format;
- versioned import validation;
- malformed/unrelated JSON rejected rather than guessed;
- imported data becomes normal locally persisted state.

### Responsive UI

- object lifecycle remains available on mobile;
- sidebar remains an off-canvas drawer on narrow screens;
- context panel reflows below the workspace on mobile;
- workspace transfer controls wrap rather than overflow.

## Deliberately deferred

- actual CAS/numerical evaluation;
- mathematical result history (there are no computed results yet);
- notebooks and courses;
- cloud sync/accounts;
- undo/redo beyond the one-step recovery snapshot;
- transitive dependency graph visualization;
- advanced object folders/tags.

## Verification

- core TypeScript math/storage/worker layer compiles in strict mode;
- deterministic P3 lifecycle regression script passes;
- Vitest coverage added for rename propagation, dependency lookup, duplication and import/export;
- real Vite/Vitest execution still requires normal npm dependency installation.
