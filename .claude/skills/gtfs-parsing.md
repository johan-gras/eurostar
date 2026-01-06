# GTFS-RT Parsing for Eurostar

## Endpoints

### Real-Time Feed (GTFS-RT)
```
URL: https://integration-storage.dm.eurostar.com/gtfs-prod/gtfs_rt_v2.bin
Format: Protocol Buffers (GTFS-RT specification)
Update: Every 30 seconds
Auth: None required
License: Open License 2.0 (commercial use allowed)
CORS: Enabled (access-control-allow-origin: *)
```

### Static Feed (GTFS)
```
URL: https://integration-storage.dm.eurostar.com/gtfs-prod/gtfs_static_commercial_v2.zip
Format: GTFS ZIP archive
Update: Daily at 03:00 Paris time
Contains: stops.txt, routes.txt, trips.txt, stop_times.txt, calendar.txt
Coverage: 90-day rolling forecast
```

## Trip ID Format

Pattern: `{train_number}-{MMDD}`

Examples:
- `9007-0105` = Train 9007 on January 5th
- `9024-1225` = Train 9024 on December 25th

The train number is a 4-digit identifier:
- 9000-9099: London ↔ Paris services
- 9100-9199: London ↔ Brussels services
- 9300-9399: London ↔ Amsterdam services

## Protocol Buffer Schema

```protobuf
message FeedMessage {
  FeedHeader header = 1;
  repeated FeedEntity entity = 2;
}

message FeedEntity {
  string id = 1;
  TripUpdate trip_update = 3;
  // Also: vehicle, alert (less commonly used for Eurostar)
}

message TripUpdate {
  TripDescriptor trip = 1;
  repeated StopTimeUpdate stop_time_update = 2;
}

message TripDescriptor {
  string trip_id = 1;      // "9007-0105"
  string route_id = 5;     // Route identifier
  string start_date = 3;   // "20260105" (YYYYMMDD)
}

message StopTimeUpdate {
  uint32 stop_sequence = 1;
  string stop_id = 4;      // Station code (e.g., "GBSPX")
  StopTimeEvent arrival = 2;
  StopTimeEvent departure = 3;
}

message StopTimeEvent {
  int32 delay = 1;         // Seconds (negative = early, positive = late)
  int64 time = 2;          // Unix timestamp (optional)
}
```

## TypeScript Types

```typescript
interface GtfsFeedMessage {
  header: {
    gtfsRealtimeVersion: string;
    timestamp: number;
  };
  entity: GtfsFeedEntity[];
}

interface GtfsFeedEntity {
  id: string;
  tripUpdate?: GtfsTripUpdate;
}

interface GtfsTripUpdate {
  trip: {
    tripId: string;
    routeId?: string;
    startDate?: string;
  };
  stopTimeUpdate: GtfsStopTimeUpdate[];
}

interface GtfsStopTimeUpdate {
  stopSequence: number;
  stopId: string;
  arrival?: {
    delay: number;  // seconds
    time?: number;  // unix timestamp
  };
  departure?: {
    delay: number;
    time?: number;
  };
}

// Parsed/normalized version for application use
interface ParsedTrainDelay {
  tripId: string;
  trainNumber: string;
  date: Date;
  stops: Array<{
    stationCode: string;
    arrivalDelayMinutes: number;
    departureDelayMinutes: number;
  }>;
  finalDelayMinutes: number;  // Delay at last stop
}
```

## Node.js Implementation

### Install Dependencies
```bash
pnpm add gtfs-realtime-bindings
```

### Fetch and Parse
```typescript
import GtfsRealtimeBindings from 'gtfs-realtime-bindings';

const GTFS_RT_URL = 'https://integration-storage.dm.eurostar.com/gtfs-prod/gtfs_rt_v2.bin';

export async function fetchGtfsRealtime(): Promise<GtfsFeedMessage> {
  const response = await fetch(GTFS_RT_URL, {
    headers: { 'Accept': 'application/x-protobuf' }
  });

  if (!response.ok) {
    throw new Error(`GTFS fetch failed: ${response.status}`);
  }

  const buffer = await response.arrayBuffer();
  const feed = GtfsRealtimeBindings.transit_realtime.FeedMessage.decode(
    new Uint8Array(buffer)
  );

  return feed as unknown as GtfsFeedMessage;
}

export function parseTripId(tripId: string): { trainNumber: string; date: Date } | null {
  const match = tripId.match(/^(\d{4})-(\d{2})(\d{2})$/);
  if (!match) return null;

  const [, trainNumber, month, day] = match;
  const year = new Date().getFullYear();
  const date = new Date(year, parseInt(month) - 1, parseInt(day));

  return { trainNumber, date };
}

export function extractDelays(feed: GtfsFeedMessage): ParsedTrainDelay[] {
  return feed.entity
    .filter(e => e.tripUpdate)
    .map(e => {
      const tu = e.tripUpdate!;
      const parsed = parseTripId(tu.trip.tripId);
      if (!parsed) return null;

      const stops = tu.stopTimeUpdate.map(stu => ({
        stationCode: stu.stopId,
        arrivalDelayMinutes: Math.round((stu.arrival?.delay ?? 0) / 60),
        departureDelayMinutes: Math.round((stu.departure?.delay ?? 0) / 60),
      }));

      const lastStop = stops[stops.length - 1];

      return {
        tripId: tu.trip.tripId,
        trainNumber: parsed.trainNumber,
        date: parsed.date,
        stops,
        finalDelayMinutes: lastStop?.arrivalDelayMinutes ?? 0,
      };
    })
    .filter((d): d is ParsedTrainDelay => d !== null);
}
```

