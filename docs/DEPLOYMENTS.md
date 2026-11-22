# Eternal deployments

Read [SERVICE_OWNERSHIP.md](SERVICE_OWNERSHIP.md) before changing routes, workers or sockets.

## Endpoints

| Component | Public origin |
|---|---|
| Desktop web | https://eternalnet.vercel.app |
| Expo Web | https://eternal-mobile-web.vercel.app |
| Core | https://social-network-backend-4h47.onrender.com |
| Messenger | https://eternal-messenger.onrender.com |
| Reels | https://eternal-reels.onrender.com |
| Music Hub | https://eternal-music-hub.onrender.com |

The Vercel web deployment uses the root `vercel.json`. Expo Web uses
`apps/mobile/vercel.json` with `apps/mobile` as its project root. Native
Android and iOS distribution uses separate builds.

The backend uses PostgreSQL and Redis across the Core, Messenger, Reels and
Music Hub roles. Core owns database migrations. Stage compatible API changes
before promoting clients that depend on them. Check each role's `/health/ready`
endpoint as part of rollout verification.

For local setup, use the repository's environment examples. Keep production
credentials in provider-managed secret storage. Follow the
[bundled public CA and driver settings](../apps/backend/certs/README.md) for
PostgreSQL TLS and the [direct media guide](DIRECT_MEDIA_UPLOADS.md) for media
API changes.
