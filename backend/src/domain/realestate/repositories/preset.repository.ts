import { queryOne, queryMany } from '../../../platform/index.js';
import type { VoicePreset } from '../../../shared/index.js';

// ===========================================
// PRESET REPOSITORY
// ===========================================

/**
 * Get preset by ID
 */
export async function getPresetById(id: string): Promise<VoicePreset | null> {
    return queryOne<VoicePreset>(
        `SELECT * FROM voice_presets WHERE id = $1`,
        [id]
    );
}

/**
 * Get active preset by ID
 */
export async function getActivePresetById(id: string): Promise<VoicePreset | null> {
    return queryOne<VoicePreset>(
        `SELECT * FROM voice_presets WHERE id = $1 AND is_active = true`,
        [id]
    );
}

/**
 * List all active presets
 */
export async function listActivePresets(): Promise<VoicePreset[]> {
    return queryMany<VoicePreset>(
        `SELECT * FROM voice_presets 
     WHERE is_active = true 
     ORDER BY sort_order ASC`
    );
}

/**
 * Get preset price per minute
 */
export async function getPresetPrice(presetId: string): Promise<number | null> {
    const result = await queryOne<{ base_price_per_min: string }>(
        `SELECT base_price_per_min FROM voice_presets WHERE id = $1 AND is_active = true`,
        [presetId]
    );

    if (!result) return null;
    return parseFloat(result.base_price_per_min);
}

/**
 * Create a snapshot of preset config for session billing
 * This locks in the price at session start
 */
export async function createPresetSnapshot(presetId: string): Promise<{
    preset_id: string;
    price_per_min: number;
    currency: string;
    provider_config: any;
} | null> {
    const preset = await getActivePresetById(presetId);

    if (!preset) return null;

    return {
        preset_id: preset.id,
        price_per_min: parseFloat(preset.base_price_per_min as any),
        currency: preset.currency,
        provider_config: preset.provider_config,
    };
}
