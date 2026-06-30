# 03 — Tech Stack Decisions (ADR-style)

Each decision states the choice, the alternatives considered, and the trade-off. The assignment
rewards _reasoning_, not just picking popular tools.

---

## ADR-1 — Conflict resolution: **CRDT (Yjs)**, not Operational Transform, not hand-rolled

**Choice:** Use **Yjs** as the CRDT engine for the document.

**Alternatives:**

- _Operational Transform (OT)_ (à la Google Docs / ShareDB): transforms each op against concurrent
  ops. Requires a **central server in the op path** to assign a total order — fights the local-first
  requirement, and offline OT is notoriously hard to get right.
- _Hand-rolled CRDT_: maximal "intellect" signal, but reimplementing a correct, performant text CRDT
  (RGA/YATA-class) is a multi-week research effort and a serious correctness risk for a take-home.
- _Automerge_: excellent CRDT, but heavier wire format and slower for large text than Yjs in
  practice; weaker rich-text/editor-binding ecosystem.

**Why Yjs:**

- Genuinely **conflict-free and deterministic** — concurrent updates commute; every peer converges to
  the identical document regardless of arrival order (the core requirement).
- **Offline-native**: merge needs no server; two offline peers reconcile on reconnect via state
  vectors. Exactly the local-first model.
- Mature **editor bindings** (`y-prosemirror`/Tiptap), **IndexedDB** persistence (`y-indexeddb`), and
  **awareness** (presence/cursors) — so our effort goes into the _engine and product_, not the algo.
- Compact binary updates + **snapshots** primitive that powers our version history (see [07](./07-version-history.md)).

**Trade-off we accept:** CRDTs carry metadata/tombstones, so documents grow over time. We mitigate
with GC, compaction, and snapshotting — addressed directly in [11](./11-performance-and-scale.md).
This is the assignment's "document state size over time" concern, met deliberately.

> **Where the original engineering is.** Yjs solves _merge_. We build everything around it: the
> local-first persistence layer, the offline outbox + reconnection state machine, the role-aware
> validating sync server, the OOM defenses, the non-destructive version/restore model, and the
> lifecycle/compaction. That surface is where this submission demonstrates distributed-systems depth.

---

## ADR-2 — Editor: **Tiptap (ProseMirror)** with `y-prosemirror`

**Choice:** Tiptap (a ProseMirror toolkit) bound to Yjs.

**Alternatives:** plain `Y.Text` in a `<textarea>` (too trivial to showcase merging); Quill +
`y-quill` (workable but less flexible schema); Lexical (great editor, less mature Yjs binding).

**Why:** Rich-text concurrent editing is the convincing merge demo. Tiptap gives a ProseMirror schema,
`@tiptap/extension-collaboration` + `collaboration-cursor` wire straight into Yjs and awareness, and
it's React-friendly. **Trade-off:** ProseMirror has a learning curve and bundle weight — mitigated by
dynamic import and code-splitting (the editor is client-only anyway).

---

## ADR-3 — Local persistence: **IndexedDB** (`y-indexeddb`) + a custom outbox

**Choice:** IndexedDB as the canonical client store, via `y-indexeddb`, augmented by our own small
**outbox** object store for sync bookkeeping.

**Alternatives:** `localStorage` (tiny quota, synchronous, string-only — unfit for binary CRDT
updates); OPFS (powerful but lower-level than needed); in-memory only (loses the local-first promise
on reload).

**Why:** IndexedDB is async, binary-safe, and large-quota — ideal for Yjs update blobs. `y-indexeddb`
persists the doc transparently so reloads are instant and offline. We add an outbox to track which
updates are confirmed-acked by the server (for the connection-status UI and idempotent flush). **Trade-off:**
IndexedDB APIs are awkward; we wrap them and keep the surface small. Quota pressure is handled by
compaction (see [11](./11-performance-and-scale.md)).

---

