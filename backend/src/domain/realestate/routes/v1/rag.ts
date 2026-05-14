import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { queryKnowledgeBase } from '../../services/rag/query.service.js';
import { authenticateAgent, type AgentRequest } from '../../../../core/middleware/auth.js';

const router = Router();

// ===========================================
// REQUEST SCHEMAS
// ===========================================

const ragQuerySchema = z.object({
    tenant_id: z.string().uuid().optional(),
    query: z.string().min(1).max(1000),
    limit: z.number().int().min(1).max(10).default(5)
});

// ===========================================
// ROUTES
// ===========================================

/**
 * POST /v1/rag/query-formatted
 * Search KB and return formatted context string for LLM
 * 
 * Convenience endpoint that returns ready-to-use context
 */
router.post('/query-formatted', authenticateAgent(), async (req: Request, res: Response) => {
    try {
        const agentReq = req as AgentRequest;

        const bodyWithTenant = {
            ...req.body,
            tenant_id: req.body.tenant_id || agentReq.auth.tenantId,
        };

        const parseResult = ragQuerySchema.safeParse(bodyWithTenant);

        if (!parseResult.success) {
            return res.status(400).json({ error: 'Invalid request body', details: parseResult.error.errors });
        }

        if (parseResult.data.tenant_id !== agentReq.auth.tenantId) {
            return res.status(403).json({ error: 'Tenant ID mismatch' });
        }

        const formattedContext = await queryKnowledgeBase(
            parseResult.data.tenant_id,
            parseResult.data.query,
            parseResult.data.limit
        );

        res.json({
            context: formattedContext,
        });
    } catch (e: any) {
        res.status(500).json({ error: e.message });
    }
});

export default router;
