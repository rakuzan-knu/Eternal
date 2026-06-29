# 🤝 Contributing Guide

Welcome to the team! This document describes the development workflow, coding standards, and Git rules for our **Social Network** project.

Following these guidelines helps us:

* Keep the codebase clean and maintainable
* Reduce code review time
* Minimize Git conflicts
* Ensure consistent architecture across the project

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

* ✅ Description
* ✅ Acceptance Criteria (AC)
* ✅ Story Point estimation

> **If anything is unclear, contact the team in the Team Chat.**

---

# 🌿 2. Git Workflow

We use a **Feature Branch Workflow**.

* Every branch is created from `main`.
* Every change goes back to `main` through a **Pull Request**.
* Direct commits to `main` are **not allowed**.

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

* automated changelogs
* clean Git history
* readable project timeline

## Format

```text
<type>(<scope>): <short description> [<Jira-ID>]
```

### Types

* feat
* fix
* refactor
* chore
* docs
* style
* test

### Scope

Use the module or FSD slice you are working on.

Examples:

* `feed`
* `chat`
* `auth`
* `profile`
* `user`

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

* Use `PrismaService` through Dependency Injection.
* ❌ Do not execute raw SQL.

### Validation

Every request must use:

* DTOs
* `class-validator`

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

* What was implemented
* How to test the changes
* Link to the Jira ticket

---

## Keep PRs Small

Aim for **less than 300 lines of code**.

Smaller PRs are:

* easier to review
* easier to test
* less likely to cause merge conflicts

---

## Code Review Requirements

Before merging:

* ✅ At least **2 approvals**
* ✅ All CI checks must pass
* ✅ Build succeeds
* ✅ Linter passes
* ✅ Formatter passes
* ✅ Tests pass

---

## Merging

After approval:

* Use **Squash and Merge**
* Move the Jira task to:

    * **In Review**
    * **Done**

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
