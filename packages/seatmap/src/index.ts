export type {
  TrainType,
  CoachClass,
  SeatFeature,
  SeatWarning,
  SeatPosition,
  SeatInfo,
} from './types.js';

export type { TrainConfig } from './data/e320.js';
export {
  e320Config,
  e320SeatMap,
  getSeatInfo as getE320SeatInfo,
  getSeatsByCoach as getE320SeatsByCoach,
  getSeatCountsByCoach as getE320SeatCountsByCoach,
  getTotalSeatCount as getE320TotalSeatCount,
} from './data/e320.js';

export {
  e300Config,
  e300SeatMap,
  getSeatInfo as getE300SeatInfo,
  getSeatsByCoach as getE300SeatsByCoach,
  getSeatCountsByCoach as getE300SeatCountsByCoach,
  getTotalSeatCount as getE300TotalSeatCount,
} from './data/e300.js';

export {
  classicConfig,
  classicSeatMap,
  getSeatInfo as getClassicSeatInfo,
  getSeatsByCoach as getClassicSeatsByCoach,
  getSeatCountsByCoach as getClassicSeatCountsByCoach,
  getTotalSeatCount as getClassicTotalSeatCount,
} from './data/classic.js';

export {
  rubyConfig,
  rubySeatMap,
  getSeatInfo as getRubySeatInfo,
  getSeatsByCoach as getRubySeatsByCoach,
  getSeatCountsByCoach as getRubySeatCountsByCoach,
  getTotalSeatCount as getRubyTotalSeatCount,
} from './data/ruby.js';

// Re-export e320 functions with original names for backwards compatibility
export {
  getSeatInfo,
  getSeatsByCoach,
  getSeatCountsByCoach,
  getTotalSeatCount,
} from './data/e320.js';

export type {
  SeatPreferences,
  ScoredSeat,
  SeatRecommendation,
} from './services/recommendation.service.js';
export {
  defaultPreferences,
  scoreSeat,
  getAdjacentSeats,
  recommendSeats,
  recommendSeatsForTrain,
  getTrainConfig,
  getAllSeatsForTrain,
} from './services/recommendation.service.js';
