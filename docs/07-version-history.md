# 07 — Version History & Time Travel

Requirement F3: users capture **snapshots**, see a **timeline** of past versions, and **restore** a
previous state **safely — without corrupting the current shared document for other active
collaborators.** That last clause is the subtle part and the whole point of this doc.

## 1. Concepts

| Term                 | Meaning                                                                                  |
| -------------------- | ---------------------------------------------------------------------------------------- |
| **Snapshot**         | A captured point-in-time of a document: enough to _materialize_ its content then.        |
| **Version timeline** | The ordered list of a document's snapshots, shown in the UI.                             |
| **Preview**          | Render a read-only view of the document _as of_ a snapshot, without changing live state. |
| **Restore**          | Make the live document's content equal a chosen snapshot's content — non-destructively.  |

In Yjs terms a snapshot is captured two ways, both stored in `DocumentSnapshot` ([04](./04-data-model.md)):

- `state` = `Y.encodeStateAsUpdate(doc)` — a full materialized update (can reconstruct the doc alone).
- `snapshot` = `Y.snapshot(doc)` — a compact `{ state vector, delete set }` that, combined with the
  live doc's history, can render "the document as it was" via `Y.createDocFromSnapshot` /
  `snapshot`-aware rendering.

## 2. The naive (wrong) restore and why it corrupts collaborators

A tempting implementation: _"restore = overwrite the document's state with the snapshot's bytes."_

This **rewinds the shared CRDT**. Problems:

- Other collaborators' `Y.Doc`s are still at the newer state. Replacing the server doc with old bytes
  creates **divergence**: their state vector is now "ahead" of a doc that pretends to be "behind."
- Worse, you can resurrect tombstoned content or drop newer items in ways that **break convergence
  guarantees** — the exact corruption the requirement warns against.
- It races with in-flight edits (someone typing during the restore).

So we never rewind. We **move forward.**

## 3. Safe restore = forward transaction (the correct model)

Restore is modeled as **a new edit that transforms the _current_ document into the _target_ content**:

```
let target  = materialize(snapshot)          // the content we want to return to
let current = live document content
let diff    = computeChange(current → target) // a ProseMirror/Yjs transaction
apply(diff) as a normal Yjs update            // tagged origin = "restore:<snapshotId>"
```

Because the restore is _just another update_, it:

- **Flows through the same sync path** — broadcast to all peers, appended to the log, merged by the
  CRDT like any edit. Everyone converges to the restored content.
- **Preserves history** — the pre-restore state is still in the log/snapshots; you can "undo the
  restore" by restoring the snapshot taken just before it.
- **Never rewinds** the shared op log, so no divergence, no resurrected tombstones, no broken
  guarantees.
- **Composes with concurrent edits** — if someone types during/after restore, those edits merge on
  top deterministically (and we auto-snapshot just before restoring, so nothing is "lost").

```mermaid
sequenceDiagram
  participant U as User
  participant App as Next.js (REST)
  participant WS as Sync server (room)
  participant P as Postgres

  U->>App: POST /documents/:id/versions/:snap/restore
  App->>App: authz (Owner/Editor only)
  App->>WS: restore(docId, snapshotId)
  WS->>P: load snapshot.state  (+ create AUTO snapshot of current "pre-restore")
  WS->>WS: target = materialize(snapshot); diff = current → target
  WS->>WS: apply diff as a normal update (origin="restore")
  WS-->>U: broadcast update to all peers (everyone converges)
  WS->>P: append restore update to log
  Note over WS,P: history intact; restore is itself reversible
```

> **Where restore runs.** Authoritatively in the **room on the WS server**, so the shared doc and all
> connected peers get one consistent forward update. The REST endpoint authorizes and delegates;
> doing the diff only in one client would race with others. If the doc has no active room, the server
> spins one up, applies the restore, persists, and tears down.

## 4. Capturing snapshots

- **Manual** ("Save version"): user clicks; we store `state` + `snapshot` with a `MANUAL` kind and an
  optional label. Optionally **AI-named** (see [10](./10-ai-features.md)) — e.g. "Rewrote intro,
  added pricing table."
- **Automatic**: lightweight `AUTO` snapshots on a cadence/heuristic (e.g. every N updates or T
  minutes of activity, or right before a restore) so the timeline is useful even if the user never
  clicks "save."
- **Compaction** (`COMPACTION` kind): internal, folds the update log into a base state to bound
  storage — same table, hidden from the user timeline ([11](./11-performance-and-scale.md)).

## 5. Preview without committing

The timeline lets the user **preview** any snapshot read-only before restoring:

- Render from `Y.createDocFromSnapshot(liveDoc, snapshot)` (or a detached `Y.Doc` built from
  `snapshot.state`) into a **non-editable** Tiptap instance.
- Optionally show a **diff** between the snapshot and the live doc (Yjs snapshot diff →
  ProseMirror decorations, insertions/deletions highlighted). An **AI "what changed" summary** can
  accompany the visual diff ([10](./10-ai-features.md)).
- Nothing is written until the user explicitly clicks **Restore**.

## 6. UI

```
┌ Version history ───────────────────────────┐
│  ● Now            (live)                    │
│  ○ 14:32  "Rewrote intro"   Alice  [Preview]│
│  ○ 13:10  auto              —      [Preview]│
│  ○ 11:05  "First draft"     Bob    [Preview]│
│                                             │
│  Preview pane: read-only render + diff      │
│  [ Restore this version ]  (Owner/Editor)   │
└─────────────────────────────────────────────┘
```

- Restore is gated to **Owner/Editor**; **Viewers can preview but not restore** (RBAC, [08](./08-auth-and-rbac.md)).
- A toast confirms restore and offers **"Undo restore"** (restore the auto-snapshot taken just before).
- `aria-live` announces "Restored to version from 13:10."

## 7. Real-world: history size over time

The version system is also where "document state size over time" is partly answered:

- The user-facing timeline can be **thinned** (keep all manual versions; coarsen old auto-versions —
  keep hourly, then daily) so it stays navigable.
- Internally, **compaction** keeps cold-load cost bounded regardless of how long the document has
  lived. Full treatment in [11-performance-and-scale.md](./11-performance-and-scale.md).

## 8. Why this satisfies the requirement, point by point

- _"Capture specific snapshots"_ → manual + auto snapshots stored with labels.
- _"View a timeline of past versions"_ → the history panel, ordered, with authors and previews.
- _"Restore to a previous state safely"_ → forward-transaction restore (never rewind).
- _"Without corrupting the current shared document state for other active collaborators"_ → restore is
  a normal merged update applied in the shared room; everyone converges; history stays intact and the
  restore is itself reversible.
