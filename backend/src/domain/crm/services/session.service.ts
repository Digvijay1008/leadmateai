import jwt from 'jsonwebtoken';
import { config } from '../../../core/index.js';
import {
    generateUserToken,
    dispatchAgentToRoom,
} from '../../../platform/index.js';
import {
    getTenantWithConfig,
    getVoicePersona,
} from '../repositories/tenant.repository.js';
import {
    createPresetSnapshot,
} from '../repositories/preset.repository.js';
import {
    createSession,
    getSessionById,
    activateSession,
    endSessionWithBilling,
    cancelSession,
    attachSessionHold,
} from '../repositories/session.repository.js';
import { queryOne } from '../../../platform/index.js';
import {
    getWalletBalance as getWalletBalanceData,
} from '../repositories/wallet.repository.js';
import {
    checkSessionAffordability,
    createSessionHold,
    releaseSessionHold,
} from './wallet.service.js';
import {
    calculateBilledSeconds,
    calculateCost,
} from '../../../shared/index.js';
import { incrementMetric, withTiming } from '../../../shared/index.js';
import {
    NotFoundError,
    TenantSuspendedError,
    SessionNotFoundError,
    ValidationError,
} from '../../../shared/index.js';
import {
    VoiceConfigSnapshot,
    VoiceSessionStatus,
    isTerminalStatus,
} from '../../../shared/index.js';
import type {
    StartSessionRequest,
    StartSessionResponse,
    EndSessionRequest,
    EndSessionResponse,
    AgentSessionManifest,
} from '../../../shared/index.js';
import { getAgentConfig } from './agent-config.service.js';

// ===========================================
// INTERNAL HELPERS
// ===========================================

/**
 * Get wallet balance as a number (for internal use)
 */
async function getWalletBalanceValue(tenantId: string): Promise<number> {
    const balance = await getWalletBalanceData(tenantId);
    return balance ?? 0;
}

function buildVoiceConfigSnapshot(params: {
    voiceConfig: any;
    tenant: { business_name: string; system_prompt?: string | null; greeting_message?: string | null };
    maxDurationSeconds: number;
}): VoiceConfigSnapshot {
    const { voiceConfig, tenant, maxDurationSeconds } = params;
    const systemPromptText =
        tenant.system_prompt ||
        buildSystemPrompt(tenant.business_name, voiceConfig.system_prompt_template);
    const greetingMessageText = tenant.greeting_message || voiceConfig.greeting_message;

    return {
        voice_persona_id: voiceConfig.voice_persona_id,
        agent_name: voiceConfig.agent_name,
        system_prompt: systemPromptText,
        greeting_message: greetingMessageText,
        goodbye_message: voiceConfig.goodbye_message,
        tools_enabled: voiceConfig.tools_enabled,
        max_session_duration_seconds: Math.min(
            voiceConfig.max_session_duration_seconds || config.session.defaultMaxDurationSeconds,
            maxDurationSeconds
        ),
        inactivity_timeout_seconds: voiceConfig.inactivity_timeout_seconds || config.session.inactivityTimeoutSeconds,
    };
}

async function resolveKnowledgeBaseId(tenantId: string): Promise<string | null> {
    const docQuery = await queryOne<{ count: string }>(
        `SELECT COUNT(*) as count FROM kb_documents WHERE tenant_id = $1 AND status = 'ready'`,
        [tenantId]
    );
    const kbDocumentCount = parseInt(docQuery?.count ?? '0', 10);
    return kbDocumentCount > 0 ? tenantId : null;
}

function mapEndReasonToStatus(endReason: string): VoiceSessionStatus {
    const statusMap: Record<string, VoiceSessionStatus> = {
        user_hangup: 'completed',
        agent_hangup: 'completed',
        timeout: 'timeout',
        max_duration: 'max_duration',
        error: 'failed',
        insufficient_funds: 'insufficient_funds',
    };
    return statusMap[endReason] ?? 'completed';
}

/**
 * Resolve model ID for a given provider (TTS defaults).
 */
function resolveDefaultTTSModel(provider: string, voiceId: string): string {
    switch (provider) {
        case 'deepgram':    return voiceId || 'aura-2-thalia-en';
        case 'elevenlabs':  return 'eleven_turbo_v2_5';
        case 'sarvam':      return 'bulbul:v3';
        case 'openai':      return 'tts-1';
        case 'cartesia':    return 'sonic-english';
        default:            return voiceId;
    }
}

/**
 * Resolve model ID for a given STT provider.
 */
