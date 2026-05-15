import { queryOne, query } from '../../../platform/index.js';

export interface AgentConfig {
    // Identity
    agent_name?: string;
    greeting_message: string;
    system_prompt: string;
    personality?: string;
    business_context?: string;

    // LLM
    llm_provider?: string;
    llm_model?: string;
    temperature?: number;

    // Voice / Audio
    tts_provider?: string;
    tts_voice_id?: string;
    tts_language?: string;
    speech_speed?: number;
    interruption_sensitivity?: string;

    // STT
    stt_provider?: string;
    stt_language?: string;

    // Tools
    enabled_tools?: string[];
    booking_enabled?: boolean;
    transfer_enabled?: boolean;
    capture_lead_enabled?: boolean;

    // Call Behavior
    silence_timeout_ms?: number;
    max_call_duration?: number;
    voicemail_behavior?: string;
    fallback_message?: string;
}

/**
 * Strips basic HTML script tags recursively to prevent basic XSS or weird inputs.
 */
function sanitizeInput(text: string | undefined | null): string {
    if (!text) return '';
    return text.replace(/<[^>]*>?/gm, '').trim();
}

/**
 * Get agent configuration for a tenant
 */
export async function getAgentConfig(tenantId: string): Promise<AgentConfig | null> {
    const result = await queryOne<AgentConfig>(
        `SELECT 
            agent_name, greeting_message, system_prompt, personality, business_context,
            llm_provider, llm_model, temperature,
            tts_provider, tts_voice_id, tts_language, speech_speed, interruption_sensitivity,
            stt_provider, stt_language,
            enabled_tools, booking_enabled, transfer_enabled, capture_lead_enabled,
            silence_timeout_ms, max_call_duration, voicemail_behavior, fallback_message
         FROM tenants WHERE id = $1`,
        [tenantId]
    );

    if (!result) return null;

    return {
        ...result,
        system_prompt: result.system_prompt || '',
        greeting_message: result.greeting_message || ''
    };
}

/**
 * Update agent configuration for a tenant
 */
export async function updateAgentConfig(tenantId: string, config: Partial<AgentConfig>): Promise<void> {
    // Ensure we don't save undefined
    const sanitizedPrompt = config.system_prompt !== undefined ? sanitizeInput(config.system_prompt) : undefined;
    const sanitizedGreeting = config.greeting_message !== undefined ? sanitizeInput(config.greeting_message) : undefined;
    const sanitizedName = config.agent_name !== undefined ? sanitizeInput(config.agent_name) : undefined;
    const sanitizedPersonality = config.personality !== undefined ? sanitizeInput(config.personality) : undefined;
    const sanitizedContext = config.business_context !== undefined ? sanitizeInput(config.business_context) : undefined;
    const sanitizedFallback = config.fallback_message !== undefined ? sanitizeInput(config.fallback_message) : undefined;

    if (sanitizedPrompt !== undefined && (sanitizedPrompt.length < 20 || sanitizedPrompt.length > 2000)) {
        throw new Error('System prompt must be between 20 and 2000 characters after sanitization.');
    }

    if (sanitizedGreeting !== undefined && (sanitizedGreeting.length < 5 || sanitizedGreeting.length > 500)) {
        throw new Error('Greeting message must be between 5 and 500 characters after sanitization.');
    }

    // Build dynamic update query
    const updates: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    const addField = (field: string, value: any) => {
        if (value !== undefined) {
            updates.push(`${field} = $${paramIndex}`);
            values.push(value);
            paramIndex++;
        }
    };

    addField('agent_name', sanitizedName);
    addField('greeting_message', sanitizedGreeting);
    addField('system_prompt', sanitizedPrompt);
    addField('personality', sanitizedPersonality);
    addField('business_context', sanitizedContext);
    
    addField('llm_provider', config.llm_provider);
    addField('llm_model', config.llm_model);
    addField('temperature', config.temperature);
    
    addField('tts_provider', config.tts_provider);
    addField('tts_voice_id', config.tts_voice_id);
    addField('tts_language', config.tts_language);
    addField('speech_speed', config.speech_speed);
    addField('interruption_sensitivity', config.interruption_sensitivity);
    
    addField('stt_provider', config.stt_provider);
    addField('stt_language', config.stt_language);
    
    addField('enabled_tools', config.enabled_tools);
    addField('booking_enabled', config.booking_enabled);
    addField('transfer_enabled', config.transfer_enabled);
    addField('capture_lead_enabled', config.capture_lead_enabled);
    
    addField('silence_timeout_ms', config.silence_timeout_ms);
    addField('max_call_duration', config.max_call_duration);
    addField('voicemail_behavior', config.voicemail_behavior);
    addField('fallback_message', sanitizedFallback);

    if (updates.length === 0) return; // Nothing to update

    updates.push(`updated_at = NOW()`);
    values.push(tenantId);

    const res = await query(
        `UPDATE tenants SET ${updates.join(', ')} WHERE id = $${paramIndex}`,
        values
    );

    if (res.rowCount === 0) {
        throw new Error(`Tenant not found: ${tenantId}`);
    }
}
