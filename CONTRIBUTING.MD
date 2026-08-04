# 🤝 Contributing Guide

Welcome to the team! This document describes the development workflow, coding standards, and Git rules for our **Social Network** project.

Following these guidelines helps us:

- Keep the codebase clean and maintainable
- Reduce code review time
- Minimize Git conflicts
- Ensure consistent architecture across the project
- Automatically generate releases, version tags, and changelogs via **semantic-release**

---

# 📋 1. Jira & Task Lifecycle

Before writing a single line of code, you **must** have an assigned Jira task.

### Workflow

1. Find your task.
2. Move it to **In Progress**.
3. Read the task carefully.
4. Create a Pull Request (PR) once the code is ready.
5. Move the task to **In Review**.
6. Once the PR is merged, move the task to **Done**.

### Requirements

Before starting development, verify that the task contains:

- ✅ Description
- ✅ Acceptance Criteria (AC)
- ✅ Story Point estimation

> **If anything is unclear, contact the team in the Team Chat.**

---

# 🌿 2. Git Workflow & Branching

We use a **Feature Branch Workflow** integrated with automated release channels.

- Standard feature branches are created from `main` or `develop`.
- Direct pushes to `main` or `develop` are **strictly forbidden**.
- All changes must pass through a **Pull Request**.

### Release Channels & Target Branches

| Branch    | Release Channel      | Resulting Version Example |
| :---      | :---                 | :---                      |
| `main`    | Production (Stable)  | `v1.2.0`                  |
| `develop` | Beta (Pre-release)   | `v1.2.0-beta.1`           |

## Branch Naming Standard

```text
<type>/<jira-ticket-id>-<short-description>
```

### Available Branch Types

| Type        | Description                                 |
| :---        | :---                                        |
| `feat/`     | New features or architectural additions     |
| `fix/`      | Bug fixes                                   |
| `refactor/` | Code improvements without changing behavior |
| `chore/`    | Dependencies, configs, tooling, maintenance |

### Examples

```bash
feat/SOC-124-like-post-backend
fix/SOC-89-auth-token-refresh
chore/SOC-210-update-prisma-client
```

---

# 💬 3. Commit Message Convention & Release Impact

We follow **Conventional Commits**, strictly enforced via `@commitlint` and processed by **Semantic Release**.

## Commit Format

```text
<type>(<scope>): <short description> [<Jira-ID>]
```

## Constraints

- **Subject Length:** Maximum **100 characters**.
- **Body Line Length:** Maximum **200 characters** per line.
- **Jira Suffix:** Mandatory suffix format for tasks: `[SOC-XXX]`.
- **Ignored Commits:** Commits starting with `Merge` or `Revert` bypass linter rules automatically.

### Allowed Types & Release Impact

The type you choose dictates how **Semantic Release** bumps project versions and updates `CHANGELOG.md`:

| Type                | Version Bump        | Listed in Changelog?           | Description                            |
| :---                | :---                | :---                           | :---                                   |
| **`feat`**          | **Minor** (`x.X.0`) | YES (Features)                 | A new feature                          |
| **`fix`**           | **Patch** (`x.x.X`) | YES (Bug Fixes)                | A bug fix                              |
| **`perf`**          | **Patch** (`x.x.X`) | YES (Maintenance/Tooling)      | Performance improvement                |
| **`revert`**        | **Patch** (`x.x.X`) | YES (Maintenance/Tooling)      | Reverts a previous commit              |
| **`refactor`**      | None                | YES (Refactoring)              | Code change with no logic modification |
| **`chore`**         | None                | YES (Maintenance/Tooling)      | Dependencies, configs, tooling         |
| **`docs`**          | None                | YES (Maintenance/Tooling)      | Documentation changes                  |
| **`style`**         | None                | YES (Maintenance/Tooling)      | Formatting, missing semi-colons, etc.  |
| **`test`**          | None                | YES (Maintenance/Tooling)      | Adding or fixing tests                 |
| **`ci`**            | None                | YES (Maintenance/Tooling)      | CI/CD changes                          |

> 💥 **Breaking Changes:** Any commit containing `BREAKING CHANGE:` in its footer or body will automatically trigger a **Major version bump** (`X.0.0`), regardless of type.

### Allowed Scopes

