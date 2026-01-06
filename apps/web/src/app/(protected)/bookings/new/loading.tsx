import { Skeleton } from '@/components/ui/skeleton';
import { SkeletonForm } from '@/components/ui/skeleton-card';

export default function NewBookingLoading() {
  return (
    <div className="container py-6 max-w-2xl">
      <Skeleton className="h-9 w-36 mb-4" />

      <div className="space-y-2 mb-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-64" />
      </div>

      <SkeletonForm fields={6} />
    </div>
  );
}
