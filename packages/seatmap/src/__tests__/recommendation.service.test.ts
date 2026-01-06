import { describe, it, expect } from 'vitest';
import type { SeatInfo } from '../types.js';
import {
  scoreSeat,
  recommendSeats,
  getAdjacentSeats,
  defaultPreferences,
  type SeatPreferences,
} from '../services/recommendation.service.js';
import { getSeatsByCoach } from '../index.js';

describe('recommendation.service', () => {
  describe('scoreSeat', () => {
    const baseSeat: SeatInfo = {
      seatNumber: '31',
      coach: 5,
      class: 'standard',
      features: ['power', 'facing-forward'],
      warnings: [],
      row: 3,
      position: 'B',
    };

    it('should start with base score of 50', () => {
      const prefs: SeatPreferences = {
        ...defaultPreferences,
        preferWindow: false,
      };
      const score = scoreSeat(baseSeat, prefs);

      // Base 50, no preferences matched
      expect(score).toBe(50);
    });

    it('should add 10 points for matching window preference', () => {
      const windowSeat: SeatInfo = {
        ...baseSeat,
        features: ['power', 'window', 'facing-forward'],
        position: 'A',
      };
      const prefs: SeatPreferences = {
        ...defaultPreferences,
        preferWindow: true,
      };

      const score = scoreSeat(windowSeat, prefs);

      // Base 50 + 10 for window = 60
      expect(score).toBe(60);
    });

    it('should subtract 5 points for unmet window preference', () => {
      const aisleSeat: SeatInfo = {
        ...baseSeat,
        features: ['power', 'aisle', 'facing-forward'],
        position: 'B',
      };
      const prefs: SeatPreferences = {
        ...defaultPreferences,
        preferWindow: true,
      };

      const score = scoreSeat(aisleSeat, prefs);

      // Base 50 - 5 for no window = 45
      expect(score).toBe(45);
    });

    it('should add 10 points for matching quiet preference', () => {
      const quietSeat: SeatInfo = {
        ...baseSeat,
        features: ['power', 'quiet', 'facing-forward'],
      };
      const prefs: SeatPreferences = {
        ...defaultPreferences,
        preferWindow: false,
        preferQuiet: true,
      };

      const score = scoreSeat(quietSeat, prefs);

      // Base 50 + 10 for quiet = 60
      expect(score).toBe(60);
    });

    it('should subtract 5 points for unmet quiet preference', () => {
      const prefs: SeatPreferences = {
        ...defaultPreferences,
        preferWindow: false,
        preferQuiet: true,
      };

      const score = scoreSeat(baseSeat, prefs);

      // Base 50 - 5 for no quiet = 45
      expect(score).toBe(45);
    });

    it('should add 10 points for matching table preference', () => {
      const tableSeat: SeatInfo = {
        ...baseSeat,
        class: 'business-premier',
        features: ['power', 'table', 'facing-forward'],
      };
      const prefs: SeatPreferences = {
        ...defaultPreferences,
        preferWindow: false,
        preferTable: true,
      };

      const score = scoreSeat(tableSeat, prefs);

      // Base 50 + 10 for table = 60
      expect(score).toBe(60);
    });

    it('should subtract 15 points for near-toilet warning when avoided', () => {
      const toiletSeat: SeatInfo = {
        ...baseSeat,
        warnings: ['near-toilet'],
      };
      const prefs: SeatPreferences = {
        ...defaultPreferences,
        preferWindow: false,
        avoidToilet: true,
      };

      const score = scoreSeat(toiletSeat, prefs);

      // Base 50 - 15 for near-toilet = 35
      expect(score).toBe(35);
    });

    it('should subtract 15 points for no-window warning when avoided', () => {
      const noWindowSeat: SeatInfo = {
        ...baseSeat,
        warnings: ['no-window'],
      };
      const prefs: SeatPreferences = {
        ...defaultPreferences,
        preferWindow: false,
        avoidNoWindow: true,
      };

      const score = scoreSeat(noWindowSeat, prefs);

      // Base 50 - 15 for no-window = 35
      expect(score).toBe(35);
    });

    it('should subtract 5 points for limited-recline warning', () => {
      const limitedReclineSeat: SeatInfo = {
        ...baseSeat,
        warnings: ['limited-recline'],
      };
      const prefs: SeatPreferences = {
        ...defaultPreferences,
        preferWindow: false,
      };

      const score = scoreSeat(limitedReclineSeat, prefs);

      // Base 50 - 5 for limited-recline = 45
      expect(score).toBe(45);
    });

    it('should add 10 points for matching facing-forward preference', () => {
      const prefs: SeatPreferences = {
        ...defaultPreferences,
        preferWindow: false,
        facingPreference: 'forward',
      };

      const score = scoreSeat(baseSeat, prefs);

      // Base 50 + 10 for facing-forward = 60
      expect(score).toBe(60);
    });

    it('should subtract 5 points for unmet facing-forward preference', () => {
      const backwardSeat: SeatInfo = {
        ...baseSeat,
        features: ['power', 'facing-backward'],
      };
      const prefs: SeatPreferences = {
        ...defaultPreferences,
        preferWindow: false,
        facingPreference: 'forward',
      };

      const score = scoreSeat(backwardSeat, prefs);

      // Base 50 - 5 for not facing-forward = 45
      expect(score).toBe(45);
    });

    it('should accumulate multiple preference bonuses', () => {
      const idealSeat: SeatInfo = {
        seatNumber: '11',
        coach: 9,
        class: 'standard',
        features: ['power', 'window', 'quiet', 'facing-forward'],
        warnings: [],
        row: 1,
        position: 'A',
      };
      const prefs: SeatPreferences = {
        ...defaultPreferences,
        preferWindow: true,
        preferQuiet: true,
        facingPreference: 'forward',
      };

      const score = scoreSeat(idealSeat, prefs);

      // Base 50 + 10 window + 10 quiet + 10 forward = 80
      expect(score).toBe(80);
    });

    it('should accumulate multiple warning penalties', () => {
      const problematicSeat: SeatInfo = {
        ...baseSeat,
        warnings: ['near-toilet', 'limited-recline', 'no-window'],
      };
      const prefs: SeatPreferences = {
        ...defaultPreferences,
        preferWindow: false,
        avoidToilet: true,
        avoidNoWindow: true,
      };

      const score = scoreSeat(problematicSeat, prefs);

      // Base 50 - 15 toilet - 15 no-window - 5 limited-recline = 15
      expect(score).toBe(15);
    });
  });

  describe('recommendSeats', () => {
    it('should return seats sorted by score (highest first)', () => {
      const recommendations = recommendSeats('standard', { preferWindow: true }, 10);

      expect(recommendations.length).toBeGreaterThan(0);
      for (let i = 1; i < recommendations.length; i++) {
        expect(recommendations[i]!.averageScore).toBeLessThanOrEqual(
          recommendations[i - 1]!.averageScore
        );
      }
    });

    it('should return the requested number of recommendations', () => {
      const recommendations = recommendSeats('standard', {}, 5);

      expect(recommendations.length).toBe(5);
    });

    it('should filter by coach class (business-premier)', () => {
      const recommendations = recommendSeats('business-premier', {}, 5);

      expect(recommendations.length).toBeGreaterThan(0);
      for (const rec of recommendations) {
        expect(rec.seats.every((s) => s.class === 'business-premier')).toBe(true);
      }
    });

    it('should filter by coach class (standard-premier)', () => {
      const recommendations = recommendSeats('standard-premier', {}, 5);

      expect(recommendations.length).toBeGreaterThan(0);
      for (const rec of recommendations) {
        expect(rec.seats.every((s) => s.class === 'standard-premier')).toBe(true);
      }
    });

    it('should prefer quiet zone seats when preferQuiet is true', () => {
      const recommendations = recommendSeats('standard', { preferQuiet: true }, 5);

      // The top recommendations should have quiet seats
      const topRec = recommendations[0];
      expect(topRec?.seats.some((s) => s.features.includes('quiet'))).toBe(true);
    });

    it('should prefer window seats when preferWindow is true', () => {
      const recommendations = recommendSeats('standard', { preferWindow: true }, 5);

      // Top recommendations should prioritize window seats
      const topRec = recommendations[0];
      expect(topRec?.seats.some((s) => s.features.includes('window'))).toBe(true);
    });

    it('should apply default preferences when none provided', () => {
      const recommendations = recommendSeats('standard');

      expect(recommendations.length).toBeGreaterThan(0);
      // Default prefers window, avoids toilet and no-window
      const topRec = recommendations[0];
      expect(topRec).toBeDefined();
    });
  });

  describe('getAdjacentSeats', () => {
    it('should find adjacent seats in same row (2+2 layout)', () => {
      const seats = getSeatsByCoach(5);
      const seatB = seats.find((s) => s.seatNumber === '32'); // Position B, row 3

      expect(seatB).toBeDefined();
      const adjacent = getAdjacentSeats(seatB!, seats);

      // Position B should be adjacent to A and C
      expect(adjacent.length).toBe(2);
      expect(adjacent.some((s) => s.position === 'A')).toBe(true);
      expect(adjacent.some((s) => s.position === 'C')).toBe(true);
    });

    it('should find adjacent seats for corner seat (position A)', () => {
      const seats = getSeatsByCoach(5);
      const seatA = seats.find((s) => s.seatNumber === '31'); // Position A, row 3

      expect(seatA).toBeDefined();
      const adjacent = getAdjacentSeats(seatA!, seats);

      // Position A should only be adjacent to B
      expect(adjacent.length).toBe(1);
      expect(adjacent[0]?.position).toBe('B');
    });

    it('should find adjacent seats for corner seat (position D)', () => {
      const seats = getSeatsByCoach(5);
      const seatD = seats.find((s) => s.seatNumber === '34'); // Position D, row 3

      expect(seatD).toBeDefined();
      const adjacent = getAdjacentSeats(seatD!, seats);

      // Position D should only be adjacent to C
      expect(adjacent.length).toBe(1);
      expect(adjacent[0]?.position).toBe('C');
    });

    it('should find adjacent seats in 2+1 layout (Business Premier)', () => {
      const seats = getSeatsByCoach(1);
      const seatB = seats.find((s) => s.seatNumber === '32'); // Position B, row 3

      expect(seatB).toBeDefined();
      const adjacent = getAdjacentSeats(seatB!, seats);

      // Position B in 2+1 should be adjacent to A and C
      expect(adjacent.length).toBe(2);
    });

    it('should not return seats from different rows', () => {
      const seats = getSeatsByCoach(5);
      const seatB = seats.find((s) => s.seatNumber === '32'); // Position B, row 3

      expect(seatB).toBeDefined();
      const adjacent = getAdjacentSeats(seatB!, seats);

      // All adjacent seats should be in row 3
      expect(adjacent.every((s) => s.row === 3)).toBe(true);
    });

    it('should not return seats from different coaches', () => {
      const seatsCoach5 = getSeatsByCoach(5);
      const seatsCoach6 = getSeatsByCoach(6);
      const allSeats = [...seatsCoach5, ...seatsCoach6];

      const seatB = seatsCoach5.find((s) => s.seatNumber === '32');

      expect(seatB).toBeDefined();
      const adjacent = getAdjacentSeats(seatB!, allSeats);

      // All adjacent seats should be in coach 5
      expect(adjacent.every((s) => s.coach === 5)).toBe(true);
    });
  });

  describe('group recommendations (travelingTogether > 1)', () => {
    it('should return groups of 2 adjacent seats when travelingTogether is 2', () => {
      const recommendations = recommendSeats('standard', { travelingTogether: 2 }, 5);

      expect(recommendations.length).toBeGreaterThan(0);
      for (const rec of recommendations) {
        expect(rec.seats.length).toBe(2);
        // Check seats are in same row
        expect(rec.seats[0]?.row).toBe(rec.seats[1]?.row);
        // Check seats are in same coach
        expect(rec.seats[0]?.coach).toBe(rec.seats[1]?.coach);
      }
    });

    it('should return groups of 3 adjacent seats when travelingTogether is 3', () => {
      const recommendations = recommendSeats('standard', { travelingTogether: 3 }, 5);

      expect(recommendations.length).toBeGreaterThan(0);
      for (const rec of recommendations) {
        expect(rec.seats.length).toBe(3);
        // Check seats are in same row
        const row = rec.seats[0]?.row;
        expect(rec.seats.every((s) => s.row === row)).toBe(true);
      }
    });

    it('should return groups of 4 adjacent seats when travelingTogether is 4', () => {
      const recommendations = recommendSeats('standard', { travelingTogether: 4 }, 5);

      expect(recommendations.length).toBeGreaterThan(0);
      for (const rec of recommendations) {
        expect(rec.seats.length).toBe(4);
        // In 2+2 layout, 4 seats = A, B, C, D (all positions in a row)
        const positions = rec.seats.map((s) => s.position).sort();
        expect(positions).toEqual(['A', 'B', 'C', 'D']);
      }
    });

    it('should calculate totalScore as sum of individual seat scores', () => {
      const prefs: SeatPreferences = { ...defaultPreferences, travelingTogether: 2 };
      const recommendations = recommendSeats('standard', prefs, 1);

      expect(recommendations.length).toBe(1);
      const rec = recommendations[0]!;

      const individualScores = rec.seats.map((s) => scoreSeat(s, prefs));
      const expectedTotal = individualScores.reduce((sum, s) => sum + s, 0);

      expect(rec.totalScore).toBe(expectedTotal);
    });

    it('should calculate averageScore correctly', () => {
      const recommendations = recommendSeats('standard', { travelingTogether: 2 }, 1);

      expect(recommendations.length).toBe(1);
      const rec = recommendations[0]!;

      expect(rec.averageScore).toBe(rec.totalScore / 2);
    });

    it('should not find groups of 4 in 2+1 layout (Business Premier)', () => {
      const recommendations = recommendSeats('business-premier', { travelingTogether: 4 }, 5);

      // 2+1 layout only has 3 seats per row, so no groups of 4
      expect(recommendations.length).toBe(0);
    });

    it('should limit party size to maximum of 4', () => {
      // travelingTogether: 10 should be capped to 4
      const recommendations = recommendSeats('standard', { travelingTogether: 10 }, 5);

      expect(recommendations.length).toBeGreaterThan(0);
      for (const rec of recommendations) {
        expect(rec.seats.length).toBe(4);
      }
    });

    it('should ensure minimum party size of 1', () => {
      // travelingTogether: 0 should be treated as 1
      const recommendations = recommendSeats('standard', { travelingTogether: 0 }, 5);

      expect(recommendations.length).toBeGreaterThan(0);
      for (const rec of recommendations) {
        expect(rec.seats.length).toBe(1);
      }
    });
  });

  describe('preferences are applied correctly', () => {
    it('should prefer forward-facing seats when facingPreference is forward', () => {
      const recommendations = recommendSeats('standard', { facingPreference: 'forward' }, 10);

      // Top recommendations should have forward-facing seats
      const topRec = recommendations[0];
      expect(topRec?.seats.every((s) => s.features.includes('facing-forward'))).toBe(true);
    });

    it('should avoid near-toilet seats when avoidToilet is true', () => {
      const recommendations = recommendSeats('standard', { avoidToilet: true }, 10);

      // Top recommendations should not have near-toilet warnings
      const topRecs = recommendations.slice(0, 3);
      for (const rec of topRecs) {
        expect(rec.seats.every((s) => !s.warnings.includes('near-toilet'))).toBe(true);
      }
    });

    it('should avoid no-window seats when avoidNoWindow is true', () => {
      const recommendations = recommendSeats('standard', { avoidNoWindow: true }, 10);

      // Top recommendations should not have no-window warnings
      const topRecs = recommendations.slice(0, 3);
      for (const rec of topRecs) {
        expect(rec.seats.every((s) => !s.warnings.includes('no-window'))).toBe(true);
      }
    });

    it('should combine multiple preferences correctly', () => {
      const recommendations = recommendSeats(
        'standard',
        {
          preferWindow: true,
          preferQuiet: true,
          facingPreference: 'forward',
          avoidToilet: true,
        },
        5
      );

      // The top recommendation should ideally have window, quiet, forward-facing, no toilet
      const topRec = recommendations[0];
      expect(topRec).toBeDefined();
      expect(topRec?.averageScore).toBeGreaterThan(50); // Should be above baseline
    });
  });
});
