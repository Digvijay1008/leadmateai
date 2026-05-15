/**
 * LiveKit Service
 * 
 * Handles real LiveKit token generation and room management.
 * Uses the official livekit-server-sdk.
 */

import { AccessToken, RoomServiceClient, AgentDispatchClient, DataPacket_Kind } from 'livekit-server-sdk';
import { config } from '../../core/index.js';
import { generateId, generateCanonicalRoomName } from '../../shared/index.js';
import { ValidationError } from '../../shared/index.js';
import { incrementMetric } from '../../shared/index.js';
import type { AgentSessionManifest } from '../../shared/index.js';

// ===========================================
// TYPES
// ===========================================

export interface LiveKitTokenOptions {
    sessionId: string;
    tenantId: string;
    identity: string;
    name?: string;
    participantType: 'user' | 'agent';
    maxDurationSeconds: number;
    metadata?: Record<string, unknown>;
}

export interface LiveKitTokenResult {
    token: string;
    roomName: string;
    livekitUrl: string;
    identity: string;
    expiresAt: Date;
}

export interface RoomMetadata {
    sessionId: string;
    tenantId: string;
    maxDurationSeconds: number;
    createdAt: string;
}

// ===========================================
// LIVEKIT CLIENT INITIALIZATION
// ===========================================

let roomServiceClient: RoomServiceClient | null = null;
let agentDispatchClient: AgentDispatchClient | null = null;

function getRoomServiceClient(): RoomServiceClient {
    if (!roomServiceClient) {
        if (!config.livekit.url || !config.livekit.apiKey || !config.livekit.apiSecret) {
            throw new ValidationError('LiveKit configuration incomplete');
        }
        const httpUrl = config.livekit.url
            .replace('wss://', 'https://')
            .replace('ws://', 'http://');
        roomServiceClient = new RoomServiceClient(httpUrl, config.livekit.apiKey, config.livekit.apiSecret);
    }
    return roomServiceClient;
}

function getAgentServiceClient(): AgentDispatchClient {
    if (!agentDispatchClient) {
        const httpUrl = (config.livekit.url || 'https://localhost')
            .replace('wss://', 'https://')
            .replace('ws://', 'http://');
        agentDispatchClient = new AgentDispatchClient(httpUrl, config.livekit.apiKey, config.livekit.apiSecret);
    }
    return agentDispatchClient;
}
// ===========================================
// TOKEN GENERATION
// ===========================================

/**
 * Generate a LiveKit access token for a participant.
 * 
 * Token contains:
 * - Room access grants
 * - Participant identity
 * - Session metadata
 * - Expiration (session max duration + buffer)
 */
export async function generateLiveKitToken(
    options: LiveKitTokenOptions
): Promise<LiveKitTokenResult> {
    if (!config.livekit.apiKey || !config.livekit.apiSecret) {
        throw new ValidationError('LiveKit API credentials not configured');
    }

    const {
        sessionId,
        tenantId,
        identity,
        name,
        participantType,
        maxDurationSeconds,
        metadata,
    } = options;

    const roomName = generateCanonicalRoomName(sessionId, tenantId);

    // Token expires after max duration + 5 minute buffer
    const tokenTtlSeconds = maxDurationSeconds + 300;

    // Build participant metadata
    const participantMetadata = JSON.stringify({
        sessionId,
        tenantId,
        participantType,
        maxDurationSeconds,
        ...metadata,
    });

    // Create access token
    const token = new AccessToken(
        config.livekit.apiKey,
        config.livekit.apiSecret,
        {
            identity,
            name: name || identity,
            ttl: tokenTtlSeconds,
            metadata: participantMetadata,
        }
    );

    // Grant room access
    token.addGrant({
        room: roomName,
        roomJoin: true,
        canPublish: participantType === 'user',  // Only users publish audio
        canSubscribe: true,
        canPublishData: true,
    });

    const jwt = await token.toJwt();

    return {
        token: jwt,
        roomName,
        livekitUrl: config.livekit.url || '',
        identity,
        expiresAt: new Date(Date.now() + tokenTtlSeconds * 1000),
    };
}

/**
 * Generate a token for a user (widget/browser).
 */
export async function generateUserToken(
    sessionId: string,
    tenantId: string,
    maxDurationSeconds: number,
    metadata?: Record<string, unknown>
): Promise<LiveKitTokenResult> {
    // Generate unique identity for user
    const userIdentity = `user-${generateId().substring(0, 8)}`;

    return generateLiveKitToken({
        sessionId,
        tenantId,
        identity: userIdentity,
        name: 'User',
        participantType: 'user',
        maxDurationSeconds,
        metadata,
    });
}

/**
 * Generate a token for the agent.
 */
export async function generateAgentToken(
    sessionId: string,
    tenantId: string,
    maxDurationSeconds: number
): Promise<LiveKitTokenResult> {
    const agentIdentity = `agent-${sessionId.substring(0, 8)}`;

    return generateLiveKitToken({
        sessionId,
        tenantId,
        identity: agentIdentity,
        name: 'AI Assistant',
        participantType: 'agent',
        maxDurationSeconds,
    });
}

// ===========================================
// ROOM MANAGEMENT
// ===========================================

/**
 * Create or ensure a LiveKit room exists.
 * 
 * Room is created with metadata containing session info.
 */
