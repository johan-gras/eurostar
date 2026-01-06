import type { CoachClass, SeatInfo, TrainType } from '../types.js';
import {
  e300Seats,
  getSeatInfo as getSeatInfoImpl,
  getSeatsByCoach as getSeatsByCoachImpl,
  getSeatCountsByCoach,
  getTotalSeatCount,
} from './e300-seats.js';

export interface TrainConfig {
  type: TrainType;
  coachCount: number;
  totalSeats: number;
  classLayout: Record<CoachClass, number[]>;
}

export const e300Config: TrainConfig = {
  type: 'e300',
  coachCount: 18,
  totalSeats: 774,
  classLayout: {
    'business-premier': [1, 2],
    'standard-premier': [3, 4],
    standard: [5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18],
  },
};

// Build seat map from generated data
export const e300SeatMap: Map<string, SeatInfo> = new Map();
for (const seat of e300Seats) {
  const key = `${seat.coach}-${seat.seatNumber}`;
  e300SeatMap.set(key, seat);
}

/**
 * Get seat information for a specific coach and seat number
 * @param coach Coach number (1-18)
 * @param seatNumber Seat number (e.g., "11", "42")
 * @returns SeatInfo if found, undefined otherwise
 */
export function getSeatInfo(coach: number, seatNumber: string): SeatInfo | undefined {
  return getSeatInfoImpl(coach, seatNumber);
}

/**
 * Get all seats for a specific coach
 * @param coach Coach number (1-18)
 * @returns Array of SeatInfo for all seats in the coach
 */
export function getSeatsByCoach(coach: number): SeatInfo[] {
  return getSeatsByCoachImpl(coach);
}

// Re-export verification utilities
export { getSeatCountsByCoach, getTotalSeatCount };
