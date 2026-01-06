import type { CoachClass, SeatInfo, TrainType } from '../types.js';

export interface TrainConfig {
  type: TrainType;
  coachCount: number;
  totalSeats: number;
  classLayout: Record<CoachClass, number[]>;
  limitedData: boolean;
}

/**
 * Ruby trains (former Thalys PBKA, now Eurostar branded)
 * 8 coaches, approximately 400 seats
 *
 * NOTE: Limited seat data available - only configuration info.
 * Detailed per-seat features/warnings are not yet mapped.
 */
export const rubyConfig: TrainConfig = {
  type: 'ruby',
  coachCount: 8,
  totalSeats: 400,
  classLayout: {
    'business-premier': [1],
    'standard-premier': [2, 3],
    standard: [4, 5, 6, 7, 8],
  },
  limitedData: true,
};

// Empty seat map - limited data available for Ruby trains
export const rubySeatMap: Map<string, SeatInfo> = new Map();

// Empty seats array - limited data available
export const rubySeats: SeatInfo[] = [];

/**
 * Get seat information for a specific coach and seat number
 * @param _coach Coach number (1-8)
 * @param _seatNumber Seat number
 * @returns undefined - limited data available for Ruby trains
 */
export function getSeatInfo(_coach: number, _seatNumber: string): SeatInfo | undefined {
  return undefined;
}

/**
 * Get all seats for a specific coach
 * @param _coach Coach number (1-8)
 * @returns Empty array - limited data available for Ruby trains
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
