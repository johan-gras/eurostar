/**
 * Booking email parser for Eurostar confirmation emails.
 *
 * TODO: These parsing patterns are based on typical confirmation email formats.
 * They need validation against real Eurostar booking confirmation emails.
 */

import { Result, ok, err } from '@eurostar/core/result';
import { ParsedBooking, ParseError, ParseErrorCode, createParseError } from './types.js';
import {
  PNR_PATTERN,
  TCN_PATTERN,
  TRAIN_NUMBER_PATTERN,
  TRAIN_NUMBER_ALT_PATTERN,
  DATE_PATTERNS,
  MONTH_MAP,
  COACH_PATTERN,
  SEAT_PATTERN,
  PASSENGER_PATTERN,
  PASSENGER_ALT_PATTERN,
  DEPARTS_PATTERN,
  ARRIVES_PATTERN,
  normalizeStation,
} from './patterns.js';
import { safeValidateBooking } from './validator.js';

/**
 * Strips HTML tags from email content.
 */
function stripHtml(html: string): string {
  return (
    html
      // Remove script and style content
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
      // Replace <br> and </p> with newlines (use placeholder to preserve)
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<\/p>/gi, '\n')
      .replace(/<\/div>/gi, '\n')
      .replace(/<\/tr>/gi, '\n')
      // Remove remaining HTML tags
      .replace(/<[^>]+>/g, ' ')
      // Decode common HTML entities
      .replace(/&nbsp;/gi, ' ')
      .replace(/&amp;/gi, '&')
      .replace(/&lt;/gi, '<')
      .replace(/&gt;/gi, '>')
      .replace(/&quot;/gi, '"')
      .replace(/&#39;/gi, "'")
      // Clean up horizontal whitespace only (preserve newlines)
      .replace(/[ \t]+/g, ' ')
      .replace(/\n[ \t]+/g, '\n')
      .replace(/[ \t]+\n/g, '\n')
      // Collapse multiple newlines
      .replace(/\n{3,}/g, '\n\n')
      .trim()
  );
}

/**
 * Cleans forwarded email artifacts.
 * Removes ">" prefixes, "------" separators, and quoted headers.
 */
function cleanForwardedEmail(text: string): string {
  return (
    text
      // Remove forward/reply markers
      .replace(/^>+\s?/gm, '')
      // Remove separator lines
      .replace(/^-{3,}.*$/gm, '')
      .replace(/^_{3,}.*$/gm, '')
      // Remove "On ... wrote:" lines
      .replace(/^On .+ wrote:$/gm, '')
      // Remove "From:", "Sent:", "To:", "Subject:" header lines (common in forwarded emails)
      // Be careful not to remove "Date:" from booking content
      .replace(/^(From|Sent|To|Subject):\s*.+$/gm, '')
      // Only remove Date: header if it looks like an email header (has email-style date format)
      .replace(/^Date:\s*[A-Z][a-z]{2},\s+[A-Z][a-z]{2}\s+\d{1,2},\s+\d{4}\s+at\s+\d{1,2}:\d{2}\s*(AM|PM)?.*$/gim, '')
      // Clean up multiple blank lines
      .replace(/\n{3,}/g, '\n\n')
      .trim()
  );
}

/**
 * Preprocesses email body for parsing.
 * Handles both HTML and plain text, and cleans forwarded email artifacts.
 */
function preprocessEmail(emailBody: string): string {
  // Check if it's HTML
  const isHtml = /<[^>]+>/.test(emailBody);

  let text = isHtml ? stripHtml(emailBody) : emailBody;
  text = cleanForwardedEmail(text);

  return text;
}

/**
 * Extracts PNR (Booking Reference) from email text.
 */
function extractPnr(text: string): string | null {
  const match = text.match(PNR_PATTERN);
  return match?.[1]?.toUpperCase() ?? null;
}

/**
 * Extracts TCN (Ticket Control Number) from email text.
 */
function extractTcn(text: string): string | null {
  const match = text.match(TCN_PATTERN);
  return match?.[1]?.toUpperCase() ?? null;
}

/**
 * Extracts train number from email text.
 */
function extractTrainNumber(text: string): string | null {
  let match = text.match(TRAIN_NUMBER_PATTERN);
  if (match?.[1]) return match[1];

  match = text.match(TRAIN_NUMBER_ALT_PATTERN);
  return match?.[1] ?? null;
}

/**
 * Parses a date string in various formats.
 */