function resolveDefaultSTTModel(provider: string): string {
    switch (provider) {
        case 'deepgram':  return 'nova-3';
        case 'openai':    return 'whisper-1';
        case 'sarvam':    return 'saarika:v2';
        default:          return 'nova-3';
    }
}

/**
 * Build the manifest that the Python agent will receive.
 * ALL settings sourced from the AgentConfig (tenants table).
 * The presetSnapshot is only used for billing/pricing — never for provider config.
 */
async function buildManifestFromAgentConfig(params: {
    sessionId: string;
    tenantId: string;
    sessionMaxDurationSeconds: number | null;
    agentAuthToken: string;
    knowledgeBaseId: string | null;
}): Promise<AgentSessionManifest> {
    const { sessionId, tenantId, sessionMaxDurationSeconds, agentAuthToken, knowledgeBaseId } = params;

    // Pull the LIVE agent configuration from the database
    const agentCfg = await getAgentConfig(tenantId);

    if (!agentCfg) {
        throw new NotFoundError('Agent configuration');
    }

    // Resolve providers with safe defaults
    const llmProvider   = agentCfg.llm_provider   || 'openai';
    const llmModel      = agentCfg.llm_model       || 'gpt-4o-mini';
    const temperature   = agentCfg.temperature     ?? 0.7;
    const ttsProvider   = agentCfg.tts_provider    || 'deepgram';
    const ttsVoiceId    = agentCfg.tts_voice_id    || 'aura-2-thalia-en';
    const ttsLanguage   = agentCfg.tts_language    || 'en-US';
    const speechSpeed   = agentCfg.speech_speed    ?? 1.0;
    const sttProvider   = agentCfg.stt_provider    || 'deepgram';
    const sttLanguage   = agentCfg.stt_language    || 'en-US';

    // Build tools_enabled from boolean flags
    const toolsEnabled: string[] = [];
    if (agentCfg.booking_enabled)      toolsEnabled.push('book_appointment', 'check_availability');
    if (agentCfg.capture_lead_enabled) toolsEnabled.push('capture_lead');
    if (agentCfg.transfer_enabled)     toolsEnabled.push('transfer_to_human');
    // merge any explicitly set tools array
    if (agentCfg.enabled_tools?.length) {
        for (const t of agentCfg.enabled_tools) {
            if (!toolsEnabled.includes(t)) toolsEnabled.push(t);
        }
    }

    const manifest: AgentSessionManifest = {
        session_id:   sessionId,
        tenant_id:    tenantId,

        max_duration_seconds:      sessionMaxDurationSeconds ?? config.session.defaultMaxDurationSeconds,
        inactivity_timeout_seconds: Math.floor((agentCfg.silence_timeout_ms ?? 10000) / 1000),
        silence_timeout_ms:         agentCfg.silence_timeout_ms ?? 10000,

        voice: {
            persona_id:   'dynamic',
            provider:     ttsProvider,
            voice_id:     ttsVoiceId,
            speaking_rate: speechSpeed,
        },

        stt: {
            provider: sttProvider,
            model:    resolveDefaultSTTModel(sttProvider),
            language: sttLanguage,
        },

        llm: {
            provider:     llmProvider,
            model:        llmModel,
            system_prompt: agentCfg.system_prompt || 'You are a helpful AI voice assistant.',
            temperature,
        },

        tts: {
            provider: ttsProvider,
            model:    resolveDefaultTTSModel(ttsProvider, ttsVoiceId),
            voice_id: ttsVoiceId,
            language: ttsLanguage,
        },

        greeting_message:        agentCfg.greeting_message || 'Hello! How can I help you today?',
        goodbye_message:         'Thank you for calling. Goodbye!',
        fallback_message:        agentCfg.fallback_message || "I'm sorry, I'm having trouble. Let me connect you to someone who can help.",
        interruption_sensitivity: (agentCfg.interruption_sensitivity as any) || 'immediate',
        voicemail_behavior:      agentCfg.voicemail_behavior || 'hangup',
        tools_enabled:           toolsEnabled,

        backend_api_url:   process.env.BACKEND_API_URL ?? 'http://localhost:3001',
        backend_auth_token: agentAuthToken,

        knowledge_base_id: knowledgeBaseId,
    };

    console.log('[Manifest] built_from_agent_config', {
        session_id:   sessionId,
        tenant_id:    tenantId,
        llm:          `${llmProvider}/${llmModel}`,
        tts:          `${ttsProvider}/${ttsVoiceId}`,
        stt:          `${sttProvider}/${sttLanguage}`,
        tools:        toolsEnabled,
        temperature,
        speech_speed: speechSpeed,
        interruption: agentCfg.interruption_sensitivity,
    });

    return manifest;
}

