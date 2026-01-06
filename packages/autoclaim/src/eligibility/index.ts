// Types
export {
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
} from './types.js';

// Tiers
export {
  COMPENSATION_TIERS,
  getTierForDelay,
  getTierName,
  isDelayCompensable,
  getTierBoundaries,
} from './tiers.js';

// Calculator
export {
  calculateCompensation,
  calculateCompensationDetailed,
  convertEurToGbp,
  convertGbpToEur,
  meetsMinimumPayout,
  getMinimumPayout,
  formatCompensationAmount,
  type CalculateCompensationOptions,
} from './calculator.js';

// Deadline
export {
  isClaimWindowOpen,
  getClaimWindowOpenTime,
  hoursUntilClaimWindowOpens,
  isWithinClaimWindow,
  getClaimDeadline,
  daysUntilDeadline,
  hasDeadlinePassed,
  getClaimTimingStatus,
  formatTimeUntilDeadline,
} from './deadline.js';

// Service
export {
  EligibilityService,
  createEligibilityService,
  checkEligibility,
  type CheckEligibilityOptions,
} from './service.js';
