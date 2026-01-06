// Types
export {
  type GtfsFeedMessage,
  type GtfsFeedEntity,
  type GtfsTripUpdate,
  type GtfsStopTimeUpdate,
  type GtfsStopTimeEvent,
  type ParsedTrainDelay,
  type ParsedStopDelay,
  type GtfsUpdateEvent,
  GtfsFetchError,
  GtfsParseError,
} from './types.js';

// Client
export {
  fetchGtfsRealtime,
  fetchGtfsRealtimeWithRetry,
  type FetchOptions,
} from './client.js';

// Parser
export {
  parseTripId,
  extractDelays,
  filterSignificantDelays,
} from './parser.js';

// Poller
export {
  GtfsPoller,
  type GtfsPollerOptions,
  type GtfsPollerEvents,
  type Logger,
  type CircuitState,
  type PollerMetrics,
  type HealthStatus,
} from './poller.js';

// Sync
export {
  syncTrainsToDb,
  syncTrainsToDbBatch,
  type SyncResult,
} from './sync.js';
