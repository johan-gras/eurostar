export type Terminal =
  | 'st-pancras'
  | 'gare-du-nord'
  | 'brussels-midi'
  | 'amsterdam-centraal';

export type DayOfWeek =
  | 'monday'
  | 'tuesday'
  | 'wednesday'
  | 'thursday'
  | 'friday'
  | 'saturday'
  | 'sunday';

export interface TimeSlot {
  hour: number; // 0-23
  minute: number; // 0-59
}

export interface QueuePrediction {
  terminal: Terminal;
  estimatedMinutes: number;
  confidence: 'low' | 'medium' | 'high';
  updatedAt: Date;
}

export interface HistoricalData {
  terminal: Terminal;
  dayOfWeek: DayOfWeek;
  hour: number; // 0-23
  avgWaitMinutes: number;
  sampleCount: number;
}

export type CrowdLevel = 'very-low' | 'low' | 'moderate' | 'high' | 'very-high';
