-- Disabled until Core and Messenger both understand this private outbox event type.
CREATE TABLE public_search_control (id boolean PRIMARY KEY DEFAULT true CHECK (id), enabled boolean NOT NULL DEFAULT false);
INSERT INTO public_search_control (id, enabled) VALUES (true, false);

CREATE FUNCTION enqueue_public_identity_sync() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE identity_id text;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public_search_control WHERE id = true AND enabled = true) THEN
    RETURN NULL;
  END IF;
  IF TG_OP = 'UPDATE' AND NEW.username IS NOT DISTINCT FROM OLD.username
      AND NEW."displayName" IS NOT DISTINCT FROM OLD."displayName" THEN
    RETURN NULL;
  END IF;
  identity_id := CASE WHEN TG_OP = 'DELETE' THEN OLD.id ELSE NEW.id END;
  PERFORM pg_advisory_xact_lock(hashtextextended('public-search:' || identity_id, 0));
  INSERT INTO outbox_events (id, aggregate_type, aggregate_id, event_type, payload, status, created_at, updated_at)
  VALUES ('public-search:' || identity_id, 'User', identity_id, 'public_search.user.sync', '{}', 'PENDING', now(), now())
  ON CONFLICT (id) DO UPDATE SET status = 'PENDING', retry_count = 0, last_error = NULL, updated_at = now();
  RETURN NULL;
END;
$$;

CREATE TRIGGER user_public_identity_sync AFTER INSERT OR UPDATE OF username, "displayName" OR DELETE ON "User"
FOR EACH ROW EXECUTE FUNCTION enqueue_public_identity_sync();
