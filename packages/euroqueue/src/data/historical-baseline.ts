import type { Terminal, DayOfWeek, HistoricalData } from '../types.js';

const TERMINALS: Terminal[] = [
  'st-pancras',
  'gare-du-nord',
  'brussels-midi',
  'amsterdam-centraal',
];

const DAYS_OF_WEEK: DayOfWeek[] = [
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
  'sunday',
];

interface TimePattern {
  minWait: number;
  maxWait: number;
  baseSampleCount: number;
}

function getBasePattern(hour: number): TimePattern {
  // Night (11pm-4am): Very low
  if (hour >= 23 || hour <= 4) {
    return { minWait: 0, maxWait: 5, baseSampleCount: 10 };
  }
  // Early morning (5-6am): Low
  if (hour >= 5 && hour <= 6) {
    return { minWait: 5, maxWait: 10, baseSampleCount: 30 };
  }
  // Morning peak (7-9am): High
  if (hour >= 7 && hour <= 9) {
    return { minWait: 20, maxWait: 40, baseSampleCount: 150 };
  }
  // Mid-morning (10-11am): Moderate
  if (hour >= 10 && hour <= 11) {
    return { minWait: 10, maxWait: 20, baseSampleCount: 80 };
  }
  // Lunch (12-2pm): Moderate-High
  if (hour >= 12 && hour <= 14) {
    return { minWait: 15, maxWait: 25, baseSampleCount: 100 };
  }
  // Afternoon (3-4pm): Moderate
  if (hour >= 15 && hour <= 16) {
    return { minWait: 10, maxWait: 20, baseSampleCount: 70 };
  }
  // Evening peak (5-7pm): High
  if (hour >= 17 && hour <= 19) {
    return { minWait: 25, maxWait: 45, baseSampleCount: 160 };
  }
  // Late evening (8-10pm): Low
  if (hour >= 20 && hour <= 22) {
    return { minWait: 5, maxWait: 15, baseSampleCount: 40 };
  }
  // Default fallback
  return { minWait: 10, maxWait: 20, baseSampleCount: 50 };
}

function getDayModifier(
  dayOfWeek: DayOfWeek,
  hour: number
): { waitMultiplier: number; sampleMultiplier: number } {
  const isWeekend = dayOfWeek === 'saturday' || dayOfWeek === 'sunday';
  const isFriday = dayOfWeek === 'friday';
  const isMonday = dayOfWeek === 'monday';

  if (isWeekend) {
    // Weekend: shift peaks later, generally lower volume
    const isMorning = hour >= 7 && hour <= 11;
    const isEvening = hour >= 17 && hour <= 19;

    if (isMorning) {
      // Weekends have later, less intense morning peaks
      return { waitMultiplier: 0.6, sampleMultiplier: 0.5 };
    }
    if (isEvening) {
      // Weekend evening travel is more spread out
      return { waitMultiplier: 0.7, sampleMultiplier: 0.6 };
    }
    // Midday on weekends can be busy with leisure travel
    if (hour >= 12 && hour <= 16) {
      return { waitMultiplier: 1.1, sampleMultiplier: 0.8 };
    }
    return { waitMultiplier: 0.8, sampleMultiplier: 0.6 };
  }

  if (isFriday) {
    // Friday: Higher evening peak (leisure travel beginning)
    if (hour >= 17 && hour <= 19) {
      return { waitMultiplier: 1.3, sampleMultiplier: 1.4 };
    }
    if (hour >= 14 && hour <= 16) {
      return { waitMultiplier: 1.15, sampleMultiplier: 1.2 };
    }
    return { waitMultiplier: 1.0, sampleMultiplier: 1.0 };
  }

  if (isMonday) {
    // Monday: Higher morning peak (business travel)
    if (hour >= 7 && hour <= 9) {
      return { waitMultiplier: 1.25, sampleMultiplier: 1.3 };
    }
    return { waitMultiplier: 1.0, sampleMultiplier: 1.0 };
  }

  // Tuesday-Thursday: Normal patterns
  return { waitMultiplier: 1.0, sampleMultiplier: 1.0 };
}

function getTerminalModifier(terminal: Terminal): number {
  // St Pancras and Gare du Nord are busiest
  // Brussels and Amsterdam are slightly less busy
  switch (terminal) {
    case 'st-pancras':
      return 1.1;
    case 'gare-du-nord':
      return 1.05;
    case 'brussels-midi':
      return 0.9;
    case 'amsterdam-centraal':
      return 0.85;
  }
}

function generateHistoricalBaseline(): HistoricalData[] {
  const data: HistoricalData[] = [];

  // Use a seeded approach for consistent data across runs
  // We'll use deterministic values based on inputs rather than pure random
  const seededRandom = (terminal: string, day: string, hour: number): number => {
    const seed = `${terminal}-${day}-${hour}`;
    let hash = 0;
    for (let i = 0; i < seed.length; i++) {
      const char = seed.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash;
    }
    return Math.abs(hash % 1000) / 1000;
  };

  for (const terminal of TERMINALS) {
    for (const dayOfWeek of DAYS_OF_WEEK) {
      for (let hour = 0; hour < 24; hour++) {
        const basePattern = getBasePattern(hour);
        const dayMod = getDayModifier(dayOfWeek, hour);
        const terminalMod = getTerminalModifier(terminal);
        const rand = seededRandom(terminal, dayOfWeek, hour);

        const baseWait =
          (basePattern.minWait + basePattern.maxWait) / 2 +
          (rand - 0.5) * (basePattern.maxWait - basePattern.minWait) * 0.5;

        const adjustedWait = Math.round(baseWait * dayMod.waitMultiplier * terminalMod);
        const sampleCount = Math.round(
          basePattern.baseSampleCount * dayMod.sampleMultiplier * (0.8 + rand * 0.4)
        );

        data.push({
          terminal,
          dayOfWeek,
          hour,
          avgWaitMinutes: Math.max(0, adjustedWait),
          sampleCount: Math.max(5, sampleCount),
        });
      }
    }
  }

  return data;
}

export const historicalBaseline: HistoricalData[] = generateHistoricalBaseline();

export function getHistoricalDataKey(
  terminal: Terminal,
  dayOfWeek: DayOfWeek,
  hour: number
): string {
  return `${terminal}:${dayOfWeek}:${hour}`;
}

export const historicalBaselineMap: Map<string, HistoricalData> = new Map(
  historicalBaseline.map((entry) => [
    getHistoricalDataKey(entry.terminal, entry.dayOfWeek, entry.hour),
    entry,
  ])
);