// ===========================================
// SESSION SERVICE
// ===========================================

/**
 * Start a new voice session
 * This is the main entry point for session creation
 */
export async function startSession(
    request: StartSessionRequest
): Promise<StartSessionResponse> {
    const { tenant_id, session_id, visitor_metadata, phone_number, direction, lead_id } = request;

    if (session_id) {
        // Reconnect Flow
        const existingSession = await getSessionById(session_id);
        if (!existingSession || existingSession.tenant_id !== tenant_id) {
            throw new SessionNotFoundError(session_id);
        }
        if (isTerminalStatus(existingSession.status)) {
            throw new ValidationError('Cannot reconnect to an ended session');
        }

        const voiceConfigSnapshot = existingSession.voice_config_snapshot as VoiceConfigSnapshot;
        
        const livekitTokenResult = await generateUserToken(
            session_id,
            tenant_id,
            existingSession.max_duration_seconds ?? voiceConfigSnapshot.max_session_duration_seconds,
            { holdId: existingSession.hold_id }
        );

        return {
            session_id,
            livekit_room_name: livekitTokenResult.roomName,
            livekit_token: livekitTokenResult.token,
            livekit_url: livekitTokenResult.livekitUrl,
            max_duration_seconds: voiceConfigSnapshot.max_session_duration_seconds,
            greeting_message: voiceConfigSnapshot.greeting_message,
            agent_name: voiceConfigSnapshot.agent_name,
        };
    }

    // 1. Validate tenant exists and is active
    const tenantWithConfig = await getTenantWithConfig(tenant_id);

    if (!tenantWithConfig) {
        throw new NotFoundError('Tenant');
    }

    const { tenant, voiceConfig } = tenantWithConfig;

    if (tenant.status === 'suspended' || tenant.status === 'cancelled') {
        throw new TenantSuspendedError(tenant_id);
    }

    // 2. Resolve preset ID (fallback to default if missing)
    let presetId = voiceConfig.preset_id;
    if (!presetId) {
        const { listActivePresets } = await import('../repositories/preset.repository.js');
        const presets = await listActivePresets();
        if (presets && presets.length > 0 && presets[0]) {
            presetId = presets[0].id;
        } else {
            throw new NotFoundError('No voice presets available in the system');
        }
    }

    // 3. Check wallet balance and get max duration
    const affordability = await checkSessionAffordability(
        tenant_id,
        presetId
    );

    // 4. Create preset snapshot (locks in pricing)
    const presetSnapshot = await createPresetSnapshot(presetId);

    if (!presetSnapshot) {
        throw new NotFoundError('Voice preset');
    }

    // 4. Get voice persona for TTS configuration
    const voicePersona = await getVoicePersona(voiceConfig.voice_persona_id);

    // 5. Resolve optional KB context
    const knowledgeBaseId = await resolveKnowledgeBaseId(tenant_id);

    // 6. Build voice config snapshot
    const voiceConfigSnapshot = buildVoiceConfigSnapshot({
        tenant,
        voiceConfig,
        maxDurationSeconds: affordability.maxDurationSeconds,
    });

    // 7. Create session record first (needed for hold reference)
    const session = await createSession({
        tenantId: tenant_id,
        presetSnapshot,
        voiceConfigSnapshot,
        maxDurationSeconds: voiceConfigSnapshot.max_session_duration_seconds,
        holdId: null, // Will update after hold creation
        visitorMetadata: visitor_metadata,
        phoneNumber: phone_number,
        direction,
        leadId: lead_id,
    });

    // 7. Create wallet hold
    let hold: { id: string } | null = null;
    try {
        hold = await createSessionHold(
            tenant_id,
            session.id,
            voiceConfigSnapshot.max_session_duration_seconds,
            presetSnapshot.price_per_min
        );

        // Persist hold_id for webhook/billing reconciliation paths.
        await attachSessionHold(session.id, hold.id);
    } catch (error) {
        incrementMetric('billing.hold_creation_failed', { tenant_id });
        if (hold?.id) {
            try {
                await releaseSessionHold(hold.id);
            } catch (releaseError) {
                incrementMetric('billing.hold_release_failed', { tenant_id });
                console.error('[Session] session_start_hold_release_failed', {
                    session_id: session.id,
                    tenant_id,
                    hold_id: hold.id,
                    error: releaseError instanceof Error ? releaseError.message : String(releaseError),
                });
            }
        }
        console.error('[Session] session_start_hold_creation_failed', {
            session_id: session.id,
            tenant_id,
            error: error instanceof Error ? error.message : String(error),
        });
        // Best-effort rollback of pending session on hold failure.
        await cancelSession(session.id);
        throw error;
    }
    const holdId = hold?.id;
    if (!holdId) {
        throw new Error('Hold creation returned no hold_id');
    }

    let livekitTokenResult: Awaited<ReturnType<typeof generateUserToken>> | null = null;
    try {
        // 8. Generate REAL LiveKit token for user
        livekitTokenResult = await generateUserToken(
            session.id,
            tenant_id,
            voiceConfigSnapshot.max_session_duration_seconds,
            { holdId }
        );

        // 10. Dispatch agent to the room with full manifest sourced from AgentConfig
        const agentAuthToken = jwt.sign(
            { session_id: session.id, tenant_id, type: 'agent' },
            config.jwt.secret,
            { expiresIn: '2h' }
        );

        const agentManifest = await buildManifestFromAgentConfig({
            sessionId:                session.id,
            tenantId:                 tenant_id,
            sessionMaxDurationSeconds: voiceConfigSnapshot.max_session_duration_seconds,
            agentAuthToken,
            knowledgeBaseId,
        });

        await dispatchAgentToRoom(
            session.id,
            tenant_id,
            voiceConfigSnapshot.max_session_duration_seconds,
            agentManifest
        );
    } catch (error) {
        incrementMetric('livekit.dispatch_stage_failed', { tenant_id });
        try {
            await releaseSessionHold(holdId);
        } catch (releaseError) {
            console.error('[Session] dispatch_failure_hold_release_failed', {
                session_id: session.id,
                tenant_id,
                hold_id: holdId,
                error: releaseError instanceof Error ? releaseError.message : String(releaseError),
            });
        }
        await cancelSession(session.id);
        throw error;
    }
    if (!livekitTokenResult) {
        throw new Error('LiveKit token generation failed');
    }

    console.log('[Session] session_started', {
        session_id: session.id,
        tenant_id,
        room_name: livekitTokenResult.roomName,
        hold_id: holdId,
    });
    incrementMetric('session.started', { tenant_id });

    // 10. Return session details
    return {
        session_id: session.id,
        livekit_room_name: livekitTokenResult.roomName,
        livekit_token: livekitTokenResult.token,
        livekit_url: livekitTokenResult.livekitUrl,
        max_duration_seconds: voiceConfigSnapshot.max_session_duration_seconds,
        greeting_message: voiceConfigSnapshot.greeting_message,
        agent_name: voiceConfigSnapshot.agent_name,
    };
}

