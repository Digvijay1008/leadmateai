/**
 * SIP Trunk Registration Service
 *
 * Registers/deregisters SIP trunks and dispatch rules in LiveKit.
 * This is the bridge between our DB and LiveKit's SIP infrastructure.
 *
 * LiveKit requires trunks to be registered via API before they can be
 * used for inbound or outbound calls. This service handles that lifecycle.
 *
 * API Reference (livekit-server-sdk@2.15.0 SipClient.d.ts):
 *   createSipOutboundTrunk(name, address, numbers, opts?) → SIPOutboundTrunkInfo
 *   createSipInboundTrunk(name, numbers, opts?) → SIPInboundTrunkInfo
 *   createSipDispatchRule(rule, opts?) → SIPDispatchRuleInfo
 *   deleteSipTrunk(sipTrunkId) → SIPTrunkInfo
 *   deleteSipDispatchRule(sipDispatchRuleId) → SIPDispatchRuleInfo
 */

import { SipClient } from 'livekit-server-sdk';
import type {
    CreateSipOutboundTrunkOptions,
    CreateSipInboundTrunkOptions,
    CreateSipDispatchRuleOptions,
    SipDispatchRuleIndividual,
} from 'livekit-server-sdk';
import {
    SIPTransport,
    RoomConfiguration,
    RoomAgentDispatch,
} from '@livekit/protocol';
import { config } from '../../../core/index.js';

// ===========================================
// TYPES
// ===========================================

export interface RegisterTrunkParams {
    name: string;
    sipHost: string;
    numbers: string[];
    username?: string;
    password?: string;
    transport?: 'udp' | 'tcp' | 'tls';
    tenantId: string;
}

export interface RegisteredTrunkResult {
    livekitTrunkId: string;
    livekitInboundTrunkId: string;
    livekitDispatchRuleId: string;
}

// ===========================================
// SIP CLIENT SINGLETON
// ===========================================

let sipClient: SipClient | null = null;

function getSipClient(): SipClient {
    if (!sipClient) {
        const httpUrl = config.livekit.url
            .replace('wss://', 'https://')
            .replace('ws://', 'http://');

        sipClient = new SipClient(
            httpUrl,
            config.livekit.apiKey,
            config.livekit.apiSecret
        );
    }
    return sipClient;
}

// ===========================================
// TRANSPORT MAPPING
// ===========================================

function mapTransport(transport?: string): SIPTransport {
    switch (transport) {
        case 'tcp': return SIPTransport.SIP_TRANSPORT_TCP;
        case 'tls': return SIPTransport.SIP_TRANSPORT_TLS;
        default: return SIPTransport.SIP_TRANSPORT_UDP;
    }
}

// ===========================================
// REGISTER TRUNK IN LIVEKIT
// ===========================================

/**
 * Registers an outbound trunk, inbound trunk, and dispatch rule in LiveKit.
 *
 * This is called when a tenant creates a SIP trunk via the API.
 * LiveKit returns IDs (ST_xxx format) that must be stored in our DB.
 */
export async function registerTrunkInLiveKit(params: RegisterTrunkParams): Promise<RegisteredTrunkResult> {
    const client = getSipClient();

    // 1. Register Outbound Trunk
    //    Used for createSipParticipant() — outbound calls
    const outboundOpts: CreateSipOutboundTrunkOptions = {
        transport: mapTransport(params.transport),
    };
    if (params.username) outboundOpts.authUsername = params.username;
    if (params.password) outboundOpts.authPassword = params.password;

    const outboundTrunk = await client.createSipOutboundTrunk(
        params.name,
        params.sipHost,
        params.numbers,
        outboundOpts
    );

    console.log('[SIP-Trunk] outbound_trunk_registered', {
        livekitTrunkId: outboundTrunk.sipTrunkId,
        name: params.name,
        address: params.sipHost,
    });

    // 2. Register Inbound Trunk
    //    Used for receiving SIP INVITEs from the provider
    const inboundOpts: CreateSipInboundTrunkOptions = {};
    if (params.username) inboundOpts.authUsername = params.username;
    if (params.password) inboundOpts.authPassword = params.password;

    const inboundTrunk = await client.createSipInboundTrunk(
        `${params.name} (Inbound)`,
        params.numbers,
        inboundOpts
    );

    console.log('[SIP-Trunk] inbound_trunk_registered', {
        livekitInboundTrunkId: inboundTrunk.sipTrunkId,
    });

    // 3. Create Dispatch Rule
    //    Routes inbound calls to individual rooms with agent auto-dispatch
    //    roomPrefix MUST be parseable by the webhook handler:
    //    format: call-{first8hexchars}-  (no UUID dashes)
    const tenantHexPrefix = params.tenantId.replace(/-/g, '').substring(0, 8);
    const dispatchRule: SipDispatchRuleIndividual = {
        type: 'individual',
        roomPrefix: `call-${tenantHexPrefix}-`,
    };

    const dispatchOpts: CreateSipDispatchRuleOptions = {
        name: `${params.name} - Inbound Dispatch`,
        trunkIds: [inboundTrunk.sipTrunkId],
        // Room-level metadata — written to the LiveKit Room object so the
        // webhook handler can extract tenant_id from event.room.metadata
        // without an extra DB round-trip.
        metadata: JSON.stringify({
            tenant_id: params.tenantId,
            source: 'sip_inbound',
        }),
        roomConfig: new RoomConfiguration({
            agents: [
                new RoomAgentDispatch({
                    // Must match LIVEKIT_AGENT_NAME env var and your agent worker's registered name
                    agentName: config.livekit.agentName,
                    // Agent-level metadata — read by the agent worker process
                    metadata: JSON.stringify({
                        tenant_id: params.tenantId,
                        source: 'sip_inbound',
                    }),
                }),
            ],
        }),
    };

    const rule = await client.createSipDispatchRule(dispatchRule, dispatchOpts);

    console.log('[SIP-Trunk] dispatch_rule_created', {
        livekitDispatchRuleId: rule.sipDispatchRuleId,
        roomPrefix: dispatchRule.roomPrefix,
    });

    return {
        livekitTrunkId: outboundTrunk.sipTrunkId,
        livekitInboundTrunkId: inboundTrunk.sipTrunkId,
        livekitDispatchRuleId: rule.sipDispatchRuleId,
    };
}

