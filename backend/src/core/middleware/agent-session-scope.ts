import { Request } from 'express';
import { AgentRequest } from './auth.js';
import { ValidationError, ForbiddenError } from '../../shared/utils/errors.js';

/**
 * Enforce that the authenticated agent token can only access its own session.
 */
export function requireAgentSessionScope(
    req: Request,
    sessionId: string | undefined
): AgentRequest {
    if (!sessionId) {
        throw new ValidationError('Session ID required');
    }

    const agentReq = req as AgentRequest;
    if (!agentReq.auth || agentReq.auth.type !== 'agent') {
        throw new ForbiddenError('Agent authentication required');
    }

    if (sessionId !== agentReq.auth.sessionId) {
        throw new ForbiddenError('Session ID mismatch with agent token');
    }

    return agentReq;
}
