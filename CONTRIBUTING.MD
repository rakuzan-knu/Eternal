# 🤝 Contributing Guide

Welcome to the team! This document describes the development workflow, coding standards, and Git rules for our **Social Network** project.

Following these guidelines helps us:

- Keep the codebase clean and maintainable
- Reduce code review time
- Minimize Git conflicts
- Ensure consistent architecture across the project

---

# 📋 1. Jira & Task Lifecycle

Before writing a single line of code, you **must** have an assigned Jira task.

### Workflow

1. Find your task.
2. Move it to **In Progress**.
3. Read the task carefully.
4. Create a Pull Request (PR) once the code is ready.
5. Move the task to In Review.
6. Once the PR is merged, move the task to Done.

### Requirements

Before starting development, verify that the task contains:

- ✅ Description
- ✅ Acceptance Criteria (AC)
- ✅ Story Point estimation

> **If anything is unclear, contact the team in the Team Chat.**

---

# 🌿 2. Git Workflow

We use a **Feature Branch Workflow**.

- Every branch is created from `main`.
- Every change goes back to `main` through a **Pull Request**.
- Direct commits to `main` are **not allowed**.

## Branch Naming

```text
<type>/<jira-ticket-id>-<short-description>
```

### Available Types

| Type        | Description                                 |
| ----------- | ------------------------------------------- |
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

# 💬 3. Commit Message Convention

We follow **Conventional Commits**.

This is required for:

- automated changelogs
- clean Git history
- readable project timeline

## Format

```text
<type>(<scope>): <short description> [<Jira-ID>]
```

### Types

- feat
- fix
- refactor
- chore
- docs
- style
- test

### Scope

Use the module or FSD slice you are working on.

Examples:

- `feed`
- `chat`
- `auth`
- `profile`
- `user`

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

When your feature is complete, open a Pull Request from your feature branch into `main`.

## PR Title

Use the same format as Conventional Commits.

Example:

```text
feat(feed): implement post likes [SOC-124]
```

---

## PR Description

Include:

- What was implemented
- How to test the changes
- Link to the Jira ticket

---

## Keep PRs Small

Aim for **less than 300 lines of code**.

Smaller PRs are:

- easier to review
- easier to test
- less likely to cause merge conflicts

---

## Code Review Requirements

Before merging:

- ✅ At least **2 approvals**
- ✅ All CI checks must pass
- ✅ Build succeeds
- ✅ Linter passes
- ✅ Formatter passes
- ✅ Tests pass

---

## Merging

After approval:

- Use **Squash and Merge**
- Move the Jira task to:
  - **In Review**
  - **Done**

---

# ⚙️ 5. Environment Setup (Required before the first commit)

To ensure everyone gets an identical `lint`/`format`/`build` result regardless of their OS:

1. Use the Node version from `.nvmrc`:
   ```bash
   nvm use
   ```
   If the Node version doesn't match, `npm install` will intentionally fail (`engine-strict=true` in `.npmrc`). This is a feature, not a bug—install the required version.
2. Run `npm install` in the repository root (not inside `backend/` or `frontend/` separately)—workspaces will handle everything automatically, plus `prisma generate` will run automatically.
3. Do not change `end_of_line`/`indent_style` in your editor—they are fixed in `.editorconfig` and `.gitattributes`. Git will automatically normalize line endings to LF upon commit.
4. Never commit with `--no-verify`—if a hook gets in the way, it's a bug in the hook, not a reason to bypass it. Write to the Team Chat.

---

# 🔒 6. Why PRs Cannot Be Merged Manually

The `main` branch is protected by branch protection rules:

- You cannot push to `main` directly (even admins).
- A PR cannot be merged until all mandatory CI jobs are green: `lint`, `typecheck`, `test`, `build`, `PR Title Lint`.
- A minimum of 1 approval is required, and for `backend/`, `frontend/`, `.github/`—an approval from the corresponding code owner from `.github/CODEOWNERS`.
- Only **Squash and Merge** is allowed—the PR title becomes the final commit message in `main`, therefore:
  - The PR title must be in the format `<type>(<scope>): <description> [SOC-XXX]`.
  - Do not squash or amend commits in your branch after pushing—leave the history "as is", this does not affect the final history of `main` and allows GitHub to correctly insert `pull_request_template.md` instead of the commit text.

---

# 🚀 Getting Started

1. Open Jira.
2. Move your ticket to **In Progress**.
3. Create a branch.

```bash
git checkout -b feat/SOC-123-your-feature
```

4. Start coding.

---

# 💡 Need Help?

If you're blocked, remember the **1-hour rule** described in the main project README.

Don't stay stuck for too long—ask the team for help when needed.

Happy coding! 🎉
