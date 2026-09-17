# Changelog

All notable changes to this project will be documented in this file.

## [1.3.0](https://github.com/rakuzan-knu/social-network/compare/v1.2.0...v1.3.0) (2026-09-17)

### ✨ Features

* **backend:** complete system hardening, resilience and performance optimization [SOC-57] ([#79](https://github.com/rakuzan-knu/social-network/issues/79)) ([a29bc22](https://github.com/rakuzan-knu/social-network/commit/a29bc22daa2790bd62eae9669933b0694fd247e4))
* **frontend:** add comprehensive legal, privacy, safety and seo pages ([#78](https://github.com/rakuzan-knu/social-network/issues/78)) ([e090828](https://github.com/rakuzan-knu/social-network/commit/e090828ef50994c9ea7563eea5a1dae025f060d5))
* **infra:** resolved all security errors ([#69](https://github.com/rakuzan-knu/social-network/issues/69)) ([1ef3d0c](https://github.com/rakuzan-knu/social-network/commit/1ef3d0c709e265e4f8f41e0673bc2d2c1185e451))

### 🐛 Bug Fixes

* **chat:** fix contextual menus, notifications system, dnd and tab ba… ([#70](https://github.com/rakuzan-knu/social-network/issues/70)) ([fb65ad8](https://github.com/rakuzan-knu/social-network/commit/fb65ad83b8881a12a41963b50950f1316bd005bc))
* **chat:** improve group avatar, toasts and sidebar badge [SOC-89] ([#74](https://github.com/rakuzan-knu/social-network/issues/74)) ([df71dd7](https://github.com/rakuzan-knu/social-network/commit/df71dd73e4ce14be518a635b611c79e9aeb5199a))
* **chat:** site design improvements, voice and video notes, and ui fixes ([#67](https://github.com/rakuzan-knu/social-network/issues/67)) ([8c69478](https://github.com/rakuzan-knu/social-network/commit/8c694786a8cc1f230a8dbc882d487d0fc10f4e32))
* **frontend:** fix voice note uploads, comment modal ([#68](https://github.com/rakuzan-knu/social-network/issues/68)) ([e6f7c1a](https://github.com/rakuzan-knu/social-network/commit/e6f7c1a577253bafcbd1eb2782e05a51bfd0edc4))

## [1.2.0](https://github.com/rakuzan-knu/social-network/compare/v1.1.0...v1.2.0) (2026-08-18)

## [1.1.0](https://github.com/rakuzan-knu/social-network/compare/v1.0.4...v1.1.0) (2026-08-17)

## [1.0.4](https://github.com/rakuzan-knu/social-network/compare/v1.0.3...v1.0.4) (2026-08-15)

## [1.0.3](https://github.com/rakuzan-knu/social-network/compare/v1.0.2...v1.0.3) (2026-08-14)

## [1.0.2](https://github.com/rakuzan-knu/social-network/compare/v1.0.1...v1.0.2) (2026-08-14)

## [1.0.1](https://github.com/rakuzan-knu/social-network/compare/v1.0.0...v1.0.1) (2026-08-14)

## [1.0.0] - 2026-08-14

### ✨ Features
- **User & Profile:**
  - Added user badges system, verification checkmarks, and GitHub OAuth/profile integration (`#43`)
  - Added public/private profiles, avatar & banner upload, follow/unfollow system, and followers list (`[SOC-5]`, `[SOC-29]`)
  - Added settings for privacy, active user sessions, and follow request approvals
- **Feed & Posts:**
  - Implemented core Feed API: posts CRUD, likes, comments, and share counter (`[SOC-4]`, `[SOC-27]`, `#41`)
  - Added Polls model with interactive voting API and post attachments (`[SOC-38]`, `#40`)
  - Formatted post timestamps with explicit ISO serialization (`#26`)
- **Real-Time Chat & WebSockets:**
  - Designed database schema for conversations, participants, and direct messages (`#12`, `[SOC-12]`, `[SOC-18]`)
  - Initialized Socket.IO Gateway with JWT handshake authentication (`[SOC-15]`, `[SOC-16]`)
  - Added conversation rooms, active presence, typing indicators, and user join/leave events (`[SOC-13]`, `#20`)
  - Added `send_message` event with database persistence, room broadcast, and per-user Redis rate limiting (`[SOC-14]`, `[SOC-19]`, `#21`, `#22`)
  - Added `mark_as_read` event and real-time read receipt broadcasts (`[SOC-20]`, `#23`)
  - Built complete interactive chat UI on frontend connected to real-time WebSocket events (`#31`)
- **Authentication & Security:**
  - Implemented JWT access and refresh token authentication with Argon2 password hashing and AuthGuards (`[SOC-6]`, `[SOC-23]`)
  - Built frontend authentication pages: Login, Register, Forgot Password, Reset Password (`[SOC-7]`)
  - Integrated Throttler rate limiting and security headers

### ⚡ Performance & Caching
- Added Redis cache-aside layer for read-heavy endpoints (`[SOC-22]`)
- Optimized Docker multistage builds with Alpine Linux, Tini process manager, and layer caching (`[SOC-26]`)

### 👷 CI/CD & Infrastructure
- Set up automated GitOps Terraform infrastructure for Vercel (frontend), Render (backend), Cloudflare Load Balancers, and AWS Budgets (`#42`)
- Automated CI pipeline with E2E tests, Unit tests, Linting, Prettier, TypeScript validation, Lighthouse, and Commitlint (`[SOC-8]`, `[SOC-25]`)
- Added container security scanning with Trivy and cryptographic image signing with Sigstore Cosign
- Configured automated versioning, changelog generation, and GitHub releases with Semantic Release (`[SOC-42]`)
- Configured auto-migration deployment on container startup for Supabase PostgreSQL

### 🐛 Bug Fixes
- Fixed Render Node.js startup crash by sanitizing `--optimize-for-size` from `NODE_OPTIONS`
- Fixed Prisma schema syntax errors and aligned relation fields (`[SOC-0]`)
- Fixed Docker tag metadata synchronization for GitHub Container Registry (`main` tag)
- Fixed Semantic Release push permissions with `RELEASE_PAT` support for branch protection

### 📝 Documentation
- Added comprehensive Architecture, Runbooks, Disaster Recovery failover, Observability, and Contributing guides (`[SOC-45]`, `#32`)
