'use client';

import Link from 'next/link';
import { format } from 'date-fns';
import { ArrowRight, Clock } from 'lucide-react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { StatusBadge } from '@/components/common/StatusBadge';
import { getStationName, type BookingResponse } from '@/lib/api';

interface BookingCardProps {
  booking: BookingResponse;
}

export function BookingCard({ booking }: BookingCardProps) {
  const delayStatus = booking.finalDelayMinutes
    ? booking.finalDelayMinutes >= 60
      ? 'delayed'
      : 'on_time'
    : 'unknown';

  return (
    <Link href={`/bookings/${booking.id}`}>
      <Card className="hover:bg-muted/50 transition-colors cursor-pointer">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="font-mono font-semibold">{booking.pnr}</span>
              <StatusBadge status={delayStatus} />
            </div>
            <span className="text-sm text-muted-foreground">
              {format(new Date(booking.journeyDate), 'dd MMM yyyy')}
            </span>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 text-sm mb-2">
            <span>{getStationName(booking.origin)}</span>
            <ArrowRight className="h-4 w-4 text-muted-foreground" />
            <span>{getStationName(booking.destination)}</span>
          </div>
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <span>Train {booking.trainNumber}</span>
            {booking.finalDelayMinutes !== null && (
              <div className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                <span>
                  {booking.finalDelayMinutes > 0
                    ? `${booking.finalDelayMinutes} min delay`
                    : 'On time'}
                </span>
              </div>
            )}
          </div>
          {booking.passengerName && (
            <div className="mt-2 text-sm text-muted-foreground">
              {booking.passengerName}
            </div>
          )}
        </CardContent>
      </Card>
    </Link>
  );
}
