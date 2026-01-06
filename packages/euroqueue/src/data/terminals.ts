import type { Terminal } from '../types.js';

export interface PeakHour {
  start: number; // 0-23
  end: number; // 0-23
}

export interface TerminalConfig {
  code: Terminal;
  name: string;
  timezone: string;
  checkInOpenMinutes: number;
  peakHours: {
    morning: PeakHour;
    evening: PeakHour;
  };
}

export const terminalConfig: Record<Terminal, TerminalConfig> = {
  'st-pancras': {
    code: 'st-pancras',
    name: 'London St Pancras International',
    timezone: 'Europe/London', // UTC+0 (UTC+1 during BST)
    checkInOpenMinutes: 120,
    peakHours: {
      morning: { start: 6, end: 9 }, // Morning departures
      evening: { start: 16, end: 19 }, // Evening returns
    },
  },
  'gare-du-nord': {
    code: 'gare-du-nord',
    name: 'Paris Gare du Nord',
    timezone: 'Europe/Paris', // UTC+1 (UTC+2 during DST)
    checkInOpenMinutes: 120,
    peakHours: {
      morning: { start: 7, end: 10 },
      evening: { start: 17, end: 20 },
    },
  },
  'brussels-midi': {
    code: 'brussels-midi',
    name: 'Brussels Midi/Zuid',
    timezone: 'Europe/Brussels', // UTC+1 (UTC+2 during DST)
    checkInOpenMinutes: 120,
    peakHours: {
      morning: { start: 7, end: 10 },
      evening: { start: 17, end: 20 },
    },
  },
  'amsterdam-centraal': {
    code: 'amsterdam-centraal',
    name: 'Amsterdam Centraal',
    timezone: 'Europe/Amsterdam', // UTC+1 (UTC+2 during DST)
    checkInOpenMinutes: 120,
    peakHours: {
      morning: { start: 7, end: 10 },
      evening: { start: 17, end: 20 },
    },
  },
};