## ADR-4 — Realtime transport & hosting: **WebSocket inside the Next.js 16 custom server, on Railway**

**Choice:** Implement the Yjs sync protocol over WebSocket **inside the same Next.js 16 application**,
using a **custom Node server** (`server.ts` that wraps the Next.js request handler + a `ws` server),
deployed on **Railway**. There is **no separate backend service** — this honors the PDF's
**"Backend/Frontend: Next.js 16"** mandate (one app, one TypeScript codebase).

**Alternatives considered (and why rejected):**

- _Next.js on Vercel + a separate WS microservice_ — would split the backend into a non-Next service,
  which reads against "Backend/Frontend: Next.js 16." Rejected for that reason (it's the runner-up; see
  [16](./16-pdf-compliance-audit.md) Decision 1).
- _WebSocket via Next.js Route Handlers on Vercel serverless_ — **not possible**: serverless functions
  are short-lived and can't hold sockets or shared room state.
- _Managed realtime (Liveblocks / PartyKit / Hocuspocus Cloud / Pusher / Ably)_ — fast to ship, but
  hides exactly the engine the assignment wants us to demonstrate (auth, validation, OOM defense).
- _WebRTC (`y-webrtc`)_ — serverless peer mesh, but no durable server persistence and brittle NAT
  traversal; unsuitable as the system of record.

**Why this shape:** one Next.js 16 app keeps the deliverable squarely on the mandated stack while still
letting us _own and show_ the graded parts — JWT auth on the socket, **viewer write rejection (M3)**,
payload size/decode validation (M4), rate limiting, durable persistence. The realtime layer imports the
**same Prisma client and Zod validators** as the REST handlers (no drift). **Trade-off:** a custom
server means the app can't run on Vercel serverless and is hosted on Railway (a persistent process);
we accept that to satisfy the Next.js-16-backend mandate. Scaling path (sticky rooms, shard by docId,
Redis pub/sub for multi-instance) is in [11](./11-performance-and-scale.md); a single instance is
sufficient for the deliverable.

> _Pragmatic note:_ the realtime layer can build on the well-tested `y-websocket` server protocol and
> wrap it with our auth/validation/persistence hooks, rather than parsing the binary protocol from
> scratch — same ownership of the security-critical logic, less reinvention.

---

## ADR-5 — Database & ORM: **PostgreSQL + Prisma**

**Choice:** PostgreSQL (mandatory) with Prisma.

**Alternatives:** Drizzle (lighter, SQL-first — strong option and used at HoE; viable swap), raw `pg`
(too manual for this scope), Mongo (mandatory list says Postgres).

**Why Prisma:** type-safe queries shared across the route handlers and the realtime layer (same app),
painless migrations, and a clear place to enforce **strict per-tenant scoping** in query helpers.
**Trade-off:** Prisma's query engine adds weight; on a long-lived custom Node server cold starts are a
non-issue, and we use a pooled connection regardless. Tenant isolation strategy (scoped ORM + optional
Postgres RLS) is in [09](./09-security-and-validation.md).

---

## ADR-6 — Auth: **Auth.js (NextAuth v5), JWT sessions**

**Choice:** Auth.js with the **JWT** session strategy.

**Alternatives:** Clerk/Auth0 (great DX, external dependency + cost, less to show), bespoke JWT (more
code, more footguns).

**Why:** Assignment names NextAuth/Auth.js explicitly. JWT sessions fit because the **realtime layer
verifies the same JWT statelessly on the WebSocket upgrade** — one identity for both the HTTP and the
socket paths of the single app, no second session store (and it stays cheap if the realtime layer is
ever split out later). **Trade-off:** JWT revocation is coarse; we use short access-token lifetimes +
rotating refresh and re-check membership server-side on sensitive actions. Details in
[08](./08-auth-and-rbac.md).

---

## ADR-7 — UI: **Tailwind + shadcn/ui (Radix)**

