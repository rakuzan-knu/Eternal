\set ON_ERROR_STOP on
\set QUIET 1
\pset format unaligned
\pset tuples_only on
\pset footer off

-- Run only through benchmark-unread.ps1. The runner creates this database in a
-- disposable container with no network, published ports, or mounted volumes.
-- This file never resolves application relations in public.
DO $guard$
BEGIN
  IF current_database() !~ '^unread_bench_[a-f0-9]{12}$'
     OR inet_server_addr() IS NOT NULL THEN
    RAISE EXCEPTION 'Unread benchmark requires a dedicated unread_bench_<12 hex> database and a local socket';
  END IF;
END
$guard$;

CREATE SCHEMA unread_benchmark;
SET search_path TO unread_benchmark, pg_catalog;
SET statement_timeout TO '120s';
SET lock_timeout TO '5s';

-- Relevant tables reproduce current Prisma column names, types and indexes.
-- Unused User/Conversation tables and foreign keys are deliberately omitted.
CREATE TYPE "ParticipantRole" AS ENUM ('MEMBER', 'ADMIN', 'OWNER');
CREATE TYPE "MuteLevel" AS ENUM ('NONE', 'MESSAGES', 'CALLS', 'MESSAGES_AND_CALLS');
CREATE TYPE "MessageType" AS ENUM (
  'TEXT', 'IMAGE', 'VIDEO', 'AUDIO', 'FILE', 'GIF', 'STICKER', 'LOCATION',
  'CALL_LOG', 'SYSTEM', 'DELETED', 'THEME_PROPOSAL', 'STORY_REPLY'
);

CREATE TABLE "ConversationParticipant" (
  id text PRIMARY KEY,
  "conversationId" text NOT NULL,
  "userId" text NOT NULL,
  nickname text,
  role "ParticipantRole" NOT NULL DEFAULT 'MEMBER',
  permissions integer NOT NULL DEFAULT 0,
  theme text DEFAULT 'default',
  "muteLevel" "MuteLevel" NOT NULL DEFAULT 'NONE',
  "mutedUntil" timestamp(3),
  "leftAt" timestamp(3),
  "archivedAt" timestamp(3),
  "pinnedAt" timestamp(3),
  "lastReadAt" timestamp(3) NOT NULL,
  "joinedAt" timestamp(3) NOT NULL,
  "updatedAt" timestamp(3) NOT NULL
);
CREATE UNIQUE INDEX "ConversationParticipant_conversationId_userId_key"
  ON "ConversationParticipant" ("conversationId", "userId");
CREATE INDEX "ConversationParticipant_userId_idx" ON "ConversationParticipant" ("userId");
CREATE INDEX "ConversationParticipant_conversationId_idx" ON "ConversationParticipant" ("conversationId");
CREATE INDEX "ConversationParticipant_userId_leftAt_idx" ON "ConversationParticipant" ("userId", "leftAt");

CREATE TABLE "Message" (
  id text PRIMARY KEY,
  "conversationId" text NOT NULL,
  "senderId" text NOT NULL,
  body text,
  client_seq integer,
  "messageType" "MessageType" NOT NULL DEFAULT 'TEXT',
  "replyToId" text,
  "forwardedFromId" text,
  "deletedAt" timestamp(3),
  "deletedForAll" boolean NOT NULL DEFAULT false,
  "editedAt" timestamp(3),
  "createdAt" timestamp(3) NOT NULL
);
CREATE INDEX "Message_conversationId_createdAt_idx" ON "Message" ("conversationId", "createdAt");
CREATE INDEX "Message_conversationId_createdAt_id_idx" ON "Message" ("conversationId", "createdAt", id);
CREATE INDEX "Message_conversationId_createdAt_client_seq_idx" ON "Message" ("conversationId", "createdAt", client_seq);
CREATE INDEX "Message_conversationId_deletedForAll_createdAt_id_idx" ON "Message" ("conversationId", "deletedForAll", "createdAt", id);
CREATE INDEX "Message_senderId_idx" ON "Message" ("senderId");
CREATE INDEX "Message_createdAt_idx" ON "Message" ("createdAt");

