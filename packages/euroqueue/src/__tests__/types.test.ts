import { describe, it, expect } from 'vitest';
import type {
  Terminal,
  DayOfWeek,
  TimeSlot,
  QueuePrediction,
  HistoricalData,
  CrowdLevel,
} from '../types.js';

describe('Type Definitions', () => {
  describe('Terminal type', () => {
    it('should accept valid terminal values', () => {
      const terminals: Terminal[] = [
        'st-pancras',
        'gare-du-nord',
        'brussels-midi',
        'amsterdam-centraal',
      ];
      expect(terminals).toHaveLength(4);
    });
  });

  describe('DayOfWeek type', () => {
    it('should accept all valid day values', () => {
      const days: DayOfWeek[] = [
        'monday',
        'tuesday',
        'wednesday',
        'thursday',
        'friday',
        'saturday',
        'sunday',
      ];
      expect(days).toHaveLength(7);
    });
  });

  describe('TimeSlot interface', () => {
    it('should accept valid hour and minute values', () => {
      const slot: TimeSlot = { hour: 14, minute: 30 };
      expect(slot.hour).toBe(14);
      expect(slot.minute).toBe(30);
    });

    it('should accept boundary values', () => {
      const midnight: TimeSlot = { hour: 0, minute: 0 };
      const endOfDay: TimeSlot = { hour: 23, minute: 59 };
      expect(midnight.hour).toBe(0);
      expect(endOfDay.hour).toBe(23);
    });
  });

  describe('QueuePrediction interface', () => {
    it('should accept valid prediction structure', () => {
      const prediction: QueuePrediction = {
        terminal: 'st-pancras',
        estimatedMinutes: 25,
        confidence: 'high',
        updatedAt: new Date(),
      };
      expect(prediction.terminal).toBe('st-pancras');
      expect(prediction.estimatedMinutes).toBe(25);
      expect(prediction.confidence).toBe('high');
      expect(prediction.updatedAt).toBeInstanceOf(Date);
    });

    it('should accept all confidence levels', () => {
      const confidenceLevels: QueuePrediction['confidence'][] = ['low', 'medium', 'high'];
      expect(confidenceLevels).toHaveLength(3);
    });
  });

  describe('HistoricalData interface', () => {
    it('should accept valid historical data structure', () => {
      const data: HistoricalData = {
        terminal: 'gare-du-nord',
        dayOfWeek: 'friday',
        hour: 17,
        avgWaitMinutes: 35,
        sampleCount: 120,
      };
      expect(data.terminal).toBe('gare-du-nord');
      expect(data.dayOfWeek).toBe('friday');
      expect(data.hour).toBe(17);
      expect(data.avgWaitMinutes).toBe(35);
      expect(data.sampleCount).toBe(120);
    });
  });

  describe('CrowdLevel type', () => {
    it('should accept all valid crowd level values', () => {
      const levels: CrowdLevel[] = ['very-low', 'low', 'moderate', 'high', 'very-high'];
      expect(levels).toHaveLength(5);
    });
  });
});
