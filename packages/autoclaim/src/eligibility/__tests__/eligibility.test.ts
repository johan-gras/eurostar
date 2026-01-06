import { describe, it, expect } from 'vitest';
import {
  getTierForDelay,
  isDelayCompensable,
} from '../tiers.js';
import {
  calculateCompensation,
  calculateCompensationDetailed,
  convertEurToGbp,
  convertGbpToEur,
  meetsMinimumPayout,
  formatCompensationAmount,
} from '../calculator.js';
import {
  isClaimWindowOpen,
  hoursUntilClaimWindowOpens,
  isWithinClaimWindow,
  getClaimDeadline,
  daysUntilDeadline,
  formatTimeUntilDeadline,
} from '../deadline.js';
import { EligibilityService, checkEligibility } from '../service.js';
import { Currency, EligibilityReason } from '../types.js';
import {
  createMockBooking,
  AFTER_WINDOW_OPENS,
  BEFORE_WINDOW_OPENS,
  AFTER_DEADLINE,
  WITHIN_DEADLINE,
  DELAY_BOUNDARIES,
  TICKET_PRICES,
} from './fixtures.js';

describe('Tiers', () => {
  describe('getTierForDelay', () => {
    // Test 1: Below threshold
    it('returns null for delay below 60 minutes', () => {
      expect(getTierForDelay(59)).toBeNull();
      expect(getTierForDelay(0)).toBeNull();
      expect(getTierForDelay(45)).toBeNull();
    });

    // Test 2: Standard tier at boundary
    it('returns Standard tier at exactly 60 minutes', () => {
      const tier = getTierForDelay(60);
      expect(tier).not.toBeNull();
      expect(tier?.name).toBe('Standard');
      expect(tier?.cashPercentage).toBe(0.25);
      expect(tier?.voucherPercentage).toBe(0.6);
    });

    // Test 3: Standard tier within range
    it('returns Standard tier for 60-119 minutes', () => {
      expect(getTierForDelay(60)?.name).toBe('Standard');
      expect(getTierForDelay(90)?.name).toBe('Standard');
      expect(getTierForDelay(119)?.name).toBe('Standard');
    });

    // Test 4: Extended tier at boundary
    it('returns Extended tier at exactly 120 minutes', () => {
      const tier = getTierForDelay(120);
      expect(tier).not.toBeNull();
      expect(tier?.name).toBe('Extended');
      expect(tier?.cashPercentage).toBe(0.5);
      expect(tier?.voucherPercentage).toBe(0.6);
    });

    // Test 5: Extended tier within range
    it('returns Extended tier for 120-179 minutes', () => {
      expect(getTierForDelay(120)?.name).toBe('Extended');
      expect(getTierForDelay(150)?.name).toBe('Extended');
      expect(getTierForDelay(179)?.name).toBe('Extended');
    });

    // Test 6: Severe tier at boundary
    it('returns Severe tier at exactly 180 minutes', () => {
      const tier = getTierForDelay(180);
      expect(tier).not.toBeNull();
      expect(tier?.name).toBe('Severe');
      expect(tier?.cashPercentage).toBe(0.5);
      expect(tier?.voucherPercentage).toBe(0.75);
    });

    // Test 7: Severe tier for high delays
    it('returns Severe tier for delays >= 180 minutes', () => {
      expect(getTierForDelay(180)?.name).toBe('Severe');
      expect(getTierForDelay(240)?.name).toBe('Severe');
      expect(getTierForDelay(500)?.name).toBe('Severe');
    });
  });

  describe('isDelayCompensable', () => {
    // Test 8: Below threshold
    it('returns false for delays below 60 minutes', () => {
      expect(isDelayCompensable(59)).toBe(false);
    });

    // Test 9: At and above threshold
    it('returns true for delays >= 60 minutes', () => {
      expect(isDelayCompensable(60)).toBe(true);
      expect(isDelayCompensable(90)).toBe(true);
    });
  });
});

