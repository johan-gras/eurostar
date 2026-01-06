import { describe, it, expect } from 'vitest';
import {
  getSeatInfo,
  getSeatsByCoach,
  getTotalSeatCount,
  getSeatCountsByCoach,
  e320Config,
} from '../index.js';

describe('e320-seats', () => {
  describe('getSeatInfo', () => {
    it('should return seat info for a valid seat in coach 1', () => {
      const seat = getSeatInfo(1, '11');

      expect(seat).toBeDefined();
      expect(seat?.coach).toBe(1);
      expect(seat?.seatNumber).toBe('11');
      expect(seat?.class).toBe('business-premier');
    });

    it('should return seat info for a valid seat in standard class', () => {
      const seat = getSeatInfo(5, '31');

      expect(seat).toBeDefined();
      expect(seat?.coach).toBe(5);
      expect(seat?.seatNumber).toBe('31');
      expect(seat?.class).toBe('standard');
    });

    it('should return undefined for non-existent seat', () => {
      const seat = getSeatInfo(1, '99');

      expect(seat).toBeUndefined();
    });

    it('should return undefined for non-existent coach', () => {
      const seat = getSeatInfo(99, '11');

      expect(seat).toBeUndefined();
    });

    it('should return correct position for seat 11 (position A)', () => {
      const seat = getSeatInfo(1, '11');

      expect(seat?.position).toBe('A');
      expect(seat?.row).toBe(1);
    });

    it('should return correct position for seat 12 (position B)', () => {
      const seat = getSeatInfo(1, '12');

      expect(seat?.position).toBe('B');
    });
  });

  describe('getSeatsByCoach', () => {
    it('should return 30 seats for Business Premier coach 1 (2+1 seating, 10 rows)', () => {
      const seats = getSeatsByCoach(1);

      expect(seats.length).toBe(30);
    });

    it('should return 30 seats for Business Premier coach 2', () => {
      const seats = getSeatsByCoach(2);

      expect(seats.length).toBe(30);
    });

    it('should return 48 seats for Standard Premier coach 3 (2+1 seating, 16 rows)', () => {
      const seats = getSeatsByCoach(3);

      expect(seats.length).toBe(48);
    });

    it('should return 60 seats for Standard coach 5 (2+2 seating, 15 rows)', () => {
      const seats = getSeatsByCoach(5);

      expect(seats.length).toBe(60);
    });

    it('should return 64 seats for Standard coach 6 (2+2 seating, 16 rows)', () => {
      const seats = getSeatsByCoach(6);

      expect(seats.length).toBe(64);
    });

    it('should return empty array for non-existent coach', () => {
      const seats = getSeatsByCoach(99);

      expect(seats).toEqual([]);
    });

    it('should return all Business Premier seats with class business-premier', () => {
      const seats = getSeatsByCoach(1);

      expect(seats.every((s) => s.class === 'business-premier')).toBe(true);
    });

    it('should return all Standard seats with class standard', () => {
      const seats = getSeatsByCoach(5);

      expect(seats.every((s) => s.class === 'standard')).toBe(true);
    });
  });

  describe('getTotalSeatCount', () => {
    it('should return approximately 892-894 total seats', () => {
      const total = getTotalSeatCount();

      expect(total).toBeGreaterThanOrEqual(892);
      expect(total).toBeLessThanOrEqual(894);
    });

    it('should match the sum of seats across all coaches', () => {
      const total = getTotalSeatCount();
      let calculatedTotal = 0;

      for (let coach = 1; coach <= 16; coach++) {
        calculatedTotal += getSeatsByCoach(coach).length;
      }

      expect(total).toBe(calculatedTotal);
    });
  });

  describe('getSeatCountsByCoach', () => {
    it('should return counts for all 16 coaches', () => {
      const counts = getSeatCountsByCoach();

      expect(counts.size).toBe(16);
    });

    it('should have correct count for coach 1', () => {
      const counts = getSeatCountsByCoach();

      expect(counts.get(1)).toBe(30);
    });
  });

  describe('problem seats with warnings', () => {
    it('should mark row 1 seats in coach 1 as near-toilet', () => {
      const seat = getSeatInfo(1, '11');

      expect(seat?.warnings).toContain('near-toilet');
    });

    it('should mark row 1 seats in coach 5 as near-toilet', () => {
      const seat = getSeatInfo(5, '11');

      expect(seat?.warnings).toContain('near-toilet');
    });

    it('should mark row 1 seats in coach 9 as near-toilet', () => {
      const seat = getSeatInfo(9, '11');

      expect(seat?.warnings).toContain('near-toilet');
    });

    it('should mark row 2 window seats as no-window (pillar blocks view)', () => {
      // Row 2 in standard class (2+2) - positions A and D are window positions
      const seatA = getSeatInfo(5, '21');
      const seatD = getSeatInfo(5, '24');

      expect(seatA?.warnings).toContain('no-window');
      expect(seatD?.warnings).toContain('no-window');
    });

    it('should mark row 5 window seats as no-window', () => {
      const seatA = getSeatInfo(5, '51');
      const seatD = getSeatInfo(5, '54');

      expect(seatA?.warnings).toContain('no-window');
      expect(seatD?.warnings).toContain('no-window');
    });

    it('should mark last row seats as limited-recline', () => {
      // Coach 5 has 15 rows, so last row is row 15 (seat numbers 151-154)
      const seats = getSeatsByCoach(5);
      const lastRowSeats = seats.filter((s) => s.row === 15);

      expect(lastRowSeats.length).toBeGreaterThan(0);
      expect(lastRowSeats.every((s) => s.warnings.includes('limited-recline'))).toBe(true);
    });

    it('should mark last row seats in coach 1 as limited-recline', () => {
      // Coach 1 has 10 rows, so last row is row 10 with seats 101-103
      const seat = getSeatInfo(1, '101');

      expect(seat).toBeDefined();
      expect(seat?.warnings).toContain('limited-recline');
    });
  });

  describe('Business Premier seats have table feature', () => {
    it('should have table feature for all Business Premier seats', () => {
      const coach1Seats = getSeatsByCoach(1);
      const coach2Seats = getSeatsByCoach(2);

      expect(coach1Seats.every((s) => s.features.includes('table'))).toBe(true);
      expect(coach2Seats.every((s) => s.features.includes('table'))).toBe(true);
    });

    it('should NOT have table feature for Standard seats', () => {
      const standardSeats = getSeatsByCoach(5);

      expect(standardSeats.every((s) => !s.features.includes('table'))).toBe(true);
    });

    it('should NOT have table feature for Standard Premier seats', () => {
      const standardPremierSeats = getSeatsByCoach(3);

      expect(standardPremierSeats.every((s) => !s.features.includes('table'))).toBe(true);
    });
  });

  describe('quiet zone coaches (9-10) have quiet feature', () => {
    it('should have quiet feature for all coach 9 seats', () => {
      const seats = getSeatsByCoach(9);

      expect(seats.every((s) => s.features.includes('quiet'))).toBe(true);
    });

    it('should have quiet feature for all coach 10 seats', () => {
      const seats = getSeatsByCoach(10);

      expect(seats.every((s) => s.features.includes('quiet'))).toBe(true);
    });

    it('should NOT have quiet feature for coach 8 seats', () => {
      const seats = getSeatsByCoach(8);

      expect(seats.every((s) => !s.features.includes('quiet'))).toBe(true);
    });

    it('should NOT have quiet feature for coach 11 seats', () => {
      const seats = getSeatsByCoach(11);

      expect(seats.every((s) => !s.features.includes('quiet'))).toBe(true);
    });
  });

  describe('all seats have power feature', () => {
    it('should have power feature for all e320 seats', () => {
      for (let coach = 1; coach <= 16; coach++) {
        const seats = getSeatsByCoach(coach);
        expect(seats.every((s) => s.features.includes('power'))).toBe(true);
      }
    });
  });

  describe('e320Config', () => {
    it('should have correct coach count', () => {
      expect(e320Config.coachCount).toBe(16);
    });

    it('should have correct class layout for business-premier', () => {
      expect(e320Config.classLayout['business-premier']).toEqual([1, 2]);
    });

    it('should have correct class layout for standard-premier', () => {
      expect(e320Config.classLayout['standard-premier']).toEqual([3, 4]);
    });

    it('should have correct class layout for standard', () => {
      expect(e320Config.classLayout['standard']).toEqual([5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16]);
    });
  });
});
