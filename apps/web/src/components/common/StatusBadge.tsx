import { Badge } from '@/components/ui/badge';
import type { ClaimStatus } from '@/lib/api';

export type BookingStatus = 'monitoring' | 'delayed' | 'eligible' | 'claimed';

interface StatusBadgeProps {
  status: ClaimStatus | BookingStatus | 'on_time' | 'unknown';
}

type StatusConfig = { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' | 'success' | 'warning' | 'info' | 'purple' };

const statusConfig: Record<string, StatusConfig> = {
  // Booking statuses
  monitoring: { label: 'Monitoring', variant: 'info' },
  delayed: { label: 'Delayed', variant: 'warning' },
  eligible: { label: 'Eligible', variant: 'success' },
  claimed: { label: 'Claimed', variant: 'purple' },
  // Claim statuses
  pending: { label: 'Pending', variant: 'secondary' },
  submitted: { label: 'Submitted', variant: 'info' },
  approved: { label: 'Approved', variant: 'success' },
  rejected: { label: 'Rejected', variant: 'destructive' },
  expired: { label: 'Expired', variant: 'secondary' },
  // Other statuses
  on_time: { label: 'On Time', variant: 'success' },
  unknown: { label: 'Unknown', variant: 'outline' },
};

const defaultConfig: StatusConfig = { label: 'Unknown', variant: 'outline' };

export function StatusBadge({ status }: StatusBadgeProps) {
  const config = statusConfig[status] ?? defaultConfig;

  return (
    <Badge variant={config.variant}>
      {config.label}
    </Badge>
  );
}
