import type { CrowdLevel } from '../types.js';

/**
 * Convert wait time in minutes to a crowd level classification.
 *
 * - 0-5 min: very-low
 * - 6-12 min: low
 * - 13-20 min: moderate
 * - 21-35 min: high
 * - 36+ min: very-high
 */
export function waitTimeToCrowdLevel(minutes: number): CrowdLevel {
  if (minutes <= 5) {
    return 'very-low';
  }
  if (minutes <= 12) {
    return 'low';
  }
  if (minutes <= 20) {
    return 'moderate';
  }
  if (minutes <= 35) {
    return 'high';
  }
  return 'very-high';
}

/**
 * Get a human-readable description for a crowd level.
 */
export function crowdLevelToDescription(level: CrowdLevel): string {
  switch (level) {
    case 'very-low':
      return 'Very quiet - minimal or no wait expected';
    case 'low':
      return 'Quiet - short wait times, queues moving quickly';
    case 'moderate':
      return 'Moderate - expect some queuing, allow extra time';
    case 'high':
      return 'Busy - significant queues, arrive early';
    case 'very-high':
      return 'Very busy - long queues expected, arrive with plenty of time';
  }
}
