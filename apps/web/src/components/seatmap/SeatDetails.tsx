'use client';

import * as React from 'react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import {
  X,
  MapPin,
  Armchair,
  Check,
  Plus,
  Info,
  Sparkles,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import type { SeatInfo } from './Seat';

// Feature labels with descriptions
const featureDetails: Record<
  string,
  { label: string; description: string; scoreImpact: number }
> = {
  window: {
    label: 'Window seat',
    description:
      'Enjoy views of the countryside and Channel Tunnel approach. Natural light and a wall to lean against.',
    scoreImpact: 20,
  },
  aisle: {
    label: 'Aisle seat',
    description:
      'Easy access to move around without disturbing others. Quick exit when arriving.',
    scoreImpact: 5,
  },
  table: {
    label: 'Table seat',
    description:
      'Full-size table for working, dining, or spreading out. Ideal for laptops and meals.',
    scoreImpact: 10,
  },
  power: {
    label: 'Power outlet',
    description:
      'UK and EU power sockets available at your seat. Keep devices charged throughout the journey.',
    scoreImpact: 10,
  },
  quiet: {
    label: 'Quiet zone',
    description:
      'Designated quiet carriage. Phone calls and loud conversations discouraged. Perfect for working or relaxing.',
    scoreImpact: 15,
  },
  accessible: {
    label: 'Accessible',
    description:
      'Wheelchair-accessible space with extra room. Priority seating with easy access to facilities.',
    scoreImpact: 0,
  },
  duo: {
    label: 'Duo seat',
    description:
      'Side-by-side seating perfect for couples or friends traveling together.',
    scoreImpact: 5,
  },
  'facing-forward': {
    label: 'Facing forward',
    description:
      'Travel in the direction of motion. Preferred by those prone to motion sickness.',
    scoreImpact: 5,
  },
  'facing-backward': {
    label: 'Facing backward',
    description:
      'Travel facing the rear. Some find this more comfortable for sleeping.',
    scoreImpact: 0,
  },
};

// Warning labels with descriptions
const warningDetails: Record<
  string,
  { label: string; description: string; scoreImpact: number }
> = {
  'no-window': {
    label: 'No window view',
    description:
      'Seat is positioned between windows or against a solid panel. Limited natural light and no outside view.',
    scoreImpact: -15,
  },
  'limited-recline': {
    label: 'Limited recline',
    description:
      'Seat back cannot fully recline due to wall or partition behind. May affect comfort on longer journeys.',
    scoreImpact: -15,
  },
  'near-toilet': {
    label: 'Near toilet',
    description:
      'Close proximity to restroom facilities. May experience foot traffic, noise, and occasional odors.',
    scoreImpact: -20,
  },
  'near-galley': {
    label: 'Near galley',
    description:
      'Adjacent to bar/buffet car. Expect more noise, movement, and food smells during service.',
    scoreImpact: -10,
  },
  'misaligned-window': {
    label: 'Misaligned window',
    description:
      'Window frame partially blocks view. You may need to lean to see outside properly.',
    scoreImpact: -10,
  },
};

// Icon components matching the Seat component
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

function AisleIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 12 12"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
    >
      <rect x="1" y="2" width="3" height="8" rx="0.5" />
      <rect x="8" y="2" width="3" height="8" rx="0.5" />
      <line x1="6" y1="3" x2="6" y2="9" strokeDasharray="1.5 1" />
    </svg>
  );
}

function AccessibleIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 12 12"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
    >
      <circle cx="6" cy="2.5" r="1.5" />
      <path d="M6 4V7L4 10" />
      <path d="M6 7L8 10" />
      <path d="M4 5.5H8" />
    </svg>
  );
}

function DuoIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 12 12"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
    >
      <circle cx="4" cy="3" r="1.5" />
      <circle cx="8" cy="3" r="1.5" />
      <path d="M4 5V8" />
      <path d="M8 5V8" />
      <rect x="2" y="8" width="8" height="2" rx="0.5" />
    </svg>
  );
}

function ForwardIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 12 12"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
    >
      <path d="M6 2L10 6L6 10" />
      <path d="M2 6H10" />
    </svg>
  );
}

function BackwardIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 12 12"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
    >
      <path d="M6 2L2 6L6 10" />
      <path d="M2 6H10" />
    </svg>
  );
}

// Warning icons
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

function GalleyIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 12 12"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
    >
      <rect x="2" y="4" width="8" height="6" rx="0.5" />
      <path d="M4 4V2" />
      <path d="M6 4V2" />
      <path d="M8 4V2" />
      <line x1="2" y1="7" x2="10" y2="7" />
    </svg>
  );
}

function MisalignedIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 12 12"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
    >
      <rect x="1" y="2" width="10" height="8" rx="1" />
      <line x1="4" y1="2" x2="4" y2="10" />
      <line x1="1" y1="6" x2="11" y2="6" />
    </svg>
  );
}

function getFeatureIcon(feature: string, className: string) {
  const icons: Record<string, React.ReactNode> = {
    window: <WindowIcon className={className} />,
    aisle: <AisleIcon className={className} />,
    table: <TableIcon className={className} />,
    power: <PowerIcon className={className} />,
    quiet: <QuietIcon className={className} />,
    accessible: <AccessibleIcon className={className} />,
    duo: <DuoIcon className={className} />,
    'facing-forward': <ForwardIcon className={className} />,
    'facing-backward': <BackwardIcon className={className} />,
  };
  return icons[feature] ?? <Sparkles className={className} />;
}

function getWarningIcon(warning: string, className: string) {
  const icons: Record<string, React.ReactNode> = {
    'no-window': <NoWindowIcon className={className} />,
    'limited-recline': <LimitedReclineIcon className={className} />,
    'near-toilet': <ToiletIcon className={className} />,
    'near-galley': <GalleyIcon className={className} />,
    'misaligned-window': <MisalignedIcon className={className} />,
  };
  return icons[warning] ?? <AlertTriangle className={className} />;
}

