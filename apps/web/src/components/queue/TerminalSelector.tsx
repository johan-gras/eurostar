'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';
import type { CrowdLevel } from './QueueStatus';

export interface Terminal {
  id: string;
  name: string;
  city: string;
  timezone: string;
}

export interface TerminalQueuePreview {
  terminalId: string;
  waitTimeMinutes: number;
  crowdLevel: CrowdLevel;
}

export const TERMINALS: Terminal[] = [
  {
    id: 'st-pancras',
    name: 'St Pancras International',
    city: 'London',
    timezone: 'Europe/London',
  },
  {
    id: 'gare-du-nord',
    name: 'Gare du Nord',
    city: 'Paris',
    timezone: 'Europe/Paris',
  },
  {
    id: 'brussels-midi',
    name: 'Brussels Midi',
    city: 'Brussels',
    timezone: 'Europe/Brussels',
  },
  {
    id: 'amsterdam-centraal',
    name: 'Amsterdam Centraal',
    city: 'Amsterdam',
    timezone: 'Europe/Amsterdam',
  },
  {
    id: 'rotterdam-centraal',
    name: 'Rotterdam Centraal',
    city: 'Rotterdam',
    timezone: 'Europe/Amsterdam',
  },
  {
    id: 'lille-europe',
    name: 'Lille Europe',
    city: 'Lille',
    timezone: 'Europe/Paris',
  },
];

const TERMINAL_ICONS: Record<string, string> = {
  'st-pancras': '🇬🇧',
  'gare-du-nord': '🇫🇷',
  'brussels-midi': '🇧🇪',
  'amsterdam-centraal': '🇳🇱',
  'rotterdam-centraal': '🇳🇱',
  'lille-europe': '🇫🇷',
};

const crowdLevelStyles: Record<CrowdLevel, { dot: string; bg: string }> = {
  low: {
    dot: 'bg-green-500',
    bg: 'bg-green-50 dark:bg-green-950/30',
  },
  moderate: {
    dot: 'bg-amber-500',
    bg: 'bg-amber-50 dark:bg-amber-950/30',
  },
  high: {
    dot: 'bg-orange-500',
    bg: 'bg-orange-50 dark:bg-orange-950/30',
  },
  very_high: {
    dot: 'bg-red-500',
    bg: 'bg-red-50 dark:bg-red-950/30',
  },
};

interface TerminalSelectorProps {
  selectedTerminal: string;
  onSelect: (terminalId: string) => void;
  queuePreviews?: TerminalQueuePreview[];
  onSwipe?: (direction: 'left' | 'right') => void;
}

const SWIPE_THRESHOLD = 50;

function TerminalCard({
  terminal,
  isSelected,
  onClick,
  preview,
}: {
  terminal: Terminal;
  isSelected: boolean;
  onClick: () => void;
  preview: TerminalQueuePreview | undefined;
}) {
  const crowdStyle = preview ? crowdLevelStyles[preview.crowdLevel] : null;

  return (
    <button
      onClick={onClick}
      data-terminal-id={terminal.id}
      className={cn(
        'flex flex-col items-start gap-1.5 md:gap-2 rounded-xl border-2 p-3 md:p-4 text-left transition-all',
        'min-w-[140px] md:min-w-[160px] flex-shrink-0 md:min-w-0 md:flex-shrink',
        'snap-center',
        'hover:border-primary/50 hover:shadow-md',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
        'active:scale-[0.98] touch-manipulation',
        isSelected
          ? 'border-primary bg-primary/5 shadow-md'
          : 'border-border bg-card',
        crowdStyle && !isSelected && crowdStyle.bg
      )}
    >
      {/* Icon and city row */}
      <div className="flex w-full items-center justify-between gap-2">
        <span className="text-2xl" role="img" aria-label={terminal.city}>
          {TERMINAL_ICONS[terminal.id] ?? '🚄'}
        </span>
        {preview && (
          <div
            className={cn('h-3 w-3 rounded-full', crowdStyle?.dot)}
            title={`Crowd level: ${preview.crowdLevel.replace('_', ' ')}`}
          />
        )}
      </div>

      {/* Terminal name */}
      <div className="flex flex-col gap-0.5">
        <span className="text-xs font-medium text-muted-foreground">
          {terminal.city}
        </span>
        <span className="text-sm font-semibold leading-tight">
          {terminal.name}
        </span>
      </div>

      {/* Wait time preview */}
      {preview && (
        <div className="flex items-baseline gap-1 text-muted-foreground">
          <span className="text-lg font-bold tabular-nums text-foreground">
            {preview.waitTimeMinutes}
          </span>
          <span className="text-xs">min wait</span>
        </div>
      )}
    </button>
  );
}

