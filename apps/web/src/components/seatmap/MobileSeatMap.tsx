'use client';

import * as React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Seat, type SeatInfo } from './Seat';
import { CoachTabs } from './CoachTabs';
import { cn } from '@/lib/utils';
import { useTouchGestures } from '@/hooks/use-touch-gestures';
import {
  ArrowUp,
  ZoomIn,
  ZoomOut,
  Train,
  AlertTriangle,
  RotateCcw,
} from 'lucide-react';

type TrainType = 'e320' | 'e300' | 'classic' | 'ruby';
type CoachClass = 'standard' | 'standard-premier' | 'business-premier';

interface CoachData {
  coachNumber: number;
  class: CoachClass;
  seats: SeatInfo[];
  layout: '2+1' | '2+2';
}

interface MobileSeatMapProps {
  trainType: TrainType;
  coach?: number | undefined;
  seats: SeatInfo[];
  selectedSeat?: SeatInfo | null | undefined;
  recommendedSeats?: SeatInfo[] | undefined;
  recommendedSeatRanks?: Map<string, number> | undefined;
  onSeatClick?: ((seat: SeatInfo) => void) | undefined;
  onCoachChange?: ((coachNumber: number) => void) | undefined;
}

const classLabels: Record<CoachClass, string> = {
  'business-premier': 'Business Premier',
  'standard-premier': 'Standard Premier',
  standard: 'Standard',
};

const classColors: Record<CoachClass, { bg: string; border: string; badge: string }> = {
  'business-premier': {
    bg: 'bg-gradient-to-b from-amber-50 to-amber-100',
    border: 'border-amber-300',
    badge: 'bg-amber-600 text-white',
  },
  'standard-premier': {
    bg: 'bg-gradient-to-b from-purple-50 to-purple-100',
    border: 'border-purple-300',
    badge: 'bg-purple-600 text-white',
  },
  standard: {
    bg: 'bg-gradient-to-b from-slate-50 to-slate-100',
    border: 'border-slate-300',
    badge: 'bg-slate-600 text-white',
  },
};

function getCoachLayout(coachClass: CoachClass): '2+1' | '2+2' {
  return coachClass === 'standard' ? '2+2' : '2+1';
}

function groupSeatsByCoach(seats: SeatInfo[]): CoachData[] {
  const coaches = new Map<number, CoachData>();

  for (const seat of seats) {
    if (!coaches.has(seat.coach)) {
      coaches.set(seat.coach, {
        coachNumber: seat.coach,
        class: seat.class,
        seats: [],
        layout: getCoachLayout(seat.class),
      });
    }
    coaches.get(seat.coach)!.seats.push(seat);
  }

  return Array.from(coaches.values()).sort((a, b) => a.coachNumber - b.coachNumber);
}

function groupSeatsByRow(seats: SeatInfo[]): Map<number, SeatInfo[]> {
  const rows = new Map<number, SeatInfo[]>();

  for (const seat of seats) {
    if (!rows.has(seat.row)) {
      rows.set(seat.row, []);
    }
    rows.get(seat.row)!.push(seat);
  }

  for (const row of rows.values()) {
    row.sort((a, b) => a.position.localeCompare(b.position));
  }

  return rows;
}

function DirectionIndicator() {
  return (
    <div className="flex items-center justify-center gap-2 py-2 text-muted-foreground">
      <ArrowUp className="h-4 w-4" />
      <span className="text-xs font-medium">Direction of travel</span>
    </div>
  );
}

interface MobileCoachViewProps {
  coachData: CoachData;
  selectedSeat?: SeatInfo | null | undefined;
  recommendedSeats?: SeatInfo[] | undefined;
  recommendedSeatRanks?: Map<string, number> | undefined;
  onSeatClick?: ((seat: SeatInfo) => void) | undefined;
  zoom: number;
}

