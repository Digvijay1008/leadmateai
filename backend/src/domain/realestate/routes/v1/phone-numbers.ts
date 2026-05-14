import { Router } from 'express';
import { authenticateUser } from '../../../../core/middleware/auth.js';
import { configRateLimit } from '../../../../core/middleware/rate-limit.js';
import { query, queryMany, queryOne } from '../../../../platform/index.js';
import {
    registerTrunkInLiveKit,
    deregisterTrunkFromLiveKit,
} from '../../../../platform/services/sip/sip-trunk.service.js';

const router = Router();
router.use('/phone-numbers', authenticateUser(), configRateLimit);
router.use('/sip-trunks', authenticateUser(), configRateLimit);

// ===========================================
// PHONE NUMBERS
// ===========================================

router.get('/phone-numbers', async (req, res) => {
    try {
        const tenantId = (req as any).auth.tenantId;
        const numbers = await queryMany(
            `SELECT pn.id, pn.number, pn.country_code, pn.provider, pn.is_active,
                    pn.monthly_cost, pn.assigned_at, pn.assigned_agent_id, pn.sip_trunk_id,
                    st.name as trunk_name, st.provider_name as trunk_provider,
                    COUNT(vs.id)::int as total_calls,
                    COUNT(vs.id) FILTER (WHERE vs.created_at >= NOW() - INTERVAL '30 days')::int as calls_30d,
                    COALESCE(SUM(vs.duration_seconds), 0)::int as total_duration_seconds
             FROM phone_numbers pn
             LEFT JOIN tenant_sip_trunks st ON st.id = pn.sip_trunk_id
             LEFT JOIN voice_sessions vs ON vs.tenant_id = pn.tenant_id AND vs.phone_number = pn.number
             WHERE pn.tenant_id = $1
             GROUP BY pn.id, st.name, st.provider_name
             ORDER BY pn.assigned_at DESC`,
            [tenantId]
        );

        const formattedNumbers = numbers.map((n: any) => ({
            id: n.id,
            number: n.number,
            country_code: n.country_code || 'IN',
            display_name: n.number,
            provider: n.provider || 'sip',
            status: n.is_active ? 'active' : 'inactive',
            capabilities: { voice: true, sms: false, mms: false },
            monthly_cost: n.monthly_cost || 0,
            created_at: n.assigned_at || new Date().toISOString(),
            assigned_agent_id: n.assigned_agent_id,
            assigned_agent_name: n.assigned_agent_id ? 'Voice Agent' : null,
            sip_trunk_id: n.sip_trunk_id,
            trunk_name: n.trunk_name,
            trunk_provider: n.trunk_provider,
            usage: {
                total_calls: n.total_calls || 0,
                calls_30d: n.calls_30d || 0,
                total_duration_seconds: n.total_duration_seconds || 0,
            },
        }));

        res.json({ phone_numbers: formattedNumbers, total: formattedNumbers.length });
    } catch (e: any) {
        res.status(500).json({ error: e.message });
    }
});

router.post('/phone-numbers', async (req, res) => {
    try {
        const tenantId = (req as any).auth.tenantId;
        const { number, sip_trunk_id, agent_id } = req.body;

        if (!number) {
            return res.status(400).json({ error: 'Phone number is required' });
        }

        const result = await queryOne(
            `INSERT INTO phone_numbers (tenant_id, number, provider, is_active, country_code, sip_trunk_id, assigned_agent_id)
             VALUES ($1, $2, 'sip', true, 'IN', $3, $4)
             RETURNING id, number, country_code, provider, is_active, sip_trunk_id`,
            [tenantId, number, sip_trunk_id || null, agent_id || null]
        );

        res.json({
            message: 'Phone number added',
            phone_number: {
                id: result.id,
                number: result.number,
                country_code: result.country_code,
                provider: result.provider,
                status: result.is_active ? 'active' : 'inactive',
                sip_trunk_id: result.sip_trunk_id,
            }
        });
    } catch (e: any) {
        res.status(400).json({ error: e.message });
    }
});

router.patch('/phone-numbers/:id', async (req, res) => {
    try {
        const tenantId = (req as any).auth.tenantId;
        const numberId = req.params.id;
        const { is_active, sip_trunk_id } = req.body;

        const sets: string[] = [];
        const params: any[] = [];
        let paramIndex = 1;

        if (is_active !== undefined) {
            sets.push(`is_active = $${paramIndex++}`);
            params.push(is_active);
        }
        if (sip_trunk_id !== undefined) {
            sets.push(`sip_trunk_id = $${paramIndex++}`);
            params.push(sip_trunk_id || null);
        }

        if (sets.length === 0) {
            return res.status(400).json({ error: 'No fields to update' });
        }

        sets.push(`updated_at = NOW()`);
        params.push(numberId, tenantId);

        const result = await query(
            `UPDATE phone_numbers SET ${sets.join(', ')} WHERE id = $${paramIndex++} AND tenant_id = $${paramIndex}`,
            params
        );

        if (result.rowCount === 0) {
            return res.status(404).json({ error: 'Number not found' });
        }

        res.json({ message: 'Phone number updated' });
    } catch (e: any) {
        res.status(500).json({ error: e.message });
    }
});

