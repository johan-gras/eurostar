import { Skeleton } from '@/components/ui/skeleton';
import { SkeletonTable, SkeletonClaimCard } from '@/components/ui/skeleton-card';

export default function ClaimsLoading() {
  return (
    <div className="container py-6 space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-2">
          <Skeleton className="h-8 w-24" />
          <Skeleton className="h-4 w-64" />
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-11 w-20" />
          <Skeleton className="h-11 w-20" />
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
        <SkeletonTable rows={8} columns={5} />
      </div>

      {/* Mobile cards skeleton */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 md:hidden">
        <SkeletonClaimCard />
        <SkeletonClaimCard />
        <SkeletonClaimCard />
      </div>

      {/* Desktop cards layout */}
      <div className="hidden md:grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <SkeletonClaimCard />
        <SkeletonClaimCard />
        <SkeletonClaimCard />
        <SkeletonClaimCard />
        <SkeletonClaimCard />
        <SkeletonClaimCard />
      </div>
    </div>
  );
}
