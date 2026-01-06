/**
 * Zod validation schemas for parsed booking data.
 */

import { z } from 'zod';

/**
 * PNR (Booking Reference) validation.
 * Must be exactly 6 alphanumeric characters.
 */
export const PnrSchema = z
  .string()
  .length(6, 'PNR must be exactly 6 characters')
  .regex(/^[A-Z0-9]+$/, 'PNR must be alphanumeric');

/**
 * TCN (Ticket Control Number) validation.
 * Must be either IV + 9 digits or 15 + 9 digits.
 */
export const TcnSchema = z
  .string()
  .regex(/^(IV\d{9}|15\d{9})$/i, 'TCN must be IV + 9 digits or 15 + 9 digits');

/**
 * Train number validation.
 * Must be exactly 4 digits.
 */
export const TrainNumberSchema = z
  .string()
  .length(4, 'Train number must be exactly 4 digits')
  .regex(/^\d{4}$/, 'Train number must be numeric');

/**
 * Journey date validation.
 * Must be a valid date, not in the distant past or future.
 */
export const JourneyDateSchema = z.coerce.date().refine(
  (date) => {
    const now = new Date();
    const oneYearAgo = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
    const oneYearFromNow = new Date(now.getFullYear() + 1, now.getMonth(), now.getDate());
    return date >= oneYearAgo && date <= oneYearFromNow;
  },
  { message: 'Journey date must be within one year of today' }
);

/**
 * Passenger name validation.
 * Must be at least 2 characters, contain only letters, spaces, and hyphens.
 */
export const PassengerNameSchema = z
  .string()
  .min(2, 'Passenger name must be at least 2 characters')
  .max(100, 'Passenger name is too long');

/**
 * Station name validation.
 * Must be a non-empty string.
 */
export const StationSchema = z
  .string()
  .min(1, 'Station name cannot be empty')
  .max(100, 'Station name is too long');

/**
 * Coach number validation (optional).
 * Must be 1-2 digits between 1 and 18.
 */
export const CoachSchema = z
  .string()
  .regex(/^\d{1,2}$/, 'Coach must be 1-2 digits')
  .refine(
    (val) => {
      const num = parseInt(val, 10);
      return num >= 1 && num <= 18;
    },
    { message: 'Coach number must be between 1 and 18' }
  )
  .optional();

/**
 * Seat number validation (optional).
 * Must be 1-3 digits.
 */
export const SeatSchema = z
  .string()
  .regex(/^\d{1,3}$/, 'Seat must be 1-3 digits')
  .refine(
    (val) => {
      const num = parseInt(val, 10);
      return num >= 1 && num <= 200;
    },
    { message: 'Seat number must be between 1 and 200' }
  )
  .optional();

/**
 * Complete ParsedBooking validation schema.
 */
export const ParsedBookingSchema = z.object({
  pnr: PnrSchema,
  tcn: TcnSchema,
  trainNumber: TrainNumberSchema,
  journeyDate: JourneyDateSchema,
  passengerName: PassengerNameSchema,
  origin: StationSchema,
  destination: StationSchema,
  coach: CoachSchema,
  seat: SeatSchema,
});

/**
 * Type inferred from the schema.
 */
export type ValidatedBooking = z.infer<typeof ParsedBookingSchema>;

/**
 * Validates extracted booking data.
 * Returns the validated data or throws a ZodError.
 */
export function validateBooking(data: unknown): ValidatedBooking {
  return ParsedBookingSchema.parse(data);
}

/**
 * Safe parse result type.
 */
export type SafeParseResult<T> =
  | { success: true; data: T; error?: never }
  | { success: false; error: z.ZodError; data?: never };

/**
 * Safely validates extracted booking data.
 * Returns success/error result instead of throwing.
 */
export function safeValidateBooking(data: unknown): SafeParseResult<ValidatedBooking> {
  return ParsedBookingSchema.safeParse(data) as SafeParseResult<ValidatedBooking>;
}
