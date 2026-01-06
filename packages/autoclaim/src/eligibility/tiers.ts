import type { CompensationTier } from './types.js';

/**
 * Compensation tiers as defined by Eurostar's Customer Charter
 * and EU Regulation 2021/782 on Rail Passenger Rights (replaced 1371/2007 on 7 June 2023).
 *
 * EU minimum requirements:
 * - 60-119 min delay: 25% of ticket price
 * - 120+ min delay: 50% of ticket price
 * - Minimum payout threshold: EUR 4
 *
 * Eurostar offers enhanced voucher rates above EU minimums.
 * Tiers are ordered from lowest to highest delay.
 */
export const COMPENSATION_TIERS: readonly CompensationTier[] = [
  {
    name: 'Standard',
    minDelayMinutes: 60,
    maxDelayMinutes: 120,
    cashPercentage: 0.25,
    voucherPercentage: 0.6,
  },
  {
    name: 'Extended',
    minDelayMinutes: 120,
    maxDelayMinutes: 180,
    cashPercentage: 0.5,
    voucherPercentage: 0.6,
  },
  {
    name: 'Severe',
    minDelayMinutes: 180,
    maxDelayMinutes: null, // No upper limit
    cashPercentage: 0.5,
    voucherPercentage: 0.75,
  },
] as const;

/**
 * Gets the applicable compensation tier for a given delay duration.
 *
 * @param delayMinutes - The delay in minutes
 * @returns The applicable tier, or null if delay is below minimum (60 minutes)
 *
 * @example
 * getTierForDelay(45)   // null (below threshold)
 * getTierForDelay(60)   // Standard tier (25% cash, 60% voucher)
 * getTierForDelay(119)  // Standard tier
 * getTierForDelay(120)  // Extended tier (50% cash, 60% voucher)
 * getTierForDelay(179)  // Extended tier
 * getTierForDelay(180)  // Severe tier (50% cash, 75% voucher)
 * getTierForDelay(300)  // Severe tier
 */
export function getTierForDelay(delayMinutes: number): CompensationTier | null {
  // Below minimum threshold
  if (delayMinutes < 60) {
    return null;
  }

  // Find the applicable tier (iterate in reverse to find highest matching tier)
  for (let i = COMPENSATION_TIERS.length - 1; i >= 0; i--) {
    const tier = COMPENSATION_TIERS[i];
    if (tier && delayMinutes >= tier.minDelayMinutes) {
      return tier;
    }
  }

  return null;
}

/**
 * Gets the tier name for a given delay duration.
 *
 * @param delayMinutes - The delay in minutes
 * @returns The tier name, or null if not eligible
 */
export function getTierName(delayMinutes: number): string | null {
  const tier = getTierForDelay(delayMinutes);
  return tier?.name ?? null;
}

/**
 * Checks if a delay qualifies for any compensation.
 *
 * @param delayMinutes - The delay in minutes
 * @returns true if delay is >= 60 minutes
 */
export function isDelayCompensable(delayMinutes: number): boolean {
  return delayMinutes >= 60;
}

/**
 * Gets all tier boundaries for display/testing purposes.
 *
 * @returns Array of boundary points in minutes
 */
export function getTierBoundaries(): number[] {
  return COMPENSATION_TIERS.map((tier) => tier.minDelayMinutes);
}
