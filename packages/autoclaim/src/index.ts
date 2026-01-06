// AutoClaim package - delay compensation automation

export const VERSION = '0.0.1';

// Email parser exports
export {
  parseBookingEmail,
  preprocessEmail,
  stripHtml,
  cleanForwardedEmail,
  ParseErrorCode,
  createParseError,
  ParsedBookingSchema,
  PnrSchema,
  TcnSchema,
  TrainNumberSchema,
  JourneyDateSchema,
  validateBooking,
  safeValidateBooking,
  PNR_PATTERN,
  TCN_PATTERN,
  TRAIN_NUMBER_PATTERN,
  DATE_PATTERNS,
  COACH_PATTERN,
  SEAT_PATTERN,
  STATION_MAP,
  STATION_ALIASES,
  normalizeStation,
} from './email-parser/index.js';
export type { ParsedBooking, ParseError, SafeParseResult } from './email-parser/index.js';

// Delay monitor exports
export {
  // Types
  JourneyStatus,
  type DelayCheckResult,
  type MatchResult,
  type CompletedBooking,
  type ProcessingResult,
  type BookingCompletedEvent,
  // Matcher
  matchBookingToTrain,
  matchBookingsToTrains,
  normalizeTrainNumber,
  formatDateForTripId,
  buildTripId,
  isSameDay,
  // Checker
  checkJourneyStatus,
  isJourneyComplete,
  calculateDelayMinutes,
  isEligibleForCompensation,
  COMPENSATION_THRESHOLD_MINUTES,
  getCompletionBufferMs,
  // Service
  DelayMonitorService,
  createDelayMonitorService,
  type BookingCompletedHandler,
  // Worker
  createDelayMonitorWorker,
  createDelayMonitorQueue,
  DelayMonitorScheduler,
  startDelayMonitorScheduler,
  DELAY_MONITOR_QUEUE_NAME,
  type DelayMonitorJobData,
  type DelayMonitorJobResult,
  type DelayMonitorMetrics,
  type DelayMonitorSchedulerOptions,
} from './delay-monitor/index.js';

// Eligibility exports
export {
  // Types
  Currency,
  EligibilityReason,
  MINIMUM_PAYOUT,
  DEFAULT_EUR_TO_GBP_RATE,
  CLAIM_WINDOW_HOURS,
  CLAIM_DEADLINE_MONTHS,
  MINIMUM_DELAY_MINUTES,
  type CompensationTier,
  type CompensationResult,
  type EligibilityStatus,
  // Tiers
  COMPENSATION_TIERS,
  getTierForDelay,
  getTierName,
  isDelayCompensable,
  getTierBoundaries,
  // Calculator
  calculateCompensation,
  calculateCompensationDetailed,
  convertEurToGbp,
  convertGbpToEur,
  meetsMinimumPayout,
  getMinimumPayout,
  formatCompensationAmount,
  type CalculateCompensationOptions,
  // Deadline
  isClaimWindowOpen,
  getClaimWindowOpenTime,
  hoursUntilClaimWindowOpens,
  isWithinClaimWindow,
  getClaimDeadline,
  daysUntilDeadline,
  hasDeadlinePassed,
  getClaimTimingStatus,
  formatTimeUntilDeadline,
  // Service
  EligibilityService,
  createEligibilityService,
  checkEligibility,
  type CheckEligibilityOptions,
} from './eligibility/index.js';

// Claim generator exports
export {
  // Types
  type ClaimFormData,
  type ClaimGenerationResult,
  type ClaimWithFormData,
  type ClaimGeneratorError,
  type ListClaimsOptions,
  type UserClaimsSummary,
  ClaimGeneratorErrorCode,
  createClaimGeneratorError,
  STATION_NAMES,
  EUROSTAR_CLAIM_PORTAL_URL,
  // Form data utilities
  buildClaimFormData,
  generateClaimPortalUrl,
  formatForClipboard,
  formatAsJson,
  validateFormData,
  parsePassengerName,
  formatJourneyDate,
  getStationDisplayName,
  // Events
  type ClaimCreatedEvent,
  type ClaimSubmittedEvent,
  type ClaimStatusChangedEvent,
  type ClaimDeadlineApproachingEvent,
  type ClaimEvent,
  type ClaimCreatedHandler,
  type ClaimSubmittedHandler,
  type ClaimStatusChangedHandler,
  type ClaimDeadlineApproachingHandler,
  ClaimEventType,
  ClaimEventEmitter,
  createClaimEventEmitter,
  claimEvents,
  // Service
  ClaimGeneratorService,
  createClaimGeneratorService,
} from './claim-generator/index.js';

// Notification exports
export {
  // Types
  NotificationType,
  NotificationStatus,
  type NotificationPayload,
  type ClaimEligiblePayload,
  type ClaimReminderPayload,
  type DeadlineWarningPayload,
  type NotificationResult,
  type NotificationJobData,
  type NotificationJobResult,
  type ClaimEligibleEmailProps,
  type DeadlineWarningEmailProps,
  type BaseNotificationPayload,
  type SendNotificationOptions,
  // Email service
  type EmailService,
  type Email,
  type SendEmailResult,
  MockEmailService,
  ResendEmailService,
  type ResendEmailServiceOptions,
  createEmailService,
  renderNotificationEmail,
  // Notification service
  NotificationService,
  createNotificationService,
  type NotificationServiceOptions,
  type ClaimNotificationData,
  type ClaimData,
  NOTIFICATION_QUEUE_NAME,
  // Worker
  createNotificationWorker,
  shutdownNotificationWorker,
  type NotificationWorkerOptions,
  type NotificationWorkerMetrics,
  // Templates
  ClaimEligibleEmail,
  DeadlineWarningEmail,
} from './notifications/index.js';

// API exports
export {
  // App factory
  createApp,
  createTestApp,
  type CreateAppOptions,
  type AppServices,
  // Types
  type ApiError,
  type ErrorResponse,
  type SuccessResponse,
  type PaginationMeta,
  ApiErrorCode,
  createErrorResponse,
  createSuccessResponse,
  type BookingResponse,
  type BookingDetailResponse,
  type ClaimResponse,
  type ClaimDetailResponse,
  type HealthResponse,
  type ReadinessResponse,
  type LivenessResponse,
  toBookingResponse,
  toClaimResponse,
  // Schemas
  BookingParamsSchema,
  ClaimParamsSchema,
  CreateBookingSchema,
  ListQuerySchema,
  ListBookingsQuerySchema,
  ListClaimsQuerySchema,
  isEmailRequest,
  isManualRequest,
  type BookingParams,
  type ClaimParams,
  type CreateBooking,
  type ListQuery,
  type ListBookingsQuery,
  type ListClaimsQuery,
  // Middleware
  ApiException,
  createTestToken,
  type JwtPayload,
  type AuthOptions,
} from './api/index.js';
