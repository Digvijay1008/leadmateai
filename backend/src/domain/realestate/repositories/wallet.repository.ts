import {
    query,
    queryOne,
    queryMany,
    withTransaction,
    txQuery,
    txQueryOne,
    type TransactionClient
} from '../../../platform/index.js';
import { config } from '../../../core/index.js';
import { addMinutes, generateId } from '../../../shared/index.js';
import type {
    Wallet,
    WalletTransaction,
    WalletHold,
    WalletTransactionType
} from '../../../shared/index.js';

// ===========================================
// WALLET REPOSITORY
// ===========================================

/**
 * Get wallet by tenant ID
 */
export async function getWallet(tenantId: string): Promise<Wallet | null> {
    return queryOne<Wallet>(
        `SELECT * FROM wallets WHERE tenant_id = $1`,
        [tenantId]
    );
}

/**
 * Get wallet balance
 */
export async function getWalletBalance(tenantId: string): Promise<number | null> {
    const result = await queryOne<{ balance: string }>(
        `SELECT balance FROM wallets WHERE tenant_id = $1`,
        [tenantId]
    );

    if (!result) return null;
    return parseFloat(result.balance);
}

/**
 * Get available balance (balance minus active holds)
 */
export async function getAvailableBalance(tenantId: string): Promise<number> {
    const result = await queryOne<{ available: string }>(
        `SELECT 
      COALESCE(w.balance, 0) - COALESCE(SUM(h.amount), 0) as available
     FROM wallets w
     LEFT JOIN wallet_holds h ON w.tenant_id = h.wallet_id AND h.status = 'active'
     WHERE w.tenant_id = $1
     GROUP BY w.tenant_id, w.balance`,
        [tenantId]
    );

    if (!result) return 0;
    return Math.max(0, parseFloat(result.available));
}

/**
 * Create a wallet hold for a session
 * This reserves funds before the session starts
 */
