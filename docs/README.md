# Conflux — Local-First Collaborative Document Editor

> **House of Edtech — Fullstack Developer Assignment 2 (v2.1)**
> Planning & architecture documentation — the blueprint behind the build.

> **Implementation status:** ✅ **Built.** This `docs/` folder is the design/decision record written
> during planning; the application is now implemented and verified. For the **as-built** picture (run
> instructions, final stack, project layout) the authoritative source is the **[root README](../README.md)**.
> A few decisions shifted during the build — recorded here for honesty: styling is **plain Tailwind v4**
> (no shadcn/Radix); the editor uses **Tiptap v3's built-in Yjs binding** (not external `y-prosemirror`,
> which v3 dropped); the app is a **single Next.js app on Railway** (no Vercel split); version snapshots
> store **ProseMirror JSON**; local dev runs on **port 3100** when Docker holds 3000.

Conflux is a **local-first, collaborative document editor** that works fully offline, reconciles
state deterministically when the network returns, and gives every user a navigable, non-destructive
version history. It is built to demonstrate the hard parts the assignment explicitly asks for:
**browser-based memory management, state-synchronization race conditions, and conflict-free data
merging over a real-time protocol** — not a CRUD app.

---

## The one-paragraph pitch

A writer opens a document. It loads instantly from the browser's own database — zero blocking
network calls. They type for ten minutes on a train with no signal; every keystroke is durable
locally. A collaborator, also offline elsewhere, edits the same paragraph. When both reconnect, a
**CRDT (Conflict-free Replicated Data Type)** merges both edit streams into one consistent document
with **no lost work and no "resolve conflict" dialog** — deterministically, the same result on every
peer. Either user can open the **version timeline**, preview any past snapshot, and restore it
**without rewinding the shared document for active collaborators**. The server validates every sync
payload, enforces Owner / Editor / Viewer roles, and isolates tenants — a malformed or oversized
update can neither corrupt the document nor OOM the collaboration server.

---

## How to read these docs

Read in order for the full story; jump by topic if you know what you need.

| #   | Doc                                                                      | What it answers                                                                  |
| --- | ------------------------------------------------------------------------ | -------------------------------------------------------------------------------- |
| —   | [README.md](./README.md)                                                 | Vision, index, conventions (this file)                                           |
| 01  | [01-requirements-traceability.md](./01-requirements-traceability.md)     | Every assignment requirement → where it's solved                                 |
| 02  | [02-system-architecture.md](./02-system-architecture.md)                 | Components, deployment topology, data flow                                       |
| 03  | [03-tech-stack-decisions.md](./03-tech-stack-decisions.md)               | What we chose and _why_ (ADR-style trade-offs)                                   |
| 04  | [04-data-model.md](./04-data-model.md)                                   | PostgreSQL schema, Prisma models, persistence strategy                           |
| 05  | [05-local-first-and-sync-engine.md](./05-local-first-and-sync-engine.md) | IndexedDB source of truth, offline outbox, background sync                       |
| 06  | [06-conflict-resolution.md](./06-conflict-resolution.md)                 | CRDT internals, determinism, why merges never lose data                          |
| 07  | [07-version-history.md](./07-version-history.md)                         | Snapshots, time travel, safe non-destructive restore                             |
| 08  | [08-auth-and-rbac.md](./08-auth-and-rbac.md)                             | Auth.js, Owner/Editor/Viewer, viewers can't push                                 |
| 09  | [09-security-and-validation.md](./09-security-and-validation.md)         | OOM defense, payload validation, RLS / tenant isolation                          |
| 10  | [10-ai-features.md](./10-ai-features.md)                                 | AI add-ons, model choices, prompts, cost control                                 |
| 11  | [11-performance-and-scale.md](./11-performance-and-scale.md)             | No typing lag, memory growth over time, scaling                                  |
| 12  | [12-testing-strategy.md](./12-testing-strategy.md)                       | Unit / integration / E2E, focus on the sync engine                               |
| 13  | [13-deployment-and-cicd.md](./13-deployment-and-cicd.md)                 | Vercel + Railway split, CI/CD pipeline, env config                               |
| 14  | [14-implementation-roadmap.md](./14-implementation-roadmap.md)           | Milestones, sequencing, file structure, demo script                              |
| 15  | [15-coding-style-guide.md](./15-coding-style-guide.md)                   | **Your** code style (from whatsapp-project) — so Conflux reads like you wrote it |
| 16  | [16-pdf-compliance-audit.md](./16-pdf-compliance-audit.md)               | Line-by-line 100% check against both PDFs; open decisions                        |

