# Cassandra message body archive

Moves **message bodies**, including opaque E2EE envelopes and system/theme JSON, to
Cassandra. PostgreSQL retains message metadata, relations, attachment metadata, pins,
reactions, per-user deletions, membership, read state, ordering/cursors and unread
projections. Media stays in object storage. Existing HTTP/WS DTOs are unchanged.

Plaintext also retains a private PostgreSQL `body_search` projection and trigram index
for substring search and pending themes. Encrypted envelopes are excluded; Cassandra
retains their exact bytes. Plaintext indexing still consumes PG storage, so body offload
does not establish substantial disk savings. Measure table/TOAST/index sizes first.

## Integrity

Writes first commit to PG, preserving message/attachments/outbox/unread transactions.
Opt-in SQL triggers coalesce an ID-and-revision-only intent on every body mutation and
physical deletion, including cascades. A sequence orders revisions. The Messenger worker
locks the message before its intent, writes Cassandra, reads back byte-for-byte, then
clears the inline body and saves its SHA-256 digest in the same PG transaction that
removes the intent. Ambiguous timeout leaves the PG body and intent intact. A maximum
of 1,000 pending write intents rejects new backlog; deletion intents are not capped.

Explicit revision timestamps order remote writes/deletions, preventing late old writes
from winning over newer edits or retained tombstones. Retries reuse the revision.
Do not reset the sequence or replay failed writes past provider tombstone-retention
guarantees without reconciliation. No cross-database transaction is claimed.

Reads hydrate metadata selected by existing authorized queries, including replies,
previews, pins, forwarding, calendar and DataLoader. Missing/mismatched revisions fail
requests rather than becoming empty messages. New bodies remain readable in PG while
pending. The Messenger worker attempts at most 50 claims/minute within a 15-second
budget; failures retry after 15 minutes. No additional Redis connection is created.

Pending delivery events retain full MessageViews for retry. Successful publication
strips `messageView`, keeping IDs/status rather than a permanent second body copy.
Never scrub pending/failed delivery snapshots.

## Rollout

1. Take/verify a recoverable backup and inspect table/TOAST/index sizes and temporary
   projection expansion. The additive migration initializes all revisions/projections
   and builds indexes; use a maintenance window for a large table. Capture defaults OFF.
2. Follow SERVICE_OWNERSHIP.md and DEPLOYMENTS.md. Core applies the migration. Deploy
   compatible readers on all roles (shared DataLoader may read messages), and the
   Messenger generic outbox exclusion, before capture. Preserve Redis headroom and
   deploy sequentially. Keep `MESSAGE_BODY_ARCHIVE_ENABLED=false`.
3. Configure Astra SCB/keyspace/backend credentials on roles that hydrate messages.
   Runtime requires SELECT/MODIFY; initialize separately with schema permissions:
   `pnpm --filter backend db:message-bodies init`, or use the CQL console:

```sql
CREATE TABLE IF NOT EXISTS eternal.message_bodies (
  message_id text PRIMARY KEY, revision bigint, body text
);
```

4. Run the connection check. Stop submissions/edits/deletions for activation and initial
   verification; explicitly confirm compatible readers and outbox deployment:

```powershell
pnpm --filter backend db:message-bodies check
pnpm --filter backend db:message-bodies capture-on --compatible-readers-deployed
pnpm --filter backend db:message-bodies backfill --compatible-readers-deployed
pnpm --filter backend db:message-bodies verify
```

Backfill is resumable and uses the same locks/recovery path. Verify checks every
archived revision/digest and refuses outstanding inline bodies or intents. Enable
`MESSAGE_BODY_ARCHIVE_ENABLED=true` on Messenger, deploy sequentially, then resume
submissions. Other roles stay passive. No keepalive or paid upgrade is installed.

After confirming retention requirements, `db:message-bodies compact-outbox` removes
historical published delivery snapshots in bounded batches. It leaves pending/failed
events intact and does not immediately reclaim physical disk. No automatic VACUUM FULL.

## Rollback

Disabling the worker does not restore bodies. Keep readers, credentials and capture.
Stop submissions and the archive worker, then run:

```powershell
pnpm --filter backend db:message-bodies restore
pnpm --filter backend db:message-bodies drain
pnpm --filter backend db:message-bodies capture-off
```

Restore verifies hashes, writes PG bodies at new revisions and durably purges old
Cassandra revisions. Re-archiving remains possible. Capture-off refuses archived rows
or pending intents. Do not deploy an old reader until restore is complete; do not drop
additive schema objects to simulate rollback.

## Verification and deployment state

Local integration tests use PostgreSQL17 at 127.0.0.1:55439 (`migration_check`) and
Cassandra4.1 at 127.0.0.1:59042. Set both DATABASE_URL and DIRECT_URL explicitly to that
isolated PG before applying migrations: prisma.config.ts prefers DIRECT_URL. Enable
MESSAGE_ARCHIVE_INTEGRATION and provide MESSAGE_ARCHIVE_TEST_DATABASE_URL for the
opt-in integration spec. It refuses other addresses and covers exact bytes, E2EE index
exclusion, ambiguous retry, stale writes, cascades, restore/rearchive, delivery scrubbing
and identity-trigger lifecycle. These checks do not prove Astra quotas, retention or
production latency.

During preparation, three additive migrations were inadvertently applied to shared
Supabase because DIRECT_URL took precedence over the local DATABASE_URL. Read-only
inspection subsequently confirmed both capture switches false, zero archived messages,
zero new sync intents and 19 original telemetry rows. No message cutover or provider
indexing was performed. Keep applied migration files immutable; SQL corrections require
a new migration. Production still needs backup, compatible deployment, credentials,
backfill and reconciliation.
