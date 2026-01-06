import { Skeleton } from '@/components/ui/skeleton';
import { SkeletonForm } from '@/components/ui/skeleton-card';

export default function NotificationSettingsLoading() {
  return (
    <div className="container py-6 space-y-6">
      <div className="flex items-center gap-4">
        <Skeleton className="h-9 w-9" />
        <div className="flex items-center gap-2">
          <Skeleton className="h-6 w-6" />
          <Skeleton className="h-8 w-48" />
        </div>
      </div>

      {/* Delay Alerts */}
      <SkeletonForm fields={3} />

      {/* Email Preferences */}
      <SkeletonForm fields={4} />

      {/* Queue Notifications */}
      <SkeletonForm fields={1} />

      {/* Push Notifications */}
      <SkeletonForm fields={1} />

      {/* Save Button */}
      <div className="flex justify-end">
        <Skeleton className="h-10 w-48 rounded-md" />
      </div>
    </div>
  );
}
