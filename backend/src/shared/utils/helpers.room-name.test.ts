import { describe, expect, it } from 'vitest';
import { generateCanonicalRoomName, parseSessionIdFromRoomName } from './helpers.js';

describe('canonical room naming', () => {
    it('generates deterministic canonical name', () => {
        const sessionId = '9f5b3531-f21f-44d1-8387-68f94ea8f3e1';
        expect(generateCanonicalRoomName(sessionId)).toBe(
            'leadmate-session-9f5b3531-f21f-44d1-8387-68f94ea8f3e1'
        );
    });

    it('extracts session id from canonical room name', () => {
        const roomName = 'leadmate-session-9f5b3531-f21f-44d1-8387-68f94ea8f3e1';
        expect(parseSessionIdFromRoomName(roomName)).toBe('9f5b3531-f21f-44d1-8387-68f94ea8f3e1');
    });

    it('returns null for non-canonical room names', () => {
        expect(parseSessionIdFromRoomName('session-abc')).toBeNull();
    });
});
