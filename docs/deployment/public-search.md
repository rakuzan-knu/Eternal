# Optional Algolia identity discovery

Core owns user discovery and browser suggestions. The dedicated index stores only
`objectID`, `username`, `displayName`. No messages, posts, tags, email, profile details,
relationships, location or presence are uploaded. Private accounts remain discoverable
by identity, as in existing search. Live PostgreSQL hydration enforces blocks, reserved
names and deleted-account exclusion; VisibilityResolver retains field privacy.
The provider is never an authorization source.

## Behavior and quotas

`PUBLIC_SEARCH_PROVIDER=postgres` is the default. Opting into `algolia` changes candidate
retrieval to prefix/typo matching over at most 60 identities, followed by existing local
ranking and ID-constrained hydration. It does not reproduce arbitrary substring matching
or the old first-60-user coverage. Healthy provider reads never also scan PG candidates.
Failure or exhausted/unavailable budget falls back to the bounded PG path; successful
empty results stay empty. DTOs, authentication, blocks and profile visibility remain.

On DNS failure only (`ENOTFOUND`/`EAI_AGAIN`), retry once on Algolia's official
`<app>-1.algolianet.com` read/write host. Each attempt reserves its own HTTP budget.
Timeouts, connection resets and HTTP errors do not replay potentially accepted writes;
durable synchronization retains its existing retry path. TLS validation stays enabled.

Post/hashtag search retain private/followed/owned-post visibility, chronological cursors
and last-100-public-post tag counts. Private message substring search uses the PG
projection in [message-history.md](message-history.md). This is partial search offload.

Backend-only variables on Core:

```dotenv
PUBLIC_SEARCH_PROVIDER=postgres
PUBLIC_SEARCH_MONTHLY_REQUESTS_LIMIT=9000
PUBLIC_SEARCH_MONTHLY_WRITES_LIMIT=45000
# ALGOLIA_APPLICATION_ID=...
# ALGOLIA_API_KEY=...
# ALGOLIA_PUBLIC_USERS_INDEX=eternal-public-users
```

Use a dedicated free/no-card account and an index-restricted server key for search,
record modification/deletion and tasks. Never expose it in client builds. The
[pricing page](https://www.algolia.com/pricing) currently lists 10,000 searches/month
and 50,000 records for Free; verify the actual account plan before activation. This
adapter caps records at 40,000, HTTP attempts at 9,000/month (including polls, writes
and failures), and record mutations at 45,000/month. Lower limits are configurable;
rebuild clear consumes one mutation. These leave headroom and are more conservative
than search-only billing.

The web and Expo search pages omit provider branding. This does not change
[Algolia's published free-plan attribution requirement](https://support.algolia.com/hc/en-us/articles/4406981826065-Do-I-need-to-display-the-Algolia-logo-when-on-a-free-plan).
People search still uses the configured provider; posts and tags remain in PostgreSQL.

Reservations use the existing shared Redis connection and atomic Lua counters scoped
to application ID and UTC month. No local fallback or TTL; preserve keys with noeviction.
Lost Redis data, dashboard actions, other clients and provider accounting are outside
these counters: they are not a spending cap. Keep billing disabled; no paid products,
replicas or new account are activated by this change.

## Durable lifecycle and rollout

1. Core applies `20261016190000_public_search_sync`. Capture defaults OFF.
2. Deploy compatible Core and Messenger sequentially per DEPLOYMENTS.md. The generic
   outbox publisher must exclude `public_search.user.sync` before enabling capture.
3. Keep all Core instances in `postgres` mode; wait for old reconcilers to stop.
   Stop identity mutations for a consistent rebuild. Prepare a dedicated index with
   searchable attributes `username`, `displayName`; confirm its free plan.
4. From `apps/backend`, explicitly confirm target and compatible deployment:

```powershell
$env:PUBLIC_SEARCH_PROVIDER = 'postgres'
$env:PUBLIC_SEARCH_REBUILD_CONFIRM = $env:ALGOLIA_PUBLIC_USERS_INDEX
pnpm exec tsx src/common/public-search/rebuild.ts --replace-public-identities --compatible-readers-deployed
```

The command enables transactional capture before the snapshot, refuses over 40,000
identities before clearing, uploads bounded identity-only batches and waits for task
publication. Failure requires keeping provider reads disabled until reconciliation.
5. Enable `PUBLIC_SEARCH_PROVIDER=algolia` on Core and resume identity mutations.

User INSERT, username/displayName UPDATE and DELETE coalesce an ID-only outbox intent
in the same PG transaction, including OAuth/direct Prisma paths. A Core-only reconciler
processes at most five intents every 30 seconds. It locks current user then intent,
serializes index mutation, sends current identity or deletion, and removes the intent
only after task publication. Failures retry after 15 minutes with no retry-count cutoff.
No additional Redis client is created. After quota exhaustion, provider metadata may
remain until synchronization resumes; live PG hydration still rejects deleted/blocked IDs.

Rollback reads with `PUBLIC_SEARCH_PROVIDER=postgres`; keep credentials and capture
until pending updates/deletions are reconciled or the dedicated index is cleared.
The reconciler runs only in `algolia` mode: switching to `postgres` stops it. Retaining
credentials and capture alone does not drain deletion intents. Stop identity changes
and reconcile before switching, or clear the dedicated index and account for pending
intents before disabling capture.
Disable capture only after accounting for provider data. Real account/key setup,
provider publication and quota enforcement require deployment verification. Local
tests use synthetic identities and mocked provider responses; no live identities
were uploaded during preparation.
