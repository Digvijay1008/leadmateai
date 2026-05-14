/**
 * Lightweight in-memory TTL cache for idempotency guards.
 * O(1) average for has/add operations via Map.
 */
export class IdempotencyCache {
    private readonly store = new Map<string, number>();

    constructor(
        private readonly ttlMs: number,
        private readonly maxEntries: number
    ) {}

    has(key: string): boolean {
        const expiresAt = this.store.get(key);
        if (!expiresAt) return false;
        if (expiresAt <= Date.now()) {
            this.store.delete(key);
            return false;
        }
        return true;
    }

    add(key: string): void {
        this.evictExpired();
        if (this.store.size >= this.maxEntries) {
            this.evictOldest(Math.ceil(this.maxEntries * 0.1));
        }
        this.store.set(key, Date.now() + this.ttlMs);
    }

    size(): number {
        return this.store.size;
    }

    private evictExpired(): void {
        const now = Date.now();
        for (const [key, expiresAt] of this.store.entries()) {
            if (expiresAt <= now) {
                this.store.delete(key);
            }
        }
    }

    private evictOldest(count: number): void {
        let evicted = 0;
        for (const key of this.store.keys()) {
            this.store.delete(key);
            evicted += 1;
            if (evicted >= count) break;
        }
    }
}
