CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS yield_accrual_ledger (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    vault_id TEXT NOT NULL,
    accrual_date DATE NOT NULL,
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,
    rate_source TEXT NOT NULL,
    annual_rate NUMERIC(30, 18) NOT NULL,
    amount NUMERIC(30, 2) NOT NULL,
    status TEXT NOT NULL DEFAULT 'ACCRUED',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT yield_accrual_ledger_vault_date_key UNIQUE (vault_id, accrual_date),
    CONSTRAINT yield_accrual_ledger_amount_nonnegative CHECK (amount >= 0),
    CONSTRAINT yield_accrual_ledger_status CHECK (status IN ('ACCRUED', 'SETTLED', 'WITHDRAWABLE'))
);

CREATE INDEX IF NOT EXISTS idx_yield_accrual_ledger_vault_date
    ON yield_accrual_ledger (vault_id, accrual_date DESC);

COMMENT ON TABLE yield_accrual_ledger IS
    'Estimated yield accruals, separate from principal and on-chain settlement.';