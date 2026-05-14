import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../db/client.js', () => ({
    queryOne: vi.fn(),
    query: vi.fn(),
}));

import { queryOne } from '../db/client.js';
import { getWebhookIdempotencyStore } from './webhook-idempotency.service.js';

describe('WebhookIdempotencyStore', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('marks first event and rejects duplicates via shared Postgres key table', async () => {
        vi.mocked(queryOne)
            .mockResolvedValueOnce({ event_key: 'evt-1' } as any)
            .mockResolvedValueOnce(null);

        const store = getWebhookIdempotencyStore();

        const first = await store.tryMarkProcessed('evt-1');
        const second = await store.tryMarkProcessed('evt-1');

        expect(first).toBe(true);
        expect(second).toBe(false);
        expect(queryOne).toHaveBeenCalledTimes(2);
    });
});
