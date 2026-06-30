# Conflux

A **local-first, collaborative document editor** with offline synchronization, deterministic
**CRDT** conflict resolution, and granular, non-destructive **version history**.

Built for the House of Edtech Full Stack Developer assignment. This is deliberately **not** a CRUD
app — the focus is the distributed-systems core: keeping a document correct and convergent across
multiple clients that edit **concurrently**, go **offline**, and reconnect in any order.

Full design and decision record lives in [`docs/`](./docs) (start at [docs/README.md](./docs/README.md)).

---

## The hard problems (and how Conflux solves them)

| Requirement                           | Approach                                                                                                                                                                                                                                                                        |
| ------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Works fully offline**               | Edits apply to a local **Yjs** document and persist to **IndexedDB** (`y-indexeddb`) synchronously. The network is an optimization, never a dependency — you can close the tab, reopen offline, and keep editing.                                                               |
| **Deterministic conflict resolution** | **CRDT** (Yjs). Concurrent edits commute and merge to the **same** state on every replica regardless of arrival order — no last-write-wins, no manual merge. Property-tested with `fast-check` (random op orderings converge). See [docs/06](./docs/06-conflict-resolution.md). |
| **Sync race conditions**              | A custom WebSocket server runs the Yjs sync protocol per-document "room". New clients **buffer** incoming frames until the room's durable state has loaded, so a cold client never syncs against an empty doc. See [docs/05](./docs/05-local-first-and-sync-engine.md).         |
| **Browser memory management**         | Yjs garbage-collects tombstones; the server **compacts** the append-only update log into a single snapshot once it grows, so cold-load stays O(recent) instead of O(history). See [docs/11](./docs/11-performance-and-scale.md).                                                |
| **Granular version history**          | Non-destructive snapshots (ProseMirror JSON) on demand; preview any version and **restore** it as a _forward_ edit (the pre-restore state is saved first, so restore is itself undoable). See [docs/07](./docs/07-version-history.md).                                          |
| **Access control**                    | Per-document **RBAC** (Owner / Editor / Viewer). Enforced on REST routes **and** on the realtime socket — a Viewer's write frames are rejected server-side, not just hidden in the UI. See [docs/08](./docs/08-auth-and-rbac.md).                                               |
| **Resource safety (DoS/OOM)**         | WebSocket payload cap, per-connection rate limiting (messages/sec + bytes/sec + strike budget), bounded cold-load buffer, per-user connection slots, per-room cap, and request body-size caps on every REST route. See [docs/09](./docs/09-security-and-validation.md).         |

---

## Architecture

Conflux is **one Next.js 16 app** — frontend, REST API, and realtime layer — served by a **custom
Node server** (`server.ts`) so the WebSocket lives on the same HTTP server as the app.

```
Browser (Yjs doc + IndexedDB)  ──HTTP──▶  Next.js App Router (REST: documents, members, versions, AI)
        │                                          │
        └──────────── WebSocket ───────────▶  Realtime layer (lib/realtime): per-doc rooms,
                       (Yjs sync protocol)         Yjs sync + awareness, persistence + compaction
                                                   │
                                              PostgreSQL (Prisma): users, memberships,
                                              update log, version & compaction snapshots
```

A few deliberate choices worth calling out:

- **Single app, custom server.** The realtime code is run by `tsx` directly from source, so it uses
  **relative** imports (the `@/` path alias is only resolved inside the Next bundle, which is a
  separate module instance from the `tsx` server process).
- **Auth.js (NextAuth v5), JWT sessions.** A split config keeps the edge/proxy instance Prisma-free.
  The WebSocket upgrade is authenticated from the same-origin session cookie.
- **AI is strictly additive** and feature-flagged — the app is fully functional with no AI key.

---

## Tech stack

One **Next.js 16** app (App Router, React 19, TypeScript) on a custom Node server.

- **CRDT / editor:** Yjs, y-protocols, lib0, y-indexeddb, Tiptap v3 (`@tiptap/react`, starter-kit,
  collaboration + collaboration-caret)
- **Realtime:** `ws` (WebSocket) attached to the custom server
- **Data:** PostgreSQL + Prisma 6
- **Auth:** Auth.js / NextAuth v5 (Credentials, JWT), bcryptjs
- **Validation:** Zod v4
- **Styling:** Tailwind CSS v4 (no component library — small custom components)
- **AI (optional):** Vercel AI SDK (`ai`) + Google Gemini (`@ai-sdk/google`)
- **Tests:** Jest + ts-jest + fast-check (property tests), Playwright (E2E)
- **Deploy:** Docker / Railway

See [docs/03-tech-stack-decisions.md](./docs/03-tech-stack-decisions.md) for the rationale.

