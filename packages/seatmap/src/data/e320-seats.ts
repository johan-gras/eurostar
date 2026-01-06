import type { CoachClass, SeatFeature, SeatInfo, SeatPosition, SeatWarning } from '../types.js';

/**
 * E320 (Siemens Velaro) seat data generator
 *
 * Coach layout:
 * - Coaches 1-2: Business Premier (2+1 seating, ~30 seats each)
 * - Coaches 3-4: Standard Premier (2+1 seating, ~44 seats each)
 * - Coaches 5-16: Standard (2+2 seating, ~56 seats each)
 */

interface CoachConfig {
  coach: number;
  class: CoachClass;
  seatingLayout: '2+1' | '2+2';
  rowCount: number;
  startingSeatNumber: number;
}

// Define coach configurations
// Target: 894 total seats
// Business Premier: 2 coaches x 30 = 60
// Standard Premier: 2 coaches x 48 = 96
// Standard: 12 coaches (10 x 60 + 2 x 64) = 600 + 128 = 728
// Adjustment: We need some coaches with extra seats
const coachConfigs: CoachConfig[] = [
  // Business Premier: 2+1 seating, 10 rows = 30 seats each (60 total)
  { coach: 1, class: 'business-premier', seatingLayout: '2+1', rowCount: 10, startingSeatNumber: 11 },
  { coach: 2, class: 'business-premier', seatingLayout: '2+1', rowCount: 10, startingSeatNumber: 11 },
  // Standard Premier: 2+1 seating, 16 rows = 48 seats each (96 total)
  { coach: 3, class: 'standard-premier', seatingLayout: '2+1', rowCount: 16, startingSeatNumber: 11 },
  { coach: 4, class: 'standard-premier', seatingLayout: '2+1', rowCount: 16, startingSeatNumber: 11 },
  // Standard: 2+2 seating, varying rows to reach target
  // Most coaches have 15 rows (60 seats), some have 16 rows (64 seats)
  { coach: 5, class: 'standard', seatingLayout: '2+2', rowCount: 15, startingSeatNumber: 11 },
  { coach: 6, class: 'standard', seatingLayout: '2+2', rowCount: 16, startingSeatNumber: 11 },
  { coach: 7, class: 'standard', seatingLayout: '2+2', rowCount: 15, startingSeatNumber: 11 },
  { coach: 8, class: 'standard', seatingLayout: '2+2', rowCount: 16, startingSeatNumber: 11 },
  { coach: 9, class: 'standard', seatingLayout: '2+2', rowCount: 15, startingSeatNumber: 11 },
  { coach: 10, class: 'standard', seatingLayout: '2+2', rowCount: 16, startingSeatNumber: 11 },
  { coach: 11, class: 'standard', seatingLayout: '2+2', rowCount: 15, startingSeatNumber: 11 },
  { coach: 12, class: 'standard', seatingLayout: '2+2', rowCount: 16, startingSeatNumber: 11 },
  { coach: 13, class: 'standard', seatingLayout: '2+2', rowCount: 15, startingSeatNumber: 11 },
  { coach: 14, class: 'standard', seatingLayout: '2+2', rowCount: 16, startingSeatNumber: 11 },
  { coach: 15, class: 'standard', seatingLayout: '2+2', rowCount: 15, startingSeatNumber: 11 },
  { coach: 16, class: 'standard', seatingLayout: '2+2', rowCount: 14, startingSeatNumber: 11 },  // Slightly shorter coach at end
];

// Coaches with toilets at row 1
const nearToiletCoaches = [1, 5, 9, 13];

// Quiet zone coaches
const quietCoaches = [9, 10];

// Problem rows where pillars block window views
// These affect window seats (A/D in 2+2, A/C in 2+1) at these row numbers
const noWindowRows = [2, 5];

function generateSeatNumber(row: number, position: SeatPosition, startingSeat: number): string {
  // Seat numbering: row 1 starts at startingSeat (e.g., 11)
  // Each row adds positions: row 1 = 11-14 (or 11-13 for 2+1), row 2 = 21-24, etc.
  const rowBase = (row) * 10 + startingSeat - 10;
  const positionOffset = position === 'A' ? 0 : position === 'B' ? 1 : position === 'C' ? 2 : 3;
  return String(rowBase + positionOffset);
}

