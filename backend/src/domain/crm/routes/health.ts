import { Router, Request, Response } from 'express';
import { checkDatabaseConnection } from '../../../platform/index.js';
import { config } from '../../../core/index.js';

const router = Router();

// ===========================================
// ROUTES
// ===========================================

/**
 * GET /health
 * Basic health check
 */
router.get('/', async (req: Request, res: Response) => {
    res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        version: '1.0.0',
    });
});

/**
 * GET /health/detailed
 * Detailed health check including dependencies
 */
router.get('/detailed', async (req: Request, res: Response) => {
    const checks: Record<string, { status: string; latency_ms?: number }> = {};

    // Check database
    const dbStart = Date.now();
    try {
        const dbOk = await checkDatabaseConnection();
        checks.database = {
            status: dbOk ? 'ok' : 'error',
            latency_ms: Date.now() - dbStart,
        };
    } catch (error) {
        checks.database = {
            status: 'error',
            latency_ms: Date.now() - dbStart,
        };
    }

    // Check LiveKit (if configured)
    checks.livekit = {
        status: config.livekit.apiKey ? 'configured' : 'not_configured',
    };

    // Check OpenAI (if configured)
    checks.openai = {
        status: config.openai.apiKey ? 'configured' : 'not_configured',
    };

    const allOk = Object.values(checks).every(
        c => c.status === 'ok' || c.status === 'configured'
    );

    res.status(allOk ? 200 : 503).json({
        status: allOk ? 'healthy' : 'degraded',
        timestamp: new Date().toISOString(),
        version: '1.0.0',
        environment: config.server.nodeEnv,
        checks,
    });
});

export default router;
