import { query, queryOne } from '../../../platform/index.js';

export interface FinishedRoomSessionRow {
    id: string;
    tenant_id: string;
    status: string;
    hold_id: string | null;
    agent_reported_duration: number | null;
    preset_snapshot: any;
    started_at: string | Date | null;
    session_started_at: string | Date | null;
    first_audio_at: string | Date | null;
    ended_at: string | Date | null;
    session_ended_at: string | Date | null;
}

export async function findSessionForRoomFinished(
    roomName: string,
    fallbackSessionId: string | null
): Promise<FinishedRoomSessionRow | null> {
    return queryOne<FinishedRoomSessionRow>(
        `SELECT id, tenant_id, status, hold_id,
                agent_reported_duration, preset_snapshot,
                started_at, session_started_at, first_audio_at,
                ended_at, session_ended_at
         FROM voice_sessions
         WHERE livekit_room_name = $1
            OR ($2::uuid IS NOT NULL AND id = $2::uuid)
         ORDER BY
            CASE WHEN livekit_room_name = $1 THEN 0 ELSE 1 END
         LIMIT 1`,
        [roomName, fallbackSessionId]
    );
}

export async function persistWebhookDurationAudit(params: {
    sessionId: string;
    durationSeconds: number;
    durationSource: string;
    durationAnomaly: boolean;
}): Promise<void> {
    await query(
        `UPDATE voice_sessions
         SET livekit_reported_duration = COALESCE(livekit_reported_duration, $1),
             billable_duration_seconds = COALESCE(billable_duration_seconds, $1),
             session_ended_at = COALESCE(session_ended_at, NOW()),
             duration_source = COALESCE(duration_source, $3),
             duration_anomaly = COALESCE(duration_anomaly, $4)
         WHERE id = $2`,
        [params.durationSeconds, params.sessionId, params.durationSource, params.durationAnomaly]
    );
}

export async function markRecoveredSessionCompleted(
    sessionId: string,
    durationSeconds: number
): Promise<void> {
    await query(
        `UPDATE voice_sessions
         SET status = 'completed',
             ended_at = NOW(),
             session_ended_at = COALESCE(session_ended_at, NOW()),
             termination_reason = 'livekit_webhook_recovery',
             duration_seconds = $1,
             billable_duration_seconds = COALESCE(billable_duration_seconds, $1)
         WHERE id = $2`,
        [durationSeconds, sessionId]
    );
}

export async function markPendingSessionCancelled(sessionId: string): Promise<void> {
    await query(
        `UPDATE voice_sessions
         SET status = 'cancelled',
             ended_at = NOW(),
             session_ended_at = COALESCE(session_ended_at, NOW()),
             termination_reason = 'agent_never_joined'
         WHERE id = $1`,
        [sessionId]
    );
}

export async function updateSessionStatus(sessionId: string, status: string): Promise<void> {
    await query(
        `UPDATE voice_sessions
         SET status = $2
         WHERE id = $1`,
        [sessionId, status]
    );
}
