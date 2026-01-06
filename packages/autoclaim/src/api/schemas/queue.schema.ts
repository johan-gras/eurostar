/**
 * TypeBox schemas for queue API request validation.
 */

import { Type, type Static } from '@sinclair/typebox';

// ============================================================================
// Terminal Schema
// ============================================================================

export const TerminalSchema = Type.Union([
  Type.Literal('st-pancras'),
  Type.Literal('gare-du-nord'),
  Type.Literal('brussels-midi'),
  Type.Literal('amsterdam-centraal'),
]);

export type TerminalParam = Static<typeof TerminalSchema>;

// ============================================================================
// Confidence Level Schema
// ============================================================================

export const ConfidenceSchema = Type.Union([
  Type.Literal('low'),
  Type.Literal('medium'),
  Type.Literal('high'),
]);

// ============================================================================
// Crowd Level Schema
// ============================================================================

export const CrowdLevelSchema = Type.Union([
  Type.Literal('very-low'),
  Type.Literal('low'),
  Type.Literal('moderate'),
  Type.Literal('high'),
  Type.Literal('very-high'),
]);

// ============================================================================
// Route Parameter Schemas
// ============================================================================

/**
 * Terminal parameter.
 */
export const TerminalParamsSchema = Type.Object({
  terminal: TerminalSchema,
});

export type TerminalParams = Static<typeof TerminalParamsSchema>;

// ============================================================================
// Query Schemas
// ============================================================================

/**
 * Timeline query parameters.
 */
export const TimelineQuerySchema = Type.Object({
  hours: Type.Optional(Type.Integer({ minimum: 1, maximum: 48, default: 12 })),
});

export type TimelineQuery = Static<typeof TimelineQuerySchema>;

// ============================================================================
// Request Body Schemas
// ============================================================================

/**
 * Best arrival time request body.
 */
export const BestArrivalBodySchema = Type.Object({
  departureTime: Type.String({ format: 'date-time' }),
  maxWaitMinutes: Type.Integer({ minimum: 5, maximum: 120 }),
});

export type BestArrivalBody = Static<typeof BestArrivalBodySchema>;

// ============================================================================
// Response Schemas
// ============================================================================

/**
 * Peak hours response schema.
 */
export const PeakHoursResponseSchema = Type.Object({
  morning: Type.Object({
    start: Type.Integer({ minimum: 0, maximum: 23 }),
    end: Type.Integer({ minimum: 0, maximum: 23 }),
  }),
  evening: Type.Object({
    start: Type.Integer({ minimum: 0, maximum: 23 }),
    end: Type.Integer({ minimum: 0, maximum: 23 }),
  }),
});

/**
 * Terminal info response schema.
 */
export const TerminalInfoResponseSchema = Type.Object({
  code: TerminalSchema,
  name: Type.String(),
  timezone: Type.String(),
  checkInOpenMinutes: Type.Integer(),
  peakHours: PeakHoursResponseSchema,
});

export type TerminalInfoResponse = Static<typeof TerminalInfoResponseSchema>;

/**
 * Queue prediction response schema.
 */
export const QueuePredictionResponseSchema = Type.Object({
  terminal: TerminalSchema,
  estimatedMinutes: Type.Integer(),
  confidence: ConfidenceSchema,
  crowdLevel: CrowdLevelSchema,
  crowdDescription: Type.String(),
  updatedAt: Type.String({ format: 'date-time' }),
});

export type QueuePredictionResponse = Static<typeof QueuePredictionResponseSchema>;

/**
 * Timeline prediction response schema (includes hour info).
 */
export const TimelinePredictionResponseSchema = Type.Object({
  hour: Type.Integer({ minimum: 0, maximum: 23 }),
  dateTime: Type.String({ format: 'date-time' }),
  terminal: TerminalSchema,
  estimatedMinutes: Type.Integer(),
  confidence: ConfidenceSchema,
  crowdLevel: CrowdLevelSchema,
  crowdDescription: Type.String(),
});

export type TimelinePredictionResponse = Static<typeof TimelinePredictionResponseSchema>;

/**
 * Best arrival response schema.
 */
export const BestArrivalResponseSchema = Type.Object({
  suggestedArrival: Type.Union([Type.String({ format: 'date-time' }), Type.Null()]),
  estimatedWait: Type.Union([Type.Integer(), Type.Null()]),
  departureTime: Type.String({ format: 'date-time' }),
  message: Type.String(),
});

export type BestArrivalResponse = Static<typeof BestArrivalResponseSchema>;

// ============================================================================
// API Response Wrappers
// ============================================================================

/**
 * List terminals response.
 */
export const TerminalsListResponseSchema = Type.Object({
  data: Type.Array(TerminalInfoResponseSchema),
});

/**
 * Current queue response.
 */
export const CurrentQueueResponseSchema = Type.Object({
  data: QueuePredictionResponseSchema,
});

/**
 * Timeline response.
 */
export const TimelineResponseSchema = Type.Object({
  data: Type.Array(TimelinePredictionResponseSchema),
});

/**
 * Best arrival response.
 */
export const BestArrivalApiResponseSchema = Type.Object({
  data: BestArrivalResponseSchema,
});
