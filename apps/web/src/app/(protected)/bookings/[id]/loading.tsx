import { Skeleton } from '@/components/ui/skeleton';
import { SkeletonCard } from '@/components/ui/skeleton-card';

export default function BookingDetailLoading() {
  return (
    <div className="container py-6 max-w-3xl">
      <Skeleton className="h-9 w-36 mb-4" />

      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-4 w-32" />
          </div>
          <Skeleton className="h-6 w-20 rounded-full" />
        </div>

        {/* Journey Card */}
        <SkeletonCard showHeader lines={4} />

        {/* Passenger Info */}
        <SkeletonCard showHeader lines={2} />

        {/* Delay Info */}
        <SkeletonCard showHeader lines={3} />

        {/* Actions */}
        <div className="flex gap-2 justify-end">
          <Skeleton className="h-10 w-24 rounded-md" />
          <Skeleton className="h-10 w-32 rounded-md" />
        </div>
      </div>
    </div>
  );
}