// ===========================================
// DEREGISTER TRUNK FROM LIVEKIT
// ===========================================

/**
 * Removes a trunk and its dispatch rule from LiveKit.
 *
 * Called when a tenant deletes a SIP trunk via the API.
 * Silently handles cases where the LiveKit resource is already gone.
 */
export async function deregisterTrunkFromLiveKit(ids: {
    livekitTrunkId?: string | null;
    livekitInboundTrunkId?: string | null;
    livekitDispatchRuleId?: string | null;
}): Promise<void> {
    const client = getSipClient();

    // Delete dispatch rule first (depends on trunk)
    if (ids.livekitDispatchRuleId) {
        try {
            await client.deleteSipDispatchRule(ids.livekitDispatchRuleId);
            console.log('[SIP-Trunk] dispatch_rule_deleted', { id: ids.livekitDispatchRuleId });
        } catch (err: any) {
            console.warn('[SIP-Trunk] dispatch_rule_delete_failed (may already be deleted)', {
                id: ids.livekitDispatchRuleId,
                error: err.message,
            });
        }
    }

    // Delete inbound trunk
    if (ids.livekitInboundTrunkId) {
        try {
            await client.deleteSipTrunk(ids.livekitInboundTrunkId);
            console.log('[SIP-Trunk] inbound_trunk_deleted', { id: ids.livekitInboundTrunkId });
        } catch (err: any) {
            console.warn('[SIP-Trunk] inbound_trunk_delete_failed', {
                id: ids.livekitInboundTrunkId,
                error: err.message,
            });
        }
    }

    // Delete outbound trunk
    if (ids.livekitTrunkId) {
        try {
            await client.deleteSipTrunk(ids.livekitTrunkId);
            console.log('[SIP-Trunk] outbound_trunk_deleted', { id: ids.livekitTrunkId });
        } catch (err: any) {
            console.warn('[SIP-Trunk] outbound_trunk_delete_failed', {
                id: ids.livekitTrunkId,
                error: err.message,
            });
        }
    }
}

// ===========================================
// TEST TRUNK CONNECTION
// ===========================================

import dgram from 'dgram';
import dns from 'dns/promises';

/**
 * Tests SIP trunk connectivity by sending a lightweight UDP OPTIONS ping.
 * This ensures the host is reachable before we allow saving the trunk.
 */
export async function testSipTrunkConnection(host: string): Promise<{ success: boolean; error?: string }> {
    return new Promise(async (resolve) => {
        try {
            // Determine IP and port
            const parts = host.split(':');
            const hostPart = parts[0] || host;
            const portPart = parts[1] || '5060';
            const port = parseInt(portPart, 10) || 5060;

            let targetIp = hostPart;
            try {
                const addresses = await dns.resolve(hostPart);
                if (addresses.length > 0 && addresses[0]) {
                    targetIp = addresses[0];
                }
            } catch (dnsErr) {
                // If it's already an IP, dns.resolve might fail, which is fine
            }

            const client = dgram.createSocket('udp4');
            let resolved = false;

            const finish = (success: boolean, error?: string) => {
                if (resolved) return;
                resolved = true;
                try { client.close(); } catch (e) {}
                resolve({ success, error });
            };

            client.on('message', (msg) => {
                const response = msg.toString();
                // Any SIP response (e.g. 200 OK, 401 Unauthorized, 404 Not Found) means the server is reachable
                if (response.includes('SIP/2.0')) {
                    finish(true);
                }
            });

            client.on('error', (err) => {
                finish(false, err.message);
            });

            const callId = Math.random().toString(36).substring(2, 15);
            const message = [
                `OPTIONS sip:${host} SIP/2.0`,
                `Via: SIP/2.0/UDP 127.0.0.1;branch=z9hG4bK${callId}`,
                `Max-Forwards: 70`,
                `To: <sip:${host}>`,
                `From: "ping" <sip:ping@127.0.0.1>;tag=1928301774`,
                `Call-ID: ${callId}`,
                `CSeq: 1 OPTIONS`,
                `Contact: <sip:ping@127.0.0.1>`,
                `Accept: application/sdp`,
                `Content-Length: 0`,
                ``,
                ``
            ].join('\r\n');

            client.send(message, port, targetIp, (err) => {
                if (err) {
                    finish(false, err.message);
                }
            });

            // Timeout after 3 seconds
            setTimeout(() => {
                finish(false, 'Connection timeout - no response from SIP server');
            }, 3000);

        } catch (error: any) {
            resolve({ success: false, error: error.message });
        }
    });
}

