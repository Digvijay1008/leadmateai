/**
 * Dev-only test route for generating LiveKit tokens with agent dispatch.
 * Sends a REAL manifest so the full multi-tenant pipeline is tested.
 * DO NOT use in production — production uses the full session flow.
 */

import { Router, Request, Response } from 'express';
import { AccessToken } from 'livekit-server-sdk';
import { RoomAgentDispatch, RoomConfiguration } from '@livekit/protocol';
import { config } from '../../../../core/index.js';
import { v4 as uuidv4 } from 'uuid';

const router = Router();

/**
 * GET /api/v1/test/token?room=optional&provider=groq
 *
 * Returns a LiveKit token with embedded manifest for testing.
 * Agent reads manifest and configures providers accordingly.
 */
router.get('/token', async (req: Request, res: Response) => {
    if (!config.server.isDev) {
        return res.status(403).json({ error: 'Test endpoints are disabled in production' });
    }

    try {
        const sessionId = `test-${uuidv4().slice(0, 8)}`;
        const roomName = (req.query.room as string) || `uchchar-session-${sessionId}`;
        const participantName = `test-user-${uuidv4().slice(0, 6)}`;

        // Allow selecting LLM provider via query param (default: groq)
        const llmProvider = (req.query.provider as string) || 'groq';
        const llmModel = llmProvider === 'openai'
            ? 'gpt-4o-mini'
            : 'llama-3.3-70b-versatile';

        if (!['groq', 'openai'].includes(llmProvider)) {
            return res.status(400).json({ error: 'Supported test providers: groq, openai' });
        }

        if (!config.livekit.apiKey || !config.livekit.apiSecret) {
            return res.status(500).json({ error: 'LiveKit not configured' });
        }

        // Build test manifest — same structure as production
        const manifest = {
            session_id: sessionId,
            tenant_id: 'test-tenant-clinic-a',
            max_duration_seconds: 300,
            inactivity_timeout_seconds: 30,
            voice: {
                persona_id: 'priya',
                provider: 'deepgram',
                voice_id: 'thalia',
                speaking_rate: 1.0,
            },
            stt: {
                provider: 'deepgram',
                model: 'nova-3',
                language: 'en-US',
            },
            llm: {
                provider: llmProvider,
                model: llmModel,
                system_prompt:
                    'You are Priya, a friendly receptionist at Sharma Clinic. ' +
                    'You help patients book appointments and answer questions about the clinic. ' +
                    'Clinic hours: Monday-Saturday 9 AM to 6 PM. ' +
                    'Dr. Sharma specializes in general medicine. ' +
                    'Keep responses concise and conversational.',
                temperature: 0.7,
            },
            tts: {
                provider: 'deepgram',
                model: 'aura-2-thalia-en',
                voice_id: 'thalia',
            },
            greeting_message: 'Welcome to Sharma Clinic! How can I help you today?',
            goodbye_message: 'Thank you for calling Sharma Clinic. Have a great day!',
            tools_enabled: [],
            backend_api_url: `http://localhost:${config.server.port}`,
            backend_auth_token: 'test-token-dev',
        };

        // Create token with embedded dispatch + manifest
        const token = new AccessToken(
            config.livekit.apiKey,
            config.livekit.apiSecret,
            {
                identity: participantName,
                name: 'Test User',
            }
        );

        token.addGrant({
            roomJoin: true,
            room: roomName,
            canPublish: true,
            canSubscribe: true,
            canPublishData: true,
        });

        // Embed agent dispatch with full manifest in room config
        token.roomConfig = new RoomConfiguration({
            agents: [
                new RoomAgentDispatch({
                    agentName: 'uchchar-agent',
                    metadata: JSON.stringify({ manifest }),
                }),
            ],
        });

        const jwt = await token.toJwt();

        console.log(
            `[Test] Token created for ${participantName} → room ${roomName} ` +
            `(agent: uchchar-agent, LLM: ${llmProvider}/${llmModel})`
        );

        res.json({
            token: jwt,
            room_name: roomName,
            livekit_url: config.livekit.url,
            participant: participantName,
            manifest_preview: {
                session_id: sessionId,
                tenant_id: manifest.tenant_id,
                stt: `${manifest.stt.provider}/${manifest.stt.model}`,
                llm: `${manifest.llm.provider}/${manifest.llm.model}`,
                tts: `${manifest.tts.provider}/${manifest.tts.model}`,
            },
        });

    } catch (error: any) {
        console.error('[Test] Token generation error:', error);
        res.status(500).json({ error: error.message });
    }
});

export default router;