/**
 * End a voice session
 * Calculates billing and settles the hold
 * 
 * IDEMPOTENT: If session is already ended, returns the previous result.
 * This is critical for money safety - prevents double-charging on retries.
 */
export async function endVoiceSession(
    request: EndSessionRequest
): Promise<EndSessionResponse> {
    const {
        session_id,
        duration_seconds,
        end_reason,
        transcript,
        transcript_summary,
        tool_calls_count,
        user_turns_count,
        agent_turns_count,
    } = request;

    // 1. Get session
    const session = await getSessionById(session_id);

    if (!session) {
        throw new SessionNotFoundError(session_id);
    }

    // 2. IDEMPOTENCY CHECK: If session is already ended, return cached result
    if (isTerminalStatus(session.status)) {
        // Session already ended - return the existing result (idempotent)
        const presetSnapshot = session.preset_snapshot as any;

        // Get current wallet balance for response
        const walletBalance = await getWalletBalanceValue(session.tenant_id);

        return {
            session_id,
            status: session.status,
            duration_seconds: session.duration_seconds ?? 0,
            billed_seconds: session.billed_seconds ?? 0,
            cost_total: session.cost_total ?? 0,
            currency: presetSnapshot.currency ?? 'INR',
            wallet_balance_after: walletBalance,
        };
    }

    // 3. Calculate billing
    const presetSnapshot = session.preset_snapshot as any;
    const billedSeconds = calculateBilledSeconds(duration_seconds);
    const costTotal = calculateCost(billedSeconds, presetSnapshot.price_per_min);
    if (!session.hold_id && costTotal > 0) {
        incrementMetric('billing.missing_hold_on_settlement', { tenant_id: session.tenant_id });
        console.error('[Billing] missing_hold_on_settlement', {
            session_id,
            tenant_id: session.tenant_id,
            cost_total: costTotal,
        });
    }

    // 4. Map end reason to status
    const status = mapEndReasonToStatus(end_reason);

    // 5. Update session record and settle billing in a SINGLE transaction
    // This is critical for preventing double charges and ensuring data integrity
    const result = await withTiming(
        'billing.end_session_tx_ms',
        () => endSessionWithBilling({
            sessionId: session_id,
            tenantId: session.tenant_id,
            status,
            durationSeconds: duration_seconds,
            billedSeconds,
            costTotal,
            endReason: end_reason,
            transcript,
            transcriptSummary: transcript_summary,
            toolCallsCount: tool_calls_count,
            userTurnsCount: user_turns_count,
            agentTurnsCount: agent_turns_count,
        }),
        { tenant_id: session.tenant_id }
    );

    console.log('[Billing] session_settled', {
        session_id,
        tenant_id: session.tenant_id,
        duration_seconds,
        billed_seconds: billedSeconds,
        cost_total: costTotal,
        hold_id: session.hold_id,
        status,
    });
    incrementMetric('billing.session_settled', { tenant_id: session.tenant_id, status });

    return {
        session_id,
        status,
        duration_seconds,
        billed_seconds: billedSeconds,
        cost_total: costTotal,
        currency: presetSnapshot.currency,
        wallet_balance_after: result.walletBalanceAfter,
    };
}

