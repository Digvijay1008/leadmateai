import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { authenticateUser, type AuthenticatedRequest } from '../../../../core/middleware/auth.js';
import { ValidationError } from '../../../../shared/index.js';
import * as searchService from '../../services/search.service.js';

const router = Router();

const propertySearchQuerySchema = z.object({
    city: z.coerce.string().optional(),
    locality: z.coerce.string().optional(),
    project_id: z.coerce.string().uuid().optional(),
    bhk_types: z.coerce.string().optional(),
    property_type: z.coerce.string().optional(),
    min_price: z.coerce.number().positive().optional(),
    max_price: z.coerce.number().positive().optional(),
    min_sqft: z.coerce.number().positive().optional(),
    max_sqft: z.coerce.number().positive().optional(),
    status: z.coerce.string().optional(),
    search: z.coerce.string().optional(),
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().positive().max(100).default(20),
});

const projectSearchQuerySchema = z.object({
    city: z.coerce.string().optional(),
    status: z.coerce.string().optional(),
    search: z.coerce.string().optional(),
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().positive().max(100).default(20),
});

const matchLeadQuerySchema = z.object({
    limit: z.coerce.number().int().positive().max(100).default(10),
});

function getStringParam(param: string | string[] | undefined): string | undefined {
    if (Array.isArray(param)) return param[0];
    return param;
}

function parseBhkTypes(bhkParam: string | string[] | undefined): string[] | undefined {
    if (!bhkParam) return undefined;
    if (Array.isArray(bhkParam)) return bhkParam;
    return bhkParam.split(',').map(s => s.trim()).filter(Boolean);
}

router.get('/properties', authenticateUser(), async (req: Request, res: Response) => {
    try {
        const authReq = req as AuthenticatedRequest;
        const tenantId = authReq.auth.tenantId;

        const parseResult = propertySearchQuerySchema.safeParse(req.query);
        if (!parseResult.success) {
            throw new ValidationError('Invalid query', { errors: parseResult.error.errors });
        }

        const query = parseResult.data;
        const result = await searchService.searchPropertiesService(tenantId, {
            ...query,
            bhk_types: parseBhkTypes(query.bhk_types),
        });

        res.json(result);
    } catch (e: any) {
        if (e instanceof ValidationError) {
            res.status(400).json({ error: e.message, details: e.details });
        } else {
            console.error('[Search] property search error:', e);
            res.status(500).json({ error: e.message });
        }
    }
});

router.get('/projects', authenticateUser(), async (req: Request, res: Response) => {
    try {
        const authReq = req as AuthenticatedRequest;
        const tenantId = authReq.auth.tenantId;

        const parseResult = projectSearchQuerySchema.safeParse(req.query);
        if (!parseResult.success) {
            throw new ValidationError('Invalid query', { errors: parseResult.error.errors });
        }

        const result = await searchService.searchProjectsService(tenantId, parseResult.data);
        res.json(result);
    } catch (e: any) {
        if (e instanceof ValidationError) {
            res.status(400).json({ error: e.message, details: e.details });
        } else {
            console.error('[Search] project search error:', e);
            res.status(500).json({ error: e.message });
        }
    }
});

router.post('/match-lead/:leadId', authenticateUser(), async (req: Request, res: Response) => {
    try {
        const authReq = req as AuthenticatedRequest;
        const tenantId = authReq.auth.tenantId;
        const leadId = getStringParam(req.params.leadId);

        if (!leadId) {
            throw new ValidationError('Lead ID is required');
        }

        const parseResult = matchLeadQuerySchema.safeParse(req.query);
        if (!parseResult.success) {
            throw new ValidationError('Invalid query', { errors: parseResult.error.errors });
        }

        const result = await searchService.matchLeadToPropertiesService(
            tenantId,
            leadId,
            parseResult.data
        );

        res.json(result);
    } catch (e: any) {
        if (e instanceof ValidationError) {
            res.status(400).json({ error: e.message, details: e.details });
        } else if (e.message?.includes('not found')) {
            res.status(404).json({ error: e.message });
        } else {
            console.error('[Search] match lead error:', e);
            res.status(500).json({ error: e.message });
        }
    }
});

export default router;