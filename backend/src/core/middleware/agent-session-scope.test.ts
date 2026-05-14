import { describe, expect, it } from 'vitest';
import { requireAgentSessionScope } from './agent-session-scope.js';

describe('requireAgentSessionScope', () => {
    it('allows matching session id', () => {
        const req: any = {
            auth: {
                type: 'agent',
                sessionId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
                tenantId: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
            },
        };
        const result = requireAgentSessionScope(req, 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa');
        expect(result.auth.sessionId).toBe('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa');
    });

    it('throws on mismatch', () => {
        const req: any = {
            auth: {
                type: 'agent',
                sessionId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
                tenantId: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
            },
        };
        expect(() =>
            requireAgentSessionScope(req, 'cccccccc-cccc-4ccc-8ccc-cccccccccccc')
        ).toThrow();
    });
});
