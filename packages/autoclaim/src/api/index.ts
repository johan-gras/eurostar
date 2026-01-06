/**
 * API module exports.
 */

// App factory
export { createApp, createTestApp, type CreateAppOptions, type AppServices } from './app.js';

// Types
export {
  type ApiError,
  type ErrorResponse,
  type SuccessResponse,
  type PaginationMeta,
  ApiErrorCode,
  createErrorResponse,
  createSuccessResponse,
  type BookingResponse,
  type BookingDetailResponse,
  type ClaimResponse,
  type ClaimDetailResponse,
  type HealthResponse,
  type ReadinessResponse,
  type LivenessResponse,
  toBookingResponse,
  toClaimResponse,
} from './types.js';

// Schemas
export {
  BookingParamsSchema,
  ClaimParamsSchema,
  CreateBookingSchema,
  CreateBookingFromEmailSchema,
  CreateBookingManualSchema,
  ListQuerySchema,
  ListBookingsQuerySchema,
  ListClaimsQuerySchema,
  ErrorResponseSchema,
  BookingResponseSchema,
  ClaimResponseSchema,
  HealthResponseSchema,
  ReadinessResponseSchema,
  LivenessResponseSchema,
  isEmailRequest,
  isManualRequest,
  type BookingParams,
  type ClaimParams,
  type CreateBooking,
  type CreateBookingFromEmail,
  type CreateBookingManual,
  type ListQuery,
  type ListBookingsQuery,
  type ListClaimsQuery,
} from './schemas.js';

// Middleware
export { ApiException } from './middleware/error-handler.js';
export { createTestToken, type JwtPayload, type AuthOptions } from './middleware/auth.js';

// Routes
export { registerHealthRoutes, type HealthRoutesOptions } from './routes/health.js';
export { registerBookingRoutes, type BookingRoutesOptions } from './routes/bookings.js';
export { registerClaimsRoutes, type ClaimsRoutesOptions } from './routes/claims.js';
