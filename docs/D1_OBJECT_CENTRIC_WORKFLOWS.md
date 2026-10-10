# D1 — Object-centric workflows and interaction architecture

## Source and staging
D1 is stacked on qualified UI-N5 PR #59 at `544b6f3cdf49d063f99317cbfbbcdf795c4ae122`. N5 is not merged or deployed. Current main `31de7d8f5a3f97abf7c2b14d82d6a32d2f884d57` has `mathlab-production: failure` from run 37906597675. D0 design audit PR #54 remains separate. No claim is made that these external release gates are satisfied.

## User-visible contract
- The same saved mathematical object drives its context actions in Work; the object name and saved/temporary state are explicit.
- A saved graph-capable object can move from Work to Graph and back to its exact source, retaining the existing ID, assumptions and underlying worksheet. Temporary objects do not receive misleading saved-object affordances.
- Tools and Proof remain reachable from the current working context without recopying input. Saved objects can be browsed and dependencies reopened through explicit buttons.
- Graph presents a compact return-to-source control **after** the canvas, so no additional chrome pushes the graph below the first mobile viewport.
- On phones, initial mathematical input gains priority over redundant introductory description; N4 colors, visual baselines, plot renderers and accessibility remain unchanged.
- Switching to another saved object or starting new work clears the prior submitted context before showing actions. It does not commit or delete any source.

## Preservation and acceptance
- No database schema, parser, engine, worker, proof verdict, worksheet, sharing or service worker changes.
- New state is React UI-only; object ownership comes solely from the existing stored object registry. No network/account/telemetry dependency.
- Unit: saved vs temporary and graph applicability. Browser: saved Work→Graph→Edit→reload, Tools/Proof, new work context, 390px input/overflow. Existing suites remain authoritative for broader engine, CI and WCAG behavior.
- Automated device emulation is **not** actual Android/iOS/TalkBack/VoiceOver/NVDA acceptance. Q1 #51 and Q2 #52 remain OPEN.
- D2 is **not started**. Next: independently review multiple working-screen visual directions and select a design grammar with genuine screenshot/physical acceptance, without expanding math-engine claims.

## Release gate
Qualify the **exact D1 head** with full checks before calling source qualification complete. Do not merge, deploy or change production until explicitly authorized. Do not modify N4 goldens.
