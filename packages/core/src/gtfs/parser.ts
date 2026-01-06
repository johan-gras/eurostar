import type {
  GtfsFeedMessage,
  ParsedTrainDelay,
  ParsedStopDelay,
  RawGtfsTripUpdate,
  RawGtfsStopTimeUpdate,
} from './types.js';

/**
 * Parses a GTFS trip ID into train number and date.
 *
 * Trip ID format: "{train_number}-{MMDD}"
 * Examples:
 *   - "9007-0105" → train 9007 on January 5th
 *   - "9024-1225" → train 9024 on December 25th
 *
 * @returns Parsed components or null if format is invalid
 */
export function parseTripId(
  tripId: string
): { trainNumber: string; date: Date } | null {
  const match = tripId.match(/^(\d{4})-(\d{2})(\d{2})$/);
  if (!match) return null;

  const trainNumber = match[1];
  const month = match[2];
  const day = match[3];

  if (!trainNumber || !month || !day) return null;

  const year = new Date().getFullYear();
  const date = new Date(Date.UTC(year, parseInt(month) - 1, parseInt(day)));

  // Handle year boundary: if the date is more than 6 months in the past,
  // it's probably next year's schedule
  const now = new Date();
  const sixMonthsAgo = new Date(now);
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

  if (date < sixMonthsAgo) {
    date.setUTCFullYear(year + 1);
  }

  return { trainNumber, date };
}

/**
 * Normalizes field access for protobuf objects that may use camelCase or snake_case.
 */
function getStopTimeUpdates(
  tripUpdate: RawGtfsTripUpdate
): RawGtfsStopTimeUpdate[] {
  return tripUpdate.stopTimeUpdate ?? tripUpdate.stop_time_update ?? [];
}

function getTripId(trip: RawGtfsTripUpdate['trip']): string {
  return trip.tripId ?? trip.trip_id ?? '';
}

function getStopId(stu: RawGtfsStopTimeUpdate): string {
  // Try stopId first, then fall back to stopTimeProperties.assignedStopId
  return (
    stu.stopId ??
    stu.stop_id ??
    stu.stopTimeProperties?.assignedStopId ??
    stu.stop_time_properties?.assigned_stop_id ??
    ''
  );
}

/**
 * Extracts train delays from a GTFS-RT feed message.
 * Converts raw GTFS data into normalized ParsedTrainDelay objects.
 * Handles both camelCase and snake_case field names from protobuf.
 */
export function extractDelays(feed: GtfsFeedMessage): ParsedTrainDelay[] {
  return feed.entity
    .filter((e) => e.tripUpdate)
    .map((e) => {
      const tripUpdate = e.tripUpdate as unknown as RawGtfsTripUpdate;
      const tripId = getTripId(tripUpdate.trip);
      const parsed = parseTripId(tripId);
      if (!parsed) return null;

      const stopTimeUpdates = getStopTimeUpdates(tripUpdate);
      const stops: ParsedStopDelay[] = stopTimeUpdates.map((stu) => ({
        stationCode: getStopId(stu),
        arrivalDelayMinutes: Math.round((stu.arrival?.delay ?? 0) / 60),
        departureDelayMinutes: Math.round((stu.departure?.delay ?? 0) / 60),
      }));

      const lastStop = stops[stops.length - 1];

      return {
        tripId,
        trainNumber: parsed.trainNumber,
        date: parsed.date,
        stops,
        finalDelayMinutes: lastStop?.arrivalDelayMinutes ?? 0,
      };
    })
    .filter((d): d is ParsedTrainDelay => d !== null);
}

/**
 * Filters delays to only include significantly delayed trains (>= threshold).
 * Default threshold is 60 minutes (Eurostar compensation threshold).
 */
export function filterSignificantDelays(
  delays: ParsedTrainDelay[],
  thresholdMinutes: number = 60
): ParsedTrainDelay[] {
  return delays.filter((d) => d.finalDelayMinutes >= thresholdMinutes);
}