function calculateScore(seat: SeatInfo): number {
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

function getScoreLabel(score: number) {
  if (score >= 80) return 'Excellent';
  if (score >= 70) return 'Very Good';
  if (score >= 55) return 'Good';
  if (score >= 45) return 'Average';
  if (score >= 30) return 'Below Average';
  return 'Poor';
}

const classLabels: Record<string, string> = {
  standard: 'Standard',
  'standard-premier': 'Standard Premier',
  'business-premier': 'Business Premier',
};

interface SeatDetailsProps {
  seat: SeatInfo | null;
  isOpen: boolean;
  onClose: () => void;
  onSelect?: (seat: SeatInfo) => void;
  onCompare?: (seat: SeatInfo) => void;
}

export function SeatDetails({
  seat,
  isOpen,
  onClose,
  onSelect,
  onCompare,
}: SeatDetailsProps) {
  if (!seat) return null;

  const score = calculateScore(seat);

  return (
    <DialogPrimitive.Root open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogPrimitive.Portal>
        {/* Overlay */}
        <DialogPrimitive.Overlay
          className={cn(
            'fixed inset-0 z-50 bg-black/50',
            'data-[state=open]:animate-in data-[state=closed]:animate-out',
            'data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0'
          )}
        />

        {/* Panel - slides from right on desktop, bottom on mobile */}
        <DialogPrimitive.Content
          className={cn(
            'fixed z-50 bg-background shadow-xl',
            'flex flex-col',
            'data-[state=open]:animate-in data-[state=closed]:animate-out',
            'duration-300 ease-out',
            // Mobile: bottom sheet
            'inset-x-0 bottom-0 max-h-[85vh] rounded-t-2xl',
            'data-[state=closed]:slide-out-to-bottom data-[state=open]:slide-in-from-bottom',
            // Desktop: right panel
            'sm:inset-y-0 sm:right-0 sm:left-auto sm:bottom-auto',
            'sm:w-[400px] sm:max-h-none sm:rounded-none sm:rounded-l-xl',
            'sm:data-[state=closed]:slide-out-to-right sm:data-[state=open]:slide-in-from-right'
          )}
        >
          {/* Mobile drag handle */}
          <div className="sm:hidden flex justify-center pt-3 pb-1">
            <div className="w-10 h-1 rounded-full bg-muted-foreground/30" />
          </div>

          {/* Header */}
          <div className="flex items-start justify-between px-6 py-4 border-b">
            <div className="flex items-center gap-4">
              {/* Large seat number display */}
              <div
                className={cn(
                  'flex items-center justify-center',
                  'w-16 h-16 rounded-xl',
                  'text-2xl font-bold',
                  getScoreBg(score),
                  getScoreColor(score)
                )}
              >
                {seat.seatNumber}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-lg font-semibold">
                    Coach {seat.coach}
                  </span>
                  <Badge variant="secondary" className="capitalize">
                    {classLabels[seat.class]}
                  </Badge>
                </div>
                <div className="flex items-center gap-1 text-sm text-muted-foreground mt-1">
                  <MapPin className="w-3.5 h-3.5" />
                  Row {seat.row}, Position {seat.position}
                </div>
              </div>
            </div>

            <DialogPrimitive.Close className="rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2">
              <X className="h-5 w-5" />
              <span className="sr-only">Close</span>
            </DialogPrimitive.Close>
          </div>

          {/* Scrollable content */}
          <div className="flex-1 overflow-y-auto px-6 py-4 space-y-6">
            {/* Score Section */}
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <Armchair className="w-4 h-4" />
                Seat Score
              </div>
              <div className="flex items-center gap-4">
                <div
                  className={cn(
                    'text-4xl font-bold tabular-nums',
                    getScoreColor(score)
                  )}
                >
                  {score}
                </div>
                <div className="flex-1">
                  <div className={cn('font-medium', getScoreColor(score))}>
                    {getScoreLabel(score)}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    out of 100 points
                  </div>
                </div>
              </div>
              {/* Score bar */}
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div
                  className={cn(
                    'h-full rounded-full transition-all duration-500',
                    score >= 70 && 'bg-emerald-500',
                    score >= 45 && score < 70 && 'bg-amber-500',
                    score < 45 && 'bg-red-500'
                  )}
                  style={{ width: `${score}%` }}
                />
              </div>
            </div>

            {/* Features Section */}
            {seat.features.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                  <Sparkles className="w-4 h-4" />
                  Features ({seat.features.length})
                </div>
                <div className="space-y-2">
                  {seat.features.map((feature) => {
                    const details = featureDetails[feature];
                    return (
                      <div
                        key={feature}
                        className="flex gap-3 p-3 rounded-lg bg-emerald-50 border border-emerald-200"
                      >
                        <div className="shrink-0 w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center">
                          {getFeatureIcon(feature, 'w-4 h-4 text-emerald-700')}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-emerald-900">
                              {details?.label ?? feature}
                            </span>
                            {(details?.scoreImpact ?? 0) > 0 && (
                              <span className="flex items-center gap-0.5 text-xs text-emerald-600">
                                <TrendingUp className="w-3 h-3" />+
                                {details?.scoreImpact}
                              </span>
                            )}
                          </div>
                          {details?.description && (
                            <p className="text-sm text-emerald-700 mt-0.5">
                              {details.description}
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Warnings Section */}
            {seat.warnings.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                  <AlertTriangle className="w-4 h-4" />
                  Warnings ({seat.warnings.length})
                </div>
                <div className="space-y-2">
                  {seat.warnings.map((warning) => {
                    const details = warningDetails[warning];
                    return (
                      <div
                        key={warning}
                        className="flex gap-3 p-3 rounded-lg bg-red-50 border border-red-200"
                      >
                        <div className="shrink-0 w-8 h-8 rounded-lg bg-red-100 flex items-center justify-center">
                          {getWarningIcon(warning, 'w-4 h-4 text-red-700')}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-red-900">
                              {details?.label ?? warning}
                            </span>
                            {(details?.scoreImpact ?? 0) < 0 && (
                              <span className="flex items-center gap-0.5 text-xs text-red-600">
                                <TrendingDown className="w-3 h-3" />
                                {details?.scoreImpact}
                              </span>
                            )}
                          </div>
                          {details?.description && (
                            <p className="text-sm text-red-700 mt-0.5">
                              {details.description}
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Score Breakdown */}
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <Info className="w-4 h-4" />
                Score Breakdown
              </div>
              <div className="p-3 rounded-lg bg-muted/50 space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Base score</span>
                  <span className="font-medium">50</span>
                </div>
                {seat.features.map((feature) => {
                  const impact = featureDetails[feature]?.scoreImpact ?? 0;
                  if (impact === 0) return null;
                  return (
                    <div key={feature} className="flex justify-between">
                      <span className="text-muted-foreground">
                        {featureDetails[feature]?.label ?? feature}
                      </span>
                      <span className="font-medium text-emerald-600">
                        +{impact}
                      </span>
                    </div>
                  );
                })}
                {seat.warnings.map((warning) => {
                  const impact = warningDetails[warning]?.scoreImpact ?? 0;
                  if (impact === 0) return null;
                  return (
                    <div key={warning} className="flex justify-between">
                      <span className="text-muted-foreground">
                        {warningDetails[warning]?.label ?? warning}
                      </span>
                      <span className="font-medium text-red-600">{impact}</span>
                    </div>
                  );
                })}
                <div className="flex justify-between pt-2 border-t">
                  <span className="font-medium">Total</span>
                  <span className={cn('font-bold', getScoreColor(score))}>
                    {score}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Footer with actions */}
          <div className="border-t px-6 py-4 flex gap-3">
            {onSelect && (
              <Button className="flex-1" onClick={() => onSelect(seat)}>
                <Check className="w-4 h-4 mr-2" />
                Select this seat
              </Button>
            )}
            {onCompare && (
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => onCompare(seat)}
              >
                <Plus className="w-4 h-4 mr-2" />
                Compare
              </Button>
            )}
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
