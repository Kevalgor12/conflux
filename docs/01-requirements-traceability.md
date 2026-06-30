# 01 — Requirements Traceability

Every requirement from the assignment, mapped to the design decision that satisfies it and the doc
that details it. This is the "nothing dropped" matrix — read it as a contract.

Legend: **M** = Must Have, **F** = Functionality, **G** = Good to Have, **E** = Evaluation criterion.

## Functionality

| #   | Requirement                                                                                                                       | How Conflux satisfies it                                                                                                                                       | Detail                                                                                                        |
| --- | --------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| F1  | **Local-first architecture** — client storage is the primary source of truth; open/edit/close with zero blocking network          | IndexedDB holds the canonical Yjs document; the editor binds to local state and never awaits the network to render or accept input                             | [05](./05-local-first-and-sync-engine.md)                                                                     |
| F2  | **Background sync engine** — push local changes + fetch remote on reconnect, never overwriting offline work                       | CRDT merge is non-destructive by construction; an idempotent outbox flushes queued updates; state-vector handshake fetches only missing remote ops             | [05](./05-local-first-and-sync-engine.md), [06](./06-conflict-resolution.md)                                  |
| F3  | **Version history & time travel** — capture snapshots, view a timeline, restore safely without corrupting shared state for others | Named Yjs snapshots stored server-side; restore computes the diff and applies it as a _new forward transaction_ so collaborators converge instead of rewinding | [07](./07-version-history.md)                                                                                 |
| F4  | **Robust data validation** — server strictly validates sync payloads to prevent crashes/corruption                                | Zod schemas on REST; size + structural + decode validation on every binary WS update inside try/catch; reject before apply                                     | [09](./09-security-and-validation.md)                                                                         |
| F5  | **Clean, responsive, accessible UI** (Tailwind, shadcn/radix allowed)                                                             | shadcn/ui on Radix primitives (focus management, ARIA, keyboard nav); responsive layout; live connection-status indicators                                     | [02](./02-system-architecture.md), [11](./11-performance-and-scale.md)                                        |
| F6  | **AI add-on features**                                                                                                            | Streaming summarization, inline writing assist, AI version-diff explanation, semantic snapshot naming — via Vercel AI SDK + Google Gemini                      | [10](./10-ai-features.md)                                                                                     |
| F7  | **Deployment + CI/CD**                                                                                                            | Single Next.js 16 app + PostgreSQL on Railway; GitHub Actions pipeline                                                                                         | [13](./13-deployment-and-cicd.md)                                                                             |
| F8  | **Code optimization** — code splitting, caching, SSR                                                                              | Editor dynamically imported (client-only); SSR for lists, SSG for marketing; route-level caching; CRDT update batching                                         | [11](./11-performance-and-scale.md)                                                                           |
| F9  | **Real-world considerations** — scalability, error handling, security                                                             | Stateless app tier, sticky WS rooms, document-size lifecycle, structured error boundaries, threat model                                                        | [02](./02-system-architecture.md), [09](./09-security-and-validation.md), [11](./11-performance-and-scale.md) |

## Must Have

| #   | Requirement                                                          | How Conflux satisfies it                                                                                                      | Detail                                                             |
| --- | -------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------ |
| M1  | **Authentication** (JWT / NextAuth/Auth.js)                          | Auth.js (NextAuth v5) with JWT session strategy; the same signing secret lets the WS server verify tokens                     | [08](./08-auth-and-rbac.md)                                        |
| M2  | **Authorization** — Owner / Editor / Viewer roles                    | Per-document `DocumentMembership(role)`; enforced in REST handlers, Server Actions, and the WS server                         | [08](./08-auth-and-rbac.md)                                        |
| M3  | **Viewers cannot push state updates to the real-time server**        | WS server inspects the authenticated role per connection and **rejects sync/update messages from Viewers** (awareness-only)   | [08](./08-auth-and-rbac.md), [09](./09-security-and-validation.md) |
| M4  | **Security — prevent massive/malformed payload OOM**                 | Hard byte caps per WS message + per document; rate limiting; bounded decode; backpressure; per-room memory ceiling            | [09](./09-security-and-validation.md)                              |
| M5  | **Secure API routes + RLS or strict ORM scoping (tenant isolation)** | Every Prisma query scoped by authenticated `userId` + membership; optional Postgres RLS with session GUCs as defense-in-depth | [08](./08-auth-and-rbac.md), [09](./09-security-and-validation.md) |

## Good to Have

| #   | Requirement                     | How Conflux satisfies it                                                                                                                | Detail                         |
| --- | ------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------ |
| G1  | **Testing** — integration + E2E | Jest (units incl. CRDT merge invariants), React Testing Library (components), Playwright (offline/online E2E with two browser contexts) | [12](./12-testing-strategy.md) |

## Evaluation criteria → where we score

| #   | Criterion                                                                                                      | Where it's addressed                                                                                                                                                            |
| --- | -------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| E1  | Offline-sync correctness, deterministic merge w/o data loss, version history, validation, authn/authz          | [05](./05-local-first-and-sync-engine.md), [06](./06-conflict-resolution.md), [07](./07-version-history.md), [08](./08-auth-and-rbac.md), [09](./09-security-and-validation.md) |
| E2  | UI — friendliness, responsiveness, **real-time connection status indicators**, accessibility                   | [02](./02-system-architecture.md) (UX section), [11](./11-performance-and-scale.md)                                                                                             |
| E3  | Code quality — structure, **managing complex sync state**, docs, optimization (**no lag during rapid typing**) | [11](./11-performance-and-scale.md), [14](./14-implementation-roadmap.md)                                                                                                       |
| E4  | Testing — coverage/effectiveness, **especially the local-first sync engine**                                   | [12](./12-testing-strategy.md)                                                                                                                                                  |
| E5  | Deployment + CI/CD                                                                                             | [13](./13-deployment-and-cicd.md)                                                                                                                                               |
| E6  | Real-world — architectural challenges, **document state size over time**                                       | [07](./07-version-history.md), [11](./11-performance-and-scale.md)                                                                                                              |

## Submission

| #   | Requirement                              | Plan                                                                                                                       |
| --- | ---------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| S1  | GitHub repo + live deployment            | Public repo; live URL on Railway (single Next.js 16 app) — [13](./13-deployment-and-cicd.md)                               |
| S2  | **Name, GitHub, LinkedIn in the footer** | Global `<SiteFooter/>` rendered in the root layout — values to be filled before submit — [02](./02-system-architecture.md) |

---

### Deliberate scope choices (and why)

- **Rich text, not plain text.** The assignment rewards "complex data merging." Concurrent rich-text
  edits (bold a word while someone deletes the sentence) are a far harder, more convincing merge
  problem than a plain `<textarea>`. We use a ProseMirror schema bound to Yjs.
- **CRDT over Operational Transform (OT).** OT needs a central authority to transform and order ops;
  CRDTs merge commutatively and converge offline-first without a server in the loop — exactly the
  local-first requirement. Trade-offs in [06](./06-conflict-resolution.md).
- **We build the sync _engine_, not the CRDT algorithm.** Reimplementing a correct CRDT is a research
  project and a needless correctness risk. We use Yjs for the merge core and build the
  local-first persistence, the offline outbox, the role-aware sync server, validation, versioning,
  and lifecycle ourselves — that is where the assignment's "intellect" signal actually lives. See the
  rationale in [03](./03-tech-stack-decisions.md).
