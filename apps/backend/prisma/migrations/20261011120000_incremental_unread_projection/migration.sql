-- No application data is backfilled in this migration. Readiness is per membership;
-- the bounded reconciliation worker opts memberships in under the same row lock
-- used by every message/deletion trigger. Until then the reader uses the oracle.
ALTER TABLE "ConversationParticipant"
  ADD COLUMN "unreadProjectionReady" boolean NOT NULL DEFAULT false,
  ADD COLUMN "unreadProjectionVerifiedAt" timestamp(3);

CREATE TABLE "UnreadSenderCount" (
  "participantId" text NOT NULL,
  "senderId" text NOT NULL,
  count bigint NOT NULL CHECK (count >= 0),
  CONSTRAINT "UnreadSenderCount_pkey" PRIMARY KEY ("participantId", "senderId"),
  CONSTRAINT "UnreadSenderCount_participantId_fkey" FOREIGN KEY ("participantId")
    REFERENCES "ConversationParticipant"(id) ON DELETE CASCADE ON UPDATE CASCADE
);

-- Every trigger obtains participant locks in id order. This lock also protects
-- the read watermark, count deltas, join rebuilds and reconciliation snapshots.
CREATE FUNCTION unread_projection_adjust(p_id text, sender_id text, delta bigint)
RETURNS void LANGUAGE plpgsql SET search_path FROM CURRENT AS $$
DECLARE changed integer;
BEGIN
  IF delta = 0 OR NOT EXISTS (SELECT 1 FROM "ConversationParticipant" WHERE id = p_id AND "unreadProjectionReady") THEN RETURN; END IF;
  IF delta > 0 THEN
    INSERT INTO "UnreadSenderCount" ("participantId", "senderId", count)
      VALUES (p_id, sender_id, delta)
      ON CONFLICT ("participantId", "senderId") DO UPDATE SET count = "UnreadSenderCount".count + EXCLUDED.count;
  ELSE
    UPDATE "UnreadSenderCount" SET count = count + delta
      WHERE "participantId" = p_id AND "senderId" = sender_id AND count >= -delta;
    GET DIAGNOSTICS changed = ROW_COUNT;
    IF changed = 0 THEN
      -- Corrupt/old buckets must never break message writes or return negatives.
      -- Fail closed to the aggregate until the bounded worker repairs this member.
      UPDATE "ConversationParticipant" SET "unreadProjectionReady" = false,
        "unreadProjectionVerifiedAt" = NULL WHERE id = p_id;
      DELETE FROM "UnreadSenderCount" WHERE "participantId" = p_id;
      RETURN;
    END IF;
    DELETE FROM "UnreadSenderCount" WHERE "participantId" = p_id AND "senderId" = sender_id AND count = 0;
  END IF;
END $$;

CREATE FUNCTION unread_projection_reconcile(p_id text)
RETURNS boolean LANGUAGE plpgsql SET search_path FROM CURRENT AS $$
DECLARE p "ConversationParticipant"%ROWTYPE;
BEGIN
  SELECT * INTO p FROM "ConversationParticipant" WHERE id = p_id FOR UPDATE;
  IF NOT FOUND THEN RETURN false; END IF;
  DELETE FROM "UnreadSenderCount" WHERE "participantId" = p.id;
  INSERT INTO "UnreadSenderCount" ("participantId", "senderId", count)
    SELECT p.id, m."senderId", COUNT(*) FROM "Message" m
    WHERE m."conversationId" = p."conversationId" AND m."senderId" <> p."userId"
      AND m."deletedAt" IS NULL AND NOT m."deletedForAll"
      AND m."createdAt" >= p."joinedAt" AND m."createdAt" > p."lastReadAt"
      AND NOT EXISTS (SELECT 1 FROM "MessageDeletion" d WHERE d."messageId" = m.id AND d."userId" = p."userId")
    GROUP BY m."senderId";
  UPDATE "ConversationParticipant" SET "unreadProjectionReady" = true,
    "unreadProjectionVerifiedAt" = clock_timestamp() WHERE id = p.id;
  RETURN true;
END $$;

CREATE FUNCTION unread_projection_watermark_guard()
RETURNS trigger LANGUAGE plpgsql SET search_path FROM CURRENT AS $$
BEGIN
  IF COALESCE(current_setting('app.unread_projection_reset', true), '') <> 'true' THEN
    NEW."lastReadAt" := GREATEST(OLD."lastReadAt", NEW."lastReadAt");
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER unread_projection_watermark_guard BEFORE UPDATE OF "lastReadAt" ON "ConversationParticipant"
  FOR EACH ROW EXECUTE FUNCTION unread_projection_watermark_guard();

