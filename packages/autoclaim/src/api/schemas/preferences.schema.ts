/**
 * TypeBox schemas for user preferences API.
 */

import { Type, type Static } from '@sinclair/typebox';

// ============================================================================
// Seat Preferences Schema
// ============================================================================

/**
 * Seat position preference.
 */
export const SeatPositionSchema = Type.Union([
  Type.Literal('window'),
  Type.Literal('aisle'),
  Type.Literal('middle'),
]);

/**
 * Seat direction preference.
 */
export const SeatDirectionSchema = Type.Union([
  Type.Literal('forward'),
  Type.Literal('backward'),
  Type.Literal('any'),
]);

/**
 * Coach type preference.
 */
export const CoachTypeSchema = Type.Union([
  Type.Literal('quiet'),
  Type.Literal('standard'),
  Type.Literal('any'),
]);

/**
 * Seat preferences object.
 */
export const SeatPreferencesSchema = Type.Object({
  position: Type.Optional(SeatPositionSchema),
  direction: Type.Optional(SeatDirectionSchema),
  coach: Type.Optional(CoachTypeSchema),
  table: Type.Optional(Type.Boolean()),
  powerSocket: Type.Optional(Type.Boolean()),
});

export type SeatPreferencesInput = Static<typeof SeatPreferencesSchema>;

// ============================================================================
// Terminal & Compensation Schemas
// ============================================================================

/**
 * Terminal enum.
 */
export const TerminalSchema = Type.Union([
  Type.Literal('st_pancras'),
  Type.Literal('paris_nord'),
  Type.Literal('brussels_midi'),
  Type.Literal('amsterdam_centraal'),
]);

/**
 * Compensation type enum.
 */
export const CompensationTypeSchema = Type.Union([
  Type.Literal('cash'),
  Type.Literal('voucher'),
]);

// ============================================================================
// Request Schemas
// ============================================================================

/**
 * Update preferences request body.
 */
export const UpdatePreferencesBodySchema = Type.Object({
  seatPreferences: Type.Optional(Type.Union([SeatPreferencesSchema, Type.Null()])),
  queueNotifications: Type.Optional(Type.Boolean()),
  defaultTerminal: Type.Optional(Type.Union([TerminalSchema, Type.Null()])),
  preferredCompensationType: Type.Optional(Type.Union([CompensationTypeSchema, Type.Null()])),
});

export type UpdatePreferencesBody = Static<typeof UpdatePreferencesBodySchema>;

// ============================================================================
// Response Schemas
// ============================================================================

/**
 * User preferences response.
 */
export const PreferencesResponseSchema = Type.Object({
  id: Type.Union([Type.String(), Type.Null()]),
  userId: Type.String(),
  seatPreferences: Type.Union([SeatPreferencesSchema, Type.Null()]),
  queueNotifications: Type.Boolean(),
  defaultTerminal: Type.Union([TerminalSchema, Type.Null()]),
  preferredCompensationType: Type.Union([CompensationTypeSchema, Type.Null()]),
  createdAt: Type.String(),
  updatedAt: Type.String(),
});

export type PreferencesResponse = Static<typeof PreferencesResponseSchema>;

/**
 * Get preferences response wrapper.
 */
export const GetPreferencesResponseSchema = Type.Object({
  data: PreferencesResponseSchema,
});

/**
 * Update preferences response wrapper.
 */
export const UpdatePreferencesResponseSchema = Type.Object({
  data: PreferencesResponseSchema,
});
