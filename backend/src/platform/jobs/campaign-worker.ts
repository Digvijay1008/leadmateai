import { query, queryMany, queryOne } from '../db/client.js';
import { startSession } from '../../domain/crm/services/session.service.js';
import { dialOutbound, getTrunkForTenant } from '../services/sip/telephony.service.js';
import { generateCanonicalRoomName } from '../../shared/index.js';

export async function processCampaignCallsJob(): Promise<{
    processedCount: number;
    errorCount: number;
}> {
    let processedCount = 0;
    let errorCount = 0;

    try {
        // Find pending campaign calls that need to be dialed
        // We limit to 5 at a time
        // Use FOR UPDATE SKIP LOCKED
        const pendingCalls = await queryMany<any>(
            `UPDATE campaign_calls
             SET status = 'processing', locked_at = NOW()
             WHERE id IN (
                SELECT cc.id FROM campaign_calls cc
                JOIN campaigns c ON c.id = cc.campaign_id
                WHERE cc.status = 'pending' 
                  AND cc.scheduled_at <= NOW()
                  AND c.status = 'running'
                  AND (
                    SELECT COUNT(*) 
                    FROM campaign_calls active_cc 
                    WHERE active_cc.tenant_id = cc.tenant_id 
                      AND active_cc.status = 'processing'
                  ) < 5
                LIMIT 10
                FOR UPDATE SKIP LOCKED
             )
             RETURNING *`
        );

        if (pendingCalls.length === 0) return { processedCount: 0, errorCount: 0 };

        console.log(`[Campaigns] Processing ${pendingCalls.length} queued calls in background`);

        for (const call of pendingCalls) {
            try {
                // Get tenant's active phone number
                const phoneRecord = await queryOne<{ number: string }>(
                    `SELECT number FROM phone_numbers WHERE tenant_id = $1 AND is_active = true LIMIT 1`,
                    [call.tenant_id]
                );

                if (!phoneRecord) {
                    throw new Error('No active phone number found for tenant');
                }

                const normalizedFrom = phoneRecord.number;

                // Get tenant's SIP trunk
                const trunk = await getTrunkForTenant(call.tenant_id);
                if (!trunk) {
                    throw new Error('No SIP trunk configured for tenant');
                }

                // Start Session
                const session = await startSession({
                    tenant_id: call.tenant_id,
                    visitor_metadata: {
                        to_number: call.phone_number,
                        from_number: normalizedFrom,
                        source: 'campaign_bulk_dialer',
                        campaign_id: call.campaign_id,
                    },
                    direction: 'outbound',
                    phone_number: normalizedFrom,
                });

                // Dial via LiveKit SIP
                await dialOutbound({
                    to: call.phone_number,
                    from: normalizedFrom,
                    roomName: session.livekit_room_name,
                    trunk,
                });

                // Update call status to success (SIP trunk accepted the dial request)
                await query(
                    `UPDATE campaign_calls 
                     SET status = 'success', updated_at = NOW()
                     WHERE id = $1`,
                    [call.id]
                );

                // Update campaign success count
                await query(
                    `UPDATE campaigns
                     SET successful_calls = successful_calls + 1, updated_at = NOW()
                     WHERE id = $1`,
                    [call.campaign_id]
                );

                processedCount++;

            } catch (err: any) {
                console.error(`[Campaigns] Failed to process call ${call.id}:`, err);
                
                errorCount++;

                // If failed, manage retries
                if (call.retry_count + 1 < call.max_retries) {
                    // Retry
                    await query(
                        `UPDATE campaign_calls 
                         SET status = 'pending', 
                             retry_count = retry_count + 1,
                             scheduled_at = NOW() + INTERVAL '30 seconds',
                             locked_at = NULL,
                             updated_at = NOW()
                         WHERE id = $1`,
                        [call.id]
                    );
                } else {
                    // Mark finally failed
                    await query(
                        `UPDATE campaign_calls 
                         SET status = 'failed',
                             retry_count = retry_count + 1,
                             locked_at = NULL,
                             updated_at = NOW()
                         WHERE id = $1`,
                        [call.id]
                    );

                    // Update campaign failed count
                    await query(
                        `UPDATE campaigns
                         SET failed_calls = failed_calls + 1, updated_at = NOW()
                         WHERE id = $1`,
                        [call.campaign_id]
                    );
                }
            }
        }
    } catch (error) {
        console.error('[Campaigns] Error running bulk dialer job:', error);
    }

    return { processedCount, errorCount };
}
