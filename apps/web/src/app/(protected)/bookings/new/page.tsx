'use client';

import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { AddBookingForm } from '@/components/booking/AddBookingForm';

export default function NewBookingPage() {
  return (
    <div className="container py-6 max-w-2xl">
      <div className="mb-6">
        <Link href="/bookings">
          <Button variant="ghost" size="sm" className="mb-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Bookings
          </Button>
        </Link>
        <h1 className="text-2xl font-bold">Add New Booking</h1>
        <p className="text-muted-foreground">
          Track a new Eurostar journey for delay compensation
        </p>
      </div>

      <AddBookingForm />
    </div>
  );
}
