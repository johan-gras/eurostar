/**
 * Regex patterns for extracting booking information from Eurostar emails.
 */

/**
 * Pattern to match PNR (Booking Reference).
 * Matches 6 alphanumeric characters after "reference", "booking reference",
 * or "collection reference".
 */
export const PNR_PATTERN = /(?:booking\s*reference|collection\s*reference|reference)[:\s]*([A-Z0-9]{6})\b/i;

/**
 * Pattern to match TCN (Ticket Control Number).
 * Matches either IV + 9 digits or 15 + 9 digits.
 */
export const TCN_PATTERN = /\b(IV\d{9}|15\d{9})\b/i;

/**
 * Pattern to match train number.
 * Matches 4 digits after "eurostar", "train", or "service".
 */
export const TRAIN_NUMBER_PATTERN = /(?:eurostar|train|service)[:\s#]*(\d{4})\b/i;

/**
 * Alternative pattern for train number (just 4 digits on same line as from/departs).
 * Uses [ \t]* instead of \s* to avoid matching across lines.
 */
export const TRAIN_NUMBER_ALT_PATTERN = /\b(\d{4})\b(?=[ \t]*(?:from|departs|departing))/i;

/**
 * Patterns for date extraction.
 * Supports multiple formats:
 * - 05 January 2026
 * - 05/01/2026
 * - 2026-01-05
 * - 5th January 2026
 * - January 05, 2026
 */
export const DATE_PATTERNS = {
  /** Day Month Year: 05 January 2026, 5th January 2026 */
  DMY_LONG: /\b(\d{1,2})(?:st|nd|rd|th)?\s+(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{4})\b/i,
  /** Month Day, Year: January 05, 2026 */
  MDY_LONG: /\b(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{1,2})(?:st|nd|rd|th)?,?\s+(\d{4})\b/i,
  /** DD/MM/YYYY */
  DMY_SLASH: /\b(\d{1,2})\/(\d{1,2})\/(\d{4})\b/,
  /** YYYY-MM-DD */
  ISO: /\b(\d{4})-(\d{2})-(\d{2})\b/,
  /** DD-MM-YYYY */
  DMY_DASH: /\b(\d{1,2})-(\d{1,2})-(\d{4})\b/,
} as const;

/**
 * Month name to number mapping.
 */
export const MONTH_MAP: Record<string, number> = {
  january: 0,
  february: 1,
  march: 2,
  april: 3,
  may: 4,
  june: 5,
  july: 6,
  august: 7,
  september: 8,
  october: 9,
  november: 10,
  december: 11,
};

/**
 * Pattern to match coach number.
 */
export const COACH_PATTERN = /\bcoach[:\s]*(\d{1,2})\b/i;

/**
 * Pattern to match seat number.
 */
export const SEAT_PATTERN = /\bseat[:\s]*(\d{1,3})\b/i;

/**
 * Pattern to match passenger name.
 * Matches common title prefixes followed by name, stopping at known keywords.
 */
export const PASSENGER_PATTERN = /\b(?:passenger|name|traveller)[:\s]*((?:Mr|Mrs|Ms|Miss|Dr|Prof)?\.?\s*[A-Z][a-z]+(?:\s+[A-Z][a-z]+)+?)(?=\s*(?:$|\n|Coach|Seat|Class|Train|Date|Departs|Arrives))/i;

/**
 * Alternative pattern for passenger - matches title + name directly.
 * Stops at common booking keywords.
 */
export const PASSENGER_ALT_PATTERN = /\b((?:Mr|Mrs|Ms|Miss|Dr|Prof)\.?\s+[A-Z][a-z]+(?:\s+[A-Z][a-z]+)+?)(?=\s*(?:$|\n|Coach|Seat|Class|Train|Date|Departs|Arrives))/i;

/**
 * Station code to name mapping.
 */
export const STATION_MAP: Record<string, string> = {
  // UK
  GBSPX: 'London St Pancras',
  GBEBS: 'Ebbsfleet International',
  GBASH: 'Ashford International',
  // France
  FRCFK: 'Calais-Fréthun',
  FRLPD: 'Lille Europe',
  FRPLY: 'Paris Gare du Nord',
  // Belgium
  BEBMI: 'Brussels Midi/Zuid',
  // Netherlands
  NLASC: 'Amsterdam Centraal',
  NLRDA: 'Rotterdam Centraal',
};

/**
 * Station name variations to canonical name mapping.
 */
export const STATION_ALIASES: Record<string, string> = {
  // London
  'london st pancras': 'London St Pancras',
  'st pancras': 'London St Pancras',
  'st pancras international': 'London St Pancras',
  'london': 'London St Pancras',
  // Paris
  'paris gare du nord': 'Paris Gare du Nord',
  'paris nord': 'Paris Gare du Nord',
  'gare du nord': 'Paris Gare du Nord',
  'paris': 'Paris Gare du Nord',
  // Brussels
  'brussels midi': 'Brussels Midi/Zuid',
  'brussels zuid': 'Brussels Midi/Zuid',
  'bruxelles midi': 'Brussels Midi/Zuid',
  'brussels': 'Brussels Midi/Zuid',
  // Amsterdam
  'amsterdam centraal': 'Amsterdam Centraal',
  'amsterdam': 'Amsterdam Centraal',
  // Rotterdam
  'rotterdam centraal': 'Rotterdam Centraal',
  'rotterdam': 'Rotterdam Centraal',
  // Lille
  'lille europe': 'Lille Europe',
  'lille': 'Lille Europe',
  // Ebbsfleet
  'ebbsfleet': 'Ebbsfleet International',
  'ebbsfleet international': 'Ebbsfleet International',
  // Ashford
  'ashford': 'Ashford International',
  'ashford international': 'Ashford International',
  // Calais
  'calais': 'Calais-Fréthun',
  'calais-fréthun': 'Calais-Fréthun',
  'calais frethun': 'Calais-Fréthun',
};

/**
 * Pattern to extract origin and destination from route line.
 * Matches patterns like "London St Pancras → Paris Gare du Nord"
 * or "from London St Pancras to Paris"
 */
export const ROUTE_PATTERN = /(?:from\s+)?(.+?)(?:\s*→\s*|\s+to\s+)(.+?)(?:\s*$|\s*\n)/i;

/**
 * Pattern for departure line that often contains origin.
 */
export const DEPARTS_PATTERN = /departs?[:\s]*([A-Za-z\s]+?)(?:\s+\d{1,2}[:\d]*|\s*$)/i;

/**
 * Pattern for arrival line that often contains destination.
 */
export const ARRIVES_PATTERN = /arrives?[:\s]*([A-Za-z\s]+?)(?:\s+\d{1,2}[:\d]*|\s*$)/i;

/**
 * Normalize station name to canonical form.
 */
export function normalizeStation(name: string): string {
  const normalized = name.toLowerCase().trim();
  return STATION_ALIASES[normalized] ?? name.trim();
}
