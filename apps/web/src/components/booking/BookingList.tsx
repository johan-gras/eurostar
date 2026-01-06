'use client';

import { useState } from 'react';
import { Ticket, ChevronLeft, ChevronRight } from 'lucide-react';
import { BookingTable } from '@/components/bookings/BookingTable';
import { BookingCard } from '@/components/bookings/BookingCard';
import { EmptyState } from '@/components/ui/empty-state';
import { Button } from '@/components/ui/button';
import type { BookingResponse, PaginationMeta } from '@/lib/api';

interface BookingListProps {
  bookings: BookingResponse[];
  isLoading?: boolean;
  meta?: PaginationMeta;
  onPageChange?: (page: number) => void;
  onDelete?: (id: string) => void;
}

const ITEMS_PER_PAGE = 10;

export function BookingList({ bookings, isLoading, meta, onPageChange, onDelete }: BookingListProps) {
  const [localPage, setLocalPage] = useState(1);

  // Use server-side pagination if meta is provided, otherwise client-side
  const useServerPagination = !!meta && !!onPageChange;

  const currentPage = useServerPagination ? meta.page : localPage;
  const totalPages = useServerPagination
    ? meta.totalPages
    : Math.ceil(bookings.length / ITEMS_PER_PAGE);
  const totalItems = useServerPagination ? meta.total : bookings.length;

  // For client-side pagination, slice the bookings
  const displayedBookings = useServerPagination
    ? bookings
    : bookings.slice((localPage - 1) * ITEMS_PER_PAGE, localPage * ITEMS_PER_PAGE);

  const handlePageChange = (page: number) => {
    if (useServerPagination) {
      onPageChange?.(page);
    } else {
      setLocalPage(page);
    }
  };

  if (isLoading) {
    return (
      <>
        {/* Desktop skeleton */}
        <div className="hidden md:block">
          <div className="rounded-lg border">
            <div className="h-12 border-b bg-muted/50 animate-pulse" />
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-16 border-b last:border-0 bg-muted/30 animate-pulse" />
            ))}
          </div>
        </div>
        {/* Mobile skeleton */}
        <div className="grid gap-4 md:hidden">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-36 rounded-lg border bg-muted/50 animate-pulse"
            />
          ))}
        </div>
      </>
    );
  }

  if (bookings.length === 0) {
    return (
      <EmptyState
        icon={Ticket}
        title="No bookings yet"
        description="Add your first booking to start tracking delays and claiming compensation."
        actionLabel="Add Booking"
        actionHref="/bookings/new"
      />
    );
  }

  return (
    <div className="space-y-4">
      {/* Desktop table view */}
      <div className="hidden md:block rounded-lg border">
        <BookingTable bookings={displayedBookings} onDelete={onDelete} />
      </div>

      {/* Mobile card view */}
      <div className="grid gap-4 md:hidden">
        {displayedBookings.map((booking) => (
          <BookingCard key={booking.id} booking={booking} onDelete={onDelete} />
        ))}
      </div>

      {/* Pagination - show only if more than ITEMS_PER_PAGE items */}
      {totalItems > ITEMS_PER_PAGE && (
        <div className="flex flex-col gap-3 border-t pt-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-muted-foreground text-center sm:text-left">
            Showing {((currentPage - 1) * ITEMS_PER_PAGE) + 1} to{' '}
            {Math.min(currentPage * ITEMS_PER_PAGE, totalItems)} of {totalItems} bookings
          </p>
          <div className="flex items-center justify-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="min-h-[44px] min-w-[44px]"
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage <= 1}
            >
              <ChevronLeft className="h-4 w-4 sm:mr-1" />
              <span className="hidden sm:inline">Previous</span>
            </Button>
            <div className="hidden sm:flex items-center gap-1">
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => {
                // Show first, last, current, and adjacent pages
                const showPage =
                  page === 1 ||
                  page === totalPages ||
                  Math.abs(page - currentPage) <= 1;

                if (!showPage) {
                  // Show ellipsis
                  if (page === 2 || page === totalPages - 1) {
                    return (
                      <span key={page} className="px-2 text-muted-foreground">
                        ...
                      </span>
                    );
                  }
                  return null;
                }

                return (
                  <Button
                    key={page}
                    variant={page === currentPage ? 'default' : 'outline'}
                    size="sm"
                    className="h-11 w-11 p-0"
                    onClick={() => handlePageChange(page)}
                  >
                    {page}
                  </Button>
                );
              })}
            </div>
            {/* Mobile page indicator */}
            <span className="sm:hidden text-sm text-muted-foreground px-2">
              {currentPage} / {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              className="min-h-[44px] min-w-[44px]"
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage >= totalPages}
            >
              <span className="hidden sm:inline">Next</span>
              <ChevronRight className="h-4 w-4 sm:ml-1" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
