import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { authenticateUser, type AuthenticatedRequest } from '../../../../core/middleware/auth.js';
import { ValidationError } from '../../../../shared/index.js';
import * as embeddingService from '../../services/embedding.service.js';
import * as searchService from '../../services/search.service.js';

const router = Router();

function getStringParam(param: string | string[] | undefined): string | undefined {
    if (Array.isArray(param)) return param[0];
    return param;
}

const createEmbeddingSchema = z.object({
    property_id: z.string().uuid(),
});

const updateEmbeddingSchema = z.object({
    property_id: z.string().uuid(),
});

const semanticSearchSchema = z.object({
    query: z.string().min(1).max(500),
    top_k: z.coerce.number().int().min(1).max(50).optional(),
    min_score: z.coerce.number().min(0).max(1).optional(),
});

router.post('/properties/:propertyId', authenticateUser(), async (req: Request, res: Response) => {
    try {
        const authReq = req as AuthenticatedRequest;
        const tenantId = authReq.auth.tenantId;
        const propertyId = getStringParam(req.params.propertyId);

        if (!propertyId) {
            throw new ValidationError('Property ID is required');
        }

        const result = await embeddingService.createEmbeddingService(tenantId, {
            property_id: propertyId,
        });

        res.status(201).json(result);
    } catch (e: any) {
        if (e instanceof ValidationError) {
            res.status(400).json({ error: e.message, details: e.details });
        } else if (e.message?.includes('not found')) {
            res.status(404).json({ error: e.message });
        } else {
            console.error('[Embedding] create error:', e);
            res.status(500).json({ error: e.message });
        }
    }
});

router.put('/properties/:propertyId', authenticateUser(), async (req: Request, res: Response) => {
    try {
        const authReq = req as AuthenticatedRequest;
        const tenantId = authReq.auth.tenantId;
        const propertyId = getStringParam(req.params.propertyId);

        if (!propertyId) {
            throw new ValidationError('Property ID is required');
        }

        const result = await embeddingService.updateEmbeddingService(tenantId, {
            property_id: propertyId,
        });

        res.json(result);
    } catch (e: any) {
        if (e instanceof ValidationError) {
            res.status(400).json({ error: e.message, details: e.details });
        } else if (e.message?.includes('not found')) {
            res.status(404).json({ error: e.message });
        } else {
            console.error('[Embedding] update error:', e);
            res.status(500).json({ error: e.message });
        }
    }
});

router.delete('/properties/:propertyId', authenticateUser(), async (req: Request, res: Response) => {
    try {
        const authReq = req as AuthenticatedRequest;
        const tenantId = authReq.auth.tenantId;
        const propertyId = getStringParam(req.params.propertyId);

        if (!propertyId) {
            throw new ValidationError('Property ID is required');
        }

        const result = await embeddingService.deleteEmbeddingService(tenantId, propertyId);
        res.json(result);
    } catch (e: any) {
        if (e instanceof ValidationError) {
            res.status(400).json({ error: e.message, details: e.details });
        } else if (e.message?.includes('not found')) {
            res.status(404).json({ error: e.message });
        } else {
            console.error('[Embedding] delete error:', e);
            res.status(500).json({ error: e.message });
        }
    }
});

router.get('/properties/:propertyId/status', authenticateUser(), async (req: Request, res: Response) => {
    try {
        const authReq = req as AuthenticatedRequest;
        const tenantId = authReq.auth.tenantId;
        const propertyId = getStringParam(req.params.propertyId);

        if (!propertyId) {
            throw new ValidationError('Property ID is required');
        }

        const result = await embeddingService.getEmbeddingStatusService(tenantId, propertyId);
        res.json(result);
    } catch (e: any) {
        if (e instanceof ValidationError) {
            res.status(400).json({ error: e.message, details: e.details });
        } else if (e.message?.includes('not found')) {
            res.status(404).json({ error: e.message });
        } else {
            console.error('[Embedding] status error:', e);
            res.status(500).json({ error: e.message });
        }
    }
});

router.post('/rebuild-all', authenticateUser(), async (req: Request, res: Response) => {
    try {
        const authReq = req as AuthenticatedRequest;
        const tenantId = authReq.auth.tenantId;

        const result = await embeddingService.rebuildAllEmbeddingsService(tenantId);
        res.json(result);
    } catch (e: any) {
        console.error('[Embedding] rebuild all error:', e);
        res.status(500).json({ error: e.message });
    }
});

export default router;

const searchRouter = Router();

const searchQuerySchema = z.object({
    query: z.string().min(1).max(500),
    top_k: z.coerce.number().int().min(1).max(50).default(10),
    min_score: z.coerce.number().min(0).max(1).default(0.5),
});

searchRouter.post('/semantic', authenticateUser(), async (req: Request, res: Response) => {
    try {
        const authReq = req as AuthenticatedRequest;
        const tenantId = authReq.auth.tenantId;

        const parseResult = searchQuerySchema.safeParse(req.body);
        if (!parseResult.success) {
            throw new ValidationError('Invalid request', { errors: parseResult.error.errors });
        }

        const result = await embeddingService.semanticSearchService(tenantId, parseResult.data);
        res.json(result);
    } catch (e: any) {
        if (e instanceof ValidationError) {
            res.status(400).json({ error: e.message, details: e.details });
        } else {
            console.error('[SemanticSearch] error:', e);
            res.status(500).json({ error: e.message });
        }
    }
});

export { searchRouter };