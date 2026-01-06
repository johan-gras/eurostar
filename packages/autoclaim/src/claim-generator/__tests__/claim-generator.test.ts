import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  parsePassengerName,
  formatJourneyDate,
  getStationDisplayName,
  buildClaimFormData,
  generateClaimPortalUrl,
  formatForClipboard,
  formatAsJson,
  validateFormData,
} from '../form-data.js';
import {
  ClaimEventEmitter,
  createClaimEventEmitter,
} from '../events.js';
import {
  EUROSTAR_CLAIM_PORTAL_URL,
  ClaimGeneratorErrorCode,
  createClaimGeneratorError,
} from '../types.js';
import {
  createMockBooking,
  createMockClaim,
  createMockEligibilityStatus,
  createIneligibleStatus,
  TEST_USER_EMAIL,
  PASSENGER_NAMES,
  EXPECTED_PARSED_NAMES,
  STATION_TEST_DATA,
  JOURNEY_DATES,
  EXPECTED_FORMATTED_DATES,
} from './fixtures.js';
import { EligibilityReason } from '../../eligibility/types.js';

describe('Form Data Utilities', () => {
  describe('parsePassengerName', () => {
    // Test 1: Standard two-part name
    it('parses standard "First Last" format', () => {
      const result = parsePassengerName(PASSENGER_NAMES.STANDARD);
      expect(result).toEqual(EXPECTED_PARSED_NAMES.STANDARD);
    });

    // Test 2: Uppercase name
    it('handles uppercase names and normalizes to title case', () => {
      const result = parsePassengerName(PASSENGER_NAMES.UPPERCASE);
      expect(result).toEqual(EXPECTED_PARSED_NAMES.UPPERCASE);
    });

    // Test 3: Single name
    it('handles single name with empty last name', () => {
      const result = parsePassengerName(PASSENGER_NAMES.SINGLE_NAME);
      expect(result).toEqual(EXPECTED_PARSED_NAMES.SINGLE_NAME);
    });

    // Test 4: Three-part name
    it('includes middle names in last name', () => {
      const result = parsePassengerName(PASSENGER_NAMES.THREE_PARTS);
      expect(result).toEqual(EXPECTED_PARSED_NAMES.THREE_PARTS);
    });

    // Test 5: Empty name
    it('handles empty string', () => {
      const result = parsePassengerName(PASSENGER_NAMES.EMPTY);
      expect(result).toEqual(EXPECTED_PARSED_NAMES.EMPTY);
    });

    // Test 6: Whitespace handling
    it('trims and normalizes whitespace', () => {
      const result = parsePassengerName(PASSENGER_NAMES.WHITESPACE);
      expect(result).toEqual(EXPECTED_PARSED_NAMES.WHITESPACE);
    });
  });

  describe('formatJourneyDate', () => {
    // Test 7: Standard date formatting
    it('formats date as DD/MM/YYYY', () => {
      const result = formatJourneyDate(JOURNEY_DATES.JAN_5_2026);
      expect(result).toBe(EXPECTED_FORMATTED_DATES.JAN_5_2026);
    });

    // Test 8: Year boundary
    it('formats year boundary correctly', () => {
      const result = formatJourneyDate(JOURNEY_DATES.DEC_31_2025);
      expect(result).toBe(EXPECTED_FORMATTED_DATES.DEC_31_2025);
    });

    // Test 9: Leap year date
    it('handles leap year dates', () => {
      const result = formatJourneyDate(JOURNEY_DATES.FEB_29_2024);
      expect(result).toBe(EXPECTED_FORMATTED_DATES.FEB_29_2024);
    });
  });

  describe('getStationDisplayName', () => {
    // Test 10: Known station
    it('returns display name for known stations', () => {
      expect(getStationDisplayName('GBSPX')).toBe(STATION_TEST_DATA.GBSPX);
      expect(getStationDisplayName('FRPLY')).toBe(STATION_TEST_DATA.FRPLY);
    });

    // Test 11: Unknown station
    it('returns code for unknown stations', () => {
      expect(getStationDisplayName('UNKNOWN')).toBe(STATION_TEST_DATA.UNKNOWN);
    });
  });

  describe('buildClaimFormData', () => {
    // Test 12: Complete form data generation
    it('builds complete form data from booking and claim', () => {
      const booking = createMockBooking();
      const claim = createMockClaim();

      const formData = buildClaimFormData(booking, claim, TEST_USER_EMAIL);

      expect(formData.pnr).toBe('ABC123');
      expect(formData.tcn).toBe('IV123456789');
      expect(formData.firstName).toBe('John');
      expect(formData.lastName).toBe('Doe');
      expect(formData.email).toBe(TEST_USER_EMAIL);
      expect(formData.trainNumber).toBe('9007');
      expect(formData.journeyDate).toBe('05/01/2026');
      expect(formData.origin).toBe('Paris Gare du Nord');
      expect(formData.destination).toBe('London St Pancras');
      expect(formData.delayMinutes).toBe(90);
      expect(formData.eligibleCashAmount).toBe(25);
      expect(formData.eligibleVoucherAmount).toBe(60);
    });

    // Test 13: Handles null compensation amounts
    it('handles null compensation amounts', () => {
      const booking = createMockBooking();
      const claim = createMockClaim({
        eligibleCashAmount: null,
        eligibleVoucherAmount: null,
      });

      const formData = buildClaimFormData(booking, claim, TEST_USER_EMAIL);

      expect(formData.eligibleCashAmount).toBe(0);
      expect(formData.eligibleVoucherAmount).toBe(0);
    });
  });

  describe('generateClaimPortalUrl', () => {
    // Test 14: Returns correct portal URL
    it('returns Eurostar claim portal URL', () => {
      const url = generateClaimPortalUrl();
      expect(url).toBe(EUROSTAR_CLAIM_PORTAL_URL);
    });
  });

  describe('formatForClipboard', () => {
    // Test 15: Contains all required fields
    it('formats form data for clipboard with all fields', () => {
      const booking = createMockBooking();
      const claim = createMockClaim();
      const formData = buildClaimFormData(booking, claim, TEST_USER_EMAIL);

      const clipboard = formatForClipboard(formData);

      expect(clipboard).toContain('ABC123');
      expect(clipboard).toContain('IV123456789');
      expect(clipboard).toContain('John');
      expect(clipboard).toContain('Doe');
      expect(clipboard).toContain(TEST_USER_EMAIL);
      expect(clipboard).toContain('9007');
      expect(clipboard).toContain('90 minutes');
      expect(clipboard).toContain('€25.00');
      expect(clipboard).toContain('€60.00');
      expect(clipboard).toContain(EUROSTAR_CLAIM_PORTAL_URL);
    });

    // Test 16: Proper formatting structure
    it('has proper section headers', () => {
      const booking = createMockBooking();
      const claim = createMockClaim();
      const formData = buildClaimFormData(booking, claim, TEST_USER_EMAIL);

      const clipboard = formatForClipboard(formData);

      expect(clipboard).toContain('Eurostar Delay Compensation Claim');
      expect(clipboard).toContain('Passenger Details');
      expect(clipboard).toContain('Journey Details');
      expect(clipboard).toContain('Delay Information');
      expect(clipboard).toContain('Compensation Eligible');
    });
  });

  describe('formatAsJson', () => {
    // Test 17: Valid JSON output
    it('returns valid JSON string', () => {
      const booking = createMockBooking();
      const claim = createMockClaim();
      const formData = buildClaimFormData(booking, claim, TEST_USER_EMAIL);

      const json = formatAsJson(formData);
      const parsed = JSON.parse(json);

      expect(parsed.pnr).toBe('ABC123');
      expect(parsed.delayMinutes).toBe(90);
    });
  });

  describe('validateFormData', () => {
    // Test 18: Valid form data
    it('returns valid for complete form data', () => {
      const booking = createMockBooking();
      const claim = createMockClaim();
      const formData = buildClaimFormData(booking, claim, TEST_USER_EMAIL);

      const result = validateFormData(formData);

      expect(result.valid).toBe(true);
      expect(result.missingFields).toHaveLength(0);
    });

    // Test 19: Missing required fields
    it('identifies missing required fields', () => {
      const formData = {
        pnr: '',
        tcn: 'IV123456789',
        firstName: '',
        lastName: 'Doe',
        email: '',
        trainNumber: '9007',
        journeyDate: '05/01/2026',
        origin: 'Paris',
        destination: 'London',
        delayMinutes: 90,
        eligibleCashAmount: 25,
        eligibleVoucherAmount: 60,
      };

      const result = validateFormData(formData);

      expect(result.valid).toBe(false);
      expect(result.missingFields).toContain('pnr');
      expect(result.missingFields).toContain('firstName');
      expect(result.missingFields).toContain('email');
    });

    // Test 20: Invalid delay minutes
    it('flags zero or negative delay', () => {
      const booking = createMockBooking();
      const claim = createMockClaim({ delayMinutes: 0 });
      const formData = buildClaimFormData(booking, claim, TEST_USER_EMAIL);

      const result = validateFormData(formData);

      expect(result.valid).toBe(false);
      expect(result.missingFields).toContain('delayMinutes');
    });
  });
});

