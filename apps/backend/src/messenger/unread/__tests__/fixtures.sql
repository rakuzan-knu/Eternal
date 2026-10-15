-- Only loaded by the isolated Docker test runner; no application URL is used.
CREATE TABLE "ConversationParticipant" (
  id text PRIMARY KEY, "conversationId" text NOT NULL, "userId" text NOT NULL,
  "lastReadAt" timestamp(3) NOT NULL, "joinedAt" timestamp(3) NOT NULL,
  "leftAt" timestamp(3), "archivedAt" timestamp(3),
  "updatedAt" timestamp(3) NOT NULL DEFAULT now(),
  UNIQUE ("conversationId", "userId")
);
CREATE INDEX ON "ConversationParticipant" ("userId");
CREATE INDEX ON "ConversationParticipant" ("conversationId");
CREATE TABLE "Message" (
  id text PRIMARY KEY, "conversationId" text NOT NULL, "senderId" text NOT NULL,
  "createdAt" timestamp(3) NOT NULL DEFAULT now(), "deletedAt" timestamp(3),
  "deletedForAll" boolean NOT NULL DEFAULT false, "messageType" text DEFAULT 'TEXT'
);
CREATE INDEX ON "Message" ("conversationId", "createdAt");
CREATE TABLE "MessageDeletion" (
  "messageId" text NOT NULL REFERENCES "Message"(id) ON DELETE CASCADE,
  "userId" text NOT NULL, "deletedAt" timestamp(3) NOT NULL DEFAULT now(),
  PRIMARY KEY ("messageId", "userId")
);
CREATE TABLE "UserBlock" (
  "blockerId" text NOT NULL, "blockedId" text NOT NULL,
  PRIMARY KEY ("blockerId", "blockedId")
);
CREATE INDEX ON "UserBlock" ("blockedId");
CREATE TABLE outbox_events (id text PRIMARY KEY, event_type text, status text, payload jsonb);
INSERT INTO "ConversationParticipant" (id, "conversationId", "userId", "joinedAt", "lastReadAt")
VALUES ('p', 'c', 'reader', '2026-01-01', '2026-01-01'),
       ('p-sender', 'c', 'sender', '2026-01-01', '2026-01-01');

CREATE FUNCTION test_assert(actual bigint, wanted bigint, label text) RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  IF actual IS DISTINCT FROM wanted THEN
    RAISE EXCEPTION '%: expected %, got %', label, wanted, actual;
  END IF;
END $$;
CREATE FUNCTION test_bucket() RETURNS bigint LANGUAGE sql AS $$
  SELECT COALESCE(SUM(count), 0)::bigint FROM "UnreadSenderCount" WHERE "participantId" = 'p'
$$;
CREATE FUNCTION test_oracle() RETURNS bigint LANGUAGE sql AS $$
  SELECT COUNT(*) FROM "ConversationParticipant" p JOIN "Message" m ON m."conversationId" = p."conversationId"
  WHERE p.id = 'p' AND p."leftAt" IS NULL AND p."archivedAt" IS NULL
    AND m."senderId" <> p."userId" AND m."deletedAt" IS NULL AND NOT m."deletedForAll"
    AND m."createdAt" >= p."joinedAt" AND m."createdAt" > p."lastReadAt"
    AND NOT EXISTS (SELECT 1 FROM "MessageDeletion" d WHERE d."messageId" = m.id AND d."userId" = p."userId")
    AND NOT EXISTS (SELECT 1 FROM "UserBlock" b WHERE (b."blockerId" = p."userId" AND b."blockedId" = m."senderId") OR (b."blockedId" = p."userId" AND b."blockerId" = m."senderId"))
$$;
CREATE FUNCTION test_badge() RETURNS bigint LANGUAGE sql AS $$
  SELECT COALESCE(SUM(c.count), 0)::bigint FROM "ConversationParticipant" p JOIN "UnreadSenderCount" c ON c."participantId" = p.id
  WHERE p.id = 'p' AND p."leftAt" IS NULL AND p."archivedAt" IS NULL
    AND NOT EXISTS (SELECT 1 FROM "UserBlock" b WHERE (b."blockerId" = p."userId" AND b."blockedId" = c."senderId") OR (b."blockedId" = p."userId" AND b."blockerId" = c."senderId"))
$$;
