import type { CoachClass, SeatInfo, TrainType } from '../types.js';
import { e320Config, getSeatsByCoach as getE320SeatsByCoach } from '../data/e320.js';
import { e300Config, getSeatsByCoach as getE300SeatsByCoach } from '../data/e300.js';
import { classicConfig, getSeatsByCoach as getClassicSeatsByCoach } from '../data/classic.js';
import { rubyConfig, getSeatsByCoach as getRubySeatsByCoach } from '../data/ruby.js';
import type { TrainConfig } from '../data/e320.js';

/**
 * Get train configuration by type
 */
export function getTrainConfig(trainType: TrainType): TrainConfig | undefined {
  switch (trainType) {
    case 'e320':
      return e320Config;
    case 'e300':
      return e300Config;
    case 'classic':
      return classicConfig;
    case 'ruby':
      return rubyConfig;
    default:
      return undefined;
  }
}

/**
 * Get seats by coach for a specific train type
 */
function getSeatsByCoachForTrain(trainType: TrainType, coach: number): SeatInfo[] {
  switch (trainType) {
    case 'e320':
      return getE320SeatsByCoach(coach);
    case 'e300':
      return getE300SeatsByCoach(coach);
    case 'classic':
      return getClassicSeatsByCoach(coach);
    case 'ruby':
      return getRubySeatsByCoach(coach);
    default:
      return [];
  }
}

/**
 * Get all seats for a specific train type
 */
export function getAllSeatsForTrain(trainType: TrainType): SeatInfo[] {
  const config = getTrainConfig(trainType);
  if (!config) return [];

  const allSeats: SeatInfo[] = [];
  for (let coach = 1; coach <= config.coachCount; coach++) {
    allSeats.push(...getSeatsByCoachForTrain(trainType, coach));
  }
  return allSeats;
}

export interface SeatPreferences {
  preferWindow: boolean;
  preferQuiet: boolean;
  preferTable: boolean;
  avoidToilet: boolean;
  avoidNoWindow: boolean;
  needsAccessible: boolean;
  travelingTogether: number;
  facingPreference: 'forward' | 'backward' | 'any';
}

export const defaultPreferences: SeatPreferences = {
  preferWindow: true,
  preferQuiet: false,
  preferTable: false,
  avoidToilet: true,
  avoidNoWindow: true,
  needsAccessible: false,
  travelingTogether: 1,
  facingPreference: 'any',
};

export interface ScoredSeat {
  seat: SeatInfo;
  score: number;
}

export interface SeatRecommendation {
  seats: SeatInfo[];
  totalScore: number;
  averageScore: number;
}

/**
 * Score a seat based on user preferences
 * Starts at 50 points (neutral)
 * +10 for matching preferences
 * -15 for warnings user wants to avoid
 * -5 for unmet preferences
 */
export function scoreSeat(seat: SeatInfo, prefs: SeatPreferences): number {
  let score = 50;

  // Window preference
  if (prefs.preferWindow) {
    if (seat.features.includes('window')) {
      score += 10;
    } else {
      score -= 5;
    }
  }

  // Quiet zone preference
  if (prefs.preferQuiet) {
    if (seat.features.includes('quiet')) {
      score += 10;
    } else {
      score -= 5;
    }
  }

  // Table preference (Business Premier only)
  if (prefs.preferTable) {
    if (seat.features.includes('table')) {
      score += 10;
    } else {
      score -= 5;
    }
  }

  // Accessible seat requirement
  if (prefs.needsAccessible) {
    if (seat.features.includes('accessible')) {
      score += 10;
    } else {
      score -= 5;
    }
  }

  // Facing preference
  if (prefs.facingPreference !== 'any') {
    const wantedFeature = prefs.facingPreference === 'forward' ? 'facing-forward' : 'facing-backward';
    if (seat.features.includes(wantedFeature)) {
      score += 10;
    } else {
      score -= 5;
    }
  }

  // Warnings to avoid
  if (prefs.avoidToilet && seat.warnings.includes('near-toilet')) {
    score -= 15;
  }

  if (prefs.avoidNoWindow && seat.warnings.includes('no-window')) {
    score -= 15;
  }

  // General penalties for other warnings
  if (seat.warnings.includes('limited-recline')) {
    score -= 5;
  }

  if (seat.warnings.includes('near-galley')) {
    score -= 5;
  }

  if (seat.warnings.includes('misaligned-window')) {
    score -= 3;
  }

  return score;
}

/**
 * Get all seats in the same row that are physically adjacent to the given seat
 * Adjacent means consecutive positions (A-B, B-C, C-D in 2+2 layout, or A-B, B-C in 2+1)
 */
