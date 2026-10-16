# Eternal deployments

Read [SERVICE_OWNERSHIP.md](SERVICE_OWNERSHIP.md) before changing routes, workers or sockets. Ordinary future features default to core; Messenger channels and bots belong under `/messenger/...`.

## Endpoints

| Component | Public origin | Provider project/service |
|---|---|---|
| Desktop web | https://eternalnet.vercel.app | Vercel: social-network |
| Expo Web | https://eternal-mobile-web.vercel.app | Vercel: eternal-mobile-web |
| Core | https://social-network-backend-4h47.onrender.com | Render: srv-d9v0a4qjobas73bvbag0 |
| Messenger | https://eternal-messenger.onrender.com | Render: srv-db7karuk1f9s7382l4e0 |
| Reels | https://eternal-reels.onrender.com | Render: srv-db7kh6id0e5s73e73fag |
| Music Hub | https://eternal-music-hub.onrender.com | Render: srv-db7kh7qd0e5s73e73j30 |

The four Render services are in separate Hobby workspaces on Free plans. PostgreSQL and Redis remain shared; splitting compute does not multiply their quotas. Preserve the shared JWT secrets and database schema. Existing data must not be copied into separate databases for each module.

Both Vercel projects use GitHub repository `rakuzan-knu/Eternal`. Desktop uses the root `vercel.json`; Expo Web uses `apps/mobile/vercel.json`, Root Directory `apps/mobile`, and files outside that directory. Public production domains above are canonical. Generated deployment/team aliases may require Vercel authentication; do not distribute them as the app URL.

## Release procedure

Render automatic deploys are disabled. Do not enable concurrent deploys for all four services: a Core or Messenger rolling deployment can temporarily exceed the shared Redis connection allowance even when steady state fits. Deploy one service at a time, wait for its live status and dependency readiness, and check actual Redis usage. At the 30-connection limit, first deploy Core with BACKGROUND_ENABLED=false (estimated overlap: 24+4=28). Update Messenger only after the old Core instance has stopped. Restore Core background work after the old Messenger instance has stopped (estimated overlap: 20+8=28). A Core-only update also uses the background-disabled stage before restoring its workers. These estimates include all four active roles; wait for old connections to close and verify actual usage before each next deployment. Core applies compatible migrations; other roles do not.

The service split is in PR #115 on `codex/free-hosting-recovery`. Until it is merged through the normal protected-branch review, publishing an older `main` frontend could restore monolith routing and break specialty features. Both Vercel projects temporarily track the split branch for production, with staged production promotion during coordinated API changes. After the protected merge, return both projects' Production Branch Tracking to `main` and verify the split clients. Do not change branch protections to complete this rollout.

Stage and inspect each frontend before promotion:

```powershell
# Run in the already-linked project root (repository root for desktop; apps/mobile for Expo Web).
vercel deploy --prod --skip-domain --scope rakuzan-knu
vercel promote <verified-deployment-url> --scope rakuzan-knu
```

Verify the public HTML and JS assets, all four built API origins, CORS for both production domains, correct role routing and incoming sockets only on Messenger. Run the read-only smoke script with the four backend origins in table order. After login, verify feed, conversation loading and sockets, Reels, Music Hub and integration popups. Never use real users as recipients of test messages or publish test posts.

Keep credentials in server environment variables and approved private local credential stores, never this document, Git, public build variables or logs. R2 uses an object-only key scoped to `social-network-media`; coordinate key rotation across all four services before revoking the previous key. Provider callback URLs also need registration in their own dashboards; setting a Render variable alone does not register a redirect URI.

Expo Web is a browser app. Native Android/iOS builds and distribution remain separate work. Free Render services sleep when idle; cold starts and limited CPU remain, and this deployment does not establish a load-test guarantee or implement production video transcoding.

## Direct media rollout

Follow [DIRECT_MEDIA_UPLOADS.md](DIRECT_MEDIA_UPLOADS.md). Disable Auto-assign Custom Production Domains for both Vercel projects before pushing a cross-layer media change. Build production frontends without promotion, deploy the four compatible APIs sequentially, then promote both ready client deployments. After the protected merge and returning Production Branch Tracking to main, restore the projects' previous auto-assignment setting. While the rollout PR remains unmerged, keep automatic domain assignment disabled and promote only verified deployments manually. Never promote a new upload client before Core serves its control API.

Render uses DIRECT_UPLOADS_REQUIRED=true, VIDEO_TRANSCODE_ENABLED=false and SOUNDCLOUD_AUDIO_PROXY_ENABLED=false. Music's STEAM_CALLBACK_URL is its canonical `/v1/integrations/steam/callback`; Steam starts through an authenticated POST and first-party popup launch. Preserve the popup's COOP unsafe-none response header and exact origin/source proof checks. Do not reintroduce a GET start with userId/state selected by the caller.

Free quota diagnostics run hourly on Core using existing connections: PostgreSQL warns at400MB, Redis at80% memory and26 connections. Media admission warns at80%; these are server log warnings, not a configured email paging service. Provider billing dashboards remain authoritative for monthly Render outbound bandwidth and R2 operations. Do not describe application counters as a provider spending cap.

### Generic OAuth popup state

GitHub starts with authenticated `POST /auth/github/oauth/start` on Core; other provider starts use `POST /integrations/:platform/oauth/start` on Music. Starts return a 60-second first-party launch URL with a ticket fragment and a separate `launchProof`. The opener checks exact origin and source before sharing the proof; the backend popup sets the encrypted HttpOnly Secure SameSite=Lax provider cookie before redirecting to the provider. Keep launch bodies out of error telemetry. Steam retains its separate OpenID signed-field/nonce verification.
