# P1 — Product-Shell Consolidation Acceptance

## Goal

Make MathLab read as one coherent mathematical product instead of six equal applications.

The user should decide between three intents:

1. **Work** — calculate, inspect, use tools and verify reasoning;
2. **Visualize** — explore mathematical objects visually;
3. **Learn** — practice, review and consult mathematical reference material.

P1 does not remove mathematical capability or break existing deep links.

## Information architecture

### Primary navigation

Exactly three primary destinations are presented:

- **Work** → `#/workspace`
- **Visualize** → `#/visualize`
- **Learn** → `#/practice`

Primary navigation identifies the active **section**, not an implementation route.

### Contextual navigation

Work owns:

- Workbench → `#/workspace`
- Tools → `#/tools`
- Proof → `#/proof`

Learn owns:

- Practice → `#/practice`
- Reference → `#/reference`

Visualize has no redundant secondary navigation.

### Route compatibility

All six existing hash routes remain directly resolvable. Browser bookmarks and links therefore remain compatible with the pre-P1 application.

## Desktop shell

- the sticky product header contains only Work / Visualize / Learn;
- the current Work or Learn subsection appears in a compact sticky contextual bar;
- Search remains global;
- connectivity and stable-release state remain visible without competing with navigation;
- the Workspace object rail remains scoped to the Workbench.

## Mobile shell

- the bottom navigation contains exactly Work / Visualize / Learn;
- Work and Learn subsection navigation remains available above the content;
- the object drawer remains available from Workbench without becoming a global hamburger menu;
- all primary/contextual controls meet the existing touch-target and reflow contracts.

## Accessibility semantics

- primary section navigation uses `aria-current="location"`;
- exact subsection navigation uses `aria-current="page"`;
- primary and contextual navigation have distinct accessible names;
- existing skip-link, focus, reduced-motion, forced-colors, 200% text and axe route gates remain required;
- no new page-level horizontal scrolling is permitted at certified viewport sizes.

## Search

The command palette reflects the new information architecture:

- Work and Learn are section-level destinations;
- Tools, Proof and Reference remain searchable direct destinations;
- mathematical tools and workspace objects remain searchable as before.

## Non-goals

P1 does not:

- merge route components into one monolithic component;
- redesign Practice content or Reference content;
- add worksheet history;
- add sliders/tables;
- change mathematical engines;
- change workspace persistence schemas;
- remove stable deep routes.

Those belong to later post-v2 phases.

## Acceptance gate

P1 is complete only when the exact branch head passes:

1. release audit;
2. E12 mathematical certification audit;
3. stable-release audit;
4. accessibility/device audit;
5. locked dependency install and security gate;
6. complete unit regression suite;
7. strict TypeScript and production build;
8. Chromium / Firefox / WebKit desktop matrix;
9. Android/iOS phone and Android/iPad tablet matrix;
10. consolidated-navigation behavioral checks;
11. axe A/AA route scans and 320px + 200% reflow;
12. post-merge GitHub Pages deployment and live custom-domain verification.
