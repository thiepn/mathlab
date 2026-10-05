# P4 — Unified Capability Architecture

## Goal

Create one public capability contract for every MathLab surface that exposes mathematical operations.

Before P4, MathLab had several overlapping authorities:

- runtime capability modules decided whether operations applied to an object;
- the tool catalog decided labels, examples, aliases and search metadata;
- Workspace had a separate preferred-action order;
- configuration state lived in another operation list;
- Reference mapped courses to tool categories independently;
- Practice had no direct link to the engine capability map;
- command search read the catalog directly.

Those systems were individually useful but could drift.

P4 introduces `src/app/capabilityRegistry.ts` as the single public composition layer.

## Canonical descriptor

Each registry descriptor owns the stable user-facing metadata for one capability:

- registry id;
- engine operation id;
- label;
- category;
- implementation phase;
- compatible semantic object kinds;
- description;
- example input;
- aliases;
- optional dedicated route;
- normalized search text;
- whether configuration controls are required;
- preferred Workspace rank;
- associated learning course ids.

The phase-specific catalog files remain internal metadata providers during this migration. Public product surfaces do not read them directly.

## Runtime availability

Mathematical applicability remains owned by the deterministic engine capability modules.

The registry combines that runtime state with canonical metadata:

```text
semantic object
  ↓
runtime capability providers
  ↓
applicability / availability / reason
  +
canonical capability registry
  ↓
resolved capability
```

This separation is intentional:

- engine modules answer **can this operation run on this object?**
- the registry answers **what is this operation and how should the product expose it?**

Runtime labels or phase strings are not treated as user-facing metadata once a canonical registry descriptor exists.

## Public consumers

The following surfaces must consume the registry directly:

- **Workspace suggested actions**
- **Workspace contextual action panel**
- **Tools**
- **Command/search palette**
- **Reference**
- **Practice course capability coverage**
- top-level application tool routing

Legacy `allToolCatalog.ts` and course-tool helpers remain compatibility shims only.

## Workspace

Workspace resolves the current semantic object through `resolveCapabilitiesForObject`.

The registry supplies:

- canonical label;
- operation id;
- preferred rank;
- configuration requirement;
- canonical product category/description.

The runtime capability provider supplies:

- fine-grained action group;
- applicable state;
- available state;
- reason when unavailable.

Workspace dispatches the **operation id**, never the registry id.

This allows future aliases or dedicated registry entries without coupling engine dispatch to catalog identity.

## Tools and Search

Tools and command search share the same registry array and normalized search text.

An operation added to the registry becomes searchable without maintaining a separate command-palette index.

Tool configuration state also comes from the descriptor instead of being recomputed inside Tools.

## Reference and courses

Course ownership is defined once through `COURSE_CAPABILITY_CATEGORIES`.

Reference and Practice both query `capabilitiesForCourse(courseId)`.

The calculus course deliberately includes:

- Calculus;
- Vector Calculus;
- Visualization.

This fixes the former split where vector-calculus capabilities existed in MathLab but were excluded from course-scoped Reference views.

## Practice

P4 does not rewrite the exercise curriculum; that belongs to P5 Learning v2.

Practice now reads the registry for course engine coverage so the course surface can truthfully state how many deterministic tools belong to the selected course.

P5 can build concept/exercise-to-capability relationships on top of this registry instead of inventing another tool map.

## Compatibility providers

The following remain internal providers during P4:

- `toolCatalog.ts` and E4–E11 tool catalog fragments;
- `capabilities.ts` and E5–E11 runtime capability providers;
- `workspaceOperations.ts` operation-control/ranking policy.

They are composed by the registry. New public UI must not import them to discover capabilities.

Future cleanup may move their raw records physically into registry-domain files, but P4 does not rewrite proven math/applicability logic solely for file-layout purity.

## Integrity guarantees

P4 certification checks:

- unique registry ids;
- unique operation ids;
- nonempty labels, descriptions, examples and phase metadata;
- every product category is represented;
- every runtime capability emitted by representative semantic objects has registry metadata;
- every normal executable registry entry is backed by a runtime capability for its own example;
- legacy all-tool catalog delegates to the registry;
- legacy course-tool mapping delegates to registry course ownership;
- all public consumers import the registry directly.

If a future engine operation ships without registry metadata, runtime resolution keeps a defensive fallback so mathematical functionality is not silently hidden. The P4 release tests nevertheless fail so the release cannot be certified with that gap.

## Non-goals

P4 does not:

- change mathematical algorithms;
- redesign the Tools UI;
- create the P5 concept/course model;
- add new exercises;
- change result provenance;
- remove historical implementation phase files purely for aesthetics.

The phase is an architectural convergence and product-consistency change.

## Acceptance gate

P4 is complete only when the exact branch head passes:

1. release audit;
2. E12 mathematical audit;
3. stable-release audit;
4. accessibility/device audit;
5. worksheet audit;
6. input/interaction audit;
7. P4 unified capability audit;
8. registry parity unit tests;
9. complete existing unit suite;
10. strict TypeScript and production build;
11. full Chromium / Firefox / WebKit + phone/tablet matrix;
12. existing live production verification after merge.
