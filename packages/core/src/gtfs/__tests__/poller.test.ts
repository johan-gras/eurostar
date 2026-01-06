import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { GtfsPoller, type CircuitState, type HealthStatus, type Logger } from '../poller.js';
import * as client from '../client.js';
import { ok, err } from '../../result.js';
import { GtfsFetchError, type GtfsUpdateEvent, type ParsedTrainDelay } from '../types.js';
import { multipleFeed, onTimeFeed } from './fixtures.js';

vi.mock('../client.js');

describe('GtfsPoller', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-05T12:00:00Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.resetAllMocks();
  });

  describe('basic polling', () => {
    it('emits update event on successful poll', async () => {
      vi.mocked(client.fetchGtfsRealtimeWithRetry).mockResolvedValueOnce(
        ok(onTimeFeed)
      );

      const poller = new GtfsPoller();
      const updateHandler = vi.fn();
      poller.on('update', updateHandler);

      await poller.poll();

      expect(updateHandler).toHaveBeenCalledTimes(1);
      const event: GtfsUpdateEvent = updateHandler.mock.calls[0][0];
      expect(event.entityCount).toBe(1);
      expect(event.delays).toHaveLength(1);
      expect(event.timestamp).toBeInstanceOf(Date);
    });

    it('emits significant-delay for trains delayed >= 60 min', async () => {
      vi.mocked(client.fetchGtfsRealtimeWithRetry).mockResolvedValueOnce(
        ok(multipleFeed)
      );

      const poller = new GtfsPoller();
      const significantHandler = vi.fn();
      poller.on('significant-delay', significantHandler);

      await poller.poll();

      // multipleFeed has 2 trains with delay >= 60 min (60 and 120)
      expect(significantHandler).toHaveBeenCalledTimes(2);

      const delays: ParsedTrainDelay[] = significantHandler.mock.calls.map(
        (call) => call[0]
      );
      expect(delays.map((d) => d.finalDelayMinutes)).toEqual([60, 120]);
    });

    it('does not emit significant-delay for minor delays', async () => {
      vi.mocked(client.fetchGtfsRealtimeWithRetry).mockResolvedValueOnce(
        ok(onTimeFeed)
      );

      const poller = new GtfsPoller();
      const significantHandler = vi.fn();
      poller.on('significant-delay', significantHandler);

      await poller.poll();

      expect(significantHandler).not.toHaveBeenCalled();
    });

    it('emits error event on fetch failure', async () => {
      const fetchError = new GtfsFetchError('Network error', undefined, false);
      vi.mocked(client.fetchGtfsRealtimeWithRetry).mockResolvedValueOnce(
        err(fetchError)
      );

      const poller = new GtfsPoller();
      const errorHandler = vi.fn();
      const updateHandler = vi.fn();
      poller.on('error', errorHandler);
      poller.on('update', updateHandler);

      await poller.poll();

      expect(errorHandler).toHaveBeenCalledWith(fetchError);
      expect(updateHandler).not.toHaveBeenCalled();
    });

    it('starts and stops polling at configured interval', async () => {
      vi.mocked(client.fetchGtfsRealtimeWithRetry).mockResolvedValue(
        ok(onTimeFeed)
      );

      const poller = new GtfsPoller({ pollIntervalMs: 10_000 });
      const updateHandler = vi.fn();
      poller.on('update', updateHandler);

      await poller.start();
      expect(updateHandler).toHaveBeenCalledTimes(1); // Initial poll

      // Advance time by 10 seconds
      await vi.advanceTimersByTimeAsync(10_000);
      expect(updateHandler).toHaveBeenCalledTimes(2);

      // Advance again
      await vi.advanceTimersByTimeAsync(10_000);
      expect(updateHandler).toHaveBeenCalledTimes(3);

      poller.stop();

      // Should not poll after stop
      await vi.advanceTimersByTimeAsync(10_000);
      expect(updateHandler).toHaveBeenCalledTimes(3);
    });

    it('reports running status correctly', async () => {
      vi.mocked(client.fetchGtfsRealtimeWithRetry).mockResolvedValue(
        ok(onTimeFeed)
      );

      const poller = new GtfsPoller();

      expect(poller.isRunning()).toBe(false);

      await poller.start();
      expect(poller.isRunning()).toBe(true);

      poller.stop();
      expect(poller.isRunning()).toBe(false);
    });

    it('does not start twice when already running', async () => {
      vi.mocked(client.fetchGtfsRealtimeWithRetry).mockResolvedValue(
        ok(onTimeFeed)
      );

      const poller = new GtfsPoller();
      const updateHandler = vi.fn();
      poller.on('update', updateHandler);

      await poller.start();
      await poller.start(); // Should be ignored

      expect(updateHandler).toHaveBeenCalledTimes(1); // Only one initial poll
    });

    it('uses custom significant delay threshold', async () => {
      vi.mocked(client.fetchGtfsRealtimeWithRetry).mockResolvedValueOnce(
        ok(multipleFeed)
      );

      const poller = new GtfsPoller({ significantDelayThresholdMinutes: 100 });
      const significantHandler = vi.fn();
      poller.on('significant-delay', significantHandler);

      await poller.poll();

      // Only 1 train with delay >= 100 min (120 min)
      expect(significantHandler).toHaveBeenCalledTimes(1);
      expect(significantHandler.mock.calls[0][0].finalDelayMinutes).toBe(120);
    });
  });

  describe('circuit breaker', () => {
    it('opens circuit after consecutive failures', async () => {
      const fetchError = new GtfsFetchError('Network error', 500, true);
      vi.mocked(client.fetchGtfsRealtimeWithRetry).mockResolvedValue(
        err(fetchError)
      );

      const poller = new GtfsPoller({ circuitBreakerThreshold: 3 });
      const circuitHandler = vi.fn();
      poller.on('circuit-state-change', circuitHandler);
      poller.on('error', () => {}); // Prevent unhandled error

      // First 3 failures should open the circuit
      await poller.poll();
      await poller.poll();
      await poller.poll();

      expect(circuitHandler).toHaveBeenCalledWith('open');
      expect(poller.getMetrics().circuitState).toBe('open');
    });

    it('blocks polls when circuit is open', async () => {
      const fetchError = new GtfsFetchError('Network error', 500, true);
      vi.mocked(client.fetchGtfsRealtimeWithRetry).mockResolvedValue(
        err(fetchError)
      );

      const poller = new GtfsPoller({
        circuitBreakerThreshold: 2,
        circuitBreakerResetMs: 60_000,
      });
      poller.on('error', () => {}); // Prevent unhandled error

      // Open the circuit
      await poller.poll();
      await poller.poll();

      const callCount = vi.mocked(client.fetchGtfsRealtimeWithRetry).mock.calls
        .length;

      // This should be blocked by the circuit breaker
      await poller.poll();

      expect(
        vi.mocked(client.fetchGtfsRealtimeWithRetry).mock.calls.length
      ).toBe(callCount);
    });

    it('transitions to half-open after reset timeout', async () => {
      const fetchError = new GtfsFetchError('Network error', 500, true);
      vi.mocked(client.fetchGtfsRealtimeWithRetry).mockResolvedValue(
        err(fetchError)
      );

      const poller = new GtfsPoller({
        circuitBreakerThreshold: 2,
        circuitBreakerResetMs: 10_000,
      });
      const circuitHandler = vi.fn();
      poller.on('circuit-state-change', circuitHandler);
      poller.on('error', () => {}); // Prevent unhandled error

      // Open the circuit
      await poller.poll();
      await poller.poll();

      expect(poller.getMetrics().circuitState).toBe('open');

      // Advance time past the reset timeout
      await vi.advanceTimersByTimeAsync(10_000);

      // Next poll should transition to half-open and attempt
      await poller.poll();

      expect(circuitHandler).toHaveBeenCalledWith('half-open');
    });

    it('closes circuit on successful poll in half-open state', async () => {
      const fetchError = new GtfsFetchError('Network error', 500, true);
      vi.mocked(client.fetchGtfsRealtimeWithRetry)
        .mockResolvedValueOnce(err(fetchError))
        .mockResolvedValueOnce(err(fetchError))
        .mockResolvedValueOnce(ok(onTimeFeed));

      const poller = new GtfsPoller({
        circuitBreakerThreshold: 2,
        circuitBreakerResetMs: 10_000,
      });
      const circuitHandler = vi.fn();
      poller.on('circuit-state-change', circuitHandler);
      poller.on('error', () => {}); // Prevent unhandled error

      // Open the circuit
      await poller.poll();
      await poller.poll();

      // Advance time past the reset timeout
      await vi.advanceTimersByTimeAsync(10_000);

      // Successful poll should close the circuit
      await poller.poll();

      expect(circuitHandler).toHaveBeenCalledWith('closed');
      expect(poller.getMetrics().circuitState).toBe('closed');
    });

    it('re-opens circuit on failure in half-open state', async () => {
      const fetchError = new GtfsFetchError('Network error', 500, true);
      vi.mocked(client.fetchGtfsRealtimeWithRetry).mockResolvedValue(
        err(fetchError)
      );

      const poller = new GtfsPoller({
        circuitBreakerThreshold: 2,
        circuitBreakerResetMs: 10_000,
      });
      const circuitHandler = vi.fn();
      poller.on('circuit-state-change', circuitHandler);
      poller.on('error', () => {}); // Prevent unhandled error

      // Open the circuit
      await poller.poll();
      await poller.poll();

      // Advance time past the reset timeout
      await vi.advanceTimersByTimeAsync(10_000);

      // Failed poll should re-open the circuit
      await poller.poll();

      const calls = circuitHandler.mock.calls.map((c) => c[0]);
      expect(calls).toContain('open');
      expect(calls).toContain('half-open');
      // Should have transitioned to half-open then back to open
      expect(poller.getMetrics().circuitState).toBe('open');
    });

    it('resets consecutive failures on success', async () => {
      const fetchError = new GtfsFetchError('Network error', 500, true);
      vi.mocked(client.fetchGtfsRealtimeWithRetry)
        .mockResolvedValueOnce(err(fetchError))
        .mockResolvedValueOnce(err(fetchError))
        .mockResolvedValueOnce(ok(onTimeFeed))
        .mockResolvedValueOnce(err(fetchError));

      const poller = new GtfsPoller({ circuitBreakerThreshold: 3 });
      poller.on('error', () => {}); // Prevent unhandled error

      await poller.poll(); // Fail 1
      await poller.poll(); // Fail 2
      await poller.poll(); // Success - resets counter
      await poller.poll(); // Fail 1 (new count)

      // Circuit should still be closed
      expect(poller.getMetrics().circuitState).toBe('closed');
      expect(poller.getMetrics().consecutiveFailures).toBe(1);
    });
  });

  describe('metrics', () => {
    it('tracks poll counts correctly', async () => {
      const fetchError = new GtfsFetchError('Error', undefined, true);
      vi.mocked(client.fetchGtfsRealtimeWithRetry)
        .mockResolvedValueOnce(ok(onTimeFeed))
        .mockResolvedValueOnce(err(fetchError))
        .mockResolvedValueOnce(ok(onTimeFeed));

      const poller = new GtfsPoller();
      poller.on('error', () => {}); // Prevent unhandled error

      await poller.poll();
      await poller.poll();
      await poller.poll();

      const metrics = poller.getMetrics();
      expect(metrics.totalPolls).toBe(3);
      expect(metrics.successfulPolls).toBe(2);
      expect(metrics.failedPolls).toBe(1);
    });

    it('tracks timestamps', async () => {
      const fetchError = new GtfsFetchError('Error', undefined, true);
      vi.mocked(client.fetchGtfsRealtimeWithRetry)
        .mockResolvedValueOnce(ok(onTimeFeed))
        .mockResolvedValueOnce(err(fetchError));

      const poller = new GtfsPoller();
      poller.on('error', () => {}); // Prevent unhandled error

      await poller.poll();
      const metricsAfterSuccess = poller.getMetrics();

      expect(metricsAfterSuccess.lastPollTimestamp).toBeInstanceOf(Date);
      expect(metricsAfterSuccess.lastSuccessTimestamp).toBeInstanceOf(Date);
      expect(metricsAfterSuccess.lastErrorTimestamp).toBeNull();

      vi.advanceTimersByTime(1000);

      await poller.poll();
      const metricsAfterError = poller.getMetrics();

      expect(metricsAfterError.lastErrorTimestamp).toBeInstanceOf(Date);
    });

    it('calculates average latency', async () => {
      vi.mocked(client.fetchGtfsRealtimeWithRetry).mockImplementation(
        async () => {
          // Use fake timer instead of real delay
          return ok(onTimeFeed);
        }
      );

      const poller = new GtfsPoller();

      await poller.poll();
      await poller.poll();

      const metrics = poller.getMetrics();
      // With fake timers, latency should be minimal but tracked
      expect(metrics.successfulPolls).toBe(2);
      expect(metrics.averageLatencyMs).toBeGreaterThanOrEqual(0);
    });
  });

  describe('health status', () => {
    it('reports healthy when circuit is closed and recent success', async () => {
      vi.mocked(client.fetchGtfsRealtimeWithRetry).mockResolvedValueOnce(
        ok(onTimeFeed)
      );

      const poller = new GtfsPoller();
      await poller.poll();

      const health = poller.getHealthStatus();
      expect(health.healthy).toBe(true);
      expect(health.circuitState).toBe('closed');
      expect(health.consecutiveFailures).toBe(0);
    });

    it('reports unhealthy when circuit is open', async () => {
      const fetchError = new GtfsFetchError('Network error', 500, true);
      vi.mocked(client.fetchGtfsRealtimeWithRetry).mockResolvedValue(
        err(fetchError)
      );

      const poller = new GtfsPoller({ circuitBreakerThreshold: 2 });
      poller.on('error', () => {}); // Prevent unhandled error

      await poller.poll();
      await poller.poll();

      const health = poller.getHealthStatus();
      expect(health.healthy).toBe(false);
      expect(health.circuitState).toBe('open');
    });

    it('emits health-change event on status change', async () => {
      const fetchError = new GtfsFetchError('Error', undefined, true);
      vi.mocked(client.fetchGtfsRealtimeWithRetry)
        .mockResolvedValueOnce(ok(onTimeFeed))
        .mockResolvedValueOnce(err(fetchError))
        .mockResolvedValueOnce(err(fetchError));

      const poller = new GtfsPoller({ circuitBreakerThreshold: 2 });
      const healthHandler = vi.fn();
      poller.on('health-change', healthHandler);
      poller.on('error', () => {}); // Prevent unhandled error

      await poller.poll(); // Success - healthy
      await poller.poll(); // Fail
      await poller.poll(); // Fail - opens circuit, becomes unhealthy

      expect(healthHandler).toHaveBeenCalled();
      const lastCall: HealthStatus =
        healthHandler.mock.calls[healthHandler.mock.calls.length - 1][0];
      expect(lastCall.healthy).toBe(false);
    });
  });

  describe('graceful shutdown', () => {
    it('waits for in-flight poll to complete', async () => {
      let resolvePromise: () => void;
      const pollPromise = new Promise<void>((resolve) => {
        resolvePromise = resolve;
      });

      vi.mocked(client.fetchGtfsRealtimeWithRetry).mockImplementationOnce(
        async () => {
          await pollPromise;
          return ok(onTimeFeed);
        }
      );

      const poller = new GtfsPoller();
      const updateHandler = vi.fn();
      poller.on('update', updateHandler);

      // Start polling (will wait on the promise)
      const startPromise = poller.start();

      // Give it time to start the poll
      await vi.advanceTimersByTimeAsync(1);

      // Initiate shutdown
      const shutdownPromise = poller.shutdown(5000);

      // Poll hasn't completed yet
      expect(updateHandler).not.toHaveBeenCalled();

      // Complete the poll
      resolvePromise!();
      await startPromise;
      await shutdownPromise;

      expect(updateHandler).toHaveBeenCalledTimes(1);
      expect(poller.isRunning()).toBe(false);
    });

    it('stops polling during shutdown', async () => {
      vi.mocked(client.fetchGtfsRealtimeWithRetry).mockResolvedValue(
        ok(onTimeFeed)
      );

      const poller = new GtfsPoller({ pollIntervalMs: 10_000 });
      await poller.start();

      await poller.shutdown();

      // Should skip polls during shutdown
      await vi.advanceTimersByTimeAsync(10_000);

      expect(poller.isRunning()).toBe(false);
    });
  });

  describe('structured logging', () => {
    it('calls logger methods with context', async () => {
      vi.mocked(client.fetchGtfsRealtimeWithRetry).mockResolvedValueOnce(
        ok(onTimeFeed)
      );

      const mockLogger: Logger = {
        debug: vi.fn(),
        info: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
      };

      const poller = new GtfsPoller({ logger: mockLogger });
      await poller.poll();

      expect(mockLogger.debug).toHaveBeenCalled();
      expect(mockLogger.info).toHaveBeenCalledWith(
        'Poll successful',
        expect.objectContaining({
          entityCount: expect.any(Number),
          latencyMs: expect.any(Number),
        })
      );
    });

    it('logs errors with context', async () => {
      const fetchError = new GtfsFetchError('Network error', 500, true);
      vi.mocked(client.fetchGtfsRealtimeWithRetry).mockResolvedValueOnce(
        err(fetchError)
      );

      const mockLogger: Logger = {
        debug: vi.fn(),
        info: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
      };

      const poller = new GtfsPoller({ logger: mockLogger });
      poller.on('error', () => {}); // Prevent unhandled error
      await poller.poll();

      expect(mockLogger.error).toHaveBeenCalledWith(
        'Poll failed',
        expect.objectContaining({
          error: 'Network error',
          statusCode: 500,
          retryable: true,
        })
      );
    });

    it('logs circuit state changes', async () => {
      const fetchError = new GtfsFetchError('Network error', 500, true);
      vi.mocked(client.fetchGtfsRealtimeWithRetry).mockResolvedValue(
        err(fetchError)
      );

      const mockLogger: Logger = {
        debug: vi.fn(),
        info: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
      };

      const poller = new GtfsPoller({
        logger: mockLogger,
        circuitBreakerThreshold: 2,
      });
      poller.on('error', () => {}); // Prevent unhandled error

      await poller.poll();
      await poller.poll();

      expect(mockLogger.warn).toHaveBeenCalledWith(
        'Circuit breaker state change',
        expect.objectContaining({
          from: 'closed',
          to: 'open',
        })
      );
    });
  });
});
