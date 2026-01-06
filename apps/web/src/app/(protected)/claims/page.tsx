'use client';

import { useState, useMemo, useCallback } from 'react';
import { FileText, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { exportToCSV, exportToJSON } from '@/lib/export';
import { ClaimTable } from '@/components/claims/ClaimTable';
import { ClaimCard } from '@/components/claims/ClaimCard';
import { EmptyState } from '@/components/ui/empty-state';
import { SearchFilter, type DateRange, type FilterConfig } from '@/components/ui/search-filter';
import { useClaims, useMarkClaimSubmitted } from '@/lib/queries';
import type { ClaimStatus } from '@/lib/api';

type ClaimStatusFilter = ClaimStatus | 'all';
type AmountFilter = 'all' | 'under-50' | '50-100' | 'over-100';

const STATUS_FILTER_OPTIONS: FilterConfig<ClaimStatusFilter>['options'] = [
  { value: 'all', label: 'All Statuses' },
  { value: 'pending', label: 'Pending' },
  { value: 'eligible', label: 'Ready to Submit' },
  { value: 'submitted', label: 'Submitted' },
  { value: 'approved', label: 'Approved' },
  { value: 'rejected', label: 'Rejected' },
  { value: 'expired', label: 'Expired' },
];

const AMOUNT_FILTER_OPTIONS: FilterConfig<AmountFilter>['options'] = [
  { value: 'all', label: 'All Amounts' },
  { value: 'under-50', label: 'Under €50' },
  { value: '50-100', label: '€50 - €100' },
  { value: 'over-100', label: 'Over €100' },
];

const STATUS_FILTER: FilterConfig<ClaimStatusFilter> = {
  key: 'status',
  label: 'Status',
  options: STATUS_FILTER_OPTIONS,
  defaultValue: 'all',
};

const AMOUNT_FILTER: FilterConfig<AmountFilter> = {
  key: 'amount',
  label: 'Amount',
  options: AMOUNT_FILTER_OPTIONS,
  defaultValue: 'all',
};

export default function ClaimsPage() {
  const { data, isLoading } = useClaims();
  const markSubmitted = useMarkClaimSubmitted();
  const claims = useMemo(() => data?.data ?? [], [data?.data]);

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<ClaimStatusFilter>('all');
  const [amountFilter, setAmountFilter] = useState<AmountFilter>('all');
  const [dateRange, setDateRange] = useState<DateRange>({ from: undefined, to: undefined });

  const handleSubmit = (id: string) => {
    markSubmitted.mutate(id);
  };

  const handleSearchChange = useCallback((value: string) => {
    setSearchQuery(value);
  }, []);

  const handleFiltersChange = useCallback((filters: Record<string, string>) => {
    setStatusFilter((filters['status'] as ClaimStatusFilter) || 'all');
    setAmountFilter((filters['amount'] as AmountFilter) || 'all');
  }, []);

  const handleDateRangeChange = useCallback((range: DateRange) => {
    setDateRange(range);
  }, []);

  const filteredClaims = useMemo(() => {
    return claims.filter((claim) => {
      // Search by booking ID (partial match)
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchesBookingId = claim.bookingId.toLowerCase().includes(query);
        const matchesId = claim.id.toLowerCase().includes(query);
        if (!matchesBookingId && !matchesId) {
          return false;
        }
      }

      // Filter by status
      if (statusFilter !== 'all' && claim.status !== statusFilter) {
        return false;
      }

      // Filter by amount (cash amount)
      if (amountFilter !== 'all') {
        const amount = claim.eligibleCashAmount;
        if (amountFilter === 'under-50' && amount >= 50) {
          return false;
        }
        if (amountFilter === '50-100' && (amount < 50 || amount > 100)) {
          return false;
        }
        if (amountFilter === 'over-100' && amount <= 100) {
          return false;
        }
      }

      // Filter by date range
      if (dateRange.from || dateRange.to) {
        const claimDate = new Date(claim.createdAt);
        if (dateRange.from && claimDate < dateRange.from) {
          return false;
        }
        if (dateRange.to) {
          const endOfDay = new Date(dateRange.to);
          endOfDay.setHours(23, 59, 59, 999);
          if (claimDate > endOfDay) {
            return false;
          }
        }
      }

      return true;
    });
  }, [claims, searchQuery, statusFilter, amountFilter, dateRange]);

  const hasActiveFilters =
    searchQuery.trim() !== '' ||
    statusFilter !== 'all' ||
    amountFilter !== 'all' ||
    dateRange.from !== undefined ||
    dateRange.to !== undefined;

  const handleExportCSV = () => {
    const dataToExport = filteredClaims.map((claim) => ({
      id: claim.id,
      bookingId: claim.bookingId,
      status: claim.status,
      delayMinutes: claim.delayMinutes,
      eligibleCashAmount: claim.eligibleCashAmount,
      eligibleVoucherAmount: claim.eligibleVoucherAmount,
      createdAt: claim.createdAt,
      submittedAt: claim.submittedAt,
    }));
    exportToCSV(dataToExport, `claims-${new Date().toISOString().split('T')[0]}`);
  };

  const handleExportJSON = () => {
    exportToJSON(filteredClaims, `claims-${new Date().toISOString().split('T')[0]}`);
  };

  if (isLoading) {
    return (
      <div className="container py-6 space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Claims</h1>
          <p className="text-muted-foreground">
            View and manage your compensation claims
          </p>
        </div>
        <div className="hidden md:block">
          <div className="h-64 rounded-lg border bg-muted/50 animate-pulse" />
        </div>
        <div className="grid gap-4 md:hidden">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-36 rounded-lg border bg-muted/50 animate-pulse"
            />
          ))}
        </div>
      </div>
    );
  }

  if (claims.length === 0) {
    return (
      <div className="container py-6 space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Claims</h1>
          <p className="text-muted-foreground">
            View and manage your compensation claims
          </p>
        </div>
        <EmptyState
          icon={FileText}
          title="No claims yet"
          description="Claims are automatically generated when your bookings have eligible delays."
          actionLabel="Add Booking"
          actionHref="/bookings/new"
        />
      </div>
    );
  }

  return (
    <div className="container py-6 space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Claims</h1>
          <p className="text-muted-foreground">
            View and manage your compensation claims
          </p>
        </div>
        {filteredClaims.length > 0 && (
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportCSV}
              className="min-h-[44px]"
            >
              <Download className="h-4 w-4 mr-2" />
              CSV
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportJSON}
              className="min-h-[44px]"
            >
              <Download className="h-4 w-4 mr-2" />
              JSON
            </Button>
          </div>
        )}
      </div>

      {/* Search and Filters */}
      <SearchFilter
        searchPlaceholder="Search by claim or booking ID..."
        onSearchChange={handleSearchChange}
        filters={[STATUS_FILTER, AMOUNT_FILTER]}
        onFiltersChange={handleFiltersChange}
        showDateRange
        onDateRangeChange={handleDateRangeChange}
        totalCount={claims.length}
        filteredCount={hasActiveFilters ? filteredClaims.length : undefined}
      />

      {filteredClaims.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          No claims match your filters
        </div>
      ) : (
        <>
          {/* Desktop Table */}
          <div className="hidden md:block rounded-md border">
            <ClaimTable
              claims={filteredClaims}
              onSubmit={handleSubmit}
              isSubmitting={markSubmitted.isPending}
            />
          </div>

          {/* Mobile Cards */}
          <div className="grid gap-4 md:hidden">
            {filteredClaims.map((claim) => (
              <ClaimCard
                key={claim.id}
                claim={claim}
                onSubmit={handleSubmit}
                isSubmitting={markSubmitted.isPending}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
