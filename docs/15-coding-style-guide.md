# 15 — Coding Style Guide (derived from your existing code)

This guide is reverse-engineered from your **whatsapp-project** repos so Conflux reads like _your_
code, not generated code:

- **Backend reference:** `whatsapp-backend/*` — Serverless + middy + Sequelize, TypeScript.
- **Frontend reference:** `whatsapp-frontend/Whatsapp Project-3` — CRA + formik/yup + reactstrap + redux.

> **Scope — read this first.** This guide governs **coding style only**: formatting, naming, file
> organization, comments, error-handling _shape_, and recurring patterns. It does **not** decide the
> tech stack. **Conflux's stack comes entirely from the assignment PDF** and is fixed in
> [02-system-architecture.md](./02-system-architecture.md) and
> [03-tech-stack-decisions.md](./03-tech-stack-decisions.md): Next.js 16, React, TypeScript,
> Tailwind/shadcn, PostgreSQL, Prisma, Auth.js, Vercel AI SDK + **Google Gemini** (plus Yjs/Tiptap/
> IndexedDB/WebSocket to satisfy the local-first / CRDT / real-time requirements), shipped as a
> **single Next.js 16 app** (custom server hosts the WebSocket) on Railway. **None of the reference
> repos' frameworks carry over** — not Serverless, Sequelize, joi, CRA, redux, reactstrap, or formik.
> We borrow your _habits_, not your libraries.

Where your two repos disagree or where I spotted a defect, it's called out under §9 (what to keep vs.
fix).

---

## 1. Formatting (project standard)

Your backend has a deliberate, explicit Prettier/ESLint config; your CRA frontend just used defaults
(so it drifted). Since Conflux is TypeScript end-to-end like the backend, **we adopt your backend
config as the single project standard:**

```jsonc
// .prettierrc.json  (your backend's actual config)
{ "singleQuote": true, "trailingComma": "none", "tabWidth": 2, "semi": false }
```

- **Single quotes**, **no semicolons**, **2-space indent**, **no trailing commas**.
- ESLint: `eslint:recommended` + `@typescript-eslint/recommended` + `prettier/recommended`;
  `@typescript-eslint/no-explicit-any: off` (you allow `any` pragmatically).

> Decision flagged: your frontend used semicolons + double quotes; that was CRA inertia, not intent.
> I'm standardizing on the backend's no-semicolon/single-quote config for consistency. Say the word if
> you'd rather the whole project use semicolons.

---

## 2. The habits that make code look like yours

These show up in _both_ repos and are the strongest "your-voice" signals — reproduce them everywhere:

### 2.1 Short section-marker comments

You label logical blocks with terse comments. Reproduce exactly this rhythm:

```ts
// State
const [loading, setLoading] = useState(false)

// Mount
useEffect(() => { ... }, [])

// Login api call
const userLogin = (userData) => { ... }
```

Backend equivalent: a one-line comment naming each function/section (`// User Login`,
`// Forgot password`, `// Verify Email`). Components use `// Props`, `// Store`, `// State`, `// Mount`,
`// Unmount`.

### 2.2 Defensive optional-chaining + `|| fallback`

Pervasive in your code — keep it:

```ts
name: restaurant?.name || null
restaurantId: user?.restaurant ? user.restaurant.id : null
value: formik?.values?.[fieldName] || value || ''
```

### 2.3 Guard clauses with early throw/return

Single-line guards, one fact per check:

```ts
if (!user) throw new NotFoundError(messageConstant.USER_NOT_FOUND)
if (!passwordMatch) throw new BadRequestError(messageConstant.LOGIN_FAILED)
```

### 2.4 No hardcoded strings — everything in a constants object

You never inline user-facing strings or status codes. They live in dedicated constant objects:

```ts
const messageConstant = {
  LOGIN_SUCCESS: 'Login successfully',
  USER_NOT_FOUND: 'User not found'
}
```

Conflux mirrors this: `lib/constants/{message,http,schema}.constant.ts` with a barrel `index.ts`.

### 2.5 Barrel `index` files per folder

`constant/index.ts`, `libs/index.ts`, `middleware/index.ts`, `db/models/index.ts` re-export their
folder. Imports are short: `from '../../libs'`, `from '../../constant'`. Conflux does the same under
`lib/`, `components/`, `packages/*`.