CREATE TABLE "MessageDeletion" (
  "messageId" text NOT NULL,
  "userId" text NOT NULL,
  "deletedAt" timestamp(3) NOT NULL,
  PRIMARY KEY ("messageId", "userId")
);
CREATE TABLE "UserBlock" (
  "blockerId" text NOT NULL,
  "blockedId" text NOT NULL,
  "createdAt" timestamp(3) NOT NULL,
  PRIMARY KEY ("blockerId", "blockedId")
);
CREATE INDEX "UserBlock_blockedId_idx" ON "UserBlock" ("blockedId");

-- 1,000 conversations x 1,000 messages. IDs have the actual UUID-string width;
-- each message carries a 160-byte body. Generation is deterministic.
INSERT INTO "Message" (id, "conversationId", "senderId", body, client_seq,
                       "deletedAt", "deletedForAll", "createdAt")
SELECT md5('message-' || g)::uuid::text,
       md5('conversation-' || c)::uuid::text,
       CASE WHEN s % 10 = 0 THEN '10000000-0000-0000-0000-000000000001'
            ELSE md5('sender-' || (s % 20))::uuid::text END,
       repeat('benchmark text. ', 10), s,
       CASE WHEN s % 29 = 0 THEN timestamp '2026-01-02' END,
       s % 31 = 0,
       timestamp '2026-01-01' + s * interval '1 second'
FROM generate_series(1, 1000000) AS t(g)
CROSS JOIN LATERAL (SELECT ((g - 1) / 1000) + 1 AS c, ((g - 1) % 1000) + 1 AS s) AS v;

-- 100 background memberships plus the benchmark user in every conversation.
INSERT INTO "ConversationParticipant" (id, "conversationId", "userId", "joinedAt", "lastReadAt", "updatedAt")
SELECT md5('participant-' || c || '-' || u)::uuid::text,
       md5('conversation-' || c)::uuid::text,
       CASE WHEN u = 0 THEN '10000000-0000-0000-0000-000000000001'
            ELSE md5('participant-user-' || u)::uuid::text END,
       timestamp '2026-01-01', timestamp '2026-01-01', timestamp '2026-01-01'
FROM generate_series(1, 1000) AS conv(c)
CROSS JOIN generate_series(0, 100) AS users(u);

INSERT INTO "MessageDeletion" ("messageId", "userId", "deletedAt")
SELECT md5('message-' || g)::uuid::text,
       '10000000-0000-0000-0000-000000000001', timestamp '2026-01-02'
FROM generate_series(1, 1000000) AS t(g)
WHERE (((g - 1) % 1000) + 1) % 37 = 0;
INSERT INTO "MessageDeletion" ("messageId", "userId", "deletedAt")
SELECT md5('message-' || g)::uuid::text,
       md5('unrelated-deletion-user')::uuid::text, timestamp '2026-01-02'
FROM generate_series(1, 1000000) AS t(g)
WHERE (((g - 1) % 1000) + 1) % 41 = 0;

INSERT INTO "UserBlock" ("blockerId", "blockedId", "createdAt") VALUES
  ('10000000-0000-0000-0000-000000000001', md5('sender-1')::uuid::text, timestamp '2026-01-02'),
  (md5('sender-2')::uuid::text, '10000000-0000-0000-0000-000000000001', timestamp '2026-01-02');
INSERT INTO "UserBlock" ("blockerId", "blockedId", "createdAt")
SELECT md5('background-blocker-' || g)::uuid::text,
       md5('background-blocked-' || g)::uuid::text, timestamp '2026-01-02'
FROM generate_series(1, 5000) AS t(g);

