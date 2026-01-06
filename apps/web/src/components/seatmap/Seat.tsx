'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';
import { Tooltip } from '@/components/ui/tooltip';
import { Check } from 'lucide-react';

export interface SeatInfo {
  seatNumber: string;
  coach: number;
  class: 'standard' | 'standard-premier' | 'business-premier';
  features: string[];
  warnings: string[];
  row: number;
  position: 'A' | 'B' | 'C' | 'D';
  score?: number; // 0-100, higher is better
}

interface SeatProps {
  seatInfo: SeatInfo;
  isSelected?: boolean | undefined;
  isRecommended?: boolean | undefined;
  isInComparison?: boolean | undefined;
  recommendedRank?: number | undefined; // 0 = #1, 1 = #2, etc.
  onClick?: ((seat: SeatInfo) => void) | undefined;
  size?: 'default' | 'compact' | 'mobile' | undefined;
  /** Ref callback for keyboard navigation */
  refCallback?: ((ref: HTMLButtonElement | null) => void) | undefined;
  /** Tab index for roving tabindex pattern */
  tabIndex?: number | undefined;
  /** Keyboard event handler for grid navigation */
  onKeyDown?: ((event: React.KeyboardEvent) => void) | undefined;
}

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

const warningLabels: Record<string, string> = {
  'no-window': 'No window view',
  'limited-recline': 'Limited recline',
  'near-toilet': 'Near toilet',
  'near-galley': 'Near galley',
  'misaligned-window': 'Misaligned window',
};

// Feature Icons
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

function PowerIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 12 12"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
    >
      <circle cx="6" cy="6" r="4.5" />
      <line x1="4" y1="5" x2="4" y2="7" />
      <line x1="6" y1="5" x2="6" y2="7" />
      <line x1="8" y1="5" x2="8" y2="7" />
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

function QuietIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 12 12"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
    >
      <path d="M2 7.5V4.5C2 4.22 2.22 4 2.5 4H4L7 2V10L4 8H2.5C2.22 8 2 7.78 2 7.5Z" />
      <line x1="9" y1="4" x2="11" y2="8" />
      <line x1="11" y1="4" x2="9" y2="8" />
    </svg>
  );
}

// Warning Icons
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

function calculateScore(seat: SeatInfo): number {
  if (seat.score !== undefined) return seat.score;

  let score = 50; // Base score

  // Positive features
  if (seat.features.includes('window')) score += 20;
  if (seat.features.includes('quiet')) score += 15;
  if (seat.features.includes('table')) score += 10;
  if (seat.features.includes('power')) score += 10;
  if (seat.features.includes('facing-forward')) score += 5;
  if (seat.features.includes('aisle')) score += 5;

  // Negative warnings
  if (seat.warnings.includes('no-window')) score -= 15;
  if (seat.warnings.includes('near-toilet')) score -= 20;
  if (seat.warnings.includes('limited-recline')) score -= 15;
  if (seat.warnings.includes('near-galley')) score -= 10;
  if (seat.warnings.includes('misaligned-window')) score -= 10;

  return Math.max(0, Math.min(100, score));
}

function getScoreGradient(score: number): string {
  if (score >= 70) {
    return 'from-emerald-100 to-emerald-200 border-emerald-400';
  }
  if (score >= 45) {
    return 'from-amber-100 to-amber-200 border-amber-400';
  }
  return 'from-red-100 to-red-200 border-red-400';
}

function getScoreTextColor(score: number): string {
  if (score >= 70) return 'text-emerald-800';
  if (score >= 45) return 'text-amber-800';
  return 'text-red-800';
}

function getScoreHoverRing(score: number): string {
  if (score >= 70) return 'hover:ring-emerald-400';
  if (score >= 45) return 'hover:ring-amber-400';
  return 'hover:ring-red-400';
}

