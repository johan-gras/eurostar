import { cn } from '@/lib/utils';
import { Card, CardContent, CardHeader } from './card';
import { Skeleton } from './skeleton';

interface SkeletonCardProps {
  className?: string;
  /** Show header skeleton */
  showHeader?: boolean;
  /** Number of content lines */
  lines?: number;
}

/**
 * Card-shaped loading skeleton
 */
function SkeletonCard({
  className,
  showHeader = true,
  lines = 3,
}: SkeletonCardProps) {
  return (
    <Card className={cn('overflow-hidden', className)}>
      {showHeader && (
        <CardHeader className="space-y-2">
          <Skeleton className="h-5 w-1/3" />
          <Skeleton className="h-4 w-2/3" />
        </CardHeader>
      )}
      <CardContent className={cn(!showHeader && 'pt-6')}>
        <div className="space-y-3">
          {Array.from({ length: lines }).map((_, i) => (
            <Skeleton
              key={i}
              className="h-4"
              style={{ width: `${85 - i * 15}%` }}
            />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

interface SkeletonStatProps {
  className?: string;
  /** Icon placeholder size */
  iconSize?: 'sm' | 'md';
}

/**
 * Small stat card skeleton for dashboard stats
 */
function SkeletonStat({ className, iconSize = 'sm' }: SkeletonStatProps) {
  return (
    <Card className={className}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <Skeleton className="h-4 w-24" />
        <Skeleton
          className={cn(
            'rounded',
            iconSize === 'sm' ? 'h-4 w-4' : 'h-5 w-5'
          )}
        />
      </CardHeader>
      <CardContent>
        <Skeleton className="h-8 w-16" />
      </CardContent>
    </Card>
  );
}

interface SkeletonTableProps {
  className?: string;
  /** Number of rows to display */
  rows?: number;
  /** Number of columns to display */
  columns?: number;
  /** Show table header */
  showHeader?: boolean;
}

/**
 * Table loading skeleton with configurable rows and columns
 */
function SkeletonTable({
  className,
  rows = 5,
  columns = 4,
  showHeader = true,
}: SkeletonTableProps) {
  const columnWidths = ['w-1/4', 'w-1/3', 'w-1/5', 'w-2/5', 'w-1/6'];

  return (
    <div className={cn('w-full', className)}>
      {showHeader && (
        <div className="flex items-center gap-4 border-b pb-3 mb-3">
          {Array.from({ length: columns }).map((_, i) => (
            <Skeleton
              key={i}
              className={cn('h-4', columnWidths[i % columnWidths.length])}
            />
          ))}
        </div>
      )}
      <div className="space-y-3">
        {Array.from({ length: rows }).map((_, rowIndex) => (
          <div key={rowIndex} className="flex items-center gap-4">
            {Array.from({ length: columns }).map((_, colIndex) => (
              <Skeleton
                key={colIndex}
                className={cn(
                  'h-4',
                  columnWidths[colIndex % columnWidths.length]
                )}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

interface SkeletonListProps {
  className?: string;
  /** Number of items to display */
  items?: number;
  /** Show avatar/icon placeholder */
  showAvatar?: boolean;
  /** Show secondary line */
  showSecondary?: boolean;
}

/**
 * List loading skeleton with optional avatars
 */
function SkeletonList({
  className,
  items = 5,
  showAvatar = false,
  showSecondary = true,
}: SkeletonListProps) {
  return (
    <div className={cn('space-y-4', className)}>
      {Array.from({ length: items }).map((_, i) => (
        <div key={i} className="flex items-center gap-4">
          {showAvatar && <Skeleton className="h-10 w-10 rounded-full" />}
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-3/4" />
            {showSecondary && <Skeleton className="h-3 w-1/2" />}
          </div>
        </div>
      ))}
    </div>
  );
}

interface SkeletonBookingCardProps {
  className?: string;
}

/**
 * Booking card skeleton for mobile view
 */
function SkeletonBookingCard({ className }: SkeletonBookingCardProps) {
  return (
    <Card className={cn('overflow-hidden', className)}>
      <CardContent className="pt-4 space-y-3">
        <div className="flex items-center justify-between">
          <Skeleton className="h-5 w-24" />
          <Skeleton className="h-5 w-16 rounded-full" />
        </div>
        <div className="flex items-center gap-2">
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-4 w-4" />
          <Skeleton className="h-4 w-20" />
        </div>
        <div className="flex items-center justify-between">
          <Skeleton className="h-4 w-28" />
          <Skeleton className="h-4 w-16" />
        </div>
      </CardContent>
    </Card>
  );
}

interface SkeletonClaimCardProps {
  className?: string;
}

/**
 * Claim card skeleton
 */
function SkeletonClaimCard({ className }: SkeletonClaimCardProps) {
  return (
    <Card className={cn('overflow-hidden', className)}>
      <CardContent className="pt-4 space-y-3">
        <div className="flex items-center justify-between">
          <Skeleton className="h-5 w-20" />
          <Skeleton className="h-5 w-16 rounded-full" />
        </div>
        <div className="space-y-2">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-4 w-24" />
        </div>
        <div className="flex items-center justify-between">
          <Skeleton className="h-6 w-16" />
          <Skeleton className="h-4 w-20" />
        </div>
      </CardContent>
    </Card>
  );
}

interface SkeletonQueueStatusProps {
  className?: string;
}

/**
 * Queue status hero card skeleton
 */
function SkeletonQueueStatus({ className }: SkeletonQueueStatusProps) {
  return (
    <Card className={cn('overflow-hidden', className)}>
      <CardHeader className="pb-2">
        <Skeleton className="h-5 w-32" />
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-4">
          <Skeleton className="h-16 w-16 rounded-full" />
          <div className="space-y-2">
            <Skeleton className="h-8 w-24" />
            <Skeleton className="h-4 w-32" />
          </div>
        </div>
        <Skeleton className="h-4 w-full" />
      </CardContent>
    </Card>
  );
}

interface SkeletonTimelineProps {
  className?: string;
  items?: number;
}

/**
 * Timeline skeleton for queue predictions
 */
function SkeletonTimeline({ className, items = 6 }: SkeletonTimelineProps) {
  return (
    <Card className={cn('overflow-hidden', className)}>
      <CardHeader className="pb-2">
        <Skeleton className="h-5 w-40" />
      </CardHeader>
      <CardContent>
        <div className="flex gap-3 overflow-hidden">
          {Array.from({ length: items }).map((_, i) => (
            <div key={i} className="flex flex-col items-center gap-2 min-w-[60px]">
              <Skeleton className="h-4 w-12" />
              <Skeleton className="h-8 w-8 rounded-full" />
              <Skeleton className="h-3 w-8" />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

interface SkeletonSeatMapProps {
  className?: string;
}

/**
 * Seat map skeleton
 */
function SkeletonSeatMap({ className }: SkeletonSeatMapProps) {
  return (
    <Card className={cn('overflow-hidden', className)}>
      <CardContent className="pt-6 space-y-4">
        {/* Coach tabs */}
        <div className="flex gap-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-8 w-16 rounded-md" />
          ))}
        </div>
        {/* Seat grid */}
        <div className="grid grid-cols-4 gap-2">
          {Array.from({ length: 16 }).map((_, i) => (
            <Skeleton key={i} className="h-10 w-10 rounded-md" />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

interface SkeletonFormProps {
  className?: string;
  fields?: number;
}

/**
 * Form skeleton with configurable fields
 */
function SkeletonForm({ className, fields = 4 }: SkeletonFormProps) {
  return (
    <Card className={cn('overflow-hidden', className)}>
      <CardHeader>
        <Skeleton className="h-5 w-32" />
        <Skeleton className="h-4 w-48" />
      </CardHeader>
      <CardContent className="space-y-4">
        {Array.from({ length: fields }).map((_, i) => (
          <div key={i} className="space-y-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-10 w-full rounded-md" />
          </div>
        ))}
        <Skeleton className="h-10 w-full rounded-md" />
      </CardContent>
    </Card>
  );
}

export {
  SkeletonCard,
  SkeletonStat,
  SkeletonTable,
  SkeletonList,
  SkeletonBookingCard,
  SkeletonClaimCard,
  SkeletonQueueStatus,
  SkeletonTimeline,
  SkeletonSeatMap,
  SkeletonForm,
};
