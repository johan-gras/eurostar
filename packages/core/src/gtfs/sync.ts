import { sql } from 'drizzle-orm';
import type { Database } from '../db/index.js';
import { trains, type TrainType } from '../db/schema.js';
import type { ParsedTrainDelay } from './types.js';

/**
 * Maps train number ranges to train types.
 * This is a simplified mapping - actual train type detection may need
 * additional data sources.
 */
function inferTrainType(trainNumber: string): TrainType {
  const num = parseInt(trainNumber);

  // Most Eurostar services are e320 (Velaro) since 2015
  // Legacy e300 and classics are rare but still exist
  if (num >= 9000 && num <= 9099) {
    return 'e320'; // London-Paris primarily uses e320
  }
  if (num >= 9100 && num <= 9199) {
    return 'e320'; // London-Brussels primarily uses e320
  }
  if (num >= 9300 && num <= 9399) {
    return 'e320'; // London-Amsterdam uses e320
  }

  // Default to e320 for unknown ranges
  return 'e320';
}

export interface SyncResult {
  inserted: number;
  updated: number;
  errors: Array<{ tripId: string; error: string }>;
}

/**
 * Syncs train delays to the database using upsert.
 * Uses ON CONFLICT to update existing records.
 *
 * Note: This only updates delayMinutes from the GTFS feed.
 * Scheduled departure/arrival times need to come from the static GTFS feed.
 */
export async function syncTrainsToDb(
  delays: ParsedTrainDelay[],
  db: Database
): Promise<SyncResult> {
  const result: SyncResult = {
    inserted: 0,
    updated: 0,
    errors: [],
  };

  if (delays.length === 0) {
    return result;
  }

  for (const delay of delays) {
    try {
      // Use raw SQL for ON CONFLICT since Drizzle's onConflictDoUpdate
      // requires knowing if it's an insert or update
      const insertResult = await db
        .insert(trains)
        .values({
          tripId: delay.tripId,
          trainNumber: delay.trainNumber,
          date: delay.date,
          // Placeholder times - should be updated from static GTFS
          scheduledDeparture: delay.date,
          scheduledArrival: delay.date,
          delayMinutes: delay.finalDelayMinutes,
          trainType: inferTrainType(delay.trainNumber),
        })
        .onConflictDoUpdate({
          target: trains.tripId,
          set: {
            delayMinutes: delay.finalDelayMinutes,
            updatedAt: new Date(),
          },
        })
        .returning({ id: trains.id });

      // If we got a result, count it
      if (insertResult.length > 0) {
        // We can't easily distinguish insert vs update with this approach
        // For now, just count as inserted
        result.inserted++;
      }
    } catch (error) {
      result.errors.push({
        tripId: delay.tripId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  return result;
}

/**
 * Batch sync with transaction support.
 * More efficient for large numbers of updates.
 */
export async function syncTrainsToDbBatch(
  delays: ParsedTrainDelay[],
  db: Database
): Promise<SyncResult> {
  const result: SyncResult = {
    inserted: 0,
    updated: 0,
    errors: [],
  };

  if (delays.length === 0) {
    return result;
  }

  try {
    // Prepare all values
    const values = delays.map((delay) => ({
      tripId: delay.tripId,
      trainNumber: delay.trainNumber,
      date: delay.date,
      scheduledDeparture: delay.date,
      scheduledArrival: delay.date,
      delayMinutes: delay.finalDelayMinutes,
      trainType: inferTrainType(delay.trainNumber),
    }));

    // Batch insert with conflict handling
    const insertResult = await db
      .insert(trains)
      .values(values)
      .onConflictDoUpdate({
        target: trains.tripId,
        set: {
          delayMinutes: sql`excluded.delay_minutes`,
          updatedAt: new Date(),
        },
      })
      .returning({ id: trains.id });

    result.inserted = insertResult.length;
  } catch (error) {
    result.errors.push({
      tripId: 'batch',
      error: error instanceof Error ? error.message : 'Batch insert failed',
    });
  }

  return result;
}