describe('Events', () => {
  let emitter: ClaimEventEmitter;

  beforeEach(() => {
    emitter = createClaimEventEmitter();
  });

  describe('ClaimEventEmitter', () => {
    // Test 21: Emit claim created event
    it('emits claim-created event', () => {
      const handler = vi.fn();
      emitter.onClaimCreated(handler);

      const claim = createMockClaim();
      const booking = createMockBooking();
      const formData = buildClaimFormData(booking, claim, TEST_USER_EMAIL);

      emitter.emitClaimCreated({
        claim,
        userId: 'user-001',
        bookingId: 'booking-001',
        formData,
      });

      expect(handler).toHaveBeenCalledTimes(1);
      expect(handler.mock.calls[0]![0]).toMatchObject({
        type: 'claim-created',
        userId: 'user-001',
        bookingId: 'booking-001',
      });
    });

    // Test 22: Emit claim submitted event
    it('emits claim-submitted event', () => {
      const handler = vi.fn();
      emitter.onClaimSubmitted(handler);

      emitter.emitClaimSubmitted({
        claimId: 'claim-001',
        userId: 'user-001',
        bookingId: 'booking-001',
        submittedAt: new Date(),
      });

      expect(handler).toHaveBeenCalledTimes(1);
      expect(handler.mock.calls[0]![0].type).toBe('claim-submitted');
    });

    // Test 23: Emit status changed event
    it('emits claim-status-changed event', () => {
      const handler = vi.fn();
      emitter.onStatusChanged(handler);

      emitter.emitStatusChanged({
        claimId: 'claim-001',
        previousStatus: 'eligible',
        newStatus: 'submitted',
        userId: 'user-001',
      });

      expect(handler).toHaveBeenCalledTimes(1);
      expect(handler.mock.calls[0]![0]).toMatchObject({
        type: 'claim-status-changed',
        previousStatus: 'eligible',
        newStatus: 'submitted',
      });
    });

    // Test 24: Emit deadline approaching event
    it('emits claim-deadline-approaching event', () => {
      const handler = vi.fn();
      emitter.onDeadlineApproaching(handler);

      emitter.emitDeadlineApproaching({
        claimId: 'claim-001',
        userId: 'user-001',
        daysRemaining: 7,
        deadline: new Date(),
      });

      expect(handler).toHaveBeenCalledTimes(1);
      expect(handler.mock.calls[0]![0].daysRemaining).toBe(7);
    });

    // Test 25: Remove handler
    it('removes handlers correctly', () => {
      const handler = vi.fn();
      emitter.onClaimCreated(handler);
      emitter.offClaimCreated(handler);

      emitter.emitClaimCreated({
        claim: createMockClaim(),
        userId: 'user-001',
        bookingId: 'booking-001',
        formData: buildClaimFormData(
          createMockBooking(),
          createMockClaim(),
          TEST_USER_EMAIL
        ),
      });

      expect(handler).not.toHaveBeenCalled();
    });

    // Test 26: Multiple handlers
    it('supports multiple handlers', () => {
      const handler1 = vi.fn();
      const handler2 = vi.fn();

      emitter.onClaimCreated(handler1);
      emitter.onClaimCreated(handler2);

      emitter.emitClaimCreated({
        claim: createMockClaim(),
        userId: 'user-001',
        bookingId: 'booking-001',
        formData: buildClaimFormData(
          createMockBooking(),
          createMockClaim(),
          TEST_USER_EMAIL
        ),
      });

      expect(handler1).toHaveBeenCalledTimes(1);
      expect(handler2).toHaveBeenCalledTimes(1);
    });

    // Test 27: Event timestamp
    it('includes timestamp in events', () => {
      const handler = vi.fn();
      const beforeEmit = new Date();

      emitter.onClaimCreated(handler);

      emitter.emitClaimCreated({
        claim: createMockClaim(),
        userId: 'user-001',
        bookingId: 'booking-001',
        formData: buildClaimFormData(
          createMockBooking(),
          createMockClaim(),
          TEST_USER_EMAIL
        ),
      });

      const event = handler.mock.calls[0]![0];
      expect(event.timestamp).toBeInstanceOf(Date);
      expect(event.timestamp.getTime()).toBeGreaterThanOrEqual(beforeEmit.getTime());
    });
  });
});