function parseDate(text: string): Date | null {
  // Try DMY long format: 05 January 2026
  let match = text.match(DATE_PATTERNS.DMY_LONG);
  if (match?.[1] && match[2] && match[3]) {
    const day = parseInt(match[1], 10);
    const month = MONTH_MAP[match[2].toLowerCase()];
    const year = parseInt(match[3], 10);
    if (month !== undefined) {
      return new Date(Date.UTC(year, month, day));
    }
  }

  // Try MDY long format: January 05, 2026
  match = text.match(DATE_PATTERNS.MDY_LONG);
  if (match?.[1] && match[2] && match[3]) {
    const month = MONTH_MAP[match[1].toLowerCase()];
    const day = parseInt(match[2], 10);
    const year = parseInt(match[3], 10);
    if (month !== undefined) {
      return new Date(Date.UTC(year, month, day));
    }
  }

  // Try ISO format: 2026-01-05
  match = text.match(DATE_PATTERNS.ISO);
  if (match?.[1] && match[2] && match[3]) {
    const year = parseInt(match[1], 10);
    const month = parseInt(match[2], 10) - 1;
    const day = parseInt(match[3], 10);
    return new Date(Date.UTC(year, month, day));
  }

  // Try DMY slash format: 05/01/2026
  match = text.match(DATE_PATTERNS.DMY_SLASH);
  if (match?.[1] && match[2] && match[3]) {
    const day = parseInt(match[1], 10);
    const month = parseInt(match[2], 10) - 1;
    const year = parseInt(match[3], 10);
    return new Date(Date.UTC(year, month, day));
  }

  // Try DMY dash format: 05-01-2026
  match = text.match(DATE_PATTERNS.DMY_DASH);
  if (match?.[1] && match[2] && match[3]) {
    const day = parseInt(match[1], 10);
    const month = parseInt(match[2], 10) - 1;
    const year = parseInt(match[3], 10);
    return new Date(Date.UTC(year, month, day));
  }

  return null;
}

/**
 * Extracts journey date from email text.
 */
function extractDate(text: string): Date | null {
  return parseDate(text);
}

/**
 * Extracts coach number from email text.
 */
function extractCoach(text: string): string | null {
  const match = text.match(COACH_PATTERN);
  return match?.[1] ?? null;
}

/**
 * Extracts seat number from email text.
 */
function extractSeat(text: string): string | null {
  const match = text.match(SEAT_PATTERN);
  return match?.[1] ?? null;
}

/**
 * Extracts passenger name from email text.
 */
function extractPassengerName(text: string): string | null {
  let match = text.match(PASSENGER_PATTERN);
  if (match?.[1]) return match[1].trim();

  match = text.match(PASSENGER_ALT_PATTERN);
  return match?.[1]?.trim() ?? null;
}

/**
 * Extracts origin station from email text.
 */
function extractOrigin(text: string): string | null {
  const match = text.match(DEPARTS_PATTERN);
  if (match?.[1]) {
    return normalizeStation(match[1]);
  }
  return null;
}

/**
 * Extracts destination station from email text.
 */
function extractDestination(text: string): string | null {
  const match = text.match(ARRIVES_PATTERN);
  if (match?.[1]) {
    return normalizeStation(match[1]);
  }
  return null;
}

/**
 * Parses a Eurostar booking confirmation email.
 *
 * @param emailBody - The raw email body (HTML or plain text)
 * @returns Result containing ParsedBooking or ParseError
 */
export function parseBookingEmail(emailBody: string): Result<ParsedBooking, ParseError> {
  // Validate input
  if (!emailBody || typeof emailBody !== 'string' || emailBody.trim().length === 0) {
    return err(createParseError(ParseErrorCode.EMPTY_INPUT, 'Email body is empty or invalid'));
  }

  // Preprocess the email
  const text = preprocessEmail(emailBody);

  // Extract required fields
  const pnr = extractPnr(text);
  if (!pnr) {
    return err(createParseError(ParseErrorCode.MISSING_PNR, 'Could not find booking reference (PNR)', 'pnr'));
  }

  const tcn = extractTcn(text);
  if (!tcn) {
    return err(createParseError(ParseErrorCode.MISSING_TCN, 'Could not find ticket control number (TCN)', 'tcn'));
  }

  const trainNumber = extractTrainNumber(text);
  if (!trainNumber) {
    return err(
      createParseError(ParseErrorCode.MISSING_TRAIN_NUMBER, 'Could not find train number', 'trainNumber')
    );
  }

  const journeyDate = extractDate(text);
  if (!journeyDate) {
    return err(createParseError(ParseErrorCode.MISSING_DATE, 'Could not find journey date', 'journeyDate'));
  }

  const passengerName = extractPassengerName(text);
  if (!passengerName) {
    return err(
      createParseError(ParseErrorCode.MISSING_PASSENGER, 'Could not find passenger name', 'passengerName')
    );
  }

  const origin = extractOrigin(text);
  if (!origin) {
    return err(createParseError(ParseErrorCode.MISSING_ORIGIN, 'Could not find origin station', 'origin'));
  }

  const destination = extractDestination(text);
  if (!destination) {
    return err(
      createParseError(ParseErrorCode.MISSING_DESTINATION, 'Could not find destination station', 'destination')
    );
  }

  // Extract optional fields
  const coach = extractCoach(text) ?? undefined;
  const seat = extractSeat(text) ?? undefined;

  // Build the booking object
  const booking: ParsedBooking = {
    pnr,
    tcn,
    trainNumber,
    journeyDate,
    passengerName,
    origin,
    destination,
    coach,
    seat,
  };

  // Validate with Zod schema
  const validation = safeValidateBooking(booking);
  if (!validation.success) {
    const firstIssue = validation.error.issues[0];
    return err(
      createParseError(
        ParseErrorCode.VALIDATION_FAILED,
        firstIssue?.message ?? 'Validation failed',
        firstIssue?.path.join('.'),
        undefined
      )
    );
  }

  return ok(booking);
}

// Re-export utilities for testing
export { preprocessEmail, stripHtml, cleanForwardedEmail };
