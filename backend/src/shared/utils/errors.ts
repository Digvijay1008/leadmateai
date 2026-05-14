import type { APIErrorCode } from '../types/api.js';

// ===========================================
// CUSTOM ERROR CLASSES
// ===========================================

/**
 * Base API Error - All custom errors extend this
 */
export class APIError extends Error {
    public readonly code: APIErrorCode;
    public readonly statusCode: number;
    public readonly details?: Record<string, any>;

    constructor(
        code: APIErrorCode,
        message: string,
        statusCode: number = 500,
        details?: Record<string, any>
    ) {
        super(message);
        this.name = 'APIError';
        this.code = code;
        this.statusCode = statusCode;
        this.details = details;

        // Maintains proper stack trace
        Error.captureStackTrace(this, this.constructor);
    }

    toJSON() {
        return {
            error: {
                code: this.code,
                message: this.message,
                ...(this.details && { details: this.details }),
            },
        };
    }
}

// ===========================================
// SPECIFIC ERROR TYPES
// ===========================================

export class ValidationError extends APIError {
    constructor(message: string, details?: Record<string, any>) {
        super('INVALID_REQUEST', message, 400, details);
        this.name = 'ValidationError';
    }
}

export class UnauthorizedError extends APIError {
    constructor(message: string = 'Authentication required') {
        super('UNAUTHORIZED', message, 401);
        this.name = 'UnauthorizedError';
    }
}

export class ForbiddenError extends APIError {
    constructor(message: string = 'Access denied') {
        super('FORBIDDEN', message, 403);
        this.name = 'ForbiddenError';
    }
}

export class ConflictError extends APIError {
    constructor(message: string) {
        super('CONFLICT', message, 409);
        this.name = 'ConflictError';
    }
}

export class NotFoundError extends APIError {
    constructor(resource: string) {
        super('NOT_FOUND', `${resource} not found`, 404);
        this.name = 'NotFoundError';
    }
}

export class InsufficientFundsError extends APIError {
    constructor(
        balance: number,
        required: number,
        currency: string = 'INR'
    ) {
        super(
            'INSUFFICIENT_FUNDS',
            `Insufficient wallet balance. Available: ${currency} ${balance.toFixed(2)}, Required: ${currency} ${required.toFixed(2)}`,
            402,
            { balance, required, currency }
        );
        this.name = 'InsufficientFundsError';
    }
}

export class SessionNotFoundError extends APIError {
    constructor(sessionId: string) {
        super('SESSION_NOT_FOUND', `Session not found: ${sessionId}`, 404);
        this.name = 'SessionNotFoundError';
    }
}

export class SessionAlreadyEndedError extends APIError {
    constructor(sessionId: string, status: string) {
        super(
            'SESSION_ALREADY_ENDED',
            `Session has already ended with status: ${status}`,
            400,
            { session_id: sessionId, current_status: status }
        );
        this.name = 'SessionAlreadyEndedError';
    }
}

export class TenantSuspendedError extends APIError {
    constructor(tenantId: string) {
        super(
            'TENANT_SUSPENDED',
            'Your account has been suspended. Please contact support.',
            403,
            { tenant_id: tenantId }
        );
        this.name = 'TenantSuspendedError';
    }
}

export class PresetNotFoundError extends APIError {
    constructor(presetId: string) {
        super('PRESET_NOT_FOUND', `Voice preset not found: ${presetId}`, 404);
        this.name = 'PresetNotFoundError';
    }
}

export class InternalError extends APIError {
    constructor(message: string = 'An internal error occurred') {
        super('INTERNAL_ERROR', message, 500);
        this.name = 'InternalError';
    }
}

// ===========================================
// ERROR HELPER FUNCTIONS
// ===========================================

/**
 * Type guard to check if error is an APIError
 */
export function isAPIError(error: unknown): error is APIError {
    return error instanceof APIError;
}

/**
 * Wrap unknown errors into APIError format
 */
export function normalizeError(error: unknown): APIError {
    if (isAPIError(error)) {
        return error;
    }

    if (error instanceof Error) {
        return new InternalError(error.message);
    }

    return new InternalError('An unknown error occurred');
}
