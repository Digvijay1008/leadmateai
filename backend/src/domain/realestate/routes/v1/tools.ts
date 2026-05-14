/**
 * Tools API Routes
 * 
 * Endpoints for agent to execute tools.
 */

import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { authenticateAgent, type AgentRequest } from '../../../../core/middleware/auth.js';
import { ValidationError } from '../../../../shared/index.js';
import { toolsRegistry } from '../../services/tools/registry.js';
import { executeToolForTenant } from '../../services/tools/executor.service.js';

const router = Router();

// ===========================================
// REQUEST SCHEMAS
// ===========================================

const executeToolSchema = z.object({
    tool_name: z.string().min(1),
    tool_input: z.record(z.unknown()).optional(),
});

// ===========================================
// ROUTES
// ===========================================

/**
 * POST /v1/tools/execute
 * Execute a tool
 * 
 * Called by the agent during conversation.
 * Requires agent authentication.
 */
router.post('/execute', authenticateAgent(), async (req: Request, res: Response) => {
    const parseResult = executeToolSchema.safeParse(req.body);

    if (!parseResult.success) {
        throw new ValidationError('Invalid request body', {
            errors: parseResult.error.errors,
        });
    }

    const { tool_name, tool_input } = parseResult.data;
    const agentReq = req as AgentRequest;

    const tenantId = agentReq.auth.tenantId;
    const sessionId = agentReq.auth.sessionId;

    console.log('[Tools] Requested tool execution:', { tool_name, session_id: sessionId, tenant_id: tenantId });

    if (!toolsRegistry[tool_name]) {
        res.json({ success: false, error: `Unknown tool: ${tool_name}` });
        return;
    }

    // Validate parameters against tool schema
    const paramParseResult = toolsRegistry[tool_name].schema.safeParse(tool_input || {});
    if (!paramParseResult.success) {
        res.json({
            success: false,
            error: 'Invalid tool input',
            details: paramParseResult.error.errors,
        });
        return;
    }

    try {
        const result = await executeToolForTenant(
            tenantId,
            sessionId,
            tool_name,
            paramParseResult.data
        );

        res.json(result);
    } catch (e: any) {
        console.error('[Tools] Executor crash:', e);
        res.json({ success: false, error: 'Internal server error while executing tool' });
    }
});

/**
 * GET /v1/tools/available
 * List available tools
 */
router.get('/available', authenticateAgent(), async (_req: Request, res: Response) => {
    const tools = Object.entries(toolsRegistry).map(([name, tool]) => ({
        name,
        description: tool.description,
    }));

    res.json({ tools });
});

export default router;
