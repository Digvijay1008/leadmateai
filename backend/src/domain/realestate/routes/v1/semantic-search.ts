import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { authenticateUser, type AuthenticatedRequest } from '../../../../core/middleware/auth.js';
import { ValidationError } from '../../../../shared/index.js';
import * as embeddingService from '../../services/embedding.service.js';

const router = Router();

const searchQuerySchema = z.object({
    query: z.string().min(1).max(500),
    top_k: z.coerce.number().int().min(1).max(50).default(10),
    min_score: z.coerce.number().min(0).max(1).default(0.5),
});

router.post('/semantic', authenticateUser(), async (req: Request, res: Response) => {
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

export default router;