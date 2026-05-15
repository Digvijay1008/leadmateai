import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { authenticateUser } from '../../../../core/middleware/auth.js';
import { ValidationError } from '../../../../shared/index.js';
import { query, queryMany, queryOne } from '../../../../platform/db/client.js';

const router = Router();

// ===========================================
// SCHEMAS
// ===========================================

const createCampaignSchema = z.object({
    name: z.string().min(1),
    agent_id: z.string().optional(),
    schedule_time: z.string().optional(),
});

const uploadLeadsSchema = z.object({
    leads: z.array(z.object({
        phone_number: z.string().min(5),
        metadata: z.record(z.any()).optional()
    })).min(1).max(1000)
});

// ===========================================
// ROUTES
// ===========================================

router.get('/', authenticateUser(), async (req: Request, res: Response) => {
    const tenantId = (req as any).auth!.tenantId;
    const campaigns = await queryMany(
        `SELECT * FROM campaigns WHERE tenant_id = $1 ORDER BY created_at DESC`,
        [tenantId]
    );
    res.json(campaigns);
});

/**
 * Get campaign details
 */
router.get('/:id', authenticateUser(), async (req: Request, res: Response) => {
    const tenantId = (req as any).auth!.tenantId;
    const { id } = req.params;
    const campaign = await queryOne(
        `SELECT * FROM campaigns WHERE id = $1 AND tenant_id = $2`,
        [id, tenantId]
    );
    if (!campaign) throw new ValidationError('Campaign not found');
    res.json(campaign);
});

/**
 * Create campaign
 */
router.post('/', authenticateUser(), async (req: Request, res: Response) => {
    const parseResult = createCampaignSchema.safeParse(req.body);
    if (!parseResult.success) throw new ValidationError('Invalid request', { errors: parseResult.error.errors });
    
    const tenantId = (req as any).auth!.tenantId;
    const data = parseResult.data;
    
    const campaign = await queryOne(
        `INSERT INTO campaigns (tenant_id, name, agent_id, status, schedule_time) 
         VALUES ($1, $2, $3, 'draft', $4) RETURNING *`,
        [tenantId, data.name, data.agent_id || null, data.schedule_time || null]
    );
    
    res.status(201).json(campaign);
});

/**
 * Upload leads and activate campaign
 */
router.post('/:id/leads', authenticateUser(), async (req: Request, res: Response) => {
    const parseResult = uploadLeadsSchema.safeParse(req.body);
    if (!parseResult.success) throw new ValidationError('Invalid request', { errors: parseResult.error.errors });
    
    const tenantId = (req as any).auth!.tenantId;
    const { id } = req.params;
    const { leads } = parseResult.data;

    // Verify campaign belongs to this tenant before inserting
    const campaign = await queryOne(
        `SELECT id FROM campaigns WHERE id = $1 AND tenant_id = $2`,
        [id, tenantId]
    );
    if (!campaign) throw new ValidationError('Campaign not found');

    // Fully parameterized bulk insert using unnest — NO string interpolation
    const phoneNumbers = leads.map(l => l.phone_number);
    await query(
        `INSERT INTO campaign_calls (campaign_id, tenant_id, phone_number, status)
         SELECT $1, $2, unnest($3::text[]), 'pending'
         ON CONFLICT DO NOTHING`,
        [id, tenantId, phoneNumbers]
    );
    const addedCount = leads.length;
    
    // Update campaign
    await query(
        `UPDATE campaigns 
         SET total_leads = total_leads + $1, status = 'running', updated_at = NOW() 
         WHERE id = $2 AND tenant_id = $3`,
        [addedCount, id, tenantId]
    );
    
    res.json({ success: true, leads_added: addedCount });
});

export default router;
