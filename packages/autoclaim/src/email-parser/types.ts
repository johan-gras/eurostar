/**
 * Types for the booking email parser.
 */

/**
 * Parsed booking information extracted from a Eurostar confirmation email.
 */
export interface ParsedBooking {
  /** Booking Reference (PNR) - 6 alphanumeric characters */
  pnr: string;
  /** Ticket Control Number - IV + 9 digits OR 15 + 9 digits */
  tcn: string;
  /** 4-digit train number */
  trainNumber: string;
  /** Journey date (UTC) */
  journeyDate: Date;
  /** Passenger name as shown on booking */
  passengerName: string;
  /** Origin station name or code */
  origin: string;
  /** Destination station name or code */
  destination: string;
  /** Coach number (optional) */
  coach?: string | undefined;
  /** Seat number (optional) */
  seat?: string | undefined;
}

/**
 * Error codes for parsing failures.
 */
export const ParseErrorCode = {
  /** No booking reference (PNR) found */
  MISSING_PNR: 'MISSING_PNR',
  /** Invalid PNR format */
  INVALID_PNR: 'INVALID_PNR',
  /** No ticket control number (TCN) found */
  MISSING_TCN: 'MISSING_TCN',
  /** Invalid TCN format */
  INVALID_TCN: 'INVALID_TCN',
  /** No train number found */
  MISSING_TRAIN_NUMBER: 'MISSING_TRAIN_NUMBER',
  /** Invalid train number format */
  INVALID_TRAIN_NUMBER: 'INVALID_TRAIN_NUMBER',
  /** No journey date found */
  MISSING_DATE: 'MISSING_DATE',
  /** Unable to parse journey date */
  INVALID_DATE: 'INVALID_DATE',
  /** No passenger name found */
  MISSING_PASSENGER: 'MISSING_PASSENGER',
  /** No origin station found */
  MISSING_ORIGIN: 'MISSING_ORIGIN',
  /** No destination station found */
  MISSING_DESTINATION: 'MISSING_DESTINATION',
  /** Email body is empty or invalid */
  EMPTY_INPUT: 'EMPTY_INPUT',
  /** General validation failure */
  VALIDATION_FAILED: 'VALIDATION_FAILED',
} as const;

export type ParseErrorCode = (typeof ParseErrorCode)[keyof typeof ParseErrorCode];

/**
 * Parse error with code and message.
 */
export interface ParseError {
  code: ParseErrorCode;
  message: string;
  /** Field that caused the error, if applicable */
  field?: string | undefined;
  /** Raw value that failed parsing, if available */
  rawValue?: string | undefined;
}

/**
 * Creates a ParseError with the given code and message.
 */
export function createParseError(
  code: ParseErrorCode,
  message: string,
  field?: string,
  rawValue?: string
): ParseError {
  const error: ParseError = { code, message };
  if (field !== undefined) error.field = field;
  if (rawValue !== undefined) error.rawValue = rawValue;
  return error;
}
