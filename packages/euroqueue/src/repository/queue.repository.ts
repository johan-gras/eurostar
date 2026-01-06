import type { Terminal, DayOfWeek, HistoricalData } from '../types.js';
import {
  historicalBaseline,
  historicalBaselineMap,
  getHistoricalDataKey,
} from '../data/historical-baseline.js';

/**
 * Get historical queue data for a specific terminal, day, and hour.
 * Returns undefined if no data exists for the given parameters.
 */
export function getHistoricalData(
  terminal: Terminal,
  dayOfWeek: DayOfWeek,
  hour: number
): HistoricalData | undefined {
  if (hour < 0 || hour > 23) {
    return undefined;
  }
  const key = getHistoricalDataKey(terminal, dayOfWeek, hour);
  return historicalBaselineMap.get(key);
}

/**
 * Get the average wait time in minutes for a specific terminal, day, and hour.
 * Returns 0 if no data exists for the given parameters.
 */
export function getAverageWaitTime(
  terminal: Terminal,
  dayOfWeek: DayOfWeek,
  hour: number
): number {
  const data = getHistoricalData(terminal, dayOfWeek, hour);
  return data?.avgWaitMinutes ?? 0;
}

/**
 * Get all historical data entries for a specific terminal.
 * Returns data for all 7 days and 24 hours (168 entries total).
 */
export function getAllDataForTerminal(terminal: Terminal): HistoricalData[] {
  return historicalBaseline.filter((entry) => entry.terminal === terminal);
}
