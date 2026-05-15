import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { authenticateUser, type AuthenticatedRequest } from '../../../../core/middleware/auth.js';
import { ValidationError } from '../../../../shared/index.js';
import * as leadService from '../../services/lead.service.js';

const router = Router();

function getStringParam(param: string | string[] | undefined): string | undefined {
    if (Array.isArray(param)) return param[0];
    return param;
}

const createLeadSchema = z.object({
    assigned_agent_id: z.string().uuid().optional(),
    full_name: z.string().min(1),
    phone: z.string().min(1),
    email: z.string().email().optional(),
    source: z.string().optional(),
    priority: z.string().optional(),
    follow_up_at: z.string().optional(),
});

const updateLeadSchema = z.object({
    assigned_agent_id: z.string().uuid().optional(),
    full_name: z.string().min(1).optional(),
    phone: z.string().min(1).optional(),
    email: z.string().email().optional(),
    source: z.string().optional(),
    status: z.string().optional(),
    priority: z.string().optional(),
    follow_up_at: z.string().optional(),
    notes_summary: z.string().optional(),
    lead_score: z.number().int().min(0).max(100).optional(),
});

const listLeadsQuerySchema = z.object({
    status: z.coerce.string().optional(),
    source: z.coerce.string().optional(),
    priority: z.coerce.string().optional(),
    assigned_agent_id: z.coerce.string().uuid().optional(),
    search: z.coerce.string().optional(),
    follow_up_before: z.coerce.string().optional(),
    follow_up_after: z.coerce.string().optional(),
    limit: z.coerce.number().int().min(1).max(100).default(20),
    offset: z.coerce.number().int().min(0).default(0),
});

const addActivitySchema = z.object({
    activity_type: z.string().min(1),
    channel: z.string().optional(),
    description: z.string().optional(),
});

const addNoteSchema = z.object({
    note: z.string().min(1),
});

const assignLeadSchema = z.object({
    assigned_to: z.string().uuid(),
});

router.post('/', authenticateUser(), async (req: Request, res: Response) => {
    try {
        const authReq = req as AuthenticatedRequest;
        const tenantId = authReq.auth.tenantId;

        const parseResult = createLeadSchema.safeParse(req.body);
        if (!parseResult.success) {
            throw new ValidationError('Invalid request', { errors: parseResult.error.errors });
        }

        const lead = await leadService.createLeadService(tenantId, parseResult.data);
        res.status(201).json(lead);
    } catch (e: any) {
        if (e instanceof ValidationError) {
            res.status(400).json({ error: e.message, details: e.details });
        } else {
            console.error('[Lead] create error:', e);
            res.status(500).json({ error: e.message });
        }
    }
});

router.get('/', authenticateUser(), async (req: Request, res: Response) => {
    try {
        const authReq = req as AuthenticatedRequest;
        const tenantId = authReq.auth.tenantId;

        const parseResult = listLeadsQuerySchema.safeParse(req.query);
        if (!parseResult.success) {
            throw new ValidationError('Invalid query', { errors: parseResult.error.errors });
        }

        const filters: any = { ...parseResult.data };
        if (filters.follow_up_before) {
            filters.follow_up_before = new Date(filters.follow_up_before);
        }
        if (filters.follow_up_after) {
            filters.follow_up_after = new Date(filters.follow_up_after);
        }

        const result = await leadService.listLeadsService(tenantId, filters);
        res.json(result);
    } catch (e: any) {
        if (e instanceof ValidationError) {
            res.status(400).json({ error: e.message, details: e.details });
        } else {
            console.error('[Lead] list error:', e);
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
            throw new ValidationError('Lead ID is required');
        }

        const lead = await leadService.getLeadService(id, tenantId);
        res.json(lead);
    } catch (e: any) {
        if (e.message?.includes('not found')) {
            res.status(404).json({ error: e.message });
        } else {
            console.error('[Lead] get error:', e);
            res.status(500).json({ error: e.message });
        }
    }
});

router.put('/:id', authenticateUser(), async (req: Request, res: Response) => {
    try {
        const authReq = req as AuthenticatedRequest;
        const tenantId = authReq.auth.tenantId;
        const id = getStringParam(req.params.id);

        if (!id) {
            throw new ValidationError('Lead ID is required');
        }

        const parseResult = updateLeadSchema.safeParse(req.body);
        if (!parseResult.success) {
            throw new ValidationError('Invalid request', { errors: parseResult.error.errors });
        }

        const lead = await leadService.updateLeadService(id, tenantId, parseResult.data);
        res.json(lead);
    } catch (e: any) {
        if (e instanceof ValidationError) {
            res.status(400).json({ error: e.message, details: e.details });
        } else if (e.message?.includes('not found')) {
            res.status(404).json({ error: e.message });
        } else {
            console.error('[Lead] update error:', e);
            res.status(500).json({ error: e.message });
        }
    }
});

