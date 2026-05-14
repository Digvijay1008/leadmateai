import { Router, Request, Response, NextFunction } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { config } from '../../../../core/index.js';
import { query, queryOne, withTransaction, txQuery, txQueryOne } from '../../../../platform/index.js';
import { ValidationError, UnauthorizedError, ConflictError } from '../../../../shared/index.js';
import { authenticateUser, type AuthenticatedRequest } from '../../../../core/middleware/auth.js';
import { loginRateLimit } from '../../../../core/middleware/rate-limit.js';
import crypto from 'crypto';

const router = Router();
const SALT_ROUNDS = 12;

// ===========================================
// SCHEMAS
// ===========================================

const signupSchema = z.object({
    email: z.string().email(),
    password: z.string().min(8),
    businessName: z.string().min(2),
    ownerName: z.string().min(2),
});

const loginSchema = z.object({
    email: z.string().email(),
    password: z.string(),
});

// ===========================================
// ROUTES
// ===========================================

/**
 * POST /v1/auth/signup
 */
router.post('/signup', async (req: Request, res: Response, next: NextFunction) => {
    try {
        const validated = signupSchema.parse(req.body);

        // Check if email already exists
        const existing = await queryOne('SELECT id FROM tenants WHERE email = $1', [validated.email]);
        if (existing) {
            throw new ConflictError('Email already registered');
        }

        // Hash password
        const passwordHash = await bcrypt.hash(validated.password, SALT_ROUNDS);

        const result = await withTransaction(async (client) => {
            // Generate a dummy user_id since we bypassed Supabase Auth
            const dummyUserId = crypto.randomUUID();

            // 1. Create tenant
            const tenant = await txQueryOne<{ id: string; business_name: string; email: string }>(
                client,
                `INSERT INTO tenants (user_id, business_name, owner_name, email, password_hash, status)
                 VALUES ($1, $2, $3, $4, $5, 'trial')
                 RETURNING id, business_name, email`,
                [dummyUserId, validated.businessName, validated.ownerName, validated.email, passwordHash]
            );

            if (!tenant) throw new Error('Failed to create tenant');

            // 2. Create wallet
            await txQuery(
                client,
                `INSERT INTO wallets (tenant_id, balance) VALUES ($1, 0)`,
                [tenant.id]
            );

            return tenant;
        });

        // Generate JWT
        const token = jwt.sign(
            { tenantId: result.id, email: result.email, role: result.email === 'admin@leadmate.com' ? 'admin' : 'user' },
            config.jwt.secret,
            { expiresIn: '7d' }
        );

        res.status(201).json({
            token,
            tenant: {
                id: result.id,
                name: result.business_name,
                email: result.email
            }
        });
    } catch (e) {
        next(e);
    }
});

/**
 * POST /v1/auth/login
 * Rate limited: 10 attempts per IP per 15 minutes (failed attempts only)
 */
router.post('/login', loginRateLimit, async (req: Request, res: Response, next: NextFunction) => {
    try {
        const validated = loginSchema.parse(req.body);

        // Find tenant + wallet balance
        const tenant = await queryOne<any>(
            `SELECT t.id, t.business_name, t.email, t.password_hash, t.widget_key, t.allowed_domains, w.balance 
             FROM tenants t
             JOIN wallets w ON w.tenant_id = t.id
             WHERE t.email = $1`,
            [validated.email]
        );

        if (!tenant) {
            throw new UnauthorizedError('Invalid credentials');
        }

        // Compare password
        const isMatch = await bcrypt.compare(validated.password, tenant.password_hash);
        if (!isMatch) {
            throw new UnauthorizedError('Invalid credentials');
        }

        // Generate JWT
        const token = jwt.sign(
            { tenantId: tenant.id, email: tenant.email, role: tenant.email === 'admin@leadmate.com' ? 'admin' : 'user' },
            config.jwt.secret,
            { expiresIn: '7d' }
        );

        res.json({
            token,
            tenant: {
                id: tenant.id,
                name: tenant.business_name,
                email: tenant.email,
                widgetKey: tenant.widget_key,
                allowedDomains: tenant.allowed_domains ?? [],
                walletBalance: parseFloat(tenant.balance)
            }
        });
    } catch (e) {
        next(e);
    }
});

/**
 * GET /v1/auth/me
 */
router.get('/me', authenticateUser(), async (req: Request, res: Response, next: NextFunction) => {
    try {
        const authReq = req as AuthenticatedRequest;
        const tenantId = authReq.auth.tenantId;

        const tenant = await queryOne<any>(
            `SELECT t.id, t.business_name as name, t.email, t.widget_key, t.allowed_domains, w.balance 
             FROM tenants t
             JOIN wallets w ON w.tenant_id = t.id
             WHERE t.id = $1`,
            [tenantId]
        );

        if (!tenant) {
            throw new UnauthorizedError('Tenant not found');
        }

        res.json({
            tenant: {
                ...tenant,
                widgetKey: tenant.widget_key,
                allowedDomains: tenant.allowed_domains ?? [],
                balance: parseFloat(tenant.balance)
            }
        });
    } catch (e) {
        next(e);
    }
});

export default router;
