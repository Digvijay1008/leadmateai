/**
 * SIP Routes — INTENTIONALLY EMPTY
 *
 * The previous /v1/sip/dispatch endpoint was INCORRECT.
 *
 * LiveKit SIP does NOT call a backend webhook for inbound dispatch.
 * Instead, it uses pre-registered SIP Dispatch Rules (created via
 * the LiveKit SipClient API when a tenant configures a SIP trunk).
 *
 * The dispatch flow is:
 *   SIP INVITE → LiveKit SIP Bridge → Internal RPC (over Redis)
 *   → Matches registered DispatchRule → Creates room → Dispatches agent
 *
 * There is NO HTTP webhook involved in this process.
 *
 * See: https://github.com/livekit/sip (inbound.go:719 — DispatchCall is internal)
 * See: sip-trunk.service.ts for dispatch rule registration
 */

import { Router } from 'express';

const router = Router();

// Health check for SIP subsystem
router.get('/status', (_req, res) => {
    res.json({
        system: 'LiveKit SIP',
        dispatch_method: 'LiveKit Dispatch Rules (pre-registered via API)',
        note: 'Inbound routing is handled entirely by LiveKit — no backend webhook needed',
    });
});

export default router;
