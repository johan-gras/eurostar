'use client';

import * as React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { SeatInfo } from './Seat';
import {
  Trophy,
  Medal,
  ChevronDown,
  ChevronUp,
  Sparkles,
  Check,
  Star,
  SearchX,
  SlidersHorizontal,
} from 'lucide-react';

interface RecommendationGroup {
  seats: SeatInfo[];
  totalScore: number;
  averageScore: number;
}

interface RecommendationResultsProps {
  recommendations: RecommendationGroup[];
  onSeatClick: (seat: SeatInfo) => void;
  onScrollToSeat?: (seat: SeatInfo) => void;
  hasActiveFilters?: boolean;
  onClearFilters?: () => void;
}

const rankIcons = [
  { icon: Trophy, color: 'text-amber-500', bg: 'bg-amber-100', label: '#1' },
  { icon: Medal, color: 'text-slate-400', bg: 'bg-slate-100', label: '#2' },
  { icon: Medal, color: 'text-amber-700', bg: 'bg-amber-50', label: '#3' },
];

function getRankStyle(rank: number) {
  if (rank < rankIcons.length) {
    return rankIcons[rank]!;
  }
  return { icon: Star, color: 'text-slate-400', bg: 'bg-slate-50', label: `#${rank + 1}` };
}

function formatSeatList(seats: SeatInfo[]): string {
  if (seats.length === 1) {
    return `Seat ${seats[0]!.seatNumber}`;
  }
  return seats.map((s) => s.seatNumber).join(', ');
}

function getTopPickReason(recommendation: RecommendationGroup): string {
  const seat = recommendation.seats[0];
  if (!seat) return 'Best overall match';

  const reasons: string[] = [];

  if (seat.features.includes('window')) reasons.push('window view');
  if (seat.features.includes('quiet')) reasons.push('quiet zone');
  if (seat.features.includes('table')) reasons.push('table seating');
  if (seat.features.includes('power')) reasons.push('power outlet');
  if (seat.features.includes('facing-forward')) reasons.push('forward facing');

  if (seat.warnings.length === 0) {
    reasons.push('no drawbacks');
  }

  if (reasons.length === 0) return 'Best overall score';
  if (reasons.length === 1) return `Has ${reasons[0]}`;
  if (reasons.length === 2) return `Has ${reasons[0]} and ${reasons[1]}`;
  return `Has ${reasons.slice(0, 2).join(', ')} + more`;
}

interface RecommendationCardProps {
  recommendation: RecommendationGroup;
  rank: number;
  isTopPick: boolean;
  onSeatClick: (seat: SeatInfo) => void;
  onScrollToSeat?: ((seat: SeatInfo) => void) | undefined;
}

function RecommendationCard({
  recommendation,
  rank,
  isTopPick,
  onSeatClick,
  onScrollToSeat,
}: RecommendationCardProps) {
  const rankStyle = getRankStyle(rank);
  const RankIcon = rankStyle.icon;
  const firstSeat = recommendation.seats[0];

  return (
    <div
      className={cn(
        'relative p-3 rounded-lg border-2 transition-all duration-200',
        'hover:shadow-md cursor-pointer',
        isTopPick
          ? 'border-amber-400 bg-gradient-to-r from-amber-50 to-amber-100/50'
          : 'border-slate-200 bg-white hover:border-slate-300'
      )}
      onClick={() => {
        if (firstSeat) {
          onSeatClick(firstSeat);
          onScrollToSeat?.(firstSeat);
        }
      }}
    >
      {/* Rank badge */}
      <div
        className={cn(
          'absolute -top-2 -left-2 flex items-center justify-center',
          'w-8 h-8 rounded-full shadow-sm',
          rankStyle.bg
        )}
      >
        <RankIcon className={cn('w-4 h-4', rankStyle.color)} />
      </div>

      {/* Best match badge for #1 */}
      {isTopPick && (
        <Badge
          className="absolute -top-2 right-2 bg-amber-500 text-white shadow-sm animate-pulse"
        >
          <Sparkles className="w-3 h-3 mr-1" />
          Best Match
        </Badge>
      )}

      <div className="ml-6">
        {/* Seat info */}
        <div className="flex items-center justify-between">
          <div>
            <div className="font-semibold text-sm">
              {recommendation.seats.length > 1 ? 'Seats' : 'Seat'}{' '}
              {formatSeatList(recommendation.seats)}
            </div>
            {firstSeat && (
              <div className="text-xs text-muted-foreground">
                Coach {firstSeat.coach} &middot;{' '}
                {firstSeat.class.replace('-', ' ')}
              </div>
            )}
          </div>
          <div className="text-right">
            <div
              className={cn(
                'text-lg font-bold',
                recommendation.averageScore >= 70 && 'text-emerald-600',
                recommendation.averageScore >= 45 &&
                  recommendation.averageScore < 70 &&
                  'text-amber-600',
                recommendation.averageScore < 45 && 'text-red-600'
              )}
            >
              {Math.round(recommendation.averageScore)}
            </div>
            <div className="text-xs text-muted-foreground">score</div>
          </div>
        </div>

        {/* Top pick reason */}
        {isTopPick && (
          <div className="mt-2 flex items-center gap-1.5 text-xs text-amber-700">
            <Check className="w-3 h-3" />
            {getTopPickReason(recommendation)}
          </div>
        )}
      </div>
    </div>
  );
}

