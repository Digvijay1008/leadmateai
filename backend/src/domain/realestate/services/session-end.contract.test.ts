import { describe, expect, it } from 'vitest';
import { normalizeEndSessionRequest } from './session-end.contract.js';

describe('session end contract normalization', () => {
    it('normalizes canonical payload with route session id', () => {
        const normalized = normalizeEndSessionRequest(
            {
                duration_seconds: 42,
                end_reason: 'user_hangup',
            },
            { sessionIdFromRoute: '11111111-1111-4111-8111-111111111111' }
        );

        expect(normalized.session_id).toBe('11111111-1111-4111-8111-111111111111');
        expect(normalized.end_reason).toBe('user_hangup');
        expect(normalized.duration_seconds).toBe(42);
    });

    it('maps legacy termination_reason payload', () => {
        const normalized = normalizeEndSessionRequest(
            {
                session_id: '22222222-2222-4222-8222-222222222222',
                duration_seconds: 12,
                termination_reason: 'session_ended',
            },
            {}
        );

        expect(normalized.end_reason).toBe('agent_hangup');
    });

    it('defaults to error when reason is missing', () => {
        const normalized = normalizeEndSessionRequest(
            {
                session_id: '33333333-3333-4333-8333-333333333333',
                duration_seconds: 5,
            },
            {}
        );

        expect(normalized.end_reason).toBe('error');
    });
});
