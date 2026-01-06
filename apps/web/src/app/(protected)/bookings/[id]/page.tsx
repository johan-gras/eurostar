'use client';

import { use } from 'react';
import Link from 'next/link';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { BookingDetail } from '@/components/booking/BookingDetail';
import { useBooking } from '@/lib/queries';

interface BookingDetailPageProps {
  params: Promise<{ id: string }>;
}

export default function BookingDetailPage({ params }: BookingDetailPageProps) {
  const { id } = use(params);
  const { data: booking, isLoading, error } = useBooking(id);

  return (
    <div className="container py-6 max-w-3xl">
      <Link href="/bookings">
        <Button variant="ghost" size="sm" className="mb-4">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Bookings
        </Button>
      </Link>

      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      )}

      {error && (
        <div className="text-center py-12">
          <p className="text-destructive">Failed to load booking</p>
          <p className="text-sm text-muted-foreground mt-2">
            {error instanceof Error ? error.message : 'Please try again'}
          </p>
        </div>
      )}

      {booking && <BookingDetail booking={booking} />}
    </div>
  );
}
