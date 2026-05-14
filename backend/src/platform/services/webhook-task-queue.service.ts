import { query, queryOne } from '../db/client.js';
import { incrementMetric, observeMetric, withTiming } from '../../shared/index.js';
import { processLiveKitWebhookEvent } from './livekit-webhook.service.js';

type WebhookTaskType = 'livekit_event';

interface WebhookTaskRow {
    id: string;
    event_key: string;
    task_type: WebhookTaskType;
    payload: any;
    attempts: number;
    max_attempts: number;
    created_at: string | Date;
}

const workerConcurrency = Math.max(
    1,
    parseInt(process.env.WEBHOOK_WORKER_CONCURRENCY ?? '8', 10)
);
const pollIntervalMs = Math.max(
    50,
    parseInt(process.env.WEBHOOK_WORKER_POLL_MS ?? '200', 10)
);
const workerId = `${process.pid}:${Math.random().toString(36).slice(2, 8)}`;

let started = false;
let activeWorkers = 0;
let intervalHandle: NodeJS.Timeout | null = null;
let pumpScheduled = false;
let pumpRunning = false;

function schedulePump(): void {
    if (!started || pumpScheduled) return;
    pumpScheduled = true;
    setImmediate(() => {
        pumpScheduled = false;
        void pump();
    });
}

async function pump(): Promise<void> {
    if (!started || pumpRunning) return;
    pumpRunning = true;
    try {
        while (started && activeWorkers < workerConcurrency) {
            const task = await claimNextTask();
            if (!task) break;

            activeWorkers += 1;
            void processTask(task).finally(() => {
                activeWorkers -= 1;
                schedulePump();
            });
        }
    } finally {
        pumpRunning = false;
    }
}

async function claimNextTask(): Promise<WebhookTaskRow | null> {
    return queryOne<WebhookTaskRow>(
        `WITH next_task AS (
            SELECT id
            FROM webhook_tasks
            WHERE status = 'pending'
              AND next_attempt_at <= NOW()
            ORDER BY next_attempt_at ASC, created_at ASC
            FOR UPDATE SKIP LOCKED
            LIMIT 1
        )
        UPDATE webhook_tasks t
        SET status = 'processing',
            locked_at = NOW(),
            locked_by = $1,
            updated_at = NOW()
        FROM next_task
        WHERE t.id = next_task.id
        RETURNING t.id, t.event_key, t.task_type, t.payload, t.attempts, t.max_attempts, t.created_at`,
        [workerId]
    );
}

async function markTaskSuccess(taskId: string): Promise<void> {
    await query(
        `UPDATE webhook_tasks
         SET status = 'completed',
             updated_at = NOW()
         WHERE id = $1`,
        [taskId]
    );
}

async function markTaskFailure(task: WebhookTaskRow, error: unknown): Promise<void> {
    const nextAttempts = task.attempts + 1;
    const errMsg = error instanceof Error ? error.message : String(error);

    incrementMetric('background_task_failures', {
        type: task.task_type,
        attempt: nextAttempts,
    });

    if (nextAttempts >= task.max_attempts) {
        await query(
            `UPDATE webhook_tasks
             SET status = 'failed',
                 attempts = $2,
                 last_error = $3,
                 updated_at = NOW()
             WHERE id = $1`,
            [task.id, nextAttempts, errMsg]
        );
        console.error('[WebhookQueue] task_failed_permanently', {
            id: task.id,
            key: task.event_key,
            type: task.task_type,
            attempts: nextAttempts,
            error: errMsg,
        });
        return;
    }

    incrementMetric('settlement_retry_count', { type: task.task_type });
    const backoffSeconds = Math.min(2 ** (nextAttempts - 1), 30);
    await query(
        `UPDATE webhook_tasks
         SET status = 'pending',
             attempts = $2,
             last_error = $3,
             next_attempt_at = NOW() + ($4::text || ' seconds')::interval,
             updated_at = NOW()
         WHERE id = $1`,
        [task.id, nextAttempts, errMsg, backoffSeconds]
    );
}

async function processTask(task: WebhookTaskRow): Promise<void> {
    const queueDelayMs =
        Date.now() - new Date(task.created_at).getTime();
    observeMetric('queue_processing_latency_ms', queueDelayMs, { type: task.task_type });

    try {
        await withTiming(
            'queue_task_exec_ms',
            async () => {
                await processLiveKitWebhookEvent(task.payload);
            },
            { type: task.task_type }
        );
        await markTaskSuccess(task.id);
    } catch (error) {
        await markTaskFailure(task, error);
    }
}

async function enqueueTask(
    eventKey: string,
    taskType: WebhookTaskType,
    payload: unknown
): Promise<void> {
    await query(
        `INSERT INTO webhook_tasks (
            event_key,
            task_type,
            payload,
            status,
            attempts,
            max_attempts,
            next_attempt_at
        ) VALUES ($1, $2, $3::jsonb, 'pending', 0, 5, NOW())
        ON CONFLICT (event_key) DO NOTHING`,
        [eventKey, taskType, JSON.stringify(payload)]
    );
    schedulePump();
}

export function startWebhookTaskWorker(): void {
    if (started) return;
    started = true;
    intervalHandle = setInterval(schedulePump, pollIntervalMs);
    schedulePump();
    console.log('[WebhookQueue] durable_worker_started', {
        worker_id: workerId,
        concurrency: workerConcurrency,
        poll_interval_ms: pollIntervalMs,
    });
}

export async function stopWebhookTaskWorker(): Promise<void> {
    started = false;
    if (intervalHandle) {
        clearInterval(intervalHandle);
        intervalHandle = null;
    }
}

export async function enqueueLiveKitWebhookTask(
    eventKey: string,
    eventPayload: any
): Promise<void> {
    if (!started) startWebhookTaskWorker();
    await enqueueTask(eventKey, 'livekit_event', eventPayload);
}
