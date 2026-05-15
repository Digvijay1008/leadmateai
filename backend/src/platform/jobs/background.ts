/**
 * Background Jobs
 * 
 * Periodic tasks for system maintenance:
 * - Expire stale wallet holds
 * - Clean up zombie sessions
 * - Send low balance alerts
 */

import { query, queryMany } from '../db/client.js';
import { expireStaleHolds } from '../../domain/crm/repositories/wallet.repository.js';
import { config } from '../../core/index.js';
import { closeRoom } from '../services/livekit.service.js';
import { processCampaignCallsJob } from './campaign-worker.js';

interface StaleSession {
    id: string;
    tenant_id: string;
    livekit_room_name: string;
    status: string;
    created_at: Date;
    hold_id: string | null;
}

/**
 * Cleanup stale/zombie sessions.
 * 
 * A session is stale if:
 * - Status is 'pending' and created > 5 minutes ago
 * - Status is 'active' and created > max_duration + buffer ago
 */
export async function cleanupStaleSessions(): Promise<{
    processedCount: number;
    errorCount: number;
}> {
    console.log('[Jobs] Starting stale session cleanup...');

    let processedCount = 0;
    let errorCount = 0;

    try {
        // Find pending sessions older than 5 minutes
        const pendingSessions = await queryMany<StaleSession>(
            `SELECT id, tenant_id, livekit_room_name, status, created_at, hold_id
             FROM voice_sessions
             WHERE status = 'pending'
               AND created_at < NOW() - INTERVAL '5 minutes'
             LIMIT 50`
        );

        for (const session of pendingSessions) {
            try {
                await cleanupSession(session, 'pending_timeout');
                processedCount++;
            } catch (error) {
                console.error(`[Jobs] Failed to cleanup pending session ${session.id}:`, error);
                errorCount++;
            }
        }

        // Find active sessions that exceeded max duration + 30 min buffer
        // (These are true zombies - agent crashed without reporting)
        const zombieSessions = await queryMany<StaleSession>(
            `SELECT id, tenant_id, livekit_room_name, status, created_at, hold_id
             FROM voice_sessions
             WHERE status = 'active'
               AND created_at < NOW() - INTERVAL '45 minutes'
             LIMIT 50`
        );

        for (const session of zombieSessions) {
            try {
                await cleanupSession(session, 'zombie_cleanup');
                processedCount++;
            } catch (error) {
                console.error(`[Jobs] Failed to cleanup zombie session ${session.id}:`, error);
                errorCount++;
            }
        }

        console.log(`[Jobs] Stale session cleanup complete. Processed: ${processedCount}, Errors: ${errorCount}`);

    } catch (error) {
        console.error('[Jobs] Stale session cleanup failed:', error);
    }

    return { processedCount, errorCount };
}

/**
 * Cleanup a single stale session.
 */
async function cleanupSession(session: StaleSession, reason: string): Promise<void> {
    console.log(`[Jobs] Cleaning up ${reason} session: ${session.id}`);

    // 1. Try to close the LiveKit room
    try {
        await closeRoom(session.livekit_room_name);
    } catch (error) {
        // Ignore - room might already be closed
    }

    // 2. Release the hold if exists (don't settle - we don't know real duration)
    if (session.hold_id) {
        try {
            await query(
                `UPDATE wallet_holds 
                 SET status = 'released', settled_at = NOW()
                 WHERE id = $1 AND status = 'active'`,
                [session.hold_id]
            );
        } catch (error) {
            console.error(`[Jobs] Failed to release hold ${session.hold_id}:`, error);
        }
    }

    // 3. Mark session as failed
    await query(
        `UPDATE voice_sessions 
         SET status = 'failed', 
             ended_at = NOW(), 
             session_ended_at = COALESCE(session_ended_at, NOW()),
             end_reason = $2,
             settlement_status = COALESCE(settlement_status, 'released'),
             updated_at = NOW()
         WHERE id = $1 AND status IN ('pending', 'active')`,
        [session.id, reason]
    );
}

/**
 * Expire stale wallet holds.
 * 
 * Holds that haven't been settled/released within expiration time
 * are automatically released to free up balance.
 */
export async function runHoldExpirationJob(): Promise<number> {
    console.log('[Jobs] Running hold expiration...');

    try {
        const expiredCount = await expireStaleHolds();
        console.log(`[Jobs] Expired ${expiredCount} stale holds`);
        return expiredCount;
    } catch (error) {
        console.error('[Jobs] Hold expiration failed:', error);
        return 0;
    }
}

/**
 * Start all background jobs.
 * 
 * In production, this would be triggered by:
 * - A cron service (e.g., node-cron)
 * - External scheduler (AWS CloudWatch Events, etc.)
 * - Separate worker process
 */
export function startBackgroundJobs(intervalMinutes: number = 5): NodeJS.Timeout {
    console.log(`[Jobs] Starting background jobs (interval: ${intervalMinutes} min)`);

    // Run immediately
    runAllJobs();

    // Then run periodically
    return setInterval(
        runAllJobs,
        intervalMinutes * 60 * 1000
    );
}

async function runAllJobs(): Promise<void> {
    try {
        await cleanupStaleSessions();
        await runHoldExpirationJob();
        await processCampaignCallsJob();
    } catch (error) {
        console.error('[Jobs] Background job error:', error);
    }
}

export function stopBackgroundJobs(intervalId: NodeJS.Timeout): void {
    clearInterval(intervalId);
    console.log('[Jobs] Background jobs stopped');
}
