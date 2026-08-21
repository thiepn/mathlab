# M1 — Visual & Typography Reconstruction

## Goal

Raise MathLab from an engineering-prototype visual system to a readable, coherent university mathematics workspace without changing mathematical behavior.

## Acceptance criteria

### Typography

- Primary UI text uses an offline-safe system-first font stack.
- Math uses a dedicated mathematical font stack headed by Cambria Math / STIX Two Math equivalents.
- No primary UI token is below ~13 px at the default browser font size.
- Body/input text is approximately 15–16 px or larger.
- Display mathematics is visually dominant over surrounding metadata.
- Headings use a distinct display stack and stronger scale/hierarchy.

### Workspace hierarchy

- Universal input is the visually strongest interactive control.
- Live mathematical preview has a distinct surface and larger mathematical type.
- Results have a clear answer surface, exactness metadata, warning treatment, and readable structured facts.
- Steps are visually separated and mathematical before/after states are larger than rule metadata.
- Object and context sidebars remain available but are visually subordinate to the central workspace.

### Visual system

- Canvas, paper panels, active states, cards, errors, warnings, and exact-result accents use consistent tokens.
- Thin-border density is reduced by selective cards, spacing, and surface contrast.
- Geometry stays restrained and structural rather than pill-heavy.
- Command palette and learning/reference pages share the same design language.

### Responsive

- Mobile retains 16 px base readability.
- Input remains usable at 320 px width.
- Mobile primary navigation uses all five application routes.
- Math/result surfaces allow horizontal overflow where necessary rather than shrinking mathematics to unreadable sizes.
- Touch targets remain compatible with P15 accessibility hardening.

### Offline / PWA

- No remote font dependency is introduced.
- PWA cache names rotate for M1 so deployed clients receive the reconstructed CSS immediately.

## Deliberate boundary

M1 changes presentation only. It does not solve the separate M2 requirement of guaranteeing structured mathematical typesetting for every result fact that currently exists only as a plain display string.
