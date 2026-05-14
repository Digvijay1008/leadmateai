import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { authenticateUser, type AuthenticatedRequest } from '../../../../core/middleware/auth.js';
import { ValidationError } from '../../../../shared/index.js';
import * as propertyService from '../../services/property.service.js';

const router = Router();

function getStringParam(param: string | string[] | undefined): string | undefined {
    if (Array.isArray(param)) return param[0];
    return param;
}

const createProjectSchema = z.object({
    project_name: z.string().min(1),
    city: z.string().min(1),
    locality: z.string().optional(),
    builder_name: z.string().optional(),
    description: z.string().optional(),
    total_units: z.number().int().positive().optional(),
});

const listProjectsQuerySchema = z.object({
    city: z.coerce.string().optional(),
    status: z.coerce.string().optional(),
});

router.post('/', authenticateUser(), async (req: Request, res: Response) => {
    try {
        const authReq = req as AuthenticatedRequest;
        const tenantId = authReq.auth.tenantId;

        const parseResult = createProjectSchema.safeParse(req.body);
        if (!parseResult.success) {
            throw new ValidationError('Invalid request', { errors: parseResult.error.errors });
        }

        const project = await propertyService.createPropertyProjectService(tenantId, parseResult.data);
        res.status(201).json(project);
    } catch (e: any) {
        if (e instanceof ValidationError) {
            res.status(400).json({ error: e.message, details: e.details });
        } else {
            console.error('[PropertyProject] create error:', e);
            res.status(500).json({ error: e.message });
        }
    }
});

router.get('/', authenticateUser(), async (req: Request, res: Response) => {
    try {
        const authReq = req as AuthenticatedRequest;
        const tenantId = authReq.auth.tenantId;

        const parseResult = listProjectsQuerySchema.safeParse(req.query);
        if (!parseResult.success) {
            throw new ValidationError('Invalid query', { errors: parseResult.error.errors });
        }

        const projects = await propertyService.listPropertyProjectsService(tenantId, parseResult.data);
        res.json({ projects });
    } catch (e: any) {
        if (e instanceof ValidationError) {
            res.status(400).json({ error: e.message, details: e.details });
        } else {
            console.error('[PropertyProject] list error:', e);
            res.status(500).json({ error: e.message });
        }
    }
});

router.get('/:id', authenticateUser(), async (req: Request, res: Response) => {
    try {
        const authReq = req as AuthenticatedRequest;
        const tenantId = authReq.auth.tenantId;
        const id = getStringParam(req.params.id);

        if (!id) {
            throw new ValidationError('Project ID is required');
        }

        const project = await propertyService.getPropertyProjectService(id, tenantId);
        res.json(project);
    } catch (e: any) {
        if (e.message?.includes('not found')) {
            res.status(404).json({ error: e.message });
        } else {
            console.error('[PropertyProject] get error:', e);
            res.status(500).json({ error: e.message });
        }
    }
});

export default router;