export function getAdjacentSeats(seat: SeatInfo, allSeats: SeatInfo[]): SeatInfo[] {
  const sameRowSeats = allSeats.filter(
    (s) => s.coach === seat.coach && s.row === seat.row && s.seatNumber !== seat.seatNumber
  );

  const positionOrder = { A: 0, B: 1, C: 2, D: 3 } as const;
  const currentPos = positionOrder[seat.position];

  return sameRowSeats.filter((s) => {
    const otherPos = positionOrder[s.position];
    return Math.abs(currentPos - otherPos) === 1;
  });
}

/**
 * Find groups of adjacent seats that can accommodate the required party size
 */
function findAdjacentSeatGroups(
  seats: SeatInfo[],
  count: number,
  prefs: SeatPreferences
): SeatRecommendation[] {
  if (count === 1) {
    return seats.map((seat) => {
      const seatScore = scoreSeat(seat, prefs);
      return {
        seats: [seat],
        totalScore: seatScore,
        averageScore: seatScore,
      };
    });
  }

  const recommendations: SeatRecommendation[] = [];
  const processedGroups = new Set<string>();

  // Group seats by coach and row
  const seatsByRow = new Map<string, SeatInfo[]>();
  for (const seat of seats) {
    const key = `${seat.coach}-${seat.row}`;
    if (!seatsByRow.has(key)) {
      seatsByRow.set(key, []);
    }
    seatsByRow.get(key)!.push(seat);
  }

  // For each row, find consecutive seat groups
  for (const [, rowSeats] of seatsByRow) {
    if (rowSeats.length < count) continue;

    // Sort by position
    const positionOrder = { A: 0, B: 1, C: 2, D: 3 } as const;
    const sortedSeats = [...rowSeats].sort(
      (a, b) => positionOrder[a.position] - positionOrder[b.position]
    );

    // Find consecutive groups
    for (let i = 0; i <= sortedSeats.length - count; i++) {
      const group = sortedSeats.slice(i, i + count);

      // Check if positions are consecutive
      let isConsecutive = true;
      for (let j = 1; j < group.length; j++) {
        const prevSeat = group[j - 1];
        const currSeat = group[j];
        if (!prevSeat || !currSeat) {
          isConsecutive = false;
          break;
        }
        const prevPos = positionOrder[prevSeat.position];
        const currPos = positionOrder[currSeat.position];
        if (currPos - prevPos !== 1) {
          isConsecutive = false;
          break;
        }
      }

      if (!isConsecutive) continue;

      // Create unique key for this group
      const groupKey = group.map((s) => `${s.coach}-${s.seatNumber}`).join('|');
      if (processedGroups.has(groupKey)) continue;
      processedGroups.add(groupKey);

      // Score the group
      const scores = group.map((s) => scoreSeat(s, prefs));
      const totalScore = scores.reduce((sum, s) => sum + s, 0);

      recommendations.push({
        seats: group,
        totalScore,
        averageScore: totalScore / count,
      });
    }
  }

  return recommendations;
}

/**
 * Get all seats for a specific coach class and train type
 */
function getSeatsByClassForTrain(trainType: TrainType, coachClass: CoachClass): SeatInfo[] {
  const config = getTrainConfig(trainType);
  if (!config) return [];

  const coaches = config.classLayout[coachClass];
  const allSeats: SeatInfo[] = [];

  for (const coach of coaches) {
    allSeats.push(...getSeatsByCoachForTrain(trainType, coach));
  }

  return allSeats;
}

/**
 * Recommend seats based on preferences (defaults to e320 for backwards compatibility)
 * Returns the top N seats (or seat groups for traveling together) sorted by score
 */
export function recommendSeats(
  coachClass: CoachClass,
  prefs: Partial<SeatPreferences> = {},
  count: number = 5
): SeatRecommendation[] {
  return recommendSeatsForTrain('e320', coachClass, prefs, count);
}

/**
 * Recommend seats for a specific train type based on preferences
 * Returns the top N seats (or seat groups for traveling together) sorted by score
 */
export function recommendSeatsForTrain(
  trainType: TrainType,
  coachClass: CoachClass,
  prefs: Partial<SeatPreferences> = {},
  count: number = 5
): SeatRecommendation[] {
  const fullPrefs: SeatPreferences = { ...defaultPreferences, ...prefs };
  const seats = getSeatsByClassForTrain(trainType, coachClass);

  // Validate travelingTogether
  const partySize = Math.min(Math.max(fullPrefs.travelingTogether, 1), 4);

  // Find seat groups
  const recommendations = findAdjacentSeatGroups(seats, partySize, fullPrefs);

  // Sort by average score (descending)
  recommendations.sort((a, b) => b.averageScore - a.averageScore);

  // Return top N
  return recommendations.slice(0, count);
}
