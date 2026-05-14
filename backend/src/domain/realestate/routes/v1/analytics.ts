import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { authenticateUser, type AuthenticatedRequest } from '../../../../core/middleware/auth.js';
import { ValidationError } from '../../../../shared/index.js';
import * as analyticsService from '../../services/analytics.service.js';

const router = Router();

const periodQuerySchema = z.object({
    period: z.enum(['today', 'yesterday', '7days', '30days', '90days', 'this_month', 'last_month']).default('30days'),
});

const widgetEventSchema = z.object({
    event: z.enum(['WIDGET_LOADED', 'WIDGET_OPENED', 'CALL_STARTED', 'CALL_ENDED']),
    widgetKey: z.string().min(5),
    host: z.string().optional(),
});

router.post('/widget', async (req: Request, res: Response) => {
    const parseResult = widgetEventSchema.safeParse(req.body);
    if (!parseResult.success) {
        return res.status(204).end();
    }

    console.log('[WidgetAnalytics]', {
        event: parseResult.data.event,
        widget_key: parseResult.data.widgetKey,
        host: parseResult.data.host,
        at: new Date().toISOString(),
    });

    res.status(202).json({ ok: true });
});

router.get('/sessions', authenticateUser(), async (req: Request, res: Response) => {
    try {
        const authReq = req as AuthenticatedRequest;
        const tenantId = authReq.auth.tenantId;

        const parseResult = periodQuerySchema.safeParse(req.query);
        if (!parseResult.success) {
            throw new ValidationError('Invalid query', { errors: parseResult.error.errors });
        }

        const result = await analyticsService.getSessionAnalyticsService(tenantId, parseResult.data.period);
        res.json({ sessions: result });
    } catch (e: any) {
        if (e instanceof ValidationError) {
            res.status(400).json({ error: e.message, details: e.details });
        } else {
            console.error('[Analytics] sessions error:', e);
            res.status(500).json({ error: e.message });
        }
    }
});

router.get('/leads', authenticateUser(), async (req: Request, res: Response) => {
    try {
        const authReq = req as AuthenticatedRequest;
        const tenantId = authReq.auth.tenantId;

        const parseResult = periodQuerySchema.safeParse(req.query);
        if (!parseResult.success) {
            throw new ValidationError('Invalid query', { errors: parseResult.error.errors });
        }

        const result = await analyticsService.getLeadFunnelAnalyticsService(tenantId, parseResult.data.period);
        res.json({ leads: result });
    } catch (e: any) {
        if (e instanceof ValidationError) {
            res.status(400).json({ error: e.message, details: e.details });
        } else {
            console.error('[Analytics] leads error:', e);
            res.status(500).json({ error: e.message });
        }
    }
});

router.get('/revenue', authenticateUser(), async (req: Request, res: Response) => {
    try {
        const authReq = req as AuthenticatedRequest;
        const tenantId = authReq.auth.tenantId;

        const parseResult = periodQuerySchema.safeParse(req.query);
        if (!parseResult.success) {
            throw new ValidationError('Invalid query', { errors: parseResult.error.errors });
        }

        const result = await analyticsService.getRevenueAnalyticsService(tenantId, parseResult.data.period);
        res.json({ revenue: result });
    } catch (e: any) {
        if (e instanceof ValidationError) {
            res.status(400).json({ error: e.message, details: e.details });
        } else {
            console.error('[Analytics] revenue error:', e);
            res.status(500).json({ error: e.message });
        }
    }
});

router.get('/dashboard', authenticateUser(), async (req: Request, res: Response) => {
    try {
        const authReq = req as AuthenticatedRequest;
        const tenantId = authReq.auth.tenantId;

        const result = await analyticsService.getDashboardSummaryService(tenantId);
        res.json(result);
    } catch (e: any) {
        console.error('[Analytics] dashboard error:', e);
        res.status(500).json({ error: e.message });
    }
});

router.get('/overview', authenticateUser(), async (req: Request, res: Response) => {
    try {
        const authReq = req as AuthenticatedRequest;
        const tenantId = authReq.auth.tenantId;

        const parseResult = periodQuerySchema.safeParse(req.query);
        if (!parseResult.success) {
            throw new ValidationError('Invalid query', { errors: parseResult.error.errors });
        }

        const result = await analyticsService.getOverviewReportService(tenantId, parseResult.data.period);
        res.json(result);
    } catch (e: any) {
        if (e instanceof ValidationError) {
            res.status(400).json({ error: e.message, details: e.details });
        } else {
            console.error('[Analytics] overview error:', e);
            res.status(500).json({ error: e.message });
        }
    }
});

router.post('/refresh', authenticateUser(), async (_req: Request, res: Response) => {
    try {
        const result = await analyticsService.refreshAnalyticsService();
        if (result.success) {
            res.json(result);
        } else {
            res.status(500).json(result);
        }
    } catch (e: any) {
        console.error('[Analytics] refresh error:', e);
        res.status(500).json({ error: e.message });
    }
});

export default router;
