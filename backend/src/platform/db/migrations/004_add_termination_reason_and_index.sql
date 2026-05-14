ALTER TABLE voice_sessions 
ADD COLUMN IF NOT EXISTS termination_reason VARCHAR(50);

-- Index for webhook recovery queries
CREATE INDEX IF NOT EXISTS idx_voice_sessions_livekit_room_active 
ON voice_sessions(livekit_room_name) 
WHERE status IN ('active', 'pending');