router.post('/phone-numbers/:id/assign', async (req, res) => {
    try {
        const tenantId = (req as any).auth.tenantId;
        const numberId = req.params.id;
        const { agent_id } = req.body;

        const result = await query(
            `UPDATE phone_numbers SET assigned_agent_id = $1, assigned_at = NOW(), updated_at = NOW()
             WHERE id = $2 AND tenant_id = $3
             RETURNING id, number`,
            [agent_id || null, numberId, tenantId]
        );

        if (result.rowCount === 0) {
            return res.status(404).json({ error: 'Number not found' });
        }

        res.json({ message: 'Phone number assigned', number: result.rows[0] });
    } catch (e: any) {
        res.status(500).json({ error: e.message });
    }
});

router.post('/phone-numbers/:id/unassign', async (req, res) => {
    try {
        const tenantId = (req as any).auth.tenantId;
        const numberId = req.params.id;

        const result = await query(
            `UPDATE phone_numbers SET assigned_agent_id = NULL, assigned_at = NULL, updated_at = NOW()
             WHERE id = $1 AND tenant_id = $2
             RETURNING id, number`,
            [numberId, tenantId]
        );

        if (result.rowCount === 0) {
            return res.status(404).json({ error: 'Number not found' });
        }

        res.json({ message: 'Phone number unassigned', number: result.rows[0] });
    } catch (e: any) {
        res.status(500).json({ error: e.message });
    }
});

router.delete('/phone-numbers/:id', async (req, res) => {
    try {
        const tenantId = (req as any).auth.tenantId;
        const numberId = req.params.id;

        const result = await query(
            `DELETE FROM phone_numbers WHERE id = $1 AND tenant_id = $2`,
            [numberId, tenantId]
        );

        if (result.rowCount === 0) {
            return res.status(404).json({ error: 'Number not found' });
        }

        res.json({ message: 'Phone number deleted' });
    } catch (e: any) {
        res.status(500).json({ error: e.message });
    }
});

// ===========================================
// SIP TRUNKS — with LiveKit Registration
// ===========================================

router.get('/sip-trunks', async (req, res) => {
    try {
        const tenantId = (req as any).auth.tenantId;
        const trunks = await queryMany(
            `SELECT id, name, provider_name, sip_host, username, outbound_proxy, transport,
                    is_active, created_at, livekit_trunk_id, livekit_inbound_trunk_id,
                    livekit_dispatch_rule_id
             FROM tenant_sip_trunks
             WHERE tenant_id = $1
             ORDER BY created_at DESC`,
            [tenantId]
        );

        // Format response — never expose passwords
        const formatted = trunks.map((t: any) => ({
            ...t,
            registered_in_livekit: !!t.livekit_trunk_id,
        }));

        res.json({ sip_trunks: formatted, total: formatted.length });
    } catch (e: any) {
        res.status(500).json({ error: e.message });
    }
});

router.post('/sip-trunks/test', async (req, res) => {
    try {
        const { sip_host, username, password } = req.body;

        if (!sip_host) {
            return res.status(400).json({ error: 'SIP host is required' });
        }

        const { testSipTrunkConnection } = await import('../../../../platform/services/sip/sip-trunk.service.js');
        const testResult = await testSipTrunkConnection(sip_host);

        if (!testResult.success) {
            return res.status(400).json({
                success: false,
                error: testResult.error || 'Failed to connect to SIP trunk'
            });
        }

        res.json({
            success: true,
            message: 'SIP trunk connection successful'
        });
    } catch (e: any) {
        res.status(500).json({ success: false, error: e.message });
    }
});

router.post('/sip-trunks', async (req, res) => {
    try {
        const tenantId = (req as any).auth.tenantId;
        const { name, provider_name, sip_host, username, password, numbers, outbound_proxy, transport } = req.body;

        if (!sip_host) {
            return res.status(400).json({ error: 'SIP host is required' });
        }

        // Phone numbers that this trunk will handle
        const trunkNumbers: string[] = numbers || [];

        // 1. Register trunk in LiveKit (outbound + inbound + dispatch rule)
        let livekitIds: { livekitTrunkId: string; livekitInboundTrunkId: string; livekitDispatchRuleId: string };
        try {
            livekitIds = await registerTrunkInLiveKit({
                name: name || 'Primary Trunk',
                sipHost: sip_host,
                numbers: trunkNumbers,
                username: username || undefined,
                password: password || undefined,
                transport: transport || 'udp',
                tenantId,
            });
        } catch (err: any) {
            console.error('[SIP-Trunk] livekit_registration_failed', { error: err.message });
            return res.status(502).json({
                error: 'Failed to register SIP trunk in LiveKit: ' + err.message,
            });
        }

        // 2. Store in our DB with LiveKit IDs
        const passwordEncrypted = password || null;

        const result = await queryOne(
            `INSERT INTO tenant_sip_trunks
                (tenant_id, name, provider_name, sip_host, username, password_encrypted,
                 outbound_proxy, transport, livekit_trunk_id, livekit_inbound_trunk_id,
                 livekit_dispatch_rule_id)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
             RETURNING id, name, provider_name, sip_host, username, outbound_proxy, transport,
                       is_active, created_at, livekit_trunk_id, livekit_inbound_trunk_id,
                       livekit_dispatch_rule_id`,
            [
                tenantId,
                name || 'Primary Trunk',
                provider_name || 'custom',
                sip_host,
                username || null,
                passwordEncrypted,
                outbound_proxy || null,
                transport || 'udp',
                livekitIds.livekitTrunkId,
                livekitIds.livekitInboundTrunkId,
                livekitIds.livekitDispatchRuleId,
            ]
        );

        res.status(201).json({
            message: 'SIP trunk created and registered in LiveKit',
            sip_trunk: {
                ...result,
                registered_in_livekit: true,
            },
        });
    } catch (e: any) {
        res.status(400).json({ error: e.message });
    }
});

