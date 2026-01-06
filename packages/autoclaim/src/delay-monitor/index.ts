// Types
export {
  JourneyStatus,
  type DelayCheckResult,
  type MatchResult,
  type CompletedBooking,
  type ProcessingResult,
  type BookingCompletedEvent,
} from './types.js';

// Matcher
export {
  matchBookingToTrain,
  matchBookingsToTrains,
  normalizeTrainNumber,
  formatDateForTripId,
  buildTripId,
  isSameDay,
} from './matcher.js';

// Checker
export {
  checkJourneyStatus,
  isJourneyComplete,
  calculateDelayMinutes,
  isEligibleForCompensation,
  COMPENSATION_THRESHOLD_MINUTES,
  getCompletionBufferMs,
} from './checker.js';

// Service
export {
  DelayMonitorService,
  createDelayMonitorService,
  type BookingCompletedHandler,
} from './service.js';

// Worker
export {
  createDelayMonitorWorker,
  createDelayMonitorQueue,
  DelayMonitorScheduler,
  startDelayMonitorScheduler,
  DELAY_MONITOR_QUEUE_NAME,
  type DelayMonitorJobData,
  type DelayMonitorJobResult,
  type DelayMonitorMetrics,
  type DelayMonitorSchedulerOptions,
} from './worker.js';
