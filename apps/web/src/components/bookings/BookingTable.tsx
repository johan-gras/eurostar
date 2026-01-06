'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { format } from 'date-fns';
import { ArrowRight, ArrowUpDown, ChevronDown, ChevronUp, Eye, Trash2 } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { StatusBadge, type BookingStatus } from '@/components/common/StatusBadge';
import { getStationName, type BookingResponse } from '@/lib/api';

type SortField = 'trainNumber' | 'route' | 'journeyDate' | 'status';
type SortDirection = 'asc' | 'desc';

interface BookingTableProps {
  bookings: BookingResponse[];
  onDelete?: ((id: string) => void) | undefined;
}

function getBookingStatus(booking: BookingResponse): BookingStatus {
  // If there's a claim associated (would need to check), it's claimed
  // For now, derive from delay information
  const journeyDate = new Date(booking.journeyDate);
  const now = new Date();
  const isPastJourney = journeyDate < now;

  if (booking.finalDelayMinutes === null) {
    // Journey hasn't completed or delay not determined
    return isPastJourney ? 'monitoring' : 'monitoring';
  }

  if (booking.finalDelayMinutes >= 60) {
    // Delayed by 60+ minutes, eligible for compensation
    return 'eligible';
  }

  if (booking.finalDelayMinutes > 0) {
    // Some delay but not eligible
    return 'delayed';
  }

  // On time - still monitoring
  return 'monitoring';
}

export function BookingTable({ bookings, onDelete }: BookingTableProps) {
  const [sortField, setSortField] = useState<SortField>('journeyDate');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const sortedBookings = useMemo(() => {
    return [...bookings].sort((a, b) => {
      let comparison = 0;

      switch (sortField) {
        case 'trainNumber':
          comparison = a.trainNumber.localeCompare(b.trainNumber);
          break;
        case 'route':
          comparison = `${a.origin}-${a.destination}`.localeCompare(`${b.origin}-${b.destination}`);
          break;
        case 'journeyDate':
          comparison = new Date(a.journeyDate).getTime() - new Date(b.journeyDate).getTime();
          break;
        case 'status':
          comparison = getBookingStatus(a).localeCompare(getBookingStatus(b));
          break;
      }

      return sortDirection === 'asc' ? comparison : -comparison;
    });
  }, [bookings, sortField, sortDirection]);

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
              onClick={() => handleSort('trainNumber')}
              className="h-8 px-2 -ml-2 hover:bg-transparent"
            >
              Train
              <SortIcon field="trainNumber" />
            </Button>
          </TableHead>
          <TableHead>
            <Button
              variant="ghost"
              onClick={() => handleSort('route')}
              className="h-8 px-2 -ml-2 hover:bg-transparent"
            >
              Route
              <SortIcon field="route" />
            </Button>
          </TableHead>
          <TableHead>
            <Button
              variant="ghost"
              onClick={() => handleSort('journeyDate')}
              className="h-8 px-2 -ml-2 hover:bg-transparent"
            >
              Date
              <SortIcon field="journeyDate" />
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
        {sortedBookings.map((booking) => {
          const status = getBookingStatus(booking);
          return (
            <TableRow key={booking.id} className="cursor-pointer">
              <TableCell className="font-mono font-medium">
                {booking.trainNumber}
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-2">
                  <span className="truncate max-w-[100px]">{getStationName(booking.origin)}</span>
                  <ArrowRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                  <span className="truncate max-w-[100px]">{getStationName(booking.destination)}</span>
                </div>
              </TableCell>
              <TableCell>
                {format(new Date(booking.journeyDate), 'dd MMM yyyy')}
              </TableCell>
              <TableCell>
                <StatusBadge status={status} />
              </TableCell>
              <TableCell className="text-right">
                <div className="flex items-center justify-end gap-2">
                  <Link href={`/bookings/${booking.id}`}>
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                      <Eye className="h-4 w-4" />
                      <span className="sr-only">View</span>
                    </Button>
                  </Link>
                  {onDelete && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                      onClick={(e) => {
                        e.preventDefault();
                        onDelete(booking.id);
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                      <span className="sr-only">Delete</span>
                    </Button>
                  )}
                </div>
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}
