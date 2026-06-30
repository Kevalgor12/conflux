# 16 — PDF Compliance Audit (100% check)

Line-by-line verification of the plan against **both** PDFs:

- **Assignment PDF** (`House_of_Edtech_Assignment_v2.1`) — the binding task spec.
- **JD PDF** (`Full Stack Developer`) — the role/company stack & expectations.

Status legend: ✅ covered · ⚠️ **decision needed** · 🔧 fix applied in this pass.

---

## A. Assignment PDF — Technology Stack

| PDF line                                                             | Status                                                                                                 | Where                                                                 |
| -------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------- |
| Backend/Frontend: **Next.js 16** (TypeScript)                        | ✅ **single Next.js 16 app** (frontend + backend + realtime), 100% TS — Decision 1 resolved (Option A) | [02](./02-system-architecture.md), [03](./03-tech-stack-decisions.md) |
| Leverage **TypeScript**                                              | ✅ end-to-end TS                                                                                       | all                                                                   |
| Database: PostgreSQL/MySQL/MongoDB (mandatory list = **PostgreSQL**) | ✅ PostgreSQL + Prisma                                                                                 | [04](./04-data-model.md)                                              |
| Mandatory: **Next JS 16, React.js, Git, Tailwind CSS, PostgreSQL**   | ✅ all present                                                                                         | [03](./03-tech-stack-decisions.md)                                    |
| Good-to-have: AI libs **AI-SDK, OpenAI, Gemini or Groq**             | ✅ **Vercel AI SDK + Google Gemini** (both PDF-listed) — Decision 2 resolved                           | [10](./10-ai-features.md)                                             |

## B. Assignment PDF — competencies it names explicitly

| PDF phrase                                                                          | Status | Notes                                                                                                                                                                                 |
| ----------------------------------------------------------------------------------- | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Next.js: **SSR, SSG, API routes, optimization, routing, data fetching, deployment** | ✅     | SSR lists, SSG marketing, Route Handlers, App Router, RSC, Railway deploy — [02](./02-system-architecture.md), [11](./11-performance-and-scale.md), [13](./13-deployment-and-cicd.md) |
| React: **Hooks, Context API, Query Params**, lifecycle, virtual DOM                 | 🔧     | Hooks ✅; **Context API + Query Params now made explicit** (§Fixes)                                                                                                                   |
| Node.js: async, **RESTful APIs, middleware, package management**, SQL/NoSQL         | ✅     | Route Handlers, REST, auth/validation middleware, Prisma                                                                                                                              |

## C. Assignment PDF — Functionality

| Requirement                                                                        | Status                                                                                               | Where                                                                      |
| ---------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- |
| Local-First Architecture (client storage = source of truth, zero blocking network) | ✅                                                                                                   | [05](./05-local-first-and-sync-engine.md)                                  |
| Background Sync Engine (queue, push/pull, no overwrite)                            | ✅                                                                                                   | [05](./05-local-first-and-sync-engine.md)                                  |
| Version History & Time Travel (snapshots, timeline, safe restore)                  | ✅                                                                                                   | [07](./07-version-history.md)                                              |
| Robust Data Validation (server validates sync payloads)                            | ✅                                                                                                   | [09](./09-security-and-validation.md)                                      |
| UI: clean/responsive, Tailwind/shadcn/radix, **accessibility**                     | ✅                                                                                                   | [02](./02-system-architecture.md) §7, [11](./11-performance-and-scale.md)  |
| Use AI for add-on features                                                         | ✅ Vercel AI SDK + Google Gemini                                                                     | [10](./10-ai-features.md)                                                  |
| Deployment (Vercel/Netlify) + **CI/CD**                                            | ✅ single Next.js app + Postgres on Railway; GitHub Actions (PDF's "e.g." host list isn't exclusive) | [13](./13-deployment-and-cicd.md)                                          |
| Code Optimization (code splitting, caching, SSR)                                   | ✅                                                                                                   | [11](./11-performance-and-scale.md)                                        |
| Real-World (scalability, error handling, security)                                 | ✅                                                                                                   | [09](./09-security-and-validation.md), [11](./11-performance-and-scale.md) |

## D. Assignment PDF — Must Have

| Requirement                                                          | Status                        | Where                                                              |
| -------------------------------------------------------------------- | ----------------------------- | ------------------------------------------------------------------ |
| Authentication (JWT / NextAuth/Auth.js)                              | ✅ Auth.js JWT                | [08](./08-auth-and-rbac.md)                                        |
| Authorization roles **Owner / Editor / Viewer**                      | ✅                            | [08](./08-auth-and-rbac.md)                                        |
| **Viewers must not push state to the real-time server**              | ✅ server-enforced            | [08](./08-auth-and-rbac.md), [09](./09-security-and-validation.md) |
| Security: prevent massive/malformed payload **OOM**                  | ✅ defense ladder             | [09](./09-security-and-validation.md)                              |
| Secure API routes + **RLS or strict ORM scoping** (tenant isolation) | ✅ both layers                | [09](./09-security-and-validation.md)                              |
| **Discuss mitigation strategies + contingency plans**                | ✅ threat model + contingency | [09](./09-security-and-validation.md)                              |

## E. Assignment PDF — Good to Have