### Polling Service
```typescript
import { EventEmitter } from 'events';

export class GtfsPoller extends EventEmitter {
  private intervalId?: NodeJS.Timeout;
  private readonly pollIntervalMs = 30_000;

  async start(): Promise<void> {
    await this.poll(); // Initial poll
    this.intervalId = setInterval(() => this.poll(), this.pollIntervalMs);
  }

  stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = undefined;
    }
  }

  private async poll(): Promise<void> {
    try {
      const feed = await fetchGtfsRealtime();
      const delays = extractDelays(feed);

      this.emit('update', {
        timestamp: new Date(),
        entityCount: feed.entity.length,
        delays,
      });

      // Emit for significantly delayed trains
      for (const delay of delays) {
        if (delay.finalDelayMinutes >= 60) {
          this.emit('significant-delay', delay);
        }
      }
    } catch (error) {
      this.emit('error', error);
    }
  }
}
```

## Station Codes

| Code | Station | Country |
|------|---------|---------|
| GBSPX | London St Pancras International | UK |
| GBEBS | Ebbsfleet International | UK |
| GBASH | Ashford International | UK |
| FRCFK | Calais-Fréthun | France |
| FRLPD | Lille Europe | France |
| FRPLY | Paris Gare du Nord | France |
| BEBMI | Brussels Midi/Zuid | Belgium |
| NLASC | Amsterdam Centraal | Netherlands |
| NLRDA | Rotterdam Centraal | Netherlands |

## Testing with Fixtures

Create fixture files for deterministic tests:

```typescript
// fixtures/gtfs-delayed-train.bin
// Binary file captured from real response

// fixtures/gtfs-on-time.json
// JSON representation for readable test data
{
  "header": { "gtfsRealtimeVersion": "2.0", "timestamp": 1704441600 },
  "entity": [
    {
      "id": "9007-0105",
      "tripUpdate": {
        "trip": { "tripId": "9007-0105", "startDate": "20260105" },
        "stopTimeUpdate": [
          { "stopSequence": 1, "stopId": "GBSPX", "departure": { "delay": 0 } },
          { "stopSequence": 2, "stopId": "FRPLY", "arrival": { "delay": 0 } }
        ]
      }
    }
  ]
}
```

```typescript
// test/gtfs-poller.test.ts
import { describe, it, expect, vi } from 'vitest';
import { extractDelays } from '../src/gtfs';
import onTimeFixture from '../fixtures/gtfs-on-time.json';
import delayedFixture from '../fixtures/gtfs-delayed.json';

describe('extractDelays', () => {
  it('parses on-time trains correctly', () => {
    const delays = extractDelays(onTimeFixture);
    expect(delays[0].finalDelayMinutes).toBe(0);
  });

  it('calculates delay in minutes', () => {
    const delays = extractDelays(delayedFixture);
    expect(delays[0].finalDelayMinutes).toBe(85); // 5100 seconds
  });
});
```

## Error Handling

```typescript
class GtfsFetchError extends Error {
  constructor(
    message: string,
    public readonly statusCode?: number,
    public readonly retryable: boolean = true
  ) {
    super(message);
    this.name = 'GtfsFetchError';
  }
}

async function fetchWithRetry(
  maxRetries = 3,
  baseDelayMs = 1000
): Promise<GtfsFeedMessage> {
  let lastError: Error | undefined;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fetchGtfsRealtime();
    } catch (error) {
      lastError = error as Error;

      if (error instanceof GtfsFetchError && !error.retryable) {
        throw error;
      }

      const delay = baseDelayMs * Math.pow(2, attempt);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  throw lastError;
}
```

## Monitoring

Log these metrics for operational visibility:

```typescript
interface GtfsPollMetrics {
  timestamp: Date;
  durationMs: number;
  entityCount: number;
  delayedTrainCount: number;
  significantDelayCount: number;  // >= 60 min
  errorMessage?: string;
}
```
