'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';
import { Tooltip } from '@/components/ui/tooltip';
import { ChevronLeft, ChevronRight } from 'lucide-react';

type CoachClass = 'standard' | 'standard-premier' | 'business-premier';

export interface CoachInfo {
  coachNumber: number;
  class: CoachClass;
  seatCount: number;
  availableSeats?: number;
}

interface TrainOverviewProps {
  coaches: CoachInfo[];
  currentCoach?: number | undefined;
  onCoachClick?: ((coachNumber: number) => void) | undefined;
}

const classColors: Record<CoachClass, { bg: string; border: string; label: string }> = {
  'business-premier': {
    bg: 'bg-amber-400',
    border: 'border-amber-500',
    label: 'Business Premier',
  },
  'standard-premier': {
    bg: 'bg-purple-400',
    border: 'border-purple-500',
    label: 'Standard Premier',
  },
  standard: {
    bg: 'bg-slate-400',
    border: 'border-slate-500',
    label: 'Standard',
  },
};

interface MiniCoachProps {
  coach: CoachInfo;
  isActive: boolean;
  onClick?: () => void;
}

function MiniCoach({ coach, isActive, onClick }: MiniCoachProps) {
  const colors = classColors[coach.class];

  const tooltipContent = (
    <div className="space-y-1 min-w-[120px]">
      <div className="font-semibold">Coach {coach.coachNumber}</div>
      <div className="text-xs text-muted-foreground">{colors.label}</div>
      <div className="text-xs">
        {coach.seatCount} seats
        {coach.availableSeats !== undefined && (
          <span className="text-muted-foreground">
            {' '}({coach.availableSeats} available)
          </span>
        )}
      </div>
    </div>
  );

  return (
    <Tooltip content={tooltipContent} side="bottom">
      <button
        type="button"
        onClick={onClick}
        className={cn(
          'relative flex flex-col items-center justify-center',
          'w-10 h-8 rounded-sm',
          'border-2 transition-all duration-200',
          'hover:scale-110 hover:z-10',
          colors.bg,
          colors.border,
          isActive && [
            'ring-2 ring-primary ring-offset-1',
            'scale-110 z-10',
            'shadow-lg',
          ],
          !isActive && 'hover:shadow-md'
        )}
        aria-label={`Coach ${coach.coachNumber} - ${colors.label}`}
        aria-current={isActive ? 'true' : undefined}
      >
        <span className={cn(
          'text-[10px] font-bold text-white drop-shadow-sm',
          isActive && 'text-white'
        )}>
          {coach.coachNumber}
        </span>
      </button>
    </Tooltip>
  );
}

function TrainEnd({ direction }: { direction: 'front' | 'back' }) {
  const isFront = direction === 'front';

  return (
    <div className={cn(
      'flex items-center gap-1 text-muted-foreground',
      isFront ? 'flex-row' : 'flex-row-reverse'
    )}>
      <div className={cn(
        'flex items-center justify-center',
        'w-6 h-8 rounded-sm',
        'bg-slate-200 border-2 border-slate-300',
        isFront ? 'rounded-l-lg' : 'rounded-r-lg'
      )}>
        {isFront ? (
          <ChevronLeft className="w-4 h-4 text-slate-500" />
        ) : (
          <ChevronRight className="w-4 h-4 text-slate-500" />
        )}
      </div>
      <span className="text-xs font-medium whitespace-nowrap">
        {isFront ? 'Front' : 'Back'}
      </span>
    </div>
  );
}

function ClassLegend() {
  return (
    <div className="flex items-center gap-4 text-xs">
      {Object.entries(classColors).map(([key, colors]) => (
        <div key={key} className="flex items-center gap-1.5">
          <div className={cn(
            'w-3 h-3 rounded-sm',
            colors.bg,
            'border',
            colors.border
          )} />
          <span className="text-muted-foreground">{colors.label}</span>
        </div>
      ))}
    </div>
  );
}

export function TrainOverview({
  coaches,
  currentCoach,
  onCoachClick,
}: TrainOverviewProps) {
  // Sort coaches by number
  const sortedCoaches = React.useMemo(
    () => [...coaches].sort((a, b) => a.coachNumber - b.coachNumber),
    [coaches]
  );

  if (sortedCoaches.length === 0) {
    return null;
  }

  return (
    <div className="space-y-3">
      {/* Train visualization */}
      <div className="flex items-center justify-center gap-1 p-4 bg-gradient-to-b from-slate-50 to-slate-100 rounded-lg border overflow-x-auto">
        <TrainEnd direction="front" />

        {/* Coach cars */}
        <div className="flex items-center gap-0.5 mx-2">
          {sortedCoaches.map((coach) => (
            <React.Fragment key={coach.coachNumber}>
              <MiniCoach
                coach={coach}
                isActive={currentCoach === coach.coachNumber}
                onClick={() => onCoachClick?.(coach.coachNumber)}
              />
              {/* Connector between coaches */}
              {coach.coachNumber < sortedCoaches.length && (
                <div className="w-1 h-4 bg-slate-300 rounded-full" />
              )}
            </React.Fragment>
          ))}
        </div>

        <TrainEnd direction="back" />
      </div>

      {/* Legend */}
      <div className="flex justify-center">
        <ClassLegend />
      </div>
    </div>
  );
}
