import { Skeleton } from '@/components/ui/skeleton';
import {
  SkeletonStat,
  SkeletonTable,
  SkeletonBookingCard,
  SkeletonClaimCard,
} from '@/components/ui/skeleton-card';

export default function DashboardLoading() {
  return (
    <div className="container py-6 space-y-8">
      {/* Stats Overview */}
      <div className="grid gap-4 md:grid-cols-3">
        <SkeletonStat />
        <SkeletonStat />
        <SkeletonStat />
      </div>

      {/* Quick Action */}
      <div className="rounded-lg border bg-card p-6">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="space-y-2">
            <Skeleton className="h-5 w-40" />
            <Skeleton className="h-4 w-64" />
          </div>
          <Skeleton className="h-10 w-32 rounded-md" />
        </div>
      </div>

      {/* Recent Bookings */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div className="space-y-1">
            <Skeleton className="h-5 w-36" />
            <Skeleton className="h-4 w-48" />
          </div>
          <Skeleton className="h-9 w-20" />
        </div>
        {/* Desktop skeleton */}
        <div className="hidden md:block">
          <SkeletonTable rows={5} columns={5} />
        </div>
        {/* Mobile skeleton */}
        <div className="grid gap-4 md:hidden">
          <SkeletonBookingCard />
          <SkeletonBookingCard />
          <SkeletonBookingCard />
        </div>
      </div>

      {/* Recent Claims */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div className="space-y-1">
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-4 w-56" />
          </div>
          <Skeleton className="h-9 w-20" />
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <SkeletonClaimCard />
          <SkeletonClaimCard />
          <SkeletonClaimCard />
        </div>
      </div>

      {/* Analytics */}
      <div>
        <div className="mb-4 space-y-1">
          <Skeleton className="h-5 w-24" />
          <Skeleton className="h-4 w-48" />
        </div>
        <div className="rounded-lg border bg-card p-6">
          <Skeleton className="h-64 w-full" />
        </div>
      </div>
    </div>
  );
}
