-- Migration: create discipline_score_snapshots
--
-- Stores point-in-time discipline score calculations together with a
-- transparent, per-factor breakdown, so both users and support/audit
-- tooling can see exactly how a score was derived.
--
-- Compliance note: this table is informational only. The discipline
-- score is not a credit score and must never be used, directly or
-- indirectly, to make automated lending, eligibility, or other adverse
-- decisions. No wallet keys or signing material are stored here or
-- anywhere in this module.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS discipline_score_snapshots (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     TEXT NOT NULL,
    score       SMALLINT NOT NULL,
    factors     JSONB NOT NULL,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT discipline_score_snapshots_score_bounds
        CHECK (score >= 0 AND score <= 100),
    CONSTRAINT discipline_score_snapshots_user_id_fkey
        FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
);

-- Every read/write in this module is scoped by user_id and ordered by
-- recency (latest snapshot lookup, history listing), so this is the
-- only index the access patterns above need.
CREATE INDEX IF NOT EXISTS idx_discipline_score_snapshots_user_created_at
    ON discipline_score_snapshots (user_id, created_at DESC);

COMMENT ON TABLE discipline_score_snapshots IS
    'Point-in-time discipline score snapshots with factor breakdown. Not a credit score; never used for automated lending/eligibility decisions.';
