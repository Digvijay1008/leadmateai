import { describe, expect, it } from 'vitest';
import { computeDurationSeconds, toEpochMs } from './session-duration.service.js';

describe('session duration computation', () => {
    it('uses first_audio_at when available', () => {
        const result = computeDurationSeconds(
            {
                first_audio_at: '2026-01-01T10:00:10.000Z',
            },
            {},
            Date.parse('2026-01-01T10:01:10.000Z')
        );

        expect(result.durationSeconds).toBe(60);
        expect(result.reason).toBe('first_audio_to_end');
        expect(result.anomaly).toBe(false);
    });

    it('flags anomaly on invalid timestamps', () => {
        const result = computeDurationSeconds(
            {
                session_started_at: '2026-01-01T10:02:10.000Z',
            },
            {},
            Date.parse('2026-01-01T10:01:10.000Z')
        );

        expect(result.durationSeconds).toBe(0);
        expect(result.anomaly).toBe(true);
    });

    it('converts epoch-seconds to epoch-ms', () => {
        expect(toEpochMs(1_700_000_000)).toBe(1_700_000_000_000);
    });
});
