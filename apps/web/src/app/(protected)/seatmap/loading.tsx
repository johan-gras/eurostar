import { Skeleton } from '@/components/ui/skeleton';
import { SkeletonForm, SkeletonSeatMap, SkeletonCard } from '@/components/ui/skeleton-card';

export default function SeatMapLoading() {
  return (
    <div className="container py-4 md:py-6">
      <div className="mb-4 md:mb-6 space-y-2">
        <Skeleton className="h-7 w-28" />
        <Skeleton className="h-4 w-64" />
      </div>

      {/* Mobile Layout */}
      <div className="md:hidden space-y-4">
        <Skeleton className="h-12 w-full rounded-md" />
        <SkeletonForm fields={3} />
        <SkeletonSeatMap />
      </div>

      {/* Desktop Layout */}
      <div className="hidden md:flex md:flex-col lg:flex-row gap-6">
        {/* Sidebar */}
        <div className="lg:w-80 shrink-0 space-y-4">
          <SkeletonCard showHeader lines={1} />
          <SkeletonCard showHeader lines={1} />
          <SkeletonForm fields={5} />
        </div>

        {/* Main Content */}
        <div className="flex-1 min-w-0 space-y-4">
          {/* Train Overview */}
          <div className="flex gap-2">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <Skeleton key={i} className="h-12 w-16 rounded-md" />
            ))}
          </div>
          <SkeletonSeatMap />
        </div>
      </div>
    </div>
  );
}
