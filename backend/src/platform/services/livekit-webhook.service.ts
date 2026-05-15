import { parseSessionIdFromRoomName } from '../../shared/index.js';
import { incrementMetric } from '../../shared/index.js';
import { computeDurationSeconds } from '../../domain/crm/services/session-duration.service.js';
import {
    findSessionForRoomFinished,
    markPendingSessionCancelled,
    markRecoveredSessionCompleted,
    persistWebhookDurationAudit,
    updateSessionStatus,
    type FinishedRoomSessionRow,
} from '../../domain/crm/repositories/webhook-session.repository.js';
import { settleSessionHold, releaseSessionHold } from '../../domain/crm/services/wallet.service.js';
import { startSession } from '../../domain/crm/services/session.service.js';
import { queryOne } from '../db/client.js';

export async function processLiveKitWebhookEvent(event: any): Promise<void> {
    const eventType = event?.event;
    const roomName = event?.room?.name as string;
    
    if (!roomName) return;

    if (eventType === 'room_started') {
        // Case 1: Outbound/widget room — room name encodes session ID
        const sessionId = parseSessionIdFromRoomName(roomName);
        if (sessionId) {
            await updateSessionStatus(sessionId, 'ringing');
            console.log('[Webhook] session_ringing', { session_id: sessionId });
            return;
        }

        // Case 2: Inbound SIP room — created by LiveKit dispatch rule
        // Room name format: call-{tenantShort}-{timestamp}
        // We auto-create a voice session for it so billing + tracking work.
        if (roomName.startsWith('call-')) {
            await handleInboundRoomStarted(roomName, event);
        }
        return;
    }

    if (eventType === 'participant_joined') {
        const participantIdentity = event?.participant?.identity as string;

        // Try outbound/widget session first (room name encodes session ID)
        const sessionId = parseSessionIdFromRoomName(roomName);
        if (sessionId && participantIdentity && !participantIdentity.startsWith('agent-')) {
            await updateSessionStatus(sessionId, 'connected');
            console.log('[Webhook] session_connected', { session_id: sessionId, participant: participantIdentity });
            return;
        }

        // For inbound rooms, look up by room name
        if (roomName.startsWith('call-') && participantIdentity && !participantIdentity.startsWith('agent-')) {
            const inboundSession = await queryOne<{ id: string }>(
                `SELECT id FROM voice_sessions WHERE livekit_room_name = $1 LIMIT 1`,
                [roomName]
            );
            if (inboundSession) {
                await updateSessionStatus(inboundSession.id, 'connected');
                console.log('[Webhook] inbound_session_connected', { session_id: inboundSession.id, participant: participantIdentity });
            }
        }
        return;
    }

    if (eventType !== 'room_finished') {
        return;
    }
    await handleRoomFinished(event);
}

/**
 * Auto-creates a voice session for an inbound SIP call.
 *
 * When a SIP INVITE arrives, LiveKit creates a room using the dispatch rule's
 * roomPrefix (call-{tenantShort}-). Our backend is NOT the initiator, so no
 * session exists yet. We extract tenant_id from room metadata and create one.
 */
async function handleInboundRoomStarted(roomName: string, event: any): Promise<void> {
    try {
        // LiveKit puts the dispatch rule metadata on the room object
        const roomMetadata = event?.room?.metadata;
        let tenantId: string | null = null;

        if (roomMetadata) {
            try {
                const parsed = JSON.parse(roomMetadata);
                tenantId = parsed?.tenant_id ?? null;
            } catch {
                // metadata might not be JSON
            }
        }

        // Fallback: extract tenant hex prefix from room name (call-{8hexchars}-)
        // and look up full tenant ID from DB.
        // roomPrefix format = call-{first8hexcharsOfTenantId}-
        if (!tenantId) {
            const match = roomName.match(/^call-([0-9a-f]{8})-/i);
            if (match) {
                const tenantHexPrefix = (match[1] ?? '').toLowerCase();
                const tenant = await queryOne<{ id: string }>(
                    // Match tenants where the first 8 hex chars of the UUID (sans dashes) = prefix
                    `SELECT id FROM tenants WHERE REPLACE(id::text, '-', '') LIKE $1 LIMIT 1`,
                    [`${tenantHexPrefix}%`]
                );
                tenantId = tenant?.id ?? null;
            }
        }

        if (!tenantId) {
            console.warn('[Webhook] inbound_room_tenant_not_found', { room_name: roomName });
            incrementMetric('webhook.inbound_room.tenant_not_found');
            return;
        }

        // Extract caller info from SIP participant if available
        const sipParticipants = event?.participants ?? [];
        const sipFrom = sipParticipants.find((p: any) => p.identity?.startsWith('sip-'));
        const callerNumber = sipFrom?.attributes?.['sip.trunkPhoneNumber'] ?? 'unknown';

        // Create a voice session for this inbound call
        // Pass the room name directly so startSession uses it instead of generating one
        const session = await startSession({
            tenant_id: tenantId,
            direction: 'inbound',
            visitor_metadata: {
                source: 'sip_inbound',
                caller_number: callerNumber,
                livekit_room: roomName,
            },
        });

        // Update the session's room name to match the LiveKit-created room
        // (startSession generates its own room name — we must override it)
        await queryOne(
            `UPDATE voice_sessions SET livekit_room_name = $1, status = 'ringing' WHERE id = $2`,
            [roomName, session.session_id]
        );

        console.log('[Webhook] inbound_session_created', {
            session_id: session.session_id,
            tenant_id: tenantId,
            room_name: roomName,
            caller: callerNumber,
        });
        incrementMetric('webhook.inbound_room.session_created');
    } catch (error: any) {
        console.error('[Webhook] inbound_session_creation_failed', {
            room_name: roomName,
            error: error.message,
        });
        incrementMetric('webhook.inbound_room.session_creation_failed');
    }
}