function generateSeatsForCoach(config: CoachConfig): SeatInfo[] {
  const seats: SeatInfo[] = [];
  const positions: SeatPosition[] = config.seatingLayout === '2+2'
    ? ['A', 'B', 'C', 'D']
    : ['A', 'B', 'C'];

  for (let row = 1; row <= config.rowCount; row++) {
    for (const position of positions) {
      const seatNumber = generateSeatNumber(row, position, config.startingSeatNumber);
      const features: SeatFeature[] = [];
      const warnings: SeatWarning[] = [];

      // All e320 seats have power outlets
      features.push('power');

      // Window/Aisle based on position
      if (config.seatingLayout === '2+2') {
        // 2+2: A/D = window, B/C = aisle
        if (position === 'A' || position === 'D') {
          features.push('window');
        } else {
          features.push('aisle');
        }
      } else {
        // 2+1: A/C = window, B = aisle
        if (position === 'A' || position === 'C') {
          features.push('window');
        } else {
          features.push('aisle');
        }
      }

      // Business Premier seats have tables
      if (config.class === 'business-premier') {
        features.push('table');
      }

      // Quiet zone
      if (quietCoaches.includes(config.coach)) {
        features.push('quiet');
      }

      // Facing direction: row 1 on one side faces backward
      // Odd positions (A side) in row 1 face backward
      if (row === 1 && (position === 'A' || position === 'B')) {
        features.push('facing-backward');
      } else {
        features.push('facing-forward');
      }

      // === WARNINGS ===

      // Near toilet warning
      if (row === 1 && nearToiletCoaches.includes(config.coach)) {
        warnings.push('near-toilet');
      }

      // No window seats (pillar blocks view) - only affects window positions
      const isWindowPosition = features.includes('window');
      if (isWindowPosition && noWindowRows.includes(row)) {
        warnings.push('no-window');
        // Remove window feature since view is blocked
        const windowIndex = features.indexOf('window');
        if (windowIndex > -1) {
          features.splice(windowIndex, 1);
        }
      }

      // Limited recline on last row
      if (row === config.rowCount) {
        warnings.push('limited-recline');
      }

      // Special case: seat 55 in Coach 1 has limited recline (known issue)
      if (config.coach === 1 && seatNumber === '55') {
        if (!warnings.includes('limited-recline')) {
          warnings.push('limited-recline');
        }
      }

      seats.push({
        seatNumber,
        coach: config.coach,
        class: config.class,
        features,
        warnings,
        row,
        position,
      });
    }
  }

  return seats;
}

// Generate all seats
const allSeats: SeatInfo[] = [];
for (const config of coachConfigs) {
  allSeats.push(...generateSeatsForCoach(config));
}

// Create seat maps for efficient lookup
const seatsByKey = new Map<string, SeatInfo>();
const seatsByCoach = new Map<number, SeatInfo[]>();

for (const seat of allSeats) {
  // Key format: "coach-seatNumber" (e.g., "1-11")
  const key = `${seat.coach}-${seat.seatNumber}`;
  seatsByKey.set(key, seat);

  // Group by coach
  if (!seatsByCoach.has(seat.coach)) {
    seatsByCoach.set(seat.coach, []);
  }
  seatsByCoach.get(seat.coach)!.push(seat);
}

/**
 * Get seat information by coach and seat number
 */
export function getSeatInfo(coach: number, seatNumber: string): SeatInfo | undefined {
  const key = `${coach}-${seatNumber}`;
  return seatsByKey.get(key);
}

/**
 * Get all seats for a specific coach
 */
export function getSeatsByCoach(coach: number): SeatInfo[] {
  return seatsByCoach.get(coach) ?? [];
}

/**
 * Get total seat count
 */
export function getTotalSeatCount(): number {
  return allSeats.length;
}

/**
 * Get seat counts by coach
 */
export function getSeatCountsByCoach(): Map<number, number> {
  const counts = new Map<number, number>();
  for (const [coach, seats] of seatsByCoach) {
    counts.set(coach, seats.length);
  }
  return counts;
}

/**
 * All e320 seats
 */
export const e320Seats: SeatInfo[] = allSeats;

// Verify seat counts
export function verifySeatCounts(): void {
  console.log('E320 Seat Verification:');
  console.log('========================');

  let total = 0;
  for (let coach = 1; coach <= 16; coach++) {
    const seats = getSeatsByCoach(coach);
    console.log(`Coach ${coach.toString().padStart(2)}: ${seats.length} seats`);
    total += seats.length;
  }

  console.log('========================');
  console.log(`Total: ${total} seats (expected ~894)`);
}
