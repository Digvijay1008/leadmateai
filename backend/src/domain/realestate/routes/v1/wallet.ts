import { Router, Request, Response } from 'express';
import {
    getWalletBalance,
    getTransactionHistory
} from '../../services/wallet.service.js';
import {
    authenticateUser,
    type AuthenticatedRequest
} from '../../../../core/middleware/auth.js';
import { ValidationError } from '../../../../shared/index.js';

const router = Router();

// ===========================================
// ROUTES
// ===========================================

/**
 * GET /v1/wallet/balance
 * Get current wallet balance and available minutes
 * 
 * Requires user authentication
 */
router.get('/balance', authenticateUser(), async (req: Request, res: Response) => {
    const authReq = req as AuthenticatedRequest;

    const result = await getWalletBalance(authReq.auth.tenantId);

    res.json(result);
});

/**
 * GET /v1/wallet/transactions
 * Get transaction history with pagination
 * 
 * Query params:
 * - page: Page number (default 1)
 * - limit: Items per page (default 50, max 100)
 */
router.get('/transactions', authenticateUser(), async (req: Request, res: Response) => {
    const authReq = req as AuthenticatedRequest;

    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 50));

    const result = await getTransactionHistory(
        authReq.auth.tenantId,
        page,
        limit
    );

    res.json(result);
});

/**
 * POST /v1/wallet/topup
 * Initiate a wallet top-up
 * 
 * Note: This would integrate with payment gateway (Razorpay/Stripe)
 * For now, returns placeholder response
 */
router.post('/topup', authenticateUser(), async (req: Request, res: Response) => {
    const authReq = req as AuthenticatedRequest;

    const { amount } = req.body;

    if (!amount || typeof amount !== 'number' || amount <= 0) {
        throw new ValidationError('Valid amount required');
    }

    // TODO: Integrate with payment gateway
    // 1. Create payment order
    // 2. Return payment link/order ID
    // 3. On webhook confirmation, credit wallet

    res.json({
        message: 'Payment gateway integration pending',
        tenant_id: authReq.auth.tenantId,
        requested_amount: amount,
        currency: 'INR',
        status: 'not_implemented',
    });
});

export default router;
