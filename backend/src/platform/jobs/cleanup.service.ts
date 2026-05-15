/**
 * Background Cleanup Service
 * 
 * Three cleanup jobs:
 * 1. cleanupStaleSessions — active sessions older than 2 hours
 * 2. cleanupExpiredHolds — wallet holds past their expiry
 * 3. cleanupPendingSessions — pending sessions older than 5 minutes
 */

import { query, queryMany } from '../db/client.js';
import { expireStaleHolds, settleHold, releaseHold } from '../../domain/crm/repositories/wallet.repository.js';
import { closeRoom, getRoomInfo } from '../services/livekit.service.js';
import { calculateBilledSeconds, calculateCost } from '../../shared/index.js';

interface StaleVoiceSession {
    id: string;
    tenant_id: string;
    livekit_room_name: string;
    status: string;
    created_at: Date;
    started_at: Date;
    hold_id: string | null;
    preset_snapshot: any;
}

// ===========================================
// JOB 1: Stale Active Sessions (every 5 min)
// ===========================================

export async function cleanupStaleSessions(): Promise<void> {
    console.log('[Jobs] Running cleanupStaleSessions...');
    try {
        const staleSessions = await queryMany<StaleVoiceSession>(
            `SELECT id, tenant_id, livekit_room_name, status, created_at, started_at, hold_id, preset_snapshot
             FROM voice_sessions
             WHERE status = 'active'
               AND started_at < NOW() - INTERVAL '2 hours'
             LIMIT 50`
        );

        if (staleSessions.length === 0) return;

        for (const session of staleSessions) {
            await cleanupStaleSession(session);
        }
    } catch (error) {
        console.error('[Jobs] cleanupStaleSessions failed:', error);
    }
}

async function cleanupStaleSession(session: StaleVoiceSession): Promise<void> {
    try {
        // Try to close LiveKit room
        try { await closeRoom(session.livekit_room_name); } catch (_) { /* room may not exist */ }

        // Calculate duration (capped at 900s = 15min to prevent insane charges)
        const startTime = session.started_at ? new Date(session.started_at).getTime() : new Date(session.created_at).getTime();
        const rawDuration = Math.floor((Date.now() - startTime) / 1000);
        const cappedDuration = Math.min(rawDuration, 900);

        // Calculate cost from preset snapshot
        const presetSnapshot = typeof session.preset_snapshot === 'string'
            ? JSON.parse(session.preset_snapshot)
            : session.preset_snapshot;
        const pricePerMin = parseFloat(presetSnapshot?.price_per_min ?? '0');
        const billedSeconds = calculateBilledSeconds(cappedDuration);
        const costTotal = calculateCost(billedSeconds, pricePerMin);

        // Settle hold if it exists
        let chargedAmount = 0;
        if (session.hold_id) {
            try {
                const result = await settleHold(session.hold_id, costTotal);
                chargedAmount = result.settled;
            } catch (e) {
                console.error(`[Jobs] Failed to settle hold ${session.hold_id}:`, e);
            }
        }

        // Update session to completed
        await query(
            `UPDATE voice_sessions
             SET status = 'completed',
                 end_reason = 'stale_cleanup',
                 ended_at = NOW(),
                 session_ended_at = COALESCE(session_ended_at, NOW()),
                 duration_seconds = $2,
                 billed_seconds = $3,
                 billable_duration_seconds = COALESCE($3, billable_duration_seconds),
                 cost_total = $4,
                 settlement_status = COALESCE(settlement_status, 'settled'),
                 updated_at = NOW()
             WHERE id = $1 AND status = 'active'`,
            [session.id, cappedDuration, billedSeconds, chargedAmount]
        );

        console.warn('[Jobs] WARNING: stale_session_cleaned', {
            session_id: session.id,
            tenant_id: session.tenant_id,
            duration_seconds: cappedDuration,
            amount_charged: chargedAmount,
        });
    } catch (error) {
        console.error(`[Jobs] Failed cleanup stale session ${session.id}:`, error);
    }
}

