import {
    query,
    queryOne,
    queryMany,
    withTransaction,
    txQuery,
    txQueryOne
} from '../../../platform/index.js';
import { generateId, generateCanonicalRoomName } from '../../../shared/index.js';
import type {
    VoiceSession,
    VoiceSessionStatus,
    PresetSnapshot,
    VoiceConfigSnapshot
} from '../../../shared/index.js';
import { isTerminalStatus } from '../../../shared/index.js';

// ===========================================
// SESSION REPOSITORY
// ===========================================

/**
 * Create a new voice session
 */
export async function createSession(params: {
    tenantId: string;
    presetSnapshot: PresetSnapshot;
    voiceConfigSnapshot: VoiceConfigSnapshot;
    maxDurationSeconds: number;
    holdId: string | null;
    visitorMetadata?: Record<string, any>;
    phoneNumber?: string;
    direction?: 'inbound' | 'outbound';
    leadId?: string;
}): Promise<VoiceSession> {
    const sessionId = generateId();
    const roomName = generateCanonicalRoomName(sessionId);

    const result = await queryOne<VoiceSession>(
        `INSERT INTO voice_sessions (
      id,
      tenant_id,
      livekit_room_name,
      preset_snapshot,
      voice_config_snapshot,
      status,
      max_duration_seconds,
      hold_id,
      visitor_metadata,
      phone_number,
      direction,
      lead_id
    ) VALUES ($1, $2, $3, $4, $5, 'pending', $6, $7, $8, $9, $10, $11)
    RETURNING *`,
        [
            sessionId,
            params.tenantId,
            roomName,
            JSON.stringify(params.presetSnapshot),
            JSON.stringify(params.voiceConfigSnapshot),
            params.maxDurationSeconds,
            params.holdId,
            params.visitorMetadata ? JSON.stringify(params.visitorMetadata) : null,
            params.phoneNumber ?? null,
            params.direction ?? null,
            params.leadId ?? null,
        ]
    );

    return result!;
}

/**
 * Persist hold_id after hold creation.
 * Safe no-op when session is already terminal.
 */
export async function attachSessionHold(
    sessionId: string,
    holdId: string
): Promise<void> {
    await query(
        `UPDATE voice_sessions
         SET hold_id = $2, updated_at = NOW()
         WHERE id = $1
           AND status IN ('pending', 'active')`,
        [sessionId, holdId]
    );
}

/**
 * Get session by ID
 */
export async function getSessionById(sessionId: string): Promise<VoiceSession | null> {
    return queryOne<VoiceSession>(
        `SELECT * FROM voice_sessions WHERE id = $1`,
        [sessionId]
    );
}

/**
 * Get session by room name
 */
export async function getSessionByRoomName(roomName: string): Promise<VoiceSession | null> {
    return queryOne<VoiceSession>(
        `SELECT * FROM voice_sessions WHERE livekit_room_name = $1`,
        [roomName]
    );
}

/**
 * Get session with tenant validation
 */
export async function getSessionForTenant(
    sessionId: string,
    tenantId: string
): Promise<VoiceSession | null> {
    return queryOne<VoiceSession>(
        `SELECT * FROM voice_sessions WHERE id = $1 AND tenant_id = $2`,
        [sessionId, tenantId]
    );
}

/**
 * Mark session as active (user joined)
 */
export async function activateSession(sessionId: string): Promise<void> {
    await query(
        `UPDATE voice_sessions 
     SET status = 'active',
         started_at = COALESCE(started_at, NOW()),
         session_started_at = COALESCE(session_started_at, NOW()),
         first_audio_at = COALESCE(first_audio_at, NOW()),
         updated_at = NOW()
     WHERE id = $1 AND status = 'pending'`,
        [sessionId]
    );
}

/**
 * End a session with final metrics
 */
export async function endSession(params: {
    sessionId: string;
    status: VoiceSessionStatus;
    durationSeconds: number;
    billedSeconds: number;
    costTotal: number;
    endReason?: string;
    transcriptSummary?: string;
    transcript?: any[];
    toolCallsCount?: number;
    userTurnsCount?: number;
    agentTurnsCount?: number;
}): Promise<VoiceSession> {
    const result = await queryOne<VoiceSession>(
        `UPDATE voice_sessions SET
      status = $2,
      ended_at = NOW(),
      session_ended_at = COALESCE(session_ended_at, NOW()),
      duration_seconds = $3,
      billed_seconds = $4,
      billable_duration_seconds = COALESCE($4, billable_duration_seconds),
      cost_total = $5,
      end_reason = $6,
      transcript_summary = $7,
      transcript = COALESCE($11, transcript),
      tool_calls_count = COALESCE($8, tool_calls_count),
      user_turns_count = COALESCE($9, user_turns_count),
      agent_turns_count = COALESCE($10, agent_turns_count),
      updated_at = NOW()
     WHERE id = $1
     RETURNING *`,
        [
            params.sessionId,
            params.status,
            params.durationSeconds,
            params.billedSeconds,
            params.costTotal,
            params.endReason ?? null,
            params.transcriptSummary ?? null,
            params.toolCallsCount ?? null,
            params.userTurnsCount ?? null,
            params.agentTurnsCount ?? null,
            params.transcript ? JSON.stringify(params.transcript) : null,
        ]
    );

    return result!;
}