function MobileCoachView({
  coachData,
  selectedSeat,
  recommendedSeats = [],
  recommendedSeatRanks,
  onSeatClick,
  zoom,
}: MobileCoachViewProps) {
  const rows = groupSeatsByRow(coachData.seats);
  const sortedRows = Array.from(rows.entries()).sort((a, b) => a[0] - b[0]);
  const layout = coachData.layout;
  const colors = classColors[coachData.class];

  const getSeatKey = (seat: SeatInfo) => `${seat.coach}-${seat.seatNumber}`;

  const isRecommended = (seat: SeatInfo) =>
    recommendedSeats.some(
      (r) => r.coach === seat.coach && r.seatNumber === seat.seatNumber
    );

  const getSeatRank = (seat: SeatInfo): number | undefined => {
    if (!recommendedSeatRanks) return undefined;
    return recommendedSeatRanks.get(getSeatKey(seat));
  };

  const isSelected = (seat: SeatInfo) =>
    selectedSeat?.coach === seat.coach && selectedSeat?.seatNumber === seat.seatNumber;

  // Larger touch targets for mobile
  const seatSize = 'w-12 h-14';
  const rowGap = 'gap-1.5';

  return (
    <div
      className={cn(
        'relative overflow-hidden',
        colors.bg,
        colors.border,
        'border-2',
        'rounded-t-[2rem] rounded-b-[2rem]',
        'p-4'
      )}
      style={{
        transform: `scale(${zoom})`,
        transformOrigin: 'top center',
        transition: 'transform 0.1s ease-out'
      }}
    >
      {/* Coach header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="flex items-center justify-center rounded-full bg-white shadow-sm w-10 h-10">
            <Train className="h-5 w-5 text-slate-600" />
          </div>
          <span className="font-bold text-xl">{coachData.coachNumber}</span>
        </div>
        <Badge className={cn(colors.badge, 'text-sm px-3 py-1')}>
          {classLabels[coachData.class]}
        </Badge>
      </div>

      {/* Direction indicator */}
      <div className="border-b border-current/10 mb-3">
        <DirectionIndicator />
      </div>

      {/* Column headers */}
      <div className={cn('flex items-center mb-2', layout === '2+2' ? 'gap-4' : 'gap-8')}>
        <div className="w-7" /> {/* Row number spacer */}
        <div className="flex gap-1.5 flex-1 justify-end">
          <div className={cn('text-center text-xs font-medium text-muted-foreground', seatSize)}>A</div>
          <div className={cn('text-center text-xs font-medium text-muted-foreground', seatSize)}>B</div>
        </div>
        <div className="w-5" /> {/* Aisle */}
        <div className="flex gap-1.5 flex-1">
          <div className={cn('text-center text-xs font-medium text-muted-foreground', seatSize)}>C</div>
          {layout === '2+2' && (
            <div className={cn('text-center text-xs font-medium text-muted-foreground', seatSize)}>D</div>
          )}
        </div>
      </div>

      {/* Seat rows */}
      <div className="space-y-1.5">
        {sortedRows.map(([rowNum, rowSeats]) => (
          <div
            key={rowNum}
            className={cn('flex items-center', layout === '2+2' ? 'gap-4' : 'gap-8')}
          >
            {/* Row number */}
            <div className="w-7 text-xs font-medium text-muted-foreground text-right">
              {rowNum}
            </div>

            {/* Left side: A, B */}
            <div className={cn('flex flex-1 justify-end', rowGap)}>
              {['A', 'B'].map((pos) => {
                const seat = rowSeats.find((s) => s.position === pos);
                return seat ? (
                  <Seat
                    key={seat.seatNumber}
                    seatInfo={seat}
                    isSelected={isSelected(seat)}
                    isRecommended={isRecommended(seat)}
                    recommendedRank={getSeatRank(seat)}
                    onClick={onSeatClick}
                    size="mobile"
                  />
                ) : (
                  <div key={pos} className={seatSize} />
                );
              })}
            </div>

            {/* Aisle indicator */}
            <div className="w-5 flex items-center justify-center">
              <div className="w-1.5 h-12 bg-slate-300/50 rounded-full" />
            </div>

            {/* Right side: C, D (or just C for 2+1) */}
            <div className={cn('flex flex-1', rowGap)}>
              {(layout === '2+2' ? ['C', 'D'] : ['C']).map((pos) => {
                const seat = rowSeats.find((s) => s.position === pos);
                return seat ? (
                  <Seat
                    key={seat.seatNumber}
                    seatInfo={seat}
                    isSelected={isSelected(seat)}
                    isRecommended={isRecommended(seat)}
                    recommendedRank={getSeatRank(seat)}
                    onClick={onSeatClick}
                    size="mobile"
                  />
                ) : (
                  <div key={pos} className={seatSize} />
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Bottom cap */}
      <div className="mt-4 flex justify-center">
        <div className="w-16 h-1 bg-current/10 rounded-full" />
      </div>
    </div>
  );
}

export function MobileSeatMap({
  trainType,
  coach,
  seats,
  selectedSeat,
  recommendedSeats = [],
  recommendedSeatRanks,
  onSeatClick,
  onCoachChange,
}: MobileSeatMapProps) {
  const allCoaches = React.useMemo(() => groupSeatsByCoach(seats), [seats]);

  // Default to first coach if none selected
  const [activeCoach, setActiveCoach] = React.useState<number>(() => {
    if (coach) return coach;
    return allCoaches[0]?.coachNumber ?? 1;
  });

  // Sync with external coach prop
  React.useEffect(() => {
    if (coach !== undefined) {
      setActiveCoach(coach);
    }
  }, [coach]);

  const currentCoachData = React.useMemo(
    () => allCoaches.find((c) => c.coachNumber === activeCoach),
    [allCoaches, activeCoach]
  );

  // Coach info for tabs
  const coachInfo = React.useMemo(
    () =>
      allCoaches.map((c) => ({
        coachNumber: c.coachNumber,
        class: c.class,
        seatCount: c.seats.length,
      })),
    [allCoaches]
  );

  // Handle coach navigation
  const handleCoachSelect = React.useCallback(
    (coachNumber: number) => {
      setActiveCoach(coachNumber);
      onCoachChange?.(coachNumber);
    },
    [onCoachChange]
  );

  const goToPreviousCoach = React.useCallback(() => {
    const currentIndex = allCoaches.findIndex((c) => c.coachNumber === activeCoach);
    if (currentIndex > 0) {
      const prevCoach = allCoaches[currentIndex - 1];
      if (prevCoach) {
        handleCoachSelect(prevCoach.coachNumber);
      }
    }
  }, [allCoaches, activeCoach, handleCoachSelect]);

  const goToNextCoach = React.useCallback(() => {
    const currentIndex = allCoaches.findIndex((c) => c.coachNumber === activeCoach);
    if (currentIndex < allCoaches.length - 1) {
      const nextCoach = allCoaches[currentIndex + 1];
      if (nextCoach) {
        handleCoachSelect(nextCoach.coachNumber);
      }
    }
  }, [allCoaches, activeCoach, handleCoachSelect]);

  // Touch gestures for pinch-zoom and swipe
  const { ref: touchRef, scale, setScale, resetScale } = useTouchGestures<HTMLDivElement>({
    onPinchZoom: (newScale) => setScale(newScale),
    onSwipeLeft: goToNextCoach,
    onSwipeRight: goToPreviousCoach,
    minScale: 0.6,
    maxScale: 1.5,
  });

  // Zoom controls
  const handleZoomIn = () => setScale(Math.min(1.5, scale + 0.1));
  const handleZoomOut = () => setScale(Math.max(0.6, scale - 0.1));

  if (allCoaches.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          <AlertTriangle className="h-8 w-8 mx-auto mb-2 text-amber-500" />
          No seat data available for {trainType}
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {/* Coach selector tabs */}
      <CoachTabs
        coaches={coachInfo}
        currentCoach={activeCoach}
        onCoachSelect={handleCoachSelect}
      />

      {/* Zoom controls */}
      <div className="flex items-center justify-between px-1">
        <span className="text-xs text-muted-foreground">
          Swipe to change coach • Pinch to zoom
        </span>
        <div className="flex items-center gap-1 bg-background border rounded-lg p-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleZoomOut}
            disabled={scale <= 0.6}
            className="h-8 w-8 p-0"
          >
            <ZoomOut className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={resetScale}
            className="h-8 px-2 text-xs font-medium"
          >
            {Math.round(scale * 100)}%
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleZoomIn}
            disabled={scale >= 1.5}
            className="h-8 w-8 p-0"
          >
            <ZoomIn className="h-4 w-4" />
          </Button>
          {scale !== 1 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={resetScale}
              className="h-8 w-8 p-0"
            >
              <RotateCcw className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      {/* Coach view with touch gestures */}
      <div
        ref={touchRef}
        className="overflow-auto touch-pan-x touch-pan-y"
        style={{ WebkitOverflowScrolling: 'touch' }}
      >
        <div className="min-w-fit p-2">
          {currentCoachData && (
            <MobileCoachView
              coachData={currentCoachData}
              selectedSeat={selectedSeat}
              recommendedSeats={recommendedSeats}
              recommendedSeatRanks={recommendedSeatRanks}
              onSeatClick={onSeatClick}
              zoom={scale}
            />
          )}
        </div>
      </div>
    </div>
  );
}
