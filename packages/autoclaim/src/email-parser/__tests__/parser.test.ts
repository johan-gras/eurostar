/**
 * Tests for the booking email parser.
 *
 * TODO: These tests use mock emails. Once real Eurostar confirmation emails
 * are available, add test cases with actual email content to validate the parser.
 */

import { describe, it, expect } from 'vitest';
import { parseBookingEmail, stripHtml, cleanForwardedEmail, preprocessEmail } from '../parser.js';
import { ParseErrorCode } from '../types.js';
import {
  VALID_PLAIN_TEXT_EMAIL,
  VALID_HTML_EMAIL,
  FORWARDED_EMAIL,
  ISO_DATE_EMAIL,
  SLASH_DATE_EMAIL,
  ORDINAL_DATE_EMAIL,
  MISSING_PNR_EMAIL,
  MISSING_TCN_EMAIL,
  MISSING_TRAIN_EMAIL,
  MISSING_DATE_EMAIL,
  MISSING_PASSENGER_EMAIL,
  NO_SEAT_INFO_EMAIL,
  MINIMAL_EMAIL,
  US_DATE_EMAIL,
  COMPLEX_HTML_EMAIL,
  EMPTY_EMAIL,
  WHITESPACE_EMAIL,
} from './fixtures.js';

describe('parseBookingEmail', () => {
  describe('valid emails', () => {
    it('should parse a valid plain text email', () => {
      const result = parseBookingEmail(VALID_PLAIN_TEXT_EMAIL);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.pnr).toBe('ABC123');
        expect(result.value.tcn).toBe('IV123456789');
        expect(result.value.trainNumber).toBe('9007');
        expect(result.value.journeyDate.toISOString()).toBe('2026-01-05T00:00:00.000Z');
        expect(result.value.passengerName).toBe('Mr John Smith');
        expect(result.value.origin).toBe('London St Pancras');
        expect(result.value.destination).toBe('Paris Gare du Nord');
        expect(result.value.coach).toBe('3');
        expect(result.value.seat).toBe('61');
      }
    });

    it('should parse a valid HTML email', () => {
      const result = parseBookingEmail(VALID_HTML_EMAIL);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.pnr).toBe('XYZ789');
        expect(result.value.tcn).toBe('15987654321');
        expect(result.value.trainNumber).toBe('9015');
        expect(result.value.journeyDate.toISOString()).toBe('2026-03-15T00:00:00.000Z');
        expect(result.value.passengerName).toBe('Mrs Jane Doe');
        expect(result.value.origin).toBe('Brussels Midi/Zuid');
        expect(result.value.destination).toBe('London St Pancras');
        expect(result.value.coach).toBe('7');
        expect(result.value.seat).toBe('42');
      }
    });

    it('should parse a forwarded email with quote markers', () => {
      const result = parseBookingEmail(FORWARDED_EMAIL);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.pnr).toBe('DEF456');
        expect(result.value.tcn).toBe('IV999888777');
        expect(result.value.trainNumber).toBe('9023');
        expect(result.value.passengerName).toBe('Dr Emma Watson');
        expect(result.value.origin).toBe('Amsterdam Centraal');
        expect(result.value.destination).toBe('London St Pancras');
      }
    });

    it('should parse email with ISO date format (YYYY-MM-DD)', () => {
      const result = parseBookingEmail(ISO_DATE_EMAIL);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.pnr).toBe('GHI321');
        expect(result.value.journeyDate.toISOString()).toBe('2026-04-10T00:00:00.000Z');
      }
    });

    it('should parse email with slash date format (DD/MM/YYYY)', () => {
      const result = parseBookingEmail(SLASH_DATE_EMAIL);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.pnr).toBe('JKL654');
        expect(result.value.journeyDate.toISOString()).toBe('2025-12-25T00:00:00.000Z');
      }
    });

    it('should parse email with ordinal date format (5th January 2026)', () => {
      const result = parseBookingEmail(ORDINAL_DATE_EMAIL);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.pnr).toBe('MNO987');
        expect(result.value.journeyDate.toISOString()).toBe('2026-01-05T00:00:00.000Z');
      }
    });

    it('should parse email without seat info (optional fields)', () => {
      const result = parseBookingEmail(NO_SEAT_INFO_EMAIL);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.pnr).toBe('QRS246');
        expect(result.value.coach).toBeUndefined();
        expect(result.value.seat).toBeUndefined();
      }
    });

    it('should parse minimal email with all data on one line', () => {
      const result = parseBookingEmail(MINIMAL_EMAIL);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.pnr).toBe('TUV135');
        expect(result.value.tcn).toBe('IV222333444');
        expect(result.value.trainNumber).toBe('9070');
      }
    });

    it('should parse email with US date format (Month Day, Year)', () => {
      const result = parseBookingEmail(US_DATE_EMAIL);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.pnr).toBe('WXY864');
        expect(result.value.journeyDate.toISOString()).toBe('2026-09-15T00:00:00.000Z');
      }
    });

    it('should parse complex HTML email with nested elements', () => {
      const result = parseBookingEmail(COMPLEX_HTML_EMAIL);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.pnr).toBe('ZZZ999');
        expect(result.value.tcn).toBe('IV888999000');
        expect(result.value.trainNumber).toBe('9099');
        expect(result.value.passengerName).toBe('Dr Grace Hopper');
        expect(result.value.coach).toBe('16');
        expect(result.value.seat).toBe('99');
      }
    });
  });

  describe('invalid emails - missing required fields', () => {
    it('should return error for missing PNR', () => {
      const result = parseBookingEmail(MISSING_PNR_EMAIL);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.code).toBe(ParseErrorCode.MISSING_PNR);
        expect(result.error.field).toBe('pnr');
      }
    });

    it('should return error for missing TCN', () => {
      const result = parseBookingEmail(MISSING_TCN_EMAIL);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.code).toBe(ParseErrorCode.MISSING_TCN);
        expect(result.error.field).toBe('tcn');
      }
    });

    it('should return error for missing train number', () => {
      const result = parseBookingEmail(MISSING_TRAIN_EMAIL);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.code).toBe(ParseErrorCode.MISSING_TRAIN_NUMBER);
        expect(result.error.field).toBe('trainNumber');
      }
    });

    it('should return error for missing date', () => {
      const result = parseBookingEmail(MISSING_DATE_EMAIL);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.code).toBe(ParseErrorCode.MISSING_DATE);
        expect(result.error.field).toBe('journeyDate');
      }
    });

    it('should return error for missing passenger name', () => {
      const result = parseBookingEmail(MISSING_PASSENGER_EMAIL);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.code).toBe(ParseErrorCode.MISSING_PASSENGER);
        expect(result.error.field).toBe('passengerName');
      }
    });
  });

  describe('edge cases', () => {
    it('should return error for empty email', () => {
      const result = parseBookingEmail(EMPTY_EMAIL);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.code).toBe(ParseErrorCode.EMPTY_INPUT);
      }
    });

    it('should return error for whitespace-only email', () => {
      const result = parseBookingEmail(WHITESPACE_EMAIL);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.code).toBe(ParseErrorCode.EMPTY_INPUT);
      }
    });

    it('should handle null/undefined input', () => {
      // @ts-expect-error - testing runtime behavior
      const result1 = parseBookingEmail(null);
      expect(result1.isErr()).toBe(true);

      // @ts-expect-error - testing runtime behavior
      const result2 = parseBookingEmail(undefined);
      expect(result2.isErr()).toBe(true);
    });
  });
});

