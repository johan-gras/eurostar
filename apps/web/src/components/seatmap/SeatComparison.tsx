'use client';

import * as React from 'react';
import { X, Trophy, Check, Minus, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import type { SeatInfo } from './Seat';

const MAX_COMPARISON_SEATS = 3;

// Feature labels
const featureLabels: Record<string, string> = {
  window: 'Window seat',
  aisle: 'Aisle seat',
  table: 'Table seat',
  power: 'Power outlet',
  quiet: 'Quiet zone',
  accessible: 'Accessible',
  duo: 'Duo seat',
  'facing-forward': 'Facing forward',
  'facing-backward': 'Facing backward',
};

// Warning labels
const warningLabels: Record<string, string> = {
  'no-window': 'No window view',
  'limited-recline': 'Limited recline',
  'near-toilet': 'Near toilet',
  'near-galley': 'Near galley',
  'misaligned-window': 'Misaligned window',
};

// All possible features and warnings for comparison
const allFeatures = [
  'window',
  'aisle',
  'table',
  'power',
  'quiet',
  'accessible',
  'duo',
  'facing-forward',
  'facing-backward',
];

const allWarnings = [
  'no-window',
  'limited-recline',
  'near-toilet',
  'near-galley',
  'misaligned-window',
];

function calculateScore(seat: SeatInfo): number {
  if (seat.score !== undefined) return seat.score;

  let score = 50;
  if (seat.features.includes('window')) score += 20;
  if (seat.features.includes('quiet')) score += 15;
  if (seat.features.includes('table')) score += 10;
  if (seat.features.includes('power')) score += 10;
  if (seat.features.includes('facing-forward')) score += 5;
  if (seat.features.includes('aisle')) score += 5;
  if (seat.warnings.includes('no-window')) score -= 15;
  if (seat.warnings.includes('near-toilet')) score -= 20;
  if (seat.warnings.includes('limited-recline')) score -= 15;
  if (seat.warnings.includes('near-galley')) score -= 10;
  if (seat.warnings.includes('misaligned-window')) score -= 10;

  return Math.max(0, Math.min(100, score));
}

function getScoreColor(score: number) {
  if (score >= 70) return 'text-emerald-600';
  if (score >= 45) return 'text-amber-600';
  return 'text-red-600';
}

function getScoreBg(score: number) {
  if (score >= 70) return 'bg-emerald-100';
  if (score >= 45) return 'bg-amber-100';
  return 'bg-red-100';
}

const classLabels: Record<string, string> = {
  standard: 'Standard',
  'standard-premier': 'Std Premier',
  'business-premier': 'Business',
};

interface SeatComparisonProps {
  seats: SeatInfo[];
  onRemoveSeat: (seat: SeatInfo) => void;
  onClearAll: () => void;
  onSelectSeat?: (seat: SeatInfo) => void;
}

export function SeatComparison({
  seats,
  onRemoveSeat,
  onClearAll,
  onSelectSeat,
}: SeatComparisonProps) {
  if (seats.length === 0) return null;

  const seatsWithScores = seats.map((seat) => ({
    seat,
    score: calculateScore(seat),
  }));

  // Find the winner (highest score)
  const maxScore = Math.max(...seatsWithScores.map((s) => s.score));
  const winnerIndex = seatsWithScores.findIndex((s) => s.score === maxScore);

  // Get features that differ between seats
  const getDifferingFeatures = () => {
    if (seats.length < 2) return new Set<string>();
    const differing = new Set<string>();

    for (const feature of allFeatures) {
      const hasFeature = seats.map((s) => s.features.includes(feature));
      if (hasFeature.some((h) => h !== hasFeature[0])) {
        differing.add(feature);
      }
    }

    for (const warning of allWarnings) {
      const hasWarning = seats.map((s) => s.warnings.includes(warning));
      if (hasWarning.some((h) => h !== hasWarning[0])) {
        differing.add(warning);
      }
    }

    return differing;
  };

  const differingAttributes = getDifferingFeatures();

  // Filter to only show relevant features/warnings (those that at least one seat has)
  const relevantFeatures = allFeatures.filter((f) =>
    seats.some((s) => s.features.includes(f))
  );
  const relevantWarnings = allWarnings.filter((w) =>
    seats.some((s) => s.warnings.includes(w))
  );

  return (
    <div className="bg-white border rounded-xl shadow-lg overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-slate-50 border-b">
        <div className="flex items-center gap-2">
          <h3 className="font-semibold text-sm">
            Comparing {seats.length} seat{seats.length !== 1 ? 's' : ''}
          </h3>
          {seats.length < MAX_COMPARISON_SEATS && (
            <span className="text-xs text-muted-foreground">
              (click seats to add up to {MAX_COMPARISON_SEATS})
            </span>
          )}
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={onClearAll}
          className="h-7 text-xs"
        >
          Clear all
        </Button>
      </div>

      {/* Comparison table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          {/* Seat headers */}
          <thead>
            <tr className="border-b">
              <th className="text-left p-3 bg-slate-50 font-medium text-muted-foreground w-32">
                Seat
              </th>
              {seatsWithScores.map(({ seat, score }, index) => (
                <th
                  key={`${seat.coach}-${seat.seatNumber}`}
                  className={cn(
                    'p-3 text-center min-w-[120px] relative',
                    index === winnerIndex &&
                      seats.length > 1 &&
                      'bg-emerald-50'
                  )}
                >
                  {/* Winner badge */}
                  {index === winnerIndex && seats.length > 1 && (
                    <div className="absolute top-1 left-1/2 -translate-x-1/2">
                      <Badge className="bg-emerald-600 text-white text-xs px-1.5 py-0">
                        <Trophy className="w-3 h-3 mr-0.5" />
                        Best
                      </Badge>
                    </div>
                  )}

                  <div className="flex flex-col items-center gap-1 pt-4">
                    {/* Seat number */}
                    <div
                      className={cn(
                        'w-12 h-12 rounded-lg flex items-center justify-center text-lg font-bold',
                        getScoreBg(score),
                        getScoreColor(score)
                      )}
                    >
                      {seat.seatNumber}
                    </div>

                    {/* Coach and class */}
                    <div className="text-xs text-muted-foreground">
                      Coach {seat.coach}
                    </div>
                    <Badge variant="secondary" className="text-xs">
                      {classLabels[seat.class]}
                    </Badge>

                    {/* Remove button */}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onRemoveSeat(seat)}
                      className="h-6 w-6 p-0 mt-1"
                    >
                      <X className="w-3 h-3" />
                    </Button>
                  </div>
                </th>
              ))}
            </tr>
          </thead>

          <tbody>
            {/* Score row */}
            <tr className="border-b bg-slate-50">
              <td className="p-3 font-medium">Score</td>
              {seatsWithScores.map(({ seat, score }, index) => (
                <td
                  key={`score-${seat.coach}-${seat.seatNumber}`}
                  className={cn(
                    'p-3 text-center',
                    index === winnerIndex && seats.length > 1 && 'bg-emerald-50'
                  )}
                >
                  <div
                    className={cn(
                      'text-2xl font-bold tabular-nums',
                      getScoreColor(score)
                    )}
                  >
                    {score}
                  </div>
                  <div className="text-xs text-muted-foreground">/ 100</div>
                </td>
              ))}
            </tr>

            {/* Position row */}
            <tr className="border-b">
              <td className="p-3 font-medium text-muted-foreground">Position</td>
              {seatsWithScores.map(({ seat }, index) => (
                <td
                  key={`pos-${seat.coach}-${seat.seatNumber}`}
                  className={cn(
                    'p-3 text-center',
                    index === winnerIndex && seats.length > 1 && 'bg-emerald-50'
                  )}
                >
                  Row {seat.row}, {seat.position}
                </td>
              ))}
            </tr>

            {/* Features section header */}
            {relevantFeatures.length > 0 && (
              <tr className="border-b bg-emerald-50/50">
                <td
                  colSpan={seats.length + 1}
                  className="p-2 text-xs font-semibold text-emerald-700"
                >
                  Features
                </td>
              </tr>
            )}

            {/* Feature rows */}
            {relevantFeatures.map((feature) => (
              <tr
                key={feature}
                className={cn(
                  'border-b',
                  differingAttributes.has(feature) && 'bg-blue-50/50'
                )}
              >
                <td className="p-3 text-muted-foreground">
                  <div className="flex items-center gap-2">
                    {featureLabels[feature]}
                    {differingAttributes.has(feature) && (
                      <span className="text-xs text-blue-600 font-medium">
                        differs
                      </span>
                    )}
                  </div>
                </td>
                {seatsWithScores.map(({ seat }, index) => {
                  const hasFeature = seat.features.includes(feature);
                  return (
                    <td
                      key={`${feature}-${seat.coach}-${seat.seatNumber}`}
                      className={cn(
                        'p-3 text-center',
                        index === winnerIndex &&
                          seats.length > 1 &&
                          'bg-emerald-50'
                      )}
                    >
                      {hasFeature ? (
                        <Check className="w-5 h-5 text-emerald-600 mx-auto" />
                      ) : (
                        <Minus className="w-5 h-5 text-slate-300 mx-auto" />
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}

            {/* Warnings section header */}
            {relevantWarnings.length > 0 && (
              <tr className="border-b bg-red-50/50">
                <td
                  colSpan={seats.length + 1}
                  className="p-2 text-xs font-semibold text-red-700"
                >
                  Warnings
                </td>
              </tr>
            )}

            {/* Warning rows */}
            {relevantWarnings.map((warning) => (
              <tr
                key={warning}
                className={cn(
                  'border-b',
                  differingAttributes.has(warning) && 'bg-blue-50/50'
                )}
              >
                <td className="p-3 text-muted-foreground">
                  <div className="flex items-center gap-2">
                    {warningLabels[warning]}
                    {differingAttributes.has(warning) && (
                      <span className="text-xs text-blue-600 font-medium">
                        differs
                      </span>
                    )}
                  </div>
                </td>
                {seatsWithScores.map(({ seat }, index) => {
                  const hasWarning = seat.warnings.includes(warning);
                  return (
                    <td
                      key={`${warning}-${seat.coach}-${seat.seatNumber}`}
                      className={cn(
                        'p-3 text-center',
                        index === winnerIndex &&
                          seats.length > 1 &&
                          'bg-emerald-50'
                      )}
                    >
                      {hasWarning ? (
                        <AlertTriangle className="w-5 h-5 text-red-500 mx-auto" />
                      ) : (
                        <Minus className="w-5 h-5 text-slate-300 mx-auto" />
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Action footer */}
      {onSelectSeat && seats.length > 0 && (
        <div className="flex items-center justify-end gap-2 px-4 py-3 bg-slate-50 border-t">
          {seatsWithScores.map(({ seat }, index) => (
            <Button
              key={`select-${seat.coach}-${seat.seatNumber}`}
              variant={index === winnerIndex && seats.length > 1 ? 'default' : 'outline'}
              size="sm"
              onClick={() => onSelectSeat(seat)}
              className={cn(
                index === winnerIndex && seats.length > 1 && 'bg-emerald-600 hover:bg-emerald-700'
              )}
            >
              Select {seat.seatNumber}
              {index === winnerIndex && seats.length > 1 && (
                <Trophy className="w-3 h-3 ml-1" />
              )}
            </Button>
          ))}
        </div>
      )}
    </div>
  );
}

// Floating comparison bar component
interface ComparisonBarProps {
  seats: SeatInfo[];
  isCompareMode: boolean;
  onToggleCompareMode: () => void;
  onRemoveSeat: (seat: SeatInfo) => void;
  onClearAll: () => void;
  onViewComparison: () => void;
}

export function ComparisonBar({
  seats,
  isCompareMode,
  onToggleCompareMode,
  onRemoveSeat,
  onClearAll,
  onViewComparison,
}: ComparisonBarProps) {
  return (
    <div
      className={cn(
        'fixed bottom-0 left-0 right-0 z-50',
        'bg-white border-t shadow-lg',
        'transform transition-transform duration-300',
        seats.length > 0 || isCompareMode ? 'translate-y-0' : 'translate-y-full'
      )}
    >
      <div className="max-w-4xl mx-auto px-4 py-3">
        <div className="flex items-center justify-between gap-4">
          {/* Left: Compare mode toggle */}
          <div className="flex items-center gap-3">
            <Button
              variant={isCompareMode ? 'default' : 'outline'}
              size="sm"
              onClick={onToggleCompareMode}
              className={cn(
                isCompareMode && 'bg-blue-600 hover:bg-blue-700'
              )}
            >
              {isCompareMode ? 'Exit Compare' : 'Compare Mode'}
            </Button>

            {isCompareMode && seats.length === 0 && (
              <span className="text-sm text-muted-foreground">
                Click seats to compare (up to {MAX_COMPARISON_SEATS})
              </span>
            )}
          </div>

          {/* Middle: Selected seats preview */}
          {seats.length > 0 && (
            <div className="flex items-center gap-2">
              {seats.map((seat) => {
                const score = calculateScore(seat);
                return (
                  <div
                    key={`${seat.coach}-${seat.seatNumber}`}
                    className={cn(
                      'flex items-center gap-1 px-2 py-1 rounded-lg border',
                      getScoreBg(score)
                    )}
                  >
                    <span className={cn('font-semibold text-sm', getScoreColor(score))}>
                      {seat.seatNumber}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      C{seat.coach}
                    </span>
                    <button
                      onClick={() => onRemoveSeat(seat)}
                      className="ml-1 hover:text-red-600"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                );
              })}
            </div>
          )}

          {/* Right: Actions */}
          {seats.length > 0 && (
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" onClick={onClearAll}>
                Clear
              </Button>
              <Button size="sm" onClick={onViewComparison} disabled={seats.length < 2}>
                Compare {seats.length} seats
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export { MAX_COMPARISON_SEATS };