describe('Calculator', () => {
  describe('calculateCompensation', () => {
    // Test 10: Standard tier calculation
    it('calculates correct amounts for Standard tier (€100 ticket, 90 min)', () => {
      const result = calculateCompensation(90, 100);
      expect(result).not.toBeNull();
      expect(result?.cashAmount).toBe(25); // 25%
      expect(result?.voucherAmount).toBe(60); // 60%
    });

    // Test 11: Extended tier calculation
    it('calculates correct amounts for Extended tier (€100 ticket, 150 min)', () => {
      const result = calculateCompensation(150, 100);
      expect(result).not.toBeNull();
      expect(result?.cashAmount).toBe(50); // 50%
      expect(result?.voucherAmount).toBe(60); // 60%
    });

    // Test 12: Severe tier calculation
    it('calculates correct amounts for Severe tier (€100 ticket, 200 min)', () => {
      const result = calculateCompensation(200, 100);
      expect(result).not.toBeNull();
      expect(result?.cashAmount).toBe(50); // 50%
      expect(result?.voucherAmount).toBe(75); // 75%
    });

    // Test 13: Below threshold returns null
    it('returns null for delay below 60 minutes', () => {
      expect(calculateCompensation(59, 100)).toBeNull();
    });

    // Test 14: Below minimum payout returns null
    it('returns null when compensation below €4 minimum', () => {
      // €10 ticket, 60 min delay = €2.50 cash, €6 voucher
      // Cash < €4 but voucher >= €4, so should be eligible
      const result1 = calculateCompensation(60, 10);
      expect(result1).not.toBeNull(); // voucher is €6

      // €5 ticket, 60 min delay = €1.25 cash, €3 voucher (both below €4)
      const result2 = calculateCompensation(60, 5);
      expect(result2).toBeNull();
    });

    // Test 15: GBP currency
    it('handles GBP currency correctly', () => {
      const result = calculateCompensation(90, 100, Currency.GBP);
      expect(result?.currency).toBe(Currency.GBP);
      expect(result?.cashAmount).toBe(25);
    });

    // Test 16: Rounding
    it('rounds to 2 decimal places', () => {
      // €33 * 0.25 = €8.25
      const result = calculateCompensation(60, 33);
      expect(result?.cashAmount).toBe(8.25);
    });
  });

  describe('calculateCompensationDetailed', () => {
    // Test 17: Returns result even when not eligible
    it('returns ineligible result with zero amounts for low delay', () => {
      const result = calculateCompensationDetailed(30, 100);
      expect(result.eligible).toBe(false);
      expect(result.cashAmount).toBe(0);
      expect(result.tier).toBeNull();
    });
  });

  describe('currency conversion', () => {
    // Test 18: EUR to GBP
    it('converts EUR to GBP correctly', () => {
      expect(convertEurToGbp(100, 0.85)).toBe(85);
    });

    // Test 19: GBP to EUR
    it('converts GBP to EUR correctly', () => {
      expect(convertGbpToEur(85, 0.85)).toBe(100);
    });
  });

  describe('meetsMinimumPayout', () => {
    // Test 20: Below minimum
    it('returns false for amounts below minimum', () => {
      expect(meetsMinimumPayout(3.99, Currency.EUR)).toBe(false);
    });

    // Test 21: At minimum
    it('returns true for amounts at minimum', () => {
      expect(meetsMinimumPayout(4, Currency.EUR)).toBe(true);
    });
  });

  describe('formatCompensationAmount', () => {
    // Test 22: EUR formatting
    it('formats EUR amounts with € symbol', () => {
      expect(formatCompensationAmount(25.5, Currency.EUR)).toBe('€25.50');
    });

    // Test 23: GBP formatting
    it('formats GBP amounts with £ symbol', () => {
      expect(formatCompensationAmount(25.5, Currency.GBP)).toBe('£25.50');
    });
  });
});

