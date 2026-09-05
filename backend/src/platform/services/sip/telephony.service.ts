/**
 * SIP Telephony Service
 *
 * Provides outbound dialing via LiveKit SIP.
 * Uses LiveKit's createSipParticipant() API to bridge PSTN calls
 * into LiveKit rooms — no external provider SDK needed.
 *
 * IMPORTANT (from LiveKit SIP source code):
 *   - sipCallTo must be E.164 phone number (e.g. "+15551234567")
 *   - LiveKit constructs the SIP URI internally from the trunk config
 *   - sipTrunkId must be the LiveKit-assigned ID (ST_xxx format)
 *   - DO NOT construct SIP URIs manually
 */

import { SipClient } from 'livekit-server-sdk';
import type { CreateSipParticipantOptions } from 'livekit-server-sdk';
import { config } from '../../../core/index.js';
import { queryOne } from '../../db/client.js';
import { incrementMetric, parseSessionIdFromRoomName } from '../../../shared/index.js';
import { endVoiceSession } from '../../../domain/crm/services/session.service.js';

// ===========================================
// TYPES
// ===========================================

export interface SipTrunk {
    id: string;
    tenant_id: string;
    name: string;
    provider_name: string;
    sip_host: string;
    username: string | null;
    password_encrypted: string | null;
    outbound_proxy: string | null;
    transport: string;
    is_active: boolean;
    livekit_trunk_id: string | null;
    livekit_inbound_trunk_id: string | null;
    livekit_dispatch_rule_id: string | null;
}

export interface DialOutboundParams {
    to: string;
    from: string;
    roomName: string;
    trunk: SipTrunk;
}

// ===========================================
// SIP CLIENT
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
// OUTBOUND DIALING
// ===========================================

/**
 * Dial an outbound call via LiveKit SIP.
 *
 * Uses createSipParticipant() with:
 *   - LiveKit trunk ID (ST_xxx) — NOT our DB UUID
 *   - E.164 phone number — NOT a SIP URI
 *   - waitUntilAnswered: true for synchronous answer detection
 *
 * LiveKit internally:
 *   1. Looks up the trunk config (address, auth credentials)
 *   2. Constructs SIP URI: sip:{to}@{trunk.address}
 *   3. Sends SIP INVITE with digest auth
 *   4. Bridges the answered call into the LiveKit room
 */
export async function dialOutbound(params: DialOutboundParams): Promise<{ sipParticipantId: string }> {
    const { to, from, roomName, trunk } = params;

    // Validate that the trunk is registered in LiveKit
    if (!trunk.livekit_trunk_id) {
        throw new Error(
            'SIP trunk is not registered in LiveKit. ' +
            'Please delete and re-create the trunk to register it.'
        );
    }

    const client = getSipClient();

    try {
        const opts: CreateSipParticipantOptions = {
            participantIdentity: `sip-outbound-${Date.now()}`,
            participantName: `Call to ${to}`,
            waitUntilAnswered: true,
            // Play a dial tone in the room until the callee picks up.
            // This keeps the RTP media path alive and prevents VoiceLink's
            // no-media timeout from killing the call before TTS starts.
            playDialtone: true,
            // Give the call 30 seconds to ring before giving up.
            ringingTimeout: 30,
        };

        // Set caller ID if the trunk has a number configured
        if (from) {
            opts.fromNumber = from;
        }

        // VoiceLink dial format — CONFIRMED from provider dashboard:
        //   Example: SIP/45454xxxxxxxxxxx@trunk
        //   Format:  tech_prefix(45454) + 10-digit local number (NO country code)
        //
        // FORMAT HISTORY:
        //   "45454919619810084"  → 404 (included country code 91 — TOO MANY DIGITS)
        //   "454549619810084"    → CORRECT: prefix + 10-digit local ✅
        const rawE164 = to.replace("+", "");
        // Strip country code 91 from Indian numbers to get 10-digit local
        const localNumber = rawE164.startsWith("91") && rawE164.length === 12
            ? rawE164.slice(2)   // "919619810084" → "9619810084"
            : rawE164;           // fallback: use as-is
        const dialNumber = "45454" + localNumber;

        console.log('[SIP] outbound_dial_attempt', {
            livekit_trunk_id: trunk.livekit_trunk_id,
            sip_host: trunk.sip_host,
            provider: trunk.provider_name,
            dial_number: dialNumber,
            dial_number_with_prefix: "45454" + rawE164,
            from_number: from,
            room: roomName,
        });

        const participant = await client.createSipParticipant(
            trunk.livekit_trunk_id,   // LiveKit trunk ID (ST_xxx)
            dialNumber,               // With VoiceLink tech prefix: 45454XXXXXXXXXX
            roomName,
            opts
        );

        incrementMetric('sip.outbound_dial_success', { provider: trunk.provider_name });

        return {
            sipParticipantId: participant?.sipCallId ?? 'unknown',
        };
    } catch (error: any) {
        incrementMetric('sip.outbound_dial_failed', { provider: trunk.provider_name });
        console.error('[SIP] outbound_dial_failed', {
            to,
            from,
            room: roomName,
            livekit_trunk_id: trunk.livekit_trunk_id,
            error: error.message,
        });

        // Release billing hold immediately since call failed to start
        const sessionId = parseSessionIdFromRoomName(roomName);
        if (sessionId) {
            await endVoiceSession({
                session_id: sessionId,
                end_reason: 'error',
                duration_seconds: 0
            }).catch(e => {
                console.error('[SIP] Failed to release billing hold for failed call:', e.message);
            });
        }

        throw new Error(`Failed to initiate outbound call: ${error.message}`);
    }
}

// ===========================================
// TRUNK LOOKUP
// ===========================================

/**
 * Get the active SIP trunk for a phone number.
 */
export async function getTrunkForNumber(phoneNumberId: string): Promise<SipTrunk | null> {
    return queryOne<SipTrunk>(
        `SELECT t.*
         FROM tenant_sip_trunks t
         JOIN phone_numbers pn ON pn.sip_trunk_id = t.id
         WHERE pn.id = $1 AND t.is_active = true`,
        [phoneNumberId]
    );
}

/**
 * Get the active SIP trunk for a tenant.
 */
export async function getTrunkForTenant(tenantId: string): Promise<SipTrunk | null> {
    return queryOne<SipTrunk>(
        `SELECT * FROM tenant_sip_trunks
         WHERE tenant_id = $1 AND is_active = true
         ORDER BY created_at DESC
         LIMIT 1`,
        [tenantId]
    );
}
