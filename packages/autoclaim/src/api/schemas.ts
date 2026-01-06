/**
 * TypeBox schemas for API request validation.
 */

import { Type, type Static } from '@sinclair/typebox';

// ============================================================================
// Common Schemas
// ============================================================================

/**
 * UUID format.
 */
export const UuidSchema = Type.String({
  format: 'uuid',
  pattern: '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$',
});

/**
 * PNR format (6 alphanumeric characters).
 */
export const PnrSchema = Type.String({
  minLength: 6,
  maxLength: 6,
  pattern: '^[A-Z0-9]{6}$',
});

/**
 * TCN format (IV or 15 + 9 digits).
 */
export const TcnSchema = Type.String({
  pattern: '^(IV|15)\\d{9}$',
});

/**
 * Train number format (4 digits).
 */
export const TrainNumberSchema = Type.String({
  minLength: 4,
  maxLength: 4,
  pattern: '^\\d{4}$',
});

/**
 * Date string format (YYYY-MM-DD).
 */
export const DateStringSchema = Type.String({
  pattern: '^\\d{4}-\\d{2}-\\d{2}$',
});

/**
 * Station code format.
 */
export const StationCodeSchema = Type.String({
  minLength: 2,
  maxLength: 10,
});

/**
 * Claim status enum.
 */
export const ClaimStatusSchema = Type.Union([
  Type.Literal('pending'),
  Type.Literal('eligible'),
  Type.Literal('submitted'),
  Type.Literal('approved'),
  Type.Literal('rejected'),
  Type.Literal('expired'),
]);

// ============================================================================
// ID Parameters
// ============================================================================

/**
 * Booking ID parameter.
 */
export const BookingParamsSchema = Type.Object({
  id: UuidSchema,
});

export type BookingParams = Static<typeof BookingParamsSchema>;

/**
 * Claim ID parameter.
 */
export const ClaimParamsSchema = Type.Object({
  id: UuidSchema,
});

export type ClaimParams = Static<typeof ClaimParamsSchema>;

// ============================================================================
// Create Booking Schemas
// ============================================================================

/**
 * Create booking from email body.
 * Max 500KB to prevent DoS while allowing full email content.
 */
export const CreateBookingFromEmailSchema = Type.Object({
  emailBody: Type.String({ minLength: 1, maxLength: 500000 }),
});

export type CreateBookingFromEmail = Static<typeof CreateBookingFromEmailSchema>;

/**
 * Create booking with manual fields.
 */
export const CreateBookingManualSchema = Type.Object({
  pnr: PnrSchema,
  tcn: TcnSchema,
  trainNumber: TrainNumberSchema,
  journeyDate: DateStringSchema,
  passengerName: Type.String({ minLength: 1, maxLength: 255 }),
  origin: StationCodeSchema,
  destination: StationCodeSchema,
  coach: Type.Optional(Type.String({ maxLength: 3 })),
  seat: Type.Optional(Type.String({ maxLength: 5 })),
});

export type CreateBookingManual = Static<typeof CreateBookingManualSchema>;

/**
 * Create booking request (union of email or manual).
 */
export const CreateBookingSchema = Type.Union([
  CreateBookingFromEmailSchema,
  CreateBookingManualSchema,
]);

export type CreateBooking = Static<typeof CreateBookingSchema>;

// ============================================================================
// List Query Schemas
// ============================================================================

/**
 * Pagination query parameters.
 */
export const ListQuerySchema = Type.Object({
  page: Type.Optional(Type.Integer({ minimum: 1, default: 1 })),
  limit: Type.Optional(Type.Integer({ minimum: 1, maximum: 100, default: 20 })),
});

export type ListQuery = Static<typeof ListQuerySchema>;

/**
 * List bookings query parameters.
 */
export const ListBookingsQuerySchema = Type.Intersect([
  ListQuerySchema,
  Type.Object({
    status: Type.Optional(Type.Union([
      Type.Literal('pending'),
      Type.Literal('completed'),
      Type.Literal('with_delay'),
    ])),
  }),
]);

