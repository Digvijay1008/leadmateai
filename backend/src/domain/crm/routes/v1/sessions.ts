import { Router, Request, Response } from 'express';
import { z } from 'zod';
import {
    startSession,
    endVoiceSession,
    cancelPendingSession,
    buildAgentManifest,
    markSessionActive
} from '../../services/session.service.js';
import { getSessionsForTenant, getSessionForTenant } from '../../repositories/session.repository.js';
import {
    validateWidgetTenant,
    authenticateAgent,
    authenticateUser,
    type AuthenticatedRequest,
} from '../../../../core/middleware/auth.js';
import { ValidationError } from '../../../../shared/index.js';
import { sessionRateLimit } from '../../../../core/middleware/rate-limit.js';
import { normalizeEndSessionRequest } from '../../services/session-end.contract.js';
import { requireAgentSessionScope } from '../../../../core/middleware/agent-session-scope.js';

const router = Router();

/**
 * Helper to extract string param (Express 5 can return string | string[])
 */
function getStringParam(param: string | string[] | undefined): string | undefined {
    if (Array.isArray(param)) return param[0];
    return param;
}

// ===========================================
// REQUEST SCHEMAS
// ===========================================

const startSessionSchema = z.object({
    tenant_id: z.string().uuid(),
    session_id: z.string().uuid().optional(),
    phone_number: z.string().optional(),
    direction: z.enum(['inbound', 'outbound']).optional(),
    lead_id: z.string().uuid().optional(),
    visitor_metadata: z.object({
        browser: z.string().optional(),
        os: z.string().optional(),
        ip: z.string().optional(),
        referrer: z.string().optional(),
    }).passthrough().optional(),
});

// ===========================================
// ROUTES
// ===========================================

/**
 * GET /v1/voice/sessions
 * List all sessions for a tenant
 */
router.get('/', authenticateUser(), async (req: Request, res: Response) => {
    try {
        const tenantId = (req as AuthenticatedRequest).auth.tenantId;
        const limit = parseInt(req.query.limit as string) || 50;
        const offset = parseInt(req.query.offset as string) || 0;
        const status = req.query.status as any;
        const period = req.query.period as any;
        const direction = req.query.direction as any;

        const result = await getSessionsForTenant(tenantId, { limit, offset, status, period, direction });
        res.json(result);
    } catch (e: any) {
        res.status(500).json({ error: e.message });
    }
});

/**
 * GET /v1/voice/sessions/:session_id
 * Get single session by ID
 */
router.get('/:session_id', authenticateUser(), async (req: Request, res: Response) => {
    try {
        const tenantId = (req as AuthenticatedRequest).auth.tenantId;
        const sessionId = getStringParam(req.params.session_id);

        if (!sessionId) {
            throw new ValidationError('Session ID required');
        }

        const session = await getSessionForTenant(sessionId, tenantId);
        if (!session) {
            return res.status(404).json({ error: 'Session not found' });
        }

        res.json(session);
    } catch (e: any) {
        res.status(e instanceof ValidationError ? 400 : 500).json({ error: e.message });
    }
});

/**
 * POST /v1/voice/sessions/widget/validate
 * Validate a public widget key and host origin before the iframe renders.
 */
router.post('/widget/validate', validateWidgetTenant(), async (req: Request, res: Response) => {
    const tenant = (req as any).tenant;
    res.json({
        ok: true,
        tenant_id: tenant.id,
        widget_key: tenant.widget_key ?? req.body?.widget_key,
    });
});

/**
 * POST /v1/voice/sessions/start
 * Start a new voice session
 */
router.post('/start', sessionRateLimit, validateWidgetTenant(), async (req: Request, res: Response) => {
    const parseResult = startSessionSchema.safeParse(req.body);

    if (!parseResult.success) {
        throw new ValidationError('Invalid request body', {
            errors: parseResult.error.errors,
        });
    }

    const result = await startSession(parseResult.data);

    res.status(201).json(result);
});

/**
 * POST /v1/voice/sessions/end
 * End a voice session
 */
router.post('/end', authenticateAgent(), async (req: Request, res: Response) => {
    const normalized = normalizeEndSessionRequest(req.body, {
        sessionIdFromRoute: undefined,
    });
    const agentReq = requireAgentSessionScope(req, normalized.session_id);
    const result = await endVoiceSession(normalized);
    console.log('[Session] session_end_reported_legacy_route', {
        session_id: normalized.session_id,
        tenant_id: agentReq.auth.tenantId,
        duration_seconds: normalized.duration_seconds,
        end_reason: normalized.end_reason,
    });
    res.json(result);
});

/**
 * POST /v1/voice/sessions/:session_id/end
 * Canonical end-session route (RESTful + retry-safe).
 */
router.post('/:session_id/end', authenticateAgent(), async (req: Request, res: Response) => {
    const sessionId = getStringParam(req.params.session_id);
    const agentReq = requireAgentSessionScope(req, sessionId);

    const normalized = normalizeEndSessionRequest(req.body, {
        sessionIdFromRoute: sessionId,
    });
    const result = await endVoiceSession(normalized);

    console.log('[Session] session_end_reported', {
        session_id: normalized.session_id,
        tenant_id: agentReq.auth.tenantId,
        duration_seconds: normalized.duration_seconds,
        end_reason: normalized.end_reason,
    });

    res.json(result);
});

/**
 * POST /v1/voice/sessions/:session_id/cancel
 * Cancel a pending session
 */
router.post('/:session_id/cancel', async (req: Request, res: Response) => {
    const sessionId = getStringParam(req.params.session_id);

    if (!sessionId) {
        throw new ValidationError('Session ID required');
    }

    await cancelPendingSession(sessionId);

    res.json({ success: true, message: 'Session cancelled' });
});

/**
 * GET /v1/voice/sessions/:session_id/manifest
 * Get agent manifest for a session
 */
router.get('/:session_id/manifest', authenticateAgent(), async (req: Request, res: Response) => {
    const sessionId = getStringParam(req.params.session_id);
    requireAgentSessionScope(req, sessionId);

    const manifest = await buildAgentManifest(sessionId!);

    res.json(manifest);
});

/**
 * POST /v1/voice/sessions/:session_id/activate
 * Mark session as active when user joins
 */
router.post('/:session_id/activate', authenticateAgent(), async (req: Request, res: Response) => {
    const sessionId = getStringParam(req.params.session_id);
    requireAgentSessionScope(req, sessionId);

    await markSessionActive(sessionId!);

    res.json({ success: true, message: 'Session activated' });
});

export default router;