### 2.6 Named exports grouped at the bottom (services/handlers)

```ts
export { login, forgotPassword, resetPassword }
```

For config/route-definition modules you use inline `export const` (your serverless `index.ts`). Keep
both: grouped exports for logic modules, inline `export const` for declarative config.

---

## 3. Backend patterns → Conflux (Next.js Route Handlers + Prisma)

Your serverless code has a clean **handler ↔ service ↔ validation ↔ constants ↔ libs** separation.
Conflux keeps the same separation, mapped onto Next.js:

| Your serverless                                                                      | Conflux equivalent                                                     |
| ------------------------------------------------------------------------------------ | ---------------------------------------------------------------------- |
| `functions/<f>/index.ts` (serverless route defs)                                     | route registration is implicit in App Router file paths                |
| `functions/<f>/handler.ts` (middy wiring + validation)                               | `app/api/<f>/route.ts` — thin: auth → validate → call service → format |
| `functions/<f>/service.ts` (business logic, returns `{ statusCode, message, data }`) | `lib/services/<f>.service.ts` — same shape, returns a typed result     |
| `middleware/response-handler` (envelope)                                             | `lib/http/respond.ts` — same `{ code, message, data }` envelope        |
| `libs/error-class.lib.ts`                                                            | `lib/errors/index.ts` — same class names                               |
| `validations/<f>.validation.ts` (joi)                                                | `packages/validators/<f>.ts` (zod) — same one-file-per-feature         |

### 3.1 Keep your service return shape and response envelope

Services return a plain object; a single helper formats the HTTP response — exactly your
`responseHandler`:

```ts
// service returns this (your pattern)
return { statusCode: httpStatusConstant.OK, message: messageConstant.LOGIN_SUCCESS, data: userObj }

// response envelope on success: { code, message, data }
// response envelope on error:   { code, message, error }
```

### 3.2 Reproduce your error-class hierarchy verbatim (names matter)

Your `BaseError` + typed subclasses is a strong signature. Conflux ships the same set:

```ts
export class BaseError extends Error {
  public code: number
  public errorType: string
  constructor(code: number, errorType: string, message: string) {
    super(message)
    this.name = 'BaseError'
    this.code = code
    this.errorType = errorType
  }
}
export class NotFoundError extends BaseError {
  /* httpStatus.NOT_FOUND ... */
}
export class BadRequestError extends BaseError {
  /* ... */
}
export class UnauthorizedError extends BaseError {
  /* ... */
}
export class AccessForbiddenError extends BaseError {
  /* ... */
}
// + ValidationError, RequestConflictError, InternalServerError, etc.
```

Services `throw new NotFoundError(messageConstant.X)`; the route's catch maps it to the error envelope
(your `genericErrorHandler` role).

### 3.3 Validation lives in its own file, one object of schemas

The _organization_ transfers (validators separate, imported as one object), independent of library.
Conflux's validation library is whatever [03](./03-tech-stack-decisions.md) specifies (Zod) — your
repos' joi does **not** carry over. Same structure, same call-site ergonomics:

```ts
// packages/validators/auth.ts  (your file organization; library per doc 03)
export const authValidation = {
  loginSchema: z.object({ email: z.string().email(), password: z.string().min(1) }),
  resetPasswordSchema: z.object({
    /* ... */
  })
}
// call site stays like yours: authValidation.loginSchema
```

### 3.4 Reusable `lib/` wrappers (your `libs/` habit)

You centralize cross-cutting helpers as small libs accessed as objects: `jwtLib.tokenGenerator`,
`bcryptLib.hashPassword`, `mailLib.mailSend`. Conflux mirrors this under `lib/`: `crdtLib`, `syncLib`,
`authLib`, etc., each a focused module re-exported via a barrel.

### 3.5 Models

Your Sequelize models use `sequelize-typescript` decorators, one model per file, `export default`.
Conflux uses Prisma (schema-first, no model classes) — so this specific pattern doesn't transfer, but
the **one-concern-per-file + barrel** habit does (scoped query helpers live in `packages/db/`).

---

## 4. Frontend patterns → Conflux (Next.js + React + Tailwind)

Your CRA app has a very consistent component/data shape. Most of it transfers directly.

