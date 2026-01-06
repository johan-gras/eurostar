'use client';

import { FileText } from 'lucide-react';
import { ClaimCard } from './ClaimCard';
import { EmptyState } from '@/components/ui/empty-state';
import type { ClaimResponse } from '@/lib/api';

interface ClaimListProps {
  claims: ClaimResponse[];
  isLoading?: boolean;
}

export function ClaimList({ claims, isLoading }: ClaimListProps) {
  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="h-36 rounded-lg border bg-muted/50 animate-pulse"
          />
        ))}
      </div>
    );
  }

  if (claims.length === 0) {
    return (
      <EmptyState
        icon={FileText}
        title="No claims yet"
        description="Claims are automatically generated when your bookings have eligible delays."
        actionLabel="Add Booking"
        actionHref="/bookings/new"
      />
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {claims.map((claim) => (
        <ClaimCard key={claim.id} claim={claim} />
      ))}
    </div>
  );
}