function getScoreLabel(score: number): string {
  if (score >= 80) return 'Excellent';
  if (score >= 70) return 'Good';
  if (score >= 45) return 'Average';
  return 'Below average';
}

const classLabels: Record<string, string> = {
  standard: 'Standard',
  'standard-premier': 'Standard Premier',
  'business-premier': 'Business Premier',
};

const positionLabels: Record<string, string> = {
  A: 'Window',
  B: 'Aisle',
  C: 'Aisle',
  D: 'Window',
};

function buildAriaLabel(seat: SeatInfo, score: number, isSelected: boolean, isRecommended: boolean, recommendedRank?: number): string {
  const parts: string[] = [];

  // Seat identifier
  parts.push(`Seat ${seat.seatNumber}`);

  // Position type
  const positionType = positionLabels[seat.position] ?? seat.position;
  parts.push(positionType);

  // Class
  parts.push(classLabels[seat.class] ?? seat.class);

  // Score
  parts.push(`Score: ${score} out of 100, ${getScoreLabel(score)}`);

  // Key features (limit to most important)
  const keyFeatures = seat.features.slice(0, 3).map(f => featureLabels[f] ?? f);
  if (keyFeatures.length > 0) {
    parts.push(`Features: ${keyFeatures.join(', ')}`);
  }

  // Warnings
  if (seat.warnings.length > 0) {
    const warnings = seat.warnings.slice(0, 2).map(w => warningLabels[w] ?? w);
    parts.push(`Warnings: ${warnings.join(', ')}`);
  }

  // State
  if (isSelected) {
    parts.push('Currently selected');
  } else if (isRecommended && recommendedRank !== undefined) {
    parts.push(`Recommended, rank ${recommendedRank + 1}`);
  }

  return parts.join('. ');
}

function FeatureIcons({ features }: { features: string[] }) {
  const icons: React.ReactNode[] = [];

  if (features.includes('window')) {
    icons.push(
      <WindowIcon key="window" className="w-2.5 h-2.5 text-sky-600" />
    );
  }
  if (features.includes('power')) {
    icons.push(
      <PowerIcon key="power" className="w-2.5 h-2.5 text-yellow-600" />
    );
  }
  if (features.includes('table')) {
    icons.push(
      <TableIcon key="table" className="w-2.5 h-2.5 text-purple-600" />
    );
  }
  if (features.includes('quiet')) {
    icons.push(
      <QuietIcon key="quiet" className="w-2.5 h-2.5 text-blue-600" />
    );
  }

  if (icons.length === 0) return null;

  return (
    <div className="absolute top-0.5 right-0.5 flex gap-0.5">
      {icons.slice(0, 2)}
    </div>
  );
}

function WarningIcons({ warnings }: { warnings: string[] }) {
  const icons: React.ReactNode[] = [];

  if (warnings.includes('no-window')) {
    icons.push(
      <NoWindowIcon key="no-window" className="w-2.5 h-2.5 text-red-500" />
    );
  }
  if (warnings.includes('near-toilet')) {
    icons.push(
      <ToiletIcon key="toilet" className="w-2.5 h-2.5 text-red-500" />
    );
  }
  if (warnings.includes('limited-recline')) {
    icons.push(
      <LimitedReclineIcon key="recline" className="w-2.5 h-2.5 text-red-500" />
    );
  }

  if (icons.length === 0) return null;

  return (
    <div className="absolute bottom-0.5 right-0.5 flex gap-0.5">
      {icons.slice(0, 2)}
    </div>
  );
}

