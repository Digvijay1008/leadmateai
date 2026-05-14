/**
 * LiveKit Webhook Route
 *
 * HTTP concerns only:
 * - signature verification
 * - auth header/raw body checks
 * - delegating to service layer
 */

import { Router, Request, Response } from 'express';
import crypto from 'crypto';
import { WebhookReceiver } from 'livekit-server-sdk';
import { config } from '../../../../core/index.js';
import { enqueueLiveKitWebhookTask } from '../../../../platform/index.js';
import { getWebhookIdempotencyStore } from '../../../../platform/index.js';
import { incrementMetric, observeMetric } from '../../../../shared/index.js';

const router = Router();

let webhookReceiver: WebhookReceiver | null = null;

function getWebhookReceiver(): WebhookReceiver {
    if (!webhookReceiver) {
        webhookReceiver = new WebhookReceiver(
            config.livekit.apiKey!,
            config.livekit.apiSecret!
        );
    }
    return webhookReceiver;
}

router.post('/livekit', async (req: Request, res: Response) => {
    const startedAtMs = Date.now();
    try {
        const receiver = getWebhookReceiver();
        const rawBody = (req as any).rawBody;
        if (!rawBody) {
            return res.status(400).json({ error: 'Missing raw body' });
        }

        const authHeader = req.headers.authorization;
        if (!authHeader) {
            return res.status(401).json({ error: 'Missing authorization header' });
        }

        const event = await receiver.receive(rawBody, authHeader);
        if (!event?.event) {
            return res.status(400).json({ error: 'Invalid webhook payload' });
        }

        const eventKey = getLiveKitEventKey(event, rawBody);
        const idemStore = getWebhookIdempotencyStore();
        const shouldProcess = await idemStore.tryMarkProcessed(eventKey);
        if (!shouldProcess) {
            incrementMetric('duplicate_webhook_count', { provider: 'livekit' });
            observeMetric('webhook_ack_latency_ms', Date.now() - startedAtMs, { provider: 'livekit' });
            return res.status(200).json({ ok: true, duplicate: true });
        }

        await enqueueLiveKitWebhookTask(eventKey, event);
        observeMetric('webhook_ack_latency_ms', Date.now() - startedAtMs, { provider: 'livekit' });

        return res.status(200).json({ ok: true });
    } catch (error: any) {
        const message = error instanceof Error ? error.message : String(error);
        if (message.toLowerCase().includes('signature')) {
            return res.status(401).json({ error: 'Invalid webhook signature' });
        }
        console.error('[Webhook] livekit_handler_error', { error: message });
        return res.status(500).json({ error: 'Webhook handler error' });
    }
});

function getLiveKitEventKey(event: any, rawBody: string): string {
    const eventId = event?.id ?? event?.eventId ?? event?.requestId;
    if (typeof eventId === 'string' && eventId.length > 0) {
        return `livekit:${eventId}`;
    }
    const bodyHash = crypto.createHash('sha256').update(rawBody).digest('hex');
    return `livekit:${bodyHash}`;
}

export default router;