### 4.1 Folder-per-component, `index` entry

`components/InputField/index.jsx`, `pages/Login/index.jsx`. Conflux keeps **folder-per-component with
an `index.tsx`** for non-trivial components (co-locate styles/sub-parts), single-file for tiny ones.

### 4.2 Two component declaration styles (you use both — keep the split)

- Pages: `const Login = () => { ... }; export default Login`
- Shared components: `export default function InputField(props) { ... }`

### 4.3 Section comments inside components

`// Store` (selectors), `// State` (useState), `// Props` (destructure), `// Mount` / `// Unmount`
(effects). Keep these.

### 4.4 Data layer: thin `API` wrapper + per-feature "middleware" modules

This is your cleanest pattern and we keep it conceptually:

- A single request wrapper (your `services/api.js` → `API(method, endpoint, data)`).
- **Per-feature modules** that hold the API call + side effects (toast + state update), so components
  stay declarative:

```ts
// your pattern: pages/<area>/utils/middleware/<feature>.js
export const getCategories = (search, sortBy, orderBy, page = 1) => {
  dispatch(Actions.RestaurantAdmin.SetLoading, true)
  API(API_REQUEST.get, CATEGORIES_API, { params })
    .then(res => { dispatch(...); dispatch(SetLoading, false) })
    .catch(err => { handleError(err); dispatch(SetLoading, false) })
}
```

Conflux adaptation: since it's local-first, most "data" comes from the CRDT/IndexedDB, not REST. The
equivalent thin modules live in `lib/services/*` (REST: documents, versions, members) and `lib/sync/*`
(CRDT). We keep the **same shape**: a focused function per action, success/error handled in one place,
the component just calls it. The "feature module wraps the call + side effects" _habit_ is what we
preserve; the state mechanism is whatever [03](./03-tech-stack-decisions.md) defines (React
hooks/context) — your repos' **redux does not carry over**.

### 4.5 DTO mappers (your `utils/dtos/*` habit — keep it)

You explicitly reshape API responses field-by-field with fallbacks instead of passing raw payloads to
the UI. This is a genuinely good habit; Conflux keeps it for REST DTOs:

```ts
export function documentsListDTO(data) {
  if (!data?.length) return []
  return data.map((doc) => ({
    id: doc?.id || null,
    title: doc?.title || 'Untitled',
    role: doc?.role || null,
    updatedAt: doc?.updatedAt || null
  }))
}
```

### 4.6 Forms: schema-driven (habit, not library)

Your habits transfer regardless of form library: validation schemas in a dedicated
`constants/schemas` / `packages/validators` file, **field-config arrays** in a constants file (your
`registrationInputFields` pattern), and reusable `InputField`-style components. The actual form/validation
library is a [03](./03-tech-stack-decisions.md) decision — your repos' **formik/yup do not carry over**.
(Forms are a minor surface here anyway; this is a rich-text editor, not a form-heavy app.)

### 4.7 Constants organization

`constants/{General,Configs,Routes,Schemas}/index.js` — General holds enums/config arrays, Configs the
endpoint URLs, Routes the paths, Schemas the validators. Conflux mirrors: `lib/constants/*` (or
`packages/constants`) split the same way; enums as `PascalCase` objects (`USER_ROLE`, `MessageType`),
message strings as one object.

### 4.8 Toast + feedback

`handleSuccess(res)` / `handleError(err)` helpers from a `utils/toast` module, called in the data
layer. Conflux keeps a single toast helper module (shadcn/sonner) called the same way.

---

## 5. Naming conventions (observed)

| Thing              | Convention                                 | Example                                                     |
| ------------------ | ------------------------------------------ | ----------------------------------------------------------- |
| Functions / vars   | `camelCase`                                | `forgotPassword`, `userTokenData`                           |
| React components   | `PascalCase`                               | `InputField`, `Categories`                                  |
| Component folders  | `PascalCase/index`                         | `ConfirmationModal/index.jsx`                               |
| Constant objects   | `camelCase` holding `SCREAMING_SNAKE` keys | `messageConstant.USER_NOT_FOUND`                            |
| Enum-like objects  | `PascalCase` or `SCREAMING_SNAKE`          | `USER_ROLE.SUPER_ADMIN`, `MessageType.Success`              |
| Backend files      | `<name>.<kind>.ts`                         | `auth.validation.ts`, `user.model.ts`, `error-class.lib.ts` |
| Barrels            | `index.ts` per folder                      | `constant/index.ts`                                         |
| Endpoint constants | `SCREAMING_SNAKE` `_API` suffix            | `LOGIN_API`, `CATEGORIES_API`                               |

