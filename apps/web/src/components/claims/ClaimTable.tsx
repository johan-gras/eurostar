'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { ArrowRight, ArrowUpDown, ChevronDown, ChevronUp, Eye, Send } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CompensationBadge } from '@/components/common/CompensationBadge';
import type { ClaimResponse, BookingResponse, ClaimStatus } from '@/lib/api';

type SortField = 'booking' | 'delay' | 'compensation' | 'status' | 'createdAt';
type SortDirection = 'asc' | 'desc';

interface ClaimWithBooking extends ClaimResponse {
  booking?: BookingResponse;
}

interface ClaimTableProps {
  claims: ClaimWithBooking[];
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

export function ClaimTable({ claims, onSubmit, isSubmitting }: ClaimTableProps) {
  const [sortField, setSortField] = useState<SortField>('createdAt');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const sortedClaims = useMemo(() => {
    return [...claims].sort((a, b) => {
      let comparison = 0;

      switch (sortField) {
        case 'booking':
          comparison = (a.booking?.pnr ?? '').localeCompare(b.booking?.pnr ?? '');
          break;
        case 'delay':
          comparison = a.delayMinutes - b.delayMinutes;
          break;
        case 'compensation':
          comparison = (a.eligibleCashAmount + a.eligibleVoucherAmount) - (b.eligibleCashAmount + b.eligibleVoucherAmount);
          break;
        case 'status':
          comparison = a.status.localeCompare(b.status);
          break;
        case 'createdAt':
          comparison = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
          break;
      }

      return sortDirection === 'asc' ? comparison : -comparison;
    });
  }, [claims, sortField, sortDirection]);

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) {
      return <ArrowUpDown className="ml-2 h-4 w-4 text-muted-foreground/50" />;
    }
    return sortDirection === 'asc' ? (
      <ChevronUp className="ml-2 h-4 w-4" />
    ) : (
      <ChevronDown className="ml-2 h-4 w-4" />
    );
  };

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>
            <Button
              variant="ghost"
              onClick={() => handleSort('booking')}
              className="h-8 px-2 -ml-2 hover:bg-transparent"
            >
              Booking
              <SortIcon field="booking" />
            </Button>
          </TableHead>
          <TableHead>
            <Button
              variant="ghost"
              onClick={() => handleSort('delay')}
              className="h-8 px-2 -ml-2 hover:bg-transparent"
            >
              Delay
              <SortIcon field="delay" />
            </Button>
          </TableHead>
          <TableHead>
            <Button
              variant="ghost"
              onClick={() => handleSort('compensation')}
              className="h-8 px-2 -ml-2 hover:bg-transparent"
            >
              Compensation
              <SortIcon field="compensation" />
            </Button>
          </TableHead>
          <TableHead>
            <Button
              variant="ghost"
              onClick={() => handleSort('status')}
              className="h-8 px-2 -ml-2 hover:bg-transparent"
            >
              Status
              <SortIcon field="status" />
            </Button>
          </TableHead>
          <TableHead className="text-right">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {sortedClaims.map((claim) => (
          <TableRow key={claim.id}>
            <TableCell>
              {claim.booking ? (
                <div className="space-y-1">
                  <span className="font-mono font-medium">{claim.booking.pnr}</span>
                  <div className="flex items-center gap-1 text-sm text-muted-foreground">
                    <span>{claim.booking.origin}</span>
                    <ArrowRight className="h-3 w-3" />
                    <span>{claim.booking.destination}</span>
                  </div>
                </div>
              ) : (
                <span className="text-muted-foreground">—</span>
              )}
            </TableCell>
            <TableCell>
              <span className="font-medium">{claim.delayMinutes} min</span>
            </TableCell>
            <TableCell>
              <CompensationBadge
                cashAmount={claim.eligibleCashAmount}
                voucherAmount={claim.eligibleVoucherAmount}
              />
            </TableCell>
            <TableCell>
              <ClaimStatusBadge status={claim.status} />
            </TableCell>
            <TableCell className="text-right">
              <div className="flex items-center justify-end gap-2">
                <Link href={`/claims/${claim.id}`}>
                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                    <Eye className="h-4 w-4" />
                    <span className="sr-only">View Details</span>
                  </Button>
                </Link>
                {claim.status === 'eligible' && onSubmit && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8"
                    onClick={() => onSubmit(claim.id)}
                    disabled={isSubmitting}
                  >
                    <Send className="h-4 w-4 mr-1" />
                    Submit
                  </Button>
                )}
              </div>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