export async function ensureRoomExists(
    sessionId: string,
    tenantId: string,
    maxDurationSeconds: number
): Promise<{ roomName: string; created: boolean }> {
    const roomName = generateCanonicalRoomName(sessionId, tenantId);
    const client = getRoomServiceClient();

    // Build room metadata
    const roomMetadata: RoomMetadata = {
        sessionId,
        tenantId,
        maxDurationSeconds,
        createdAt: new Date().toISOString(),
    };

    try {
        // Try to get existing room
        const rooms = await client.listRooms([roomName]);

        if (rooms.length > 0) {
            // Room exists
            return { roomName, created: false };
        }

        // Create new room
        await client.createRoom({
            name: roomName,
            emptyTimeout: 60,  // Close room 60s after last participant leaves
            // Outbound dashboard calls can have the browser user, the AI agent,
            // and the SIP participant in the room at the same time.
            maxParticipants: 4,
            metadata: JSON.stringify(roomMetadata),
        });

        return { roomName, created: true };

    } catch (error) {
        // If room already exists (race condition), that's fine
        const errorMessage = error instanceof Error ? error.message : String(error);
        if (errorMessage.includes('already exists')) {
            return { roomName, created: false };
        }
        incrementMetric('livekit.room_create_failed');
        console.error('[LiveKit] room_create_failed', { room_name: roomName, error: errorMessage });
        throw error;
    }
}

/**
 * Get room info including participant count.
 */
export async function getRoomInfo(roomName: string): Promise<{
    exists: boolean;
    participantCount: number;
    metadata: RoomMetadata | null;
} | null> {
    try {
        const client = getRoomServiceClient();
        const rooms = await client.listRooms([roomName]);

        if (rooms.length === 0) {
            return { exists: false, participantCount: 0, metadata: null };
        }

        const room = rooms[0];
        let metadata: RoomMetadata | null = null;

        if (room?.metadata) {
            try {
                metadata = JSON.parse(room.metadata) as RoomMetadata;
            } catch {
                // Ignore parse errors
            }
        }

        return {
            exists: true,
            participantCount: room?.numParticipants ?? 0,
            metadata,
        };

    } catch (error) {
        console.error('Error getting room info:', error);
        return null;
    }
}

/**
 * Close a room and disconnect all participants.
 */
export async function closeRoom(roomName: string): Promise<void> {
    try {
        const client = getRoomServiceClient();
        await client.deleteRoom(roomName);
    } catch (error) {
        // Ignore if room doesn't exist
        const errorMessage = error instanceof Error ? error.message : String(error);
        if (!errorMessage.includes('not found')) {
            throw error;
        }
    }
}

/**
 * Send data to all participants in a room.
 * Used for signaling (e.g., session ending, balance low).
 */
export async function sendRoomData(
    roomName: string,
    data: Record<string, unknown>,
    destinationIdentities?: string[]
): Promise<void> {
    const client = getRoomServiceClient();

    const payload = Buffer.from(JSON.stringify(data));

    await client.sendData(
        roomName,
        payload,
        DataPacket_Kind.RELIABLE,
        {
            topic: 'leadmate-signal',
            destinationIdentities,
        }
    );
}

// ===========================================
// AGENT DISPATCH
// ===========================================

/**
 * Dispatch an agent to join a room.
 * 
 * This creates the room and signals LiveKit's agent dispatch system.
 * The agent worker will pick up the job automatically.
 */
export async function dispatchAgentToRoom(
    sessionId: string,
    tenantId: string,
    maxDurationSeconds: number,
    manifest: AgentSessionManifest
): Promise<{ roomName: string; agentToken: string }> {
    try {
        // Ensure room exists with session metadata
        const { roomName } = await ensureRoomExists(
            sessionId,
            tenantId,
            maxDurationSeconds
        );

        // Write full manifest into room metadata so the agent can read it
        const client = getRoomServiceClient();
        await client.updateRoomMetadata(
            roomName,
            JSON.stringify({
                sessionId,
                tenantId,
                maxDurationSeconds,
                manifest,
                dispatchedAt: new Date().toISOString(),
            })
        );

        // CRITICAL: Explicitly dispatch the agent worker to this room.
        // Without this call, the agent worker never receives a job and the
        // call connects but the AI never joins â†’ 6-12s timeout â†’ disconnect.
        const agentClient = getAgentServiceClient();
        await agentClient.createDispatch(
            roomName,
            process.env.LIVEKIT_AGENT_NAME || 'leadmate-agent',
            { metadata: JSON.stringify(manifest) }
        );

        console.log('[LiveKit] agent_dispatch_sent', {
            room: roomName,
            agent: config.livekit.agentName,
            session_id: sessionId,
        });

        // Generate agent token (kept for web widget compatibility)
        const agentTokenResult = await generateAgentToken(
            sessionId,
            tenantId,
            maxDurationSeconds
        );

        return {
            roomName,
            agentToken: agentTokenResult.token,
        };
    } catch (error) {
        incrementMetric('livekit.agent_dispatch_failed', { tenant_id: tenantId });
        console.error('[LiveKit] agent_dispatch_failed', {
            session_id: sessionId,
            tenant_id: tenantId,
            error: error instanceof Error ? error.message : String(error),
        });
        throw error;
    }
}
