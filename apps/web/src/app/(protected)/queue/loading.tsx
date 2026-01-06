import { Skeleton } from '@/components/ui/skeleton';
import { SkeletonQueueStatus, SkeletonTimeline, SkeletonCard } from '@/components/ui/skeleton-card';

export default function QueueLoading() {
  return (
    <div className="container py-4 md:py-6">
      <div className="mb-4 md:mb-6 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-2">
          <Skeleton className="h-7 w-32" />
          <Skeleton className="h-4 w-48" />
        </div>
        <div className="hidden sm:block">
          <Skeleton className="h-10 w-72" />
        </div>
      </div>

      {/* Terminal Selector skeleton */}
      <div className="mb-4 md:mb-6">
        <div className="flex gap-3 overflow-hidden">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-24 w-40 shrink-0 rounded-lg" />
          ))}
        </div>
      </div>

      {/* Mobile Layout */}
      <div className="md:hidden space-y-4">
        <Skeleton className="h-8 w-full" />
        <SkeletonQueueStatus />
        <SkeletonTimeline items={5} />
        <SkeletonCard lines={3} />
        <SkeletonCard lines={4} />
      </div>

      {/* Desktop Layout */}
      <div className="hidden md:flex md:flex-row gap-6">
        {/* Sidebar */}
        <div className="lg:w-80 shrink-0 space-y-4">
          <SkeletonQueueStatus />
          <SkeletonCard lines={4} />
        </div>

        {/* Main Content */}
        <div className="flex-1 min-w-0 space-y-6">
          <SkeletonTimeline items={8} />
          <SkeletonCard lines={5} />
        </div>
      </div>
    </div>
  );
}
