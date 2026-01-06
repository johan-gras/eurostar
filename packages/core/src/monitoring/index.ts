export {
  MetricsRegistry,
  Counter,
  Gauge,
  Histogram,
  metrics,
  type MetricType,
  type Labels,
  // Pre-defined metrics
  httpRequestsTotal,
  httpRequestDuration,
  httpRequestsInFlight,
  gtfsPollsTotal,
  gtfsPollDuration,
  gtfsTrainUpdates,
  jobsProcessedTotal,
  jobsFailedTotal,
  jobDuration,
  activeJobsGauge,
  dbConnectionsActive,
  dbQueryDuration,
  cacheHitsTotal,
  cacheMissesTotal,
  claimsGeneratedTotal,
  delaysDetectedTotal,
} from './metrics.js';

export {
  registerMetricsRoutes,
  type MetricsRoutesOptions,
} from './metrics.handler.js';