/**
 * End a session and settle billing in a single transaction
 * Rollback all on failure
 */
export async function endSessionWithBilling(params: {
    sessionId: string;
    tenantId: string;
    status: VoiceSessionStatus;
    durationSeconds: number;
    billedSeconds: number;
    costTotal: number;
    endReason?: string;
    transcriptSummary?: string;
    transcript?: any[];
    toolCallsCount?: number;
    userTurnsCount?: number;
    agentTurnsCount?: number;
}): Promise<{ session: VoiceSession; walletBalanceAfter: number }> {
    return withTransaction(async (client) => {
        // 1. Lock the session
        const session = await txQueryOne<VoiceSession>(
            client,
            `SELECT * FROM voice_sessions WHERE id = $1 FOR UPDATE`,
            [params.sessionId]
        );

        if (!session) throw new Error(`Session not found: ${params.sessionId}`);

        // Critical money-safety guard:
        // if another concurrent path already finalized this session, short-circuit.
        if (isTerminalStatus(session.status)) {
            const wallet = await txQueryOne<{ balance: string }>(
                client,
                `SELECT balance FROM wallets WHERE tenant_id = $1`,
                [params.tenantId]
            );
            return {
                session,
                walletBalanceAfter: parseFloat(wallet?.balance ?? '0'),
            };
        }

        await txQuery(
            client,
            `UPDATE voice_sessions
             SET settlement_attempts = COALESCE(settlement_attempts, 0) + 1,
                 last_settlement_attempt_at = NOW()
             WHERE id = $1`,
            [params.sessionId]
        );

        let newBalance = 0;

        // 2. Fetch and lock wallet
        const wallet = await txQueryOne<any>(
            client,
            `SELECT * FROM wallets WHERE tenant_id = $1 FOR UPDATE`,
            [params.tenantId]
        );
        if (!wallet) throw new Error(`Wallet not found for tenant: ${params.tenantId}`);
        newBalance = parseFloat(wallet.balance) || 0;

        // 3. Process hold if it's active
        const hold = await txQueryOne<any>(
            client,
            `SELECT * FROM wallet_holds WHERE session_id = $1 AND status = 'active' FOR UPDATE`,
            [params.sessionId]
        );

        if (hold && params.costTotal > 0) {
            const holdAmount = parseFloat(hold.amount);
            const settled = Math.min(params.costTotal, holdAmount);
            const released = holdAmount - settled;

            newBalance = parseFloat(wallet.balance) - settled;

            // UPDATE wallets
            await txQuery(
                client,
                `UPDATE wallets SET balance = $1, updated_at = NOW() WHERE tenant_id = $2`,
                [newBalance, params.tenantId]
            );

            // UPDATE wallet_holds
            await txQuery(
                client,
                `UPDATE wallet_holds SET status = 'settled', settled_amount = $1, settled_at = NOW() WHERE id = $2`,
                [settled, hold.id]
            );

            // INSERT wallet_transactions
            await txQuery(
                client,
                `INSERT INTO wallet_transactions (wallet_id, type, amount, balance_after, reference_type, reference_id, description) 
                 VALUES ($1, 'usage_deduction', $2, $3, 'session', $4, $5)`,
                [params.tenantId, -settled, newBalance, params.sessionId, `Session usage deduction`]
            );

            // If released > 0
            if (released > 0) {
                await txQuery(
                    client,
                    `INSERT INTO wallet_transactions (wallet_id, type, amount, balance_after, reference_type, reference_id, description) 
                     VALUES ($1, 'hold_released', $2, $3, 'hold', $4, $5)`,
                    [params.tenantId, released, newBalance, hold.id, `Unused hold released`]
                );
            }
        }

        const settlementStatus =
            hold && params.costTotal > 0 ? 'settled'
                : hold ? 'released'
                    : 'no_active_hold';

        // 4. Update the session
        const updatedSession = await txQueryOne<VoiceSession>(
            client,
            `UPDATE voice_sessions SET
              status = $2,
              ended_at = NOW(),
              duration_seconds = $3,
              billed_seconds = $4,
              cost_total = $5,
              end_reason = $6,
              transcript_summary = $7,
              transcript = COALESCE($11, transcript),
              tool_calls_count = COALESCE($8, tool_calls_count),
              user_turns_count = COALESCE($9, user_turns_count),
              agent_turns_count = COALESCE($10, agent_turns_count),
              session_ended_at = COALESCE(session_ended_at, NOW()),
              billable_duration_seconds = COALESCE($4, billable_duration_seconds),
              settlement_status = $12,
              last_settlement_error = NULL,
              updated_at = NOW()
             WHERE id = $1
             RETURNING *`,
            [
                params.sessionId,
                params.status,
                params.durationSeconds,
                params.billedSeconds,
                params.costTotal,
                params.endReason ?? null,
                params.transcriptSummary ?? null,
                params.toolCallsCount ?? null,
                params.userTurnsCount ?? null,
                params.agentTurnsCount ?? null,
                params.transcript ? JSON.stringify(params.transcript) : null,
                settlementStatus,
            ]
        );

        return { session: updatedSession!, walletBalanceAfter: newBalance };
    });
}

