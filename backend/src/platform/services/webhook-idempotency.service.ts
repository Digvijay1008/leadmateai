import { query, queryOne } from '../db/client.js';

export interface WebhookIdempotencyStore {
    tryMarkProcessed(key: string): Promise<boolean>;
}

class PostgresWebhookIdempotencyStore implements WebhookIdempotencyStore {
    private readonly ttlSeconds = Math.max(
        60,
        parseInt(process.env.WEBHOOK_IDEMPOTENCY_TTL_SECONDS ?? '600', 10)
    );

    async tryMarkProcessed(key: string): Promise<boolean> {
        const row = await queryOne<{ event_key: string }>(
            `INSERT INTO webhook_idempotency_keys (event_key, expires_at)
             VALUES ($1, NOW() + ($2::text || ' seconds')::interval)
             ON CONFLICT (event_key) DO UPDATE
             SET first_seen_at = NOW(),
                 expires_at = EXCLUDED.expires_at
             WHERE webhook_idempotency_keys.expires_at <= NOW()
             RETURNING event_key`,
            [key, this.ttlSeconds]
        );

        // Opportunistic cleanup without blocking request paths.
        if (Math.random() < 0.01) {
            void query(
                `DELETE FROM webhook_idempotency_keys
                 WHERE expires_at <= NOW()`
            ).catch(() => {});
        }

        return !!row;
    }
}

let store: WebhookIdempotencyStore = new PostgresWebhookIdempotencyStore();

export function getWebhookIdempotencyStore(): WebhookIdempotencyStore {
    return store;
}

export function setWebhookIdempotencyStore(next: WebhookIdempotencyStore): void {
    store = next;
}
