import { Skeleton } from '@/components/ui/skeleton';
import { SkeletonCard } from '@/components/ui/skeleton-card';

export default function ClaimDetailLoading() {
  return (
    <div className="container py-6 max-w-3xl">
      <Skeleton className="h-9 w-32 mb-4" />

      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <Skeleton className="h-8 w-40" />
            <Skeleton className="h-4 w-28" />
          </div>
          <Skeleton className="h-6 w-24 rounded-full" />
        </div>

        {/* Claim Amount */}
        <div className="rounded-lg border bg-card p-6">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-8 w-20" />
            </div>
            <Skeleton className="h-10 w-10 rounded-full" />
          </div>
        </div>

        {/* Journey Details */}
        <SkeletonCard showHeader lines={4} />

        {/* Delay Info */}
        <SkeletonCard showHeader lines={3} />

        {/* Claim Form Preview */}
        <SkeletonCard showHeader lines={5} />

        {/* Actions */}
        <div className="flex gap-2 justify-end">
          <Skeleton className="h-10 w-28 rounded-md" />
          <Skeleton className="h-10 w-36 rounded-md" />
        </div>
      </div>
    </div>
  );
}