// ===========================================
// JOB 2: Expired Wallet Holds (every 10 min)
// ===========================================

export async function cleanupExpiredHolds(): Promise<void> {
    console.log('[Jobs] Running cleanupExpiredHolds...');
    try {
        const expiredHolds = await queryMany<{
            id: string; amount: string; tenant_id: string; session_id: string | null;
        }>(
            `SELECT wh.id, wh.amount, wh.wallet_id as tenant_id, wh.session_id
             FROM wallet_holds wh
             WHERE wh.status = 'active'
               AND wh.expires_at < NOW()
             LIMIT 50`
        );

        if (expiredHolds.length === 0) return;

        for (const hold of expiredHolds) {
            await cleanupExpiredHold(hold);
        }
    } catch (error) {
        console.error('[Jobs] cleanupExpiredHolds failed:', error);
    }
}

async function cleanupExpiredHold(hold: {
    id: string; amount: string; tenant_id: string; session_id: string | null;
}): Promise<void> {
    try {
        await releaseHold(hold.id);

        console.log('[Jobs] expired_hold_released', {
            hold_id: hold.id,
            tenant_id: hold.tenant_id,
            amount: hold.amount,
        });

        // If associated session is still active/pending, mark as timeout
        if (hold.session_id) {
        await query(
            `UPDATE voice_sessions
             SET status = 'timeout',
                 end_reason = 'hold_expired',
                 ended_at = NOW(),
                 session_ended_at = COALESCE(session_ended_at, NOW()),
                 settlement_status = COALESCE(settlement_status, 'released'),
                 updated_at = NOW()
                 WHERE id = $1 AND status IN ('active', 'pending')`,
            [hold.session_id]
        );
        }
    } catch (error) {
        console.error(`[Jobs] Failed to release expired hold ${hold.id}:`, error);
    }
}

// ===========================================
// JOB 3: Pending Sessions (every 10 min)
// ===========================================

export async function cleanupPendingSessions(): Promise<void> {
    console.log('[Jobs] Running cleanupPendingSessions...');
    try {
        const pendingSessions = await queryMany<{
            id: string; tenant_id: string; hold_id: string | null; livekit_room_name: string;
        }>(
            `SELECT id, tenant_id, hold_id, livekit_room_name
             FROM voice_sessions
             WHERE status = 'pending'
               AND created_at < NOW() - INTERVAL '5 minutes'
             LIMIT 50`
        );

        if (pendingSessions.length === 0) return;

        for (const session of pendingSessions) {
            await cleanupPendingSession(session);
        }
    } catch (error) {
        console.error('[Jobs] cleanupPendingSessions failed:', error);
    }
}

async function cleanupPendingSession(session: {
    id: string; tenant_id: string; hold_id: string | null; livekit_room_name: string;
}): Promise<void> {
    try {
        // Release hold without charging
        if (session.hold_id) {
            try {
                await releaseHold(session.hold_id);
            } catch (e) {
                console.error(`[Jobs] Failed to release hold ${session.hold_id}:`, e);
            }
        }

        // Close room if it exists
        try { await closeRoom(session.livekit_room_name); } catch (_) { /* ignore */ }

        // Mark session as cancelled
        await query(
            `UPDATE voice_sessions
             SET status = 'cancelled',
                 end_reason = 'agent_never_joined',
                 ended_at = NOW(),
                 session_ended_at = COALESCE(session_ended_at, NOW()),
                 settlement_status = COALESCE(settlement_status, 'released'),
                 updated_at = NOW()
             WHERE id = $1 AND status = 'pending'`,
            [session.id]
        );

        console.error('[Jobs] ERROR: session_never_activated', {
            session_id: session.id,
            tenant_id: session.tenant_id,
        });
    } catch (error) {
        console.error(`[Jobs] Failed cleanup pending session ${session.id}:`, error);
    }
}
