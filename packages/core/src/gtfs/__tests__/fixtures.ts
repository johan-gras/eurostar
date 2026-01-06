import type { GtfsFeedMessage } from '../types.js';

/**
 * Sample GTFS-RT feed with an on-time train.
 */
export const onTimeFeed: GtfsFeedMessage = {
  header: {
    gtfsRealtimeVersion: '2.0',
    timestamp: 1704441600, // 2024-01-05T12:00:00Z
  },
  entity: [
    {
      id: '9007-0105',
      tripUpdate: {
        trip: {
          tripId: '9007-0105',
          startDate: '20260105',
        },
        stopTimeUpdate: [
          {
            stopSequence: 1,
            stopId: 'GBSPX',
            departure: { delay: 0 },
          },
          {
            stopSequence: 2,
            stopId: 'FRCFK',
            arrival: { delay: 0 },
            departure: { delay: 0 },
          },
          {
            stopSequence: 3,
            stopId: 'FRPLY',
            arrival: { delay: 0 },
          },
        ],
      },
    },
  ],
};

/**
 * Sample GTFS-RT feed with a delayed train (85 minutes at final stop).
 */
export const delayedFeed: GtfsFeedMessage = {
  header: {
    gtfsRealtimeVersion: '2.0',
    timestamp: 1704441600,
  },
  entity: [
    {
      id: '9024-0105',
      tripUpdate: {
        trip: {
          tripId: '9024-0105',
          startDate: '20260105',
        },
        stopTimeUpdate: [
          {
            stopSequence: 1,
            stopId: 'GBSPX',
            departure: { delay: 600 }, // 10 min departure delay
          },
          {
            stopSequence: 2,
            stopId: 'FRCFK',
            arrival: { delay: 1800 }, // 30 min
            departure: { delay: 2400 }, // 40 min
          },
          {
            stopSequence: 3,
            stopId: 'FRPLY',
            arrival: { delay: 5100 }, // 85 minutes
          },
        ],
      },
    },
  ],
};

/**
 * Sample GTFS-RT feed with multiple trains.
 */
export const multipleFeed: GtfsFeedMessage = {
  header: {
    gtfsRealtimeVersion: '2.0',
    timestamp: 1704441600,
  },
  entity: [
    {
      id: '9007-0105',
      tripUpdate: {
        trip: {
          tripId: '9007-0105',
          startDate: '20260105',
        },
        stopTimeUpdate: [
          { stopSequence: 1, stopId: 'GBSPX', departure: { delay: 0 } },
          { stopSequence: 2, stopId: 'FRPLY', arrival: { delay: 300 } }, // 5 min
        ],
      },
    },
    {
      id: '9124-0105',
      tripUpdate: {
        trip: {
          tripId: '9124-0105',
          startDate: '20260105',
        },
        stopTimeUpdate: [
          { stopSequence: 1, stopId: 'GBSPX', departure: { delay: 0 } },
          { stopSequence: 2, stopId: 'BEBMI', arrival: { delay: 3600 } }, // 60 min
        ],
      },
    },
    {
      id: '9324-0105',
      tripUpdate: {
        trip: {
          tripId: '9324-0105',
          startDate: '20260105',
        },
        stopTimeUpdate: [
          { stopSequence: 1, stopId: 'GBSPX', departure: { delay: 0 } },
          { stopSequence: 2, stopId: 'NLASC', arrival: { delay: 7200 } }, // 120 min
        ],
      },
    },
  ],
};

/**
 * Feed with invalid trip ID format.
 */
export const invalidTripIdFeed: GtfsFeedMessage = {
  header: {
    gtfsRealtimeVersion: '2.0',
    timestamp: 1704441600,
  },
  entity: [
    {
      id: 'invalid-trip',
      tripUpdate: {
        trip: {
          tripId: 'not-a-valid-trip-id',
          startDate: '20260105',
        },
        stopTimeUpdate: [
          { stopSequence: 1, stopId: 'GBSPX', departure: { delay: 0 } },
        ],
      },
    },
  ],
};

/**
 * Empty feed.
 */
export const emptyFeed: GtfsFeedMessage = {
  header: {
    gtfsRealtimeVersion: '2.0',
    timestamp: 1704441600,
  },
  entity: [],
};
