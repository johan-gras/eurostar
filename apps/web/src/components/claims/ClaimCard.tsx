'use client';

import Link from 'next/link';
import { format } from 'date-fns';
import { ArrowRight, Clock, Send } from 'lucide-react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CompensationBadge } from '@/components/common/CompensationBadge';
import type { ClaimResponse, BookingResponse, ClaimStatus } from '@/lib/api';

interface ClaimWithBooking extends ClaimResponse {
  booking?: BookingResponse;
}

interface ClaimCardProps {
  claim: ClaimWithBooking;
  onSubmit?: (id: string) => void;
  isSubmitting?: boolean;
}

const statusConfig: Record<ClaimStatus, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' | 'success' | 'warning' | 'info' | 'purple' }> = {
  pending: { label: 'Pending', variant: 'warning' },
  eligible: { label: 'Ready to Submit', variant: 'info' },
  submitted: { label: 'Submitted', variant: 'purple' },
  approved: { label: 'Approved', variant: 'success' },
  rejected: { label: 'Rejected', variant: 'destructive' },
  expired: { label: 'Expired', variant: 'secondary' },
};

function ClaimStatusBadge({ status }: { status: ClaimStatus }) {
  const config = statusConfig[status] ?? { label: 'Unknown', variant: 'outline' as const };
  return <Badge variant={config.variant}>{config.label}</Badge>;
}

export function ClaimCard({ claim, onSubmit, isSubmitting }: ClaimCardProps) {
  return (
    <Card className="hover:bg-muted/50 transition-colors">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <ClaimStatusBadge status={claim.status} />
          <span className="text-sm text-muted-foreground">
            {format(new Date(claim.createdAt), 'dd MMM yyyy')}
          </span>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {claim.booking && (
          <div className="flex items-center gap-2 text-sm">
            <span className="font-mono font-medium">{claim.booking.pnr}</span>
            <span className="text-muted-foreground">•</span>
            <span>{claim.booking.origin}</span>
            <ArrowRight className="h-3 w-3 text-muted-foreground" />
            <span>{claim.booking.destination}</span>
          </div>
        )}

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1 text-sm text-muted-foreground">
            <Clock className="h-3 w-3" />
            <span>{claim.delayMinutes} min delay</span>
          </div>
          <CompensationBadge
            cashAmount={claim.eligibleCashAmount}
            voucherAmount={claim.eligibleVoucherAmount}
          />
        </div>

        {claim.submittedAt && (
          <p className="text-xs text-muted-foreground">
            Submitted: {format(new Date(claim.submittedAt), 'dd MMM yyyy')}
          </p>
        )}

        <div className="flex items-center gap-2 pt-2">
          <Link href={`/claims/${claim.id}`} className="flex-1">
            <Button variant="outline" size="sm" className="w-full min-h-[44px]">
              View Details
            </Button>
          </Link>
          {claim.status === 'eligible' && onSubmit && (
            <Button
              size="sm"
              className="flex-1 min-h-[44px]"
              onClick={() => onSubmit(claim.id)}
              disabled={isSubmitting}
            >
              <Send className="h-4 w-4 mr-1" />
              Submit
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
