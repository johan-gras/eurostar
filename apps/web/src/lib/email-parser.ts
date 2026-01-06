/**
 * Client-side email parsing utilities for previewing parsed booking data.
 * This provides confidence scores for each field to show users what was extracted.
 */

export interface ParsedField<T> {
  value: T | null;
  confidence: 'high' | 'medium' | 'low' | 'none';
  rawMatch?: string;
}

export interface ParsedBookingPreview {
  pnr: ParsedField<string>;
  tcn: ParsedField<string>;
  trainNumber: ParsedField<string>;
  journeyDate: ParsedField<string>;
  passengerName: ParsedField<string>;
  origin: ParsedField<string>;
  destination: ParsedField<string>;
  coach: ParsedField<string>;
  seat: ParsedField<string>;
}

// Station code mapping
const STATION_MAP: Record<string, string> = {
  'london st pancras': 'GBSPX',
  'london st pancras international': 'GBSPX',
  'st pancras': 'GBSPX',
  'ebbsfleet': 'GBEBS',
  'ebbsfleet international': 'GBEBS',
  'ashford': 'GBASH',
  'ashford international': 'GBASH',
  'paris': 'FRPLY',
  'paris gare du nord': 'FRPLY',
  'paris nord': 'FRPLY',
  'gare du nord': 'FRPLY',
  'lille': 'FRLIL',
  'lille europe': 'FRLIL',
  'calais': 'FRCFK',
  'calais fréthun': 'FRCFK',
  'calais frethun': 'FRCFK',
  'brussels': 'BEBMI',
  'brussels midi': 'BEBMI',
  'bruxelles midi': 'BEBMI',
  'brussel zuid': 'BEBMI',
  'amsterdam': 'NLAMA',
  'amsterdam centraal': 'NLAMA',
  'rotterdam': 'NLRTD',
  'rotterdam centraal': 'NLRTD',
  'cologne': 'DECGN',
  'köln': 'DECGN',
  'koln': 'DECGN',
};

const MONTH_MAP: Record<string, number> = {
  january: 0, jan: 0,
  february: 1, feb: 1,
  march: 2, mar: 2,
  april: 3, apr: 3,
  may: 4,
  june: 5, jun: 5,
  july: 6, jul: 6,
  august: 7, aug: 7,
  september: 8, sep: 8, sept: 8,
  october: 9, oct: 9,
  november: 10, nov: 10,
  december: 11, dec: 11,
};

function normalizeStation(name: string): string | null {
  const normalized = name.toLowerCase().trim();

  // Direct code match
  if (/^[A-Z]{5}$/.test(name.toUpperCase())) {
    return name.toUpperCase();
  }

  // Try exact match first
  if (STATION_MAP[normalized]) {
    return STATION_MAP[normalized];
  }

  // Try partial match
  for (const [key, code] of Object.entries(STATION_MAP)) {
    if (normalized.includes(key) || key.includes(normalized)) {
      return code;
    }
  }

  return null;
}

