import { queryOne, query } from '../../../platform/index.js';

export interface AgentConfig {
    system_prompt: string;
    greeting_message: string;
}

/**
 * Strips basic HTML script tags recursively to prevent basic XSS or weird inputs.
 * For production we ideally use a sanitizer library like dompurify, but this
 * string replace strips basic HTML tags.
 */
function sanitizeInput(text: string): string {
    if (!text) return '';
    return text.replace(/<[^>]*>?/gm, '').trim();
}

/**
 * Get agent configuration (system prompt and greeting message) for a tenant
 */
export async function getAgentConfig(tenantId: string): Promise<AgentConfig | null> {
    const result = await queryOne<{ system_prompt: string; greeting_message: string }>(
        `SELECT system_prompt, greeting_message FROM tenants WHERE id = $1`,
        [tenantId]
    );

    if (!result) return null;

    return {
        system_prompt: result.system_prompt || '',
        greeting_message: result.greeting_message || ''
    };
}

/**
 * Update agent configuration for a tenant
 */
export async function updateAgentConfig(tenantId: string, config: { system_prompt: string; greeting_message: string }): Promise<void> {
    const sanitizedPrompt = sanitizeInput(config.system_prompt);
    const sanitizedGreeting = sanitizeInput(config.greeting_message);

    if (!sanitizedPrompt || sanitizedPrompt.length < 20 || sanitizedPrompt.length > 2000) {
        throw new Error('System prompt must be between 20 and 2000 characters after sanitization.');
    }

    if (!sanitizedGreeting || sanitizedGreeting.length < 5 || sanitizedGreeting.length > 500) {
        throw new Error('Greeting message must be between 5 and 500 characters after sanitization.');
    }

    const res = await query(
        `UPDATE tenants SET system_prompt = $1, greeting_message = $2, updated_at = NOW() WHERE id = $3`,
        [sanitizedPrompt, sanitizedGreeting, tenantId]
    );

    if (res.rowCount === 0) {
        throw new Error(`Tenant not found: ${tenantId}`);
    }
}
