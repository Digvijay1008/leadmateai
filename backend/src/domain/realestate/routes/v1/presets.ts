import { Router, Request, Response } from 'express';
import { listPresets, getPresetDetails } from '../../services/preset.service.js';
import {
    authenticateUser,
    type AuthenticatedRequest
} from '../../../../core/middleware/auth.js';
import { ValidationError } from '../../../../shared/index.js';

const router = Router();

// ===========================================
// ROUTES
// ===========================================

/**
 * GET /v1/presets
 * List all available voice presets
 * 
 * Requires user authentication to show current selection
 */
router.get('/', authenticateUser(), async (req: Request, res: Response) => {
    const authReq = req as AuthenticatedRequest;

    const result = await listPresets(authReq.auth.tenantId);

    res.json(result);
});

/**
 * GET /v1/presets/:preset_id
 * Get details for a specific preset
 */
router.get('/:preset_id', authenticateUser(), async (req: Request, res: Response) => {
    const presetIdParam = req.params.preset_id;
    const presetId = Array.isArray(presetIdParam) ? presetIdParam[0] : presetIdParam;

    if (!presetId) {
        throw new ValidationError('Preset ID required');
    }

    const result = await getPresetDetails(presetId);

    res.json(result);
});

export default router;
