import { describe, it, expect } from 'vitest';
import type {
  TrainType,
  CoachClass,
  SeatFeature,
  SeatWarning,
  SeatPosition,
  SeatInfo,
} from '../types.js';

describe('types', () => {
  describe('TrainType', () => {
    it('should allow valid train types', () => {
      const e320: TrainType = 'e320';
      const e300: TrainType = 'e300';
      const classic: TrainType = 'classic';
      const ruby: TrainType = 'ruby';

      expect(e320).toBe('e320');
      expect(e300).toBe('e300');
      expect(classic).toBe('classic');
      expect(ruby).toBe('ruby');
    });
  });

  describe('CoachClass', () => {
    it('should allow valid coach classes', () => {
      const standard: CoachClass = 'standard';
      const standardPremier: CoachClass = 'standard-premier';
      const businessPremier: CoachClass = 'business-premier';

      expect(standard).toBe('standard');
      expect(standardPremier).toBe('standard-premier');
      expect(businessPremier).toBe('business-premier');
    });
  });

  describe('SeatFeature', () => {
    it('should allow all valid seat features', () => {
      const features: SeatFeature[] = [
        'window',
        'aisle',
        'table',
        'power',
        'quiet',
        'accessible',
        'duo',
        'facing-forward',
        'facing-backward',
      ];

      expect(features).toHaveLength(9);
      expect(features).toContain('window');
      expect(features).toContain('facing-forward');
    });
  });

  describe('SeatWarning', () => {
    it('should allow all valid seat warnings', () => {
      const warnings: SeatWarning[] = [
        'no-window',
        'limited-recline',
        'near-toilet',
        'near-galley',
        'misaligned-window',
      ];

      expect(warnings).toHaveLength(5);
      expect(warnings).toContain('near-toilet');
      expect(warnings).toContain('limited-recline');
    });
  });

  describe('SeatPosition', () => {
    it('should allow valid seat positions', () => {
      const positions: SeatPosition[] = ['A', 'B', 'C', 'D'];

      expect(positions).toHaveLength(4);
      expect(positions).toContain('A');
      expect(positions).toContain('D');
    });
  });

  describe('SeatInfo', () => {
    it('should allow valid SeatInfo objects', () => {
      const seatInfo: SeatInfo = {
        seatNumber: '21',
        coach: 5,
        class: 'standard',
        features: ['window', 'power', 'facing-forward'],
        warnings: [],
        row: 2,
        position: 'A',
      };

      expect(seatInfo.seatNumber).toBe('21');
      expect(seatInfo.coach).toBe(5);
      expect(seatInfo.class).toBe('standard');
      expect(seatInfo.features).toContain('window');
      expect(seatInfo.warnings).toHaveLength(0);
      expect(seatInfo.row).toBe(2);
      expect(seatInfo.position).toBe('A');
    });

    it('should allow SeatInfo with warnings', () => {
      const seatInfo: SeatInfo = {
        seatNumber: '11',
        coach: 1,
        class: 'business-premier',
        features: ['power', 'table', 'facing-backward'],
        warnings: ['near-toilet'],
        row: 1,
        position: 'A',
      };

      expect(seatInfo.warnings).toContain('near-toilet');
      expect(seatInfo.features).toContain('table');
    });
  });
});
