/**
 * Theme constants for Eurostar Tools
 *
 * Type-safe access to design tokens defined in globals.css.
 * Use these exports for consistent styling across components.
 */

/**
 * Colors for train delay status indicators.
 * Maps to CSS variables: --color-success, --color-warning, --color-error
 */
export const delayColors = {
  /** On time or early (green) */
  onTime: 'hsl(var(--color-success))',
  /** Minor delay: < 30 minutes (amber/warning) */
  minor: 'hsl(var(--color-warning))',
  /** Moderate delay: 30-60 minutes (amber/warning dark) */
  moderate: 'hsl(var(--color-warning-dark))',
  /** Severe delay: > 60 minutes (red/error) */
  severe: 'hsl(var(--color-error))',
} as const;

/**
 * Colors for compensation claim status badges.
 * Maps to CSS variables for semantic states.
 */
export const claimStatusColors = {
  /** Claim pending review (amber/warning) */
  pending: 'hsl(var(--color-warning))',
  /** Claim approved (green/success) */
  approved: 'hsl(var(--color-success))',
  /** Claim rejected (red/error) */
  rejected: 'hsl(var(--color-error))',
  /** Claim submitted to Eurostar (blue/info) */
  submitted: 'hsl(var(--color-info))',
} as const;

/**
 * Standard animation durations for consistent motion design.
 * Use with CSS transitions and Framer Motion.
 */
export const animationDurations = {
  /** Fast micro-interactions: 150ms */
  fast: 150,
  /** Normal transitions: 250ms */
  normal: 250,
  /** Slow, deliberate animations: 400ms */
  slow: 400,
} as const;

/** Type for delay status keys */
export type DelayStatus = keyof typeof delayColors;

/** Type for claim status keys */
export type ClaimStatus = keyof typeof claimStatusColors;

/** Type for animation duration keys */
export type AnimationDuration = keyof typeof animationDurations;
