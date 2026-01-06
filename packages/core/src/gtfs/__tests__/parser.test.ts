import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { parseTripId, extractDelays, filterSignificantDelays } from '../parser.js';
import {
  onTimeFeed,
  delayedFeed,
  multipleFeed,
  invalidTripIdFeed,
  emptyFeed,
} from './fixtures.js';

describe('parseTripId', () => {
  beforeEach(() => {
    // Mock date to 2026-01-05 for consistent year handling
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-05T12:00:00Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('parses valid trip ID format', () => {
    const result = parseTripId('9007-0105');
    expect(result).not.toBeNull();
    expect(result!.trainNumber).toBe('9007');
    expect(result!.date.getUTCMonth()).toBe(0); // January
    expect(result!.date.getUTCDate()).toBe(5);
  });

  it('parses trip ID for December', () => {
    const result = parseTripId('9024-1225');
    expect(result).not.toBeNull();
    expect(result!.trainNumber).toBe('9024');
    expect(result!.date.getUTCMonth()).toBe(11); // December
    expect(result!.date.getUTCDate()).toBe(25);
  });

  it('returns null for invalid format - no hyphen', () => {
    expect(parseTripId('90070105')).toBeNull();
  });

  it('returns null for invalid format - wrong train number length', () => {
    expect(parseTripId('907-0105')).toBeNull();
    expect(parseTripId('90007-0105')).toBeNull();
  });

  it('returns null for invalid format - non-numeric', () => {
    expect(parseTripId('9O07-0105')).toBeNull(); // letter O
    expect(parseTripId('9007-O105')).toBeNull();
  });

  it('returns null for empty string', () => {
    expect(parseTripId('')).toBeNull();
  });
});

describe('extractDelays', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-05T12:00:00Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('extracts on-time trains correctly', () => {
    const delays = extractDelays(onTimeFeed);

    expect(delays).toHaveLength(1);
    expect(delays[0].tripId).toBe('9007-0105');
    expect(delays[0].trainNumber).toBe('9007');
    expect(delays[0].finalDelayMinutes).toBe(0);
    expect(delays[0].stops).toHaveLength(3);
  });

  it('calculates delay in minutes from seconds', () => {
    const delays = extractDelays(delayedFeed);

    expect(delays).toHaveLength(1);
    expect(delays[0].tripId).toBe('9024-0105');
    expect(delays[0].finalDelayMinutes).toBe(85); // 5100 seconds = 85 minutes
  });

  it('extracts stop-by-stop delays', () => {
    const delays = extractDelays(delayedFeed);
    const stops = delays[0].stops;

    expect(stops[0].stationCode).toBe('GBSPX');
    expect(stops[0].departureDelayMinutes).toBe(10); // 600 seconds

    expect(stops[1].stationCode).toBe('FRCFK');
    expect(stops[1].arrivalDelayMinutes).toBe(30); // 1800 seconds
    expect(stops[1].departureDelayMinutes).toBe(40); // 2400 seconds

    expect(stops[2].stationCode).toBe('FRPLY');
    expect(stops[2].arrivalDelayMinutes).toBe(85); // 5100 seconds
  });

  it('handles multiple trains', () => {
    const delays = extractDelays(multipleFeed);

    expect(delays).toHaveLength(3);
    expect(delays.map((d) => d.trainNumber)).toEqual(['9007', '9124', '9324']);
    expect(delays.map((d) => d.finalDelayMinutes)).toEqual([5, 60, 120]);
  });

  it('skips entities with invalid trip IDs', () => {
    const delays = extractDelays(invalidTripIdFeed);
    expect(delays).toHaveLength(0);
  });

  it('handles empty feed', () => {
    const delays = extractDelays(emptyFeed);
    expect(delays).toHaveLength(0);
  });

  it('rounds delay seconds to minutes', () => {
    const feed = {
      header: { gtfsRealtimeVersion: '2.0', timestamp: 1 },
      entity: [
        {
          id: '9001-0101',
          tripUpdate: {
            trip: { tripId: '9001-0101' },
            stopTimeUpdate: [
              { stopSequence: 1, stopId: 'TEST', arrival: { delay: 89 } }, // 1.48 min → rounds to 1
            ],
          },
        },
      ],
    };

    const delays = extractDelays(feed);
    expect(delays[0].finalDelayMinutes).toBe(1);
  });
});

describe('filterSignificantDelays', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-05T12:00:00Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('filters trains with delay >= 60 minutes by default', () => {
    const delays = extractDelays(multipleFeed);
    const significant = filterSignificantDelays(delays);

    expect(significant).toHaveLength(2);
    expect(significant.map((d) => d.trainNumber)).toEqual(['9124', '9324']);
  });

  it('respects custom threshold', () => {
    const delays = extractDelays(multipleFeed);
    const significant = filterSignificantDelays(delays, 100);

    expect(significant).toHaveLength(1);
    expect(significant[0].trainNumber).toBe('9324');
  });

  it('includes trains exactly at threshold', () => {
    const delays = extractDelays(multipleFeed);
    const significant = filterSignificantDelays(delays, 60);

    expect(significant.some((d) => d.finalDelayMinutes === 60)).toBe(true);
  });

  it('returns empty array when no significant delays', () => {
    const delays = extractDelays(onTimeFeed);
    const significant = filterSignificantDelays(delays);

    expect(significant).toHaveLength(0);
  });
});
