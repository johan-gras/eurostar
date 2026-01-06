'use client';

import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

export type CrowdLevel = 'low' | 'moderate' | 'high' | 'very_high';
export type TrendDirection = 'increasing' | 'decreasing' | 'stable';

export interface QueueStatusData {
  terminalId: string;
  waitTimeMinutes: number;
  crowdLevel: CrowdLevel;
  confidence: number;
  updatedAt: string;
  trend?: TrendDirection;
}

interface QueueStatusProps {
  data: QueueStatusData | null;
  isLoading?: boolean;
}

const crowdLevelConfig: Record<
  CrowdLevel,
  {
    label: string;
    description: string;
    ringColor: string;
    bgGradient: string;
    textColor: string;
    accentColor: string;
  }
> = {
  low: {
    label: 'Low',
    description: 'Quick check-in expected',
    ringColor: 'stroke-green-500',
    bgGradient: 'from-green-50 to-green-100/50 dark:from-green-950/30 dark:to-green-900/20',
    textColor: 'text-green-700 dark:text-green-400',
    accentColor: 'bg-green-500',
  },
  moderate: {
    label: 'Moderate',
    description: 'Expect some queuing',
    ringColor: 'stroke-amber-500',
    bgGradient: 'from-amber-50 to-amber-100/50 dark:from-amber-950/30 dark:to-amber-900/20',
    textColor: 'text-amber-700 dark:text-amber-400',
    accentColor: 'bg-amber-500',
  },
  high: {
    label: 'High',
    description: 'Allow extra time',
    ringColor: 'stroke-orange-500',
    bgGradient: 'from-orange-50 to-orange-100/50 dark:from-orange-950/30 dark:to-orange-900/20',
    textColor: 'text-orange-700 dark:text-orange-400',
    accentColor: 'bg-orange-500',
  },
  very_high: {
    label: 'Very High',
    description: 'Significant delays likely',
    ringColor: 'stroke-red-500',
    bgGradient: 'from-red-50 to-red-100/50 dark:from-red-950/30 dark:to-red-900/20',
    textColor: 'text-red-700 dark:text-red-400',
    accentColor: 'bg-red-500',
  },
};

function getConfidenceDots(confidence: number): number {
  if (confidence >= 0.8) return 3;
  if (confidence >= 0.5) return 2;
  return 1;
}

function getConfidenceLabel(confidence: number): string {
  if (confidence >= 0.8) return 'High confidence';
  if (confidence >= 0.5) return 'Medium confidence';
  return 'Low confidence';
}

function TrendIndicator({ trend, className }: { trend: TrendDirection; className?: string }) {
  if (trend === 'stable') return null;

  const isIncreasing = trend === 'increasing';
  return (
    <div
      className={cn(
        'flex items-center gap-1 text-sm font-medium',
        isIncreasing ? 'text-orange-600 dark:text-orange-400' : 'text-green-600 dark:text-green-400',
        className
      )}
    >
      <svg
        className={cn('h-4 w-4', isIncreasing ? '' : 'rotate-180')}
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={2}
      >
        <path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" />
      </svg>
      <span>{isIncreasing ? 'Getting busier' : 'Clearing up'}</span>
    </div>
  );
}

function ConfidenceDots({ confidence }: { confidence: number }) {
  const dots = getConfidenceDots(confidence);
  return (
    <div className="flex items-center gap-1.5" title={getConfidenceLabel(confidence)}>
      {[1, 2, 3].map((i) => (
        <div
          key={i}
          className={cn(
            'h-2 w-2 rounded-full transition-colors',
            i <= dots ? 'bg-current opacity-100' : 'bg-current opacity-20'
          )}
        />
      ))}
      <span className="ml-1 text-xs opacity-70">{getConfidenceLabel(confidence)}</span>
    </div>
  );
}

