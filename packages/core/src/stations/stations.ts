/**
 * Eurostar station data with aliases for autocomplete functionality
 */

export interface Station {
  /** UIC-based station code (e.g., GBSPX) */
  code: string;
  /** Full station name */
  name: string;
  /** City name */
  city: string;
  /** Country code (ISO 3166-1 alpha-2) */
  country: string;
  /** Alternative names/spellings for search */
  aliases: string[];
}

/**
 * All Eurostar stations with their metadata and search aliases
 */
export const STATIONS: Station[] = [
  // United Kingdom
  {
    code: 'GBSPX',
    name: 'London St Pancras International',
    city: 'London',
    country: 'GB',
    aliases: ['St Pancras', 'Kings Cross', 'King\'s Cross', 'STP', 'SPX'],
  },
  {
    code: 'GBEBS',
    name: 'Ebbsfleet International',
    city: 'Ebbsfleet',
    country: 'GB',
    aliases: ['Ebbsfleet', 'EBS'],
  },
  {
    code: 'GBASH',
    name: 'Ashford International',
    city: 'Ashford',
    country: 'GB',
    aliases: ['Ashford', 'ASH'],
  },
  // France
  {
    code: 'FRPLY',
    name: 'Paris Gare du Nord',
    city: 'Paris',
    country: 'FR',
    aliases: ['Gare du Nord', 'Paris Nord', 'North Station', 'PLY'],
  },
  {
    code: 'FRLIL',
    name: 'Lille Europe',
    city: 'Lille',
    country: 'FR',
    aliases: ['Lille', 'LIL'],
  },
  {
    code: 'FRCFK',
    name: 'Calais Fréthun',
    city: 'Calais',
    country: 'FR',
    aliases: ['Calais', 'Frethun', 'CFK'],
  },
  // Belgium
  {
    code: 'BEBMI',
    name: 'Brussels Midi',
    city: 'Brussels',
    country: 'BE',
    aliases: ['Bruxelles Midi', 'Brussels South', 'Brussel Zuid', 'BMI'],
  },
  // Netherlands
  {
    code: 'NLAMA',
    name: 'Amsterdam Centraal',
    city: 'Amsterdam',
    country: 'NL',
    aliases: ['Amsterdam Central', 'Amsterdam CS', 'AMA'],
  },
  {
    code: 'NLRTD',
    name: 'Rotterdam Centraal',
    city: 'Rotterdam',
    country: 'NL',
    aliases: ['Rotterdam Central', 'Rotterdam CS', 'RTD'],
  },
  // Germany
  {
    code: 'DECGN',
    name: 'Köln Hauptbahnhof',
    city: 'Cologne',
    country: 'DE',
    aliases: ['Cologne', 'Koln', 'Köln Hbf', 'Cologne Central', 'CGN'],
  },
];

/**
 * Map of station code to station data for quick lookup
 */
export const STATION_BY_CODE: Map<string, Station> = new Map(
  STATIONS.map((station) => [station.code, station])
);

/**
 * Map of station code to display name (for backwards compatibility)
 */
export const STATION_NAMES: Record<string, string> = Object.fromEntries(
  STATIONS.map((station) => [station.code, station.name])
);

/**
 * Get station by code
 */
export function getStation(code: string): Station | undefined {
  return STATION_BY_CODE.get(code);
}

/**
 * Get station display name by code
 */
export function getStationName(code: string): string {
  return STATION_BY_CODE.get(code)?.name ?? code;
}

/**
 * Search stations by query string
 * Matches against code, name, city, and aliases (case-insensitive)
 */
export function searchStations(query: string): Station[] {
  if (!query.trim()) {
    return STATIONS;
  }

  const normalizedQuery = query.toLowerCase().trim();

  return STATIONS.filter((station) => {
    // Check code
    if (station.code.toLowerCase().includes(normalizedQuery)) {
      return true;
    }
    // Check name
    if (station.name.toLowerCase().includes(normalizedQuery)) {
      return true;
    }
    // Check city
    if (station.city.toLowerCase().includes(normalizedQuery)) {
      return true;
    }
    // Check aliases
    if (station.aliases.some((alias) => alias.toLowerCase().includes(normalizedQuery))) {
      return true;
    }
    return false;
  });
}

/**
 * Find station by any identifier (code, name, city, or alias)
 * Returns exact match first, then partial matches
 */
export function findStation(identifier: string): Station | undefined {
  const normalizedId = identifier.toLowerCase().trim();

  // Try exact code match first
  const byCode = STATION_BY_CODE.get(identifier.toUpperCase());
  if (byCode) {
    return byCode;
  }

  // Try exact matches on name, city, or aliases
  const exactMatch = STATIONS.find(
    (station) =>
      station.name.toLowerCase() === normalizedId ||
      station.city.toLowerCase() === normalizedId ||
      station.aliases.some((alias) => alias.toLowerCase() === normalizedId)
  );

  if (exactMatch) {
    return exactMatch;
  }

  // Fall back to partial match
  const partialMatches = searchStations(identifier);
  return partialMatches[0];
}
