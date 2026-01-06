import { EventEmitter } from 'events';
import { fetchGtfsRealtimeWithRetry } from './client.js';
import { extractDelays } from './parser.js';
import { GtfsFeedMessage, GtfsUpdateEvent, ParsedTrainDelay, GtfsFetchError } from './types.js';

const DEFAULT_POLL_INTERVAL_MS = 30_000;
const SIGNIFICANT_DELAY_THRESHOLD_MINUTES = 60;

// Circuit breaker defaults
const DEFAULT_CIRCUIT_BREAKER_THRESHOLD = 5;
const DEFAULT_CIRCUIT_BREAKER_RESET_MS = 60_000;

export interface GtfsPollerOptions {
  pollIntervalMs?: number;
  significantDelayThresholdMinutes?: number;
  circuitBreakerThreshold?: number;
  circuitBreakerResetMs?: number;
  logger?: Logger;
}

export interface Logger {
  debug(message: string, context?: Record<string, unknown>): void;
  info(message: string, context?: Record<string, unknown>): void;
  warn(message: string, context?: Record<string, unknown>): void;
  error(message: string, context?: Record<string, unknown>): void;
}

export type CircuitState = 'closed' | 'open' | 'half-open';

export interface PollerMetrics {
  totalPolls: number;
  successfulPolls: number;
  failedPolls: number;
  lastPollTimestamp: Date | null;
  lastSuccessTimestamp: Date | null;
  lastErrorTimestamp: Date | null;
  lastLatencyMs: number | null;
  averageLatencyMs: number;
  circuitState: CircuitState;
  consecutiveFailures: number;
}

export interface HealthStatus {
  healthy: boolean;
  circuitState: CircuitState;
  lastSuccessAgeMs: number | null;
  consecutiveFailures: number;
  metrics: PollerMetrics;
}

export interface GtfsPollerEvents {
  update: (event: GtfsUpdateEvent) => void;
  'significant-delay': (delay: ParsedTrainDelay) => void;
  error: (error: GtfsFetchError) => void;
  'circuit-state-change': (state: CircuitState) => void;
  'health-change': (status: HealthStatus) => void;
}

const noopLogger: Logger = {
  debug: () => {},
  info: () => {},
  warn: () => {},
  error: () => {},
};

/**
 * Production-quality GTFS-RT polling service with:
 * - Circuit breaker pattern for fault tolerance
 * - Health monitoring and metrics collection
 * - Graceful shutdown handling
 * - Structured logging support
 *
 * Events:
 *   - 'update': Emitted on every successful poll with all delays
 *   - 'significant-delay': Emitted for each train delayed >= threshold
 *   - 'error': Emitted when fetch fails after retries
 *   - 'circuit-state-change': Emitted when circuit breaker state changes
 *   - 'health-change': Emitted when health status changes
 *
 * @example
 * ```ts
 * const poller = new GtfsPoller({
 *   pollIntervalMs: 30_000,
 *   logger: console,
 * });
 *
 * poller.on('update', (event) => {
 *   console.log(`Received ${event.delays.length} train updates`);
 * });
 *
 * poller.on('significant-delay', (delay) => {
 *   console.log(`Train ${delay.trainNumber} delayed by ${delay.finalDelayMinutes} min`);
 * });
 *
 * // Graceful shutdown
 * process.on('SIGTERM', async () => {
 *   await poller.shutdown();
 *   process.exit(0);
 * });
 *
 * await poller.start();
 * ```
 */
export class GtfsPoller extends EventEmitter {
  private intervalId: ReturnType<typeof setInterval> | null = null;
  private readonly pollIntervalMs: number;
  private readonly significantDelayThreshold: number;
  private readonly logger: Logger;
  private running = false;
  private shuttingDown = false;
  private currentPollPromise: Promise<void> | null = null;

  // Circuit breaker state
  private circuitState: CircuitState = 'closed';
  private consecutiveFailures = 0;
  private readonly circuitBreakerThreshold: number;
  private readonly circuitBreakerResetMs: number;
  private circuitOpenedAt: Date | null = null;

  // Metrics
  private totalPolls = 0;
  private successfulPolls = 0;
  private failedPolls = 0;
  private lastPollTimestamp: Date | null = null;
  private lastSuccessTimestamp: Date | null = null;
  private lastErrorTimestamp: Date | null = null;
  private lastLatencyMs: number | null = null;
  private totalLatencyMs = 0;
  private lastHealthy = true;

