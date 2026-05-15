/**
 * Outbound Calls Route
 *
 * POST /v1/calls/outbound
 *
 * Creates a voice session, then dials the destination number
 * via the tenant's SIP trunk using LiveKit SIP outbound.
 */

import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { authenticateUser } from '../../../../core/middleware/auth.js';
import { ValidationError } from '../../../../shared/index.js';
import { startSession } from '../../services/session.service.js';
import { queryOne } from '../../../../platform/db/client.js';
import { dialOutbound, getTrunkForTenant } from '../../../../platform/services/sip/telephony.service.js';

const router = Router();

const outboundCallSchema = z.object({
    to: z.string().min(5),
    agent_id: z.string().optional(),
});

function normalizePhoneNumber(phone: string): string {
    let clean = phone.replace(/\D/g, '');
    if (clean.length === 12 && clean.startsWith('91')) return '+' + clean;
    if (clean.length === 10) return '+91' + clean;
    if (phone.startsWith('+')) return phone;
    return '+' + clean;
}

router.post('/outbound', authenticateUser(), async (req: Request, res: Response) => {
    const parseResult = outboundCallSchema.safeParse(req.body);

    if (!parseResult.success) {
        throw new ValidationError('Invalid request body', { errors: parseResult.error.errors });
    }

    const { to } = parseResult.data;
    const tenantId = (req as any).auth!.tenantId;
    const normalizedTo = normalizePhoneNumber(to);

    // Get tenant's active phone number and its linked trunk
    const phoneRecord = await queryOne<{ number: string, sip_trunk_id: string }>(
        `SELECT number, sip_trunk_id FROM phone_numbers WHERE tenant_id = $1 AND is_active = true LIMIT 1`,
        [tenantId]
    );

    if (!phoneRecord) {
        throw new ValidationError('No active phone number found for your account.');
    }

    const normalizedFrom = normalizePhoneNumber(phoneRecord.number);

    const lead = await queryOne<{ id: string }>(
        `SELECT id
         FROM leads
         WHERE tenant_id = $1
           AND regexp_replace(phone, '\\D', '', 'g') = regexp_replace($2, '\\D', '', 'g')
         ORDER BY created_at DESC
         LIMIT 1`,
        [tenantId, normalizedTo]
    );

    // Get the SPECIFIC SIP trunk for this phone number
    let trunk = null;
    if (phoneRecord.sip_trunk_id) {
        trunk = await queryOne<any>(
            `SELECT * FROM tenant_sip_trunks WHERE id = $1 AND is_active = true`,
            [phoneRecord.sip_trunk_id]
        );
    }

    // Fallback to tenant's first trunk if not specifically linked (backward compatibility)
    if (!trunk) {
        trunk = await getTrunkForTenant(tenantId);
    }

    if (!trunk) {
        throw new ValidationError('No SIP trunk configured. Please add a SIP trunk in Settings → Phone Numbers.');
    }

    // Create a new voice session
    const session = await startSession({
        tenant_id: tenantId,
        visitor_metadata: {
            to_number: normalizedTo,
            from_number: normalizedFrom,
            source: 'dashboard_outbound_dialer',
        },
        direction: 'outbound',
        phone_number: normalizedFrom,
        lead_id: lead?.id,
    });

    // Dial via LiveKit SIP
    let sipParticipantId = '';

    try {
        const result = await dialOutbound({
            to: normalizedTo,
            from: normalizedFrom,
            roomName: session.livekit_room_name,
            trunk,
        });
        sipParticipantId = result.sipParticipantId;
    } catch (error: any) {
        console.error('[Calls] outbound_dial_failed', { error: error.message });
        throw new Error('Failed to initiate outbound call: ' + error.message);
    }

    res.status(201).json({
        success: true,
        call_uuid: sipParticipantId,
        sip_participant_id: sipParticipantId,
        session_id: session.session_id,
        livekit_room_name: session.livekit_room_name,
        livekit_token: session.livekit_token,
        livekit_url: session.livekit_url,
        max_duration_seconds: session.max_duration_seconds,
        status: 'dialing',
    });
});

export default router;
