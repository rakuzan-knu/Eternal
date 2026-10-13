# Changelog

All notable changes to this project will be documented in this file.

## [1.6.0](https://github.com/rakuzan-knu/Eternal/compare/v1.5.0...v1.6.0) (2026-10-05)

### ✨ Features

* **security:** harden storage isolation, websocket auth refresh, and CORS policy ([#109](https://github.com/rakuzan-knu/Eternal/issues/109)) ([0cc9f23](https://github.com/rakuzan-knu/Eternal/commit/0cc9f236a02d3aa749a3165e3cc57f266b69142c))

## [1.5.0](https://github.com/rakuzan-knu/Eternal/compare/v1.4.0...v1.5.0) (2026-10-05)

### ✨ Features

* **auth:** harden token cookies, add safeSessionStorage, and mirror preferences ([#108](https://github.com/rakuzan-knu/Eternal/issues/108)) ([e379fee](https://github.com/rakuzan-knu/Eternal/commit/e379fee3fdec889ceca490a2f06477ba2bf805e9))

## [1.4.0](https://github.com/rakuzan-knu/Eternal/compare/v1.3.6...v1.4.0) (2026-10-05)

### ✨ Features

* **frontend:** document reusable design and preserve interaction continuity ([#106](https://github.com/rakuzan-knu/Eternal/issues/106)) ([3efae12](https://github.com/rakuzan-knu/Eternal/commit/3efae12456896f8efb3c28c4c697d9e152b76309))

## [1.3.6](https://github.com/rakuzan-knu/Eternal/compare/v1.3.5...v1.3.6) (2026-10-05)

### 🐛 Bug Fixes

* **infra:** resolve pipeline failures across docker, storybook, sentry, and chaos suite ([#107](https://github.com/rakuzan-knu/Eternal/issues/107)) ([5afe1d7](https://github.com/rakuzan-knu/Eternal/commit/5afe1d72fb100dd90682582f1327e57f85f5492e))

### 🔧 Tooling & Dependencies

* **deps:** bump github-actions group (docker/login-action, sbom-action) ([#105](https://github.com/rakuzan-knu/Eternal/issues/105)) ([1e26b72](https://github.com/rakuzan-knu/Eternal/commit/1e26b72efc0b41f6b8d0e8970beed2968b168f70))
* **deps:** bump production-dependencies (aws-sdk, framer-motion, katex) ([#104](https://github.com/rakuzan-knu/Eternal/issues/104)) ([87f3652](https://github.com/rakuzan-knu/Eternal/commit/87f3652926ff6b22cbb0857e4291fd4560749ef4))

## [1.3.5](https://github.com/rakuzan-knu/social-network/compare/v1.3.4...v1.3.5) (2026-10-04)

### 🐛 Bug Fixes

* **security:** resolve all dependabot and code scanning vulnerabilities ([#102](https://github.com/rakuzan-knu/social-network/issues/102)) ([d5a2a11](https://github.com/rakuzan-knu/social-network/commit/d5a2a11c20fb88593d9ea4a43c43dbc6f8405922))

## [1.3.4](https://github.com/rakuzan-knu/social-network/compare/v1.3.3...v1.3.4) (2026-10-04)

### 🐛 Bug Fixes

* **security:** resolve dependabot lockfile indexing and code scanning sarif pipelines ([#99](https://github.com/rakuzan-knu/social-network/issues/99)) ([3f19263](https://github.com/rakuzan-knu/social-network/commit/3f1926379027c3e872cffb60e484f500d72b128f))

## [1.3.3](https://github.com/rakuzan-knu/social-network/compare/v1.3.2...v1.3.3) (2026-10-04)

### 🐛 Bug Fixes

* **security:** resolve dependabot and code scanning vulnerabilities ([#98](https://github.com/rakuzan-knu/social-network/issues/98)) ([440c94a](https://github.com/rakuzan-knu/social-network/commit/440c94a6e9190cd1291d4fa52a36a82f0fa3763c))

## [1.3.2](https://github.com/rakuzan-knu/social-network/compare/v1.3.1...v1.3.2) (2026-10-04)

### 🐛 Bug Fixes

* **backend:** align RedisIoAdapter logger visibility with IoAdapter ([516bf74](https://github.com/rakuzan-knu/social-network/commit/516bf74b6c988faade15ba3a04ad34c63ece918b))

### 🔧 Tooling & Dependencies

* **ci)(deps:** bump the github-actions group across 1 directory with 4 updates ([f66b5b6](https://github.com/rakuzan-knu/social-network/commit/f66b5b6279d9e61c61ffdf284ae6a4a39ec47f1d))
* **ci:** merge PR [#95](https://github.com/rakuzan-knu/social-network/issues/95) github-actions updates ([2650bc5](https://github.com/rakuzan-knu/social-network/commit/2650bc5c4e89d0789fe4edde5783761d4d0c81d2))
* **deps)(deps-dev:** bump the dev-dependencies group with 23 updates ([075c9e7](https://github.com/rakuzan-knu/social-network/commit/075c9e7523949b3d6c80765eb06cb3754025e4fd))
* **deps)(deps:** bump the production-dependencies group with 24 updates ([fdc5ed2](https://github.com/rakuzan-knu/social-network/commit/fdc5ed23afaa02ba32d86b9b3a3b30a4cfb1afcb))
* **deps:** bump production-dependencies group with 24 updates (PR [#96](https://github.com/rakuzan-knu/social-network/issues/96)) ([6ab1eed](https://github.com/rakuzan-knu/social-network/commit/6ab1eed6dc6683efd95fcd3e302f74893b1af96a))
* **deps:** merge PR [#97](https://github.com/rakuzan-knu/social-network/issues/97) dev-dependencies updates with types resilience fix ([bd68a85](https://github.com/rakuzan-knu/social-network/commit/bd68a854bd6798c0c53447e1feaca939bfc43a51))

## [1.3.1](https://github.com/rakuzan-knu/social-network/compare/v1.3.0...v1.3.1) (2026-10-03)

### 🐛 Bug Fixes

* **deps:** align react with react-dom 19.3.0 and pin react-native to expo 52 ([17f9a63](https://github.com/rakuzan-knu/social-network/commit/17f9a6314705743113cbf7c1368d50f6c7673e38))

### 🔧 Tooling & Dependencies

* **ci)(deps:** bump the github-actions group across 2 directories with 28 updates ([6619cb3](https://github.com/rakuzan-knu/social-network/commit/6619cb3cd3a62ef95b02366a420294e7474d5dbc))
* **ci:** merge PR [#88](https://github.com/rakuzan-knu/social-network/issues/88) github-actions updates ([a5a9e97](https://github.com/rakuzan-knu/social-network/commit/a5a9e97b3bb17d2a2ef6d1a45eb190e3616ac04a))
* **deps)(deps:** bump the production-dependencies group across 1 directory with 18 updates ([feaccb6](https://github.com/rakuzan-knu/social-network/commit/feaccb6274e446c8f30445fbc85d99f0b855cac3))
* **deps:** ignore major updates and expo-managed dependencies in dependabot ([1cbbad0](https://github.com/rakuzan-knu/social-network/commit/1cbbad060f6f0f07bb0bfe75bcfa2c0f54736937))

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
