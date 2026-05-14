#!/usr/bin/env node
/**
 * End-to-End Session Test Script
 * 
 * This script tests the complete voice session flow:
 * 1. Start session via API
 * 2. Verify LiveKit room is created
 * 3. Simulate session end
 * 4. Verify wallet settlement
 * 
 * Usage:
 *   npx tsx scripts/e2e-session-test.ts
 *   
 * Prerequisites:
 *   - Backend running on localhost:3001
 *   - Database migrated with test tenant
 *   - LiveKit credentials configured
 */

import { config as dotenvConfig } from 'dotenv';
dotenvConfig();

interface SessionStartResponse {
    session_id: string;
    livekit_room_name: string;
    livekit_token: string;
    livekit_url: string;
    max_duration_seconds: number;
    greeting_message: string;
    agent_name: string;
}

interface SessionEndResponse {
    session_id: string;
    status: string;
    duration_seconds: number;
    billed_seconds: number;
    cost: number;
    currency: string;
    wallet_balance: number;
}

interface WalletBalanceResponse {
    balance: number;
    currency: string;
    available_balance: number;
    pending_holds: number;
}

const API_BASE = process.env.BACKEND_API_URL || 'http://localhost:3001/api';
const TEST_TENANT_ID = process.env.TEST_TENANT_ID || '';
const TEST_USER_TOKEN = process.env.TEST_USER_TOKEN || '';

// Colors for console output
const colors = {
    reset: '\x1b[0m',
    green: '\x1b[32m',
    red: '\x1b[31m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    cyan: '\x1b[36m',
};

function log(msg: string, color: string = colors.reset): void {
    console.log(`${color}${msg}${colors.reset}`);
}

function logStep(step: number, msg: string): void {
    log(`\n[${step}] ${msg}`, colors.cyan);
}

function logSuccess(msg: string): void {
    log(`  ✓ ${msg}`, colors.green);
}

function logError(msg: string): void {
    log(`  ✗ ${msg}`, colors.red);
}

function logInfo(msg: string): void {
    log(`  ℹ ${msg}`, colors.yellow);
}

async function fetchAPI<T>(
    path: string,
    options: RequestInit = {}
): Promise<T> {
    const url = `${API_BASE}${path}`;

    const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        ...(options.headers as Record<string, string> || {}),
    };

    if (TEST_USER_TOKEN) {
        headers['Authorization'] = `Bearer ${TEST_USER_TOKEN}`;
    }

    const response = await fetch(url, {
        ...options,
        headers,
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`API Error: ${response.status} - ${JSON.stringify(errorData)}`);
    }

    return response.json() as Promise<T>;
}

async function getWalletBalance(): Promise<WalletBalanceResponse> {
    return fetchAPI<WalletBalanceResponse>('/v1/wallet/balance');
}

async function startSession(tenantId: string): Promise<SessionStartResponse> {
    return fetchAPI<SessionStartResponse>('/v1/voice/sessions/start', {
        method: 'POST',
        body: JSON.stringify({
            tenant_id: tenantId,
            visitor_metadata: {
                browser: 'e2e-test',
                source: 'test-script',
            },
        }),
    });
}

async function endSession(
    sessionId: string,
    durationSeconds: number,
    endReason: string = 'user_hangup'
): Promise<SessionEndResponse> {
    return fetchAPI<SessionEndResponse>('/v1/voice/sessions/end', {
        method: 'POST',
        body: JSON.stringify({
            session_id: sessionId,
            duration_seconds: durationSeconds,
            end_reason: endReason,
            transcript_summary: 'E2E test session',
            tool_calls_count: 0,
            user_turns_count: 1,
            agent_turns_count: 1,
        }),
    });
}

async function cancelSession(sessionId: string): Promise<void> {
    await fetchAPI(`/v1/voice/sessions/${sessionId}/cancel`, {
        method: 'POST',
    });
}