export type ListBookingsQuery = Static<typeof ListBookingsQuerySchema>;

/**
 * List claims query parameters.
 */
export const ListClaimsQuerySchema = Type.Intersect([
  ListQuerySchema,
  Type.Object({
    status: Type.Optional(ClaimStatusSchema),
  }),
]);

export type ListClaimsQuery = Static<typeof ListClaimsQuerySchema>;

// ============================================================================
// Response Schemas
// ============================================================================

/**
 * Error response schema.
 */
export const ErrorResponseSchema = Type.Object({
  error: Type.Object({
    code: Type.String(),
    message: Type.String(),
    details: Type.Optional(Type.Unknown()),
  }),
});

/**
 * Pagination metadata schema.
 */
export const PaginationMetaSchema = Type.Object({
  page: Type.Integer(),
  limit: Type.Integer(),
  total: Type.Integer(),
  totalPages: Type.Integer(),
});

/**
 * Success response wrapper factory.
 */
export function SuccessResponseSchema<T extends ReturnType<typeof Type.Object>>(
  dataSchema: T
) {
  return Type.Object({
    data: dataSchema,
    meta: Type.Optional(PaginationMetaSchema),
  });
}

/**
 * Success list response wrapper factory.
 */
export function SuccessListResponseSchema<T extends ReturnType<typeof Type.Object>>(
  itemSchema: T
) {
  return Type.Object({
    data: Type.Array(itemSchema),
    meta: Type.Optional(PaginationMetaSchema),
  });
}

/**
 * Booking response schema.
 */
export const BookingResponseSchema = Type.Object({
  id: UuidSchema,
  pnr: Type.String(),
  tcn: Type.String(),
  trainNumber: Type.String(),
  journeyDate: Type.String(),
  passengerName: Type.String(),
  origin: Type.String(),
  destination: Type.String(),
  coach: Type.Union([Type.String(), Type.Null()]),
  seat: Type.Union([Type.String(), Type.Null()]),
  finalDelayMinutes: Type.Union([Type.Integer(), Type.Null()]),
  trainId: Type.Union([UuidSchema, Type.Null()]),
  createdAt: Type.String(),
  updatedAt: Type.String(),
});

/**
 * Claim response schema.
 */
export const ClaimResponseSchema = Type.Object({
  id: UuidSchema,
  bookingId: UuidSchema,
  delayMinutes: Type.Integer(),
  eligibleCashAmount: Type.Number(),
  eligibleVoucherAmount: Type.Number(),
  status: ClaimStatusSchema,
  submittedAt: Type.Union([Type.String(), Type.Null()]),
  createdAt: Type.String(),
  updatedAt: Type.String(),
});

/**
 * Health response schema.
 */
export const HealthResponseSchema = Type.Object({
  status: Type.Union([
    Type.Literal('ok'),
    Type.Literal('degraded'),
    Type.Literal('error'),
  ]),
  timestamp: Type.String(),
  version: Type.String(),
  uptime: Type.Number(),
});

/**
 * Liveness response schema.
 */
export const LivenessResponseSchema = Type.Object({
  status: Type.Literal('ok'),
});

/**
 * Readiness response schema.
 */
export const ReadinessResponseSchema = Type.Intersect([
  HealthResponseSchema,
  Type.Object({
    checks: Type.Object({
      database: Type.Boolean(),
      redis: Type.Boolean(),
    }),
  }),
]);

// ============================================================================
// Helpers
// ============================================================================

/**
 * Check if request body is email-based.
 */
export function isEmailRequest(
  body: CreateBooking
): body is CreateBookingFromEmail {
  return 'emailBody' in body;
}

/**
 * Check if request body is manual entry.
 */
export function isManualRequest(
  body: CreateBooking
): body is CreateBookingManual {
  return 'pnr' in body;
}
