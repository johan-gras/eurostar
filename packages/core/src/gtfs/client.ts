import GtfsRealtimeBindings from 'gtfs-realtime-bindings';
import { Result, ok, err } from '../result.js';
import { GtfsFeedMessage, GtfsFetchError } from './types.js';

const GTFS_RT_URL =
  'https://integration-storage.dm.eurostar.com/gtfs-prod/gtfs_rt_v2.bin';

const DEFAULT_MAX_RETRIES = 3;
const DEFAULT_BASE_DELAY_MS = 1000;
const DEFAULT_TIMEOUT_MS = 30000; // 30 seconds

export interface FetchOptions {
  maxRetries?: number;
  baseDelayMs?: number;
  timeoutMs?: number;
}

/**
 * Fetches the GTFS-RT feed from Eurostar's endpoint.
 * Does not retry on failure - use fetchGtfsRealtimeWithRetry for that.
 */
export async function fetchGtfsRealtime(
  timeoutMs: number = DEFAULT_TIMEOUT_MS
): Promise<Result<GtfsFeedMessage, GtfsFetchError>> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(GTFS_RT_URL, {
      headers: { Accept: 'application/x-protobuf' },
      signal: controller.signal,
    });

    if (!response.ok) {
      const retryable = response.status >= 500 || response.status === 429;
      return err(
        new GtfsFetchError(
          `GTFS fetch failed: ${response.status} ${response.statusText}`,
          response.status,
          retryable
        )
      );
    }

    const buffer = await response.arrayBuffer();
    const feed = GtfsRealtimeBindings.transit_realtime.FeedMessage.decode(
      new Uint8Array(buffer)
    );

    return ok(feed as unknown as GtfsFeedMessage);
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      return err(
        new GtfsFetchError(
          `GTFS fetch timed out after ${timeoutMs}ms`,
          undefined,
          true
        )
      );
    }
    const message =
      error instanceof Error ? error.message : 'Unknown fetch error';
    return err(new GtfsFetchError(message, undefined, true));
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Fetches the GTFS-RT feed with exponential backoff retry.
 */
export async function fetchGtfsRealtimeWithRetry(
  options: FetchOptions = {}
): Promise<Result<GtfsFeedMessage, GtfsFetchError>> {
  const maxRetries = options.maxRetries ?? DEFAULT_MAX_RETRIES;
  const baseDelayMs = options.baseDelayMs ?? DEFAULT_BASE_DELAY_MS;
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;

  let lastError: GtfsFetchError | undefined;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    const result = await fetchGtfsRealtime(timeoutMs);

    if (result.isOk()) {
      return result;
    }

    lastError = result.error;

    if (!result.error.retryable) {
      return result;
    }

    if (attempt < maxRetries - 1) {
      const delay = baseDelayMs * Math.pow(2, attempt);
      await sleep(delay);
    }
  }

  return err(
    lastError ??
      new GtfsFetchError('GTFS fetch failed after retries', undefined, false)
  );
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
