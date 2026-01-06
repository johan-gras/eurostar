'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';
import { Train, ChevronLeft, ChevronRight } from 'lucide-react';

type CoachClass = 'standard' | 'standard-premier' | 'business-premier';

interface CoachInfo {
  coachNumber: number;
  class: CoachClass;
  seatCount: number;
}

interface CoachTabsProps {
  coaches: CoachInfo[];
  currentCoach?: number;
  onCoachSelect: (coachNumber: number) => void;
}

const classColors: Record<CoachClass, { bg: string; border: string; text: string; activeBg: string }> = {
  'business-premier': {
    bg: 'bg-amber-100',
    border: 'border-amber-300',
    text: 'text-amber-900',
    activeBg: 'bg-amber-500',
  },
  'standard-premier': {
    bg: 'bg-purple-100',
    border: 'border-purple-300',
    text: 'text-purple-900',
    activeBg: 'bg-purple-500',
  },
  standard: {
    bg: 'bg-slate-100',
    border: 'border-slate-300',
    text: 'text-slate-900',
    activeBg: 'bg-slate-500',
  },
};

const classLabels: Record<CoachClass, string> = {
  'business-premier': 'BP',
  'standard-premier': 'SP',
  standard: 'STD',
};

export function CoachTabs({ coaches, currentCoach, onCoachSelect }: CoachTabsProps) {
  const scrollContainerRef = React.useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = React.useState(false);
  const [canScrollRight, setCanScrollRight] = React.useState(false);

  const checkScrollButtons = React.useCallback(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    setCanScrollLeft(container.scrollLeft > 0);
    setCanScrollRight(
      container.scrollLeft < container.scrollWidth - container.clientWidth - 1
    );
  }, []);

  React.useEffect(() => {
    checkScrollButtons();
    const container = scrollContainerRef.current;
    if (container) {
      container.addEventListener('scroll', checkScrollButtons);
      window.addEventListener('resize', checkScrollButtons);
      return () => {
        container.removeEventListener('scroll', checkScrollButtons);
        window.removeEventListener('resize', checkScrollButtons);
      };
    }
  }, [checkScrollButtons, coaches]);

  // Scroll to active coach on mount or when currentCoach changes
  React.useEffect(() => {
    if (currentCoach && scrollContainerRef.current) {
      const activeTab = scrollContainerRef.current.querySelector(
        `[data-coach="${currentCoach}"]`
      );
      if (activeTab) {
        activeTab.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
      }
    }
  }, [currentCoach]);

  const scroll = (direction: 'left' | 'right') => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const scrollAmount = 200;
    container.scrollBy({
      left: direction === 'left' ? -scrollAmount : scrollAmount,
      behavior: 'smooth',
    });
  };

  return (
    <div className="relative bg-background border rounded-lg p-2">
      {/* Left scroll button */}
      {canScrollLeft && (
        <button
          onClick={() => scroll('left')}
          className={cn(
            'absolute left-0 top-0 bottom-0 z-10 w-8',
            'flex items-center justify-center',
            'bg-gradient-to-r from-background via-background to-transparent',
            'text-muted-foreground hover:text-foreground transition-colors'
          )}
          aria-label="Scroll left"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
      )}

      {/* Scrollable tabs container */}
      <div
        ref={scrollContainerRef}
        className={cn(
          'flex gap-2 overflow-x-auto scrollbar-hide',
          'scroll-smooth snap-x snap-mandatory',
          '-mx-1 px-1'
        )}
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        {coaches.map((coach) => {
          const colors = classColors[coach.class];
          const isActive = currentCoach === coach.coachNumber;

          return (
            <button
              key={coach.coachNumber}
              data-coach={coach.coachNumber}
              onClick={() => onCoachSelect(coach.coachNumber)}
              className={cn(
                'flex-shrink-0 snap-center',
                'flex flex-col items-center gap-1',
                'min-w-[64px] p-2 rounded-lg border-2 transition-all',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
                // Touch-friendly sizing
                'min-h-[64px]',
                isActive
                  ? cn(colors.activeBg, 'border-transparent text-white shadow-md')
                  : cn(colors.bg, colors.border, colors.text, 'hover:shadow-sm')
              )}
            >
              <div className="flex items-center gap-1">
                <Train className="w-4 h-4" />
                <span className="font-bold text-sm">{coach.coachNumber}</span>
              </div>
              <span className="text-[10px] font-medium opacity-80">
                {classLabels[coach.class]}
              </span>
            </button>
          );
        })}
      </div>

      {/* Right scroll button */}
      {canScrollRight && (
        <button
          onClick={() => scroll('right')}
          className={cn(
            'absolute right-0 top-0 bottom-0 z-10 w-8',
            'flex items-center justify-center',
            'bg-gradient-to-l from-background via-background to-transparent',
            'text-muted-foreground hover:text-foreground transition-colors'
          )}
          aria-label="Scroll right"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      )}
    </div>
  );
}
