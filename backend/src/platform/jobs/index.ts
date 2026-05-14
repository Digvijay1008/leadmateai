/**
 * Background Job Orchestrator
 */

import { 
    cleanupStaleSessions, 
    cleanupExpiredHolds, 
    cleanupPendingSessions 
} from './cleanup.service.js';

export function startBackgroundJobs(): NodeJS.Timeout {
    console.log('[Jobs] Starting background jobs orchestrator...');

    // Run immediately on boot
    runAllJobs().catch(e => console.error('[Jobs] Initial startup cleanup failed:', e));

    // Schedule: 
    // - Stale sessions every 5 minutes
    // - Expired holds and pending sessions every 10 minutes
    // (We'll run all three on a 5-minute tick for simplicity, as per instructions)
    return setInterval(
        runAllJobs,
        5 * 60 * 1000
    );
}

async function runAllJobs(): Promise<void> {
    try {
        await cleanupStaleSessions();
        await cleanupExpiredHolds();
        await cleanupPendingSessions();
    } catch (error) {
        console.error('[Jobs] Background job loop error:', error);
    }
}

export function stopBackgroundJobs(intervalId: NodeJS.Timeout): void {
    clearInterval(intervalId);
    console.log('[Jobs] Background jobs stopped');
}
