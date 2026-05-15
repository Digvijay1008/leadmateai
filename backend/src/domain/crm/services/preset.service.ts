import { listActivePresets, getActivePresetById } from '../repositories/preset.repository.js';
import { getTenantVoiceConfig } from '../repositories/tenant.repository.js';
import { NotFoundError } from '../../../shared/index.js';
import type { PresetListResponse, PresetListItem } from '../../../shared/index.js';

// ===========================================
// PRESET SERVICE
// ===========================================

/**
 * List all available voice presets for tenant selection
 */
export async function listPresets(tenantId: string): Promise<PresetListResponse> {
    const presets = await listActivePresets();

    // Get tenant's current preset
    const voiceConfig = await getTenantVoiceConfig(tenantId);
    const currentPresetId = voiceConfig?.preset_id ?? null;

    const presetItems: PresetListItem[] = presets.map(preset => ({
        id: preset.id,
        display_name: preset.display_name,
        description: preset.description,
        price_per_min: parseFloat(preset.base_price_per_min as any),
        currency: preset.currency,
        features: extractFeaturesFromDescription(preset.description),
    }));

    return {
        presets: presetItems,
        current_preset_id: currentPresetId,
    };
}

/**
 * Get detailed preset information
 */
export async function getPresetDetails(presetId: string): Promise<PresetListItem> {
    const preset = await getActivePresetById(presetId);

    if (!preset) {
        throw new NotFoundError(`Voice preset: ${presetId}`);
    }

    return {
        id: preset.id,
        display_name: preset.display_name,
        description: preset.description,
        price_per_min: parseFloat(preset.base_price_per_min as any),
        currency: preset.currency,
        features: extractFeaturesFromDescription(preset.description),
    };
}

/**
 * Extract feature bullets from description
 */
function extractFeaturesFromDescription(description: string | null): string[] {
    if (!description) return [];

    // Split by periods or common separators
    const sentences = description.split(/[.•\n]/).filter(s => s.trim().length > 0);

    return sentences.map(s => s.trim()).slice(0, 5); // Max 5 features
}
