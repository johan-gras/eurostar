import type { Terminal, DayOfWeek, QueuePrediction } from '../types.js';
import { getHistoricalData } from '../repository/queue.repository.js';

export interface PredictionContext {
  terminal: Terminal;
  dateTime: Date;
  isHoliday?: boolean;
  hasSpecialEvent?: boolean;
  recentDelays?: number; // average delay in minutes from recent trains
}

const DAYS_OF_WEEK: readonly DayOfWeek[] = [
  'sunday',
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
] as const;

function getDayOfWeek(date: Date): DayOfWeek {
  return DAYS_OF_WEEK[date.getUTCDay()] as DayOfWeek;
}

/**
 * Calculate confidence based on sample count and adjustment factors.
 */
function calculateConfidence(
  sampleCount: number,
  hasAdjustments: boolean
): 'low' | 'medium' | 'high' {
  // Low sample count or many adjustments reduce confidence
  if (sampleCount < 20 || hasAdjustments) {
    return 'low';
  }
  if (sampleCount < 50) {
    return 'medium';
  }
  return 'high';
}

/**
 * Predict queue wait time based on historical data and contextual factors.
 */
export function predictQueueTime(context: PredictionContext): QueuePrediction {
  const { terminal, dateTime, isHoliday, hasSpecialEvent, recentDelays } = context;

  const dayOfWeek = getDayOfWeek(dateTime);
  const hour = dateTime.getUTCHours();

  const historicalData = getHistoricalData(terminal, dayOfWeek, hour);

  // Start with historical baseline
  let estimatedMinutes = historicalData?.avgWaitMinutes ?? 15; // default fallback
  const sampleCount = historicalData?.sampleCount ?? 0;

  let hasAdjustments = false;

  // Apply holiday adjustment: holidays typically 30-50% busier
  if (isHoliday) {
    estimatedMinutes *= 1.4;
    hasAdjustments = true;
  }

  // Apply special event adjustment: events can cause 50-100% increase
  if (hasSpecialEvent) {
    estimatedMinutes *= 1.7;
    hasAdjustments = true;
  }

  // Apply delay adjustment: when trains are delayed, queues back up
  // Each 10 minutes of average delay adds ~20% to wait times
  if (recentDelays && recentDelays > 0) {
    const delayFactor = 1 + (recentDelays / 10) * 0.2;
    estimatedMinutes *= Math.min(delayFactor, 2.5); // cap at 2.5x
    hasAdjustments = true;
  }

  // Round to nearest minute
  estimatedMinutes = Math.round(estimatedMinutes);

  return {
    terminal,
    estimatedMinutes,
    confidence: calculateConfidence(sampleCount, hasAdjustments),
    updatedAt: new Date(),
  };
}

/**
 * Generate hourly queue predictions for a given time range.
 */
export function predictQueueTimeline(
  terminal: Terminal,
  startTime: Date,
  hours: number
): QueuePrediction[] {
  const predictions: QueuePrediction[] = [];

  for (let i = 0; i < hours; i++) {
    const dateTime = new Date(startTime.getTime() + i * 60 * 60 * 1000);
    const prediction = predictQueueTime({ terminal, dateTime });
    predictions.push(prediction);
  }

  return predictions;
}

/**
 * Find the optimal arrival time that minimizes wait while ensuring you arrive before departure.
 *
 * @param terminal - The terminal to check
 * @param departureTime - When your train departs
 * @param maxWait - Maximum acceptable wait time in minutes
 * @returns The best arrival time, or null if no suitable time found
 */
export function getBestArrivalTime(
  terminal: Terminal,
  departureTime: Date,
  maxWait: number
): Date | null {
  // Eurostar recommends arriving 60-90 minutes before departure
  // We'll search within a 3-hour window before departure
  const searchWindowHours = 3;
  const minArrivalBuffer = 45; // minimum minutes before departure to arrive

  const earliestArrival = new Date(
    departureTime.getTime() - searchWindowHours * 60 * 60 * 1000
  );
  const latestArrival = new Date(
    departureTime.getTime() - minArrivalBuffer * 60 * 1000
  );

  // Generate predictions in 15-minute increments
  const candidates: Array<{ arrivalTime: Date; waitTime: number }> = [];
  const incrementMs = 15 * 60 * 1000; // 15 minutes

  let currentTime = earliestArrival;
  while (currentTime <= latestArrival) {
    const prediction = predictQueueTime({ terminal, dateTime: currentTime });

    // Check if we can make it through security before departure
    const arrivalPlusWait = new Date(
      currentTime.getTime() + prediction.estimatedMinutes * 60 * 1000
    );

    if (
      prediction.estimatedMinutes <= maxWait &&
      arrivalPlusWait < departureTime
    ) {
      candidates.push({
        arrivalTime: new Date(currentTime),
        waitTime: prediction.estimatedMinutes,
      });
    }

    currentTime = new Date(currentTime.getTime() + incrementMs);
  }

  if (candidates.length === 0) {
    return null;
  }

  // Find the candidate with minimum wait time
  // If there are ties, prefer arriving later (less time at station)
  candidates.sort((a, b) => {
    if (a.waitTime !== b.waitTime) {
      return a.waitTime - b.waitTime;
    }
    return b.arrivalTime.getTime() - a.arrivalTime.getTime();
  });

  return candidates[0]!.arrivalTime;
}
