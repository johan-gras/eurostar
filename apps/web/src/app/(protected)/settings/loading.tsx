import { Skeleton } from '@/components/ui/skeleton';
import { SkeletonForm, SkeletonCard } from '@/components/ui/skeleton-card';

export default function SettingsLoading() {
  return (
    <div className="container py-6 space-y-6">
      <div className="flex items-center gap-2">
        <Skeleton className="h-6 w-6" />
        <Skeleton className="h-8 w-24" />
      </div>

      {/* Seat Preferences */}
      <SkeletonForm fields={5} />

      {/* Notifications Link */}
      <SkeletonCard showHeader lines={1} />

      {/* Queue Preferences */}
      <SkeletonForm fields={2} />

      {/* Compensation Preferences */}
      <SkeletonForm fields={1} />

      {/* Save Button */}
      <div className="flex justify-end">
        <Skeleton className="h-10 w-32 rounded-md" />
      </div>
    </div>
  );
}