**Choice:** Tailwind (mandatory) with shadcn/ui generated components on Radix primitives.

**Why:** Radix gives accessible, unstyled primitives (dialog, dropdown, tooltip, toast) with correct
focus management and ARIA — directly serving the accessibility criterion — and shadcn lets us own the
component code. **Trade-off:** none material for this scope.

---

## ADR-8 — AI: **Vercel AI SDK + Google Gemini**

**Choice:** Vercel AI SDK (`ai` + `@ai-sdk/google`) calling Google **Gemini** models, with streaming.
The PDF's good-to-have AI list is **"AI-SDK, OpenAI, Gemini or Groq"** — we use the **AI-SDK** (literally
named) with **Gemini** (named). Claude is deliberately **not** used, to follow the PDF exactly.

**Alternatives (all PDF-listed):** Groq (fastest inference, great for inline; open models) and OpenAI
(ubiquitous, paid). Gemini chosen for the best balance of a generous free tier + quality for
summaries/diff explanations + a fast Flash tier for inline. Provider is swappable behind the AI SDK if
needed.

**Why Gemini via AI SDK:** the AI SDK gives a uniform streaming API, easy React hooks
(`useChat`/`useCompletion`), and provider-swappability; Gemini offers a strong long-context model for
summaries and a fast, cheap **Flash** tier for inline work, with a generous free tier for the demo.
**Model split** (use the latest IDs at build time — confirm against the Google provider docs):

| Use case                                       | Model (family)                             | Why                         |
| ---------------------------------------------- | ------------------------------------------ | --------------------------- |
| Inline autocomplete / quick assist             | **Gemini Flash** (e.g. `gemini-2.5-flash`) | Latency- and cost-sensitive |
| Summarize / rewrite / version-diff explanation | **Gemini Pro** (e.g. `gemini-2.5-pro`)     | Best quality + long context |

Details, prompts, and cost controls in [10-ai-features.md](./10-ai-features.md). **Trade-off:** API cost
and external dependency — bounded by model tiering, max-output caps, debouncing, caching, and feature
flags (AI is additive; the app works fully without it).

---

## ADR-9 — Repo layout: **single Next.js 16 app (no monorepo)**

**Choice:** One Next.js 16 application. The realtime layer lives inside it (`server.ts` custom entry +
`lib/realtime/`); shared concerns (Prisma client, Zod validators, CRDT utils, types) are plain `lib/`
modules imported by both the route handlers and the realtime layer.

**Why:** Because the backend **is** the Next.js app (PDF mandate), there's no second deployable to keep
in sync — a monorepo would be needless ceremony. A single app means schema and validators are imported
directly by both the HTTP and WebSocket paths, so they can't drift. **Trade-off:** the realtime code
shares a process with the app; if it ever needs independent scaling we'd extract it to its own service
(the JWT-on-upgrade design keeps that cheap — ADR-6).

---

## Summary table

| Concern     | Choice                                           | Key trade-off accepted                                   |
| ----------- | ------------------------------------------------ | -------------------------------------------------------- |
| Merge       | Yjs CRDT                                         | Tombstone growth → compaction                            |
| Editor      | Tiptap/ProseMirror                               | Bundle weight → code-split                               |
| Local store | IndexedDB                                        | Awkward API → thin wrapper                               |
| Realtime    | WebSocket in the Next.js custom server (Railway) | Persistent process → can't use Vercel; deploy on Railway |
| DB/ORM      | Postgres + Prisma                                | Long-lived server → no cold start; pooled connection     |
| Auth        | Auth.js JWT                                      | Coarse revocation → short TTL + server re-check          |
| UI          | Tailwind + shadcn/Radix                          | —                                                        |
| AI          | Vercel AI SDK + Google Gemini                    | API cost → tiering + caps                                |
| Repo        | Single Next.js 16 app (no monorepo)              | Realtime shares process → extractable later              |