Scope is optional. If provided, it must be one of:
`auth`, `feed`, `chat`, `profile`, `user`, `post`, `follow`, `media`, `ws`, `infra`, `deps`, `security`, `backend`, `frontend`.

### Examples

```text
feat(feed): add like post vertical slice [SOC-124]

fix(auth): fix jwt token expiration guard [SOC-89]

refactor(profile): move avatar component to entities layer [SOC-55]
```

---

# 🏗️ 4. Coding Standards

## Backend (NestJS)

### Architecture

- Follow the standard NestJS modular architecture.
- Organize code by feature modules (auth, users, posts, comments, etc.).
- Keep controllers, services, DTOs, and repositories inside their corresponding module.

### Prisma

- Use `PrismaService` through Dependency Injection.
- ❌ Do not execute raw SQL.

### Validation

Every request must use:

- DTOs
- `class-validator`

---

## Frontend (React)

### Architecture

Strictly follow **Feature-Sliced Design (FSD)**.

### State Management

Use **TanStack Query** for all server state.

Queries and mutations belong inside the `model/` segment of the corresponding slice.

### UI Components

Before creating a new component:

1. Check `shared/ui/`.
2. Reuse existing components whenever possible.

> Don't reinvent buttons, inputs, modals, or other common UI elements.

---

# 🔀 5. Pull Request Guidelines

When your feature is complete, open a PR into `main` (for stable releases) or `develop` (for beta builds).

## PR Title Guidelines

PR Titles are validated in CI via GitHub Actions (`amannn/action-semantic-pull-request`).

- **Format:** Must strictly follow Conventional Commits format (`<type>(<scope>): <description> [SOC-XXX]`).
- **Subject Length:** Maximum **100 characters**.
- **Scope:** Optional, but if specified, it must match allowed scopes.

### Allowed PR Types

`feat`, `fix`, `refactor`, `chore`, `docs`, `style`, `test`, `perf`, `ci`, `revert`

### Allowed PR Scopes

`auth`, `feed`, `chat`, `profile`, `user`, `post`, `follow`, `media`, `ws`, `infra`, `deps`

---

## PR Description & Rules

- **Content:** Detail what was implemented, how to test, and include a link to the Jira ticket.
- **Keep PRs Small:** Aim for **less than 300 lines of code**.

---

## Code Review Requirements

Before merging:

- ✅ At least **2 approvals** (including relevant Code Owners)
- ✅ All CI checks must pass (`lint`, `typecheck`, `test`, `build`, `PR Title Lint`)
- ✅ Build, linter, formatter, and tests succeed.

---

## Merging & Automated Release

After approval:

- Use **Squash and Merge**.
- The PR title becomes the squash commit message in `main`/`develop`, which directly triggers **Semantic Release**.
- Move the Jira task to **Done**.

---

# ⚙️ 6. Environment Setup (Required before the first commit)

To ensure everyone gets an identical `lint`/`format`/`build` result regardless of OS:

1. Use the Node version from `.nvmrc`:
   ```bash
   nvm use
   ```
   If the Node version doesn't match, `npm install` will fail (`engine-strict=true` in `.npmrc`).
2. Run `npm install` in the repository root (workspaces will handle everything, including `prisma generate`).
3. Do not change `end_of_line`/`indent_style` in your editor—they are fixed in `.editorconfig` and `.gitattributes`.
4. Never commit with `--no-verify`—if a hook fails, ask in Team Chat.

---

# 🔒 7. Why PRs Cannot Be Merged Manually

Protected branch rules are enabled on `main` and `develop`:

- Direct pushes are prohibited.
- PRs cannot be merged until all mandatory CI checks pass.
- Approvals from `.github/CODEOWNERS` are mandatory for `backend/`, `frontend/`, and `.github/`.
- Only **Squash and Merge** is allowed—because the PR title becomes the single commit entry driving automatic releases.

---

# 🚀 Getting Started

1. Open Jira.
2. Move your ticket to **In Progress**.
3. Create a branch:
   ```bash
   git checkout -b feat/SOC-123-your-feature
   ```
4. Start coding.

---

# 💡 Need Help?

If you're blocked, remember the **1-hour rule** described in the main project README.

Don't stay stuck for too long—ask the team for help when needed.

Happy coding! 🎉