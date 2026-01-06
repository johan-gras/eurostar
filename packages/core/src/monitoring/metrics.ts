/**
 * Prometheus-compatible metrics collection.
 *
 * Provides a lightweight metrics system for monitoring:
 * - Counters for request counts, errors, etc.
 * - Gauges for current values (queue depth, connections, etc.)
 * - Histograms for latency/duration tracking
 *
 * Outputs in Prometheus text format for /metrics endpoint.
 */

/**
 * Metric types supported by Prometheus.
 */
export type MetricType = 'counter' | 'gauge' | 'histogram';

/**
 * Labels for metrics (key-value pairs).
 */
export type Labels = Record<string, string>;

/**
 * Base metric interface.
 */
interface BaseMetric {
  name: string;
  help: string;
  type: MetricType;
}

/**
 * Counter metric - only increases.
 */
interface CounterMetric extends BaseMetric {
  type: 'counter';
  values: Map<string, number>;
}

/**
 * Gauge metric - can increase or decrease.
 */
interface GaugeMetric extends BaseMetric {
  type: 'gauge';
  values: Map<string, number>;
}

/**
 * Histogram bucket configuration.
 */
interface HistogramMetric extends BaseMetric {
  type: 'histogram';
  buckets: number[];
  values: Map<string, { buckets: number[]; sum: number; count: number }>;
}

type Metric = CounterMetric | GaugeMetric | HistogramMetric;

/**
 * Serialize labels to Prometheus format.
 */
function serializeLabels(labels: Labels): string {
  const entries = Object.entries(labels);
  if (entries.length === 0) return '';
  const pairs = entries.map(([k, v]) => `${k}="${escapeLabel(v)}"`).join(',');
  return `{${pairs}}`;
}

/**
 * Escape label values for Prometheus format.
 */
function escapeLabel(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, '\\n');
}

/**
 * Generate a key from labels for internal storage.
 */
function labelsKey(labels: Labels): string {
  const sorted = Object.entries(labels).sort(([a], [b]) => a.localeCompare(b));
  return JSON.stringify(sorted);
}

/**
 * Default histogram buckets (in seconds) for latency tracking.
 */
const DEFAULT_BUCKETS = [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10];

/**
 * Metrics registry - stores all metrics and provides serialization.
 */
export class MetricsRegistry {
  private metrics: Map<string, Metric> = new Map();
  private prefix: string;

  constructor(prefix = 'eurostar') {
    this.prefix = prefix;
  }

  /**
   * Get full metric name with prefix.
   */
  private fullName(name: string): string {
    return `${this.prefix}_${name}`;
  }

  /**
   * Create or get a counter metric.
   */
  counter(name: string, help: string): Counter {
    const fullName = this.fullName(name);
    let metric = this.metrics.get(fullName);

    if (!metric) {
      metric = {
        name: fullName,
        help,
        type: 'counter',
        values: new Map(),
      };
      this.metrics.set(fullName, metric);
    }

    if (metric.type !== 'counter') {
      throw new Error(`Metric ${fullName} already exists as ${metric.type}`);
    }

    return new Counter(metric as CounterMetric);
  }

  /**
   * Create or get a gauge metric.
   */
  gauge(name: string, help: string): Gauge {
    const fullName = this.fullName(name);
    let metric = this.metrics.get(fullName);

    if (!metric) {
      metric = {
        name: fullName,
        help,
        type: 'gauge',
        values: new Map(),
      };
      this.metrics.set(fullName, metric);
    }

    if (metric.type !== 'gauge') {
      throw new Error(`Metric ${fullName} already exists as ${metric.type}`);
    }

    return new Gauge(metric as GaugeMetric);
  }

  /**
   * Create or get a histogram metric.
   */
  histogram(name: string, help: string, buckets = DEFAULT_BUCKETS): Histogram {
    const fullName = this.fullName(name);
    let metric = this.metrics.get(fullName);

    if (!metric) {
      metric = {
        name: fullName,
        help,
        type: 'histogram',
        buckets: [...buckets].sort((a, b) => a - b),
        values: new Map(),
      };
      this.metrics.set(fullName, metric);
    }

    if (metric.type !== 'histogram') {
      throw new Error(`Metric ${fullName} already exists as ${metric.type}`);
    }

    return new Histogram(metric as HistogramMetric);
  }

  /**
   * Serialize all metrics to Prometheus text format.
   */
  serialize(): string {
    const lines: string[] = [];

    for (const metric of this.metrics.values()) {
      // Add HELP and TYPE comments
      lines.push(`# HELP ${metric.name} ${metric.help}`);
      lines.push(`# TYPE ${metric.name} ${metric.type}`);

      if (metric.type === 'counter' || metric.type === 'gauge') {
        for (const [key, value] of metric.values) {
          const labels = key ? JSON.parse(key) as [string, string][] : [];
          const labelsObj = Object.fromEntries(labels);
          lines.push(`${metric.name}${serializeLabels(labelsObj)} ${value}`);
        }
      } else if (metric.type === 'histogram') {
        for (const [key, data] of metric.values) {
          const labels = key ? JSON.parse(key) as [string, string][] : [];
          const labelsObj = Object.fromEntries(labels);
          const baseLabels = serializeLabels(labelsObj);

          // Output bucket values
          for (let i = 0; i < metric.buckets.length; i++) {
            const bucket = metric.buckets[i];
            const bucketLabels = { ...labelsObj, le: String(bucket) };
            lines.push(`${metric.name}_bucket${serializeLabels(bucketLabels)} ${data.buckets[i]}`);
          }
          // +Inf bucket
          const infLabels = { ...labelsObj, le: '+Inf' };
          lines.push(`${metric.name}_bucket${serializeLabels(infLabels)} ${data.count}`);

          // Sum and count
          const sumSuffix = baseLabels ? baseLabels : '';
          lines.push(`${metric.name}_sum${sumSuffix} ${data.sum}`);
          lines.push(`${metric.name}_count${sumSuffix} ${data.count}`);
        }
      }

      lines.push(''); // Empty line between metrics
    }

    return lines.join('\n');
  }

