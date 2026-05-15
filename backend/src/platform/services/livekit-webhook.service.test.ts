import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../domain/crm/repositories/webhook-session.repository.js', () => ({
    findSessionForRoomFinished: vi.fn(),
    markPendingSessionCancelled: vi.fn(),
    markRecoveredSessionCompleted: vi.fn(),
    persistWebhookDurationAudit: vi.fn(),
}));

vi.mock('../../domain/crm/services/wallet.service.js', () => ({
    settleSessionHold: vi.fn(),
    releaseSessionHold: vi.fn(),
}));

describe('processLiveKitWebhookEvent', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('ignores non room_finished events', async () => {
        const repo = await import('../../domain/crm/repositories/webhook-session.repository.js');
        const { processLiveKitWebhookEvent } = await import('./livekit-webhook.service.js');

        await processLiveKitWebhookEvent({ event: 'participant_joined', id: 'evt-1' });
        expect(repo.findSessionForRoomFinished).not.toHaveBeenCalled();
    });

    it('processes each room_finished invocation (route layer handles dedupe)', async () => {
        const repo = await import('../../domain/crm/repositories/webhook-session.repository.js');
        const { processLiveKitWebhookEvent } = await import('./livekit-webhook.service.js');

        vi.mocked(repo.findSessionForRoomFinished).mockResolvedValue({
            id: '11111111-1111-4111-8111-111111111111',
            tenant_id: '22222222-2222-4222-8222-222222222222',
            status: 'completed',
            hold_id: null,
            agent_reported_duration: null,
            preset_snapshot: {},
            started_at: null,
            session_started_at: null,
            first_audio_at: null,
            ended_at: null,
            session_ended_at: null,
        } as any);

        const event = {
            event: 'room_finished',
            id: 'evt-dup-1',
            room: { name: 'leadmate-session-11111111-1111-4111-8111-111111111111' },
        };

        await processLiveKitWebhookEvent(event);
        await processLiveKitWebhookEvent(event);

        expect(repo.findSessionForRoomFinished).toHaveBeenCalledTimes(2);
    });
});
