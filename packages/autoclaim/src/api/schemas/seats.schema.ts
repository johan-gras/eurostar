/**
 * TypeBox schemas for seat API request validation.
 */

import { Type, type Static } from '@sinclair/typebox';

// ============================================================================
// Train Type Schema
// ============================================================================

export const TrainTypeSchema = Type.Union([
  Type.Literal('e320'),
  Type.Literal('e300'),
  Type.Literal('classic'),
  Type.Literal('ruby'),
]);

export type TrainTypeParam = Static<typeof TrainTypeSchema>;

// ============================================================================
// Coach Class Schema
// ============================================================================

export const CoachClassSchema = Type.Union([
  Type.Literal('standard'),
  Type.Literal('standard-premier'),
  Type.Literal('business-premier'),
]);

export type CoachClassParam = Static<typeof CoachClassSchema>;

// ============================================================================
// Seat Feature Schema
// ============================================================================

export const SeatFeatureSchema = Type.Union([
  Type.Literal('window'),
  Type.Literal('aisle'),
  Type.Literal('table'),
  Type.Literal('power'),
  Type.Literal('quiet'),
  Type.Literal('accessible'),
  Type.Literal('duo'),
  Type.Literal('facing-forward'),
  Type.Literal('facing-backward'),
]);

// ============================================================================
// Seat Warning Schema
// ============================================================================

export const SeatWarningSchema = Type.Union([
  Type.Literal('no-window'),
  Type.Literal('limited-recline'),
  Type.Literal('near-toilet'),
  Type.Literal('near-galley'),
  Type.Literal('misaligned-window'),
]);

// ============================================================================
// Seat Position Schema
// ============================================================================

export const SeatPositionSchema = Type.Union([
  Type.Literal('A'),
  Type.Literal('B'),
  Type.Literal('C'),
  Type.Literal('D'),
]);

// ============================================================================
// Facing Preference Schema
// ============================================================================

export const FacingPreferenceSchema = Type.Union([
  Type.Literal('forward'),
  Type.Literal('backward'),
  Type.Literal('any'),
]);

// ============================================================================
// Route Parameter Schemas
// ============================================================================

/**
 * Train type parameter.
 */
export const TrainTypeParamsSchema = Type.Object({
  trainType: TrainTypeSchema,
});

export type TrainTypeParams = Static<typeof TrainTypeParamsSchema>;

/**
 * Train type + coach number parameters.
 */
export const CoachParamsSchema = Type.Object({
  trainType: TrainTypeSchema,
  coachNumber: Type.String({ pattern: '^\\d{1,2}$' }),
});

export type CoachParams = Static<typeof CoachParamsSchema>;

/**
 * Train type + coach + seat number parameters.
 */
export const SeatParamsSchema = Type.Object({
  trainType: TrainTypeSchema,
  coach: Type.String({ pattern: '^\\d{1,2}$' }),
  seatNumber: Type.String({ pattern: '^\\d{1,3}[A-D]?$' }),
});

export type SeatParams = Static<typeof SeatParamsSchema>;

// ============================================================================
// Request Body Schemas
// ============================================================================

/**
 * Seat preferences for recommendations.
 */
export const SeatPreferencesSchema = Type.Object({
  preferWindow: Type.Optional(Type.Boolean({ default: true })),
  preferQuiet: Type.Optional(Type.Boolean({ default: false })),
  preferTable: Type.Optional(Type.Boolean({ default: false })),
  avoidToilet: Type.Optional(Type.Boolean({ default: true })),
  avoidNoWindow: Type.Optional(Type.Boolean({ default: true })),
  needsAccessible: Type.Optional(Type.Boolean({ default: false })),
  travelingTogether: Type.Optional(Type.Integer({ minimum: 1, maximum: 4, default: 1 })),
  facingPreference: Type.Optional(FacingPreferenceSchema),
});

export type SeatPreferencesBody = Static<typeof SeatPreferencesSchema>;

/**
 * Recommend seats request body.
 */
export const RecommendSeatsBodySchema = Type.Object({
  preferences: Type.Optional(SeatPreferencesSchema),
  coachClass: CoachClassSchema,
  count: Type.Optional(Type.Integer({ minimum: 1, maximum: 20, default: 5 })),
});

export type RecommendSeatsBody = Static<typeof RecommendSeatsBodySchema>;

// ============================================================================
// Response Schemas
// ============================================================================

/**
 * Seat info response schema.
 */
export const SeatInfoResponseSchema = Type.Object({
  seatNumber: Type.String(),
  coach: Type.Integer(),
  class: CoachClassSchema,
  features: Type.Array(SeatFeatureSchema),
  warnings: Type.Array(SeatWarningSchema),
  row: Type.Integer(),
  position: SeatPositionSchema,
});

export type SeatInfoResponse = Static<typeof SeatInfoResponseSchema>;

/**
 * Coach info response schema.
 */
export const CoachInfoResponseSchema = Type.Object({
  coachNumber: Type.Integer(),
  class: CoachClassSchema,
  seatCount: Type.Integer(),
});

export type CoachInfoResponse = Static<typeof CoachInfoResponseSchema>;

/**
 * Seat recommendation response schema.
 */
export const SeatRecommendationResponseSchema = Type.Object({
  seats: Type.Array(SeatInfoResponseSchema),
  totalScore: Type.Number(),
  averageScore: Type.Number(),
});

export type SeatRecommendationResponse = Static<typeof SeatRecommendationResponseSchema>;

/**
 * List coaches response.
 */
export const CoachesListResponseSchema = Type.Object({
  data: Type.Array(CoachInfoResponseSchema),
});

/**
 * List seats response.
 */
export const SeatsListResponseSchema = Type.Object({
  data: Type.Array(SeatInfoResponseSchema),
});

/**
 * Single seat response.
 */
export const SeatResponseSchema = Type.Object({
  data: SeatInfoResponseSchema,
});

/**
 * Recommendations response.
 */
export const RecommendationsResponseSchema = Type.Object({
  data: Type.Array(SeatRecommendationResponseSchema),
});
