# P8 — Sharing & Collaboration

## Goal

P8 gives MathLab a collaboration model that fits its current local-first, static-hosted architecture.

It does **not** pretend GitHub Pages is a realtime collaboration backend. Instead P8 adds immutable, verifiable snapshots that can be reviewed read-only and deliberately copied into another user's local MathLab.

## Collaboration model

```text
local workspace + optional current worksheet
                │
                ↓
        immutable share snapshot
                │
        SHA-256 integrity digest
                │
       ┌────────┴────────┐
       ↓                 ↓
 compact URL        snapshot file
 fragment           (.json fallback)
       │                 │
       └────────┬────────┘
                ↓
       read-only share viewer
                │
        explicit local copy
                ↓
  editable workspace + shared session
```

No snapshot automatically edits local work.

## Share snapshot

The canonical format is `mathlab-share` version 1.

It contains:

- creation time;
- user-provided title;
- optional collaboration note;
- normalized workspace objects and assumptions;
- pins / active-object context;
- optional current worksheet session;
- SHA-256 integrity digest.

Local workspace activity history is intentionally removed before sharing.

Worksheet results retain deterministic structured result data, including exact `BigInt` payloads through MathLab's tagged JSON representation.

## Link sharing

Compact snapshots are encoded entirely in the URL fragment:

```text
https://thiepn.dev/mathlab/#/share/<base64url-snapshot>
```

The fragment is not part of the HTTP request sent to the static host. MathLab therefore does not upload the snapshot to a server merely to generate or open a link.

P8 deliberately uses a conservative encoded-token limit of 24,000 characters. Larger snapshots fall back to a downloadable shared-snapshot file rather than producing fragile giant URLs.

## File sharing

Every snapshot can be downloaded as JSON.

The Share route can also be opened without a token, providing a file-open surface for snapshots received through email, chat, Drive, Dropbox, GitHub, or another transport.

Both link and file paths use the same parser, validation limits and SHA-256 verification.

## Read-only review

The shared-snapshot page shows:

- title and note;
- creation time;
- verified integrity state;
- object count and assumptions;
- all shared named mathematical objects;
- dependencies and exactness;
- included assumptions;
- optional worksheet inputs/results.

There is no mathematical editor or mutation control on this surface.

## Copy boundary

A recipient must explicitly select **Copy into my MathLab**.

MathLab still has one local workspace, so P8 does not silently merge two arbitrary assumption systems. The copy operation replaces the editable workspace with the shared workspace snapshot.

This is deliberate because naïve merging can change the semantics of existing objects through:

- colliding named definitions;
- global/free-variable assumptions;
- dependency graphs;
- object identifiers.

The existing workspace persistence protocol writes the previous local workspace to Recovery when the copied snapshot autosaves, so the prior workspace remains recoverable.

If the snapshot includes a worksheet, it is appended as a **new local worksheet session** with fresh session, entry and result IDs. Existing local worksheet sessions are preserved.

## Security and trust boundary

A shared snapshot is treated as untrusted input.

Before display or copy, P8:

1. enforces the 5 MB snapshot limit;
2. validates outer format/version metadata;
3. validates workspace content through the existing workspace import contract;
4. validates worksheet content through the existing worksheet import contract;
5. recomputes the SHA-256 digest;
6. rejects any digest mismatch.

React rendering escapes title/note content, while mathematical source is routed through MathLab's parser/typesetting stack rather than inserted as HTML.

The digest provides integrity/tamper detection, not sender identity or cryptographic authorship.

## Non-goals

P8 does not add:

- realtime multi-user cursors;
- shared server persistence;
- user accounts;
- access-control lists;
- comments stored on a server;
- mutable shared documents;
- automatic conflict resolution;
- background syncing.

Those require a durable collaboration backend and identity model and should be introduced only as a separate architecture decision.

## Accessibility

P8 includes:

- labelled share fields and file inputs;
- keyboard-operable share/copy/download controls;
- read-only mathematical overflow regions reachable by keyboard;
- responsive phone/tablet shared-snapshot layouts;
- forced-colors boundary preservation.

The existing full accessibility/device certification matrix remains mandatory.

## Acceptance gate

P8 is complete only when the exact branch head passes:

1. every existing release/E12/stable/accessibility/worksheet/input/P4/P5/P6/P7 audit;
2. the P8 sharing/collaboration audit;
3. share protocol unit tests;
4. SHA-256 tamper-rejection tests;
5. BigInt worksheet result round-trip tests;
6. link-size/file-fallback tests;
7. read-only share-link browser acceptance;
8. explicit copy + Recovery browser acceptance;
9. full Chromium / Firefox / WebKit and phone/tablet matrix;
10. production build and dependency-security gate;
11. GitHub Pages deployment;
12. live custom-domain verification.

No earlier correctness or accessibility gate is weakened.