| Requirement                | Status                                               | Where                          |
| -------------------------- | ---------------------------------------------------- | ------------------------------ |
| Testing: integration + E2E | 🔧 aligned to **Jest + RTL + Playwright** (JD-named) | [12](./12-testing-strategy.md) |

## F. Assignment PDF — Evaluation Criteria

| Criterion                                                                                                 | Status | Where                                                                                                                                    |
| --------------------------------------------------------------------------------------------------------- | ------ | ---------------------------------------------------------------------------------------------------------------------------------------- |
| Offline-sync correctness, **deterministic merge w/o data loss**, version history, validation, authn/authz | ✅     | [05](./05-local-first-and-sync-engine.md), [06](./06-conflict-resolution.md), [07](./07-version-history.md), [08](./08-auth-and-rbac.md) |
| UI: friendliness, responsiveness, **real-time connection status indicators**, accessibility               | ✅     | [02](./02-system-architecture.md) §7                                                                                                     |
| Code Quality: structure, complex sync state mgmt, docs, **no lag during rapid typing**                    | ✅     | [11](./11-performance-and-scale.md)                                                                                                      |
| Testing: unit/integration/E2E, **esp. sync engine**                                                       | ✅     | [12](./12-testing-strategy.md)                                                                                                           |
| Deployment + CI/CD                                                                                        | ✅     | [13](./13-deployment-and-cicd.md)                                                                                                        |
| Real-World: architectural challenges, **document state size over time**                                   | ✅     | [07](./07-version-history.md), [11](./11-performance-and-scale.md)                                                                       |

## G. Assignment PDF — Submission

| Requirement                        | Status                                     |
| ---------------------------------- | ------------------------------------------ |
| GitHub repo + live deployment      | ✅ planned                                 |
| **Footer: name, GitHub, LinkedIn** | ✅ component planned (real values pending) |

## H. JD PDF — stack alignment (role context)

| JD item                                                   | Status / note                                                                                                                               |
| --------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| Frontend: **Next.js (App Router) — mandatory**, React     | ✅ App Router                                                                                                                               |
| Backend: Bun.sh (primary), Node.js, Elysia.js, Hono.js    | ➖ Assignment mandates **Next.js 16** for backend → that governs the deliverable. Backend is the Next.js app (Node, via the custom server). |
| DB & ORM: PostgreSQL, MongoDB, Redis, **Prisma**, Drizzle | ✅ PostgreSQL + Prisma; Redis noted as scaling option                                                                                       |
| Cloud: **Vercel, Railway**, AWS, Cloudflare               | ✅ **Railway** (single app + Postgres); in the JD's cloud list                                                                              |
| Nice-to-have: **Jest, React Testing Library, Playwright** | 🔧 now adopted as the test stack                                                                                                            |
| Nice-to-have: Docker, Sentry                              | ➖ optional; Sentry noted, Docker optional for local Postgres                                                                               |

---

## Decisions — RESOLVED

### ✅ Decision 1 — Real-time topology → **Single Next.js 16 app (Option A)**

The PDF mandates **"Backend/Frontend: Next.js 16,"** but a persistent WebSocket can't run on Vercel
serverless. **Chosen: one Next.js 16 app** (frontend + backend + realtime via a custom Node server),
deployed on **Railway** — the most literal reading of the mandate (one codebase, 100% Next.js/TS, no
separate backend service). The runner-up (Next.js on Vercel + a separate WS service) was rejected
because it would split the backend off the mandated Next.js stack. Reflected in
[02](./02-system-architecture.md), [03](./03-tech-stack-decisions.md) ADR-4/9,
[13](./13-deployment-and-cicd.md).

### ✅ Decision 2 — AI provider → **Vercel AI SDK + Google Gemini**

The PDF's good-to-have AI list is **"AI-SDK, OpenAI, Gemini or Groq"** (no Claude). **Chosen: Vercel AI
SDK (`@ai-sdk/google`) + Gemini** — both literally on the list; Gemini Flash for inline, Pro for
summaries/diff; generous free tier for the demo. Claude is not used. Groq/OpenAI remain swap-in options
behind the same AI-SDK interface. Reflected in [10](./10-ai-features.md),
[03](./03-tech-stack-decisions.md) ADR-8.

---

## Fixes applied in this pass (no decision needed)

- 🔧 **Testing stack → Jest + React Testing Library + Playwright** (matches the JD's named frameworks),
  replacing Vitest. [12](./12-testing-strategy.md) updated.
- 🔧 **React Context API + Query Params made explicit** (the PDF names them): Context API for
  cross-cutting client state (auth/session, theme, sync-status), Query Params for shareable/navigable
  state (e.g. `?version=<id>` for version preview, document list `?search=&sort=&page=`).
  [02](./02-system-architecture.md) updated.

---

## Verdict

**100% of both PDFs is now reflected in the plan, with no open decisions.** Every Assignment-PDF
requirement is covered (Tech Stack, Functionality, Must-Have, Good-to-Have, Evaluation, Submission),
the named React/Node/Next competencies are explicit, and the JD's stack/nice-to-haves
(App Router, Prisma + PostgreSQL, Railway, Jest/RTL/Playwright) are honored. Both prior deviations are
resolved: **single Next.js 16 app on Railway** (Decision 1) and **Vercel AI SDK + Google Gemini**
(Decision 2). Ready to build from [14-implementation-roadmap.md](./14-implementation-roadmap.md) M0.
