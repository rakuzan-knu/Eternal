# Changelog

All notable changes to this project will be documented in this file.

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
