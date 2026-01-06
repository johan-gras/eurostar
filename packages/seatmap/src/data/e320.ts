import type { CoachClass, SeatInfo, TrainType } from '../types.js';
import {
  e320Seats,
  getSeatInfo as getSeatInfoImpl,
  getSeatsByCoach as getSeatsByCoachImpl,
  getSeatCountsByCoach,
  getTotalSeatCount,
} from './e320-seats.js';

export interface TrainConfig {
  type: TrainType;
  coachCount: number;
  totalSeats: number;
  classLayout: Record<CoachClass, number[]>;
}

export const e320Config: TrainConfig = {
  type: 'e320',
  coachCount: 16,
  totalSeats: 894,
  classLayout: {
    'business-premier': [1, 2],
    'standard-premier': [3, 4],
    standard: [5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16],
  },
};

// Build seat map from generated data
export const e320SeatMap: Map<string, SeatInfo> = new Map();
for (const seat of e320Seats) {
  const key = `${seat.coach}-${seat.seatNumber}`;
  e320SeatMap.set(key, seat);
}

/**
 * Get seat information for a specific coach and seat number
 * @param coach Coach number (1-16)
 * @param seatNumber Seat number (e.g., "11", "42")
 * @returns SeatInfo if found, undefined otherwise
 */
export function getSeatInfo(coach: number, seatNumber: string): SeatInfo | undefined {
  return getSeatInfoImpl(coach, seatNumber);
}

/**
 * Get all seats for a specific coach
 * @param coach Coach number (1-16)
 * @returns Array of SeatInfo for all seats in the coach
 */
export function getSeatsByCoach(coach: number): SeatInfo[] {
  return getSeatsByCoachImpl(coach);
}

// Re-export verification utilities
export { getSeatCountsByCoach, getTotalSeatCount };