describe('Deadline', () => {
  const journeyDate = new Date(Date.UTC(2026, 0, 5)); // Jan 5, 2026

  describe('isClaimWindowOpen', () => {
    // Test 24: Window not open yet
    it('returns false before 24 hours have passed', () => {
      const sixHoursLater = new Date(Date.UTC(2026, 0, 5, 6, 0));
      expect(isClaimWindowOpen(journeyDate, sixHoursLater)).toBe(false);
    });

    // Test 25: Window just opened
    it('returns true after 24 hours', () => {
      const twentyFiveHoursLater = new Date(Date.UTC(2026, 0, 6, 1, 0));
      expect(isClaimWindowOpen(journeyDate, twentyFiveHoursLater)).toBe(true);
    });
  });

  describe('hoursUntilClaimWindowOpens', () => {
    // Test 26: Hours remaining
    it('returns correct hours until window opens', () => {
      const sixHoursLater = new Date(Date.UTC(2026, 0, 5, 6, 0));
      expect(hoursUntilClaimWindowOpens(journeyDate, sixHoursLater)).toBe(18);
    });

    // Test 27: Zero when already open
    it('returns 0 when window is already open', () => {
      expect(hoursUntilClaimWindowOpens(journeyDate, AFTER_WINDOW_OPENS)).toBe(0);
    });
  });

  describe('isWithinClaimWindow', () => {
    // Test 28: Within deadline
    it('returns true within 3 months', () => {
      expect(isWithinClaimWindow(journeyDate, WITHIN_DEADLINE)).toBe(true);
    });

    // Test 29: Past deadline
    it('returns false after 3 months', () => {
      expect(isWithinClaimWindow(journeyDate, AFTER_DEADLINE)).toBe(false);
    });
  });

  describe('getClaimDeadline', () => {
    // Test 30: Correct deadline
    it('returns date 3 months after journey', () => {
      const deadline = getClaimDeadline(journeyDate);
      expect(deadline.getUTCMonth()).toBe(3); // April (0-indexed)
      expect(deadline.getUTCDate()).toBe(5);
    });
  });

  describe('daysUntilDeadline', () => {
    // Test 31: Positive days remaining
    it('returns positive days when within deadline', () => {
      const days = daysUntilDeadline(journeyDate, AFTER_WINDOW_OPENS);
      expect(days).toBeGreaterThan(0);
      expect(days).toBeLessThanOrEqual(90);
    });

    // Test 32: Negative days when past
    it('returns negative days when past deadline', () => {
      const days = daysUntilDeadline(journeyDate, AFTER_DEADLINE);
      expect(days).toBeLessThan(0);
    });
  });

  describe('formatTimeUntilDeadline', () => {
    // Test 33: Expired format
    it('formats expired deadlines correctly', () => {
      const formatted = formatTimeUntilDeadline(journeyDate, AFTER_DEADLINE);
      expect(formatted).toContain('Expired');
    });

    // Test 34: Days remaining format
    it('formats days remaining correctly', () => {
      // 3 days before deadline (April 5)
      const threeDaysBefore = new Date(Date.UTC(2026, 3, 2)); // April 2
      const formatted = formatTimeUntilDeadline(journeyDate, threeDaysBefore);
      expect(formatted).toContain('day');
    });
  });
});

