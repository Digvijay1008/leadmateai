import { Router, Request, Response } from 'express';
import { authenticateAdmin } from '../../../../core/middleware/auth.js';
import { query } from '../../../../platform/db/client.js';

const router = Router();

/**
 * GET /v1/admin/tenants
 * List all tenants with wallet, calls, and spend stats
 */
router.get('/tenants', authenticateAdmin(), async (req: Request, res: Response) => {
    try {
        const { rows } = await query(`
            SELECT 
                t.id, 
                t.business_name, 
                t.status, 
                t.created_at, 
                COALESCE((SELECT balance FROM wallets WHERE tenant_id = t.id), 0) as wallet_balance, 
                (SELECT count(*) FROM voice_sessions WHERE tenant_id = t.id) as total_calls, 
                COALESCE((SELECT sum(amount) FROM wallet_transactions WHERE wallet_id = t.id AND type='usage_deduction'), 0) as total_spend 
            FROM tenants t
            ORDER BY t.created_at DESC;
        `);
        res.json({ tenants: rows });
    } catch (e: any) {
        console.error('[Admin] tenants error:', e);
        res.status(500).json({ error: e.message });
    }
});

/**
 * GET /v1/admin/system
 * View system observability
 */
router.get('/system', authenticateAdmin(), async (req: Request, res: Response) => {
    try {
        // Check queue backlog
        const queueRows = await query(`
            SELECT count(*) as count FROM campaign_calls WHERE status = 'pending'
        `);
        
        // Active processing worker tasks
        const activeWorkerRows = await query(`
            SELECT count(*) as count FROM campaign_calls WHERE status = 'processing'
        `);

        // Check active live voice sessions
        const activeSessionRows = await query(`
            SELECT count(*) as count FROM voice_sessions WHERE status = 'active'
        `);

        res.json({
            status: {
                livekit: 'operational',
                sip: 'operational',
                database: 'operational',
                worker: 'operational'
            },
            metrics: {
                queue_backlog: parseInt(queueRows.rows[0].count) || 0,
                active_workers_tasks: parseInt(activeWorkerRows.rows[0].count) || 0,
                active_livekit_sessions: parseInt(activeSessionRows.rows[0].count) || 0
            }
        });
    } catch (e: any) {
        console.error('[Admin] system error:', e);
        res.status(500).json({ error: e.message });
    }
});

/**
 * GET /v1/admin/usage
 * View platform wide usage metrics
 */
router.get('/usage', authenticateAdmin(), async (req: Request, res: Response) => {
    try {
        const result = await query(`
            SELECT 
                DATE(created_at) as date,
                COUNT(*) as calls_per_day,
                SUM(duration_seconds) / 60 as minutes_used,
                COUNT(*) FILTER(WHERE status = 'completed')::float / GREATEST(COUNT(*), 1) * 100 as success_rate
            FROM voice_sessions
            WHERE created_at >= NOW() - INTERVAL '30 days'
            GROUP BY DATE(created_at)
            ORDER BY DATE(created_at) ASC;
        `);
        res.json({ usage: result.rows });
    } catch (e: any) {
        console.error('[Admin] usage error:', e);
        res.status(500).json({ error: e.message });
    }
});

export default router;
