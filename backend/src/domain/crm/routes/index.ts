import { Router } from 'express';
import sessionsRouter from './v1/sessions.js';
import ragRouter from './v1/rag.js';
import walletRouter from './v1/wallet.js';
import presetsRouter from './v1/presets.js';
import toolsRouter from './v1/tools.js';
import testRouter from './v1/test.js';
import webhooksRouter from './v1/webhooks.js';
import sipRouter from './v1/sip.js';
import agentConfigRouter from './v1/agent-config.js';
import authRouter from './v1/auth.js';
import leadsRouter from './v1/leads.js';
import analyticsRouter from './v1/analytics.js';
import phoneNumbersRouter from './v1/phone-numbers.js';
import callsRouter from './v1/calls.js';
import campaignsRouter from './v1/campaigns.js';
import adminRouter from './v1/admin.js';
import livekitRouter from './v1/livekit.js';
import integrationsRouter from './v1/integrations.js';
import providersRouter from './v1/providers.js';
import healthRouter from './health.js';

const router = Router();

// ===========================================
// V1 API ROUTES
// ===========================================

// Auth (Login/Signup)
router.use('/v1/auth', authRouter);

// Agent Config and Knowledge Base (Requires Auth)
router.use('/v1', agentConfigRouter);

// Phone Numbers (Requires Auth)
router.use('/v1', phoneNumbersRouter);

// Outbound calls & Campaigns (Requires Auth)
router.use('/v1/calls', callsRouter);
router.use('/v1/campaigns', campaignsRouter);

// SIP Status (dispatch handled by LiveKit Dispatch Rules, not backend)
router.use('/v1/sip', sipRouter);

// Health checks (no version prefix)
router.use('/health', healthRouter);

// Voice sessions
router.use('/v1/voice/sessions', sessionsRouter);

// RAG (knowledge base search)
router.use('/v1/rag', ragRouter);

// Wallet / Billing
router.use('/v1/wallet', walletRouter);

// Voice presets
router.use('/v1/presets', presetsRouter);

// Tools (for agent)
router.use('/v1/tools', toolsRouter);

// Dev test utilities (token generation)
router.use('/v1/test', testRouter);

// LiveKit webhooks (billing safety net)
router.use('/v1/webhooks', webhooksRouter);

// Leads CRM (Generalizing to Contacts)
router.use('/v1/leads', leadsRouter);
router.use('/v1/contacts', leadsRouter);

// Analytics
router.use('/v1/analytics', analyticsRouter);

// Integrations (SIP trunks + LiveKit platform status)
router.use('/v1/integrations', integrationsRouter);

// Dynamic Providers (Voices, LLMs)
router.use('/v1/providers', providersRouter);

// Admin Panel (admin-only)
router.use('/v1/admin', adminRouter);

// LiveKit widget token + settings
router.use('/v1/livekit', livekitRouter);

// ===========================================
// API INFO
// ===========================================

router.get('/v1', (req, res) => {
    res.json({
        name: 'Leadmate Voice AI API',
        version: '2.0.0',
        architecture: 'SIP-first BYOD via LiveKit',
        endpoints: {
            voice_sessions: {
                'POST /v1/voice/sessions/start': 'Start a new voice session',
                'POST /v1/voice/sessions/:id/end': 'End a voice session (canonical)',
                'POST /v1/voice/sessions/end': 'End a voice session (legacy compatibility)',
                'POST /v1/voice/sessions/:id/cancel': 'Cancel pending session',
                'GET /v1/voice/sessions/:id/manifest': 'Get agent manifest',
                'POST /v1/voice/sessions/:id/activate': 'Mark session active',
            },
            sip: {
                'GET /v1/sip/status': 'SIP subsystem status (dispatch via LiveKit Dispatch Rules)',
            },
            calls: {
                'POST /v1/calls/outbound': 'Initiate outbound call via SIP',
            },
            rag: {
                'POST /v1/rag/query': 'Query knowledge base',
                'POST /v1/rag/query-formatted': 'Query KB with formatted response',
            },
            wallet: {
                'GET /v1/wallet/balance': 'Get wallet balance',
                'GET /v1/wallet/transactions': 'Get transaction history',
                'POST /v1/wallet/topup': 'Initiate top-up (WIP)',
            },
            presets: {
                'GET /v1/presets': 'List voice presets',
                'GET /v1/presets/:id': 'Get preset details',
            },
        },
    });
});

export default router;
