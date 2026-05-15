import { config } from '../../../core/index.js';
import {
    getWallet,
    getAvailableBalance,
    createHold,
    settleHold,
    releaseHold,
    getWalletTransactions,
} from '../repositories/wallet.repository.js';
import { getActivePresetById } from '../repositories/preset.repository.js';
import { getTenantVoiceConfig } from '../repositories/tenant.repository.js';
import { calculateMaxDuration, calculateHoldAmount } from '../../../shared/index.js';
import {
    InsufficientFundsError,
    NotFoundError,
    InternalError
} from '../../../shared/index.js';
import type { Wallet, WalletHold } from '../../../shared/index.js';
import type { WalletBalanceResponse, WalletTransactionsResponse } from '../../../shared/index.js';

// ===========================================
// WALLET SERVICE
// ===========================================

/**
 * Get wallet balance with available minutes calculation
 */
export async function getWalletBalance(tenantId: string): Promise<WalletBalanceResponse> {
    const wallet = await getWallet(tenantId);

    if (!wallet) {
        throw new NotFoundError('Wallet');
    }

    const availableBalance = await getAvailableBalance(tenantId);

    // Get current preset to calculate available minutes
    const voiceConfig = await getTenantVoiceConfig(tenantId);
    const preset = voiceConfig
        ? await getActivePresetById(voiceConfig.preset_id)
        : null;

    const pricePerMin = preset
        ? parseFloat(preset.base_price_per_min as any)
        : config.billing.lowBalanceThreshold;

    const availableMinutes = pricePerMin > 0
        ? Math.floor(availableBalance / pricePerMin)
        : 0;

    const balance = parseFloat(wallet.balance as any);
    const isLowBalance = balance <= wallet.low_balance_threshold;

    return {
        tenant_id: tenantId,
        balance,
        currency: wallet.currency,
        available_minutes: availableMinutes,
        low_balance_threshold: wallet.low_balance_threshold,
        is_low_balance: isLowBalance,
    };
}

/**
 * Check if tenant can afford a session
 * Returns max duration if yes, throws InsufficientFundsError if no
 */
export async function checkSessionAffordability(
    tenantId: string,
    presetId: string
): Promise<{
    canAfford: boolean;
    maxDurationSeconds: number;
    availableBalance: number;
    pricePerMinute: number;
    currency: string;
}> {
    const availableBalance = await getAvailableBalance(tenantId);

    const preset = await getActivePresetById(presetId);
    if (!preset) {
        throw new NotFoundError(`Voice preset: ${presetId}`);
    }

    const pricePerMinute = parseFloat(preset.base_price_per_min as any);
    const minCostForSession = pricePerMinute * config.session.minBalanceForSession;

    if (availableBalance < minCostForSession) {
        throw new InsufficientFundsError(
            availableBalance,
            minCostForSession,
            preset.currency
        );
    }

    const maxDurationSeconds = calculateMaxDuration(
        availableBalance,
        pricePerMinute,
        config.session.defaultMaxDurationSeconds * 2  // Allow up to 2x default
    );

    return {
        canAfford: true,
        maxDurationSeconds,
        availableBalance,
        pricePerMinute,
        currency: preset.currency,
    };
}

/**
 * Create a hold for a session
 */
export async function createSessionHold(
    tenantId: string,
    sessionId: string,
    maxDurationSeconds: number,
    pricePerMinute: number
): Promise<WalletHold> {
    const holdAmount = calculateHoldAmount(
        maxDurationSeconds,
        pricePerMinute,
        config.billing.holdDurationMultiplier
    );

    try {
        return await createHold(
            tenantId,
            sessionId,
            holdAmount,
            config.billing.holdExpirationMinutes
        );
    } catch (error) {
        if (error instanceof Error && error.message.includes('Insufficient')) {
            throw new InsufficientFundsError(0, holdAmount, 'INR');
        }
        throw error;
    }
}

/**
 * Settle a session hold after completion
 */
export async function settleSessionHold(
    holdId: string,
    actualCost: number
): Promise<{
    settled: number;
    released: number;
    newBalance: number;
}> {
    return settleHold(holdId, actualCost);
}

/**
 * Release a session hold without charging (cancelled session)
 */
export async function releaseSessionHold(holdId: string): Promise<void> {
    return releaseHold(holdId);
}

/**
 * Get transaction history
 */
export async function getTransactionHistory(
    tenantId: string,
    page: number = 1,
    limit: number = 50
): Promise<WalletTransactionsResponse> {
    const offset = (page - 1) * limit;

    const { transactions, total } = await getWalletTransactions(tenantId, {
        limit,
        offset,
    });

    return {
        transactions: transactions.map(tx => ({
            id: tx.id,
            type: tx.type,
            amount: parseFloat(tx.amount as any),
            balance_after: parseFloat(tx.balance_after as any),
            description: tx.description,
            created_at: tx.created_at.toISOString(),
            reference_type: tx.reference_type,
            reference_id: tx.reference_id,
        })),
        pagination: {
            page,
            limit,
            total,
            has_more: offset + transactions.length < total,
        },
    };
}
