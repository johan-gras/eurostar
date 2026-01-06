/**
 * Supported currencies for compensation calculations.
 * EUR is the base currency; GBP requires conversion.
 */
export const Currency = {
  EUR: 'EUR',
  GBP: 'GBP',
} as const;

export type Currency = (typeof Currency)[keyof typeof Currency];

/**
 * Defines a compensation tier based on delay duration.
 * Per Eurostar's compensation policy (EU Regulation 1371/2007).
 */
export interface CompensationTier {
  /** Minimum delay in minutes (inclusive) */
  minDelayMinutes: number;
  /** Maximum delay in minutes (exclusive), null for no upper limit */
  maxDelayMinutes: number | null;
  /** Cash refund as decimal (0.25 = 25%) */
  cashPercentage: number;
  /** E-voucher as decimal (0.60 = 60%) */
  voucherPercentage: number;
  /** Human-readable tier name */
  name: string;
}

/**
 * Result of a compensation calculation.
 */
export interface CompensationResult {
  /** Whether the passenger is eligible for compensation */
  eligible: boolean;
  /** Cash refund amount (in specified currency) */
  cashAmount: number;
  /** E-voucher amount (in specified currency) */
  voucherAmount: number;
  /** The compensation tier applied */
  tier: CompensationTier | null;
  /** Currency of the amounts */
  currency: Currency;
  /** Original ticket price */
  ticketPrice: number;
  /** Delay in minutes */
  delayMinutes: number;
}

/**
 * Eligibility check reasons.
 */
export const EligibilityReason = {
  /** Delay is less than 60 minutes */
  INSUFFICIENT_DELAY: 'insufficient_delay',
  /** Must wait 24 hours after journey */
  CLAIM_WINDOW_NOT_OPEN: 'claim_window_not_open',
  /** Past 3-month deadline */
  DEADLINE_EXPIRED: 'deadline_expired',
  /** Compensation below €4/£4 minimum */
  BELOW_MINIMUM_PAYOUT: 'below_minimum_payout',
  /** All checks passed */
  ELIGIBLE: 'eligible',
} as const;

export type EligibilityReason =
  (typeof EligibilityReason)[keyof typeof EligibilityReason];

/**
 * Full eligibility status with all check results.
 */
export interface EligibilityStatus {
  /** Whether the claim is eligible */
  eligible: boolean;
  /** Primary reason for eligibility/ineligibility */
  reason: EligibilityReason;
  /** All failed checks */
  failedChecks: EligibilityReason[];
  /** Compensation calculation (if eligible or for reference) */
  compensation: CompensationResult | null;
  /** Claim deadline (3 months from journey) */
  deadline: Date | null;
  /** Days remaining until deadline */
  daysUntilDeadline: number | null;
  /** Whether claim window is open (24h passed) */
  claimWindowOpen: boolean;
}

/**
 * Minimum payout thresholds by currency.
 * Claims below these amounts are not processed.
 */
export const MINIMUM_PAYOUT: Record<Currency, number> = {
  EUR: 4,
  GBP: 4,
};

/**
 * Default EUR to GBP exchange rate.
 * In production, this should be fetched from an exchange rate API.
 */
export const DEFAULT_EUR_TO_GBP_RATE = 0.85;

/**
 * Claim window duration in hours.
 * Must wait this long after journey before claiming.
 */
export const CLAIM_WINDOW_HOURS = 24;

/**
 * Claim deadline in months.
 * Must claim within this period from journey date.
 */
export const CLAIM_DEADLINE_MONTHS = 3;

/**
 * Minimum delay in minutes to be eligible for compensation.
 */
export const MINIMUM_DELAY_MINUTES = 60;