  constructor(options: GtfsPollerOptions = {}) {
    super();
    this.pollIntervalMs = options.pollIntervalMs ?? DEFAULT_POLL_INTERVAL_MS;
    this.significantDelayThreshold =
      options.significantDelayThresholdMinutes ??
      SIGNIFICANT_DELAY_THRESHOLD_MINUTES;
    this.circuitBreakerThreshold =
      options.circuitBreakerThreshold ?? DEFAULT_CIRCUIT_BREAKER_THRESHOLD;
    this.circuitBreakerResetMs =
      options.circuitBreakerResetMs ?? DEFAULT_CIRCUIT_BREAKER_RESET_MS;
    this.logger = options.logger ?? noopLogger;
  }

  /**
   * Starts the polling service.
   * Performs an initial poll immediately, then polls at the configured interval.
   */
  async start(): Promise<void> {
    if (this.running) {
      this.logger.debug('Poller already running, ignoring start request');
      return;
    }

    this.logger.info('Starting GTFS poller', {
      pollIntervalMs: this.pollIntervalMs,
      significantDelayThreshold: this.significantDelayThreshold,
      circuitBreakerThreshold: this.circuitBreakerThreshold,
    });

    this.running = true;
    this.shuttingDown = false;
    await this.poll();

    this.intervalId = setInterval(() => {
      if (!this.shuttingDown) {
        this.poll().catch((error) => {
          this.logger.error('Unexpected error in poll interval', {
            error: String(error),
          });
          const gtfsError = error instanceof GtfsFetchError
            ? error
            : new GtfsFetchError(error instanceof Error ? error.message : String(error), undefined, true);
          this.emit('error', gtfsError);
        });
      }
    }, this.pollIntervalMs);
  }

  /**
   * Stops the polling service immediately.
   */
  stop(): void {
    this.logger.info('Stopping GTFS poller');
    if (this.intervalId !== null) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    this.running = false;
    this.shuttingDown = false;
  }

  /**
   * Gracefully shuts down the poller, waiting for any in-flight poll to complete.
   * @param timeoutMs Maximum time to wait for in-flight poll (default: 10s)
   */
  async shutdown(timeoutMs = 10_000): Promise<void> {
    this.logger.info('Initiating graceful shutdown', { timeoutMs });
    this.shuttingDown = true;

    if (this.intervalId !== null) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }

    if (this.currentPollPromise) {
      this.logger.debug('Waiting for in-flight poll to complete');
      const timeoutPromise = new Promise<void>((resolve) => {
        setTimeout(() => {
          this.logger.warn('Shutdown timeout exceeded, forcing stop');
          resolve();
        }, timeoutMs);
      });

      await Promise.race([this.currentPollPromise, timeoutPromise]);
    }