async function handleRoomFinished(event: any): Promise<void> {
    const room = event?.room;
    if (!room) return;

    const roomName = room.name as string;
    const fallbackEndMs = Date.now();

    console.log('[Webhook] room_finished_received', { room_name: roomName });

    const fallbackSessionId = parseSessionIdFromRoomName(roomName);
    const session = await findSessionForRoomFinished(roomName, fallbackSessionId);

    if (!session) {
        console.warn('[Webhook] room_finished_session_not_found', { room_name: roomName });
        incrementMetric('webhook.room_finished.session_not_found');
        return;
    }

    const durationComputation = computeDurationSeconds(session, room, fallbackEndMs);
    const roomDurationSeconds = durationComputation.durationSeconds;

    if (durationComputation.anomaly) {
        incrementMetric('billing.duration_anomaly');
        console.warn('[Webhook] duration_anomaly_detected', {
            session_id: session.id,
            room_name: roomName,
            reason: durationComputation.reason,
            computed_duration_seconds: roomDurationSeconds,
        });
    }

    console.log('[Webhook] room_finished_resolved', {
        session_id: session.id,
        tenant_id: session.tenant_id,
        room_name: roomName,
        duration_seconds: roomDurationSeconds,
        duration_source: durationComputation.reason,
    });

    await persistWebhookDurationAudit({
        sessionId: session.id,
        durationSeconds: roomDurationSeconds,
        durationSource: durationComputation.reason,
        durationAnomaly: durationComputation.anomaly,
    });

    if (session.status === 'completed') {
        incrementMetric('webhook.room_finished.already_settled');
        return;
    }
    if (session.status === 'active') {
        incrementMetric('webhook.room_finished.recovery_path');
        await recoverCrashedSession(session, roomDurationSeconds);
        return;
    }
    if (session.status === 'pending') {
        incrementMetric('webhook.room_finished.pending_cancel_path');
        await cancelAbandonedSession(session);
        return;
    }

    console.warn('[Webhook] room_finished_unexpected_status', {
        session_id: session.id,
        status: session.status,
    });
}

async function recoverCrashedSession(
    session: FinishedRoomSessionRow,
    durationSeconds: number
): Promise<void> {
    const sessionId = session.id;
    const tenantId = session.tenant_id;
    const holdId = session.hold_id;
    const presetSnapshot = session.preset_snapshot;

    console.warn('[Webhook] AGENT_CRASH_RECOVERY', {
        session_id: sessionId,
        tenant_id: tenantId,
        duration_seconds: durationSeconds,
    });

    if (holdId) {
        const pricePerMin = presetSnapshot?.price_per_min || 5;
        const billedMinutes = Math.ceil(durationSeconds / 60);
        const actualCost = billedMinutes * pricePerMin;

        try {
            await settleSessionHold(holdId, actualCost);
        } catch (err) {
            console.error('[Webhook] hold_settlement_failed', {
                hold_id: holdId,
                error: err instanceof Error ? err.message : String(err),
            });
        }
    } else if (durationSeconds > 0) {
        incrementMetric('billing.webhook_recovery_missing_hold');
        console.error('[Webhook] recovery_missing_hold', {
            session_id: sessionId,
            tenant_id: tenantId,
            duration_seconds: durationSeconds,
        });
    }

    await markRecoveredSessionCompleted(sessionId, durationSeconds);
}

async function cancelAbandonedSession(session: FinishedRoomSessionRow): Promise<void> {
    const sessionId = session.id;
    const holdId = session.hold_id;

    console.log('[Webhook] AGENT_NEVER_JOINED', { session_id: sessionId });

    if (holdId) {
        try {
            await releaseSessionHold(holdId);
        } catch (err) {
            console.error('[Webhook] hold_release_failed', {
                hold_id: holdId,
                error: err instanceof Error ? err.message : String(err),
            });
        }
    }

    await markPendingSessionCancelled(sessionId);
}
