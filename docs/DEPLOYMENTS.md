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

Render automatic deploys are disabled. Do not enable concurrent deploys for all four services: a Messenger rolling deployment can temporarily exceed the shared Redis connection allowance even when steady state fits. Deploy one service at a time, wait for its live status and dependency readiness, and check actual Redis usage. At the 30-connection limit, temporarily stop core background work while updating Messenger, then restore it after the old Messenger instance has stopped. Core applies compatible migrations; other roles do not.

The service split is in PR #115 on `codex/free-hosting-recovery`. Until it is merged through the normal protected-branch review, publishing an older `main` frontend could restore monolith routing and break specialty features. Both Vercel projects temporarily track the split branch for production, with automatic custom-domain assignment enabled. After the protected merge, return both projects' Production Branch Tracking to `main` and verify the split clients. Do not change branch protections to complete this rollout.

Stage and inspect each frontend before promotion:

```powershell
vercel deploy --prod --skip-domain --project social-network --scope rakuzan-knu
vercel deploy --prod --skip-domain --project eternal-mobile-web --scope rakuzan-knu --local-config apps/mobile/vercel.json
vercel promote <verified-deployment-url> --scope rakuzan-knu
```

Verify the public HTML and JS assets, all four built API origins, CORS for both production domains, correct role routing and incoming sockets only on Messenger. Run the read-only smoke script with the four backend origins in table order. After login, verify feed, conversation loading and sockets, Reels, Music Hub and integration popups. Never use real users as recipients of test messages or publish test posts.

Keep credentials in server environment variables and approved private local credential stores, never this document, Git, public build variables or logs. R2 uses an object-only key scoped to `social-network-media`; coordinate key rotation across all four services before revoking the previous key. Provider callback URLs also need registration in their own dashboards; setting a Render variable alone does not register a redirect URI.

Expo Web is a browser app. Native Android/iOS builds and distribution remain separate work. Free Render services sleep when idle; cold starts and limited CPU remain, and this deployment does not establish a load-test guarantee or implement production video transcoding.