function AnimatedRing({
  progress,
  colorClass,
  size = 160,
}: {
  progress: number;
  colorClass: string;
  size?: number;
}) {
  const strokeWidth = 8;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (progress / 100) * circumference;

  return (
    <svg
      width={size}
      height={size}
      className="absolute inset-0 -rotate-90 transform"
      style={{ filter: 'drop-shadow(0 0 8px currentColor)' }}
    >
      {/* Background ring */}
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        strokeWidth={strokeWidth}
        className="stroke-gray-200 dark:stroke-gray-700"
      />
      {/* Animated progress ring */}
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        className={cn(colorClass, 'transition-all duration-1000 ease-out')}
        style={{
          strokeDasharray: circumference,
          strokeDashoffset,
        }}
      />
    </svg>
  );
}

function LoadingSkeleton() {
  return (
    <Card className="w-full">
      <CardContent className="p-6 md:p-8">
        <div className="flex flex-col items-center gap-6">
          <div className="relative flex h-40 w-40 items-center justify-center">
            <div className="h-full w-full animate-pulse rounded-full bg-gray-200 dark:bg-gray-700" />
          </div>
          <div className="flex flex-col items-center gap-2">
            <div className="h-6 w-32 animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
            <div className="h-4 w-48 animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function NoDataState() {
  return (
    <Card className="w-full">
      <CardContent className="p-6 md:p-8">
        <div className="flex flex-col items-center justify-center py-8 text-center text-muted-foreground">
          <svg
            className="mb-4 h-12 w-12 opacity-50"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <p className="text-lg font-medium">No queue data available</p>
          <p className="mt-1 text-sm">Check back later for live updates</p>
        </div>
      </CardContent>
    </Card>
  );
}

export function QueueStatus({ data, isLoading }: QueueStatusProps) {
  if (isLoading) {
    return <LoadingSkeleton />;
  }

  if (!data) {
    return <NoDataState />;
  }

  const config = crowdLevelConfig[data.crowdLevel];
  // Calculate ring progress: 0 min = 0%, 60+ min = 100%
  const ringProgress = Math.min((data.waitTimeMinutes / 60) * 100, 100);

  const formattedTime = new Date(data.updatedAt).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <Card
      className={cn(
        'w-full overflow-hidden border-0 bg-gradient-to-br shadow-lg transition-all',
        config.bgGradient
      )}
    >
      <CardContent className="p-4 md:p-6 lg:p-8">
        <div className="flex items-center gap-4 md:flex-col md:items-center md:gap-6 lg:flex-row lg:gap-8">
          {/* Animated gauge with wait time - smaller on mobile */}
          <div className="relative flex h-28 w-28 md:h-40 md:w-40 flex-shrink-0 items-center justify-center">
            <AnimatedRing progress={ringProgress} colorClass={config.ringColor} size={112} />
            {/* Larger ring for md+ */}
            <div className="hidden md:block absolute inset-0">
              <AnimatedRing progress={ringProgress} colorClass={config.ringColor} size={160} />
            </div>
            <div className="z-10 flex flex-col items-center">
              <span className={cn('text-3xl md:text-5xl font-bold tabular-nums', config.textColor)}>
                {data.waitTimeMinutes}
              </span>
              <span className={cn('text-sm md:text-lg font-medium', config.textColor)}>min</span>
            </div>
          </div>

          {/* Status details */}
          <div className="flex flex-1 flex-col items-start text-left md:items-center md:text-center lg:items-start lg:text-left">
            {/* Crowd level */}
            <div className="flex items-center gap-2">
              <div className={cn('h-2.5 w-2.5 md:h-3 md:w-3 rounded-full', config.accentColor)} />
              <h3 className={cn('text-lg md:text-xl font-semibold', config.textColor)}>
                {config.label}
              </h3>
            </div>
            <p className="mt-0.5 md:mt-1 text-sm md:text-base text-muted-foreground">{config.description}</p>

            {/* Trend indicator */}
            {data.trend && data.trend !== 'stable' && (
              <TrendIndicator trend={data.trend} className="mt-2 md:mt-3" />
            )}

            {/* Confidence indicator - hidden on mobile to save space */}
            <div className={cn('hidden md:block mt-4', config.textColor)}>
              <ConfidenceDots confidence={data.confidence} />
            </div>

            {/* Timestamp - compact on mobile */}
            <div className="mt-2 md:mt-4 text-xs text-muted-foreground">
              <span>As of {formattedTime}</span>
              <span className="hidden md:inline"> • Updates every 5 minutes</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
