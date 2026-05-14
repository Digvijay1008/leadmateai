import { Request, Response, NextFunction, ErrorRequestHandler } from 'express';
import { ZodError } from 'zod';
import { config } from '../config/index.js';
import { APIError, isAPIError, normalizeError } from '../../shared/utils/errors.js';

// ===========================================
// ERROR HANDLER MIDDLEWARE
// ===========================================

export const errorHandler: ErrorRequestHandler = (
    error: unknown,
    req: Request,
    res: Response,
    next: NextFunction
) => {
    // Already sent response
    if (res.headersSent) {
        return next(error);
    }

    // Handle Zod validation errors
    if (error instanceof ZodError) {
        const formattedErrors = error.errors.map(e => ({
            field: e.path.join('.'),
            message: e.message,
        }));

        res.status(400).json({
            error: {
                code: 'INVALID_REQUEST',
                message: 'Validation failed',
                details: { errors: formattedErrors },
            },
        });
        return;
    }

    // Handle known API errors
    if (isAPIError(error)) {
        res.status(error.statusCode).json(error.toJSON());
        return;
    }

    // Log unknown errors
    console.error('Unhandled error:', error);

    // Normalize and respond
    const normalizedError = normalizeError(error);

    // In production, hide internal error details
    if (config.server.isProd) {
        res.status(500).json({
            error: {
                code: 'INTERNAL_ERROR',
                message: 'An unexpected error occurred',
            },
        });
        return;
    }

    // In development, include more details
    res.status(normalizedError.statusCode).json({
        error: {
            code: normalizedError.code,
            message: normalizedError.message,
            stack: error instanceof Error ? error.stack : undefined,
        },
    });
};

// ===========================================
// NOT FOUND HANDLER
// ===========================================

export function notFoundHandler(req: Request, res: Response) {
    res.status(404).json({
        error: {
            code: 'NOT_FOUND',
            message: `Route not found: ${req.method} ${req.path}`,
        },
    });
}