export function TerminalSelector({
  selectedTerminal,
  onSelect,
  queuePreviews,
  onSwipe,
}: TerminalSelectorProps) {
  const scrollContainerRef = React.useRef<HTMLDivElement>(null);
  const touchStartX = React.useRef(0);
  const touchStartY = React.useRef(0);

  const getPreview = (terminalId: string) =>
    queuePreviews?.find((p) => p.terminalId === terminalId);

  // Scroll to selected terminal on mobile
  React.useEffect(() => {
    if (scrollContainerRef.current && window.innerWidth < 768) {
      const selectedCard = scrollContainerRef.current.querySelector(
        `[data-terminal-id="${selectedTerminal}"]`
      );
      if (selectedCard) {
        selectedCard.scrollIntoView({
          behavior: 'smooth',
          block: 'nearest',
          inline: 'center',
        });
      }
    }
  }, [selectedTerminal]);

  // Touch handlers for swipe between terminals
  const handleTouchStart = React.useCallback((e: React.TouchEvent) => {
    touchStartX.current = e.touches[0]?.clientX ?? 0;
    touchStartY.current = e.touches[0]?.clientY ?? 0;
  }, []);

  const handleTouchEnd = React.useCallback((e: React.TouchEvent) => {
    if (!onSwipe) return;
    const touchEndX = e.changedTouches[0]?.clientX ?? 0;
    const touchEndY = e.changedTouches[0]?.clientY ?? 0;
    const diffX = touchEndX - touchStartX.current;
    const diffY = Math.abs(touchEndY - touchStartY.current);

    // Only trigger if horizontal swipe is dominant
    if (Math.abs(diffX) > SWIPE_THRESHOLD && Math.abs(diffX) > diffY) {
      onSwipe(diffX < 0 ? 'left' : 'right');
    }
  }, [onSwipe]);

  return (
    <div className="w-full">
      <h2 className="mb-2 md:mb-3 text-xs md:text-sm font-medium text-muted-foreground">
        Select Terminal
      </h2>
      {/* Horizontal scroll on mobile, grid on desktop */}
      <div
        ref={scrollContainerRef}
        className={cn(
          'flex gap-2 md:gap-3 overflow-x-auto pb-2 -mx-4 px-4 md:mx-0 md:px-0',
          'md:grid md:grid-cols-2 lg:grid-cols-3 md:overflow-visible',
          'snap-x snap-mandatory scroll-smooth'
        )}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        {TERMINALS.map((terminal) => (
          <TerminalCard
            key={terminal.id}
            terminal={terminal}
            isSelected={selectedTerminal === terminal.id}
            onClick={() => onSelect(terminal.id)}
            preview={getPreview(terminal.id)}
          />
        ))}
      </div>
      {/* Mobile swipe indicator dots */}
      <div className="flex justify-center gap-1.5 mt-2 md:hidden">
        {TERMINALS.map((terminal) => (
          <button
            key={terminal.id}
            onClick={() => onSelect(terminal.id)}
            className={cn(
              'h-1.5 rounded-full transition-all duration-200',
              selectedTerminal === terminal.id
                ? 'w-4 bg-primary'
                : 'w-1.5 bg-muted-foreground/30'
            )}
            aria-label={`Select ${terminal.city}`}
          />
        ))}
      </div>
    </div>
  );
}
