'use client';

import { useState, useRef, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Seat, type SeatInfo } from './Seat';
import { SeatComparison, ComparisonBar, MAX_COMPARISON_SEATS } from './SeatComparison';
import { cn } from '@/lib/utils';
import {
  ArrowUp,
  ZoomIn,
  ZoomOut,
  Train,
  Plug,
  VolumeX,
  UtensilsCrossed,
  AlertTriangle,
  GitCompare,
} from 'lucide-react';

type TrainType = 'e320' | 'e300' | 'classic' | 'ruby';
type CoachClass = 'standard' | 'standard-premier' | 'business-premier';

interface CoachData {
  coachNumber: number;
  class: CoachClass;
  seats: SeatInfo[];
  layout: '2+1' | '2+2';
}

interface SeatMapProps {
  trainType: TrainType;
  coach?: number | undefined;
  seats: SeatInfo[];
  selectedSeat?: SeatInfo | null | undefined;
  recommendedSeats?: SeatInfo[] | undefined;
  recommendedSeatRanks?: Map<string, number> | undefined; // seatKey -> rank (0-indexed)
  onSeatClick?: ((seat: SeatInfo) => void) | undefined;
  onSeatSelect?: ((seat: SeatInfo) => void) | undefined;
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

// Keyboard navigation hook for seat grid
function useSeatKeyboardNavigation(
  seats: SeatInfo[],
  onSeatClick?: (seat: SeatInfo) => void
) {
  const [focusedIndex, setFocusedIndex] = useState<number>(-1);
  const seatRefs = useRef<Map<string, HTMLButtonElement | null>>(new Map());

  // Create a grid layout map for arrow key navigation
  const getSeatKey = (seat: SeatInfo) => `${seat.coach}-${seat.seatNumber}`;

  // Build grid structure: rows x positions
  const seatGrid = useCallback(() => {
    const rows = new Map<number, SeatInfo[]>();
    for (const seat of seats) {
      if (!rows.has(seat.row)) {
        rows.set(seat.row, []);
      }
      rows.get(seat.row)!.push(seat);
    }
    // Sort each row by position
    for (const row of rows.values()) {
      row.sort((a, b) => a.position.localeCompare(b.position));
    }
    // Sort rows by row number
    return Array.from(rows.entries())
      .sort((a, b) => a[0] - b[0])
      .map(([, rowSeats]) => rowSeats);
  }, [seats]);

  const flatSeats = useCallback(() => {
    return seatGrid().flat();
  }, [seatGrid]);

  const handleKeyDown = useCallback((event: React.KeyboardEvent, currentSeat: SeatInfo) => {
    const grid = seatGrid();
    const flat = flatSeats();
    const currentIndex = flat.findIndex(s => getSeatKey(s) === getSeatKey(currentSeat));
    if (currentIndex === -1) return;

    // Find current position in grid
    let currentRowIndex = -1;
    let currentColIndex = -1;
    for (let r = 0; r < grid.length; r++) {
      const row = grid[r]!;
      const col = row.findIndex(s => getSeatKey(s) === getSeatKey(currentSeat));
      if (col !== -1) {
        currentRowIndex = r;
        currentColIndex = col;
        break;
      }
    }

    let nextSeat: SeatInfo | null = null;

    switch (event.key) {
      case 'ArrowUp': {
        event.preventDefault();
        // Move to same position in previous row
        if (currentRowIndex > 0) {
          const prevRow = grid[currentRowIndex - 1]!;
          nextSeat = prevRow[Math.min(currentColIndex, prevRow.length - 1)] ?? null;
        }
        break;
      }
      case 'ArrowDown': {
        event.preventDefault();
        // Move to same position in next row
        if (currentRowIndex < grid.length - 1) {
          const nextRow = grid[currentRowIndex + 1]!;
          nextSeat = nextRow[Math.min(currentColIndex, nextRow.length - 1)] ?? null;
        }
        break;
      }
      case 'ArrowLeft': {
        event.preventDefault();
        // Move to previous seat in row
        const currentRow = grid[currentRowIndex]!;
        if (currentColIndex > 0) {
          nextSeat = currentRow[currentColIndex - 1] ?? null;
        }
        break;
      }
      case 'ArrowRight': {
        event.preventDefault();
        // Move to next seat in row
        const currentRow = grid[currentRowIndex]!;
        if (currentColIndex < currentRow.length - 1) {
          nextSeat = currentRow[currentColIndex + 1] ?? null;
        }
        break;
      }
      case 'Enter':
      case ' ': {
        event.preventDefault();
        onSeatClick?.(currentSeat);
        break;
      }
      case 'Home': {
        event.preventDefault();
        // Go to first seat
        nextSeat = flat[0] ?? null;
        break;
      }
      case 'End': {
        event.preventDefault();
        // Go to last seat
        nextSeat = flat[flat.length - 1] ?? null;
        break;
      }
    }

    if (nextSeat) {
      const nextIndex = flat.findIndex(s => getSeatKey(s) === getSeatKey(nextSeat));
      setFocusedIndex(nextIndex);
      const ref = seatRefs.current.get(getSeatKey(nextSeat));
      ref?.focus();
    }
  }, [seatGrid, flatSeats, onSeatClick]);

  const registerRef = useCallback((seat: SeatInfo, ref: HTMLButtonElement | null) => {
    if (ref) {
      seatRefs.current.set(getSeatKey(seat), ref);
    } else {
      seatRefs.current.delete(getSeatKey(seat));
    }
  }, []);

  const getTabIndex = useCallback((seat: SeatInfo): number => {
    const flat = flatSeats();
    const index = flat.findIndex(s => getSeatKey(s) === getSeatKey(seat));
    // Roving tabindex: only first seat or focused seat is tabbable
    if (focusedIndex === -1) {
      return index === 0 ? 0 : -1;
    }
    return index === focusedIndex ? 0 : -1;
  }, [flatSeats, focusedIndex]);

  return { handleKeyDown, registerRef, getTabIndex, focusedIndex };
}

// Feature icon components for the legend
function WindowIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 12 12"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
    >
      <rect x="1" y="2" width="10" height="8" rx="1" />
      <line x1="6" y1="2" x2="6" y2="10" />
      <line x1="1" y1="6" x2="11" y2="6" />
    </svg>
  );
}

function TableIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 12 12"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
    >
      <rect x="1" y="3" width="10" height="2" rx="0.5" />
      <line x1="3" y1="5" x2="3" y2="10" />
      <line x1="9" y1="5" x2="9" y2="10" />
    </svg>
  );
}

function NoWindowIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 12 12"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
    >
      <rect x="1" y="2" width="10" height="8" rx="1" />
      <line x1="1" y1="10" x2="11" y2="2" />
    </svg>
  );
}

function ToiletIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 12 12"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
    >
      <path d="M6 1V3" />
      <path d="M6 3C8.5 3 9 5 9 6.5C9 8 8 9 6 9C4 9 3 8 3 6.5C3 5 3.5 3 6 3Z" />
      <path d="M5 9V11" />
      <path d="M7 9V11" />
    </svg>
  );
}

function LimitedReclineIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 12 12"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
    >
      <path d="M4 10L4 4L8 2" />
      <path d="M2 6H6" />
      <circle cx="4" cy="2.5" r="1.5" />
    </svg>
  );
}

interface ZoomControlsProps {
  zoom: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onReset: () => void;
}

function ZoomControls({ zoom, onZoomIn, onZoomOut, onReset }: ZoomControlsProps) {
  return (
    <div className="flex items-center gap-1 bg-white/80 backdrop-blur rounded-lg shadow-sm border p-1">
      <Button
        variant="ghost"
        size="sm"
        onClick={onZoomOut}
        disabled={zoom <= 0.5}
        className="h-7 w-7 p-0"
      >
        <ZoomOut className="h-4 w-4" />
      </Button>
      <Button
        variant="ghost"
        size="sm"
        onClick={onReset}
        className="h-7 px-2 text-xs font-medium"
      >
        {Math.round(zoom * 100)}%
      </Button>
      <Button
        variant="ghost"
        size="sm"
        onClick={onZoomIn}
        disabled={zoom >= 1.5}
        className="h-7 w-7 p-0"
      >
        <ZoomIn className="h-4 w-4" />
      </Button>
    </div>
  );
}