describe('stripHtml', () => {
  it('should remove HTML tags', () => {
    const html = '<p>Hello <strong>World</strong></p>';
    const result = stripHtml(html);
    expect(result).toBe('Hello World');
  });

  it('should convert <br> to newlines', () => {
    const html = 'Line 1<br>Line 2<br/>Line 3';
    const result = stripHtml(html);
    expect(result).toContain('\n');
  });

  it('should remove script tags and content', () => {
    const html = '<p>Text</p><script>alert("hack")</script><p>More</p>';
    const result = stripHtml(html);
    expect(result).not.toContain('alert');
    expect(result).not.toContain('script');
  });

  it('should decode HTML entities', () => {
    const html = '&lt;tag&gt; &amp; &quot;quoted&quot;';
    const result = stripHtml(html);
    expect(result).toBe('<tag> & "quoted"');
  });
});

describe('cleanForwardedEmail', () => {
  it('should remove > quote markers', () => {
    const text = '> Line 1\n>> Line 2\n> Line 3';
    const result = cleanForwardedEmail(text);
    expect(result).not.toContain('>');
    expect(result).toContain('Line 1');
    expect(result).toContain('Line 2');
  });

  it('should remove separator lines', () => {
    const text = 'Before\n---------- Forwarded ---------\nAfter';
    const result = cleanForwardedEmail(text);
    expect(result).not.toContain('------');
  });

  it('should remove forwarded email headers', () => {
    const text = 'From: sender@example.com\nTo: receiver@example.com\nSubject: Test\n\nActual content';
    const result = cleanForwardedEmail(text);
    expect(result).not.toContain('From:');
    expect(result).not.toContain('To:');
    expect(result).toContain('Actual content');
  });
});

describe('preprocessEmail', () => {
  it('should handle HTML emails', () => {
    const html = '<html><body><p>Booking Reference: TEST12</p></body></html>';
    const result = preprocessEmail(html);
    expect(result).toContain('Booking Reference: TEST12');
    expect(result).not.toContain('<');
  });

  it('should handle plain text emails', () => {
    const text = 'Booking Reference: TEST12';
    const result = preprocessEmail(text);
    expect(result).toBe('Booking Reference: TEST12');
  });

  it('should handle forwarded HTML emails', () => {
    const html = '<html><body>> <p>Booking Reference: TEST12</p></body></html>';
    const result = preprocessEmail(html);
    expect(result).toContain('Booking Reference: TEST12');
  });
});