describe('Error Types', () => {
  // Test 28: Create error without details
  it('creates error without details', () => {
    const error = createClaimGeneratorError(
      ClaimGeneratorErrorCode.CLAIM_NOT_FOUND,
      'Claim not found'
    );

    expect(error.code).toBe(ClaimGeneratorErrorCode.CLAIM_NOT_FOUND);
    expect(error.message).toBe('Claim not found');
    expect(error.details).toBeUndefined();
  });

  // Test 29: Create error with details
  it('creates error with details', () => {
    const error = createClaimGeneratorError(
      ClaimGeneratorErrorCode.CLAIM_ALREADY_EXISTS,
      'Claim already exists',
      { claimId: 'claim-001' }
    );

    expect(error.code).toBe(ClaimGeneratorErrorCode.CLAIM_ALREADY_EXISTS);
    expect(error.details).toEqual({ claimId: 'claim-001' });
  });
});

describe('Eligibility Status Fixtures', () => {
  // Test 30: Mock eligible status
  it('creates eligible status with compensation', () => {
    const status = createMockEligibilityStatus();

    expect(status.eligible).toBe(true);
    expect(status.reason).toBe(EligibilityReason.ELIGIBLE);
    expect(status.compensation).not.toBeNull();
    expect(status.compensation?.cashAmount).toBe(25);
  });

  // Test 31: Mock ineligible status
  it('creates ineligible status', () => {
    const status = createIneligibleStatus(EligibilityReason.INSUFFICIENT_DELAY);

    expect(status.eligible).toBe(false);
    expect(status.reason).toBe(EligibilityReason.INSUFFICIENT_DELAY);
    expect(status.compensation).toBeNull();
  });

  // Test 32: Override eligible status
  it('allows overriding eligible status fields', () => {
    const status = createMockEligibilityStatus({
      daysUntilDeadline: 30,
    });

    expect(status.daysUntilDeadline).toBe(30);
  });
});