/**
 * Cancel a pending session
 * Releases the hold without charging
 */
export async function cancelPendingSession(sessionId: string): Promise<void> {
    const session = await getSessionById(sessionId);

    if (!session) {
        throw new SessionNotFoundError(sessionId);
    }

    if (session.status !== 'pending') {
        throw new ValidationError(`Cannot cancel session with status: ${session.status}`);
    }

    // Release the hold
    if (session.hold_id) {
        await releaseSessionHold(session.hold_id);
    }

    // Mark session as cancelled
    await cancelSession(sessionId);
}

/**
 * Mark session as active when user joins
 */
export async function markSessionActive(sessionId: string): Promise<void> {
    await activateSession(sessionId);
    console.log('[Session] session_activated', { session_id: sessionId });
}

/**
 * Build agent manifest for Python agent
 */
export async function buildAgentManifest(
    sessionId: string
): Promise<AgentSessionManifest> {
    const session = await getSessionById(sessionId);

    if (!session) {
        throw new SessionNotFoundError(sessionId);
    }

    const presetSnapshot = session.preset_snapshot as any;
    const voiceConfigSnapshot = session.voice_config_snapshot as VoiceConfigSnapshot;

    const agentAuthToken = jwt.sign(
        {
            session_id: sessionId,
            tenant_id: session.tenant_id,
            type: 'agent',
        },
        config.jwt.secret,
        { expiresIn: '2h' }
    );

    return buildManifestFromAgentConfig({
        sessionId,
        tenantId:                 session.tenant_id,
        sessionMaxDurationSeconds: session.max_duration_seconds,
        agentAuthToken,
        knowledgeBaseId:          null,
    });
}

// ===========================================
// HELPER FUNCTIONS
// ===========================================

function buildSystemPrompt(businessName: string, template: string | null): string {
    const defaultPrompt = `You are an AI voice assistant for ${businessName}. 
Be helpful, concise, and professional. 
Answer questions about the business and help customers with their needs.
If you don't know something, say so rather than making things up.`;

    if (!template) {
        return defaultPrompt;
    }

    // Replace placeholders in template
    return template.replace(/\{business_name\}/g, businessName);
}

/**
 * Build agent manifest for internal use (during session start) — LEGACY fallback.
 * @deprecated Use buildManifestFromAgentConfig instead.
 */
async function buildAgentManifestInternal(
    session: { id: string; tenant_id: string; max_duration_seconds: number | null },
    voiceConfigSnapshot: VoiceConfigSnapshot,
    presetSnapshot: { preset_id: string; price_per_min: number; currency: string; provider_config: any },
    voicePersona: { provider_voice_ids?: Record<string, string>; language?: string } | null,
    knowledgeBaseId: string | null
): Promise<AgentSessionManifest> {
    const agentAuthToken = jwt.sign(
        {
            session_id: session.id,
            tenant_id: session.tenant_id,
            type: 'agent',
        },
        config.jwt.secret,
        { expiresIn: '2h' }
    );

    return buildManifestFromAgentConfig({
        sessionId:                session.id,
        tenantId:                 session.tenant_id,
        sessionMaxDurationSeconds: session.max_duration_seconds,
        agentAuthToken,
        knowledgeBaseId,
    });
}