router.delete('/:id', authenticateUser(), async (req: Request, res: Response) => {
    try {
        const authReq = req as AuthenticatedRequest;
        const tenantId = authReq.auth.tenantId;
        const id = getStringParam(req.params.id);

        if (!id) {
            throw new ValidationError('Lead ID is required');
        }

        const result = await leadService.deleteLeadService(id, tenantId);
        res.json(result);
    } catch (e: any) {
        if (e.message?.includes('not found')) {
            res.status(404).json({ error: e.message });
        } else {
            console.error('[Lead] delete error:', e);
            res.status(500).json({ error: e.message });
        }
    }
});

router.post('/:id/activities', authenticateUser(), async (req: Request, res: Response) => {
    try {
        const authReq = req as AuthenticatedRequest;
        const tenantId = authReq.auth.tenantId;
        const id = getStringParam(req.params.id);

        if (!id) {
            throw new ValidationError('Lead ID is required');
        }

        const parseResult = addActivitySchema.safeParse(req.body);
        if (!parseResult.success) {
            throw new ValidationError('Invalid request', { errors: parseResult.error.errors });
        }

        const activity = await leadService.addActivityService(tenantId, id, parseResult.data);
        res.status(201).json(activity);
    } catch (e: any) {
        if (e instanceof ValidationError) {
            res.status(400).json({ error: e.message, details: e.details });
        } else if (e.message?.includes('not found')) {
            res.status(404).json({ error: e.message });
        } else {
            console.error('[Lead] add activity error:', e);
            res.status(500).json({ error: e.message });
        }
    }
});

router.get('/:id/activities', authenticateUser(), async (req: Request, res: Response) => {
    try {
        const authReq = req as AuthenticatedRequest;
        const tenantId = authReq.auth.tenantId;
        const id = getStringParam(req.params.id);

        if (!id) {
            throw new ValidationError('Lead ID is required');
        }

        const activities = await leadService.listActivitiesService(tenantId, id);
        res.json({ activities });
    } catch (e: any) {
        if (e.message?.includes('not found')) {
            res.status(404).json({ error: e.message });
        } else {
            console.error('[Lead] list activities error:', e);
            res.status(500).json({ error: e.message });
        }
    }
});

router.post('/:id/notes', authenticateUser(), async (req: Request, res: Response) => {
    try {
        const authReq = req as AuthenticatedRequest;
        const tenantId = authReq.auth.tenantId;
        const id = getStringParam(req.params.id);

        if (!id) {
            throw new ValidationError('Lead ID is required');
        }

        const parseResult = addNoteSchema.safeParse(req.body);
        if (!parseResult.success) {
            throw new ValidationError('Invalid request', { errors: parseResult.error.errors });
        }

        const note = await leadService.addNoteService(tenantId, id, parseResult.data);
        res.status(201).json(note);
    } catch (e: any) {
        if (e instanceof ValidationError) {
            res.status(400).json({ error: e.message, details: e.details });
        } else if (e.message?.includes('not found')) {
            res.status(404).json({ error: e.message });
        } else {
            console.error('[Lead] add note error:', e);
            res.status(500).json({ error: e.message });
        }
    }
});

router.get('/:id/notes', authenticateUser(), async (req: Request, res: Response) => {
    try {
        const authReq = req as AuthenticatedRequest;
        const tenantId = authReq.auth.tenantId;
        const id = getStringParam(req.params.id);

        if (!id) {
            throw new ValidationError('Lead ID is required');
        }

        const notes = await leadService.listNotesService(tenantId, id);
        res.json({ notes });
    } catch (e: any) {
        if (e.message?.includes('not found')) {
            res.status(404).json({ error: e.message });
        } else {
            console.error('[Lead] list notes error:', e);
            res.status(500).json({ error: e.message });
        }
    }
});

router.post('/:id/assign', authenticateUser(), async (req: Request, res: Response) => {
    try {
        const authReq = req as AuthenticatedRequest;
        const tenantId = authReq.auth.tenantId;
        const id = getStringParam(req.params.id);

        if (!id) {
            throw new ValidationError('Lead ID is required');
        }

        const parseResult = assignLeadSchema.safeParse(req.body);
        if (!parseResult.success) {
            throw new ValidationError('Invalid request', { errors: parseResult.error.errors });
        }

        const assignment = await leadService.assignLeadService(tenantId, id, parseResult.data);
        res.status(201).json(assignment);
    } catch (e: any) {
        if (e instanceof ValidationError) {
            res.status(400).json({ error: e.message, details: e.details });
        } else if (e.message?.includes('not found')) {
            res.status(404).json({ error: e.message });
        } else {
            console.error('[Lead] assign error:', e);
            res.status(500).json({ error: e.message });
        }
    }
});

router.get('/:id/status-history', authenticateUser(), async (req: Request, res: Response) => {
    try {
        const authReq = req as AuthenticatedRequest;
        const tenantId = authReq.auth.tenantId;
        const id = getStringParam(req.params.id);

        if (!id) {
            throw new ValidationError('Lead ID is required');
        }

        const history = await leadService.getStatusHistoryService(tenantId, id);
        res.json({ status_history: history });
    } catch (e: any) {
        if (e.message?.includes('not found')) {
            res.status(404).json({ error: e.message });
        } else {
            console.error('[Lead] get status history error:', e);
            res.status(500).json({ error: e.message });
        }
    }
});

export default router;