---

## Getting started

**Prerequisites:** Node ≥ 20 (developed on 24) and a PostgreSQL instance.

```bash
# 1. Install (postinstall runs `prisma generate`)
npm install

# 2. Configure env
cp .env.example .env       # then set DATABASE_URL, AUTH_SECRET, etc.

# 3. Start PostgreSQL (any instance works; Docker example)
docker run -d --name conflux-pg -p 5432:5432 \
  -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=conflux postgres:16

# 4. Migrate + seed
npm run prisma:migrate     # create tables
npm run db:seed            # Owner/Editor/Viewer demo trio sharing one document

# 5. Run (custom server: app + realtime)
npm run dev                # http://localhost:3000 (or $PORT)
```

> **Port note:** the server reads `PORT` (default `3000`). On a machine where Docker Desktop already
> binds `3000`, set `PORT=3100` and `NEXT_PUBLIC_WS_URL=ws://localhost:3100` in `.env` (the committed
> `.env.example` documents this).

> **Offline:** once a document is open, edits persist to IndexedDB with no network. Reconnecting
> replays and merges deterministically.

### Demo accounts

After `npm run db:seed` (all share one document, password **`password123`**):

| Email              | Role                                                   |
| ------------------ | ------------------------------------------------------ |
| `owner@demo.test`  | Owner                                                  |
| `editor@demo.test` | Editor                                                 |
| `viewer@demo.test` | Viewer (read-only — writes are rejected at the socket) |

Open the same document in two browsers as Owner and Editor to see live convergence; sign in as Viewer
to confirm read-only enforcement.

---

## AI features (optional)

Server-proxied, streaming, authenticated, access-checked, and rate-limited — the API key never
reaches the browser. Two features: **document summarization** and **"explain changes vs current"** in
version history. To enable:

```bash
GOOGLE_GENERATIVE_AI_API_KEY="..."   # server-only
NEXT_PUBLIC_AI_ENABLED="true"        # surfaces the AI buttons in the UI
```

Without these, AI endpoints return `503` and the UI hides the buttons — everything else works
normally. See [docs/10-ai-features.md](./docs/10-ai-features.md).

---

## Testing

```bash
npm run typecheck     # tsc --noEmit
npm test              # Jest: unit + CRDT convergence property tests (fast-check)
npm run test:e2e      # Playwright E2E (offline edit, two-client convergence, viewer rejection, restore)
```

Playwright drives a real browser, so it needs the browsers installed (`npx playwright install`) and a
running app + database; the config can start the dev server for you. See
[docs/12-testing-strategy.md](./docs/12-testing-strategy.md).

---

## Deployment

Configured for **Railway** via a multi-stage **Dockerfile**. `railway.json` sets the build (Dockerfile)
and start command (`npm run start:migrate`, which runs `prisma migrate deploy` then the custom server).
Railway injects `PORT` automatically; provide a PostgreSQL `DATABASE_URL` (Railway's Postgres plugin)
and an `AUTH_SECRET` — that's all that's required. The realtime URL is derived from the page origin
(`wss://` on HTTPS), so `NEXT_PUBLIC_WS_URL` is optional. Add the AI vars to enable AI.

```bash
docker build -t conflux .                      # requires Docker registry access
docker run -p 3000:3000 --env-file .env conflux
```

CI runs on GitHub Actions (`.github/workflows/ci.yml`): install → Prettier check → typecheck → tests →
production build. See [docs/13-deployment-and-cicd.md](./docs/13-deployment-and-cicd.md).

---

## Project structure

```
server.ts              Custom Node server (Next + WebSocket); loads .env, reads PORT
proxy.ts               Next 16 proxy (auth gate; formerly middleware.ts)
app/                   App Router pages + REST + AI routes
components/            UI (editor, version history, AI panel, presence, footer)
lib/
  realtime/            WebSocket rooms, Yjs sync, presence, persistence, compaction, limits
  crdt/                CRDT helpers + convergence property tests
  sync/                Client sync provider, hooks, identity
  auth/                Auth.js config, session/guards, WS cookie auth
  services/            Document / membership / version services
  ai/                  Gemini provider, prompts, rate limit, streaming client
  validators/          Zod schemas
prisma/                Schema, migrations, seed
docs/                  Architecture & decision record (01–16)
e2e/                   Playwright tests
```

---

## Documentation

[`docs/`](./docs) is the full architecture and decision record — local-first sync engine, CRDT
conflict resolution, version history, auth/RBAC, security, AI, performance, testing, deployment, the
implementation roadmap, and a requirement-compliance audit against the assignment.

---

_Author name, GitHub, and LinkedIn appear in the app footer (`components/site-footer.tsx`)._
