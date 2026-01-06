import { describe, it, expect } from 'vitest';
import {
  getHistoricalData,
  getAverageWaitTime,
  getAllDataForTerminal,
} from '../repository/queue.repository.js';
import type { Terminal, DayOfWeek } from '../types.js';

const ALL_TERMINALS: Terminal[] = [
  'st-pancras',
  'gare-du-nord',
  'brussels-midi',
  'amsterdam-centraal',
];

describe('Queue Repository', () => {
  describe('getHistoricalData', () => {
    it('should return data for valid terminal, day, and hour', () => {
      const data = getHistoricalData('st-pancras', 'monday', 8);
      expect(data).toBeDefined();
      expect(data?.terminal).toBe('st-pancras');
      expect(data?.dayOfWeek).toBe('monday');
      expect(data?.hour).toBe(8);
    });

    it('should return undefined for invalid hour (negative)', () => {
      const data = getHistoricalData('st-pancras', 'monday', -1);
      expect(data).toBeUndefined();
    });

    it('should return undefined for invalid hour (greater than 23)', () => {
      const data = getHistoricalData('st-pancras', 'monday', 24);
      expect(data).toBeUndefined();
    });

    it('should return correct data for all terminals', () => {
      for (const terminal of ALL_TERMINALS) {
        const data = getHistoricalData(terminal, 'wednesday', 12);
        expect(data).toBeDefined();
        expect(data?.terminal).toBe(terminal);
      }
    });

    it('should return data with avgWaitMinutes property', () => {
      const data = getHistoricalData('gare-du-nord', 'friday', 17);
      expect(data).toBeDefined();
      expect(typeof data?.avgWaitMinutes).toBe('number');
      expect(data?.avgWaitMinutes).toBeGreaterThanOrEqual(0);
    });

    it('should return data with sampleCount property', () => {
      const data = getHistoricalData('brussels-midi', 'saturday', 10);
      expect(data).toBeDefined();
      expect(typeof data?.sampleCount).toBe('number');
      expect(data?.sampleCount).toBeGreaterThan(0);
    });
  });

  describe('getAverageWaitTime', () => {
    it('should return a number for valid inputs', () => {
      const waitTime = getAverageWaitTime('st-pancras', 'monday', 8);
      expect(typeof waitTime).toBe('number');
    });

    it('should return reasonable wait times (0-60 minutes)', () => {
      for (const terminal of ALL_TERMINALS) {
        const days: DayOfWeek[] = ['monday', 'friday', 'sunday'];
        const hours = [6, 12, 18];

        for (const day of days) {
          for (const hour of hours) {
            const waitTime = getAverageWaitTime(terminal, day, hour);
            expect(waitTime).toBeGreaterThanOrEqual(0);
            expect(waitTime).toBeLessThanOrEqual(60);
          }
        }
      }
    });

    it('should return 0 for invalid hour', () => {
      const waitTime = getAverageWaitTime('st-pancras', 'monday', 25);
      expect(waitTime).toBe(0);
    });

    it('should return higher values during peak hours than night hours', () => {
      const peakWait = getAverageWaitTime('st-pancras', 'monday', 8); // Morning peak
      const nightWait = getAverageWaitTime('st-pancras', 'monday', 3); // Night

      expect(peakWait).toBeGreaterThan(nightWait);
    });

    it('should return consistent values for same inputs', () => {
      const wait1 = getAverageWaitTime('gare-du-nord', 'tuesday', 14);
      const wait2 = getAverageWaitTime('gare-du-nord', 'tuesday', 14);
      expect(wait1).toBe(wait2);
    });
  });

  describe('getAllDataForTerminal', () => {
    it('should return 168 entries for each terminal (7 days * 24 hours)', () => {
      for (const terminal of ALL_TERMINALS) {
        const data = getAllDataForTerminal(terminal);
        expect(data).toHaveLength(168);
      }
    });

    it('should return data only for the specified terminal', () => {
      const data = getAllDataForTerminal('st-pancras');
      for (const entry of data) {
        expect(entry.terminal).toBe('st-pancras');
      }
    });

    it('should return data covering all hours 0-23', () => {
      const data = getAllDataForTerminal('gare-du-nord');
      const hours = new Set(data.map((d) => d.hour));
      expect(hours.size).toBe(24);
      for (let hour = 0; hour < 24; hour++) {
        expect(hours.has(hour)).toBe(true);
      }
    });

    it('should return data covering all days of the week', () => {
      const data = getAllDataForTerminal('brussels-midi');
      const days = new Set(data.map((d) => d.dayOfWeek));
      expect(days.size).toBe(7);
      const expectedDays: DayOfWeek[] = [
        'monday',
        'tuesday',
        'wednesday',
        'thursday',
        'friday',
        'saturday',
        'sunday',
      ];
      for (const day of expectedDays) {
        expect(days.has(day)).toBe(true);
      }
    });

    it('should return valid HistoricalData entries', () => {
      const data = getAllDataForTerminal('amsterdam-centraal');
      for (const entry of data) {
        expect(entry).toHaveProperty('terminal');
        expect(entry).toHaveProperty('dayOfWeek');
        expect(entry).toHaveProperty('hour');
        expect(entry).toHaveProperty('avgWaitMinutes');
        expect(entry).toHaveProperty('sampleCount');
        expect(typeof entry.avgWaitMinutes).toBe('number');
        expect(typeof entry.sampleCount).toBe('number');
      }
    });
  });
});
