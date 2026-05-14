type MetricTags = Record<string, string | number | boolean | null | undefined>;

/**
 * Lightweight metrics emitter.
 * Replace with StatsD/OTel exporter in production runtime.
 */
export function incrementMetric(name: string, tags: MetricTags = {}): void {
    console.log('[Metric] increment', { name, tags, ts: new Date().toISOString() });
}

export function observeMetric(
    name: string,
    value: number,
    tags: MetricTags = {}
): void {
    console.log('[Metric] observe', { name, value, tags, ts: new Date().toISOString() });
}

export function withTiming<T>(
    metricName: string,
    fn: () => Promise<T>,
    tags: MetricTags = {}
): Promise<T> {
    const startedAt = Date.now();
    return fn().finally(() => {
        observeMetric(metricName, Date.now() - startedAt, tags);
    });
}