  /**
   * Reset all metrics (useful for testing).
   */
  reset(): void {
    this.metrics.clear();
  }
}

/**
 * Counter metric - monotonically increasing value.
 */
export class Counter {
  constructor(private metric: CounterMetric) {}

  /**
   * Increment the counter by 1.
   */
  inc(labels: Labels = {}): void {
    this.add(1, labels);
  }

  /**
   * Add a value to the counter.
   */
  add(value: number, labels: Labels = {}): void {
    if (value < 0) {
      throw new Error('Counter can only be incremented');
    }
    const key = labelsKey(labels);
    const current = this.metric.values.get(key) ?? 0;
    this.metric.values.set(key, current + value);
  }

  /**
   * Get current value (for testing).
   */
  get(labels: Labels = {}): number {
    return this.metric.values.get(labelsKey(labels)) ?? 0;
  }
}

/**
 * Gauge metric - can go up or down.
 */
export class Gauge {
  constructor(private metric: GaugeMetric) {}

  /**
   * Set the gauge to a specific value.
   */
  set(value: number, labels: Labels = {}): void {
    this.metric.values.set(labelsKey(labels), value);
  }

  /**
   * Increment the gauge by 1.
   */
  inc(labels: Labels = {}): void {
    this.add(1, labels);
  }

  /**
   * Decrement the gauge by 1.
   */
  dec(labels: Labels = {}): void {
    this.add(-1, labels);
  }

  /**
   * Add a value to the gauge.
   */
  add(value: number, labels: Labels = {}): void {
    const key = labelsKey(labels);
    const current = this.metric.values.get(key) ?? 0;
    this.metric.values.set(key, current + value);
  }

  /**
   * Get current value (for testing).
   */
  get(labels: Labels = {}): number {
    return this.metric.values.get(labelsKey(labels)) ?? 0;
  }
}

/**
 * Histogram metric - tracks value distributions.
 */
export class Histogram {
  constructor(private metric: HistogramMetric) {}

  /**
   * Observe a value.
   */
  observe(value: number, labels: Labels = {}): void {
    const key = labelsKey(labels);
    let data = this.metric.values.get(key);

    if (!data) {
      data = {
        buckets: new Array<number>(this.metric.buckets.length).fill(0),
        sum: 0,
        count: 0,
      };
      this.metric.values.set(key, data);
    }

    // Update buckets
    const buckets = data.buckets;
    for (let i = 0; i < this.metric.buckets.length; i++) {
      const threshold = this.metric.buckets[i];
      if (threshold !== undefined && value <= threshold) {
        buckets[i] = (buckets[i] ?? 0) + 1;
      }
    }

    data.sum += value;
    data.count++;
  }

  /**
   * Create a timer that records duration when stopped.
   */
  startTimer(labels: Labels = {}): () => number {
    const start = process.hrtime.bigint();
    return () => {
      const end = process.hrtime.bigint();
      const durationSeconds = Number(end - start) / 1e9;
      this.observe(durationSeconds, labels);
      return durationSeconds;
    };
  }
}

/**
 * Global metrics registry instance.
 */
export const metrics = new MetricsRegistry();

/**
 * Pre-defined metrics for common use cases.
 */
export const httpRequestsTotal = metrics.counter(
  'http_requests_total',
  'Total number of HTTP requests'
);

export const httpRequestDuration = metrics.histogram(
  'http_request_duration_seconds',
  'HTTP request latency in seconds'
);

export const httpRequestsInFlight = metrics.gauge(
  'http_requests_in_flight',
  'Number of HTTP requests currently being processed'
);

export const gtfsPollsTotal = metrics.counter(
  'gtfs_polls_total',
  'Total number of GTFS-RT feed polls'
);

export const gtfsPollDuration = metrics.histogram(
  'gtfs_poll_duration_seconds',
  'GTFS-RT poll latency in seconds'
);

export const gtfsTrainUpdates = metrics.counter(
  'gtfs_train_updates_total',
  'Total number of train updates processed from GTFS-RT'
);

export const jobsProcessedTotal = metrics.counter(
  'jobs_processed_total',
  'Total number of background jobs processed'
);

export const jobsFailedTotal = metrics.counter(
  'jobs_failed_total',
  'Total number of failed background jobs'
);

export const jobDuration = metrics.histogram(
  'job_duration_seconds',
  'Background job processing duration in seconds'
);

export const activeJobsGauge = metrics.gauge(
  'active_jobs',
  'Number of currently active background jobs'
);

export const dbConnectionsActive = metrics.gauge(
  'db_connections_active',
  'Number of active database connections'
);

export const dbQueryDuration = metrics.histogram(
  'db_query_duration_seconds',
  'Database query duration in seconds'
);

export const cacheHitsTotal = metrics.counter(
  'cache_hits_total',
  'Total number of cache hits'
);

export const cacheMissesTotal = metrics.counter(
  'cache_misses_total',
  'Total number of cache misses'
);

export const claimsGeneratedTotal = metrics.counter(
  'claims_generated_total',
  'Total number of compensation claims generated'
);

export const delaysDetectedTotal = metrics.counter(
  'delays_detected_total',
  'Total number of train delays detected'
);
