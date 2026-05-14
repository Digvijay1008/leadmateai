/**
 * Integrations Route
 *
 * GET /v1/integrations
 * Lists configured telephony/infrastructure integrations for the tenant.
 *
 * Returns the tenant's SIP trunk(s) and LiveKit configuration status
 * in a provider-card format that the frontend Integrations page expects.
 */

import { Router, Request, Response } from 'express';
import { authenticateUser, type AuthenticatedRequest } from '../../../../core/middleware/auth.js';
import { queryMany, queryOne } from '../../../../platform/db/client.js';
import { config } from '../../../../core/index.js';

const router = Router();

/**
 * GET /v1/integrations
 * Returns all configured integrations for the authenticated tenant.
 */
router.get('/', authenticateUser(), async (req: Request, res: Response) => {
    try {
        const tenantId = (req as AuthenticatedRequest).auth.tenantId;

        // Fetch SIP trunks registered for this tenant
        const sipTrunks = await queryMany(
            `SELECT id, name, provider_name, sip_host, is_active, created_at,
                    livekit_trunk_id, livekit_inbound_trunk_id, livekit_dispatch_rule_id
             FROM tenant_sip_trunks
             WHERE tenant_id = $1
             ORDER BY created_at ASC`,
            [tenantId]
        );

        const integrations: any[] = [];

        // Map each SIP trunk as an integration provider card
        for (const trunk of sipTrunks) {
            const isRegisteredInLiveKit = !!trunk.livekit_trunk_id;
            integrations.push({
                id: trunk.id,
                name: trunk.name || trunk.provider_name || 'SIP Trunk',
                type: 'sip_trunk',
                provider: trunk.provider_name || 'custom',
                icon: 'phone_forwarded',
                description: `SIP Host: ${trunk.sip_host} — ${isRegisteredInLiveKit ? 'Registered in LiveKit' : 'Not registered in LiveKit'}`,
                status: trunk.is_active && isRegisteredInLiveKit ? 'connected' : 'error',
                last_connected_at: trunk.created_at,
                details: {
                    sip_host: trunk.sip_host,
                    livekit_registered: isRegisteredInLiveKit,
                    outbound_trunk_id: trunk.livekit_trunk_id || null,
                    inbound_trunk_id: trunk.livekit_inbound_trunk_id || null,
                    dispatch_rule_id: trunk.livekit_dispatch_rule_id || null,
                },
            });
        }

        // Add LiveKit as a platform integration entry (always present)
        const livekitConfigured = !!(config.livekit.apiKey && config.livekit.url);
        integrations.unshift({
            id: 'livekit-platform',
            name: 'LiveKit Cloud',
            type: 'realtime_platform',
            provider: 'livekit',
            icon: 'sensors',
            description: 'Real-time audio/video infrastructure powering all AI voice calls.',
            status: livekitConfigured ? 'connected' : 'error',
            last_connected_at: null,
            details: {
                url: config.livekit.url || null,
                sip_domain: config.livekit.sipDomain || null,
                configured: livekitConfigured,
            },
        });

        res.json(integrations);
    } catch (e: any) {
        console.error('[Integrations] list_error:', e);
        res.status(500).json({ error: e.message });
    }
});

/**
 * POST /v1/integrations/:providerId/test
 * Tests connectivity to an integration provider.
 */
router.post('/:providerId/test', authenticateUser(), async (req: Request, res: Response) => {
    try {
        const tenantId = (req as AuthenticatedRequest).auth.tenantId;
        const { providerId } = req.params;

        if (providerId === 'livekit-platform') {
            // Test LiveKit by checking config
            const configured = !!(config.livekit.apiKey && config.livekit.url);
            return res.json({
                success: configured,
                provider: 'livekit',
                message: configured ? 'LiveKit is configured and ready.' : 'LiveKit API key or URL is missing.',
            });
        }

        // Test a SIP trunk
        const trunk = await queryOne(
            `SELECT id, sip_host, is_active, livekit_trunk_id FROM tenant_sip_trunks WHERE id = $1 AND tenant_id = $2`,
            [providerId, tenantId]
        );

        if (!trunk) {
            return res.status(404).json({ success: false, message: 'Integration not found.' });
        }

        return res.json({
            success: trunk.is_active && !!trunk.livekit_trunk_id,
            provider: 'sip_trunk',
            message: trunk.is_active && trunk.livekit_trunk_id
                ? `SIP trunk ${trunk.sip_host} is active and registered in LiveKit.`
                : `SIP trunk is inactive or not registered in LiveKit.`,
        });
    } catch (e: any) {
        console.error('[Integrations] test_error:', e);
        res.status(500).json({ success: false, error: e.message });
    }
});

export default router;