/**
 * Cancel a pending session
 */
export async function cancelSession(sessionId: string): Promise<void> {
    await query(
        `UPDATE voice_sessions 
     SET status = 'cancelled', ended_at = NOW(), updated_at = NOW()
     WHERE id = $1 AND status = 'pending'`,
        [sessionId]
    );
}

/**
 * Get active sessions for a tenant
 */
export async function getActiveSessionsForTenant(
    tenantId: string
): Promise<VoiceSession[]> {
    return queryMany<VoiceSession>(
        `SELECT * FROM voice_sessions 
     WHERE tenant_id = $1 AND status IN ('pending', 'active')
     ORDER BY created_at DESC`,
        [tenantId]
    );
}

/**
 * Get sessions for a tenant with pagination
 */
export async function getSessionsForTenant(
    tenantId: string,
    options: {
        limit?: number;
        offset?: number;
        status?: VoiceSessionStatus;
        period?: '7days' | '30days' | '90days' | 'all';
        direction?: 'inbound' | 'outbound' | 'all';
    } = {}
): Promise<{ sessions: VoiceSession[]; total: number }> {
    const { limit = 50, offset = 0, status, period, direction } = options;

    let whereClause = 'tenant_id = $1';
    const filters: any[] = [tenantId];

    if (status) {
        filters.push(status);
        whereClause += ` AND status = $${filters.length}`;
    }

    if (direction && direction !== 'all') {
        filters.push(direction);
        whereClause += ` AND direction = $${filters.length}`;
    }

    if (period && period !== 'all') {
        const days = period === '90days' ? 90 : period === '30days' ? 30 : 7;
        whereClause += ` AND created_at >= NOW() - INTERVAL '${days} days'`;
    }

    const listParams = [...filters, limit, offset];
    const limitParam = filters.length + 1;
    const offsetParam = filters.length + 2;

    const [sessions, countResult] = await Promise.all([
        queryMany<VoiceSession>(
            `SELECT * FROM voice_sessions 
       WHERE ${whereClause}
       ORDER BY created_at DESC
       LIMIT $${limitParam} OFFSET $${offsetParam}`,
            listParams
        ),
        queryOne<{ count: string }>(
            `SELECT COUNT(*) as count FROM voice_sessions WHERE ${whereClause}`,
            filters
        ),
    ]);

    return {
        sessions,
        total: parseInt(countResult?.count ?? '0', 10),
    };
}

/**
 * Find stale sessions that need cleanup
 * Sessions that are 'pending' or 'active' for too long
 */
export async function findStaleSessions(
    maxAgeMinutes: number = 120
): Promise<VoiceSession[]> {
    return queryMany<VoiceSession>(
        `SELECT * FROM voice_sessions
     WHERE status IN ('pending', 'active')
     AND created_at < NOW() - INTERVAL '1 minute' * $1`,
        [maxAgeMinutes]
    );
}

/**
 * Get session usage statistics for a tenant
 */
export async function getSessionStats(
    tenantId: string,
    startDate?: Date,
    endDate?: Date
): Promise<{
    totalSessions: number;
    completedSessions: number;
    totalDurationSeconds: number;
    totalCost: number;
    avgDurationSeconds: number;
}> {
    let whereClause = 'tenant_id = $1';
    const params: any[] = [tenantId];

    if (startDate) {
        params.push(startDate.toISOString());
        whereClause += ` AND created_at >= $${params.length}`;
    }

    if (endDate) {
        params.push(endDate.toISOString());
        whereClause += ` AND created_at <= $${params.length}`;
    }

    const result = await queryOne<{
        total_sessions: string;
        completed_sessions: string;
        total_duration: string;
        total_cost: string;
        avg_duration: string;
    }>(
        `SELECT 
      COUNT(*) as total_sessions,
      COUNT(*) FILTER (WHERE status = 'completed') as completed_sessions,
      COALESCE(SUM(duration_seconds), 0) as total_duration,
      COALESCE(SUM(cost_total), 0) as total_cost,
      COALESCE(AVG(duration_seconds), 0) as avg_duration
     FROM voice_sessions
     WHERE ${whereClause}`,
        params
    );

    return {
        totalSessions: parseInt(result?.total_sessions ?? '0', 10),
        completedSessions: parseInt(result?.completed_sessions ?? '0', 10),
        totalDurationSeconds: parseInt(result?.total_duration ?? '0', 10),
        totalCost: parseFloat(result?.total_cost ?? '0'),
        avgDurationSeconds: parseFloat(result?.avg_duration ?? '0'),
    };
}