describe('EligibilityService', () => {
  const service = new EligibilityService();

  describe('checkEligibility', () => {
    // Test 35: Fully eligible
    it('returns eligible for valid claim', () => {
      const booking = createMockBooking();
      const status = service.checkEligibility(
        booking,
        DELAY_BOUNDARIES.STANDARD_MID,
        TICKET_PRICES.MEDIUM,
        { currentTime: AFTER_WINDOW_OPENS }
      );

      expect(status.eligible).toBe(true);
      expect(status.reason).toBe(EligibilityReason.ELIGIBLE);
      expect(status.failedChecks).toHaveLength(0);
      expect(status.compensation?.cashAmount).toBe(25);
    });

    // Test 36: Insufficient delay
    it('rejects insufficient delay', () => {
      const booking = createMockBooking();
      const status = service.checkEligibility(
        booking,
        DELAY_BOUNDARIES.BELOW_THRESHOLD,
        TICKET_PRICES.MEDIUM,
        { currentTime: AFTER_WINDOW_OPENS }
      );

      expect(status.eligible).toBe(false);
      expect(status.reason).toBe(EligibilityReason.INSUFFICIENT_DELAY);
    });

    // Test 37: Window not open
    it('rejects when claim window not open', () => {
      const booking = createMockBooking();
      const status = service.checkEligibility(
        booking,
        DELAY_BOUNDARIES.STANDARD_MID,
        TICKET_PRICES.MEDIUM,
        { currentTime: BEFORE_WINDOW_OPENS }
      );

      expect(status.eligible).toBe(false);
      expect(status.failedChecks).toContain(EligibilityReason.CLAIM_WINDOW_NOT_OPEN);
    });

    // Test 38: Past deadline
    it('rejects when past deadline', () => {
      const booking = createMockBooking();
      const status = service.checkEligibility(
        booking,
        DELAY_BOUNDARIES.STANDARD_MID,
        TICKET_PRICES.MEDIUM,
        { currentTime: AFTER_DEADLINE }
      );

      expect(status.eligible).toBe(false);
      expect(status.failedChecks).toContain(EligibilityReason.DEADLINE_EXPIRED);
    });

    // Test 39: Below minimum payout
    it('rejects when below minimum payout', () => {
      const booking = createMockBooking();
      const status = service.checkEligibility(
        booking,
        DELAY_BOUNDARIES.AT_THRESHOLD,
        TICKET_PRICES.VERY_LOW, // €5 = €1.25 cash, €3 voucher
        { currentTime: AFTER_WINDOW_OPENS }
      );

      expect(status.eligible).toBe(false);
      expect(status.failedChecks).toContain(EligibilityReason.BELOW_MINIMUM_PAYOUT);
    });

    // Test 40: Multiple failed checks
    it('tracks multiple failed checks', () => {
      const booking = createMockBooking();
      const status = service.checkEligibility(
        booking,
        DELAY_BOUNDARIES.BELOW_THRESHOLD, // fail: delay
        TICKET_PRICES.MEDIUM,
        { currentTime: BEFORE_WINDOW_OPENS } // fail: window
      );

      expect(status.eligible).toBe(false);
      expect(status.failedChecks.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('isDelayEligible', () => {
    // Test 41: Quick delay check
    it('performs quick delay eligibility check', () => {
      expect(service.isDelayEligible(59)).toBe(false);
      expect(service.isDelayEligible(60)).toBe(true);
    });
  });

  describe('canClaimNow', () => {
    // Test 42: Can claim timing check
    it('checks if claim can be submitted now', () => {
      const booking = createMockBooking();
      expect(service.canClaimNow(booking, BEFORE_WINDOW_OPENS)).toBe(false);
      expect(service.canClaimNow(booking, AFTER_WINDOW_OPENS)).toBe(true);
      expect(service.canClaimNow(booking, AFTER_DEADLINE)).toBe(false);
    });
  });
});

describe('checkEligibility convenience function', () => {
  // Test 43: Works without service instance
  it('works as standalone function', () => {
    const booking = createMockBooking();
    const status = checkEligibility(booking, 90, 100, {
      currentTime: AFTER_WINDOW_OPENS,
    });

    expect(status.eligible).toBe(true);
  });
});

describe('Edge cases', () => {
  // Test 44: Exact boundary transitions
  it('handles tier boundary transitions correctly', () => {
    expect(getTierForDelay(119)?.name).toBe('Standard');
    expect(getTierForDelay(120)?.name).toBe('Extended');
    expect(getTierForDelay(179)?.name).toBe('Extended');
    expect(getTierForDelay(180)?.name).toBe('Severe');
  });

  // Test 45: Zero delay
  it('handles zero delay', () => {
    expect(calculateCompensation(0, 100)).toBeNull();
    expect(isDelayCompensable(0)).toBe(false);
  });

  // Test 46: Very high ticket price
  it('handles high ticket prices', () => {
    const result = calculateCompensation(180, 1000);
    expect(result?.cashAmount).toBe(500);
    expect(result?.voucherAmount).toBe(750);
  });

  // Test 47: Minimum payout boundary
  it('accepts compensation exactly at minimum threshold', () => {
    // €16 ticket at 60 min = €4 cash (exactly at minimum)
    const result = calculateCompensation(60, 16);
    expect(result).not.toBeNull();
    expect(result?.cashAmount).toBe(4);
  });
});
