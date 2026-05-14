import { describe, expect, it } from 'vitest';
import { IdempotencyCache } from './idempotency-cache.js';

describe('IdempotencyCache', () => {
    it('stores and returns existing keys in O(1)-style Map access', () => {
        const cache = new IdempotencyCache(10_000, 100);
        cache.add('event-1');
        expect(cache.has('event-1')).toBe(true);
        expect(cache.has('event-2')).toBe(false);
    });

    it('evicts oldest entries when capacity is reached', () => {
        const cache = new IdempotencyCache(60_000, 10);
        for (let i = 0; i < 10; i++) {
            cache.add(`event-${i}`);
        }
        cache.add('event-10');

        expect(cache.size()).toBeLessThanOrEqual(10);
        expect(cache.has('event-10')).toBe(true);
    });
});