    this.running = false;
    this.shuttingDown = false;
    this.logger.info('GTFS poller shutdown complete');
  }

  /**
   * Returns whether the poller is currently running.
   */
  isRunning(): boolean {
    return this.running;
  }

  /**
   * Returns current metrics snapshot.
   */
  getMetrics(): PollerMetrics {
    return {
      totalPolls: this.totalPolls,
      successfulPolls: this.successfulPolls,
      failedPolls: this.failedPolls,
      lastPollTimestamp: this.lastPollTimestamp,
      lastSuccessTimestamp: this.lastSuccessTimestamp,
      lastErrorTimestamp: this.lastErrorTimestamp,
      lastLatencyMs: this.lastLatencyMs,
      averageLatencyMs:
        this.successfulPolls > 0
          ? this.totalLatencyMs / this.successfulPolls
          : 0,
      circuitState: this.circuitState,
      consecutiveFailures: this.consecutiveFailures,
    };
  }

  /**
   * Returns current health status.
   */
  getHealthStatus(): HealthStatus {
    const now = Date.now();
    const lastSuccessAgeMs = this.lastSuccessTimestamp
      ? now - this.lastSuccessTimestamp.getTime()
      : null;

    const healthy =
      this.circuitState !== 'open' &&
      (lastSuccessAgeMs === null ||
        lastSuccessAgeMs < this.pollIntervalMs * 3);

    return {
      healthy,
      circuitState: this.circuitState,
      lastSuccessAgeMs,
      consecutiveFailures: this.consecutiveFailures,
      metrics: this.getMetrics(),
    };
  }

  /**
   * Performs a single poll. Can be called manually for testing.
   */
  async poll(): Promise<void> {
    if (this.shuttingDown) {
      this.logger.debug('Skipping poll during shutdown');
      return;
    }

    // Check circuit breaker
    if (!this.shouldAttemptPoll()) {
      this.logger.debug('Circuit breaker preventing poll', {
        circuitState: this.circuitState,
        consecutiveFailures: this.consecutiveFailures,
      });
      return;
    }

    const pollPromise = this.executePoll();
    this.currentPollPromise = pollPromise;

    try {
      await pollPromise;
    } finally {
      this.currentPollPromise = null;
    }
  }

  private shouldAttemptPoll(): boolean {
    if (this.circuitState === 'closed') {
      return true;
    }

    if (this.circuitState === 'open') {
      const now = Date.now();
      const openDuration = this.circuitOpenedAt
        ? now - this.circuitOpenedAt.getTime()
        : 0;

      if (openDuration >= this.circuitBreakerResetMs) {
        this.transitionCircuitState('half-open');
        return true;
      }
      return false;
    }

    // half-open: allow one request through
    return true;
  }

  private async executePoll(): Promise<void> {
    const startTime = Date.now();
    this.totalPolls++;
    this.lastPollTimestamp = new Date(startTime);

    this.logger.debug('Starting poll', {
      pollNumber: this.totalPolls,
      circuitState: this.circuitState,
    });

    const result = await fetchGtfsRealtimeWithRetry();
    const latencyMs = Date.now() - startTime;
    this.lastLatencyMs = latencyMs;

    if (result.isErr()) {
      this.handlePollFailure(result.error, latencyMs);
      return;
    }

    this.handlePollSuccess(result.value, latencyMs);
  }

  private handlePollSuccess(
    feed: GtfsFeedMessage,
    latencyMs: number
  ): void {
    this.successfulPolls++;
    this.totalLatencyMs += latencyMs;
    this.lastSuccessTimestamp = new Date();
    this.consecutiveFailures = 0;

    this.logger.info('Poll successful', {
      entityCount: feed.entity.length,
      latencyMs,
      successRate: this.getSuccessRate(),
    });

    // Reset circuit breaker on success
    if (this.circuitState !== 'closed') {
      this.transitionCircuitState('closed');
    }

    const delays = extractDelays(feed);

    const updateEvent: GtfsUpdateEvent = {
      timestamp: new Date(),
      entityCount: feed.entity.length,
      delays,
    };

    this.emit('update', updateEvent);

    for (const delay of delays) {
      if (delay.finalDelayMinutes >= this.significantDelayThreshold) {
        this.emit('significant-delay', delay);
      }
    }

    this.checkHealthChange();
  }

  private handlePollFailure(error: GtfsFetchError, latencyMs: number): void {
    this.failedPolls++;
    this.lastErrorTimestamp = new Date();
    this.consecutiveFailures++;

    this.logger.error('Poll failed', {
      error: error.message,
      statusCode: error.statusCode,
      retryable: error.retryable,
      consecutiveFailures: this.consecutiveFailures,
      latencyMs,
    });

    this.emit('error', error);

    // Update circuit breaker
    if (this.circuitState === 'half-open') {
      // Failed during half-open, re-open the circuit
      this.transitionCircuitState('open');
    } else if (this.consecutiveFailures >= this.circuitBreakerThreshold) {
      this.transitionCircuitState('open');
    }

    this.checkHealthChange();
  }

  private transitionCircuitState(newState: CircuitState): void {
    if (this.circuitState === newState) {
      return;
    }

    const oldState = this.circuitState;
    this.circuitState = newState;

    if (newState === 'open') {
      this.circuitOpenedAt = new Date();
    } else {
      this.circuitOpenedAt = null;
    }

    this.logger.warn('Circuit breaker state change', {
      from: oldState,
      to: newState,
      consecutiveFailures: this.consecutiveFailures,
    });

    this.emit('circuit-state-change', newState);
  }

  private checkHealthChange(): void {
    const status = this.getHealthStatus();
    if (status.healthy !== this.lastHealthy) {
      this.lastHealthy = status.healthy;
      this.emit('health-change', status);
    }
  }

  private getSuccessRate(): number {
    if (this.totalPolls === 0) return 1;
    return this.successfulPolls / this.totalPolls;
  }

  // TypeScript type-safe event methods
  override on<K extends keyof GtfsPollerEvents>(
    event: K,
    listener: GtfsPollerEvents[K]
  ): this {
    return super.on(event, listener);
  }

  override emit<K extends keyof GtfsPollerEvents>(
    event: K,
    ...args: Parameters<GtfsPollerEvents[K]>
  ): boolean {
    return super.emit(event, ...args);
  }
}
