import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../repositories/tenant.repository.js', () => ({
    getTenantWithConfig: vi.fn(),
    getVoicePersona: vi.fn(),
}));

vi.mock('../repositories/preset.repository.js', () => ({
    createPresetSnapshot: vi.fn(),
}));

vi.mock('../repositories/session.repository.js', () => ({
    createSession: vi.fn(),
    attachSessionHold: vi.fn(),
    cancelSession: vi.fn(),
    getSessionById: vi.fn(),
    getSessionForTenant: vi.fn(),
    activateSession: vi.fn(),
    endSessionWithBilling: vi.fn(),
}));

vi.mock('./wallet.service.js', () => ({
    checkSessionAffordability: vi.fn(),
    createSessionHold: vi.fn(),
    releaseSessionHold: vi.fn(),
    settleSessionHold: vi.fn(),
}));

vi.mock('../../../platform/services/livekit.service.js', () => ({
    generateUserToken: vi.fn(),
    dispatchAgentToRoom: vi.fn(),
}));

vi.mock('../../../platform/db/client.js', () => ({
    queryOne: vi.fn(),
}));

vi.mock('../../../core/config/index.js', () => ({
    config: {
        jwt: { secret: 'test-secret-key-test-secret-key-test-secret' },
        session: { defaultMaxDurationSeconds: 900 },
    },
}));

describe('startSession hold persistence safety', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('persists hold_id on success', async () => {
        const tenantRepo = await import('../repositories/tenant.repository.js');
        const presetRepo = await import('../repositories/preset.repository.js');
        const sessionRepo = await import('../repositories/session.repository.js');
        const walletSvc = await import('./wallet.service.js');
        const livekitSvc = await import('../../../platform/services/livekit.service.js');
        const db = await import('../../../platform/db/client.js');
        const { startSession } = await import('./session.service.js');

        vi.mocked(tenantRepo.getTenantWithConfig).mockResolvedValue({
            tenant: { status: 'active', business_name: 'Acme' },
            voiceConfig: {
                preset_id: 'standard',
                voice_persona_id: 'maya',
                agent_name: 'Agent',
                system_prompt_template: null,
                greeting_message: 'Hi',
                goodbye_message: 'Bye',
                tools_enabled: [],
                max_session_duration_seconds: 120,
                inactivity_timeout_seconds: 30,
            },
        } as any);
        vi.mocked(walletSvc.checkSessionAffordability).mockResolvedValue({
            canAfford: true,
            maxDurationSeconds: 120,
            availableBalance: 100,
            pricePerMinute: 5,
            currency: 'INR',
        });
        vi.mocked(presetRepo.createPresetSnapshot).mockResolvedValue({
            preset_id: 'standard',
            price_per_min: 5,
            currency: 'INR',
            provider_config: {
                stt: { provider: 'deepgram', model: 'nova-3' },
                llm: { provider: 'openai', model: 'gpt-4o-mini' },
                tts: { provider: 'deepgram', model: 'aura-2-thalia-en' },
            },
        } as any);
        vi.mocked(tenantRepo.getVoicePersona).mockResolvedValue({
            provider_voice_ids: { deepgram: 'aura-2-thalia-en' },
            language: 'en-US',
        } as any);
        vi.mocked(db.queryOne).mockResolvedValue({ count: '0' } as any);
        vi.mocked(sessionRepo.createSession).mockResolvedValue({
            id: '44444444-4444-4444-8444-444444444444',
            tenant_id: '55555555-5555-4555-8555-555555555555',
            max_duration_seconds: 120,
        } as any);
        vi.mocked(walletSvc.createSessionHold).mockResolvedValue({ id: 'hold-1' } as any);
        vi.mocked(livekitSvc.generateUserToken).mockResolvedValue({
            roomName: 'leadmate-session-44444444-4444-4444-8444-444444444444',
            token: 'token',
            livekitUrl: 'wss://test',
        } as any);
        vi.mocked(livekitSvc.dispatchAgentToRoom).mockResolvedValue({
            roomName: 'leadmate-session-44444444-4444-4444-8444-444444444444',
            agentToken: 'agent-token',
        });

        const result = await startSession({
            tenant_id: '55555555-5555-4555-8555-555555555555',
        } as any);

        expect(result.session_id).toBe('44444444-4444-4444-8444-444444444444');
        expect(sessionRepo.attachSessionHold).toHaveBeenCalledWith(
            '44444444-4444-4444-8444-444444444444',
            'hold-1'
        );
    });

    it('releases hold and cancels session if hold_id persistence fails', async () => {
        const tenantRepo = await import('../repositories/tenant.repository.js');
        const presetRepo = await import('../repositories/preset.repository.js');
        const sessionRepo = await import('../repositories/session.repository.js');
        const walletSvc = await import('./wallet.service.js');
        const livekitSvc = await import('../../../platform/services/livekit.service.js');
        const db = await import('../../../platform/db/client.js');
        const { startSession } = await import('./session.service.js');

        vi.mocked(tenantRepo.getTenantWithConfig).mockResolvedValue({
            tenant: { status: 'active', business_name: 'Acme' },
            voiceConfig: {
                preset_id: 'standard',
                voice_persona_id: 'maya',
                agent_name: 'Agent',
                system_prompt_template: null,
                greeting_message: 'Hi',
                goodbye_message: 'Bye',
                tools_enabled: [],
                max_session_duration_seconds: 120,
                inactivity_timeout_seconds: 30,
            },
        } as any);
        vi.mocked(walletSvc.checkSessionAffordability).mockResolvedValue({
            canAfford: true,
            maxDurationSeconds: 120,
            availableBalance: 100,
            pricePerMinute: 5,
            currency: 'INR',
        });
        vi.mocked(presetRepo.createPresetSnapshot).mockResolvedValue({
            preset_id: 'standard',
            price_per_min: 5,
            currency: 'INR',
            provider_config: {
                stt: { provider: 'deepgram', model: 'nova-3' },
                llm: { provider: 'openai', model: 'gpt-4o-mini' },
                tts: { provider: 'deepgram', model: 'aura-2-thalia-en' },
            },
        } as any);
        vi.mocked(tenantRepo.getVoicePersona).mockResolvedValue(null);
        vi.mocked(db.queryOne).mockResolvedValue({ count: '0' } as any);
        vi.mocked(sessionRepo.createSession).mockResolvedValue({
            id: '66666666-6666-4666-8666-666666666666',
            tenant_id: '77777777-7777-4777-8777-777777777777',
            max_duration_seconds: 120,
        } as any);
        vi.mocked(walletSvc.createSessionHold).mockResolvedValue({ id: 'hold-2' } as any);
        vi.mocked(sessionRepo.attachSessionHold).mockRejectedValue(new Error('db write failed'));
        vi.mocked(walletSvc.releaseSessionHold).mockResolvedValue(undefined);
        vi.mocked(sessionRepo.cancelSession).mockResolvedValue(undefined);
        vi.mocked(livekitSvc.generateUserToken).mockResolvedValue({
            roomName: 'leadmate-session-66666666-6666-4666-8666-666666666666',
            token: 'token',
            livekitUrl: 'wss://test',
        } as any);

        await expect(startSession({
            tenant_id: '77777777-7777-4777-8777-777777777777',
        } as any)).rejects.toThrow('db write failed');

        expect(walletSvc.releaseSessionHold).toHaveBeenCalledWith('hold-2');
        expect(sessionRepo.cancelSession).toHaveBeenCalledWith('66666666-6666-4666-8666-666666666666');
    });
});