// Score pattern icons - additional visual indicator beyond color
function ScorePatternIcon({ score, className }: { score: number; className?: string }) {
  if (score >= 70) {
    // Checkmark pattern for good scores
    return (
      <svg
        className={cn('w-2.5 h-2.5 opacity-40', className)}
        viewBox="0 0 10 10"
        fill="currentColor"
        aria-hidden="true"
      >
        <path d="M8.5 2.5L4 7L1.5 4.5" stroke="currentColor" strokeWidth="2" fill="none" />
      </svg>
    );
  }
  if (score >= 45) {
    // Minus pattern for average scores
    return (
      <svg
        className={cn('w-2.5 h-2.5 opacity-40', className)}
        viewBox="0 0 10 10"
        fill="currentColor"
        aria-hidden="true"
      >
        <rect x="2" y="4" width="6" height="2" rx="0.5" />
      </svg>
    );
  }
  // Warning triangle for below average
  return (
    <svg
      className={cn('w-2.5 h-2.5 opacity-40', className)}
      viewBox="0 0 10 10"
      fill="currentColor"
      aria-hidden="true"
    >
      <path d="M5 1L9 9H1L5 1Z" stroke="currentColor" strokeWidth="1" fill="none" />
      <circle cx="5" cy="6" r="0.5" />
      <rect x="4.5" y="3.5" width="1" height="2" rx="0.25" />
    </svg>
  );
}

// Rank badge component for recommended seats
function RankBadge({ rank }: { rank: number }) {
  if (rank > 2) return null; // Only show for top 3

  const styles = [
    { bg: 'bg-amber-500', text: 'text-white', label: '#1' },
    { bg: 'bg-slate-400', text: 'text-white', label: '#2' },
    { bg: 'bg-amber-700', text: 'text-white', label: '#3' },
  ];
  const style = styles[rank];
  if (!style) return null;

  return (
    <div
      className={cn(
        'absolute -top-2 -left-2 z-20',
        'w-5 h-5 rounded-full flex items-center justify-center',
        'text-[10px] font-bold shadow-md',
        style.bg,
        style.text
      )}
      aria-hidden="true"
    >
      {style.label}
    </div>
  );
}

// Best match badge for #1 seat
function BestMatchBadge() {
  return (
    <div
      className={cn(
        'absolute -top-3 left-1/2 -translate-x-1/2 z-20',
        'px-1.5 py-0.5 rounded-full',
        'text-[8px] font-bold whitespace-nowrap',
        'bg-amber-500 text-white shadow-md'
      )}
    >
      Best
    </div>
  );
}

const sizeClasses = {
  default: 'w-10 h-12',
  compact: 'w-8 h-10',
  mobile: 'w-12 h-14', // Larger touch targets for mobile
};

