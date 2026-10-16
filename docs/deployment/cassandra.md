# Astra DB: call telemetry

Scope: call telemetry only. Calls, participants, authorization, messages, attachments,
search, story views and the transactional outbox remain in PostgreSQL. The current
message transaction creates the message, attachments and outbox together; swapping
that storage requires a separate messaging migration.

Database: `eternal`, keyspace `eternal`, serverless non-vector, AWS `us-east-2`.
The telemetry worker belongs only to Messenger and checks `runsBackground('messenger')`.
Keep it passive on Core, Reels and Music and while BACKGROUND_ENABLED=false.
Follow SERVICE_OWNERSHIP.md and DEPLOYMENTS.md for sequential deployments and Redis
connection headroom; Core applies additive migrations before Messenger cutover.
The account's creation form locked the European regions. Billing showed Free;
the credit balance was not populated, so no fixed request/storage allowance is assumed.

## Credentials

Configure backend-only environment variables:

```dotenv
CALL_TELEMETRY_STORAGE=postgres
CASSANDRA_KEYSPACE=eternal
CASSANDRA_SECURE_CONNECT_BUNDLE=/etc/secrets/secure-connect-eternal.zip
CASSANDRA_APPLICATION_TOKEN=<application token>
```

Use a runtime token scoped to these tables/keyspace with SELECT, MODIFY and the
permissions required by the CQL driver to connect. Schema creation uses a separate
administrative credential or the Astra CQL console. Never put the token in Vite
variables, Git, a public bundle URL, logs, or the chat. Keep the downloaded SCB in
an ignored local path and upload it as a Render Secret File for deployment.

Two Cassandra tables support bounded latest-by-user queries and deletion by call.
The second table stores only deletion keys, not a second copy of the payload.
Writes are prepared, idempotent logged batches; no cross-database transaction is claimed.
Before every remote write, a PostgreSQL outbox intent durably retains its complete
key and payload. Successful remote writes remove their intents. A maximum of 1,000
pending write intents bounds backlog growth during free-credit exhaustion; further
submissions receive a service-unavailable error.
No new telemetry TTL is imposed. Monitor per-user partition size and provider storage
usage before this small initial workload grows.

## Expand and backfill

1. Keep PostgreSQL as the telemetry source. Configure Cassandra credentials.
2. Initialize Cassandra with `pnpm --filter backend db:cassandra init` using schema permissions.
3. Apply the additive Prisma migration `20261016150000_cassandra_telemetry_purge`
   using the existing deployment migration workflow. It installs two PostgreSQL
   deletion triggers and preserves all existing tables and data.
4. Deploy the new backend with `CALL_TELEMETRY_STORAGE=postgres`. Credentials must
   stay configured so that outbox purge events are handled, even before cutover.
5. Temporarily stop telemetry submissions and wait for in-flight submissions to finish.
   Run `pnpm --filter backend db:cassandra backfill`, then `... db:cassandra verify`.
   These commands copy and compare every existing telemetry payload and its deletion index.
   Keep submissions stopped until the backend has switched to Cassandra; otherwise
   records written between backfill and switching would be missing from summaries.
6. Run `pnpm --filter backend db:cassandra check`, set
   `CALL_TELEMETRY_STORAGE=cassandra` and restart the backend. Resume submissions.

The API retains its existing shape. Cassandra failures propagate as errors: there is
no silent write fallback creating a second history in PostgreSQL. Summary reads hide
calls already deleted from PostgreSQL while their physical Cassandra purge is pending.

PostgreSQL parent row locks order normal telemetry writes/backfill before cascade
deletions. AFTER DELETE triggers record user and call purge events in the same
PostgreSQL transaction as the deletion, including calls deleted by cascades from a
conversation or an initiating user. A durable activation marker enables those
triggers only after the first Cassandra write intent; a deployment that has never
used Cassandra does not generate cleanup work.

A separate worker processes these events with PostgreSQL row locks and SKIP LOCKED;
the messages/notifications publisher excludes them. Each claim deletes at most 25
telemetry records, and the worker attempts up to five claims per minute with a time
budget. Failed work retries after 15 minutes without a retry-count cutoff. No worker
runs without Cassandra credentials. Cassandra must become available again for
physical deletion to finish.

An ambiguous write timeout retains its write intent. On retry, if a parent was
deleted, that intent installs tombstones for both exact Cassandra keys, even when
the reverse index is still absent. All retries reuse the record's timestamp;
deletion uses a strictly newer timestamp. This prevents a late insert or logged-batch
replay from overriding the cleanup while tombstones are retained by Cassandra.
Do not delete pending telemetry intents or the activation marker during outbox cleanup.

## Rollback and limits

Before cutover, PostgreSQL is unchanged and remains complete. After cutover, changing
the flag back alone would hide new Cassandra-only telemetry. Stop submissions and
reverse-copy those records before a storage rollback. Keep Cassandra credentials and
the deletion handlers until all Cassandra data and purge tasks are accounted for.

This migration does not automatically remove old PostgreSQL telemetry or reclaim
its disk space. Historical rows remain for comparison/recovery until a separate
reviewed cleanup; new records after cutover consume no PostgreSQL telemetry rows.

Free credit exhaustion, provider inactivity hibernation/deletion, Render process sleep,
and provider retention limits remain applicable. No keepalive or paid upgrade is installed.
Back up retained history independently; a free plan is not a permanent archive guarantee.
