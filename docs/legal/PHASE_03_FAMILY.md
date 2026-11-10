# Phase 03: durable Family Center

Baseline: PR156 / `13d75379c750428cc782b2e5eba2ed7513bc702a`.
This change does not alter Ukrainian registration, admission declarations, Terms,
payments, platform administrator grants, or email delivery.

Family links, invite hashes, safeguards, preferences, pairing-attempt windows and
authenticated UTC active-minute counts use PostgreSQL. Process-local Maps and
Redis are no longer the source of Family authorization. Existing ephemeral links
cannot be safely reconstructed from guardian admission declarations; participants
must establish a new connection and the teen must confirm it.

Both members may disconnect. Current age and active membership are rechecked;
two-way DM restrictions require accepted follows in both directions. Family
privacy locks apply before privacy/exception writes. User deletion cascades Family
records; deletion of a guardian preserves settings when another guardian remains.

Limits apply to authenticated operations, not total device time or incoming pushes.
The last admitted active UTC minute remains usable. Data rights, Family Center,
authentication, blocking, reporting and leaving calls remain available. PIN and
notification flags are preferences, not a server authorization or email pipeline.
Unsupported controls are disabled. Payments remain unavailable.

## Migration and coordinated activation

1. Verify source, current deployments, encrypted SQL backup, restore proof and
   Redis connection headroom. Do not change UA/BACKGROUND flags or bulk-replace env.
2. Apply additive `20261111000000_family_persistence` after the existing migration
   baseline. It creates six tables and their FK/check/index constraints; no user
   backfill or user-content deletion occurs.
3. Hold new Family enrollment on Core with `FAMILY_ENROLLMENT_ENABLED=false`
   during deployment. Existing reads, refusal, revocation and rights remain open.
4. Deploy the same reviewed source to Core, Messenger, Reels and Music sequentially,
   verify actual live commits and startup. Core owns Family HTTP routes/cleanup;
   all roles retain the persisted safety reader for authenticated operations.
5. Restore the prior enrollment setting only after consistent live code. Verify
   the Core startup enrollment marker, existing synthetic adult login/settings,
   exports/logout, and public UA policy without production minor declarations.
6. Publish web/mobile web to the same verified source and restore any temporary
   Vercel domain-assignment hold. Record native-client limitations separately.

Application rollback before activation keeps the additive tables. After durable
connections are created, rolling Messenger back to the old memory-only reader
would silently remove safeguards and is unsafe. Prefer roll-forward or a tested
version with compatible persisted authorization. Never DROP populated Family
tables as an automatic rollback. Keep enrollment held while resolving a failed
deployment, retain revocation/rights, and record the final runtime state.

## Data rights and expiry

Existing settings export gains a bounded `family` field without changing the
section enum or schema version. Invite/PIN hashes and message contents are omitted;
truncation after 100 rows per collection is explicit and directs assisted access.
This is not a full multi-store DSAR. No current account is a disposable fixture.

Codes/confirmation requests expire after ten minutes. Hourly Core cleanup removes
expired/consumed invites, expired pending/revoked links and pairing-attempt windows;
UTC usage retains today/yesterday. Eligibility stops at adulthood immediately;
cleanup is eventual while Core runs. Provider copies, legacy Redis settings and
backups need separately verified handling. Restore deletion decisions before
releasing any recovered system to traffic/workers.

Verification includes real isolated PostgreSQL persistence/concurrency/cascade
cases, operation denial before writes, HTTP/WS safety exemptions, export/privacy
tests, client failure/unavailable states and Ukrainian public-page keyboard/layout
checks. A written runbook or passing synthetic test is not an operator drill.
