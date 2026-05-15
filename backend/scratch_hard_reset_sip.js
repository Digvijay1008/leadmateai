import { SipClient } from 'livekit-server-sdk';
import dotenv from 'dotenv';
import pg from 'pg';
dotenv.config();

const { Pool } = pg;
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
});

const config = {
    livekit: {
        url: process.env.LIVEKIT_URL,
        apiKey: process.env.LIVEKIT_API_KEY,
        apiSecret: process.env.LIVEKIT_API_SECRET,
    }
};

const httpUrl = config.livekit.url.replace('wss://', 'https://');
const client = new SipClient(httpUrl, config.livekit.apiKey, config.livekit.apiSecret);

async function hardResetTrunk() {
    try {
        const tenantId = '425624ad-1b83-4f9c-adf5-0e03c886829c';
        
        // 1. Get existing IDs from DB
        const res = await pool.query('SELECT * FROM tenant_sip_trunks WHERE tenant_id = $1 AND is_active = true', [tenantId]);
        const trunk = res.rows[0];
        
        if (!trunk) {
            console.error('No active trunk found in DB');
            return;
        }

        // 2. Numbers to register
        const numbers = [
            '+918042455800',
            '+919484957097'
        ];

        // 3. Delete any previously "SYNCED" resources to avoid conflicts
        const inTrunks = await client.listSipInboundTrunk();
        for (const t of inTrunks) {
            if (t.name && t.name.includes('SYNCED')) await client.deleteSipTrunk(t.sipTrunkId);
        }
        const outTrunks = await client.listSipOutboundTrunk();
        for (const t of outTrunks) {
            if (t.name && t.name.includes('SYNCED')) await client.deleteSipTrunk(t.sipTrunkId);
        }

        // 4. Create New Inbound Trunk
        const inboundTrunk = await client.createSipInboundTrunk(
            'VoiceLink Primary (Inbound) - SYNCED',
            numbers,
            {
                authUsername: trunk.username,
                authPassword: trunk.password_encrypted,
            }
        );
        console.log('New Inbound Trunk:', inboundTrunk.sipTrunkId);

        // 5. Create New Outbound Trunk (numbers as 3rd arg)
        const outboundTrunk = await client.createSipOutboundTrunk(
            'VoiceLink Primary (Outbound) - SYNCED',
            trunk.sip_host,
            numbers,
            {
                authUsername: trunk.username,
                authPassword: trunk.password_encrypted,
                transport: trunk.transport === 'udp' ? 0 : 1,
            }
        );
        console.log('New Outbound Trunk:', outboundTrunk.sipTrunkId);

        // 6. Create New Dispatch Rule
        const tenantHexPrefix = tenantId.replace(/-/g, '').substring(0, 8);
        const dispatchRule = await client.createSipDispatchRule(
            {
                type: 'individual',
                roomPrefix: `call-${tenantHexPrefix}-`,
            },
            {
                name: 'VoiceLink Primary Dispatch - SYNCED',
                trunkIds: [inboundTrunk.sipTrunkId],
                metadata: JSON.stringify({ tenant_id: tenantId, source: 'sip_inbound' }),
                roomConfig: {
                    agents: [
                        {
                            agentName: 'leadmate-agent',
                            metadata: JSON.stringify({ tenant_id: tenantId, source: 'sip_inbound' })
                        }
                    ]
                }
            }
        );
        console.log('New Dispatch Rule:', dispatchRule.sipDispatchRuleId);

        // 7. Update DB
        await pool.query(
            `UPDATE tenant_sip_trunks 
             SET livekit_inbound_trunk_id = $1, 
                 livekit_trunk_id = $2, 
                 livekit_dispatch_rule_id = $3,
                 updated_at = NOW()
             WHERE id = $4`,
            [inboundTrunk.sipTrunkId, outboundTrunk.sipTrunkId, dispatchRule.sipDispatchRuleId, trunk.id]
        );
        console.log('Database updated successfully.');

    } catch (err) {
        console.error('Hard Reset Error:', err);
    } finally {
        await pool.end();
    }
}

hardResetTrunk();
