-- Add tracking columns for double-entry billing verification 
-- Agent reported duration vs LiveKit actual duration

ALTER TABLE voice_sessions 
    ADD COLUMN IF NOT EXISTS agent_reported_duration INTEGER,
    ADD COLUMN IF NOT EXISTS livekit_reported_duration INTEGER;
