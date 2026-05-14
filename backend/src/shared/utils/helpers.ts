import { v4 as uuidv4 } from 'uuid';

// ===========================================
// UUID UTILITIES
// ===========================================

/**
 * Generate a new UUID v4
 */
export function generateId(): string {
    return uuidv4();
}

/**
 * Validate UUID format
 */
export function isValidUUID(str: string): boolean {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidRegex.test(str);
}

// ===========================================
// BILLING UTILITIES
// ===========================================

/**
 * Calculate billed seconds from actual duration
 * Always rounds up to nearest minute
 */
export function calculateBilledSeconds(
    durationSeconds: number,
    minimumBillable: number = 60
): number {
    if (durationSeconds <= 0) return 0;

    // Round up to nearest minute (60 seconds)
    const billedMinutes = Math.ceil(durationSeconds / 60);
    const billedSeconds = billedMinutes * 60;

    return Math.max(billedSeconds, minimumBillable);
}

/**
 * Calculate cost from duration and rate
 */
export function calculateCost(
    billedSeconds: number,
    pricePerMinute: number
): number {
    const minutes = billedSeconds / 60;
    const cost = minutes * pricePerMinute;

    // Round to 4 decimal places for precision
    return Math.round(cost * 10000) / 10000;
}

/**
 * Calculate max affordable duration based on wallet balance
 */
export function calculateMaxDuration(
    balance: number,
    pricePerMinute: number,
    absoluteMaxSeconds: number = 3600  // 1 hour hard limit
): number {
    if (balance <= 0 || pricePerMinute <= 0) return 0;

    const affordableMinutes = balance / pricePerMinute;
    const affordableSeconds = Math.floor(affordableMinutes * 60);

    return Math.min(affordableSeconds, absoluteMaxSeconds);
}

/**
 * Calculate hold amount with safety buffer
 */
export function calculateHoldAmount(
    maxDurationSeconds: number,
    pricePerMinute: number,
    safetyMultiplier: number = 1.0  // No extra buffer by default
): number {
    const maxMinutes = maxDurationSeconds / 60;
    const holdAmount = maxMinutes * pricePerMinute * safetyMultiplier;

    return Math.round(holdAmount * 10000) / 10000;
}

// ===========================================
// STRING UTILITIES
// ===========================================

/**
 * Canonical room naming for all LiveKit rooms.
 * Single source of truth for room identity across:
 * - DB writes
 * - LiveKit API calls
 * - Webhook reconciliation
 */
export function generateCanonicalRoomName(sessionId: string): string {
    return `leadmate-session-${sessionId}`;
}

/**
 * Backward-compatible alias.
 * Kept to avoid breakage while older call sites are migrated.
 */
export function generateRoomName(_tenantId: string, sessionId: string): string {
    return generateCanonicalRoomName(sessionId);
}

/**
 * Extract session UUID from canonical room name.
 * Returns null for unknown formats.
 */
export function parseSessionIdFromRoomName(roomName: string): string | null {
    const canonicalPrefix = 'leadmate-session-';
    if (!roomName.startsWith(canonicalPrefix)) {
        return null;
    }
    const candidate = roomName.slice(canonicalPrefix.length);
    return isValidUUID(candidate) ? candidate : null;
}

/**
 * Truncate string with ellipsis
 */
export function truncate(str: string, maxLength: number): string {
    if (str.length <= maxLength) return str;
    return str.slice(0, maxLength - 3) + '...';
}

/**
 * Safely parse JSON with fallback
 */
export function safeJsonParse<T>(str: string, fallback: T): T {
    try {
        return JSON.parse(str) as T;
    } catch {
        return fallback;
    }
}

// ===========================================
// DATE UTILITIES
// ===========================================

/**
 * Get current timestamp in ISO format
 */
export function nowISO(): string {
    return new Date().toISOString();
}

/**
 * Add minutes to a date
 */
export function addMinutes(date: Date, minutes: number): Date {
    return new Date(date.getTime() + minutes * 60 * 1000);
}

/**
 * Check if a date is in the past
 */
export function isPast(date: Date): boolean {
    return date.getTime() < Date.now();
}

/**
 * Format duration in seconds to human readable string
 */
export function formatDuration(seconds: number): string {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;

    if (minutes === 0) {
        return `${remainingSeconds}s`;
    }

    if (remainingSeconds === 0) {
        return `${minutes}m`;
    }

    return `${minutes}m ${remainingSeconds}s`;
}

// ===========================================
// ASYNC UTILITIES
// ===========================================

/**
 * Sleep for specified milliseconds
 */
export function sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Retry a function with exponential backoff
 */
export async function retry<T>(
    fn: () => Promise<T>,
    options: {
        maxAttempts?: number;
        initialDelayMs?: number;
        maxDelayMs?: number;
        backoffMultiplier?: number;
    } = {}
): Promise<T> {
    const {
        maxAttempts = 3,
        initialDelayMs = 100,
        maxDelayMs = 5000,
        backoffMultiplier = 2,
    } = options;

    let lastError: Error | undefined;
    let delay = initialDelayMs;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        try {
            return await fn();
        } catch (error) {
            lastError = error instanceof Error ? error : new Error(String(error));

            if (attempt === maxAttempts) break;

            await sleep(delay);
            delay = Math.min(delay * backoffMultiplier, maxDelayMs);
        }
    }

    throw lastError;
}
