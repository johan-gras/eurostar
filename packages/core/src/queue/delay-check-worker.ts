import { Worker, Job, type ConnectionOptions } from 'bullmq';
import type { Redis } from 'ioredis';
import { eq, and, isNull, lte } from 'drizzle-orm';
import type { Database } from '../db/index.js';
import { bookings, trains, claims } from '../db/schema.js';

export const DELAY_CHECK_QUEUE_NAME = 'delay-check';

export interface DelayCheckJobData {
  bookingId?: string; // Check specific booking, or all pending if not provided
  triggeredAt: string;
}

export interface DelayCheckJobResult {
  success: boolean;
  timestamp: Date;
  durationMs: number;
  bookingsChecked: number;
  delaysFound: number;
  claimsCreated: number;
  error?: string;
}

export interface DelayCheckMetrics {
  timestamp: Date;
  durationMs: number;
  bookingsChecked: number;
  delaysFound: number;
  claimsCreated: number;
  errorMessage?: string;
}

// Eurostar compensation thresholds (minutes)
const DELAY_THRESHOLD_MINUTES = 60; // Minimum delay for compensation eligibility

/**
 * Creates a BullMQ Worker for delay check jobs.
 *
 * The worker:
 * 1. Finds bookings with completed journeys that don't have claims
 * 2. Checks if the associated train had a significant delay
 * 3. Creates claim records for eligible bookings
 *
 * @param connection - Redis connection
 * @param db - Database connection
 * @param onMetrics - Callback for metrics logging
 */
export function createDelayCheckWorker(
  connection: Redis,
  db: Database,
  onMetrics?: (metrics: DelayCheckMetrics) => void
): Worker<DelayCheckJobData, DelayCheckJobResult> {
  const worker = new Worker<DelayCheckJobData, DelayCheckJobResult>(
    DELAY_CHECK_QUEUE_NAME,
    async (job: Job<DelayCheckJobData>) => {
      const startTime = Date.now();
      const metrics: DelayCheckMetrics = {
        timestamp: new Date(),
        durationMs: 0,
        bookingsChecked: 0,
        delaysFound: 0,
        claimsCreated: 0,
      };

      try {
        const { bookingId } = job.data;

        // Find bookings to check
        const bookingsToCheck = bookingId
          ? await db
              .select({
                booking: bookings,
                train: trains,
              })
              .from(bookings)
              .leftJoin(trains, eq(bookings.trainId, trains.id))
              .leftJoin(claims, eq(claims.bookingId, bookings.id))
              .where(
                and(
                  eq(bookings.id, bookingId),
                  isNull(claims.id) // No existing claim
                )
              )
          : await db
              .select({
                booking: bookings,
                train: trains,
              })
              .from(bookings)
              .leftJoin(trains, eq(bookings.trainId, trains.id))
              .leftJoin(claims, eq(claims.bookingId, bookings.id))
              .where(
                and(
                  isNull(claims.id), // No existing claim
                  isNull(bookings.finalDelayMinutes), // Delay not yet finalized
                  lte(bookings.journeyDate, new Date()) // Journey date has passed
                )
              );

        metrics.bookingsChecked = bookingsToCheck.length;

        // Process each booking
        for (const { booking, train } of bookingsToCheck) {
          // Determine delay from train data or booking's final delay
          const delayMinutes = train?.delayMinutes ?? booking.finalDelayMinutes;

          if (delayMinutes === null || delayMinutes === undefined) {
            continue; // No delay data available yet
          }

          // Update booking with final delay if not set
          if (booking.finalDelayMinutes === null && train !== null && train.delayMinutes !== null) {
            await db
              .update(bookings)
              .set({ finalDelayMinutes: train.delayMinutes })
              .where(eq(bookings.id, booking.id));
          }

          // Check if delay meets threshold
          if (delayMinutes >= DELAY_THRESHOLD_MINUTES) {
            metrics.delaysFound++;

            // Calculate compensation amounts based on delay
            const { cashAmount, voucherAmount } = calculateCompensation(delayMinutes);

            // Create claim record
            await db.insert(claims).values({
              bookingId: booking.id,
              delayMinutes,
              eligibleCashAmount: cashAmount.toString(),
              eligibleVoucherAmount: voucherAmount.toString(),
              status: 'eligible',
            });

            metrics.claimsCreated++;
          }
        }

        metrics.durationMs = Date.now() - startTime;

        // Log metrics
        if (onMetrics) {
          onMetrics(metrics);
        } else {
          logMetrics(metrics, job.id);
        }

        return {
          success: true,
          timestamp: metrics.timestamp,
          durationMs: metrics.durationMs,
          bookingsChecked: metrics.bookingsChecked,
          delaysFound: metrics.delaysFound,
          claimsCreated: metrics.claimsCreated,
        };
      } catch (error) {
        metrics.durationMs = Date.now() - startTime;
        metrics.errorMessage =
          error instanceof Error ? error.message : 'Unknown error';

        // Log error metrics
        if (onMetrics) {
          onMetrics(metrics);
        } else {
          logMetrics(metrics, job.id);
        }

        return {
          success: false,
          timestamp: metrics.timestamp,
          durationMs: metrics.durationMs,
          bookingsChecked: metrics.bookingsChecked,
          delaysFound: metrics.delaysFound,
          claimsCreated: metrics.claimsCreated,
          error: metrics.errorMessage,
        };
      }
    },
    {
      connection: connection as ConnectionOptions,
      concurrency: 1, // Process one at a time to avoid race conditions
      removeOnComplete: { count: 100 },
      removeOnFail: { count: 100 },
    }
  );

  // Handle worker errors
  worker.on('error', (error) => {
    console.error('[DelayCheck Worker] Worker error:', error.message);
  });

  worker.on('failed', (job, error) => {
    console.error(
      `[DelayCheck Worker] Job ${job?.id} failed:`,
      error.message
    );
  });

  return worker;
}

/**
 * Calculate compensation amounts based on delay duration.
 * Eurostar compensation rules:
 * - 60-119 minutes: 25% of ticket price
 * - 120+ minutes: 50% of ticket price
 * Voucher is typically 10% higher than cash
 */
function calculateCompensation(delayMinutes: number): {
  cashAmount: number;
  voucherAmount: number;
} {
  // Base compensation percentage
  let percentage = 0;

  if (delayMinutes >= 120) {
    percentage = 50;
  } else if (delayMinutes >= 60) {
    percentage = 25;
  }

  // Placeholder: actual calculation would use ticket price from booking
  // For now, use percentage as placeholder amounts
  const cashAmount = percentage;
  const voucherAmount = Math.round(percentage * 1.1);

  return { cashAmount, voucherAmount };
}

function logMetrics(metrics: DelayCheckMetrics, jobId?: string): void {
  const status = metrics.errorMessage ? 'ERROR' : 'OK';
  const parts = [
    `[DelayCheck Worker]`,
    `status=${status}`,
    `job=${jobId ?? 'unknown'}`,
    `duration=${metrics.durationMs}ms`,
    `checked=${metrics.bookingsChecked}`,
    `delays=${metrics.delaysFound}`,
    `claims=${metrics.claimsCreated}`,
  ];

  if (metrics.errorMessage) {
    parts.push(`error="${metrics.errorMessage}"`);
  }

  console.log(parts.join(' '));
}
