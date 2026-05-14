-- ===========================================
-- Migration 010: Session reliability foundation
-- Canonical room naming + hold persistence + duration/settlement auditing
-- ===========================================

ALTER TABLE voice_sessions
    ADD COLUMN IF NOT EXISTS session_started_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS first_audio_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS session_ended_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS billable_duration_seconds INTEGER,
    ADD COLUMN IF NOT EXISTS duration_source VARCHAR(64),
    ADD COLUMN IF NOT EXISTS duration_anomaly BOOLEAN DEFAULT false,
    ADD COLUMN IF NOT EXISTS settlement_status VARCHAR(32) DEFAULT 'pending',
    ADD COLUMN IF NOT EXISTS settlement_attempts INTEGER DEFAULT 0,
    ADD COLUMN IF NOT EXISTS last_settlement_attempt_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS last_settlement_error TEXT;

-- Backfill session timeline fields from existing timestamps.
UPDATE voice_sessions
SET
    session_started_at = COALESCE(session_started_at, started_at),
    session_ended_at = COALESCE(session_ended_at, ended_at),
    billable_duration_seconds = COALESCE(billable_duration_seconds, billed_seconds)
WHERE TRUE;

-- Backfill hold_id from wallet_holds when missing.
WITH ranked_holds AS (
    SELECT
        h.session_id,
        h.id AS hold_id,
        ROW_NUMBER() OVER (
            PARTITION BY h.session_id
            ORDER BY h.created_at DESC
        ) AS rn
    FROM wallet_holds h
)
UPDATE voice_sessions s
SET hold_id = rh.hold_id
FROM ranked_holds rh
WHERE s.id = rh.session_id
  AND rh.rn = 1
  AND s.hold_id IS NULL;

-- Canonicalize room names for sessions not already canonical.
-- Migration-safe: this only rewrites deterministic rows to match session id.
UPDATE voice_sessions
SET livekit_room_name = 'leadmate-session-' || id::text
WHERE livekit_room_name NOT LIKE 'leadmate-session-%';

CREATE INDEX IF NOT EXISTS idx_voice_sessions_settlement_status
ON voice_sessions(settlement_status);

CREATE INDEX IF NOT EXISTS idx_voice_sessions_session_started_at
ON voice_sessions(session_started_at DESC);

CREATE INDEX IF NOT EXISTS idx_voice_sessions_billable_duration
ON voice_sessions(billable_duration_seconds);
