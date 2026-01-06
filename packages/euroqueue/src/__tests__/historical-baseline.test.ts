import { describe, it, expect } from 'vitest';
import {
  historicalBaseline,
  historicalBaselineMap,
  getHistoricalDataKey,
} from '../data/historical-baseline.js';
import type { Terminal, DayOfWeek } from '../types.js';

const ALL_TERMINALS: Terminal[] = [
  'st-pancras',
  'gare-du-nord',
  'brussels-midi',
  'amsterdam-centraal',
];

const ALL_DAYS: DayOfWeek[] = [
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
  'sunday',
];

const PEAK_MORNING_HOURS = [7, 8, 9];
const PEAK_EVENING_HOURS = [17, 18, 19];
const OFF_PEAK_HOURS = [2, 3, 4, 23]; // Night hours

describe('Historical Baseline Data', () => {
  describe('data generation completeness', () => {
    it('should generate data for all 4 terminals', () => {
      const terminalsInData = new Set(historicalBaseline.map((d) => d.terminal));
      expect(terminalsInData.size).toBe(4);
      for (const terminal of ALL_TERMINALS) {
        expect(terminalsInData.has(terminal)).toBe(true);
      }
    });

    it('should generate data for all 7 days of the week', () => {
      const daysInData = new Set(historicalBaseline.map((d) => d.dayOfWeek));
      expect(daysInData.size).toBe(7);
      for (const day of ALL_DAYS) {
        expect(daysInData.has(day)).toBe(true);
      }
    });

    it('should generate data for all 24 hours', () => {
      const hoursInData = new Set(historicalBaseline.map((d) => d.hour));
      expect(hoursInData.size).toBe(24);
      for (let hour = 0; hour < 24; hour++) {
        expect(hoursInData.has(hour)).toBe(true);
      }
    });

    it('should generate exactly 672 entries (4 terminals * 7 days * 24 hours)', () => {
      expect(historicalBaseline).toHaveLength(672);
    });
  });

  describe('peak hours patterns', () => {
    it('should have higher wait times during morning peak than off-peak', () => {
      for (const terminal of ALL_TERMINALS) {
        for (const day of ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'] as DayOfWeek[]) {
          const peakWaits = PEAK_MORNING_HOURS.map((hour) => {
            const key = getHistoricalDataKey(terminal, day, hour);
            return historicalBaselineMap.get(key)?.avgWaitMinutes ?? 0;
          });
          const avgPeakWait = peakWaits.reduce((a, b) => a + b, 0) / peakWaits.length;

          const offPeakWaits = OFF_PEAK_HOURS.map((hour) => {
            const key = getHistoricalDataKey(terminal, day, hour);
            return historicalBaselineMap.get(key)?.avgWaitMinutes ?? 0;
          });
          const avgOffPeakWait = offPeakWaits.reduce((a, b) => a + b, 0) / offPeakWaits.length;

          expect(avgPeakWait).toBeGreaterThan(avgOffPeakWait);
        }
      }
    });

    it('should have higher wait times during evening peak than off-peak', () => {
      for (const terminal of ALL_TERMINALS) {
        for (const day of ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'] as DayOfWeek[]) {
          const peakWaits = PEAK_EVENING_HOURS.map((hour) => {
            const key = getHistoricalDataKey(terminal, day, hour);
            return historicalBaselineMap.get(key)?.avgWaitMinutes ?? 0;
          });
          const avgPeakWait = peakWaits.reduce((a, b) => a + b, 0) / peakWaits.length;

          const offPeakWaits = OFF_PEAK_HOURS.map((hour) => {
            const key = getHistoricalDataKey(terminal, day, hour);
            return historicalBaselineMap.get(key)?.avgWaitMinutes ?? 0;
          });
          const avgOffPeakWait = offPeakWaits.reduce((a, b) => a + b, 0) / offPeakWaits.length;

          expect(avgPeakWait).toBeGreaterThan(avgOffPeakWait);
        }
      }
    });
  });

  describe('weekend patterns', () => {
    it('should have different morning peak patterns on weekends vs weekdays', () => {
      for (const terminal of ALL_TERMINALS) {
        const weekdayMorningWaits: number[] = [];
        const weekendMorningWaits: number[] = [];

        for (const day of ALL_DAYS) {
          for (const hour of PEAK_MORNING_HOURS) {
            const key = getHistoricalDataKey(terminal, day, hour);
            const waitTime = historicalBaselineMap.get(key)?.avgWaitMinutes ?? 0;

            if (day === 'saturday' || day === 'sunday') {
              weekendMorningWaits.push(waitTime);
            } else {
              weekdayMorningWaits.push(waitTime);
            }
          }
        }

        const avgWeekdayMorning =
          weekdayMorningWaits.reduce((a, b) => a + b, 0) / weekdayMorningWaits.length;
        const avgWeekendMorning =
          weekendMorningWaits.reduce((a, b) => a + b, 0) / weekendMorningWaits.length;

        // Weekend mornings should be less busy than weekday mornings
        expect(avgWeekendMorning).toBeLessThan(avgWeekdayMorning);
      }
    });

    it('should have lower evening peak waits on weekends vs weekdays', () => {
      for (const terminal of ALL_TERMINALS) {
        const weekdayEveningWaits: number[] = [];
        const weekendEveningWaits: number[] = [];

        for (const day of ALL_DAYS) {
          for (const hour of PEAK_EVENING_HOURS) {
            const key = getHistoricalDataKey(terminal, day, hour);
            const waitTime = historicalBaselineMap.get(key)?.avgWaitMinutes ?? 0;

            if (day === 'saturday' || day === 'sunday') {
              weekendEveningWaits.push(waitTime);
            } else {
              weekdayEveningWaits.push(waitTime);
            }
          }
        }

        const avgWeekdayEvening =
          weekdayEveningWaits.reduce((a, b) => a + b, 0) / weekdayEveningWaits.length;
        const avgWeekendEvening =
          weekendEveningWaits.reduce((a, b) => a + b, 0) / weekendEveningWaits.length;

        // Weekend evenings should be less busy than weekday evenings
        expect(avgWeekendEvening).toBeLessThan(avgWeekdayEvening);
      }
    });
  });

  describe('data validity', () => {
    it('should have non-negative wait times for all entries', () => {
      for (const entry of historicalBaseline) {
        expect(entry.avgWaitMinutes).toBeGreaterThanOrEqual(0);
      }
    });

    it('should have positive sample counts for all entries', () => {
      for (const entry of historicalBaseline) {
        expect(entry.sampleCount).toBeGreaterThan(0);
      }
    });

    it('should have hours in valid range (0-23)', () => {
      for (const entry of historicalBaseline) {
        expect(entry.hour).toBeGreaterThanOrEqual(0);
        expect(entry.hour).toBeLessThanOrEqual(23);
      }
    });
  });

  describe('getHistoricalDataKey', () => {
    it('should generate correct key format', () => {
      const key = getHistoricalDataKey('st-pancras', 'monday', 8);
      expect(key).toBe('st-pancras:monday:8');
    });

    it('should generate unique keys for different inputs', () => {
      const key1 = getHistoricalDataKey('st-pancras', 'monday', 8);
      const key2 = getHistoricalDataKey('st-pancras', 'monday', 9);
      const key3 = getHistoricalDataKey('st-pancras', 'tuesday', 8);
      const key4 = getHistoricalDataKey('gare-du-nord', 'monday', 8);

      expect(new Set([key1, key2, key3, key4]).size).toBe(4);
    });
  });

  describe('historicalBaselineMap', () => {
    it('should contain same number of entries as baseline array', () => {
      expect(historicalBaselineMap.size).toBe(historicalBaseline.length);
    });

    it('should allow lookup by key', () => {
      const key = getHistoricalDataKey('st-pancras', 'friday', 17);
      const data = historicalBaselineMap.get(key);
      expect(data).toBeDefined();
      expect(data?.terminal).toBe('st-pancras');
      expect(data?.dayOfWeek).toBe('friday');
      expect(data?.hour).toBe(17);
    });
  });
});