-- Vacuum is explicit because the disposable fixture has no prior autovacuum.
-- This also establishes visibility-map coverage for the index-only comparison.
VACUUM (ANALYZE) "Message";
VACUUM (ANALYZE) "ConversationParticipant";
VACUUM (ANALYZE) "MessageDeletion";
VACUUM (ANALYZE) "UserBlock";

CREATE TABLE benchmark_results (
  stage text NOT NULL,
  profile text NOT NULL,
  repetition integer NOT NULL,
  expected_count bigint NOT NULL,
  actual_count bigint NOT NULL,
  plan jsonb NOT NULL
);
CREATE TABLE benchmark_index_sizes (stage text NOT NULL, indexes jsonb NOT NULL);

CREATE FUNCTION record_index_sizes(stage_name text) RETURNS void LANGUAGE sql AS $sizes$
  INSERT INTO benchmark_index_sizes
  SELECT stage_name, jsonb_object_agg(indexrelname, pg_relation_size(indexrelid))
  FROM pg_stat_user_indexes
  WHERE schemaname = 'unread_benchmark';
$sizes$;

CREATE FUNCTION run_case(stage_name text, profile_name text,
                        dialog_count integer, read_after integer, joined_after integer)
RETURNS void LANGUAGE plpgsql AS $case$
DECLARE
  benchmark_user constant text := '10000000-0000-0000-0000-000000000001';
  expected bigint;
  actual bigint;
  result_plan jsonb;
  iteration integer;
  -- The five bound placeholders match getUnreadCount's five userId bindings.
  unread_sql constant text := $query$
    SELECT COUNT(*) AS count
    FROM "ConversationParticipant" p
    JOIN "Message" m ON m."conversationId" = p."conversationId"
    WHERE p."userId" = $1
      AND p."leftAt" IS NULL AND p."archivedAt" IS NULL
      AND m."senderId" <> $2
      AND m."deletedAt" IS NULL AND m."deletedForAll" = false
      AND m."createdAt" >= p."joinedAt" AND m."createdAt" > p."lastReadAt"
      AND NOT EXISTS (
        SELECT 1 FROM "MessageDeletion" d
        WHERE d."messageId" = m.id AND d."userId" = $3
      )
      AND NOT EXISTS (
        SELECT 1 FROM "UserBlock" b
        WHERE (b."blockerId" = $4 AND b."blockedId" = m."senderId")
           OR (b."blockedId" = $5 AND b."blockerId" = m."senderId")
      )
  $query$;
BEGIN
  UPDATE "ConversationParticipant" p
  SET "lastReadAt" = timestamp '2026-01-01' + read_after * interval '1 second',
      "joinedAt" = timestamp '2026-01-01' + joined_after * interval '1 second',
      "leftAt" = CASE WHEN c > dialog_count OR c % 20 = 1 THEN timestamp '2026-01-02' END,
      "archivedAt" = CASE WHEN c % 20 = 0 THEN timestamp '2026-01-02' END
  FROM generate_series(1, 1000) AS conversations(c)
  WHERE p."userId" = benchmark_user AND p."conversationId" = md5('conversation-' || c)::uuid::text;
  ANALYZE "ConversationParticipant";

  -- Independent arithmetic oracle: no joins to the fixture or badge query.
  SELECT (SELECT count(*) FROM generate_series(1, dialog_count) AS t(c) WHERE c % 20 NOT IN (0, 1))
       * (SELECT count(*) FROM generate_series(1, 1000) AS t(s)
          WHERE s > read_after AND s >= joined_after
            AND s % 10 <> 0 AND s % 20 NOT IN (1, 2)
            AND s % 29 <> 0 AND s % 31 <> 0 AND s % 37 <> 0)
  INTO expected;
  EXECUTE unread_sql INTO actual
    USING benchmark_user, benchmark_user, benchmark_user, benchmark_user, benchmark_user;
  IF actual <> expected THEN
    RAISE EXCEPTION 'Count mismatch: stage %, profile %, expected %, actual %', stage_name, profile_name, expected, actual;
  END IF;

  -- Above sanity query is an unrecorded warmup. Record five real EXPLAIN runs.
  FOR iteration IN 1..5 LOOP
    EXECUTE 'EXPLAIN (ANALYZE, BUFFERS, SETTINGS, FORMAT JSON) ' || unread_sql INTO result_plan
      USING benchmark_user, benchmark_user, benchmark_user, benchmark_user, benchmark_user;
    INSERT INTO benchmark_results VALUES (stage_name, profile_name, iteration, expected, actual, result_plan);
  END LOOP;
