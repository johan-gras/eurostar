import type { CoachClass, SeatInfo, TrainType } from '../types.js';

export interface TrainConfig {
  type: TrainType;
  coachCount: number;
  totalSeats: number;
  classLayout: Record<CoachClass, number[]>;
  limitedData: boolean;
}

/**
 * Classic Eurostar (original Class 373 trains)
 * Similar layout to e300: 18 coaches, ~750 seats
 *
 * NOTE: Limited seat data available - only configuration info.
 * Detailed per-seat features/warnings are not yet mapped.
 */
export const classicConfig: TrainConfig = {
  type: 'classic',
  coachCount: 18,
  totalSeats: 750,
  classLayout: {
    'business-premier': [1, 2],
    'standard-premier': [3, 4],
    standard: [5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18],
  },
  limitedData: true,
};

// Empty seat map - limited data available for Classic trains
export const classicSeatMap: Map<string, SeatInfo> = new Map();

// Empty seats array - limited data available
export const classicSeats: SeatInfo[] = [];

/**
 * Get seat information for a specific coach and seat number
 * @param _coach Coach number (1-18)
 * @param _seatNumber Seat number
 * @returns undefined - limited data available for Classic trains
 */
export function getSeatInfo(_coach: number, _seatNumber: string): SeatInfo | undefined {
  return undefined;
}

/**
 * Get all seats for a specific coach
 * @param _coach Coach number (1-18)
 * @returns Empty array - limited data available for Classic trains
 */
export function getSeatsByCoach(_coach: number): SeatInfo[] {
  return [];
}

/**
 * Get seat counts by coach
 * @returns Empty record - limited data available
 */
export function getSeatCountsByCoach(): Record<number, number> {
  return {};
}

/**
 * Get total seat count
 * @returns 0 - limited data available
 */
export function getTotalSeatCount(): number {
  return 0;
}
