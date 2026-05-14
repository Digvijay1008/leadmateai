import rateLimit from 'express-rate-limit';

// ===========================================
// GLOBAL RATE LIMIT (200 req / 15 min per IP)
// ===========================================

export const globalRateLimit = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 200,
    message: { error: { code: 'RATE_LIMITED', message: 'Too many requests' } },
    standardHeaders: true,
    legacyHeaders: false,
    skip: (req) => {
        const path = req.path || req.originalUrl || '';
        return path.includes('/sip');
    },
});

// ===========================================
// SESSION RATE LIMIT (10 / min per tenant)
// ===========================================

export const sessionRateLimit = rateLimit({
    windowMs: 60 * 1000,
    max: 10,
    keyGenerator: (req) => {
        // Rate limit by tenant, not IP
        const tenantId = req.body?.tenant_id || req.body?.tenantId;
        if (tenantId && typeof tenantId === 'string') return tenantId;
        // Fallback to IP (normalize IPv6 localhost)
        const ip = req.ip || '127.0.0.1';
        return ip.replace(/^::ffff:/, '');
    },
    message: { error: { code: 'TOO_MANY_SESSIONS', message: 'Session limit reached. Please wait.' } },
    standardHeaders: true,
    legacyHeaders: false,
    // Disable built-in validation — we handle IPv6 normalization ourselves
    validate: false,
});

// ===========================================
// CONFIG UPDATE RATE LIMIT (30 / min per tenant)
// ===========================================

export const configRateLimit = rateLimit({
    windowMs: 60 * 1000,
    max: 30,
    keyGenerator: (req: any) => {
        const tenantId = req.auth?.tenantId;
        if (tenantId && typeof tenantId === 'string') return tenantId;
        const ip = req.ip || '127.0.0.1';
        return ip.replace(/^::ffff:/, '');
    },
    message: { error: { code: 'RATE_LIMITED', message: 'Config update limit reached.' } },
    standardHeaders: true,
    legacyHeaders: false,
    validate: false,
});

// ===========================================
// LOGIN RATE LIMIT (10 attempts / 15 min per IP)
// Protects against brute-force credential attacks
// ===========================================

export const loginRateLimit = rateLimit({
    windowMs: 15 * 60 * 1000,  // 15-minute window
    max: 10,                    // max 10 login attempts
    keyGenerator: (req) => {
        const ip = req.ip || '127.0.0.1';
        return ip.replace(/^::ffff:/, '');
    },
    message: { error: { code: 'TOO_MANY_LOGIN_ATTEMPTS', message: 'Too many login attempts. Please wait 15 minutes before trying again.' } },
    standardHeaders: true,
    legacyHeaders: false,
    validate: false,
    skipSuccessfulRequests: true, // Only count failed attempts
});