---

## Technology at a glance

| Layer       | Choice                                                                         | Why (one line)                                                                           |
| ----------- | ------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------- |
| Framework   | **Next.js 16** (App Router, TypeScript, React 19)                              | Mandatory; SSR/SSG + Route Handlers + Server Actions                                     |
| Styling     | **Tailwind CSS + shadcn/ui (Radix)**                                           | Mandatory; accessible primitives, fast to build                                          |
| CRDT core   | **Yjs**                                                                        | Battle-tested, deterministic conflict-free merge                                         |
| Editor      | **Tiptap (ProseMirror) + `y-prosemirror`**                                     | Rich text bound to the CRDT, cursor presence                                             |
| Local store | **IndexedDB** via `y-indexeddb` + a custom outbox                              | The primary source of truth; survives reload/offline                                     |
| Real-time   | **Custom WebSocket layer** (Yjs protocol) **inside the Next.js custom server** | Long-lived sockets + per-room CRDT; role-enforced; same app, not a separate service      |
| Database    | **PostgreSQL + Prisma**                                                        | Mandatory; relational integrity, strict ORM scoping                                      |
| Auth        | **Auth.js (NextAuth v5), JWT sessions**                                        | Shared secret verifiable by the WS server too                                            |
| Validation  | **Zod** (REST) + binary bounds checks (WS)                                     | Reject malformed/oversized payloads at the edge                                          |
| AI          | **Vercel AI SDK + Google Gemini** (`@ai-sdk/google`)                           | Streaming summaries, inline assist, version diffing (PDF-listed: "AI-SDK … Gemini")      |
| Hosting     | **Single Next.js 16 app + PostgreSQL on Railway**                              | One app serves UI + API + WebSocket (custom server); Railway supports persistent sockets |
| CI/CD       | **GitHub Actions** → Railway                                                   | Lint, typecheck, test (Jest/RTL), E2E (Playwright) gate, deploy                          |

> Full justification and the rejected alternatives are in [03-tech-stack-decisions.md](./03-tech-stack-decisions.md).

---

## The three hard problems (and where each is solved)

The assignment calls out three distributed-systems problems by name. Conflux addresses each head-on:

1. **Browser-based memory management** → CRDT documents accumulate tombstones; histories grow
   unbounded. We compact, snapshot, lazy-load, and bound in-memory state.
   See [11-performance-and-scale.md](./11-performance-and-scale.md) and
   [07-version-history.md](./07-version-history.md).
2. **State-synchronization race conditions** → offline edits vs remote edits, reconnect storms,
   duplicate deliveries, last-writer-wins data loss. We use a CRDT (commutative merge) plus an
   idempotent outbox and state-vector handshake. See
   [05-local-first-and-sync-engine.md](./05-local-first-and-sync-engine.md) and
   [06-conflict-resolution.md](./06-conflict-resolution.md).
3. **Complex data-merging over a real-time protocol** → deterministic, conflict-free merge of
   concurrent rich-text edits. See [06-conflict-resolution.md](./06-conflict-resolution.md).

---

## Submission checklist (from the assignment)

- [ ] GitHub repository (public) + live deployment URL. _(push + deploy — repo/host are the author's to create.)_
- [x] **Footer on every page** with name, GitHub profile, and LinkedIn profile. _(`components/site-footer.tsx`)_
- [x] Live, deterministic offline→online sync demo. _(CRDT + offline edit + reconnect; verified)_
- [x] Functional version history with safe, non-destructive restore.
- [x] Auth + Owner/Editor/Viewer authorization (viewers read-only, enforced on REST **and** the socket, re-validated live).
- [x] Security write-up: OOM mitigation + tenant isolation (this folder + root README).
- [x] Tests around the local-first sync engine (Jest + fast-check property tests; Playwright E2E suite).
- [x] CI/CD configured (`.github/workflows/ci.yml`).

---

_This is a planning artifact. Implementation begins only after this plan is reviewed — see
[14-implementation-roadmap.md](./14-implementation-roadmap.md) for the build sequence._
