-- Expand only. Capture is OFF until every reader and outbox publisher is compatible.
CREATE SEQUENCE message_body_revision_seq;
SELECT setval('message_body_revision_seq', (extract(epoch FROM clock_timestamp()) * 1000000)::bigint);

ALTER TABLE "Message"
  ADD COLUMN body_search text,
  ADD COLUMN body_revision bigint NOT NULL DEFAULT 0,
  ADD COLUMN body_archived boolean NOT NULL DEFAULT false,
  ADD COLUMN body_digest text;

CREATE TABLE message_body_archive_config (
  id boolean PRIMARY KEY DEFAULT true CHECK (id),
  capture_enabled boolean NOT NULL DEFAULT false
);
INSERT INTO message_body_archive_config (id) VALUES (true);

CREATE FUNCTION message_search_projection(content text) RETURNS text
LANGUAGE plpgsql IMMUTABLE AS $$
DECLARE envelope jsonb;
BEGIN
  IF content IS NULL THEN RETURN NULL; END IF;
  BEGIN
    envelope := content::jsonb;
  EXCEPTION WHEN invalid_text_representation THEN
    RETURN content;
  END;
  -- Ciphertext has no server-searchable plaintext. Never copy encrypted envelopes into the index.
  IF envelope->>'e2ee' = 'true' THEN RETURN NULL; END IF;
  RETURN content;
END;
$$;

UPDATE "Message" SET body_search = message_search_projection(body),
  body_revision = nextval('message_body_revision_seq');
CREATE INDEX message_body_search_trgm ON "Message" USING gin (body_search gin_trgm_ops);
CREATE INDEX message_body_archive_pending ON "Message" (id) WHERE NOT body_archived AND body IS NOT NULL;

CREATE FUNCTION prepare_message_body_archive() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'UPDATE' THEN
    -- Only the archive worker clears an already copied body without changing its revision/index.
    IF NEW.body_archived AND NOT OLD.body_archived AND NEW.body IS NULL
       AND NEW.body_revision = OLD.body_revision
       AND NEW."deletedForAll" = OLD."deletedForAll"
       AND NEW."deletedAt" IS NOT DISTINCT FROM OLD."deletedAt" THEN RETURN NEW; END IF;
    IF NEW.body IS NOT DISTINCT FROM OLD.body
       AND NEW."deletedForAll" = OLD."deletedForAll"
       AND NEW."deletedAt" IS NOT DISTINCT FROM OLD."deletedAt" THEN RETURN NEW; END IF;
  END IF;
  NEW.body_revision := nextval('message_body_revision_seq');
  NEW.body_archived := false;
  NEW.body_digest := NULL;
  NEW.body_search := CASE WHEN NEW."deletedForAll" OR NEW."deletedAt" IS NOT NULL
    THEN NULL ELSE message_search_projection(NEW.body) END;
  RETURN NEW;
END;
$$;

CREATE FUNCTION capture_message_body_archive() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE message_key text; version bigint; kind text;
BEGIN
  IF TG_OP = 'DELETE' THEN
    IF NOT OLD.body_archived AND NOT (SELECT capture_enabled FROM message_body_archive_config WHERE id) THEN RETURN OLD; END IF;
    message_key := OLD.id;
    version := nextval('message_body_revision_seq');
    kind := 'MESSAGE_BODY_PURGE';
  ELSE
    IF TG_OP = 'UPDATE' THEN
      IF NEW.body_revision = OLD.body_revision THEN RETURN NEW; END IF;
    END IF;
    IF NOT (SELECT capture_enabled FROM message_body_archive_config WHERE id) THEN RETURN NEW; END IF;
    message_key := NEW.id;
    version := NEW.body_revision;
    kind := 'MESSAGE_BODY_WRITE';
    -- Short enqueue fence bounds retained work during provider outages. Purges are never capped.
    PERFORM pg_advisory_xact_lock(771683522);
    IF NOT EXISTS (SELECT 1 FROM outbox_events WHERE id = 'message-body:' || message_key)
      AND (SELECT count(*) FROM outbox_events WHERE event_type = 'MESSAGE_BODY_WRITE') >= 1000 THEN
      RAISE EXCEPTION 'Message history backlog is full' USING ERRCODE = '53000';
    END IF;
  END IF;
  INSERT INTO outbox_events (id, aggregate_type, aggregate_id, event_type, payload, status, created_at, updated_at)
    VALUES ('message-body:' || message_key, 'MESSAGE_BODY', message_key, kind,
      jsonb_build_object('revision', version::text), 'PENDING', now(), now())
    ON CONFLICT (id) DO UPDATE SET event_type = EXCLUDED.event_type, payload = EXCLUDED.payload,
      status = 'PENDING', retry_count = 0, last_error = NULL, updated_at = now();
  IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER message_body_prepare BEFORE INSERT OR UPDATE ON "Message"
  FOR EACH ROW EXECUTE FUNCTION prepare_message_body_archive();
CREATE TRIGGER message_body_capture AFTER INSERT OR UPDATE OR DELETE ON "Message"
  FOR EACH ROW EXECUTE FUNCTION capture_message_body_archive();