describe('Integration Scenarios', () => {
  // Test 33: Full form data workflow
  it('generates complete claim workflow data', () => {
    const booking = createMockBooking({
      passengerName: 'MARIE DUPONT',
      origin: 'BEBMI',
      destination: 'GBSPX',
    });
    const claim = createMockClaim({
      delayMinutes: 150,
      eligibleCashAmount: '50.00',
      eligibleVoucherAmount: '60.00',
    });

    const formData = buildClaimFormData(booking, claim, 'marie@example.com');
    const clipboard = formatForClipboard(formData);
    const url = generateClaimPortalUrl();
    const validation = validateFormData(formData);

    expect(formData.firstName).toBe('Marie');
    expect(formData.lastName).toBe('Dupont');
    expect(formData.origin).toBe('Brussels Midi');
    expect(formData.destination).toBe('London St Pancras');
    expect(formData.delayMinutes).toBe(150);
    expect(validation.valid).toBe(true);
    expect(clipboard).toContain('Marie');
    expect(clipboard).toContain('€50.00');
    expect(url).toBe(EUROSTAR_CLAIM_PORTAL_URL);
  });

  // Test 34: Different delay tiers reflected in form data
  it('correctly reflects different compensation amounts', () => {
    const booking = createMockBooking();

    // Standard tier (60-119 min)
    const standardClaim = createMockClaim({
      delayMinutes: 90,
      eligibleCashAmount: '25.00',
      eligibleVoucherAmount: '60.00',
    });
    const standardForm = buildClaimFormData(booking, standardClaim, TEST_USER_EMAIL);
    expect(standardForm.eligibleCashAmount).toBe(25);
    expect(standardForm.eligibleVoucherAmount).toBe(60);

    // Extended tier (120-179 min)
    const extendedClaim = createMockClaim({
      delayMinutes: 150,
      eligibleCashAmount: '50.00',
      eligibleVoucherAmount: '60.00',
    });
    const extendedForm = buildClaimFormData(booking, extendedClaim, TEST_USER_EMAIL);
    expect(extendedForm.eligibleCashAmount).toBe(50);
    expect(extendedForm.delayMinutes).toBe(150);

    // Severe tier (180+ min)
    const severeClaim = createMockClaim({
      delayMinutes: 200,
      eligibleCashAmount: '50.00',
      eligibleVoucherAmount: '75.00',
    });
    const severeForm = buildClaimFormData(booking, severeClaim, TEST_USER_EMAIL);
    expect(severeForm.eligibleVoucherAmount).toBe(75);
  });

  // Test 35: Edge case station codes
  it('handles edge case station combinations', () => {
    const booking = createMockBooking({
      origin: 'NLAMA', // Amsterdam
      destination: 'DECGN', // Cologne
    });
    const claim = createMockClaim();
    const formData = buildClaimFormData(booking, claim, TEST_USER_EMAIL);

    expect(formData.origin).toBe('Amsterdam Centraal');
    expect(formData.destination).toBe('Cologne Hbf');
  });
});
