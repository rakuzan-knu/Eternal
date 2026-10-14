# Service ownership and deployment

Read this before adding or changing a backend module, API route, queue processor, cron job, WebSocket event, or client transport.

## Ownership

| Service role | HTTP namespaces | Background work |
|---|---|---|
| core (Workspace 1) | Everything else: auth, users, posts, stories, notifications, decorations, Family Center, nameplates and future ordinary features | Media previews, search indexing, story retention |
| messenger (Workspace 2) | conversations, calls, crypto/prekeys, e2ee, messenger | Message and notification workers; outbox publication; calls CDC; auto-delete; presence and Steam/Spotify presence polling |
| reels (Workspace 3) | reels | Video transcode worker |
| music (Workspace 4) | integrations, spotify, auth/spotify | No queue workers; music catalogue/library HTTP |
| all | Legacy monolith; use only for local development or a staged migration | Legacy ownership of every task |

Health and metrics exist on every service. Jam uses the messenger WebSocket, including from Music Hub. API requests and their responses must go directly to the owning service, or through Vercel's matching rewrite. Do not put a core proxy in front of the other APIs: that would consume core bandwidth again.

## Add a feature

1. Ordinary features belong to core. The global ServiceRoleGuard defaults unmarked controllers to core, so a new decorations/family/nameplates controller cannot accidentally serve requests from all deployments.
2. In its Nest module, use `controllers: roleControllers('core', [DecorationsController])`. For channels/bots use `roleControllers('messenger', [ChannelsController, BotsController])` and place routes below `/messenger/channels` and `/messenger/bots`. For Reels use `/reels/...`; for Music Hub use `/integrations/...`.
3. Shared providers may still be instantiated on other roles because existing DI imports are interconnected. **Controller ownership does not isolate lifecycle side effects.** Before creating timers, CDC listeners, workers or executing a cron handler, check `runsBackground(owner)` from `apps/backend/src/config/service-role.ts`. A non-owner must remain passive and shutdown must tolerate that state.
4. Add new namespace exceptions only in `packages/shared/api-client/src/service-routing.ts`, with route regression tests. Its fallback is core. Update `vercel.json` rewrites if a new namespace is introduced. Do not hardcode feature origins in components or services.
5. Keep auth/refresh on core. JWT access and refresh secrets must remain identical across the four deployments, while access and refresh secrets differ from one another. Service routing does not replace authorization, validation, tenant/privacy checks or transaction boundaries.
6. Gateway instances outside messenger are emitters only; they reject incoming clients. Semantic presence updates use Socket.IO serverSideEmit to messenger, where audience/privacy is resolved. Do not broadcast a presence event from a non-owner's local onlineUsers map, or disconnect remote sockets during shutdown.
7. Preserve queue job IDs, retries, outbox transaction integrity and client cache updates. Do not enable the same periodic task on every role.

## Environment

Every Render service: SERVICE_ROLE, NODE_ENV=production, PORT=3000, DATABASE_URL, REDIS_URL, existing shared JWT secrets and TTLs, DATABASE_POOL_LIMIT=5, SENTRY_TRACES_SAMPLE_RATE=0.1, CORS_ORIGIN containing the actual frontend origin. Only core applies migrations (AUTO_MIGRATE=true); specialty services use false. BACKGROUND_ENABLED defaults to true; false is a temporary staged-rollout switch and must not remove HTTP controllers.

Use the existing R2 account with R2_ENDPOINT ending in `.r2.cloudflarestorage.com` (without a bucket path), R2_BUCKET=social-network-media and the configured R2_PUBLIC_URL. STORAGE_DRIVER=r2. Credentials must be object-only and bucket-scoped; keep them out of Git, logs, screenshots and frontend EXPO_PUBLIC_/VITE_ variables. The legacy MINIO aliases, when retained, must point to the same R2 configuration, never localhost in production.

Web build variables: VITE_API_URL (core), VITE_MESSENGER_API_URL, VITE_REELS_API_URL, VITE_MUSIC_API_URL. VITE_WS_URL may explicitly select messenger; otherwise the messenger API variable is used. Origins can include a trailing `/v1`; socket code removes it.

Mobile build variables: EXPO_PUBLIC_API_URL (core), EXPO_PUBLIC_MESSENGER_API_URL, EXPO_PUBLIC_REELS_API_URL, EXPO_PUBLIC_MUSIC_API_URL. Mobile Jam uses exported messengerOrigin, not apiOrigin. Missing feature origins preserve the monolith fallback for development and older builds.

Deploy the existing desktop web app and Expo Web as separate Vercel projects. The desktop project uses the repository root and root vercel.json. The Expo project uses Root Directory=apps/mobile, includes files outside that directory, and reads apps/mobile/vercel.json; build with `pnpm build:web` and serve dist. Its EXPO_PUBLIC_WEB_URL points to the desktop website. Expo Web is a browser build; Android and iOS need separate native builds and distribution. Never deploy backend workers or databases to Vercel. Keep production domains in all services' CORS_ORIGIN.

## Rollout and verification

- Retain the old working revision for rollback. Stage an all-role core with BACKGROUND_ENABLED=false before starting specialty workers, so four complete worker sets do not exceed Redis Cloud's connection limit. Start specialty roles, deploy matching frontend routing, then restrict core to SERVICE_ROLE=core with background work enabled.
- Current steady-state estimate: core8 + messenger8 + reels4 + music4 =24 Redis connections. Rolling deployments can add connections temporarily; stagger changes and verify actual connections rather than treating this estimate as a guarantee.
- Run meaningful role routing/auth/privacy/worker/shutdown tests, affected lint/typecheck/build and the Docker CI matrix. It starts all four roles with one isolated PostgreSQL/Redis, 512MiB per role, no swap and0.1CPU each, and asserts at most30 Redis connections including the probe.
- `scripts/deploy/smoke-service-split.cjs <core-origin> <messenger-origin> <reels-origin> <music-origin>` is read-only and verifies role headers, dependencies, correct routes, wrong-role404 and non-messenger WebSocket rejection. Verify the live frontend after login as well.
- No migration is required for this split. For future schema changes, apply compatible additive migrations on core before enabling dependent specialty releases.
- Rollback must coordinate client routing and backend role: specialty origins cannot point at a core-only service. Temporarily restore all role if returning to the monolith.

## Free-tier limits

Each Hobby workspace has its own5GB monthly outbound allowance and750 free instance hours. Without a payment method, exceeding quotas can suspend services. No card or paid compute is required by this deployment. Render Free sleeps when idle, so splitting does not guarantee instant cold starts or future heavy Reels processing.

Media is read directly from R2 or an allowed music-provider URL. R2 egress is free, but storage and operation quotas still apply. The current upload handlers forward uploaded files to R2 from Render, so that write traffic still counts toward the owning Render workspace. Do not claim presigned browser uploads have been implemented. The existing SoundCloud `/audio` proxy is also metered if used; avoid routing playback through it when direct playback works.

R2 public development URLs are rate-limited and lack custom-domain caching features. A custom domain requires an existing domain in the account; do not purchase one under a zero-dollar budget. The legacy synthetic HLS fallback remains unchanged; neither service splitting nor bucket configuration implements ffmpeg transcoding.

Official references: https://render.com/docs/outbound-bandwidth, https://render.com/docs/team-members, https://render.com/docs/free, https://developers.cloudflare.com/r2/pricing/.

