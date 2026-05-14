import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config/index.js';
import { findTenantById, findTenantByUserId, findTenantByWidgetKey } from '../../domain/realestate/repositories/tenant.repository.js';
import { UnauthorizedError, ForbiddenError } from '../../shared/utils/errors.js';

// ===========================================
// AUTH MIDDLEWARE
// ===========================================

export interface AuthenticatedRequest extends Request {
    auth: {
        userId: string;
        tenantId: string;
        type: 'user' | 'agent';
        role: 'admin' | 'user';
    };
}

export interface AgentRequest extends Request {
    auth: {
        sessionId: string;
        tenantId: string;
        type: 'agent';
    };
}

/**
 * Middleware to authenticate user requests
 * Expects Bearer token in Authorization header
 */
export function authenticateUser() {
    return async (req: Request, res: Response, next: NextFunction) => {
        try {
            const authHeader = req.headers.authorization;

            if (!authHeader?.startsWith('Bearer ')) {
                throw new UnauthorizedError('Missing or invalid authorization header');
            }

            const token = authHeader.slice(7);

            // Verify JWT
            let decoded: any;
            try {
                decoded = jwt.verify(token, config.jwt.secret);
            } catch (error) {
                throw new UnauthorizedError('Invalid or expired token');
            }

            // Support both our custom auth token and the original Supabase token format
            if (!decoded.user_id && !decoded.tenantId) {
                throw new UnauthorizedError('Invalid token payload');
            }

            // If it's a Supabase token, look up the tenant
            if (decoded.user_id && !decoded.tenantId) {
                const tenant = await findTenantByUserId(decoded.user_id);
                if (!tenant) {
                    throw new ForbiddenError('No tenant found for this user');
                }
                
                (req as AuthenticatedRequest).auth = {
                    userId: decoded.user_id,
                    tenantId: tenant.id,
                    type: 'user',
                    role: (decoded?.user_metadata?.role === 'admin' || decoded?.app_metadata?.role === 'admin') ? 'admin' : 'user',
                };
            } else {
                // It's our custom token, we already have tenantId
                (req as AuthenticatedRequest).auth = {
                    userId: decoded.user_id || 'custom-auth-user',
                    tenantId: decoded.tenantId,
                    type: 'user',
                    role: decoded.role === 'admin' ? 'admin' : 'user',
                };
            }

            next();
        } catch (error) {
            next(error);
        }
    };
}

/**
 * Middleware to authenticate admin requests
 * Ensures the authenticated user has 'admin' role
 */
export function authenticateAdmin() {
    return async (req: Request, res: Response, next: NextFunction) => {
        try {
            // First authenticate generally
            await new Promise<void>((resolve, reject) => {
                authenticateUser()(req, res, (err) => {
                    if (err) reject(err);
                    else resolve();
                });
            });

            const authReq = req as AuthenticatedRequest;
            if (authReq.auth?.role !== 'admin') {
                throw new ForbiddenError('Admin access required');
            }
            
            next();
        } catch (error) {
            next(error);
        }
    };
}

/**
 * Middleware to authenticate agent requests
 * Used for internal agent -> backend communication
 */
export function authenticateAgent() {
    return async (req: Request, res: Response, next: NextFunction) => {
        try {
            const authHeader = req.headers.authorization;

            if (!authHeader?.startsWith('Bearer ')) {
                throw new UnauthorizedError('Missing or invalid authorization header');
            }

            const token = authHeader.slice(7);

            // Verify JWT
            let decoded: any;
            try {
                decoded = jwt.verify(token, config.jwt.secret);
            } catch (error) {
                throw new UnauthorizedError('Invalid or expired agent token');
            }

            // For agent tokens, we expect session_id and type = 'agent'
            if (decoded.type !== 'agent' || !decoded.session_id || !decoded.tenant_id) {
                throw new UnauthorizedError('Invalid agent token payload');
            }

            // Attach auth info to request
            (req as AgentRequest).auth = {
                sessionId: decoded.session_id,
                tenantId: decoded.tenant_id,
                type: 'agent',
            };

            next();
        } catch (error) {
            next(error);
        }
    };
}

/**
 * Middleware to validate tenant ID in request matches authenticated tenant
 * Use after authenticateUser or authenticateAgent
 */
export function validateTenantAccess(tenantIdParam: string = 'tenant_id') {
    return async (req: Request, res: Response, next: NextFunction) => {
        try {
            const auth = (req as AuthenticatedRequest).auth || (req as AgentRequest).auth;

            if (!auth) {
                throw new UnauthorizedError('Authentication required');
            }

            // Get tenant_id from body, params, or query
            const requestTenantId =
                req.body?.[tenantIdParam] ||
                req.params?.[tenantIdParam] ||
                req.query?.[tenantIdParam];

            if (requestTenantId && requestTenantId !== auth.tenantId) {
                throw new ForbiddenError('Access denied to this tenant');
            }

            next();
        } catch (error) {
            next(error);
        }
    };
}

/**
 * Middleware for public widget endpoints
 * Validates tenant exists but doesn't require user auth
 */
export function validateWidgetTenant() {
    return async (req: Request, res: Response, next: NextFunction) => {
        try {
            const tenantId = req.params.tenant_id || req.body?.tenant_id;
            const widgetKey = req.body?.widget_key || req.query?.widget_key;
            const hostOrigin = req.body?.host_origin || req.query?.host_origin || req.get('origin');

            let tenant = tenantId ? await findTenantById(tenantId) : null;

            if (!tenant && widgetKey) {
                tenant = await findTenantByWidgetKey(String(widgetKey));
            }

            if (!tenant) {
                throw new ForbiddenError('Invalid tenant');
            }

            if (tenant.status === 'suspended' || tenant.status === 'cancelled') {
                throw new ForbiddenError('Tenant is not active');
            }

            const allowedDomains = Array.isArray((tenant as any).allowed_domains)
                ? (tenant as any).allowed_domains.filter(Boolean)
                : [];

            if (allowedDomains.length > 0 && hostOrigin) {
                let hostname = '';
                try {
                    hostname = new URL(String(hostOrigin)).hostname.toLowerCase();
                } catch {
                    throw new ForbiddenError('Invalid widget origin');
                }

                const isAllowed = allowedDomains.some((domain: string) => {
                    const normalized = String(domain).replace(/^https?:\/\//, '').toLowerCase();
                    return hostname === normalized || hostname.endsWith(`.${normalized}`);
                });

                if (!isAllowed) {
                    throw new ForbiddenError('Widget origin is not allowed');
                }
            }

            req.body.tenant_id = tenant.id;

            // Attach tenant info to request
            (req as any).tenant = tenant;

            next();
        } catch (error) {
            next(error);
        }
    };
}
