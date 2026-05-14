-- ===========================================
-- Migration 011: Durable webhook queue + shared idempotency store
-- ===========================================

CREATE TABLE IF NOT EXISTS webhook_idempotency_keys (
    event_key TEXT PRIMARY KEY,
    first_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_webhook_idempotency_expiry
ON webhook_idempotency_keys(expires_at);

CREATE TABLE IF NOT EXISTS webhook_tasks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_key TEXT NOT NULL UNIQUE,
    task_type VARCHAR(32) NOT NULL
        CHECK (task_type IN ('livekit_event', 'plivo_status')),
    payload JSONB NOT NULL,
    status VARCHAR(16) NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
    attempts INTEGER NOT NULL DEFAULT 0,
    max_attempts INTEGER NOT NULL DEFAULT 5,
    next_attempt_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    locked_at TIMESTAMPTZ,
    locked_by VARCHAR(128),
    last_error TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_webhook_tasks_pending
ON webhook_tasks(status, next_attempt_at, created_at)
WHERE status = 'pending';

CREATE INDEX IF NOT EXISTS idx_webhook_tasks_created
ON webhook_tasks(created_at DESC);
