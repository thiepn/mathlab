# D0 · Rendered screenshot review and measured scroll-depth baseline

**Captured:** 2026-10-08 · production Vite bundle on PR #54  
**Source baseline:** \`main\` at \`6265f651d90101e74b530d75616b5caffba26c22\` (D0 branch only adds audit files and capture tooling)  
**GitHub Actions:** https://github.com/thiepn/mathlab/actions/runs/37824921342  
**Artifact:** \`d0-visual-inventory\` — **30 PNG files plus manifest.json**; screenshot job **passed**, with **0 capture errors**.

The automated capture uses Chromium at desktop 1440×900, simulated tablet 834×1194 and simulated phone 390×844; mobile screenshots have device-pixel scaling, while the measured page heights below are in **CSS pixels**. Capture used a real production build with persistent mathematical objects \`a := 2\` and \`f(x) := a*x^2+1\`. It is not a real-hardware test or a substitute for manual accessibility validation.

## A. Quantitative baseline: document height / vertical navigation burden

| Screenshot state | Desktop 1440×900 | Tablet 834×1194 | Phone 390×844 |
| --- | ---: | ---: | ---: |
| Workbench, empty | 1,409px | 1,840px | 2,077px |
| Workbench, saved function | 2,081px | 2,516px | 3,104px |
| Visualize, plotted function | 2,116px | 2,623px | 3,323px |
| **Tools catalog** | **22,960px** | **23,489px** | **33,822px** |
| Proof Lab | 2,605px | 3,104px | 4,785px |
| Practice | 2,225px | 3,705px | 3,911px |
| **Reference** | **43,219px** | **58,541px** | **89,105px** |
| Share empty/import | 901px | 1,195px | 909px |
| Dynamic graph state | 2,116px | 2,623px | 3,323px |
| Workbench with keypad | 2,326px | 2,858px | 3,545px |

All 30 captured states reported **0 page-level horizontal overflow** by the manifest's \`documentWidth > viewportWidth + 1\` check. This does **not** certify all child panels, zoom scenarios, keyboard focus or real devices.

**Critical evidence:** The catalog/reference pages are not merely a little long; their default layouts generate tens of thousands of pixels of vertical content. They require substantial scrolling and make search/focus essential. D1 must redesign list virtualization, grouping, progressive disclosure, search/navigation and reading structure rather than adjusting spacing alone.

## B. Screenshot-observed above-the-fold findings

All statements here refer to directly inspected **rendered screenshots** from the artifact, not just React source.

### Desktop 1440×900

- **Workbench:** a left object explorer plus centered heading, input, preview and current-work card dominate; entry is functional but visually resembles a generic developer/dashboard interface.
- **Graph:** a large title/intro and metric block precede a dense object rail + toolbars + inspector; axes and curve are visible within the first fold, but graph area does not dominate the screen.
- **Tools:** heading/intro and context badge precede search/category filters, then a large flat tool-list and details layout. The hierarchy prioritizes description of the catalog over using the selected operation.
- **Proof:** explanatory hero and a mode chooser precede the actual mathematical proof editor. The work has not yet become the visual hero.
- **Practice:** title and stats precede course-navigation UI. No solving problem dominates the initial frame.
- **Reference:** large explanatory title and breadth/maturity audit lead; the substantive reference requires scrolling, and default catalog content produces a 43,219px document.
- **Share:** the empty/direct-entry state has a straightforward upload action; preserve its explicit read-only/copy boundary.

### Phone 390×844

- **Graph is not visible in the first viewport.** Header, a multi-line hero, explanatory paragraph and a tiny metrics region occupy the first screen; the object list begins near the fold. This directly contradicts a graph-first mobile experience.
- **Tools:** hero, explanatory text, current-object card and search UI occupy much of the first viewport; routine operations and selection details require scrolling. Default document height is 33,822px.
- **Reference:** the huge title/explanation displaces the search and actual reference content; default document height is **89,105px**. This is the most severe information-architecture issue revealed in D0.
- **Proof:** title, paragraph and status key lead; editable proof lines are below the first viewport.
- **Practice:** large title/explanation precede course/session actions and exercises. A math exercise does not lead the phone experience.
- **Workbench:** mathematical input is at or near the bottom of the first frame behind a large header/intro/state/action area. A user launching the tool for a calculation must scan before interacting.
- **Share:** upload/action state is concise and serviceable; avoid adding needless dashboard chrome to this route.
- **Fixed bottom navigation** is visible in screenshot crops; preserve accessible direct switching but account for safe-area/scroll spacing.

### Tablet 834×1194

- Tablet views visually inherit substantially the same hierarchy as desktop, with narrower regions. The graph still competes with heading and control chrome; no clearly purposeful pen/touch-centric composition is established. Test landscape and keyboard interaction separately during D20.

## C. Visually evidenced top priorities

| Priority | User-facing redesign requirement | Check on next prototypes |
| --- | --- | --- |
| **P0** | The phone Graph screen must show **actual axes/plot content in its first viewport**, or enter an explicitly graph-focused mode without a hero above it | 390×844 baseline capture + real phone |
| **P0** | The phone Workbench must put **mathematical input and live math** ahead of intro copy; tool/result visible in coherent document flow | Empty, function and computed-result captures |
| **P0** | Tools must stop rendering a giant default flat catalog as the primary page experience | Search relevance, grouped filtered results, keyboard access and scroll-depth measures |
| **P0** | Reference must stop producing a near-90,000px phone page on the default state | Search/content navigation, bounded page height, virtualization/progressive loading where appropriate |
| **P1** | Proof should show a mathematical line/editable derivation in the first phone viewport | Before/after and failed-verification states |
| **P1** | Practice should show its primary next action/question in the first phone viewport | Course select, review due and active-question states |
| **P1** | Graph should emphasize curve/axes/parameters rather than toolbar density | Desktop and tablet before/after at 1440×900 and 834×1194 |
| **P1** | Consolidate CSS and eliminate unresolved legacy variables; no overlay theme file | Undefined-variable scanner and visual-diff checks |

## D. Initial visual judgement (subjective, based on inspected captures)

- **Differentiation:** ~4/10. Existing light theme is competent but generic, with blue section labels and similar white cards across distinct tasks.
- **Desktop first-fold mathematical focus:** ~5/10. Graph partially succeeds; Workbench and learning contexts make the user navigate interface scaffolding first.
- **Phone first-fold mathematical focus:** ~2–3/10. Math activity in Workbench/Graph/Proof/Practice is repeatedly postponed below introductory content.
- **Catalog/reference information architecture:** ~2/10 on default phone state due to severe vertical growth. This is **not** a measured task-failure rate.
- **Layout reflow:** Current captured states **passed a narrow automated overflow check**; do not equate that with comfortable reading or WCAG certification.

These numbers are **auditor visual judgements**, not statistical UX research or a replacement for D2 human selection.

## E. Remaining visual-evidence gaps

- Screenshot images were taken from a locally built exact source commit, **not a remote screen recording of the deployed custom-domain production site**.
- The full-page Tools/Reference screenshots are extremely tall; this review examined first-fold crops and manifest metrics, **not every individual entry in the entire image**.
- No screenshot here proves hover, focus, gesture fluidity, calculation time, 200% zoom, real screen-reader output or actual iOS Safari graphics.
- Next screenshot protocol should add **viewport-only** PNGs in addition to full-page screenshots: this prevents enormous images and makes first-fold comparisons meaningful. Include relevant interaction states, especially active practice questions, proof results and graph inspector variations.
- External Q1 device qualification remains open at https://github.com/thiepn/mathlab/issues/51.

## F. D0 decision / D1 handoff

The D0 review supports the v3 information-architecture overhaul. **Do not implement yet another header/theme-only patch.**

D1 needs separate screen grammars for: a mathematical document/editor, direct manipulation plotting canvas, focused proof verification, single-task practice session, searchable/reference reading system, and compact tool discovery. The most important measurable redesign win will be dramatically more mathematical content and fewer introductory paragraphs visible on **the first phone viewport**, alongside a reduction in default catalog/reference page depth.

**D0 status:** Source audit + rendered screenshot review completed for baseline screen states. Human/device UX acceptance and D2 direction lock remain future gates.
