# M4 — Tools & Feature Discovery Acceptance

M4 is complete when MathLab's implemented mathematics can be discovered by task rather than by memorizing object types or the ContextPanel hierarchy.

## Required product behavior

- A first-class **Tools** route is present in desktop and mobile navigation.
- The catalog is derived from the actual P4–P13 operation IDs and spans Algebra, Calculus, Visualization, Linear Algebra, Analysis, Probability & Statistics, Discrete Math & Algorithms, Numerical Math & ODEs, and Proof & Verification.
- Every catalog tool exposes a label, category, phase, compatible object kinds, description, and valid example source.
- Search supports mathematical terminology and common aliases such as eigenvalue/spectrum, Gauss–Jordan/RREF, Bayes, Dijkstra, Big O/Theta, and RK4/Runge–Kutta.
- The current semantic object is evaluated against the real `capabilitiesFor(...)` result so tools show whether they are ready, configurable, incompatible, or example-only.
- A ready non-parameterized tool can execute directly from the catalog.
- A ready parameterized tool can open the existing Workspace Tools & Inspector controls without creating a duplicate parameter system.
- An incompatible/no-object tool can load a representative example into the Workspace.
- `Ctrl/Cmd + K` searches the same catalog in addition to pages and workspace objects.
- Proof-only discovery items route to Proof Lab rather than pretending to be normal object operations.
- The catalog does not claim unimplemented mathematical features.

## UX / responsive criteria

- Category filters remain horizontally scrollable rather than wrapping into an unreadable wall of controls.
- Tool details remain visible beside results on desktop and move above the result list on narrower layouts.
- Mobile primary navigation includes Tools while retaining access to all existing routes.
- The tool catalog remains usable without network access after the M4 PWA cache is installed.

## Regression gates

- Release audit passes.
- Full Vitest suite passes, including `tests/toolsDiscovery.test.ts`.
- TypeScript + Vite production build passes.
- Existing P4–P14 mathematical behavior is unchanged.
