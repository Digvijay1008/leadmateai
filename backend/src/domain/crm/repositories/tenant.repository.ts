import { queryOne, queryMany } from '../../../platform/index.js';
import type { Tenant, TenantVoiceConfig, VoicePersona } from '../../../shared/index.js';

// ===========================================
// TENANT REPOSITORY
// ===========================================

/**
 * Find tenant by ID
 */
export async function findTenantById(id: string): Promise<Tenant | null> {
    return queryOne<Tenant>(
        `SELECT * FROM tenants WHERE id = $1`,
        [id]
    );
}

/**
 * Find tenant by user ID (auth owner)
 */
export async function findTenantByUserId(userId: string): Promise<Tenant | null> {
    return queryOne<Tenant>(
        `SELECT * FROM tenants WHERE user_id = $1`,
        [userId]
    );
}

/**
 * Find tenant by slug
 */
export async function findTenantBySlug(slug: string): Promise<Tenant | null> {
    return queryOne<Tenant>(
        `SELECT * FROM tenants WHERE slug = $1`,
        [slug]
    );
}

/**
 * Find tenant by public widget key.
 */
export async function findTenantByWidgetKey(widgetKey: string): Promise<(Tenant & {
    widget_key?: string | null;
    allowed_domains?: string[] | null;
}) | null> {
    return queryOne<Tenant & { widget_key?: string | null; allowed_domains?: string[] | null }>(
        `SELECT * FROM tenants WHERE widget_key = $1`,
        [widgetKey]
    );
}

/**
 * Check if tenant is active (not suspended or cancelled)
 */
export async function isTenantActive(tenantId: string): Promise<boolean> {
    const result = await queryOne<{ status: string }>(
        `SELECT status FROM tenants WHERE id = $1`,
        [tenantId]
    );

    if (!result) return false;
    return result.status === 'active' || result.status === 'trial';
}

/**
 * Get tenant voice configuration
 */
export async function getTenantVoiceConfig(
    tenantId: string
): Promise<TenantVoiceConfig | null> {
    return queryOne<TenantVoiceConfig>(
        `SELECT * FROM tenant_voice_config WHERE tenant_id = $1`,
        [tenantId]
    );
}

/**
 * Get tenant with voice config joined
 */
export async function getTenantWithConfig(tenantId: string): Promise<{
    tenant: Tenant;
    voiceConfig: TenantVoiceConfig;
} | null> {
    const result = await queryOne<Tenant & TenantVoiceConfig>(
        `SELECT 
      t.*,
      vc.preset_id,
      vc.voice_persona_id,
      vc.agent_name,
      vc.system_prompt_template,
      vc.greeting_message,
      vc.goodbye_message,
      vc.business_hours,
      vc.tools_enabled,
      vc.max_session_duration_seconds,
      vc.inactivity_timeout_seconds
     FROM tenants t
     LEFT JOIN tenant_voice_config vc ON t.id = vc.tenant_id
     WHERE t.id = $1`,
        [tenantId]
    );

    if (!result) return null;

    return {
        tenant: {
            id: result.id,
            user_id: result.user_id,
            business_name: result.business_name,
            slug: result.slug,
            industry: result.industry,
            timezone: result.timezone,
            status: result.status,
            widget_key: result.widget_key,
            allowed_domains: result.allowed_domains,
            created_at: result.created_at,
            updated_at: result.updated_at,
        },
        voiceConfig: {
            tenant_id: result.id,
            preset_id: result.preset_id,
            voice_persona_id: result.voice_persona_id,
            agent_name: result.agent_name,
            system_prompt_template: result.system_prompt_template,
            greeting_message: result.greeting_message,
            goodbye_message: result.goodbye_message,
            business_hours: result.business_hours,
            tools_enabled: result.tools_enabled,
            max_session_duration_seconds: result.max_session_duration_seconds,
            inactivity_timeout_seconds: result.inactivity_timeout_seconds,
            created_at: result.created_at,
            updated_at: result.updated_at,
        },
    };
}

/**
 * Get voice persona by ID
 */
export async function getVoicePersona(id: string): Promise<VoicePersona | null> {
    return queryOne<VoicePersona>(
        `SELECT * FROM voice_personas WHERE id = $1 AND is_active = true`,
        [id]
    );
}

/**
 * List all active voice personas
 */
export async function listActiveVoicePersonas(): Promise<VoicePersona[]> {
    return queryMany<VoicePersona>(
        `SELECT * FROM voice_personas WHERE is_active = true ORDER BY display_name`
    );
}