function stripHtml(html: string): string {
  return html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n')
    .replace(/<\/div>/gi, '\n')
    .replace(/<\/tr>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/[ \t]+/g, ' ')
    .replace(/\n[ \t]+/g, '\n')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function preprocessEmail(emailBody: string): string {
  const isHtml = /<[^>]+>/.test(emailBody);
  let text = isHtml ? stripHtml(emailBody) : emailBody;

  // Clean forwarded email artifacts
  text = text
    .replace(/^>+\s?/gm, '')
    .replace(/^-{3,}.*$/gm, '')
    .replace(/^_{3,}.*$/gm, '')
    .replace(/^On .+ wrote:$/gm, '')
    .replace(/^(From|Sent|To|Subject):\s*.+$/gm, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  return text;
}

function extractPnr(text: string): ParsedField<string> {
  // Pattern: "reference" followed by 6 alphanumeric
  const patterns = [
    /(?:booking\s*)?reference[:\s#]*([A-Z0-9]{6})\b/i,
    /\bPNR[:\s#]*([A-Z0-9]{6})\b/i,
    /\bconfirmation[:\s#]*([A-Z0-9]{6})\b/i,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match?.[1]) {
      return { value: match[1].toUpperCase(), confidence: 'high', rawMatch: match[0] };
    }
  }

  // Fallback: any standalone 6 alphanumeric (lower confidence)
  const fallback = text.match(/\b([A-Z0-9]{6})\b/i);
  if (fallback?.[1]) {
    return { value: fallback[1].toUpperCase(), confidence: 'low', rawMatch: fallback[0] };
  }

  return { value: null, confidence: 'none' };
}

function extractTcn(text: string): ParsedField<string> {
  // Pattern: IV or 15 followed by 9 digits
  const patterns = [
    /\b(IV\d{9})\b/i,
    /\b(15\d{9})\b/,
    /(?:TCN|ticket)[:\s#]*(IV\d{9}|15\d{9})\b/i,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match?.[1]) {
      return { value: match[1].toUpperCase(), confidence: 'high', rawMatch: match[0] };
    }
  }

  return { value: null, confidence: 'none' };
}

function extractTrainNumber(text: string): ParsedField<string> {
  const patterns = [
    /eurostar\s*(?:train\s*)?(?:#|number|no\.?)?[:\s]*(\d{4})\b/i,
    /train\s*(?:#|number|no\.?)?[:\s]*(\d{4})\b/i,
    /\b9[0O]\d{2}\b/i, // Eurostar trains typically start with 90xx
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      const num = (match[1] || match[0]).replace(/O/gi, '0');
      if (/^\d{4}$/.test(num)) {
        return { value: num, confidence: 'high', rawMatch: match[0] };
      }
    }
  }

  return { value: null, confidence: 'none' };
}

function formatDateString(date: Date): string {
  const iso = date.toISOString();
  return iso.substring(0, 10);
}

function extractDate(text: string): ParsedField<string> {
  // DMY long format: 05 January 2026
  let match = text.match(/(\d{1,2})\s+(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{4})/i);
  if (match?.[1] && match[2] && match[3]) {
    const day = parseInt(match[1], 10);
    const month = MONTH_MAP[match[2].toLowerCase()];
    const year = parseInt(match[3], 10);
    if (month !== undefined) {
      const date = new Date(Date.UTC(year, month, day));
      return { value: formatDateString(date), confidence: 'high', rawMatch: match[0] };
    }
  }

  // MDY long format: January 05, 2026
  match = text.match(/(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{1,2}),?\s+(\d{4})/i);
  if (match?.[1] && match[2] && match[3]) {
    const month = MONTH_MAP[match[1].toLowerCase()];
    const day = parseInt(match[2], 10);
    const year = parseInt(match[3], 10);
    if (month !== undefined) {
      const date = new Date(Date.UTC(year, month, day));
      return { value: formatDateString(date), confidence: 'high', rawMatch: match[0] };
    }
  }

  // ISO format: 2026-01-05
  match = text.match(/(\d{4})-(\d{2})-(\d{2})/);
  if (match?.[0]) {
    return { value: match[0], confidence: 'high', rawMatch: match[0] };
  }

  // DMY slash format: 05/01/2026
  match = text.match(/(\d{2})\/(\d{2})\/(\d{4})/);
  if (match?.[1] && match[2] && match[3]) {
    const day = parseInt(match[1], 10);
    const month = parseInt(match[2], 10) - 1;
    const year = parseInt(match[3], 10);
    const date = new Date(Date.UTC(year, month, day));
    return { value: formatDateString(date), confidence: 'medium', rawMatch: match[0] };
  }

  return { value: null, confidence: 'none' };
}

function extractPassengerName(text: string): ParsedField<string> {
  const patterns = [
    /(?:passenger|name|traveller)[:\s]*([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)/i,
    /(?:Mr|Mrs|Ms|Miss|Dr)\.?\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/i,
    /dear\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/i,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match?.[1]) {
      return { value: match[1].trim(), confidence: 'high', rawMatch: match[0] };
    }
  }

  return { value: null, confidence: 'none' };
}

function extractOrigin(text: string): ParsedField<string> {
  const patterns = [
    /(?:depart(?:s|ing|ure)?|from)[:\s]+([A-Za-z\s]+?)(?:\s+to|\s+at|\s*\d|$)/i,
    /(?:origin)[:\s]+([A-Za-z\s]+?)(?:\s+to|\s*\d|$)/i,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match?.[1]) {
      const station = normalizeStation(match[1]);
      if (station) {
        return { value: station, confidence: 'high', rawMatch: match[0] };
      }
    }
  }

  return { value: null, confidence: 'none' };
}

function extractDestination(text: string): ParsedField<string> {
  const patterns = [
    /(?:arriv(?:es?|ing|al)?|to)[:\s]+([A-Za-z\s]+?)(?:\s+on|\s+at|\s*\d|$)/i,
    /(?:destination)[:\s]+([A-Za-z\s]+?)(?:\s+on|\s*\d|$)/i,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match?.[1]) {
      const station = normalizeStation(match[1]);
      if (station) {
        return { value: station, confidence: 'high', rawMatch: match[0] };
      }
    }
  }

  return { value: null, confidence: 'none' };
}

function extractCoach(text: string): ParsedField<string> {
  const match = text.match(/coach[:\s#]*(\d{1,2})\b/i);
  if (match?.[1]) {
    return { value: match[1], confidence: 'high', rawMatch: match[0] };
  }
  return { value: null, confidence: 'none' };
}

function extractSeat(text: string): ParsedField<string> {
  const match = text.match(/seat[:\s#]*(\d{1,3})\b/i);
  if (match?.[1]) {
    return { value: match[1], confidence: 'high', rawMatch: match[0] };
  }
  return { value: null, confidence: 'none' };
}

/**
 * Parse email content and return field-by-field results with confidence scores.
 */
export function parseEmailPreview(emailBody: string): ParsedBookingPreview {
  const text = preprocessEmail(emailBody);

  return {
    pnr: extractPnr(text),
    tcn: extractTcn(text),
    trainNumber: extractTrainNumber(text),
    journeyDate: extractDate(text),
    passengerName: extractPassengerName(text),
    origin: extractOrigin(text),
    destination: extractDestination(text),
    coach: extractCoach(text),
    seat: extractSeat(text),
  };
}

/**
 * Check if enough fields were parsed to proceed with import.
 */
export function canImport(preview: ParsedBookingPreview): boolean {
  const requiredFields = ['pnr', 'tcn', 'trainNumber', 'journeyDate', 'origin', 'destination'] as const;
  return requiredFields.every(field => preview[field].value !== null);
}

/**
 * Get confidence badge color classes.
 */
export function getConfidenceColor(confidence: ParsedField<unknown>['confidence']): string {
  switch (confidence) {
    case 'high':
      return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
    case 'medium':
      return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
    case 'low':
      return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200';
    case 'none':
      return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
  }
}