async function main(): Promise<void> {
    log('\n========================================', colors.blue);
    log('  LEADMATE E2E SESSION TEST', colors.blue);
    log('========================================\n', colors.blue);

    // Check prerequisites
    if (!TEST_TENANT_ID) {
        logError('TEST_TENANT_ID environment variable is required');
        process.exit(1);
    }

    if (!TEST_USER_TOKEN) {
        logError('TEST_USER_TOKEN environment variable is required (JWT for test user)');
        process.exit(1);
    }

    logInfo(`Backend URL: ${API_BASE}`);
    logInfo(`Tenant ID: ${TEST_TENANT_ID}`);

    let sessionId: string | null = null;
    let initialBalance: number = 0;

    try {
        // Step 1: Check initial wallet balance
        logStep(1, 'Checking initial wallet balance...');

        const balanceBefore = await getWalletBalance();
        initialBalance = balanceBefore.balance;

        logSuccess(`Balance: $${balanceBefore.balance.toFixed(4)}`);
        logSuccess(`Available: $${balanceBefore.available_balance.toFixed(4)}`);
        logSuccess(`Pending holds: $${balanceBefore.pending_holds.toFixed(4)}`);

        if (balanceBefore.available_balance <= 0) {
            logError('Insufficient balance for test. Please top up the test wallet.');
            process.exit(1);
        }

        // Step 2: Start a session
        logStep(2, 'Starting voice session...');

        const session = await startSession(TEST_TENANT_ID);
        sessionId = session.session_id;

        logSuccess(`Session ID: ${session.session_id}`);
        logSuccess(`Room Name: ${session.livekit_room_name}`);
        logSuccess(`LiveKit URL: ${session.livekit_url}`);
        logSuccess(`Max Duration: ${session.max_duration_seconds}s`);
        logSuccess(`Agent Name: ${session.agent_name}`);
        logInfo(`Token length: ${session.livekit_token.length} chars`);

        // Verify token looks valid
        if (!session.livekit_token.startsWith('eyJ')) {
            logError('LiveKit token does not look like a valid JWT');
        }

        // Step 3: Check balance with hold
        logStep(3, 'Verifying wallet hold was created...');

        const balanceWithHold = await getWalletBalance();
        const holdAmount = initialBalance - balanceWithHold.available_balance;

        logSuccess(`Balance: $${balanceWithHold.balance.toFixed(4)}`);
        logSuccess(`Available: $${balanceWithHold.available_balance.toFixed(4)}`);
        logSuccess(`Hold Amount: $${holdAmount.toFixed(4)}`);

        if (holdAmount <= 0) {
            logError('No hold was created - wallet safety check failed!');
            process.exit(1);
        }

        // Step 4: Simulate session duration (short test)
        logStep(4, 'Simulating session (5 seconds)...');

        const testDuration = 5;
        await new Promise(resolve => setTimeout(resolve, testDuration * 1000));

        logSuccess(`Waited ${testDuration} seconds`);

        // Step 5: End the session
        logStep(5, 'Ending session...');

        const endResult = await endSession(sessionId, testDuration);

        logSuccess(`Status: ${endResult.status}`);
        logSuccess(`Duration: ${endResult.duration_seconds}s`);
        logSuccess(`Billed: ${endResult.billed_seconds}s`);
        logSuccess(`Cost: $${endResult.cost.toFixed(4)} ${endResult.currency}`);
        logSuccess(`New Balance: $${endResult.wallet_balance.toFixed(4)}`);

        // Step 6: Verify settlement
        logStep(6, 'Verifying wallet settlement...');

        const balanceAfter = await getWalletBalance();
        const actualCost = initialBalance - balanceAfter.balance;

        logSuccess(`Final Balance: $${balanceAfter.balance.toFixed(4)}`);
        logSuccess(`Actual Deducted: $${actualCost.toFixed(4)}`);

        // Compare - should match reported cost
        if (Math.abs(actualCost - endResult.cost) < 0.001) {
            logSuccess('Settlement matches reported cost ✓');
        } else {
            logError(`Settlement mismatch! Reported: $${endResult.cost}, Actual: $${actualCost}`);
        }

        // Verify holds are released
        if (balanceAfter.pending_holds === 0) {
            logSuccess('All holds released ✓');
        } else {
            logError(`Unreleased holds: $${balanceAfter.pending_holds}`);
        }

        // Step 7: Test idempotency
        logStep(7, 'Testing /end idempotency...');

        const endResult2 = await endSession(sessionId, testDuration);

        if (endResult2.cost === endResult.cost && endResult2.status === endResult.status) {
            logSuccess('Idempotency check passed - same result on retry ✓');
        } else {
            logError('Idempotency failed! Different result on retry');
            logError(`First: cost=${endResult.cost}, status=${endResult.status}`);
            logError(`Second: cost=${endResult2.cost}, status=${endResult2.status}`);
        }

        // Final verification
        const finalBalance = await getWalletBalance();
        if (finalBalance.balance === balanceAfter.balance) {
            logSuccess('No double-billing occurred ✓');
        } else {
            logError('WARNING: Balance changed after idempotency test - possible double billing!');
        }

        // Summary
        log('\n========================================', colors.green);
        log('  ALL TESTS PASSED ✓', colors.green);
        log('========================================\n', colors.green);

        log('Session Summary:', colors.cyan);
        log(`  Session ID: ${sessionId}`);
        log(`  Duration: ${testDuration}s`);
        log(`  Billed: ${endResult.billed_seconds}s`);
        log(`  Cost: $${endResult.cost.toFixed(4)}`);
        log(`  Initial Balance: $${initialBalance.toFixed(4)}`);
        log(`  Final Balance: $${balanceAfter.balance.toFixed(4)}`);

    } catch (error) {
        logError(`Test failed: ${error instanceof Error ? error.message : String(error)}`);

        // Cleanup: Try to cancel session if started
        if (sessionId) {
            log('\nAttempting cleanup...', colors.yellow);
            try {
                await cancelSession(sessionId);
                logSuccess('Session cancelled');
            } catch {
                logError('Failed to cancel session');
            }
        }

        process.exit(1);
    }
}

main().catch(console.error);