// No matches component
function NoMatchesMessage({
  hasActiveFilters,
  onClearFilters,
}: {
  hasActiveFilters?: boolean | undefined;
  onClearFilters?: (() => void) | undefined;
}) {
  return (
    <Card>
      <CardContent className="py-8">
        <div className="flex flex-col items-center text-center space-y-4">
          <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center">
            <SearchX className="w-6 h-6 text-slate-400" />
          </div>
          <div className="space-y-2">
            <h3 className="font-semibold text-lg">No matching seats found</h3>
            <p className="text-sm text-muted-foreground max-w-sm">
              {hasActiveFilters
                ? "Your current preferences are quite specific. Try relaxing some filters to see more options."
                : "No seats match the default criteria. Try adjusting your preferences."}
            </p>
          </div>
          {hasActiveFilters && onClearFilters && (
            <Button variant="outline" size="sm" onClick={onClearFilters}>
              <SlidersHorizontal className="w-4 h-4 mr-2" />
              Reset Preferences
            </Button>
          )}
          <div className="pt-2 text-xs text-muted-foreground">
            <p className="font-medium mb-1">Tips to find more seats:</p>
            <ul className="space-y-0.5 text-left">
              <li>&bull; Remove the window or table requirement</li>
              <li>&bull; Consider seats facing backward</li>
              <li>&bull; Check different coaches</li>
            </ul>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function RecommendationResults({
  recommendations,
  onSeatClick,
  onScrollToSeat,
  hasActiveFilters,
  onClearFilters,
}: RecommendationResultsProps) {
  const [showAll, setShowAll] = React.useState(false);

  const totalSeats = recommendations.reduce((sum, r) => sum + r.seats.length, 0);
  const displayedRecommendations = showAll
    ? recommendations
    : recommendations.slice(0, 5);
  const hasMore = recommendations.length > 5;

  // Generate live region announcement text
  const liveAnnouncement = React.useMemo(() => {
    if (recommendations.length === 0) {
      return 'No matching seats found. Try adjusting your preferences.';
    }
    const topSeat = recommendations[0]?.seats[0];
    const topScore = recommendations[0]?.averageScore ?? 0;
    return `Found ${totalSeats} seat${totalSeats !== 1 ? 's' : ''} matching your preferences. ${
      topSeat
        ? `Best match: Seat ${topSeat.seatNumber} in coach ${topSeat.coach} with score ${Math.round(topScore)}.`
        : ''
    }`;
  }, [recommendations, totalSeats]);

  if (recommendations.length === 0) {
    return (
      <>
        {/* ARIA live region for screen reader announcements */}
        <div
          role="status"
          aria-live="polite"
          aria-atomic="true"
          className="sr-only"
        >
          {liveAnnouncement}
        </div>
        <NoMatchesMessage
          hasActiveFilters={hasActiveFilters}
          onClearFilters={onClearFilters}
        />
      </>
    );
  }

  return (
    <Card>
      {/* ARIA live region for screen reader announcements */}
      <div
        role="status"
        aria-live="polite"
        aria-atomic="true"
        className="sr-only"
      >
        {liveAnnouncement}
      </div>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-amber-500" aria-hidden="true" />
            Recommendations
          </CardTitle>
          <Badge variant="secondary">
            {totalSeats} seat{totalSeats !== 1 ? 's' : ''} found
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Summary */}
        <p className="text-sm text-muted-foreground">
          Found <span className="font-medium text-foreground">{totalSeats} seats</span>{' '}
          matching your preferences across{' '}
          <span className="font-medium text-foreground">
            {recommendations.length} recommendation{recommendations.length !== 1 ? 's' : ''}
          </span>
          .
        </p>

        {/* Recommendation cards */}
        <div className="space-y-3">
          {displayedRecommendations.map((rec, index) => (
            <RecommendationCard
              key={`${rec.seats.map((s) => s.seatNumber).join('-')}-${index}`}
              recommendation={rec}
              rank={index}
              isTopPick={index === 0}
              onSeatClick={onSeatClick}
              onScrollToSeat={onScrollToSeat}
            />
          ))}
        </div>

        {/* Show more/less toggle */}
        {hasMore && (
          <Button
            variant="ghost"
            size="sm"
            className="w-full"
            onClick={() => setShowAll(!showAll)}
          >
            {showAll ? (
              <>
                <ChevronUp className="w-4 h-4 mr-1" />
                Show Top 5
              </>
            ) : (
              <>
                <ChevronDown className="w-4 h-4 mr-1" />
                Show All ({recommendations.length})
              </>
            )}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
