-- Ordinary published events have no replay consumer. Keep them terminal before
-- new writers start scrubbing payloads, including during mixed-version rollout.
-- Cassandra/search and unknown event types keep their existing state machines.
CREATE FUNCTION public.keep_ordinary_outbox_published_terminal()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF OLD.status = 'PUBLISHED'
     AND OLD.event_type IN ('COMMUNITY_CHANGED', 'POST_CREATED', 'MESSAGE_SENT', 'NOTIFICATION_CREATED')
     AND NEW.status IS DISTINCT FROM OLD.status THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER ordinary_outbox_published_terminal
BEFORE UPDATE ON public.outbox_events
FOR EACH ROW
EXECUTE FUNCTION public.keep_ordinary_outbox_published_terminal();
