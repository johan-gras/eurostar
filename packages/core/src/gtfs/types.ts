/**
 * GTFS-RT types from the Protocol Buffer schema.
 * These mirror the structure returned by gtfs-realtime-bindings.
 */

export interface GtfsFeedMessage {
  header: {
    gtfsRealtimeVersion: string;
    timestamp: number;
  };
  entity: GtfsFeedEntity[];
}

export interface GtfsFeedEntity {
  id: string;
  tripUpdate?: GtfsTripUpdate;
}

export interface GtfsTripUpdate {
  trip: {
    tripId: string;
    routeId?: string;
    startDate?: string;
  };
  stopTimeUpdate: GtfsStopTimeUpdate[];
}

export interface GtfsStopTimeUpdate {
  stopSequence: number;
  stopId: string;
  arrival?: GtfsStopTimeEvent;
  departure?: GtfsStopTimeEvent;
}

/**
 * Raw protobuf structure from gtfs-realtime-bindings (snake_case).
 * The library returns these raw field names.
 */
export interface RawGtfsStopTimeUpdate {
  stopSequence?: number;
  stop_sequence?: number;
  stopId?: string;
  stop_id?: string;
  arrival?: RawGtfsStopTimeEvent;
  departure?: RawGtfsStopTimeEvent;
  stopTimeProperties?: {
    assignedStopId?: string;
  };
  stop_time_properties?: {
    assigned_stop_id?: string;
  };
}

export interface RawGtfsStopTimeEvent {
  delay?: number;
  time?: number | { low: number; high: number };
}

export interface RawGtfsTripUpdate {
  trip: {
    tripId?: string;
    trip_id?: string;
    routeId?: string;
    route_id?: string;
    startDate?: string;
    start_date?: string;
  };
  stopTimeUpdate?: RawGtfsStopTimeUpdate[];
  stop_time_update?: RawGtfsStopTimeUpdate[];
}

export interface GtfsStopTimeEvent {
  delay: number; // seconds
  time?: number; // unix timestamp
}

/**
 * Parsed/normalized train delay for application use.
 */
export interface ParsedTrainDelay {
  tripId: string;
  trainNumber: string;
  date: Date;
  stops: ParsedStopDelay[];
  finalDelayMinutes: number;
}

export interface ParsedStopDelay {
  stationCode: string;
  arrivalDelayMinutes: number;
  departureDelayMinutes: number;
}

/**
 * Update event emitted by the poller.
 */
export interface GtfsUpdateEvent {
  timestamp: Date;
  entityCount: number;
  delays: ParsedTrainDelay[];
}

/**
 * Error types for GTFS operations.
 */
export class GtfsFetchError extends Error {
  constructor(
    message: string,
    public readonly statusCode?: number,
    public readonly retryable: boolean = true
  ) {
    super(message);
    this.name = 'GtfsFetchError';
  }
}

export class GtfsParseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'GtfsParseError';
  }
}
