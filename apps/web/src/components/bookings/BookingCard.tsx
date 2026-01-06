'use client';

import Link from 'next/link';
import { format } from 'date-fns';
import { ArrowRight, Clock, Train, Calendar, Eye, Trash2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { StatusBadge, type BookingStatus } from '@/components/common/StatusBadge';
import { getStationName, type BookingResponse } from '@/lib/api';

interface BookingCardProps {
  booking: BookingResponse;
  onDelete?: ((id: string) => void) | undefined;
}

function getBookingStatus(booking: BookingResponse): BookingStatus {
  const journeyDate = new Date(booking.journeyDate);
  const now = new Date();
  const isPastJourney = journeyDate < now;

  if (booking.finalDelayMinutes === null) {
    return isPastJourney ? 'monitoring' : 'monitoring';
  }

  if (booking.finalDelayMinutes >= 60) {
    return 'eligible';
  }

  if (booking.finalDelayMinutes > 0) {
    return 'delayed';
  }

  return 'monitoring';
}

export function BookingCard({ booking, onDelete }: BookingCardProps) {
  const status = getBookingStatus(booking);

  return (
    <Card className="hover:bg-muted/50 transition-colors">
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="font-mono font-semibold text-sm">{booking.pnr}</span>
            <StatusBadge status={status} />
          </div>
          <div className="flex items-center gap-1">
            <Link href={`/bookings/${booking.id}`}>
              <Button variant="ghost" size="sm" className="h-11 w-11 p-0">
                <Eye className="h-5 w-5" />
                <span className="sr-only">View</span>
              </Button>
            </Link>
            {onDelete && (
              <Button
                variant="ghost"
                size="sm"
                className="h-11 w-11 p-0 text-destructive hover:text-destructive"
                onClick={() => onDelete(booking.id)}
              >
                <Trash2 className="h-5 w-5" />
                <span className="sr-only">Delete</span>
              </Button>
            )}
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm">
            <Train className="h-4 w-4 text-muted-foreground flex-shrink-0" />
            <span className="font-medium">Train {booking.trainNumber}</span>
          </div>

          <div className="flex items-center gap-2 text-sm">
            <span className="w-4 flex-shrink-0" />
            <span className="truncate">{getStationName(booking.origin)}</span>
            <ArrowRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
            <span className="truncate">{getStationName(booking.destination)}</span>
          </div>

          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Calendar className="h-4 w-4 flex-shrink-0" />
            <span>{format(new Date(booking.journeyDate), 'EEEE, dd MMM yyyy')}</span>
          </div>

          {booking.finalDelayMinutes !== null && booking.finalDelayMinutes > 0 && (
            <div className="flex items-center gap-2 text-sm text-amber-600 dark:text-amber-400">
              <Clock className="h-4 w-4 flex-shrink-0" />
              <span>{booking.finalDelayMinutes} min delay</span>
            </div>
          )}

          {booking.passengerName && (
            <div className="text-sm text-muted-foreground pt-1 border-t">
              {booking.passengerName}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
