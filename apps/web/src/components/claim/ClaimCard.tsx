'use client';

import Link from 'next/link';
import { format } from 'date-fns';
import { ArrowRight, Clock } from 'lucide-react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { StatusBadge } from '@/components/common/StatusBadge';
import { CompensationBadge } from '@/components/common/CompensationBadge';
import type { ClaimResponse, BookingResponse } from '@/lib/api';

interface ClaimCardProps {
  claim: ClaimResponse;
  booking?: BookingResponse;
}

export function ClaimCard({ claim, booking }: ClaimCardProps) {
  return (
    <Link href={`/claims/${claim.id}`}>
      <Card className="hover:bg-muted/50 transition-colors cursor-pointer">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <StatusBadge status={claim.status} />
            <span className="text-sm text-muted-foreground">
              {format(new Date(claim.createdAt), 'dd MMM yyyy')}
            </span>
          </div>
        </CardHeader>
        <CardContent>
          {booking && (
            <div className="flex items-center gap-2 text-sm mb-3">
              <span className="font-mono font-medium">{booking.pnr}</span>
              <span className="text-muted-foreground">•</span>
              <span>{booking.origin}</span>
              <ArrowRight className="h-3 w-3 text-muted-foreground" />
              <span>{booking.destination}</span>
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
            <p className="text-xs text-muted-foreground mt-2">
              Submitted: {format(new Date(claim.submittedAt), 'dd MMM yyyy')}
            </p>
          )}
        </CardContent>
      </Card>
    </Link>
  );
}
