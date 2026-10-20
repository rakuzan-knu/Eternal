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

## GIPHY web picker

Set `VITE_GIPHY_API_KEY` (posts) and `VITE_GIPHY_CHAT_API_KEY` (messages) on the desktop Vercel project for Production and Preview, then rebuild. These are public client keys from separate account-owned GIPHY apps, as required per platform and section. Beta keys allow 100 API calls per hour each; no paid upgrade is enabled by this integration.

API and media requests go directly from the browser to GIPHY. Core and Messenger validate approved provider URLs and preserve their original query parameters; they do not download or rehost provider GIFs. Existing uploaded media keeps its ownership and byte validation. Deploy the compatible APIs before promoting the web client; no schema migration or historical-media rewrite is needed.

The picker footer branding is hidden at the product owner's request. GIPHY requires visible attribution under its API terms; hiding it does not satisfy that requirement. See the [GIPHY API integration requirements](https://developers.giphy.com/docs/api/) for attribution, key limits and direct media delivery.

## Direct media rollout

Follow [DIRECT_MEDIA_UPLOADS.md](DIRECT_MEDIA_UPLOADS.md). Disable Auto-assign Custom Production Domains for both Vercel projects before pushing a cross-layer media change. Build production frontends without promotion, deploy the four compatible APIs sequentially, then promote both ready client deployments. After the protected merge and returning Production Branch Tracking to main, restore the projects' previous auto-assignment setting. While the rollout PR remains unmerged, keep automatic domain assignment disabled and promote only verified deployments manually. Never promote a new upload client before Core serves its control API.

Render uses DIRECT_UPLOADS_REQUIRED=true, VIDEO_TRANSCODE_ENABLED=false and SOUNDCLOUD_AUDIO_PROXY_ENABLED=false. Music's STEAM_CALLBACK_URL is its canonical `/v1/integrations/steam/callback`; Steam starts through an authenticated POST and first-party popup launch. Preserve the popup's COOP unsafe-none response header and exact origin/source proof checks. Do not reintroduce a GET start with userId/state selected by the caller.

Free quota diagnostics run hourly on Core using existing connections: PostgreSQL warns at400MB, Redis at80% memory and26 connections. Media admission warns at80%; these are server log warnings, not a configured email paging service. Provider billing dashboards remain authoritative for monthly Render outbound bandwidth and R2 operations. Do not describe application counters as a provider spending cap.

### Generic OAuth popup state

GitHub starts with authenticated `POST /auth/github/oauth/start` on Core; other provider starts use `POST /integrations/:platform/oauth/start` on Music. Starts return a 60-second first-party launch URL with a ticket fragment and a separate `launchProof`. The opener checks exact origin and source before sharing the proof; the backend popup sets the encrypted HttpOnly Secure SameSite=Lax provider cookie before redirecting to the provider. Keep launch bodies out of error telemetry. Steam retains its separate OpenID signed-field/nonce verification.

The launch page POSTs to its own service. HTTP CORS also accepts the exact canonical HTTPS `RENDER_EXTERNAL_URL` for this request; keep `CORS_ORIGIN` limited to trusted frontend opener origins. An older deployment needs its own service origin explicitly allowed until the CORS fix is deployed. Do not use a wildcard or trust a request's Host header to resolve this.

For server-handled callbacks, register the owning service URL in the provider's developer console and use the same value in its environment variable:

| Provider | Environment variable | Owning callback |
|---|---|---|
| GitHub | `GITHUB_CALLBACK_URL` | `https://social-network-backend-4h47.onrender.com/v1/auth/github/callback` |
| Spotify | `SPOTIFY_CALLBACK_URL` | `https://eternal-music-hub.onrender.com/v1/auth/spotify/callback` |
| Twitch | `TWITCH_CALLBACK_URL` | `https://eternal-music-hub.onrender.com/v1/integrations/twitch/callback` |
| YouTube | `GOOGLE_CALLBACK_URL` | `https://eternal-music-hub.onrender.com/v1/integrations/youtube/callback` |
| Steam | `STEAM_CALLBACK_URL` | `https://eternal-music-hub.onrender.com/v1/integrations/steam/callback` |

These are routing targets, not proof that the provider application has registered them. Verify its client ID, callback registration and a real login with the application owner's account before changing a live callback. A server callback through a different origin, including a Vercel rewrite, will not receive the launch service's host-scoped state cookie. YouTube's separate authenticated frontend code-exchange flow is an alternative to the server callback; keep its registered redirect URI consistent with the URI used for token exchange. Roblox uses in-app ownership verification rather than OAuth.

The existing Twitch registration at `https://eternalnet.vercel.app/integrations/twitch/callback` uses an exact SPA rewrite before the general integrations API rewrite. The frontend refreshes its access token if necessary and exchanges the code directly with Music, sending the full callback origin and path. Music still validates the initiating authenticated user and consumes the provider-bound OAuth state once; anonymous server callbacks still require their state cookie. Keep this frontend callback registered while using that flow.

Roblox ownership challenges use ten cryptographically selected plain words, bound to the initiating user for 15 minutes. Existing unexpired legacy challenges remain valid. Copy the phrase into the account's About section and save it before verification; if Roblox replaces it with `#`, generate a fresh phrase. A filtered or missing phrase is never accepted as ownership proof. Text moderation can still vary by account and phrase.
