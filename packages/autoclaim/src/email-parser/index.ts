/**
 * Email parser module for extracting booking information from Eurostar emails.
 */

export { parseBookingEmail, preprocessEmail, stripHtml, cleanForwardedEmail } from './parser.js';
export { ParseErrorCode, createParseError } from './types.js';
export type { ParsedBooking, ParseError } from './types.js';
export {
  ParsedBookingSchema,
  PnrSchema,
  TcnSchema,
  TrainNumberSchema,
  JourneyDateSchema,
  validateBooking,
  safeValidateBooking,
} from './validator.js';
export type { SafeParseResult } from './validator.js';
export {
  PNR_PATTERN,
  TCN_PATTERN,
  TRAIN_NUMBER_PATTERN,
  DATE_PATTERNS,
  COACH_PATTERN,
  SEAT_PATTERN,
  STATION_MAP,
  STATION_ALIASES,
  normalizeStation,
} from './patterns.js';
