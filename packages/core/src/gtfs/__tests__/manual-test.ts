/**
 * Manual test: Fetch from real GTFS-RT endpoint and log first 3 delays.
 *
 * Run with: npx tsx src/gtfs/__tests__/manual-test.ts
 */

import { fetchGtfsRealtimeWithRetry } from '../client.js';
import { extractDelays } from '../parser.js';

async function main() {
  console.log('Fetching GTFS-RT data from Eurostar...\n');

  const result = await fetchGtfsRealtimeWithRetry();

  if (result.isErr()) {
    console.error('Failed to fetch:', result.error.message);
    process.exit(1);
  }

  const feed = result.value;
  console.log(`Feed timestamp: ${new Date(feed.header.timestamp * 1000).toISOString()}`);
  console.log(`Total entities: ${feed.entity.length}\n`);

  const delays = extractDelays(feed);
  console.log(`Parsed ${delays.length} train delays\n`);

  console.log('First 3 trains:');
  console.log('─'.repeat(60));

  for (const delay of delays.slice(0, 3)) {
    console.log(`Train: ${delay.trainNumber}`);
    console.log(`  Trip ID: ${delay.tripId}`);
    console.log(`  Date: ${delay.date.toISOString().split('T')[0]}`);
    console.log(`  Final delay: ${delay.finalDelayMinutes} min`);
    console.log(`  Stops (${delay.stops.length}):`);
    for (const stop of delay.stops) {
      const arr = stop.arrivalDelayMinutes ? `arr: ${stop.arrivalDelayMinutes}min` : '';
      const dep = stop.departureDelayMinutes ? `dep: ${stop.departureDelayMinutes}min` : '';
      const delayInfo = [arr, dep].filter(Boolean).join(', ') || 'on time';
      const stationLabel = stop.stationCode || '(stop id from static feed needed)';
      console.log(`    ${stationLabel}: ${delayInfo}`);
    }
    console.log('');
  }

  // Show any significant delays
  const significant = delays.filter(d => d.finalDelayMinutes >= 60);
  if (significant.length > 0) {
    console.log('─'.repeat(60));
    console.log(`\n⚠️  Significant delays (≥60 min): ${significant.length}`);
    for (const delay of significant) {
      console.log(`  Train ${delay.trainNumber}: ${delay.finalDelayMinutes} min`);
    }
  } else {
    console.log('✓ No significant delays (≥60 min) currently');
  }
}

main().catch(console.error);
