import { Skeleton } from '@/components/ui/skeleton';
import { SkeletonTable, SkeletonBookingCard } from '@/components/ui/skeleton-card';

export default function BookingsLoading() {
  return (
    <div className="container py-6 space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-2">
          <Skeleton className="h-8 w-32" />
          <Skeleton className="h-4 w-56" />
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-11 w-20" />
          <Skeleton className="h-11 w-20" />
          <Skeleton className="h-11 w-32" />
        </div>
      </div>

      {/* Search and Filter skeleton */}
      <div className="flex flex-col gap-4 sm:flex-row">
        <Skeleton className="h-10 flex-1" />
        <Skeleton className="h-10 w-32" />
        <Skeleton className="h-10 w-40" />
      </div>

      {/* Desktop table skeleton */}
      <div className="hidden md:block">
        <SkeletonTable rows={8} columns={6} />
      </div>

      {/* Mobile cards skeleton */}
      <div className="grid gap-4 md:hidden">
        <SkeletonBookingCard />
        <SkeletonBookingCard />
        <SkeletonBookingCard />
        <SkeletonBookingCard />
        <SkeletonBookingCard />
      </div>
    </div>
  );
}
