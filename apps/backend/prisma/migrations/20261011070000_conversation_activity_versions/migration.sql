CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE EXTENSION IF NOT EXISTS btree_gin;

-- A user's activity ordering is retained for the lifetime of a paging cursor.
CREATE TABLE "ConversationActivityVersion" (
  "userId" TEXT NOT NULL REFERENCES "User"(id) ON DELETE CASCADE,
  "conversationId" TEXT NOT NULL REFERENCES "Conversation"(id) ON DELETE CASCADE,
  "activityAt" TIMESTAMP(3) NOT NULL,
  "conversationType" "ConversationType" NOT NULL,
  "archived" BOOLEAN NOT NULL DEFAULT false,
  "searchText" TEXT NOT NULL DEFAULT '',
  "validFrom" TIMESTAMPTZ(6) NOT NULL,
  "validTo" TIMESTAMPTZ(6),
  PRIMARY KEY ("userId", "conversationId", "validFrom")
);
CREATE INDEX "conv_activity_user_order_idx"
  ON "ConversationActivityVersion" ("userId", "activityAt" DESC, "conversationId" DESC);
CREATE INDEX "conv_activity_user_dialog_validity_idx"
  ON "ConversationActivityVersion" ("userId", "conversationId", "validTo");
CREATE INDEX "conv_activity_dialog_validity_idx"
  ON "ConversationActivityVersion" ("conversationId", "validTo");
CREATE INDEX "conv_activity_user_archive_order_idx"
  ON "ConversationActivityVersion" ("userId", archived, "activityAt" DESC, "conversationId" DESC);
CREATE INDEX "conv_activity_user_type_order_idx"
  ON "ConversationActivityVersion" ("userId", "conversationType", "activityAt" DESC, "conversationId" DESC);
CREATE INDEX "conv_activity_user_search_idx"
  ON "ConversationActivityVersion" USING gin ("userId", "searchText" gin_trgm_ops);
CREATE FUNCTION conversation_activity_search_text(conversation_id text, viewer_id text) RETURNS text LANGUAGE sql STABLE AS $$
  SELECT CASE WHEN c.type = 'GROUP' THEN COALESCE(c.name, 'Unnamed group') ELSE (
    SELECT COALESCE(string_agg(COALESCE(p.nickname, u."displayName", u.username) || chr(1) || u.username, chr(1)), '')
    FROM "ConversationParticipant" p JOIN "User" u ON u.id = p."userId"
    WHERE p."conversationId" = c.id AND p."userId" <> viewer_id AND p."leftAt" IS NULL
  ) END FROM "Conversation" c WHERE c.id = conversation_id
$$;
CREATE UNIQUE INDEX "conv_activity_current_idx"
  ON "ConversationActivityVersion" ("userId", "conversationId") WHERE "validTo" IS NULL;
INSERT INTO "ConversationActivityVersion" ("userId", "conversationId", "activityAt", "validFrom", "conversationType", archived, "searchText")
  SELECT p."userId", c.id, c."updatedAt", '-infinity'::timestamptz, c.type, p."archivedAt" IS NOT NULL, conversation_activity_search_text(c.id, p."userId")
  FROM "ConversationParticipant" p JOIN "Conversation" c ON c.id = p."conversationId"
  WHERE p."leftAt" IS NULL;

CREATE FUNCTION conversation_activity_version() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE changed_at timestamptz; member_user_id text;
BEGIN
  IF NEW."updatedAt" IS NOT DISTINCT FROM OLD."updatedAt" THEN RETURN NEW; END IF;
  FOR member_user_id IN SELECT "userId" FROM "ConversationParticipant" WHERE "conversationId" = NEW.id AND "leftAt" IS NULL ORDER BY "userId" LOOP
    PERFORM pg_advisory_xact_lock_shared(hashtextextended('conversation-page:' || member_user_id, 0));
  END LOOP;
  changed_at := clock_timestamp();
  UPDATE "ConversationActivityVersion" SET "validTo" = changed_at
    WHERE "conversationId" = NEW.id AND "validTo" IS NULL;
  INSERT INTO "ConversationActivityVersion" ("userId", "conversationId", "activityAt", "validFrom", "conversationType", archived, "searchText")
    SELECT "userId", NEW.id, NEW."updatedAt", changed_at, NEW.type, "archivedAt" IS NOT NULL, conversation_activity_search_text(NEW.id, "userId") FROM "ConversationParticipant"
    WHERE "conversationId" = NEW.id AND "leftAt" IS NULL;
  DELETE FROM "ConversationActivityVersion" WHERE "conversationId" = NEW.id
    AND "validTo" < changed_at - interval '20 minutes';
  RETURN NEW;
