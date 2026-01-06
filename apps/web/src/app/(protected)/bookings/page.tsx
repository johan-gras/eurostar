'use client';

import { useState, useMemo, useCallback } from 'react';
import { Plus, Download } from 'lucide-react';
import { exportToCSV, exportToJSON } from '@/lib/export';
import { Button } from '@/components/ui/button';
import { BookingList } from '@/components/booking/BookingList';
import { ImportBookingDialog } from '@/components/bookings/ImportBookingDialog';
import { SearchFilter, type DateRange, type FilterConfig } from '@/components/ui/search-filter';
import { useBookings, useDeleteBooking } from '@/lib/queries';
import { showSuccess, showError } from '@/lib/notifications';

type BookingStatusFilter = 'all' | 'on-time' | 'delayed' | 'pending';

const STATUS_FILTER_OPTIONS: FilterConfig<BookingStatusFilter>['options'] = [
  { value: 'all', label: 'All Statuses' },
  { value: 'pending', label: 'Pending Delay Info' },
  { value: 'on-time', label: 'On Time' },
  { value: 'delayed', label: 'Delayed' },
];

const STATUS_FILTER: FilterConfig<BookingStatusFilter> = {
  key: 'status',
  label: 'Status',
  options: STATUS_FILTER_OPTIONS,
  defaultValue: 'all',
};

export default function BookingsPage() {
  const { data, isLoading } = useBookings();
  const deleteBooking = useDeleteBooking();
  const bookings = useMemo(() => data?.data ?? [], [data?.data]);

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<BookingStatusFilter>('all');
  const [dateRange, setDateRange] = useState<DateRange>({ from: undefined, to: undefined });

  const handleDelete = async (id: string) => {
    try {
      await deleteBooking.mutateAsync(id);
      showSuccess('Booking deleted', 'The booking has been removed');
    } catch {
      showError('Failed to delete', 'Could not delete the booking');
    }
  };

  const handleSearchChange = useCallback((value: string) => {
    setSearchQuery(value);
  }, []);

  const handleFiltersChange = useCallback((filters: Record<string, string>) => {
    setStatusFilter((filters['status'] as BookingStatusFilter) || 'all');
  }, []);

  const handleDateRangeChange = useCallback((range: DateRange) => {
    setDateRange(range);
  }, []);

  const filteredBookings = useMemo(() => {
    return bookings.filter((booking) => {
      // Search by PNR or train number
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchesPnr = booking.pnr.toLowerCase().includes(query);
        const matchesTrainNumber = booking.trainNumber.toLowerCase().includes(query);
        const matchesPassenger = booking.passengerName.toLowerCase().includes(query);
        if (!matchesPnr && !matchesTrainNumber && !matchesPassenger) {
          return false;
        }
      }

      // Filter by status
      if (statusFilter !== 'all') {
        const delay = booking.finalDelayMinutes;
        if (statusFilter === 'pending' && delay !== null) {
          return false;
        }
        if (statusFilter === 'on-time' && (delay === null || delay > 0)) {
          return false;
        }
        if (statusFilter === 'delayed' && (delay === null || delay <= 0)) {
          return false;
        }
      }

      // Filter by date range
      if (dateRange.from || dateRange.to) {
        const journeyDate = new Date(booking.journeyDate);
        if (dateRange.from && journeyDate < dateRange.from) {
          return false;
        }
        if (dateRange.to) {
          const endOfDay = new Date(dateRange.to);
          endOfDay.setHours(23, 59, 59, 999);
          if (journeyDate > endOfDay) {
            return false;
          }
        }
      }

      return true;
    });
  }, [bookings, searchQuery, statusFilter, dateRange]);

  const hasActiveFilters =
    searchQuery.trim() !== '' ||
    statusFilter !== 'all' ||
    dateRange.from !== undefined ||
    dateRange.to !== undefined;

  const handleExportCSV = () => {
    const dataToExport = filteredBookings.map((booking) => ({
      pnr: booking.pnr,
      trainNumber: booking.trainNumber,
      journeyDate: booking.journeyDate,
      passengerName: booking.passengerName,
      origin: booking.origin,
      destination: booking.destination,
      finalDelayMinutes: booking.finalDelayMinutes,
      createdAt: booking.createdAt,
    }));
    exportToCSV(dataToExport, `bookings-${new Date().toISOString().split('T')[0]}`);
  };

  const handleExportJSON = () => {
    exportToJSON(filteredBookings, `bookings-${new Date().toISOString().split('T')[0]}`);
  };

  return (
    <div className="container py-6 space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Bookings</h1>
          <p className="text-muted-foreground">
            Manage your Eurostar journey bookings
          </p>
        </div>
        <div className="flex gap-2 w-full sm:w-auto">
          {filteredBookings.length > 0 && (
            <>
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
            </>
          )}
          <ImportBookingDialog
            trigger={
              <Button className="w-full sm:w-auto min-h-[44px]">
                <Plus className="h-4 w-4 mr-2" />
                Add Booking
              </Button>
            }
          />
        </div>
      </div>

      {/* Search and Filter */}
      {!isLoading && bookings.length > 0 && (
        <SearchFilter
          searchPlaceholder="Search by PNR, train number, or passenger..."
          onSearchChange={handleSearchChange}
          filters={[STATUS_FILTER]}
          onFiltersChange={handleFiltersChange}
          showDateRange
          onDateRangeChange={handleDateRangeChange}
          totalCount={bookings.length}
          filteredCount={hasActiveFilters ? filteredBookings.length : undefined}
        />
      )}

      {/* Empty state for filtered results */}
      {!isLoading && bookings.length > 0 && filteredBookings.length === 0 && hasActiveFilters ? (
        <div className="text-center py-12 text-muted-foreground">
          No bookings match your filters
        </div>
      ) : (
        <BookingList
          bookings={filteredBookings}
          isLoading={isLoading}
          onDelete={(id) => void handleDelete(id)}
        />
      )}
    </div>
  );
}
