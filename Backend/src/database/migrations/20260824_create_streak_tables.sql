-- Migration: create streak tables
--
-- Stores per-user savings streak state, daily qualifying activity, and
-- freeze usage. Only confirmed deposits (with on-chain reconciliation)
-- extend a streak. The daily evaluation job is idempotent and safe to
-- re-run.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- One row per user: current and longest streak counts plus the most
-- recent activity and streak dates.
CREATE TABLE IF NOT EXISTS user_streak_states (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id             TEXT NOT NULL UNIQUE,
    current_streak      INTEGER NOT NULL DEFAULT 0,
    longest_streak      INTEGER NOT NULL DEFAULT 0,
    last_activity_date  DATE,
    last_streak_date    DATE,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT user_streak_states_current_bounds
        CHECK (current_streak >= 0),
    CONSTRAINT user_streak_states_longest_bounds
        CHECK (longest_streak >= 0 AND longest_streak >= current_streak),
    CONSTRAINT user_streak_states_user_id_fkey
        FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_user_streak_states_user_id
    ON user_streak_states (user_id);

-- One row per qualifying day per user, keyed on the unique deposit id
-- so the same confirmed deposit can never be counted twice.
CREATE TABLE IF NOT EXISTS streak_daily_activities (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id      TEXT NOT NULL,
    activity_date DATE NOT NULL,
    deposit_id   TEXT NOT NULL UNIQUE,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT streak_daily_activities_user_date_key
        UNIQUE (user_id, activity_date),
    CONSTRAINT streak_daily_activities_user_id_fkey
        FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_streak_daily_activities_user_date
    ON streak_daily_activities (user_id, activity_date DESC);

-- Freeze records: preserve a streak through one missed day during the
-- freeze window. A freeze is only effective once approved.
CREATE TABLE IF NOT EXISTS user_streak_freezes (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id           TEXT NOT NULL,
    freeze_start_date DATE NOT NULL,
    freeze_end_date   DATE NOT NULL,
    is_used           BOOLEAN NOT NULL DEFAULT FALSE,
    approved_at       TIMESTAMPTZ,
    used_at           TIMESTAMPTZ,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT user_streak_freezes_user_id_fkey
        FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
    CONSTRAINT user_streak_freezes_date_order
        CHECK (freeze_end_date >= freeze_start_date)
);

CREATE INDEX IF NOT EXISTS idx_user_streak_freezes_user_id
    ON user_streak_freezes (user_id, freeze_start_date, freeze_end_date);

COMMENT ON TABLE user_streak_states IS
    'Per-user savings streak state: current and longest streak, last activity/streak dates.';

COMMENT ON TABLE streak_daily_activities IS
    'One row per qualifying calendar day per user. Keyed by deposit id to guarantee idempotency.';

COMMENT ON TABLE user_streak_freezes IS
    'Streak freeze records. A freeze must be approved to be eligible and can preserve one missed day.';