END
$case$;

-- Baseline preserves every index declared by the current Prisma schema.
SELECT record_index_sizes('existing');
SELECT run_case('existing', 'recent_100_dialogs', 100, 950, 200);
SELECT run_case('existing', 'backlog_1000_dialogs', 1000, 0, 0);
SELECT run_case('existing', 'caught_up_100_dialogs', 100, 1000, 200);

-- Candidate indexes exist only in this disposable fixture. These are proposed
-- DDL, not a migration or an application-database operation.
CREATE INDEX "Message_unread_candidate_idx"
  ON "Message" ("conversationId", "createdAt") INCLUDE (id, "senderId")
  WHERE "deletedAt" IS NULL AND "deletedForAll" = false;
ANALYZE "Message";
SELECT record_index_sizes('message_covering');
SELECT run_case('message_covering', 'recent_100_dialogs', 100, 950, 200);
SELECT run_case('message_covering', 'backlog_1000_dialogs', 1000, 0, 0);
SELECT run_case('message_covering', 'caught_up_100_dialogs', 100, 1000, 200);

CREATE INDEX "ConversationParticipant_unread_candidate_idx"
  ON "ConversationParticipant" ("userId", "conversationId") INCLUDE ("joinedAt", "lastReadAt")
  WHERE "leftAt" IS NULL AND "archivedAt" IS NULL;
ANALYZE "ConversationParticipant";
SELECT record_index_sizes('both_covering');
SELECT run_case('both_covering', 'recent_100_dialogs', 100, 950, 200);
SELECT run_case('both_covering', 'backlog_1000_dialogs', 1000, 0, 0);
SELECT run_case('both_covering', 'caught_up_100_dialogs', 100, 1000, 200);

\echo BENCHMARK_JSON_BEGIN
SELECT jsonb_pretty(jsonb_build_object(
  'environment', jsonb_build_object(
    'server_version', current_setting('server_version'),
    'database', current_database(),
    'shared_buffers', current_setting('shared_buffers'),
    'work_mem', current_setting('work_mem'),
    'max_parallel_workers_per_gather', current_setting('max_parallel_workers_per_gather'),
    'jit', current_setting('jit'),
    'plan_mode', 'PL/pgSQL EXECUTE, custom parameter plan on every execution',
    'measured_at', clock_timestamp()
  ),
  'fixture', jsonb_build_object(
    'messages', (SELECT count(*) FROM "Message"),
    'participants', (SELECT count(*) FROM "ConversationParticipant"),
    'personal_deletions', (SELECT count(*) FROM "MessageDeletion"),
    'blocks', (SELECT count(*) FROM "UserBlock"),
    'message_heap_bytes', pg_relation_size('"Message"'),
    'participant_heap_bytes', pg_relation_size('"ConversationParticipant"'),
    'message_body_bytes', 160,
    'warmup_runs_per_case', 1,
    'measured_runs_per_case', 5
  ),
  'index_sizes', (SELECT jsonb_agg(to_jsonb(s) ORDER BY stage) FROM benchmark_index_sizes s),
  'runs', (SELECT jsonb_agg(to_jsonb(r) ORDER BY stage, profile, repetition) FROM benchmark_results r)
));
\echo BENCHMARK_JSON_END

DROP SCHEMA unread_benchmark CASCADE;