function DirectionIndicator() {
  return (
    <div className="flex flex-col items-center gap-1 text-muted-foreground">
      <ArrowUp className="h-5 w-5" />
      <span className="text-xs font-medium">Direction of travel</span>
    </div>
  );
}

interface CoachViewProps {
  coachData: CoachData;
  selectedSeat?: SeatInfo | null | undefined;
  recommendedSeats?: SeatInfo[] | undefined;
  recommendedSeatRanks?: Map<string, number> | undefined;
  onSeatClick?: ((seat: SeatInfo) => void) | undefined;
  compact?: boolean | undefined;
  zoom?: number | undefined;
  comparisonSeats?: SeatInfo[] | undefined;
  isCompareMode?: boolean | undefined;
}

function CoachView({
  coachData,
  selectedSeat,
  recommendedSeats = [],
  recommendedSeatRanks,
  onSeatClick,
  compact = false,
  zoom = 1,
  comparisonSeats = [],
  isCompareMode: _isCompareMode = false,
}: CoachViewProps) {
  const rows = groupSeatsByRow(coachData.seats);
  const sortedRows = Array.from(rows.entries()).sort((a, b) => a[0] - b[0]);
  const layout = coachData.layout;
  const colors = classColors[coachData.class];

  // Keyboard navigation
  const { handleKeyDown, registerRef, getTabIndex } = useSeatKeyboardNavigation(
    coachData.seats,
    onSeatClick
  );

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

  const isInComparison = (seat: SeatInfo) =>
    comparisonSeats.some(
      (s) => s.coach === seat.coach && s.seatNumber === seat.seatNumber
    );

  return (
    <div
      className={cn(
        'relative overflow-hidden',
        colors.bg,
        colors.border,
        'border-2',
        // Rounded coach ends
        'rounded-t-[2rem] rounded-b-[2rem]',
        compact ? 'p-3' : 'p-4'
      )}
      style={{ transform: `scale(${zoom})`, transformOrigin: 'top center' }}
      role="grid"
      aria-label={`Coach ${coachData.coachNumber} seat map, ${classLabels[coachData.class]}`}
    >
      {/* Coach header with number and class badge */}
      <div className={cn('flex items-center justify-between mb-4', compact && 'mb-2')}>
        <div className="flex items-center gap-2">
          <div className={cn(
            'flex items-center justify-center rounded-full bg-white shadow-sm',
            compact ? 'w-8 h-8' : 'w-10 h-10'
          )}>
            <Train className={cn('text-slate-600', compact ? 'h-4 w-4' : 'h-5 w-5')} />
          </div>
          <span className={cn('font-bold', compact ? 'text-lg' : 'text-xl')}>
            {coachData.coachNumber}
          </span>
        </div>
        <Badge className={cn(colors.badge, compact ? 'text-xs' : 'text-sm')}>
          {classLabels[coachData.class]}
        </Badge>
      </div>

      {/* Direction indicator at top */}
      {!compact && (
        <div className="flex justify-center mb-3 pb-3 border-b border-current/10">
          <DirectionIndicator />
        </div>
      )}

      {/* Column headers */}
      <div className={cn(
        'flex items-center gap-1 mb-2',
        layout === '2+2' ? 'gap-3' : 'gap-6'
      )}>
        {/* Row number spacer */}
        <div className={cn('flex-shrink-0', compact ? 'w-5' : 'w-6')} />

        {/* Left side headers */}
        <div className="flex gap-1 flex-1 justify-end">
          <div className={cn('text-center text-xs font-medium text-muted-foreground', compact ? 'w-8' : 'w-10')}>A</div>
          <div className={cn('text-center text-xs font-medium text-muted-foreground', compact ? 'w-8' : 'w-10')}>B</div>
        </div>

        {/* Aisle */}
        <div className={cn('flex-shrink-0', compact ? 'w-4' : 'w-6')} />

        {/* Right side headers */}
        <div className="flex gap-1 flex-1">
          <div className={cn('text-center text-xs font-medium text-muted-foreground', compact ? 'w-8' : 'w-10')}>C</div>
          {layout === '2+2' && (
            <div className={cn('text-center text-xs font-medium text-muted-foreground', compact ? 'w-8' : 'w-10')}>D</div>
          )}
        </div>
      </div>

      {/* Seat rows */}
      <div className="space-y-1">
        {sortedRows.map(([rowNum, rowSeats]) => (
          <div
            key={rowNum}
            className={cn(
              'flex items-center gap-1',
              layout === '2+2' ? 'gap-3' : 'gap-6'
            )}
          >
            {/* Row number */}
            <div className={cn(
              'flex-shrink-0 text-xs font-medium text-muted-foreground text-right',
              compact ? 'w-5' : 'w-6'
            )}>
              {rowNum}
            </div>

            {/* Left side: A, B */}
            <div className="flex gap-1 flex-1 justify-end" role="row">
              {['A', 'B'].map((pos) => {
                const seat = rowSeats.find((s) => s.position === pos);
                return seat ? (
                  <Seat
                    key={seat.seatNumber}
                    seatInfo={seat}
                    isSelected={isSelected(seat)}
                    isRecommended={isRecommended(seat)}
                    isInComparison={isInComparison(seat)}
                    recommendedRank={getSeatRank(seat)}
                    onClick={onSeatClick}
                    refCallback={(ref) => registerRef(seat, ref)}
                    tabIndex={getTabIndex(seat)}
                    onKeyDown={(e) => handleKeyDown(e, seat)}
                  />
                ) : (
                  <div key={pos} className={cn(compact ? 'w-8 h-10' : 'w-10 h-12')} role="gridcell" aria-label="Empty seat position" />
                );
              })}
            </div>

            {/* Aisle with visual indicator */}
            <div className={cn(
              'flex-shrink-0 flex items-center justify-center',
              compact ? 'w-4' : 'w-6'
            )} aria-hidden="true">
              <div className={cn(
                'bg-slate-300/50 rounded-full',
                compact ? 'w-1 h-8' : 'w-1.5 h-10'
              )} />
            </div>

            {/* Right side: C, D (or just C for 2+1) */}
            <div className="flex gap-1 flex-1" role="row">
              {(layout === '2+2' ? ['C', 'D'] : ['C']).map((pos) => {
                const seat = rowSeats.find((s) => s.position === pos);
                return seat ? (
                  <Seat
                    key={seat.seatNumber}
                    seatInfo={seat}
                    isSelected={isSelected(seat)}
                    isRecommended={isRecommended(seat)}
                    isInComparison={isInComparison(seat)}
                    recommendedRank={getSeatRank(seat)}
                    onClick={onSeatClick}
                    refCallback={(ref) => registerRef(seat, ref)}
                    tabIndex={getTabIndex(seat)}
                    onKeyDown={(e) => handleKeyDown(e, seat)}
                  />
                ) : (
                  <div key={pos} className={cn(compact ? 'w-8 h-10' : 'w-10 h-12')} role="gridcell" aria-label="Empty seat position" />
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Bottom rounded cap visual */}
      <div className="mt-4 flex justify-center">
        <div className="w-12 h-1 bg-current/10 rounded-full" />
      </div>
    </div>
  );
}

function SeatMapLegend() {
  return (
    <Card>
      <CardContent className="py-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          {/* Score colors */}
          <div className="space-y-2">
            <h4 className="text-sm font-semibold text-muted-foreground">Seat Quality</h4>
            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <div className="w-5 h-5 rounded bg-gradient-to-b from-emerald-100 to-emerald-200 border-2 border-emerald-400" />
                <span className="text-sm">Good seat (70+)</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-5 h-5 rounded bg-gradient-to-b from-amber-100 to-amber-200 border-2 border-amber-400" />
                <span className="text-sm">Average (45-69)</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-5 h-5 rounded bg-gradient-to-b from-red-100 to-red-200 border-2 border-red-400" />
                <span className="text-sm">Below average (&lt;45)</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-5 h-5 rounded bg-gradient-to-b from-blue-100 to-blue-200 border-2 border-blue-500 ring-2 ring-blue-400 ring-offset-1" />
                <span className="text-sm">Recommended</span>
              </div>
            </div>
          </div>

          {/* Feature icons */}
          <div className="space-y-2">
            <h4 className="text-sm font-semibold text-muted-foreground">Features</h4>
            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <WindowIcon className="w-4 h-4 text-sky-600" />
                <span className="text-sm">Window seat</span>
              </div>
              <div className="flex items-center gap-2">
                <Plug className="w-4 h-4 text-yellow-600" />
                <span className="text-sm">Power outlet</span>
              </div>
              <div className="flex items-center gap-2">
                <TableIcon className="w-4 h-4 text-purple-600" />
                <span className="text-sm">Table seat</span>
              </div>
              <div className="flex items-center gap-2">
                <VolumeX className="w-4 h-4 text-blue-600" />
                <span className="text-sm">Quiet zone</span>
              </div>
            </div>
          </div>

          {/* Warning icons */}
          <div className="space-y-2">
            <h4 className="text-sm font-semibold text-muted-foreground">Warnings</h4>
            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <NoWindowIcon className="w-4 h-4 text-red-500" />
                <span className="text-sm">No window view</span>
              </div>
              <div className="flex items-center gap-2">
                <ToiletIcon className="w-4 h-4 text-red-500" />
                <span className="text-sm">Near toilet</span>
              </div>
              <div className="flex items-center gap-2">
                <LimitedReclineIcon className="w-4 h-4 text-red-500" />
                <span className="text-sm">Limited recline</span>
              </div>
              <div className="flex items-center gap-2">
                <UtensilsCrossed className="w-4 h-4 text-red-500" />
                <span className="text-sm">Near galley</span>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function SeatMap({
  trainType,
  coach,
  seats,
  selectedSeat,
  recommendedSeats = [],
  recommendedSeatRanks,
  onSeatClick,
  onSeatSelect,
}: SeatMapProps) {
  const [zoom, setZoom] = useState(1);
  const [isCompareMode, setIsCompareMode] = useState(false);
  const [comparisonSeats, setComparisonSeats] = useState<SeatInfo[]>([]);
  const [showComparison, setShowComparison] = useState(false);

  const allCoaches = groupSeatsByCoach(seats);

  const displayCoaches = coach
    ? allCoaches.filter((c) => c.coachNumber === coach)
    : allCoaches;

  const handleZoomIn = () => setZoom((z) => Math.min(z + 0.1, 1.5));
  const handleZoomOut = () => setZoom((z) => Math.max(z - 0.1, 0.5));
  const handleZoomReset = () => setZoom(1);

  // Comparison mode handlers
  const handleToggleCompareMode = () => {
    setIsCompareMode((prev) => !prev);
    if (isCompareMode) {
      setComparisonSeats([]);
      setShowComparison(false);
    }
  };

  const handleSeatClickInternal = (seat: SeatInfo) => {
    if (isCompareMode) {
      // In compare mode, add/remove from comparison
      const exists = comparisonSeats.some(
        (s) => s.coach === seat.coach && s.seatNumber === seat.seatNumber
      );

      if (exists) {
        setComparisonSeats((prev) =>
          prev.filter(
            (s) => !(s.coach === seat.coach && s.seatNumber === seat.seatNumber)
          )
        );
      } else if (comparisonSeats.length < MAX_COMPARISON_SEATS) {
        setComparisonSeats((prev) => [...prev, seat]);
      }
    } else {
      // Normal mode, pass to parent
      onSeatClick?.(seat);
    }
  };

  const handleRemoveFromComparison = (seat: SeatInfo) => {
    setComparisonSeats((prev) =>
      prev.filter(
        (s) => !(s.coach === seat.coach && s.seatNumber === seat.seatNumber)
      )
    );
  };

  const handleClearComparison = () => {
    setComparisonSeats([]);
    setShowComparison(false);
  };

  const handleViewComparison = () => {
    setShowComparison(true);
  };

  const handleSelectFromComparison = (seat: SeatInfo) => {
    onSeatSelect?.(seat);
    onSeatClick?.(seat);
    setIsCompareMode(false);
    setComparisonSeats([]);
    setShowComparison(false);
  };

  if (displayCoaches.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          <AlertTriangle className="h-8 w-8 mx-auto mb-2 text-amber-500" />
          No seat data available for {trainType}
          {coach ? ` coach ${coach}` : ''}
        </CardContent>
      </Card>
    );
  }

  // Single coach view
  const singleCoach = displayCoaches[0];
  if ((coach || displayCoaches.length === 1) && singleCoach) {
    return (
      <div className={cn('space-y-4', comparisonSeats.length > 0 && 'pb-20')}>
        {/* Controls row */}
        <div className="flex items-center justify-between">
          {/* Compare mode toggle */}
          <Button
            variant={isCompareMode ? 'default' : 'outline'}
            size="sm"
            onClick={handleToggleCompareMode}
            className={cn(isCompareMode && 'bg-blue-600 hover:bg-blue-700')}
          >
            <GitCompare className="w-4 h-4 mr-2" />
            {isCompareMode ? 'Exit Compare' : 'Compare'}
          </Button>

          {/* Zoom controls */}
          <ZoomControls
            zoom={zoom}
            onZoomIn={handleZoomIn}
            onZoomOut={handleZoomOut}
            onReset={handleZoomReset}
          />
        </div>

        {/* Comparison panel */}
        {showComparison && comparisonSeats.length >= 2 && (
          <SeatComparison
            seats={comparisonSeats}
            onRemoveSeat={handleRemoveFromComparison}
            onClearAll={handleClearComparison}
            onSelectSeat={handleSelectFromComparison}
          />
        )}

        {/* Coach view */}
        <div className="overflow-auto">
          <div className="inline-block min-w-fit">
            <CoachView
              coachData={singleCoach}
              selectedSeat={selectedSeat}
              recommendedSeats={recommendedSeats}
              recommendedSeatRanks={recommendedSeatRanks}
              onSeatClick={handleSeatClickInternal}
              zoom={zoom}
              comparisonSeats={comparisonSeats}
              isCompareMode={isCompareMode}
            />
          </div>
        </div>

        {/* Legend */}
        <SeatMapLegend />

        {/* Floating comparison bar */}
        <ComparisonBar
          seats={comparisonSeats}
          isCompareMode={isCompareMode}
          onToggleCompareMode={handleToggleCompareMode}
          onRemoveSeat={handleRemoveFromComparison}
          onClearAll={handleClearComparison}
          onViewComparison={handleViewComparison}
        />
      </div>
    );
  }

  // Overview of all coaches
  return (
    <div className={cn('space-y-4', comparisonSeats.length > 0 && 'pb-20')}>
      {/* Controls row */}
      <div className="flex items-center justify-between">
        {/* Compare mode toggle */}
        <Button
          variant={isCompareMode ? 'default' : 'outline'}
          size="sm"
          onClick={handleToggleCompareMode}
          className={cn(isCompareMode && 'bg-blue-600 hover:bg-blue-700')}
        >
          <GitCompare className="w-4 h-4 mr-2" />
          {isCompareMode ? 'Exit Compare' : 'Compare'}
        </Button>

        {/* Zoom controls */}
        <ZoomControls
          zoom={zoom}
          onZoomIn={handleZoomIn}
          onZoomOut={handleZoomOut}
          onReset={handleZoomReset}
        />
      </div>

      {/* Comparison panel */}
      {showComparison && comparisonSeats.length >= 2 && (
        <SeatComparison
          seats={comparisonSeats}
          onRemoveSeat={handleRemoveFromComparison}
          onClearAll={handleClearComparison}
          onSelectSeat={handleSelectFromComparison}
        />
      )}

      {/* Legend */}
      <SeatMapLegend />

      {/* Coaches grid */}
      <div
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4"
        style={{ transform: `scale(${zoom})`, transformOrigin: 'top left' }}
      >
        {displayCoaches.map((coachData) => (
          <CoachView
            key={coachData.coachNumber}
            coachData={coachData}
            selectedSeat={selectedSeat}
            recommendedSeats={recommendedSeats}
            recommendedSeatRanks={recommendedSeatRanks}
            onSeatClick={handleSeatClickInternal}
            compact
            comparisonSeats={comparisonSeats}
            isCompareMode={isCompareMode}
          />
        ))}
      </div>

      {/* Floating comparison bar */}
      <ComparisonBar
        seats={comparisonSeats}
        isCompareMode={isCompareMode}
        onToggleCompareMode={handleToggleCompareMode}
        onRemoveSeat={handleRemoveFromComparison}
        onClearAll={handleClearComparison}
        onViewComparison={handleViewComparison}
      />
    </div>
  );
}
