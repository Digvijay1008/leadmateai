import { z } from 'zod';
import { ValidationError } from '../../../shared/index.js';

export const sessionEndReasonEnum = z.enum([
    'user_hangup',
    'agent_hangup',
    'timeout',
    'max_duration',
    'error',
    'insufficient_funds',
]);

const legacyTerminationReasonMap: Record<string, z.infer<typeof sessionEndReasonEnum>> = {
    session_ended: 'agent_hangup',
    user_disconnected: 'user_hangup',
    agent_disconnected: 'agent_hangup',
    max_duration_reached: 'max_duration',
    inactivity_timeout: 'timeout',
    error: 'error',
    insufficient_funds: 'insufficient_funds',
};

export const endSessionPayloadSchema = z.object({
    session_id: z.string().uuid().optional(),
    duration_seconds: z.number().int().min(0),
    end_reason: sessionEndReasonEnum.optional(),
    termination_reason: z.string().optional(), // legacy
    agent_reported_at: z.string().datetime().optional(),
    transcript_summary: z.string().optional(),
    tool_calls_count: z.number().int().min(0).optional(),
    user_turns_count: z.number().int().min(0).optional(),
    agent_turns_count: z.number().int().min(0).optional(),
    transcript: z.array(z.object({
        role: z.string(),
        content: z.string(),
    })).optional(),
});

export type NormalizedEndSessionRequest = {
    session_id: string;
    duration_seconds: number;
    end_reason: z.infer<typeof sessionEndReasonEnum>;
    transcript_summary?: string;
    tool_calls_count?: number;
    user_turns_count?: number;
    agent_turns_count?: number;
    transcript?: Array<{ role: string; content: string }>;
};

export function normalizeEndSessionRequest(
    payload: unknown,
    options: { sessionIdFromRoute?: string }
): NormalizedEndSessionRequest {
    const parsed = endSessionPayloadSchema.safeParse(payload);
    if (!parsed.success) {
        throw new ValidationError('Invalid request body', {
            errors: parsed.error.errors,
        });
    }

    const data = parsed.data;
    const sessionId = options.sessionIdFromRoute || data.session_id;

    if (!sessionId) {
        throw new ValidationError('session_id is required (route param or body)');
    }

    let endReason = data.end_reason;
    if (!endReason && data.termination_reason) {
        endReason = legacyTerminationReasonMap[data.termination_reason] || 'error';
    }
    if (!endReason) {
        endReason = 'error';
    }

    return {
        session_id: sessionId,
        duration_seconds: data.duration_seconds,
        end_reason: endReason,
        transcript_summary: data.transcript_summary,
        tool_calls_count: data.tool_calls_count,
        user_turns_count: data.user_turns_count,
        agent_turns_count: data.agent_turns_count,
        transcript: data.transcript,
    };
}
