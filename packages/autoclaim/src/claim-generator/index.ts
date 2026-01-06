/**
 * Claim generator module.
 *
 * Creates claim records and prepares pre-filled form data for Eurostar's
 * delay compensation portal.
 *
 * IMPORTANT: This module does NOT submit claims automatically.
 * It prepares everything so the user can click through to the Eurostar portal.
 */

// Types
export {
  type ClaimFormData,
  type ClaimGenerationResult,
  type ClaimWithFormData,
  type ClaimGeneratorError,
  type ListClaimsOptions,
  type UserClaimsSummary,
  ClaimGeneratorErrorCode,
  createClaimGeneratorError,
  STATION_NAMES,
  EUROSTAR_CLAIM_PORTAL_URL,
} from './types.js';

// Form data utilities
export {
  buildClaimFormData,
  generateClaimPortalUrl,
  formatForClipboard,
  formatAsJson,
  validateFormData,
  parsePassengerName,
  formatJourneyDate,
  getStationDisplayName,
} from './form-data.js';

// Events
export {
  type ClaimCreatedEvent,
  type ClaimSubmittedEvent,
  type ClaimStatusChangedEvent,
  type ClaimDeadlineApproachingEvent,
  type ClaimEvent,
  type ClaimCreatedHandler,
  type ClaimSubmittedHandler,
  type ClaimStatusChangedHandler,
  type ClaimDeadlineApproachingHandler,
  ClaimEventType,
  ClaimEventEmitter,
  createClaimEventEmitter,
  claimEvents,
} from './events.js';

// Service
export {
  ClaimGeneratorService,
  createClaimGeneratorService,
} from './service.js';
