'use client';

import * as React from 'react';
import { format } from 'date-fns';
import { CalendarIcon, Loader2, Plus } from 'lucide-react';

import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { FormField, useFormField } from '@/components/ui/form-field';
import { StationSelect } from '@/components/ui/station-select';
import { showSuccess, showError } from '@/lib/notifications';
import { useCreateBooking } from '@/lib/queries';

// Validation functions
const validatePnr = (value: string) => {
  if (!value) return 'PNR is required';
  if (value.length !== 6) return 'PNR must be exactly 6 characters';
  if (!/^[A-Z0-9]+$/.test(value)) return 'PNR must contain only uppercase letters and numbers';
  return undefined;
};

const validateTcn = (value: string) => {
  if (!value) return 'TCN is required';
  if (!/^(IV|15)\d{9}$/.test(value)) return 'TCN must start with IV or 15 followed by 9 digits';
  return undefined;
};

const validateTrainNumber = (value: string) => {
  if (!value) return 'Train number is required';
  if (value.length !== 4) return 'Train number must be 4 digits';
  if (!/^\d{4}$/.test(value)) return 'Train number must contain only digits';
  return undefined;
};

interface AddBookingDialogProps {
  trigger?: React.ReactNode;
}

export function AddBookingDialog({ trigger }: AddBookingDialogProps) {
  const [open, setOpen] = React.useState(false);
  const [calendarOpen, setCalendarOpen] = React.useState(false);
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  // Form field states using the hook
  const pnrField = useFormField('', validatePnr);
  const tcnField = useFormField('', validateTcn);
  const trainNumberField = useFormField('', validateTrainNumber);

  // Station and date states
  const [origin, setOrigin] = React.useState('');
  const [originTouched, setOriginTouched] = React.useState(false);
  const [destination, setDestination] = React.useState('');
  const [destinationTouched, setDestinationTouched] = React.useState(false);
  const [journeyDate, setJourneyDate] = React.useState<Date | undefined>();
  const [dateTouched, setDateTouched] = React.useState(false);

  const createBooking = useCreateBooking();

  // Validation helpers for non-FormField inputs
  const originError = originTouched && !origin ? 'Departure station is required' : undefined;
  const destinationError = destinationTouched && !destination ? 'Arrival station is required' : undefined;
  const dateError = dateTouched && !journeyDate ? 'Journey date is required' : undefined;

  // Check if form is valid
  const isFormValid = React.useMemo(() => {
    const pnrValid = !validatePnr(pnrField.value);
    const tcnValid = !validateTcn(tcnField.value);
    const trainValid = !validateTrainNumber(trainNumberField.value);
    const originValid = !!origin;
    const destValid = !!destination;
    const dateValid = !!journeyDate;
    return pnrValid && tcnValid && trainValid && originValid && destValid && dateValid;
  }, [pnrField.value, tcnField.value, trainNumberField.value, origin, destination, journeyDate]);

  // Format handlers for controlled inputs
  const handlePnrChange = (value: string) => {
    const formatted = value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6);
    pnrField.handleChange(formatted);
  };

  const handleTcnChange = (value: string) => {
    const formatted = value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 11);
    tcnField.handleChange(formatted);
  };

  const handleTrainNumberChange = (value: string) => {
    const formatted = value.replace(/\D/g, '').slice(0, 4);
    trainNumberField.handleChange(formatted);
  };

  const resetForm = () => {
    pnrField.reset();
    tcnField.reset();
    trainNumberField.reset();
    setOrigin('');
    setOriginTouched(false);
    setDestination('');
    setDestinationTouched(false);
    setJourneyDate(undefined);
    setDateTouched(false);
  };

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();

    // Validate all fields
    const pnrValid = pnrField.validateField();
    const tcnValid = tcnField.validateField();
    const trainValid = trainNumberField.validateField();
    setOriginTouched(true);
    setDestinationTouched(true);
    setDateTouched(true);

    if (!pnrValid || !tcnValid || !trainValid || !origin || !destination || !journeyDate) {
      return;
    }

    setIsSubmitting(true);

    try {
      const booking = await createBooking.mutateAsync({
        pnr: pnrField.value,
        tcn: tcnField.value,
        trainNumber: trainNumberField.value,
        journeyDate: format(journeyDate, 'yyyy-MM-dd'),
        passengerName: '',
        origin,
        destination,
      });

      showSuccess('Booking added', `Booking ${booking.pnr} has been added successfully`);
      resetForm();
      setOpen(false);
    } catch (error) {
      showError('Failed to add booking', error instanceof Error ? error.message : 'An unexpected error occurred');
    } finally {
      setIsSubmitting(false);
    }
  }

  // Reset form when dialog closes
  React.useEffect(() => {
    if (!open) {
      resetForm();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Add Booking
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Add Booking</DialogTitle>
          <DialogDescription>
            Enter your Eurostar booking details to track delay compensation eligibility.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={(e) => void onSubmit(e)} className="space-y-4">
          {/* PNR Field */}
          <FormField
            label="PNR (Booking Reference)"
            required
            placeholder="ABC123"
            className="uppercase"
            helperText="6 characters, e.g., ABC123"
            showSuccessState
            {...pnrField.fieldProps}
            onChange={handlePnrChange}
          />

          {/* TCN Field */}
          <FormField
            label="TCN (Ticket Number)"
            required
            placeholder="IV123456789 or 15123456789"
            className="uppercase"
            helperText="Starts with IV or 15 followed by 9 digits"
            showSuccessState
            {...tcnField.fieldProps}
            onChange={handleTcnChange}
          />

          {/* Train Number Field */}
          <FormField
            label="Train Number"
            required
            placeholder="9024"
            inputMode="numeric"
            helperText="4-digit train number, e.g., 9024"
            showSuccessState
            {...trainNumberField.fieldProps}
            onChange={handleTrainNumberChange}
          />

          {/* Journey Date Field */}
          <div className="space-y-2">
            <Label>
              Journey Date <span className="text-destructive">*</span>
            </Label>
            <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    'w-full justify-start text-left font-normal',
                    !journeyDate && 'text-muted-foreground',
                    dateTouched && !journeyDate && 'border-destructive'
                  )}
                  onBlur={() => setDateTouched(true)}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {journeyDate ? format(journeyDate, 'PPP') : 'Select date'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={journeyDate}
                  onSelect={(date) => {
                    setJourneyDate(date);
                    setDateTouched(true);
                    setCalendarOpen(false);
                  }}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
            <div
              className={cn(
                'overflow-hidden transition-all duration-200 ease-in-out',
                dateError ? 'max-h-10 opacity-100' : 'max-h-0 opacity-0'
              )}
            >
              <p className="text-xs text-destructive">{dateError}</p>
            </div>
          </div>

          {/* Station Fields - Two columns */}
          <div className="grid grid-cols-2 gap-4">
            {/* Departure Station */}
            <div className="space-y-2">
              <Label>
                Departure <span className="text-destructive">*</span>
              </Label>
              <StationSelect
                value={origin}
                onValueChange={(value) => {
                  setOrigin(value);
                  setOriginTouched(true);
                }}
                placeholder="Select station"
                error={!!originError}
                onBlur={() => setOriginTouched(true)}
              />
              <div
                className={cn(
                  'overflow-hidden transition-all duration-200 ease-in-out',
                  originError ? 'max-h-10 opacity-100' : 'max-h-0 opacity-0'
                )}
              >
                <p className="text-xs text-destructive">{originError}</p>
              </div>
            </div>

            {/* Arrival Station */}
            <div className="space-y-2">
              <Label>
                Arrival <span className="text-destructive">*</span>
              </Label>
              <StationSelect
                value={destination}
                onValueChange={(value) => {
                  setDestination(value);
                  setDestinationTouched(true);
                }}
                placeholder="Select station"
                error={!!destinationError}
                onBlur={() => setDestinationTouched(true)}
              />
              <div
                className={cn(
                  'overflow-hidden transition-all duration-200 ease-in-out',
                  destinationError ? 'max-h-10 opacity-100' : 'max-h-0 opacity-0'
                )}
              >
                <p className="text-xs text-destructive">{destinationError}</p>
              </div>
            </div>
          </div>

          <DialogFooter className="pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting || !isFormValid}>
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Adding...
                </>
              ) : (
                'Add Booking'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