---

## 6. Imports

- Group: third-party first, then internal (your handler.ts does this loosely).
- Prefer barrel imports (`from '../../libs'`) over deep paths where a barrel exists.
- `import type { ... }` for type-only imports (you do this: `import type { MailData, LambdaHandler }`).
- Path aliases where configured (you use `src/middleware`, `@libs/handler-resolver`); Conflux sets up
  `@/` aliases via tsconfig.

---

## 7. Comments & docs

- Short section markers (§2.1) — yes, everywhere.
- Block comments `/* ... */` for non-obvious _why_ (your forgot-password SES note). Keep these for
  genuinely non-obvious decisions; don't over-comment obvious code.
- No JSDoc walls in your code — match that. Comment intent, not mechanics.

---

## 8. A representative Conflux snippet in your style

What a Conflux service + route should look like (your patterns, new stack):

```ts
// lib/services/document.service.ts
import { prisma } from '@/lib/db'
import { httpStatusConstant, messageConstant } from '@/lib/constants'
import { NotFoundError, AccessForbiddenError } from '@/lib/errors'

// Get a document the user can access
export const getDocument = async (userId: string, documentId: string) => {
  const membership = await prisma.documentMembership.findUnique({
    where: { documentId_userId: { documentId, userId } }
  })
  if (!membership) throw new AccessForbiddenError(messageConstant.NO_ACCESS)

  const document = await prisma.document.findUnique({ where: { id: documentId } })
  if (!document) throw new NotFoundError(messageConstant.DOCUMENT_NOT_FOUND)

  return {
    statusCode: httpStatusConstant.OK,
    message: messageConstant.DOCUMENT_RETRIEVED,
    data: { id: document.id, title: document.title, role: membership.role }
  }
}
```

```ts
// app/api/documents/[id]/route.ts  — thin handler (your handler/service split)
export const GET = withResponse(async (req, { params }) => {
  const user = await requireSession(req)
  return getDocument(user.id, params.id) // service returns { statusCode, message, data }
})
```

`withResponse` is the Conflux analog of your `responseHandler` middleware — formats success as
`{ code, message, data }` and errors (via the `BaseError` classes) as `{ code, message, error }`.

---

## 9. What to keep vs. what to fix (you asked not to copy blindly)

**Keep (these are good, intentional habits):**

- Section-marker comments, constants centralization, DTO mappers, handler/service separation, typed
  error classes, defensive `?.`/`||`, per-feature data modules, barrel files.

**Fix / don't reproduce (defects or drift spotted in the reference):**

- **Stray/dead expressions** — e.g. `decodedData` on its own line in `auth/service.ts` (no-op);
  duplicated logic (`restaurant ? (userName = ...) : ...` immediately followed by
  `if (restaurant) { userName = ... }`). Write the single correct version.
- **`console.log` left in handlers/components** (`response-handler`, `Categories` page). Use a logger
  (or remove) — no stray `console.log` in committed code.
- **Inconsistent quotes/semicolons on the frontend** — Conflux is consistent (§1).
- **Very long single-line JSX** with many inline handlers (your `Categories` table rows). Keep your
  density preference but extract heavy inline handlers into named functions for readability/testing.
- **`var`** (appears in `services/middleware.js`) — use `const`/`let`.
- **Type-safety gaps** — backend allows `any` and reuses `let userName: string` then assigns in two
  ways; in Conflux's TS we type results properly (the env is stricter and graded on it).

---

## 10. TL;DR for code generation

When writing Conflux code, I will: use single quotes + no semicolons (2-space), add your short
section-marker comments, centralize strings in constant objects, separate route(thin)/service(logic)/
validator/DTO, ship the `BaseError` class family with the `{ code, message, data|error }` envelope,
write per-feature data modules with one-place success/error handling, use defensive `?.`/`||`, and
keep components declarative with folder-per-component `index` files — while dropping the §9 defects.
