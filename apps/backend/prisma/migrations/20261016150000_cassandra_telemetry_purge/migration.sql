-- Expand only: retain the PostgreSQL telemetry table throughout migration/rollback.
-- Capture every deletion path, including foreign-key cascades, in the existing durable outbox.
CREATE FUNCTION enqueue_cassandra_telemetry_purge() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  -- This durable marker is created with the first write intent, never by a default PG-only deployment.
  IF NOT EXISTS (SELECT 1 FROM outbox_events WHERE id = 'cassandra-telemetry-activated') THEN
    RETURN OLD;
  END IF;
  INSERT INTO outbox_events (
    id, aggregate_type, aggregate_id, event_type, payload, status, retry_count, created_at, updated_at
  ) VALUES (
    gen_random_uuid()::text,
    CASE WHEN TG_TABLE_NAME = 'User' THEN 'USER' ELSE 'CALL' END,
    OLD.id,
    CASE WHEN TG_TABLE_NAME = 'User' THEN 'CALL_TELEMETRY_PURGE_USER' ELSE 'CALL_TELEMETRY_PURGE_CALL' END,
    '{}'::jsonb, 'PENDING', 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
  );
  RETURN OLD;
END;
$$;

CREATE TRIGGER cassandra_telemetry_user_deleted
AFTER DELETE ON "User"
FOR EACH ROW EXECUTE FUNCTION enqueue_cassandra_telemetry_purge();

CREATE TRIGGER cassandra_telemetry_call_deleted
AFTER DELETE ON calls
FOR EACH ROW EXECUTE FUNCTION enqueue_cassandra_telemetry_purge();
