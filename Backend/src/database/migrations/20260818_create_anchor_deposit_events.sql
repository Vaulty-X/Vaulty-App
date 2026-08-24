CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS anchor_deposit_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id TEXT NOT NULL UNIQUE,
    idempotency_key TEXT NOT NULL UNIQUE,
    deposit_id TEXT NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('initiated', 'ngn_received', 'conversion', 'stellar_settlement', 'failed', 'reversed')),
    sequence INTEGER NOT NULL CHECK (sequence >= 0),
    occurred_at TIMESTAMPTZ NOT NULL,
    payload JSONB NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_anchor_deposit_events_deposit_sequence
    ON anchor_deposit_events (deposit_id, sequence DESC);

CREATE OR REPLACE FUNCTION record_anchor_deposit_event(
    p_event_id TEXT, p_idempotency_key TEXT, p_deposit_id TEXT, p_status TEXT,
    p_sequence INTEGER, p_occurred_at TIMESTAMPTZ, p_payload JSONB
) RETURNS TEXT LANGUAGE plpgsql AS $$
DECLARE latest_sequence INTEGER;
BEGIN
    PERFORM pg_advisory_xact_lock(hashtext(p_deposit_id));
    IF EXISTS (SELECT 1 FROM anchor_deposit_events WHERE idempotency_key = p_idempotency_key OR event_id = p_event_id) THEN
        RETURN 'duplicate';
    END IF;
    SELECT sequence INTO latest_sequence FROM anchor_deposit_events
      WHERE deposit_id = p_deposit_id ORDER BY sequence DESC LIMIT 1;
    IF latest_sequence IS NOT NULL AND p_sequence <= latest_sequence THEN
        RETURN 'out_of_order';
    END IF;
    INSERT INTO anchor_deposit_events(event_id, idempotency_key, deposit_id, status, sequence, occurred_at, payload)
      VALUES (p_event_id, p_idempotency_key, p_deposit_id, p_status, p_sequence, p_occurred_at, p_payload);
    RETURN 'created';
END;
$$;