export async function createHold(
    tenantId: string,
    sessionId: string,
    amount: number,
    expiresInMinutes: number = config.billing.holdExpirationMinutes
): Promise<WalletHold> {
    return withTransaction(async (client) => {
        // Lock the wallet row for update
        const wallet = await txQueryOne<Wallet>(
            client,
            `SELECT * FROM wallets WHERE tenant_id = $1 FOR UPDATE`,
            [tenantId]
        );

        if (!wallet) {
            throw new Error(`Wallet not found for tenant: ${tenantId}`);
        }

        // Calculate available balance (excluding active holds)
        const activeHoldsResult = await txQueryOne<{ total: string }>(
            client,
            `SELECT COALESCE(SUM(amount), 0) as total 
       FROM wallet_holds 
       WHERE wallet_id = $1 AND status = 'active'`,
            [tenantId]
        );

        const activeHoldsTotal = parseFloat(activeHoldsResult?.total ?? '0');
        const available = parseFloat(wallet.balance as any) - activeHoldsTotal;

        if (available < amount) {
            throw new Error(`Insufficient available balance. Available: ${available}, Required: ${amount}`);
        }

        // Create the hold
        const holdId = generateId();
        const expiresAt = addMinutes(new Date(), expiresInMinutes);

        const hold = await txQueryOne<WalletHold>(
            client,
            `INSERT INTO wallet_holds (id, wallet_id, session_id, amount, expires_at)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
            [holdId, tenantId, sessionId, amount, expiresAt.toISOString()]
        );

        // Record the hold transaction
        await txQuery(
            client,
            `INSERT INTO wallet_transactions 
       (wallet_id, type, amount, balance_after, reference_type, reference_id, description)
       VALUES ($1, 'hold_created', $2, $3, 'hold', $4, $5)`,
            [
                tenantId,
                -amount,  // Negative because it reduces available
                available - amount,
                holdId,
                `Hold created for session ${sessionId}`,
            ]
        );

        return hold!;
    });
}

/**
 * Settle a hold after session ends
 * Deducts actual usage and releases remainder
 */
export async function settleHold(
    holdId: string,
    actualCost: number
): Promise<{
    settled: number;
    released: number;
    newBalance: number;
}> {
    return withTransaction(async (client) => {
        // Lock the hold for update
        const hold = await txQueryOne<WalletHold>(
            client,
            `SELECT * FROM wallet_holds WHERE id = $1 FOR UPDATE`,
            [holdId]
        );

        if (!hold) {
            throw new Error(`Hold not found: ${holdId}`);
        }

        if (hold.status !== 'active') {
            throw new Error(`Hold is not active: ${hold.status}`);
        }

        // Calculate amounts
        const holdAmount = parseFloat(hold.amount as any);
        const settled = Math.min(actualCost, holdAmount);
        const released = holdAmount - settled;

        // Lock the wallet
        const wallet = await txQueryOne<Wallet>(
            client,
            `SELECT * FROM wallets WHERE tenant_id = $1 FOR UPDATE`,
            [hold.wallet_id]
        );

        if (!wallet) {
            throw new Error(`Wallet not found: ${hold.wallet_id}`);
        }

        const currentBalance = parseFloat(wallet.balance as any);
        const newBalance = currentBalance - settled;

        // Update wallet balance
        await txQuery(
            client,
            `UPDATE wallets SET balance = $1, updated_at = NOW() WHERE tenant_id = $2`,
            [newBalance, hold.wallet_id]
        );

        // Mark hold as settled
        await txQuery(
            client,
            `UPDATE wallet_holds 
       SET status = 'settled', settled_amount = $1, settled_at = NOW()
       WHERE id = $2`,
            [settled, holdId]
        );

        // Record the settlement transaction
        await txQuery(
            client,
            `INSERT INTO wallet_transactions 
       (wallet_id, type, amount, balance_after, reference_type, reference_id, description)
       VALUES ($1, 'usage_deduction', $2, $3, 'session', $4, $5)`,
            [
                hold.wallet_id,
                -settled,
                newBalance,
                hold.session_id,
                `Session usage: ${settled} (hold: ${holdAmount}, released: ${released})`,
            ]
        );

        // If there's a release amount, log it
        if (released > 0) {
            await txQuery(
                client,
                `INSERT INTO wallet_transactions 
         (wallet_id, type, amount, balance_after, reference_type, reference_id, description)
         VALUES ($1, 'hold_released', $2, $3, 'hold', $4, $5)`,
                [
                    hold.wallet_id,
                    released,  // Positive because it returns to available
                    newBalance,
                    holdId,
                    `Unused hold released: ${released}`,
                ]
            );
        }

        return { settled, released, newBalance };
    });
}

/**
 * Release a hold without settlement (e.g., session cancelled)
 */
export async function releaseHold(holdId: string): Promise<void> {
    await withTransaction(async (client) => {
        const hold = await txQueryOne<WalletHold>(
            client,
            `SELECT * FROM wallet_holds WHERE id = $1 FOR UPDATE`,
            [holdId]
        );

        if (!hold) {
            throw new Error(`Hold not found: ${holdId}`);
        }

        if (hold.status !== 'active') {
            return; // Already released or settled
        }

        // Mark as released
        await txQuery(
            client,
            `UPDATE wallet_holds SET status = 'released' WHERE id = $1`,
            [holdId]
        );

        // Get current balance for transaction log
        const wallet = await txQueryOne<Wallet>(
            client,
            `SELECT balance FROM wallets WHERE tenant_id = $1`,
            [hold.wallet_id]
        );

        // Record the release
        await txQuery(
            client,
            `INSERT INTO wallet_transactions 
       (wallet_id, type, amount, balance_after, reference_type, reference_id, description)
       VALUES ($1, 'hold_released', $2, $3, 'hold', $4, $5)`,
            [
                hold.wallet_id,
                parseFloat(hold.amount as any),
                parseFloat(wallet?.balance as any ?? 0),
                holdId,
                `Hold released (session cancelled)`,
            ]
        );
    });
}

/**
 * Get transactions for a wallet
 */
export async function getWalletTransactions(
    tenantId: string,
    options: { limit?: number; offset?: number } = {}
): Promise<{ transactions: WalletTransaction[]; total: number }> {
    const { limit = 50, offset = 0 } = options;

    const [transactions, countResult] = await Promise.all([
        queryMany<WalletTransaction>(
            `SELECT * FROM wallet_transactions 
       WHERE wallet_id = $1 
       ORDER BY created_at DESC 
       LIMIT $2 OFFSET $3`,
            [tenantId, limit, offset]
        ),
        queryOne<{ count: string }>(
            `SELECT COUNT(*) as count FROM wallet_transactions WHERE wallet_id = $1`,
            [tenantId]
        ),
    ]);

    return {
        transactions,
        total: parseInt(countResult?.count ?? '0', 10),
    };
}

/**
 * Add funds to wallet (topup)
 */
export async function addFunds(
    tenantId: string,
    amount: number,
    referenceId: string,
    description: string
): Promise<number> {
    return withTransaction(async (client) => {
        const wallet = await txQueryOne<Wallet>(
            client,
            `SELECT * FROM wallets WHERE tenant_id = $1 FOR UPDATE`,
            [tenantId]
        );

        if (!wallet) {
            throw new Error(`Wallet not found: ${tenantId}`);
        }

        const currentBalance = parseFloat(wallet.balance as any);
        const newBalance = currentBalance + amount;

        await txQuery(
            client,
            `UPDATE wallets SET balance = $1, updated_at = NOW() WHERE tenant_id = $2`,
            [newBalance, tenantId]
        );

        await txQuery(
            client,
            `INSERT INTO wallet_transactions 
       (wallet_id, type, amount, balance_after, reference_type, reference_id, description)
       VALUES ($1, 'topup', $2, $3, 'payment', $4, $5)`,
            [tenantId, amount, newBalance, referenceId, description]
        );

        return newBalance;
    });
}

/**
 * Expire old active holds
 */
export async function expireStaleHolds(): Promise<number> {
    const result = await query(
        `UPDATE wallet_holds 
     SET status = 'expired'
     WHERE status = 'active' AND expires_at < NOW()
     RETURNING id`
    );

    return result.rowCount ?? 0;
}