CREATE FUNCTION unread_projection_participant_changed()
RETURNS trigger LANGUAGE plpgsql SET search_path FROM CURRENT AS $$
DECLARE r record;
BEGIN
  IF NOT NEW."unreadProjectionReady" THEN RETURN NEW; END IF;
  IF NEW."joinedAt" IS DISTINCT FROM OLD."joinedAt" OR NEW."lastReadAt" < OLD."lastReadAt" THEN
    PERFORM unread_projection_reconcile(NEW.id);
  ELSIF NEW."lastReadAt" > OLD."lastReadAt" THEN
    IF NOT EXISTS (SELECT 1 FROM "Message" WHERE "conversationId" = NEW."conversationId" AND "createdAt" > NEW."lastReadAt") THEN
      -- The common caught-up read is O(sender buckets), even for a huge backlog.
      DELETE FROM "UnreadSenderCount" WHERE "participantId" = NEW.id;
    ELSE
      FOR r IN SELECT m."senderId", COUNT(*) AS count FROM "Message" m
        WHERE m."conversationId" = NEW."conversationId" AND m."senderId" <> NEW."userId"
          AND m."deletedAt" IS NULL AND NOT m."deletedForAll"
          AND m."createdAt" >= NEW."joinedAt" AND m."createdAt" > OLD."lastReadAt" AND m."createdAt" <= NEW."lastReadAt"
          AND NOT EXISTS (SELECT 1 FROM "MessageDeletion" d WHERE d."messageId" = m.id AND d."userId" = NEW."userId")
        GROUP BY m."senderId"
      LOOP PERFORM unread_projection_adjust(NEW.id, r."senderId", -r.count); END LOOP;
    END IF;
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER unread_projection_participant_changed AFTER UPDATE OF "lastReadAt", "joinedAt" ON "ConversationParticipant"
  FOR EACH ROW EXECUTE FUNCTION unread_projection_participant_changed();

-- Explicit "mark unread" is the only allowed watermark rewind. Scope and reset
-- the GUC so a later ordinary read in the same transaction stays monotonic.
CREATE FUNCTION unread_projection_reset_read(p_id text, read_at timestamp DEFAULT timestamp 'epoch')
RETURNS boolean LANGUAGE plpgsql SET search_path FROM CURRENT AS $$
DECLARE previous_setting text; changed integer;
BEGIN
  PERFORM 1 FROM "ConversationParticipant" WHERE id = p_id FOR UPDATE;
  IF NOT FOUND THEN RETURN false; END IF;
  previous_setting := COALESCE(current_setting('app.unread_projection_reset', true), '');
  PERFORM set_config('app.unread_projection_reset', 'true', true);
  UPDATE "ConversationParticipant" SET "lastReadAt" = read_at WHERE id = p_id;
  GET DIAGNOSTICS changed = ROW_COUNT;
  PERFORM set_config('app.unread_projection_reset', previous_setting, true);
  RETURN changed > 0;
END $$;

CREATE FUNCTION unread_projection_before_insert()
RETURNS trigger LANGUAGE plpgsql SET search_path FROM CURRENT AS $$
DECLARE latest_read timestamp;
BEGIN
  PERFORM 1 FROM "ConversationParticipant" WHERE "conversationId" = NEW."conversationId" ORDER BY id FOR UPDATE;
  -- now() is transaction START, so a delayed transaction could otherwise insert
  -- a message behind a read watermark. Refresh only the database default; explicit
  -- historical timestamps used by imports/fixtures retain their semantics.
  IF NEW."createdAt" = transaction_timestamp()::timestamp(3) THEN
    SELECT MAX("lastReadAt") INTO latest_read FROM "ConversationParticipant"
      WHERE "conversationId" = NEW."conversationId" AND "leftAt" IS NULL AND "userId" <> NEW."senderId";
    NEW."createdAt" := GREATEST(clock_timestamp()::timestamp(3), latest_read + interval '1 millisecond');
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER unread_projection_before_insert BEFORE INSERT ON "Message"
  FOR EACH ROW EXECUTE FUNCTION unread_projection_before_insert();

