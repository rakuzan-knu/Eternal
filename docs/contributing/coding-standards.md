# 📐 Coding Standards & Conventions

To maintain a world-class codebase as an open-source project, all contributors and maintainers adhere to the following architecture rules, style standards, and Git conventions.

---

## 🏛️ Monorepo & Architectural Rules

1. **Zero `packages/` Directory (ADR 002)**:
   - Shared contracts and types live in `backend/src/common/contracts/` and are consumed directly by the frontend via TypeScript path aliases.
   - Do not attempt to extract synthetic packages into a `packages/` folder.
2. **Strict TypeScript**:
   - Zero implicit `any`.
   - Zero unused variables or unused imports (`knip` and `eslint` enforce this).
   - Strict null checks enabled.
3. **No Dead Code**:
   - Every file, export, and dependency must be actively utilized. Knip runs in CI to detect unused exports.

---

## 🟦 Backend Conventions (NestJS + Fastify)

### 1. Strict 4-Tier Layering

```
Controller ──> Service ──> Repository ──> PrismaService
```

- **Controllers** only handle routing, guards, HTTP codes, and mapping DTOs.
- **Services** contain business invariants, transaction dispatch, and queue calls.
- **Repositories** wrap database queries and Prisma calls behind interfaces.
- **Controllers & Services MUST NEVER call `PrismaService` directly**.

### 2. Validation with Zod Contracts

- Do not use `class-validator` decorators.
- Define schemas in `backend/src/common/contracts/<domain>.ts` using Zod.
- Apply `ZodValidationPipe` to controller action arguments.

### 3. Testing Rules

- Backend tests are **strictly End-to-End (E2E)** in `backend/test/` using Jest and Supertest.
- Do not write unit tests (`*.spec.ts`) in `backend/src/` unless explicitly requested.
- Keep E2E contracts and test assertions intact during refactors.

---

## 🟩 Frontend Conventions (React 19 + FSD)

### 1. Feature-Sliced Design (FSD) Layer Rules

```
app ──> pages ──> widgets ──> features ──> entities ──> shared
```

- **Unidirectional Imports**: Modules may only import from strictly lower layers.
- **Public API Isolation**: Each slice must expose its components and functions through its root `index.ts`.
- **No Deep Imports**: Importing from `entities/user/ui/UserAvatar.tsx` is forbidden; use `entities/user` instead.

### 2. State & Data Handling

- **Server State**: Always use TanStack Query (`useQuery`, `useMutation`). Never replicate server state in Zustand or component state.
- **UI State**: Use Zustand for local UI preferences, open modal flags, or media playback state.
- **Mandatory States**: Every data-driven UI component **must handle all three states explicitly**:
  1. `isLoading`: Render skeletons or spinners.
  2. `isError`: Render error message and retry button.
  3. `isEmpty`: Render a friendly empty state illustration and action.

### 3. Forms

- All forms use **React Hook Form** paired with `zodResolver`.
- Validate against contracts imported from `@backend/common/contracts`.

---

## 💬 Git & Commit Conventions

We strictly enforce **Conventional Commits** via Husky and `@commitlint`:

```text
<type>(<scope>): <short summary>
```

### Commit Types

- `feat`: A new feature or enhancement.
- `fix`: A bug fix.
- `docs`: Documentation changes only.
- `refactor`: Code changes that neither fix bugs nor add features.
- `perf`: Performance improvements.
- `test`: Adding or correcting tests.
- `chore`: Tooling, configs, dependency updates.

### Examples

```bash
feat(backend): add story sticker poll voting endpoint
fix(chat): prevent optimistic duplicate messages on reconnect
docs(architecture): document FSD layer isolation rules
perf(database): add composite index for notification feed
```

---

## 🌿 Branch Naming & Pull Requests

### Branch Naming

```text
feat/<ticket-or-issue-id>-<short-description>
fix/<ticket-or-issue-id>-<short-description>
chore/<ticket-or-issue-id>-<short-description>
```

_Examples:_ `feat/issue-42-story-polls`, `fix/chat-socket-reconnect`

### PR Checklist

Before marking your PR as ready for review:

- [ ] All tests pass (`pnpm test`).
- [ ] Linter reports 0 errors (`pnpm lint`).
- [ ] TypeScript check passes (`pnpm typecheck`).
- [ ] Code formatting is verified (`pnpm format:check`).
- [ ] Conventional commit messages used.
