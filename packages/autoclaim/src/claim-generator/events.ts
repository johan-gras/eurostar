/**
 * Event types and emitter for claim lifecycle events.
 */

import { EventEmitter } from 'events';
import type { Claim, ClaimStatus } from '@eurostar/core/db';
import type { ClaimFormData } from './types.js';

/**
 * Event emitted when a new claim is created.
 */
export interface ClaimCreatedEvent {
  /** Event type */
  type: 'claim-created';
  /** Timestamp of the event */
  timestamp: Date;
  /** The created claim */
  claim: Claim;
  /** User ID who owns the claim */
  userId: string;
  /** Booking ID associated with the claim */
  bookingId: string;
  /** Pre-filled form data */
  formData: ClaimFormData;
}

/**
 * Event emitted when a claim is marked as submitted.
 */
export interface ClaimSubmittedEvent {
  /** Event type */
  type: 'claim-submitted';
  /** Timestamp of the event */
  timestamp: Date;
  /** The claim ID */
  claimId: string;
  /** User ID who owns the claim */
  userId: string;
  /** Booking ID associated with the claim */
  bookingId: string;
  /** When the claim was submitted */
  submittedAt: Date;
}

/**
 * Event emitted when a claim status changes.
 */
export interface ClaimStatusChangedEvent {
  /** Event type */
  type: 'claim-status-changed';
  /** Timestamp of the event */
  timestamp: Date;
  /** The claim ID */
  claimId: string;
  /** Previous status */
  previousStatus: ClaimStatus;
  /** New status */
  newStatus: ClaimStatus;
  /** User ID who owns the claim */
  userId: string;
}

/**
 * Event emitted when a claim deadline is approaching.
 */
export interface ClaimDeadlineApproachingEvent {
  /** Event type */
  type: 'claim-deadline-approaching';
  /** Timestamp of the event */
  timestamp: Date;
  /** The claim ID */
  claimId: string;
  /** User ID who owns the claim */
  userId: string;
  /** Days remaining until deadline */
  daysRemaining: number;
  /** The deadline date */
  deadline: Date;
}

/**
 * All claim event types.
 */
export type ClaimEvent =
  | ClaimCreatedEvent
  | ClaimSubmittedEvent
  | ClaimStatusChangedEvent
  | ClaimDeadlineApproachingEvent;

/**
 * Event names for the claim emitter.
 */
export const ClaimEventType = {
  CLAIM_CREATED: 'claim-created',
  CLAIM_SUBMITTED: 'claim-submitted',
  CLAIM_STATUS_CHANGED: 'claim-status-changed',
  CLAIM_DEADLINE_APPROACHING: 'claim-deadline-approaching',
} as const;

export type ClaimEventType = (typeof ClaimEventType)[keyof typeof ClaimEventType];

/**
 * Handler function types for each event.
 * Note: Handlers must be synchronous. For async operations, queue work in the handler.
 */
export type ClaimCreatedHandler = (event: ClaimCreatedEvent) => void;
export type ClaimSubmittedHandler = (event: ClaimSubmittedEvent) => void;
export type ClaimStatusChangedHandler = (event: ClaimStatusChangedEvent) => void;
export type ClaimDeadlineApproachingHandler = (event: ClaimDeadlineApproachingEvent) => void;

/**
 * Typed event emitter for claim lifecycle events.
 */
export class ClaimEventEmitter extends EventEmitter {
  /**
   * Emits a claim-created event.
   */
  emitClaimCreated(event: Omit<ClaimCreatedEvent, 'type' | 'timestamp'>): void {
    const fullEvent: ClaimCreatedEvent = {
      type: 'claim-created',
      timestamp: new Date(),
      ...event,
    };
    this.emit(ClaimEventType.CLAIM_CREATED, fullEvent);
  }

  /**
   * Emits a claim-submitted event.
   */
  emitClaimSubmitted(event: Omit<ClaimSubmittedEvent, 'type' | 'timestamp'>): void {
    const fullEvent: ClaimSubmittedEvent = {
      type: 'claim-submitted',
      timestamp: new Date(),
      ...event,
    };
    this.emit(ClaimEventType.CLAIM_SUBMITTED, fullEvent);
  }

  /**
   * Emits a claim-status-changed event.
   */
  emitStatusChanged(event: Omit<ClaimStatusChangedEvent, 'type' | 'timestamp'>): void {
    const fullEvent: ClaimStatusChangedEvent = {
      type: 'claim-status-changed',
      timestamp: new Date(),
      ...event,
    };
    this.emit(ClaimEventType.CLAIM_STATUS_CHANGED, fullEvent);
  }

  /**
   * Emits a claim-deadline-approaching event.
   */
  emitDeadlineApproaching(
    event: Omit<ClaimDeadlineApproachingEvent, 'type' | 'timestamp'>
  ): void {
    const fullEvent: ClaimDeadlineApproachingEvent = {
      type: 'claim-deadline-approaching',
      timestamp: new Date(),
      ...event,
    };
    this.emit(ClaimEventType.CLAIM_DEADLINE_APPROACHING, fullEvent);
  }

  /**
   * Registers a handler for claim-created events.
   */
  onClaimCreated(handler: ClaimCreatedHandler): this {
    this.on(ClaimEventType.CLAIM_CREATED, handler);
    return this;
  }

  /**
   * Registers a handler for claim-submitted events.
   */
  onClaimSubmitted(handler: ClaimSubmittedHandler): this {
    this.on(ClaimEventType.CLAIM_SUBMITTED, handler);
    return this;
  }

  /**
   * Registers a handler for claim-status-changed events.
   */
  onStatusChanged(handler: ClaimStatusChangedHandler): this {
    this.on(ClaimEventType.CLAIM_STATUS_CHANGED, handler);
    return this;
  }

  /**
   * Registers a handler for claim-deadline-approaching events.
   */
  onDeadlineApproaching(handler: ClaimDeadlineApproachingHandler): this {
    this.on(ClaimEventType.CLAIM_DEADLINE_APPROACHING, handler);
    return this;
  }

  /**
   * Removes a handler for claim-created events.
   */
  offClaimCreated(handler: ClaimCreatedHandler): this {
    this.off(ClaimEventType.CLAIM_CREATED, handler);
    return this;
  }

  /**
   * Removes a handler for claim-submitted events.
   */
  offClaimSubmitted(handler: ClaimSubmittedHandler): this {
    this.off(ClaimEventType.CLAIM_SUBMITTED, handler);
    return this;
  }

  /**
   * Removes a handler for claim-status-changed events.
   */
  offStatusChanged(handler: ClaimStatusChangedHandler): this {
    this.off(ClaimEventType.CLAIM_STATUS_CHANGED, handler);
    return this;
  }

  /**
   * Removes a handler for claim-deadline-approaching events.
   */
  offDeadlineApproaching(handler: ClaimDeadlineApproachingHandler): this {
    this.off(ClaimEventType.CLAIM_DEADLINE_APPROACHING, handler);
    return this;
  }
}

/**
 * Creates a new ClaimEventEmitter instance.
 */
export function createClaimEventEmitter(): ClaimEventEmitter {
  return new ClaimEventEmitter();
}

/**
 * Global event emitter instance for claim events.
 * Use createClaimEventEmitter() if you need isolated instances.
 */
export const claimEvents = new ClaimEventEmitter();
