/**
 * livekit.ts — Tenant-authenticated LiveKit token endpoint for the web widget.
 *
 * POST /api/v1/livekit/token
 * → Validates tenant JWT, starts a voice session, returns scoped LiveKit token.
 *
 * GET  /api/v1/livekit/settings
 * → Returns LiveKit configuration status (URL configured, not keys).
 */

import { Router, Request, Response } from 'express';
import { authenticateAgent } from '../../../../core/middleware/auth.js';
import { startSession } from '../../services/session.service.js';
import { config } from '../../../../core/index.js';

const router = Router();

// ─── POST /livekit/token ──────────────────────────────────────────────────────

/**
 * Fetches a tenant-scoped LiveKit token for the web widget.
 * Requires a valid tenant JWT (from localStorage via the dashboard auth flow).
 *
 * Response:
 *  {
 *    token: string           — LiveKit JWT for the room
 *    session_id: string      — voice session ID
 *    livekit_url: string     — wss://... LiveKit server URL
 *    livekit_token: string   — alias for token
 *  }
 */
router.post('/token', authenticateAgent(), async (req: Request, res: Response) => {
    const auth = (req as any).auth as { tenantId: string };

    if (!config.livekit.url || !config.livekit.apiKey) {
        return res.status(503).json({
            error: 'Voice service not configured. Please contact support.',
        });
    }

    try {
        const session = await startSession({
            tenant_id: auth.tenantId,
            visitor_metadata: {
                source: 'web_widget',
                browser: req.headers['user-agent'] ?? 'unknown',
                agent_id: req.body?.agent_id,
            },
        });

        return res.status(201).json({
            token: session.livekit_token,
            livekit_token: session.livekit_token,
            session_id: session.session_id,
            livekit_url: session.livekit_url,
        });
    } catch (err: any) {
        console.error('[LiveKit] Token generation error:', err);
        return res.status(500).json({
            error: err?.message || 'Failed to start voice session',
        });
    }
});

// ─── GET /livekit/settings ────────────────────────────────────────────────────

/**
 * Returns current LiveKit configuration status (public-safe — no keys).
 */
router.get('/settings', authenticateAgent(), (_req: Request, res: Response) => {
    res.json({
        configured: !!(config.livekit.apiKey && config.livekit.url),
        url: config.livekit.url || null,
        sip_domain: config.livekit.sipDomain || null,
    });
});

export default router;