router.patch('/sip-trunks/:id', async (req, res) => {
    try {
        const tenantId = (req as any).auth.tenantId;
        const trunkId = req.params.id;
        const { name, sip_host, username, password, outbound_proxy, transport, is_active } = req.body;

        const sets: string[] = [];
        const params: any[] = [];
        let i = 1;

        if (name !== undefined) { sets.push(`name = $${i++}`); params.push(name); }
        if (sip_host !== undefined) { sets.push(`sip_host = $${i++}`); params.push(sip_host); }
        if (username !== undefined) { sets.push(`username = $${i++}`); params.push(username); }
        if (password !== undefined) { sets.push(`password_encrypted = $${i++}`); params.push(password); }
        if (outbound_proxy !== undefined) { sets.push(`outbound_proxy = $${i++}`); params.push(outbound_proxy); }
        if (transport !== undefined) { sets.push(`transport = $${i++}`); params.push(transport); }
        if (is_active !== undefined) { sets.push(`is_active = $${i++}`); params.push(is_active); }

        if (sets.length === 0) {
            return res.status(400).json({ error: 'No fields to update' });
        }

        sets.push(`updated_at = NOW()`);
        params.push(trunkId, tenantId);

        const result = await query(
            `UPDATE tenant_sip_trunks SET ${sets.join(', ')} WHERE id = $${i++} AND tenant_id = $${i}`,
            params
        );

        if (result.rowCount === 0) {
            return res.status(404).json({ error: 'SIP trunk not found' });
        }

        // NOTE: If sip_host, username, or password changed, the trunk should be
        // re-registered in LiveKit. For now, we log a warning.
        if (sip_host || username || password) {
            console.warn('[SIP-Trunk] Trunk credentials updated in DB but NOT in LiveKit. ' +
                'Delete and re-create the trunk to update LiveKit registration.');
        }

        res.json({ message: 'SIP trunk updated' });
    } catch (e: any) {
        res.status(500).json({ error: e.message });
    }
});

router.delete('/sip-trunks/:id', async (req, res) => {
    try {
        const tenantId = (req as any).auth.tenantId;
        const trunkId = req.params.id;

        // Check no phone numbers depend on this trunk
        const dependentNumbers = await queryOne<{ count: string }>(
            `SELECT COUNT(*) as count FROM phone_numbers WHERE sip_trunk_id = $1 AND tenant_id = $2`,
            [trunkId, tenantId]
        );

        if (parseInt(dependentNumbers?.count ?? '0', 10) > 0) {
            return res.status(409).json({ error: 'Cannot delete trunk: phone numbers still assigned to it' });
        }

        // Get LiveKit IDs before deleting from DB
        const trunk = await queryOne<{
            livekit_trunk_id: string | null;
            livekit_inbound_trunk_id: string | null;
            livekit_dispatch_rule_id: string | null;
        }>(
            `SELECT livekit_trunk_id, livekit_inbound_trunk_id, livekit_dispatch_rule_id
             FROM tenant_sip_trunks WHERE id = $1 AND tenant_id = $2`,
            [trunkId, tenantId]
        );

        if (!trunk) {
            return res.status(404).json({ error: 'SIP trunk not found' });
        }

        // 1. Deregister from LiveKit
        try {
            await deregisterTrunkFromLiveKit({
                livekitTrunkId: trunk.livekit_trunk_id,
                livekitInboundTrunkId: trunk.livekit_inbound_trunk_id,
                livekitDispatchRuleId: trunk.livekit_dispatch_rule_id,
            });
        } catch (err: any) {
            console.error('[SIP-Trunk] livekit_deregistration_failed', { error: err.message });
            // Continue with DB deletion — LiveKit resources may already be gone
        }

        // 2. Delete from DB
        const result = await query(
            `DELETE FROM tenant_sip_trunks WHERE id = $1 AND tenant_id = $2`,
            [trunkId, tenantId]
        );

        if (result.rowCount === 0) {
            return res.status(404).json({ error: 'SIP trunk not found' });
        }

        res.json({ message: 'SIP trunk deleted and deregistered from LiveKit' });
    } catch (e: any) {
        res.status(500).json({ error: e.message });
    }
});

export default router;
