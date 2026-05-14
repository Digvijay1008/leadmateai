export function computeDurationSeconds(
    session: any,
    room: any,
    fallbackEndMs: number
): { durationSeconds: number; reason: string; anomaly: boolean } {
    const roomCreationMs = toEpochMs(room?.creationTime);
    const startMs =
        toEpochMs(session?.first_audio_at) ??
        toEpochMs(session?.session_started_at) ??
        toEpochMs(session?.started_at) ??
        roomCreationMs;
    const endMs =
        toEpochMs(session?.session_ended_at) ??
        toEpochMs(session?.ended_at) ??
        fallbackEndMs;

    if (!startMs || endMs < startMs) {
        return {
            durationSeconds: 0,
            reason: 'invalid_timestamps_fallback_zero',
            anomaly: true,
        };
    }

    const durationSeconds = Math.max(0, Math.ceil((endMs - startMs) / 1000));
    return {
        durationSeconds,
        reason: session?.first_audio_at ? 'first_audio_to_end' : 'session_start_to_end',
        anomaly: false,
    };
}

export function toEpochMs(value: unknown): number | null {
    if (value == null) return null;
    if (typeof value === 'number') {
        return value > 10_000_000_000 ? value : value * 1000;
    }
    const ts = Date.parse(String(value));
    return Number.isNaN(ts) ? null : ts;
}
