/**
 * Internal SIP Routes
 *
 * POST /api/v1/internal/sip/inbound-session
 *
 * Called by the Python agent worker when it receives an inbound SIP call.
 * The SIP dispatch rule only sends {tenant_id} to the agent — not a full manifest.
 * This endpoint creates a session and returns the full manifest.
 *
 * Authentication: x-internal-key header (shared secret between backend and agent).
 */

import { Router, Request, Response } from 'express';
import { startSession, buildAgentManifest } from '../../../domain/crm/services/session.service.js';
import { queryOne } from '../../db/client.js';
import { config } from '../../../core/index.js';

const router = Router();

// Internal key auth middleware
function requireInternalKey(req: Request, res: Response, next: any) {
    const key = req.headers['x-internal-key'];
    const expected = process.env.BACKEND_INTERNAL_KEY || config.jwt.secret;

    if (!key || key !== expected) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
    }
    next();
}

/**
 * POST /api/v1/internal/sip/inbound-session
 *
 * Creates a voice session for an inbound SIP call and returns
 * the full AgentSessionManifest needed by the Python agent.
 */
router.post('/inbound-session', requireInternalKey, async (req: Request, res: Response) => {
    const { tenant_id, room_name } = req.body;

    if (!tenant_id) {
        res.status(400).json({ error: 'tenant_id is required' });
        return;
    }

    console.log('[Internal/SIP] inbound_session_requested', { tenant_id, room_name });

    // Get the tenant's active phone number to use as "from" for the session
    const phoneRecord = await queryOne<{ number: string }>(
        `SELECT number FROM phone_numbers WHERE tenant_id = $1 AND is_active = true LIMIT 1`,
        [tenant_id]
    );

    const phoneNumber = phoneRecord?.number ?? null;

    // Create a full session — this builds the manifest, creates billing hold, dispatches agent
    const session = await startSession({
        tenant_id,
        visitor_metadata: {
            source: 'sip_inbound',
            room_name,
        },
        direction: 'inbound',
        phone_number: phoneNumber ?? undefined,
    });

    console.log('[Internal/SIP] inbound_session_created', {
        session_id: session.session_id,
        tenant_id,
        room_name: session.livekit_room_name,
    });

    const manifest = await buildAgentManifest(session.session_id);

    res.status(200).json({
        session_id: session.session_id,
        livekit_room_name: session.livekit_room_name,
        manifest,
    });
});

export default router;