CREATE FUNCTION unread_projection_message_changed()
RETURNS trigger LANGUAGE plpgsql SET search_path FROM CURRENT AS $$
DECLARE p "ConversationParticipant"%ROWTYPE; old_conv text; new_conv text;
BEGIN
  IF TG_OP <> 'INSERT' THEN old_conv := OLD."conversationId"; END IF;
  IF TG_OP <> 'DELETE' THEN new_conv := NEW."conversationId"; END IF;
  FOR p IN SELECT * FROM "ConversationParticipant" WHERE "conversationId" IN (old_conv, new_conv) ORDER BY id FOR UPDATE
  LOOP
    IF NOT p."unreadProjectionReady" THEN CONTINUE; END IF;
    IF TG_OP <> 'INSERT' AND p."conversationId" = OLD."conversationId" AND OLD."senderId" <> p."userId"
      AND OLD."deletedAt" IS NULL AND NOT OLD."deletedForAll"
      AND OLD."createdAt" >= p."joinedAt" AND OLD."createdAt" > p."lastReadAt"
      AND NOT EXISTS (SELECT 1 FROM "MessageDeletion" d WHERE d."messageId" = OLD.id AND d."userId" = p."userId") THEN
      PERFORM unread_projection_adjust(p.id, OLD."senderId", -1);
    END IF;
    IF TG_OP <> 'DELETE' AND p."conversationId" = NEW."conversationId" AND NEW."senderId" <> p."userId"
      AND NEW."deletedAt" IS NULL AND NOT NEW."deletedForAll"
      AND NEW."createdAt" >= p."joinedAt" AND NEW."createdAt" > p."lastReadAt"
      AND NOT EXISTS (SELECT 1 FROM "MessageDeletion" d WHERE d."messageId" = NEW.id AND d."userId" = p."userId") THEN
      PERFORM unread_projection_adjust(p.id, NEW."senderId", 1);
    END IF;
  END LOOP;
  IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER unread_projection_message_inserted AFTER INSERT ON "Message"
  FOR EACH ROW EXECUTE FUNCTION unread_projection_message_changed();
CREATE TRIGGER unread_projection_message_updated AFTER UPDATE OF "conversationId", "senderId", "createdAt", "deletedAt", "deletedForAll" ON "Message"
  FOR EACH ROW WHEN (OLD."conversationId" IS DISTINCT FROM NEW."conversationId" OR OLD."senderId" IS DISTINCT FROM NEW."senderId"
    OR OLD."createdAt" IS DISTINCT FROM NEW."createdAt" OR OLD."deletedAt" IS DISTINCT FROM NEW."deletedAt" OR OLD."deletedForAll" IS DISTINCT FROM NEW."deletedForAll")
  EXECUTE FUNCTION unread_projection_message_changed();
-- BEFORE matters: personal-deletion FK cascades must still be visible here.
CREATE TRIGGER unread_projection_message_deleted BEFORE DELETE ON "Message"
  FOR EACH ROW EXECUTE FUNCTION unread_projection_message_changed();

CREATE FUNCTION unread_projection_personal_deletion_changed()
RETURNS trigger LANGUAGE plpgsql SET search_path FROM CURRENT AS $$
DECLARE p "ConversationParticipant"%ROWTYPE; m "Message"%ROWTYPE; msg_id text; recipient_id text; delta bigint;
BEGIN
  IF TG_OP = 'INSERT' THEN msg_id := NEW."messageId"; recipient_id := NEW."userId"; delta := -1;
  ELSE msg_id := OLD."messageId"; recipient_id := OLD."userId"; delta := 1; END IF;
  SELECT * INTO m FROM "Message" WHERE id = msg_id;
  IF NOT FOUND THEN RETURN NULL; END IF;
  SELECT * INTO p FROM "ConversationParticipant" WHERE "conversationId" = m."conversationId" AND "userId" = recipient_id FOR UPDATE;
  IF FOUND AND p."unreadProjectionReady" THEN
    -- Re-read after taking the membership lock: a concurrent deletion/restoration
    -- may have committed while we waited. Its trigger already applied its delta.
    SELECT * INTO m FROM "Message" WHERE id = msg_id;
    IF FOUND AND m."senderId" <> p."userId" AND m."deletedAt" IS NULL AND NOT m."deletedForAll"
      AND m."createdAt" >= p."joinedAt" AND m."createdAt" > p."lastReadAt" THEN
      PERFORM unread_projection_adjust(p.id, m."senderId", delta);
    END IF;
  END IF;
  RETURN NULL;
END $$;
CREATE TRIGGER unread_projection_personal_deleted AFTER INSERT ON "MessageDeletion"
  FOR EACH ROW EXECUTE FUNCTION unread_projection_personal_deletion_changed();
CREATE TRIGGER unread_projection_personal_restored AFTER DELETE ON "MessageDeletion"
  FOR EACH ROW EXECUTE FUNCTION unread_projection_personal_deletion_changed();
