import { describe, it, expect } from 'vitest';
import {
  getE300SeatInfo,
  getE300SeatsByCoach,
  getE300TotalSeatCount,
  getE300SeatCountsByCoach,
  e300Config,
} from '../index.js';

describe('e300-seats', () => {
  describe('getE300SeatInfo', () => {
    it('should return seat info for a valid seat in coach 1', () => {
      const seat = getE300SeatInfo(1, '11');

      expect(seat).toBeDefined();
      expect(seat?.coach).toBe(1);
      expect(seat?.seatNumber).toBe('11');
      expect(seat?.class).toBe('business-premier');
    });

    it('should return seat info for a valid seat in standard class', () => {
      const seat = getE300SeatInfo(5, '31');

      expect(seat).toBeDefined();
      expect(seat?.coach).toBe(5);
      expect(seat?.seatNumber).toBe('31');
      expect(seat?.class).toBe('standard');
    });

    it('should return undefined for non-existent seat', () => {
      const seat = getE300SeatInfo(1, '99');

      expect(seat).toBeUndefined();
    });

    it('should return undefined for non-existent coach', () => {
      const seat = getE300SeatInfo(99, '11');

      expect(seat).toBeUndefined();
    });

    it('should return correct position for seat 11 (position A)', () => {
      const seat = getE300SeatInfo(1, '11');

      expect(seat?.position).toBe('A');
      expect(seat?.row).toBe(1);
    });

    it('should return correct position for seat 12 (position B)', () => {
      const seat = getE300SeatInfo(1, '12');

      expect(seat?.position).toBe('B');
    });
  });

  describe('getE300SeatsByCoach', () => {
    it('should return 27 seats for Business Premier coach 1 (2+1 seating, 9 rows)', () => {
      const seats = getE300SeatsByCoach(1);

      expect(seats.length).toBe(27);
    });

    it('should return 27 seats for Business Premier coach 2', () => {
      const seats = getE300SeatsByCoach(2);

      expect(seats.length).toBe(27);
    });

    it('should return 42 seats for Standard Premier coach 3 (2+1 seating, 14 rows)', () => {
      const seats = getE300SeatsByCoach(3);

      expect(seats.length).toBe(42);
    });

    it('should return 44 seats for Standard coach 5 (2+2 seating, 11 rows)', () => {
      const seats = getE300SeatsByCoach(5);

      expect(seats.length).toBe(44);
    });

    it('should return 48 seats for Standard coach 6 (2+2 seating, 12 rows)', () => {
      const seats = getE300SeatsByCoach(6);

      expect(seats.length).toBe(48);
    });

    it('should return empty array for non-existent coach', () => {
      const seats = getE300SeatsByCoach(99);

      expect(seats).toEqual([]);
    });

    it('should return all Business Premier seats with class business-premier', () => {
      const seats = getE300SeatsByCoach(1);

      expect(seats.every((s) => s.class === 'business-premier')).toBe(true);
    });

    it('should return all Standard seats with class standard', () => {
      const seats = getE300SeatsByCoach(5);

      expect(seats.every((s) => s.class === 'standard')).toBe(true);
    });
  });

  describe('getE300TotalSeatCount', () => {
    it('should return approximately 770-780 total seats', () => {
      const total = getE300TotalSeatCount();

      expect(total).toBeGreaterThanOrEqual(770);
      expect(total).toBeLessThanOrEqual(780);
    });

    it('should match the sum of seats across all 18 coaches', () => {
      const total = getE300TotalSeatCount();
      let calculatedTotal = 0;

      for (let coach = 1; coach <= 18; coach++) {
        calculatedTotal += getE300SeatsByCoach(coach).length;
      }

      expect(total).toBe(calculatedTotal);
    });
  });

  describe('getE300SeatCountsByCoach', () => {
    it('should return counts for all 18 coaches', () => {
      const counts = getE300SeatCountsByCoach();

      expect(counts.size).toBe(18);
    });

    it('should have correct count for coach 1', () => {
      const counts = getE300SeatCountsByCoach();

      expect(counts.get(1)).toBe(27);
    });
  });

  describe('problem seats with warnings', () => {
    it('should mark row 1 seats in coach 1 as near-toilet', () => {
      const seat = getE300SeatInfo(1, '11');

      expect(seat?.warnings).toContain('near-toilet');
    });

    it('should mark row 1 seats in coach 5 as near-toilet', () => {
      const seat = getE300SeatInfo(5, '11');

      expect(seat?.warnings).toContain('near-toilet');
    });

    it('should mark row 1 seats in coach 10 as near-toilet', () => {
      const seat = getE300SeatInfo(10, '11');

      expect(seat?.warnings).toContain('near-toilet');
    });

    it('should mark row 3 window seats as no-window (pillar blocks view)', () => {
      // Row 3 in standard class (2+2) - positions A and D are window positions
      const seatA = getE300SeatInfo(5, '31');
      const seatD = getE300SeatInfo(5, '34');

      expect(seatA?.warnings).toContain('no-window');
      expect(seatD?.warnings).toContain('no-window');
    });

    it('should mark row 6 window seats as no-window', () => {
      const seatA = getE300SeatInfo(5, '61');
      const seatD = getE300SeatInfo(5, '64');

      expect(seatA?.warnings).toContain('no-window');
      expect(seatD?.warnings).toContain('no-window');
    });

    it('should mark last row seats as limited-recline', () => {
      // Coach 5 has 11 rows, so last row is row 11 (seat numbers 111-114)
      const seats = getE300SeatsByCoach(5);
      const lastRowSeats = seats.filter((s) => s.row === 11);

      expect(lastRowSeats.length).toBeGreaterThan(0);
      expect(lastRowSeats.every((s) => s.warnings.includes('limited-recline'))).toBe(true);
    });

    it('should mark last row seats in coach 1 as limited-recline', () => {
      // Coach 1 has 9 rows, so last row is row 9 with seats 91-93
      const seat = getE300SeatInfo(1, '91');

      expect(seat).toBeDefined();
      expect(seat?.warnings).toContain('limited-recline');
    });
  });

  describe('Business Premier seats have table feature', () => {
    it('should have table feature for all Business Premier seats', () => {
      const coach1Seats = getE300SeatsByCoach(1);
      const coach2Seats = getE300SeatsByCoach(2);

      expect(coach1Seats.every((s) => s.features.includes('table'))).toBe(true);
      expect(coach2Seats.every((s) => s.features.includes('table'))).toBe(true);
    });

    it('should NOT have table feature for Standard seats', () => {
      const standardSeats = getE300SeatsByCoach(5);

      expect(standardSeats.every((s) => !s.features.includes('table'))).toBe(true);
    });

    it('should NOT have table feature for Standard Premier seats', () => {
      const standardPremierSeats = getE300SeatsByCoach(3);

      expect(standardPremierSeats.every((s) => !s.features.includes('table'))).toBe(true);
    });
  });

  describe('quiet zone coaches (11-12) have quiet feature', () => {
    it('should have quiet feature for all coach 11 seats', () => {
      const seats = getE300SeatsByCoach(11);

      expect(seats.every((s) => s.features.includes('quiet'))).toBe(true);
    });

    it('should have quiet feature for all coach 12 seats', () => {
      const seats = getE300SeatsByCoach(12);

      expect(seats.every((s) => s.features.includes('quiet'))).toBe(true);
    });

    it('should NOT have quiet feature for coach 10 seats', () => {
      const seats = getE300SeatsByCoach(10);

      expect(seats.every((s) => !s.features.includes('quiet'))).toBe(true);
    });

    it('should NOT have quiet feature for coach 13 seats', () => {
      const seats = getE300SeatsByCoach(13);

      expect(seats.every((s) => !s.features.includes('quiet'))).toBe(true);
    });
  });

  describe('all seats have power feature', () => {
    it('should have power feature for all e300 seats', () => {
      for (let coach = 1; coach <= 18; coach++) {
        const seats = getE300SeatsByCoach(coach);
        expect(seats.every((s) => s.features.includes('power'))).toBe(true);
      }
    });
  });

  describe('e300Config', () => {
    it('should have correct coach count', () => {
      expect(e300Config.coachCount).toBe(18);
    });

    it('should have correct class layout for business-premier', () => {
      expect(e300Config.classLayout['business-premier']).toEqual([1, 2]);
    });

    it('should have correct class layout for standard-premier', () => {
      expect(e300Config.classLayout['standard-premier']).toEqual([3, 4]);
    });

    it('should have correct class layout for standard', () => {
      expect(e300Config.classLayout['standard']).toEqual([5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18]);
    });
  });
});
