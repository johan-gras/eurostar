'use client';

import { format } from 'date-fns';
import { ArrowRight, Clock, Train, User, Armchair } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { StatusBadge } from '@/components/common/StatusBadge';
import { CompensationBadge } from '@/components/common/CompensationBadge';
import { CopyButton } from '@/components/common/CopyButton';
import { Button } from '@/components/ui/button';
import { getStationName, type BookingDetailResponse } from '@/lib/api';
import Link from 'next/link';

interface BookingDetailProps {
  booking: BookingDetailResponse;
}

export function BookingDetail({ booking }: BookingDetailProps) {
  const delayStatus = booking.finalDelayMinutes
    ? booking.finalDelayMinutes >= 60
      ? 'delayed'
      : 'on_time'
    : 'unknown';

  return (
    <div className="space-y-6">
      {/* Header Card */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="flex items-center gap-3">
                <span className="font-mono text-2xl">{booking.pnr}</span>
                <StatusBadge status={delayStatus} />
              </CardTitle>
              <CardDescription className="mt-1">
                {format(new Date(booking.journeyDate), 'EEEE, dd MMMM yyyy')}
              </CardDescription>
            </div>
            <CopyButton value={booking.pnr} label="PNR" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4 text-lg mb-4">
            <span className="font-medium">{getStationName(booking.origin)}</span>
            <ArrowRight className="h-5 w-5 text-muted-foreground" />
            <span className="font-medium">{getStationName(booking.destination)}</span>
          </div>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <div className="flex items-center gap-2">
              <Train className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">Train</p>
                <p className="font-medium">{booking.trainNumber}</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <User className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">Passenger</p>
                <p className="font-medium">{booking.passengerName}</p>
              </div>
            </div>

            {(booking.coach || booking.seat) && (
              <div className="flex items-center gap-2">
                <Armchair className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">Seat</p>
                  <p className="font-medium">
                    {booking.coach && `Coach ${booking.coach}`}
                    {booking.coach && booking.seat && ', '}
                    {booking.seat && `Seat ${booking.seat}`}
                  </p>
                </div>
              </div>
            )}

            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">Delay</p>
                <p className="font-medium">
                  {booking.finalDelayMinutes !== null
                    ? booking.finalDelayMinutes > 0
                      ? `${booking.finalDelayMinutes} minutes`
                      : 'On time'
                    : 'Pending'}
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* TCN Card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Ticket Control Number</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <span className="font-mono text-lg">{booking.tcn}</span>
            <CopyButton value={booking.tcn} label="TCN" />
          </div>
        </CardContent>
      </Card>

      {/* Eligibility Card */}
      {booking.eligibility && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Compensation Eligibility</CardTitle>
          </CardHeader>
          <CardContent>
            {booking.eligibility.eligible ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">
                    You are eligible for compensation
                  </span>
                  <StatusBadge status="eligible" />
                </div>

                {booking.eligibility.compensation && (
                  <CompensationBadge
                    cashAmount={booking.eligibility.compensation.cashAmount}
                    voucherAmount={booking.eligibility.compensation.voucherAmount}
                    currency={booking.eligibility.compensation.currency}
                  />
                )}

                {booking.eligibility.deadline && (
                  <p className="text-sm text-muted-foreground">
                    Claim by: {format(new Date(booking.eligibility.deadline), 'dd MMM yyyy')}
                    {booking.eligibility.daysUntilDeadline !== null && (
                      <span> ({booking.eligibility.daysUntilDeadline} days remaining)</span>
                    )}
                  </p>
                )}

                {booking.claim ? (
                  <Link href={`/claims/${booking.claim.id}`}>
                    <Button className="w-full">View Claim</Button>
                  </Link>
                ) : (
                  <Button className="w-full" disabled>
                    Claim will be generated when delay is confirmed
                  </Button>
                )}
              </div>
            ) : (
              <div>
                <p className="text-muted-foreground">
                  {booking.eligibility.reason === 'insufficient_delay'
                    ? 'Delay must be at least 60 minutes to qualify for compensation.'
                    : booking.eligibility.reason === 'claim_window_not_open'
                    ? 'Claim window opens 24 hours after journey completion.'
                    : booking.eligibility.reason === 'deadline_expired'
                    ? 'The claim deadline has passed.'
                    : 'Not eligible for compensation.'}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