END $$;
CREATE TRIGGER conversation_activity_version_update AFTER UPDATE OF "updatedAt" ON "Conversation"
  FOR EACH ROW EXECUTE FUNCTION conversation_activity_version();

-- A display name or nickname can change without new message activity. Keep
-- its searchable document versioned at the same position in the list.
CREATE FUNCTION conversation_activity_refresh_search(conversation_id text) RETURNS void LANGUAGE plpgsql AS $$
DECLARE changed_at timestamptz; member_user_id text;
BEGIN
  FOR member_user_id IN SELECT "userId" FROM "ConversationActivityVersion"
    WHERE "conversationId" = conversation_id AND "validTo" IS NULL ORDER BY "userId" LOOP
    PERFORM pg_advisory_xact_lock_shared(hashtextextended('conversation-page:' || member_user_id, 0));
  END LOOP;
  changed_at := clock_timestamp();
  WITH changed AS (
    UPDATE "ConversationActivityVersion" v SET "validTo" = changed_at
    WHERE v."conversationId" = conversation_id AND v."validTo" IS NULL
      AND v."searchText" IS DISTINCT FROM conversation_activity_search_text(conversation_id, v."userId")
    RETURNING v.*
  ) INSERT INTO "ConversationActivityVersion" ("userId", "conversationId", "activityAt", "validFrom", "conversationType", archived, "searchText")
    SELECT "userId", "conversationId", "activityAt", changed_at, "conversationType", archived,
      conversation_activity_search_text(conversation_id, "userId") FROM changed;
END $$;

CREATE FUNCTION conversation_membership_activity_version() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE changed_at timestamptz; activity_at timestamp(3); conversation_type "ConversationType";
BEGIN
  IF TG_OP = 'UPDATE' AND NEW."leftAt" IS NOT DISTINCT FROM OLD."leftAt" AND NEW."archivedAt" IS NOT DISTINCT FROM OLD."archivedAt" AND NEW.nickname IS NOT DISTINCT FROM OLD.nickname THEN RETURN NEW; END IF;
  -- Same lock order as conversation updates; one membership cannot race its
  -- conversation activity trigger into two simultaneously current versions.
  SELECT "updatedAt", type INTO activity_at, conversation_type FROM "Conversation" WHERE id = NEW."conversationId" FOR UPDATE;
  PERFORM pg_advisory_xact_lock_shared(hashtextextended('conversation-page:' || NEW."userId", 0));
  changed_at := clock_timestamp();
  UPDATE "ConversationActivityVersion" SET "validTo" = changed_at WHERE "userId" = NEW."userId"
    AND "conversationId" = NEW."conversationId" AND "validTo" IS NULL;
  IF NEW."leftAt" IS NULL THEN
    INSERT INTO "ConversationActivityVersion" ("userId", "conversationId", "activityAt", "validFrom", "conversationType", archived, "searchText")
      VALUES (NEW."userId", NEW."conversationId", activity_at, changed_at, conversation_type, NEW."archivedAt" IS NOT NULL, conversation_activity_search_text(NEW."conversationId", NEW."userId"));
  END IF;
  IF conversation_type = 'DIRECT' THEN PERFORM conversation_activity_refresh_search(NEW."conversationId"); END IF;
  DELETE FROM "ConversationActivityVersion" WHERE "userId" = NEW."userId" AND "conversationId" = NEW."conversationId"
    AND "validTo" < changed_at - interval '20 minutes';
  RETURN NEW;
END $$;
CREATE TRIGGER conversation_membership_activity_insert AFTER INSERT ON "ConversationParticipant"
  FOR EACH ROW EXECUTE FUNCTION conversation_membership_activity_version();
CREATE TRIGGER conversation_membership_activity_update AFTER UPDATE OF "leftAt", "archivedAt", nickname ON "ConversationParticipant"
  FOR EACH ROW EXECUTE FUNCTION conversation_membership_activity_version();

CREATE FUNCTION conversation_user_search_update() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE conversation_id text;
BEGIN
  IF NEW.username IS NOT DISTINCT FROM OLD.username AND NEW."displayName" IS NOT DISTINCT FROM OLD."displayName" THEN RETURN NEW; END IF;
  FOR conversation_id IN SELECT c.id FROM "Conversation" c JOIN "ConversationParticipant" p ON p."conversationId" = c.id
    WHERE c.type = 'DIRECT' AND p."userId" = NEW.id AND p."leftAt" IS NULL ORDER BY c.id FOR UPDATE OF c LOOP
    PERFORM conversation_activity_refresh_search(conversation_id);
  END LOOP;
  RETURN NEW;
END $$;
CREATE TRIGGER conversation_user_search_update AFTER UPDATE OF username, "displayName" ON "User"
  FOR EACH ROW EXECUTE FUNCTION conversation_user_search_update();
