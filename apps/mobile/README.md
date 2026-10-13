# Mobile development

The mobile app uses the same backend and music catalogs as `apps/web`. It needs a running backend, PostgreSQL, Redis, and a real account in that database. There is no runtime fixture API or sample music catalog.

1. Configure and start the backend using `apps/backend/.env`. Spotify catalog search requires `SPOTIFY_CLIENT_ID` and `SPOTIFY_CLIENT_SECRET` on the backend only. Never put provider secrets in `EXPO_PUBLIC_*` variables.
2. Verify `GET http://127.0.0.1:3000/health` reports the database and Redis as `ok`.
3. Copy `.env.example` to `.env` in this directory and set the API and web addresses. For a physical phone, use the development computer's LAN address.
4. From the repository root, run `pnpm --filter @social-network/mobile web --clear` and sign in to an account in the configured backend.

After changing `EXPO_PUBLIC_API_URL` or `EXPO_PUBLIC_WEB_URL`, restart Metro with `--clear`. Expo embeds these values in the bundle; a cached export can otherwise keep the previous API address. For a static web preview, use:

```sh
pnpm --filter @social-network/mobile exec expo export --platform web --clear --output-dir .expo/feed-preview
```

Reload the preview after exporting. If switching databases, sign out of the previous account and sign in again. An unavailable backend or music provider must show an error, never substitute sample tracks.

Focused verification:

```sh
pnpm --filter @social-network/mobile typecheck
pnpm --filter @social-network/mobile test src/pages/music
pnpm --filter backend test src/integrations/music-search.spec.ts src/integrations/integrations.playlists.spec.ts
```

Unit tests isolate network failures with test doubles. Live catalog, playback, authentication, and library checks must also use the real backend. Spotify search access does not grant full-track playback; tracks without a preview open in Spotify.

Game Mode is available from the Music Hub header and the player's More panel. It unmounts the social screens, cancels their pending queries, stops their polling, and disconnects idle listening presence. Playback, the queue, an active Jam, navigation, and the unsent Feed post remain available; query data stays cached for returning to the app. In-mode playlists, search, queue, lyrics, volume, and the sleep timer use the same API and player as the normal hub.

Native Game Mode reduces progress events to once per second and mixes music with other apps' audio. On iOS, Expo's `mixWithOthers` mode does not display the Now Playing notification. Validate background playback, game audio coexistence, and CPU/memory use on physical iOS/Android devices; successful exports and lifecycle tests do not measure these behaviors.