export function Seat({ seatInfo, isSelected, isRecommended, isInComparison, recommendedRank, onClick, size = 'default', refCallback, tabIndex, onKeyDown }: SeatProps) {
  const score = calculateScore(seatInfo);
  const ariaLabel = buildAriaLabel(seatInfo, score, isSelected ?? false, isRecommended ?? false, recommendedRank);

  const tooltipContent = (
    <div className="space-y-2 min-w-[160px]">
      <div className="flex items-center justify-between">
        <span className="font-semibold">Seat {seatInfo.seatNumber}</span>
        <span
          className={cn(
            'text-xs font-medium px-1.5 py-0.5 rounded',
            score >= 70 && 'bg-emerald-100 text-emerald-700',
            score >= 45 && score < 70 && 'bg-amber-100 text-amber-700',
            score < 45 && 'bg-red-100 text-red-700'
          )}
        >
          {score}/100
        </span>
      </div>

      {seatInfo.features.length > 0 && (
        <div className="space-y-1">
          <span className="text-xs font-medium text-muted-foreground">Features</span>
          <div className="flex flex-wrap gap-1">
            {seatInfo.features.map((f) => (
              <span
                key={f}
                className="text-xs bg-emerald-50 text-emerald-700 px-1.5 py-0.5 rounded"
              >
                {featureLabels[f] ?? f}
              </span>
            ))}
          </div>
        </div>
      )}

      {seatInfo.warnings.length > 0 && (
        <div className="space-y-1">
          <span className="text-xs font-medium text-muted-foreground">Warnings</span>
          <div className="flex flex-wrap gap-1">
            {seatInfo.warnings.map((w) => (
              <span
                key={w}
                className="text-xs bg-red-50 text-red-700 px-1.5 py-0.5 rounded"
              >
                {warningLabels[w] ?? w}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );

  return (
    <Tooltip content={tooltipContent}>
      <button
        ref={refCallback}
        type="button"
        onClick={() => onClick?.(seatInfo)}
        onKeyDown={onKeyDown}
        aria-label={ariaLabel}
        aria-pressed={isSelected}
        tabIndex={tabIndex}
        className={cn(
          // Base styles - rounded rectangle shape like a real seat
          'relative rounded-lg flex items-center justify-center',
          sizeClasses[size],
          'text-xs font-semibold transition-all duration-200',
          'border-2 shadow-sm',
          // Focus styles - high contrast for keyboard navigation
          'focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-blue-600',
          'focus-visible:z-10',
          // Hover effect
          'hover:scale-105 hover:shadow-md hover:ring-2 hover:ring-offset-1',
          // Score-based gradient backgrounds
          !isSelected && !isRecommended && !isInComparison && [
            'bg-gradient-to-b',
            getScoreGradient(score),
            getScoreTextColor(score),
            getScoreHoverRing(score),
          ],
          // Selected state
          isSelected && [
            'bg-gradient-to-b from-primary to-primary/90',
            'border-primary text-primary-foreground',
            'ring-2 ring-primary ring-offset-2',
            'shadow-lg scale-105',
          ],
          // Recommended state (not selected) with enhanced glow
          isRecommended && !isSelected && !isInComparison && [
            'bg-gradient-to-b from-blue-100 to-blue-200',
            'border-blue-500 text-blue-800',
            'ring-2 ring-blue-400 ring-offset-1',
            'animate-pulse-glow',
          ],
          // Comparison state
          isInComparison && !isSelected && [
            'bg-gradient-to-b from-violet-100 to-violet-200',
            'border-violet-500 text-violet-800',
            'ring-2 ring-violet-400 ring-offset-1',
            'shadow-lg scale-105',
          ]
        )}
      >
        {/* Best match badge for #1 seat */}
        {isRecommended && recommendedRank === 0 && <BestMatchBadge />}

        {/* Rank badge for top recommended seats */}
        {isRecommended && recommendedRank !== undefined && (
          <RankBadge rank={recommendedRank} />
        )}

        {/* Feature icons in top-right corner */}
        {!isSelected && !isRecommended && <FeatureIcons features={seatInfo.features} />}

        {/* Warning icons in bottom-right corner */}
        {!isSelected && <WarningIcons warnings={seatInfo.warnings} />}

        {/* Score pattern indicator - visual accessibility (not color-only) */}
        {!isSelected && !isRecommended && !isInComparison && (
          <div className="absolute bottom-0.5 left-0.5">
            <ScorePatternIcon score={score} />
          </div>
        )}

        {/* Seat number or checkmark */}
        {isSelected ? (
          <Check className="w-5 h-5" strokeWidth={3} aria-hidden="true" />
        ) : (
          <span className="relative z-10">{seatInfo.seatNumber}</span>
        )}

        {/* Subtle seat back indicator at top */}
        <div
          className={cn(
            'absolute top-0 left-1 right-1 h-1 rounded-t-sm',
            !isSelected && !isRecommended && !isInComparison && score >= 70 && 'bg-emerald-400/50',
            !isSelected && !isRecommended && !isInComparison && score >= 45 && score < 70 && 'bg-amber-400/50',
            !isSelected && !isRecommended && !isInComparison && score < 45 && 'bg-red-400/50',
            isSelected && 'bg-primary-foreground/30',
            isRecommended && !isSelected && !isInComparison && 'bg-blue-500/50',
            isInComparison && !isSelected && 'bg-violet-500/50'
          )}
        />
      </button>
    </Tooltip>
  );
}
