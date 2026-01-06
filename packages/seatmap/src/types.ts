export type TrainType = 'e320' | 'e300' | 'classic' | 'ruby';

export type CoachClass = 'standard' | 'standard-premier' | 'business-premier';

export type SeatFeature =
  | 'window'
  | 'aisle'
  | 'table'
  | 'power'
  | 'quiet'
  | 'accessible'
  | 'duo'
  | 'facing-forward'
  | 'facing-backward';

export type SeatWarning =
  | 'no-window'
  | 'limited-recline'
  | 'near-toilet'
  | 'near-galley'
  | 'misaligned-window';

export type SeatPosition = 'A' | 'B' | 'C' | 'D';

export interface SeatInfo {
  seatNumber: string;
  coach: number;
  class: CoachClass;
  features: SeatFeature[];
  warnings: SeatWarning[];
  row: number;
  position: SeatPosition;
}
