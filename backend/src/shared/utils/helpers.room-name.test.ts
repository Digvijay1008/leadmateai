import { describe, expect, it } from 'vitest';
import { generateCanonicalRoomName, parseSessionIdFromRoomName } from './helpers.js';

describe('canonical room naming', () => {
    it('generates deterministic canonical name', () => {
        const sessionId = '9f5b3531-f21f-44d1-8387-68f94ea8f3e1';
        const tenantId = '425624ad-1b83-4f9c-adf5-0e03c886829c';
        // hex prefix of tenantId is 425624ad
        expect(generateCanonicalRoomName(sessionId, tenantId)).toBe(
            'call-425624ad-9f5b3531-f21f-44d1-8387-68f94ea8f3e1'
        );
    });

    it('extracts session id from canonical room name', () => {
        const roomName = 'call-425624ad-9f5b3531-f21f-44d1-8387-68f94ea8f3e1';
        expect(parseSessionIdFromRoomName(roomName)).toBe('9f5b3531-f21f-44d1-8387-68f94ea8f3e1');
    });

    it('returns null for non-canonical room names', () => {
        expect(parseSessionIdFromRoomName('session-abc')).toBeNull();
    });
});
