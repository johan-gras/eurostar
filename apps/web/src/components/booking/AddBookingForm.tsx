'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useCreateBooking } from '@/lib/queries';
import { showSuccess, showError } from '@/lib/notifications';

export function AddBookingForm() {
  const router = useRouter();
  const createBooking = useCreateBooking();
  const [emailBody, setEmailBody] = useState('');
  const [manualForm, setManualForm] = useState({
    pnr: '',
    tcn: '',
    trainNumber: '',
    journeyDate: '',
    passengerName: '',
    origin: '',
    destination: '',
    coach: '',
    seat: '',
  });

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!emailBody.trim()) {
      showError('Email required', 'Please paste your confirmation email');
      return;
    }

    try {
      const booking = await createBooking.mutateAsync({ emailBody });
      showSuccess('Booking added', `Booking ${booking.pnr} has been added successfully`);
      router.push(`/bookings/${booking.id}`);
    } catch (error) {
      showError('Failed to add booking', error instanceof Error ? error.message : 'Please check the email format');
    }
  };

  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const { pnr, tcn, trainNumber, journeyDate, passengerName, origin, destination } = manualForm;

    if (!pnr || !tcn || !trainNumber || !journeyDate || !passengerName || !origin || !destination) {
      showError('Missing fields', 'Please fill in all required fields');
      return;
    }

    try {
      const requestData: {
        pnr: string;
        tcn: string;
        trainNumber: string;
        journeyDate: string;
        passengerName: string;
        origin: string;
        destination: string;
        coach?: string;
        seat?: string;
      } = {
        pnr: manualForm.pnr.toUpperCase(),
        tcn: manualForm.tcn,
        trainNumber: manualForm.trainNumber,
        journeyDate: manualForm.journeyDate,
        passengerName: manualForm.passengerName,
        origin: manualForm.origin.toUpperCase(),
        destination: manualForm.destination.toUpperCase(),
      };

      if (manualForm.coach) {
        requestData.coach = manualForm.coach;
      }
      if (manualForm.seat) {
        requestData.seat = manualForm.seat;
      }

      const booking = await createBooking.mutateAsync(requestData);
      showSuccess('Booking added', `Booking ${booking.pnr} has been added successfully`);
      router.push(`/bookings/${booking.id}`);
    } catch (error) {
      showError('Failed to add booking', error instanceof Error ? error.message : 'Please check the form data');
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Add Booking</CardTitle>
        <CardDescription>
          Add a new booking by pasting your confirmation email or entering details manually.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="email">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="email">Paste Email</TabsTrigger>
            <TabsTrigger value="manual">Manual Entry</TabsTrigger>
          </TabsList>

          <TabsContent value="email" className="mt-4">
            <form onSubmit={(e) => void handleEmailSubmit(e)} className="space-y-4">
              <div>
                <label htmlFor="email" className="text-sm font-medium">
                  Confirmation Email
                </label>
                <Textarea
                  id="email"
                  placeholder="Paste your Eurostar confirmation email here..."
                  className="mt-1.5 min-h-[200px] font-mono text-sm"
                  value={emailBody}
                  onChange={(e) => setEmailBody(e.target.value)}
                />
                <p className="text-sm text-muted-foreground mt-1.5">
                  We&apos;ll extract the booking details automatically.
                </p>
              </div>
              <Button type="submit" disabled={createBooking.isPending} className="w-full sm:w-auto min-h-[44px]">
                {createBooking.isPending ? 'Adding...' : 'Add Booking'}
              </Button>
            </form>
          </TabsContent>

          <TabsContent value="manual" className="mt-4">
            <form onSubmit={(e) => void handleManualSubmit(e)} className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="pnr" className="text-sm font-medium">
                    PNR (Booking Reference) *
                  </label>
                  <Input
                    id="pnr"
                    placeholder="ABC123"
                    className="mt-1.5 uppercase"
                    maxLength={6}
                    value={manualForm.pnr}
                    onChange={(e) => setManualForm({ ...manualForm, pnr: e.target.value })}
                  />
                </div>

                <div>
                  <label htmlFor="tcn" className="text-sm font-medium">
                    TCN (Ticket Control Number) *
                  </label>
                  <Input
                    id="tcn"
                    placeholder="IV123456789"
                    className="mt-1.5"
                    value={manualForm.tcn}
                    onChange={(e) => setManualForm({ ...manualForm, tcn: e.target.value })}
                  />
                </div>

                <div>
                  <label htmlFor="trainNumber" className="text-sm font-medium">
                    Train Number *
                  </label>
                  <Input
                    id="trainNumber"
                    placeholder="9024"
                    className="mt-1.5"
                    maxLength={4}
                    value={manualForm.trainNumber}
                    onChange={(e) => setManualForm({ ...manualForm, trainNumber: e.target.value })}
                  />
                </div>

                <div>
                  <label htmlFor="journeyDate" className="text-sm font-medium">
                    Journey Date *
                  </label>
                  <Input
                    id="journeyDate"
                    type="date"
                    className="mt-1.5"
                    value={manualForm.journeyDate}
                    onChange={(e) => setManualForm({ ...manualForm, journeyDate: e.target.value })}
                  />
                </div>

                <div className="sm:col-span-2">
                  <label htmlFor="passengerName" className="text-sm font-medium">
                    Passenger Name *
                  </label>
                  <Input
                    id="passengerName"
                    placeholder="John Smith"
                    className="mt-1.5"
                    value={manualForm.passengerName}
                    onChange={(e) => setManualForm({ ...manualForm, passengerName: e.target.value })}
                  />
                </div>

                <div>
                  <label htmlFor="origin" className="text-sm font-medium">
                    Origin Station Code *
                  </label>
                  <Input
                    id="origin"
                    placeholder="GBSPX"
                    className="mt-1.5 uppercase"
                    value={manualForm.origin}
                    onChange={(e) => setManualForm({ ...manualForm, origin: e.target.value })}
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    e.g., GBSPX (London), FRPLY (Paris)
                  </p>
                </div>

                <div>
                  <label htmlFor="destination" className="text-sm font-medium">
                    Destination Station Code *
                  </label>
                  <Input
                    id="destination"
                    placeholder="FRPLY"
                    className="mt-1.5 uppercase"
                    value={manualForm.destination}
                    onChange={(e) => setManualForm({ ...manualForm, destination: e.target.value })}
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    e.g., FRPLY (Paris), BEBMI (Brussels)
                  </p>
                </div>

                <div>
                  <label htmlFor="coach" className="text-sm font-medium">
                    Coach (Optional)
                  </label>
                  <Input
                    id="coach"
                    placeholder="5"
                    className="mt-1.5"
                    value={manualForm.coach}
                    onChange={(e) => setManualForm({ ...manualForm, coach: e.target.value })}
                  />
                </div>

                <div>
                  <label htmlFor="seat" className="text-sm font-medium">
                    Seat (Optional)
                  </label>
                  <Input
                    id="seat"
                    placeholder="23"
                    className="mt-1.5"
                    value={manualForm.seat}
                    onChange={(e) => setManualForm({ ...manualForm, seat: e.target.value })}
                  />
                </div>
              </div>

              <Button type="submit" disabled={createBooking.isPending} className="w-full sm:w-auto min-h-[44px]">
                {createBooking.isPending ? 'Adding...' : 'Add Booking'}
              </Button>
            </form>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
