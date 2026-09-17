# 🌿 Open-Source Contribution Workflow

This document outlines the standard Git and GitHub workflow for contributing to the **Social Network** repository.

---

## 🎯 Finding or Creating an Issue

Before starting substantial work, check our [GitHub Issues](https://github.com/rakuzan-knu/social-network/issues):

1. **Assigned or Claimed**: Comment on an existing issue if you would like to work on it, and maintainers will assign it to you.
2. **New Proposals**: If proposing a major feature or architectural change, open an Issue first or start a GitHub Discussion to discuss design trade-offs.

---

## 🌿 Branch Naming Convention

Create a branch off the latest `main` (or `develop` if targeting active beta cycles):

```text
<type>/<issue-number>-<short-description>
```

Or for minor changes without an issue number:

```text
<type>/<short-description>
```

### Supported Branch Types:

| Prefix      | Description                               | Example                       |
| :---------- | :---------------------------------------- | :---------------------------- |
| `feat/`     | New user feature or capability            | `feat/104-story-polling`      |
| `fix/`      | Bug fix or error resolution               | `fix/208-websocket-reconnect` |
| `docs/`     | Documentation additions or edits          | `docs/api-websocket-guide`    |
| `perf/`     | Performance optimization                  | `perf/feed-index-tuning`      |
| `refactor/` | Code refactoring without behavior changes | `refactor/fsd-user-card`      |
| `chore/`    | Tooling, dependencies, or maintenance     | `chore/update-pnpm-version`   |

---

## 💬 Commit Message Standard

We enforce **Conventional Commits** validated via Husky and Commitlint:

```text
<type>(<scope>): <subject>
```

### Commit Types:

- `feat`: A new feature (triggers minor release)
- `fix`: A bug fix (triggers patch release)
- `docs`: Documentation updates
- `style`: Whitespace, formatting (zero code changes)
- `refactor`: Refactoring production code
- `perf`: Performance improvement
- `test`: Adding or refactoring tests
- `chore`: Maintenance tasks, dependencies

### Scopes:

- `auth`, `feed`, `chat`, `profile`, `user`, `post`, `follow`, `media`, `ws`, `infra`, `deps`, `security`, `backend`, `frontend`.

### Examples:

```bash
feat(chat): implement message reactions over websocket
fix(auth): handle expired refresh token gracefully
docs(architecture): clarify 4-tier backend layering
perf(feed): add composite index for timeline queries
```

---

## 🚀 Creating a Pull Request (PR)

1. **Push your branch** to your fork or origin:
   ```bash
   git push -u origin feat/104-story-polling
   ```
2. **Open a PR** against `main` (or `develop`).
3. **Fill out the PR Template**:
   - Reference the issue (e.g. `Closes #104`).
   - Describe what was changed and why.
   - Provide testing steps or screenshots for UI changes.
4. **Automated CI Gates**:
   - Every PR triggers GitHub Actions (`validate-eol`, `format-check`, `typecheck`, `lint`, `test`, `backend-e2e`, `lighthouse`).
   - All status checks must pass before merging.

---

## 🔍 Code Review & Merging

1. Maintainers will review your PR, suggest improvements, or approve.
2. Address review feedback with additional commits on the same branch.
3. Once approved and CI is green, your PR is squash-merged.
4. **Semantic Release** automatically analyzes conventional commit messages, tags a release, and updates `CHANGELOG.md`.
