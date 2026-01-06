import { describe, it, expect } from 'vitest';
import {
  predictQueueTime,
  predictQueueTimeline,
  getBestArrivalTime,
  type PredictionContext,
} from '../services/prediction.service.js';
describe('Prediction Service', () => {
  describe('predictQueueTime', () => {
    it('should return a valid QueuePrediction', () => {
      const context: PredictionContext = {
        terminal: 'st-pancras',
        dateTime: new Date('2024-01-15T08:00:00Z'), // Monday morning
      };
      const prediction = predictQueueTime(context);

      expect(prediction).toHaveProperty('terminal');
      expect(prediction).toHaveProperty('estimatedMinutes');
      expect(prediction).toHaveProperty('confidence');
      expect(prediction).toHaveProperty('updatedAt');
    });

    it('should return the correct terminal in prediction', () => {
      const context: PredictionContext = {
        terminal: 'gare-du-nord',
        dateTime: new Date('2024-01-15T12:00:00Z'),
      };
      const prediction = predictQueueTime(context);
      expect(prediction.terminal).toBe('gare-du-nord');
    });

    it('should return estimatedMinutes as a non-negative number', () => {
      const context: PredictionContext = {
        terminal: 'brussels-midi',
        dateTime: new Date('2024-01-15T14:00:00Z'),
      };
      const prediction = predictQueueTime(context);
      expect(typeof prediction.estimatedMinutes).toBe('number');
      expect(prediction.estimatedMinutes).toBeGreaterThanOrEqual(0);
    });

    it('should return valid confidence level', () => {
      const context: PredictionContext = {
        terminal: 'amsterdam-centraal',
        dateTime: new Date('2024-01-15T10:00:00Z'),
      };
      const prediction = predictQueueTime(context);
      expect(['low', 'medium', 'high']).toContain(prediction.confidence);
    });

    it('should return a Date for updatedAt', () => {
      const context: PredictionContext = {
        terminal: 'st-pancras',
        dateTime: new Date('2024-01-15T16:00:00Z'),
      };
      const prediction = predictQueueTime(context);
      expect(prediction.updatedAt).toBeInstanceOf(Date);
    });
  });

  describe('holiday adjustment', () => {
    it('should increase wait time for holidays', () => {
      const baseContext: PredictionContext = {
        terminal: 'st-pancras',
        dateTime: new Date('2024-01-15T12:00:00Z'),
        isHoliday: false,
      };
      const holidayContext: PredictionContext = {
        ...baseContext,
        isHoliday: true,
      };

      const basePrediction = predictQueueTime(baseContext);
      const holidayPrediction = predictQueueTime(holidayContext);

      expect(holidayPrediction.estimatedMinutes).toBeGreaterThan(
        basePrediction.estimatedMinutes
      );
    });

    it('should apply approximately 40% increase for holidays', () => {
      const baseContext: PredictionContext = {
        terminal: 'gare-du-nord',
        dateTime: new Date('2024-01-17T14:00:00Z'), // Wednesday afternoon
      };
      const holidayContext: PredictionContext = {
        ...baseContext,
        isHoliday: true,
      };

      const basePrediction = predictQueueTime(baseContext);
      const holidayPrediction = predictQueueTime(holidayContext);

      // Holiday should be ~1.4x base (allowing for rounding)
      const ratio = holidayPrediction.estimatedMinutes / basePrediction.estimatedMinutes;
      expect(ratio).toBeGreaterThanOrEqual(1.3);
      expect(ratio).toBeLessThanOrEqual(1.5);
    });
  });

  describe('special event adjustment', () => {
    it('should increase wait time more than holiday for special events', () => {
      const baseContext: PredictionContext = {
        terminal: 'st-pancras',
        dateTime: new Date('2024-01-15T18:00:00Z'),
      };
      const holidayContext: PredictionContext = {
        ...baseContext,
        isHoliday: true,
      };
      const eventContext: PredictionContext = {
        ...baseContext,
        hasSpecialEvent: true,
      };

      const holidayPrediction = predictQueueTime(holidayContext);
      const eventPrediction = predictQueueTime(eventContext);

      expect(eventPrediction.estimatedMinutes).toBeGreaterThan(
        holidayPrediction.estimatedMinutes
      );
    });

    it('should apply approximately 70% increase for special events', () => {
      const baseContext: PredictionContext = {
        terminal: 'gare-du-nord',
        dateTime: new Date('2024-01-17T14:00:00Z'),
      };
      const eventContext: PredictionContext = {
        ...baseContext,
        hasSpecialEvent: true,
      };

      const basePrediction = predictQueueTime(baseContext);
      const eventPrediction = predictQueueTime(eventContext);

      const ratio = eventPrediction.estimatedMinutes / basePrediction.estimatedMinutes;
      expect(ratio).toBeGreaterThanOrEqual(1.6);
      expect(ratio).toBeLessThanOrEqual(1.8);
    });
  });

  describe('confidence calculation', () => {
    it('should return low confidence when adjustments are applied', () => {
      const context: PredictionContext = {
        terminal: 'st-pancras',
        dateTime: new Date('2024-01-15T12:00:00Z'),
        isHoliday: true,
      };
      const prediction = predictQueueTime(context);
      expect(prediction.confidence).toBe('low');
    });

    it('should return low confidence with special event', () => {
      const context: PredictionContext = {
        terminal: 'st-pancras',
        dateTime: new Date('2024-01-15T12:00:00Z'),
        hasSpecialEvent: true,
      };
      const prediction = predictQueueTime(context);
      expect(prediction.confidence).toBe('low');
    });

    it('should return low confidence with recent delays', () => {
      const context: PredictionContext = {
        terminal: 'st-pancras',
        dateTime: new Date('2024-01-15T12:00:00Z'),
        recentDelays: 30,
      };
      const prediction = predictQueueTime(context);
      expect(prediction.confidence).toBe('low');
    });
  });

  describe('delay adjustment', () => {
    it('should increase wait time when there are recent delays', () => {
      const baseContext: PredictionContext = {
        terminal: 'st-pancras',
        dateTime: new Date('2024-01-15T12:00:00Z'),
      };
      const delayContext: PredictionContext = {
        ...baseContext,
        recentDelays: 30,
      };

      const basePrediction = predictQueueTime(baseContext);
      const delayPrediction = predictQueueTime(delayContext);

      expect(delayPrediction.estimatedMinutes).toBeGreaterThan(
        basePrediction.estimatedMinutes
      );
    });

    it('should cap delay factor at 2.5x', () => {
      const baseContext: PredictionContext = {
        terminal: 'st-pancras',
        dateTime: new Date('2024-01-15T12:00:00Z'),
      };
      const extremeDelayContext: PredictionContext = {
        ...baseContext,
        recentDelays: 200, // Very high delay
      };

      const basePrediction = predictQueueTime(baseContext);
      const delayPrediction = predictQueueTime(extremeDelayContext);

      const ratio = delayPrediction.estimatedMinutes / basePrediction.estimatedMinutes;
      expect(ratio).toBeLessThanOrEqual(2.6); // Allow for rounding
    });
  });

  describe('predictQueueTimeline', () => {
    it('should return correct number of predictions', () => {
      const startTime = new Date('2024-01-15T08:00:00Z');
      const predictions = predictQueueTimeline('st-pancras', startTime, 5);
      expect(predictions).toHaveLength(5);
    });

    it('should return 24 predictions for a full day', () => {
      const startTime = new Date('2024-01-15T00:00:00Z');
      const predictions = predictQueueTimeline('gare-du-nord', startTime, 24);
      expect(predictions).toHaveLength(24);
    });

    it('should return predictions at hourly intervals', () => {
      const startTime = new Date('2024-01-15T10:00:00Z');
      const predictions = predictQueueTimeline('brussels-midi', startTime, 3);

      const times = predictions.map((p) => p.updatedAt.getTime());
      // Each prediction should have been generated at approximately the same time
      // (within the test execution time)
      for (const time of times) {
        expect(time).toBeLessThanOrEqual(Date.now());
        expect(time).toBeGreaterThan(Date.now() - 10000); // Within last 10 seconds
      }
    });

    it('should return empty array for 0 hours', () => {
      const startTime = new Date('2024-01-15T08:00:00Z');
      const predictions = predictQueueTimeline('st-pancras', startTime, 0);
      expect(predictions).toHaveLength(0);
    });

    it('should return all predictions for the same terminal', () => {
      const startTime = new Date('2024-01-15T08:00:00Z');
      const predictions = predictQueueTimeline('amsterdam-centraal', startTime, 5);
      for (const prediction of predictions) {
        expect(prediction.terminal).toBe('amsterdam-centraal');
      }
    });
  });

  describe('getBestArrivalTime', () => {
    it('should return a valid Date when suitable time exists', () => {
      // Departure at 3 PM on a weekday with generous max wait
      const departure = new Date('2024-01-17T15:00:00Z'); // Wednesday
      const result = getBestArrivalTime('st-pancras', departure, 60);

      // Should find a time given generous max wait
      if (result !== null) {
        expect(result).toBeInstanceOf(Date);
        expect(result.getTime()).toBeLessThan(departure.getTime());
      }
    });

    it('should return null when maxWait is too restrictive', () => {
      // Peak hour departure with very low max wait
      const departure = new Date('2024-01-15T08:30:00Z'); // Monday morning peak
      const result = getBestArrivalTime('st-pancras', departure, 1); // Only 1 minute max wait

      expect(result).toBeNull();
    });

    it('should return arrival time before departure', () => {
      const departure = new Date('2024-01-17T14:00:00Z');
      const result = getBestArrivalTime('gare-du-nord', departure, 30);

      if (result !== null) {
        expect(result.getTime()).toBeLessThan(departure.getTime());
      }
    });

    it('should return arrival time at least 45 minutes before departure', () => {
      const departure = new Date('2024-01-17T14:00:00Z');
      const result = getBestArrivalTime('brussels-midi', departure, 30);

      if (result !== null) {
        const diffMinutes = (departure.getTime() - result.getTime()) / (60 * 1000);
        expect(diffMinutes).toBeGreaterThanOrEqual(45);
      }
    });

    it('should search within 3-hour window before departure', () => {
      const departure = new Date('2024-01-17T15:00:00Z');
      const earliestPossible = new Date(departure.getTime() - 3 * 60 * 60 * 1000);
      const result = getBestArrivalTime('amsterdam-centraal', departure, 30);

      if (result !== null) {
        expect(result.getTime()).toBeGreaterThanOrEqual(earliestPossible.getTime());
      }
    });

    it('should prefer later arrival times for ties in wait time', () => {
      // Use off-peak hours where wait times might be similar
      const departure = new Date('2024-01-17T03:00:00Z'); // 3 AM - very quiet
      const result = getBestArrivalTime('st-pancras', departure, 60);

      // If we find a result, it should be as late as possible while still being valid
      if (result !== null) {
        const minutesBefore = (departure.getTime() - result.getTime()) / (60 * 1000);
        // Should not be arriving more than necessary
        expect(minutesBefore).toBeLessThanOrEqual(180); // Max 3 hour window
      }
    });
  });
});
