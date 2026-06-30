# 12 — Testing Strategy

The rubric weights testing **"specifically around the local-first sync engine."** So the test plan is
deliberately heavy where the risk and the credit are: convergence, offline→online reconciliation, and
role enforcement.

## 1. The pyramid (and where we invest)

```
        ╱  E2E (Playwright)  ╲          offline↔online, 2 users, roles, restore
      ╱  Integration tests   ╲         WS server + Postgres + sync protocol
    ╱   Component tests        ╲       editor, status indicator, version panel
  ╱  Unit / property tests      ╲      CRDT merge invariants, outbox, validators
 ───────────────────────────────
```

Most teams over-invest in component tests. We over-invest in **sync-engine unit/property tests** and
**offline E2E**, because that's what the assignment is actually grading.

## 2. Tooling

| Layer                    | Tool                                                                             |
| ------------------------ | -------------------------------------------------------------------------------- |
| Unit / property          | **Jest** (+ `fast-check` for property-based merge tests)                         |
| Component                | **React Testing Library** + Jest + `jsdom`                                       |
| Integration              | **Jest** against a real WS server + ephemeral Postgres (Testcontainers / Docker) |
| E2E                      | **Playwright** (multiple browser contexts, network throttling/offline)           |
| Local IndexedDB in tests | `fake-indexeddb` for unit; real IndexedDB in Playwright                          |

> Jest + RTL + Playwright are the three testing frameworks the JD names explicitly, so we adopt them
> directly. (Vitest would be a smoother Next/Vite-native alternative, but we match the named stack.)

## 3. Unit & property tests — the sync engine core

These encode the _guarantees_ from [06](./06-conflict-resolution.md), not just example cases.

- **Convergence (property test).** Generate N random concurrent edit sequences from K simulated
  clients; apply them in **random orders** to fresh `Y.Doc`s; assert **all replicas end byte-identical**.
  This is the single most important test — it proves determinism/convergence empirically.
- **Idempotency.** Applying the same update twice == once.
- **No data loss on edit-vs-delete.** The worked example from [06](./06-conflict-resolution.md) §3 as a
  fixed test: concurrent insert + delete → both survivable contributions present.
- **State-vector delta correctness.** Diffing two state vectors yields exactly the missing updates.
- **Outbox.** enqueue/ack/prune logic; survives simulated crash (persist before send); idempotent flush
  with duplicate acks.
- **Reconnection state machine.** Drive transitions (offline→connecting→handshaking→synced→…) with a
  fake transport; assert backoff schedule and that no edits are dropped across a disconnect.
- **Validators.** Zod schemas accept valid / reject malformed & oversized inputs ([09](./09-security-and-validation.md)).
- **Restore = forward transaction.** Given a doc + a snapshot, restore produces a _new_ update and the
  resulting content equals the snapshot content, while history/log is preserved (not rewound)
  ([07](./07-version-history.md)).

## 4. Integration tests — server + protocol + DB

Spin up the real WS server and an ephemeral Postgres:

- **Two simulated clients, one room** → edits propagate; both converge; updates land in
  `DocumentUpdate`.
- **Offline reconciliation** → client A edits while disconnected; on reconnect, A's outbox flushes and
  A receives B's deltas; final states match; no overwrite (F2).
- **Viewer rejection (M3)** → a Viewer connection's `update` messages are dropped (never applied, never
  broadcast, never persisted); awareness still flows.
- **Validation/OOM guards (M4)** → oversize frame rejected; flood throttled/disconnected; malformed
  update rejected without crashing the room; room survives.
- **Compaction** → after threshold, log folds into a `COMPACTION` snapshot and cold-load uses base +
  recent ([11](./11-performance-and-scale.md)).
- **Tenant isolation (M5)** → user without membership cannot connect/read; scoped queries return
  nothing cross-tenant (and RLS policy test if enabled).

## 5. Component tests

- **Connection-status indicator** renders each state (synced/syncing/offline/reconnecting/read-only/
  error) and announces transitions via `aria-live`.
- **Version timeline** lists snapshots, preview is read-only, restore hidden for Viewers.
- **Editor toolbar** disabled in read-only mode.

## 6. E2E (Playwright) — the demo, automated

These mirror the live demo and are the most convincing evidence:

1. **Offline edit → reconnect.** Open a doc, go offline (Playwright `context.setOffline(true)`), type,
   reload (still works — local-first), go online, assert content syncs to a second context.
2. **Two-user concurrent merge.** Two browser contexts edit the same paragraph concurrently; assert
   both contributions present and both views converge — _no conflict dialog_.
3. **Role enforcement.** Viewer context: editor is read-only; attempts to edit don't propagate; Owner
   sees no changes from the Viewer.
4. **Version restore safety.** With two users connected, one restores an old version; assert both
   converge to the restored content and history still lists the prior version (reversible).
5. **Connection status truthfulness.** Indicator reflects offline/syncing/synced correctly through a
   network blip.
6. **(Perf probe)** type 5,000 characters rapidly; assert no dropped input and frame-time budget
   ([11](./11-performance-and-scale.md) §6).

## 7. CI gating

- PRs run: typecheck → lint → unit/property → component → integration (Postgres service) → E2E
  (against a preview/build). Merge blocked on failure. Details in
  [13-deployment-and-cicd.md](./13-deployment-and-cicd.md).
- Coverage reported; the **sync engine package has the highest coverage target** (it's the risk).

## 8. What we deliberately _don't_ over-test

- We don't re-test Yjs's internal CRDT correctness (it's a dependency with its own suite); we test
  **our integration and invariants** on top of it.
- We don't chase 100% line coverage on UI glue; we target behavior that maps to the rubric.
