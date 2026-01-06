'use client';

import * as React from 'react';
import { format } from 'date-fns';
import {
  CalendarIcon,
  Loader2,
  Mail,
  AlertCircle,
  CheckCircle2,
  HelpCircle,
} from 'lucide-react';

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
import { Textarea } from '@/components/ui/textarea';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { FormField, useFormField } from '@/components/ui/form-field';
import { StationSelect } from '@/components/ui/station-select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { showSuccess, showError } from '@/lib/notifications';
import { useCreateBooking } from '@/lib/queries';
import {
  parseEmailPreview,
  canImport,
  getConfidenceColor,
  type ParsedBookingPreview,
  type ParsedField,
} from '@/lib/email-parser';

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

interface ImportBookingDialogProps {
  trigger?: React.ReactNode;
}

function ConfidenceBadge({ confidence }: { confidence: ParsedField<unknown>['confidence'] }) {
  const labels = {
    high: 'High',
    medium: 'Medium',
    low: 'Low',
    none: 'Not found',
  };

  const icons = {
    high: <CheckCircle2 className="h-3 w-3" />,
    medium: <HelpCircle className="h-3 w-3" />,
    low: <AlertCircle className="h-3 w-3" />,
    none: <AlertCircle className="h-3 w-3" />,
  };

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium',
        getConfidenceColor(confidence)
      )}
    >
      {icons[confidence]}
      {labels[confidence]}
    </span>
  );
}

interface ParsedFieldDisplayProps {
  label: string;
  field: ParsedField<string>;
  required?: boolean;
}

function ParsedFieldDisplay({ label, field, required }: ParsedFieldDisplayProps) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-border last:border-0">
      <div className="space-y-0.5">
        <span className="text-sm font-medium">
          {label}
          {required && <span className="text-destructive ml-0.5">*</span>}
        </span>
        <p className="text-sm text-muted-foreground">
          {field.value || <span className="italic">Not detected</span>}
        </p>
      </div>
      <ConfidenceBadge confidence={field.confidence} />
    </div>
  );
}

export function ImportBookingDialog({ trigger }: ImportBookingDialogProps) {
  const [open, setOpen] = React.useState(false);
  const [activeTab, setActiveTab] = React.useState<'email' | 'manual'>('email');
  const [emailBody, setEmailBody] = React.useState('');
  const [parsedPreview, setParsedPreview] = React.useState<ParsedBookingPreview | null>(null);
  const [showPreview, setShowPreview] = React.useState(false);

  // Manual form state
  const [calendarOpen, setCalendarOpen] = React.useState(false);
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const pnrField = useFormField('', validatePnr);
  const tcnField = useFormField('', validateTcn);
  const trainNumberField = useFormField('', validateTrainNumber);
  const passengerNameField = useFormField('', (v) => !v ? 'Passenger name is required' : undefined);

  const [origin, setOrigin] = React.useState('');
  const [originTouched, setOriginTouched] = React.useState(false);
  const [destination, setDestination] = React.useState('');
  const [destinationTouched, setDestinationTouched] = React.useState(false);
  const [journeyDate, setJourneyDate] = React.useState<Date | undefined>();
  const [dateTouched, setDateTouched] = React.useState(false);

  const createBooking = useCreateBooking();

  // Validation helpers
  const originError = originTouched && !origin ? 'Departure station is required' : undefined;
  const destinationError = destinationTouched && !destination ? 'Arrival station is required' : undefined;
  const dateError = dateTouched && !journeyDate ? 'Journey date is required' : undefined;

  // Check if manual form is valid
  const isManualFormValid = React.useMemo(() => {
    return (
      !validatePnr(pnrField.value) &&
      !validateTcn(tcnField.value) &&
      !validateTrainNumber(trainNumberField.value) &&
      passengerNameField.value &&
      !!origin &&
      !!destination &&
      !!journeyDate
    );
  }, [pnrField.value, tcnField.value, trainNumberField.value, passengerNameField.value, origin, destination, journeyDate]);

  // Format handlers
  const handlePnrChange = (value: string) => {
    pnrField.handleChange(value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6));
  };

  const handleTcnChange = (value: string) => {
    tcnField.handleChange(value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 11));
  };

  const handleTrainNumberChange = (value: string) => {
    trainNumberField.handleChange(value.replace(/\D/g, '').slice(0, 4));
  };

  // Parse email when content changes
  const handleParseEmail = () => {
    if (!emailBody.trim()) {
      showError('Email required', 'Please paste your confirmation email');
      return;
    }

    const preview = parseEmailPreview(emailBody);
    setParsedPreview(preview);
    setShowPreview(true);
  };

  // Populate manual form from parsed preview
  const populateFromPreview = () => {
    if (!parsedPreview) return;

    if (parsedPreview.pnr.value) pnrField.handleChange(parsedPreview.pnr.value);
    if (parsedPreview.tcn.value) tcnField.handleChange(parsedPreview.tcn.value);
    if (parsedPreview.trainNumber.value) trainNumberField.handleChange(parsedPreview.trainNumber.value);
    if (parsedPreview.passengerName.value) passengerNameField.handleChange(parsedPreview.passengerName.value);
    if (parsedPreview.origin.value) setOrigin(parsedPreview.origin.value);
    if (parsedPreview.destination.value) setDestination(parsedPreview.destination.value);
    if (parsedPreview.journeyDate.value) {
      setJourneyDate(new Date(parsedPreview.journeyDate.value + 'T00:00:00'));
    }

    setActiveTab('manual');
    setShowPreview(false);
  };

  const resetForm = () => {
    setEmailBody('');
    setParsedPreview(null);
    setShowPreview(false);
    pnrField.reset();
    tcnField.reset();
    trainNumberField.reset();
    passengerNameField.reset();
    setOrigin('');
    setOriginTouched(false);
    setDestination('');
    setDestinationTouched(false);
    setJourneyDate(undefined);
    setDateTouched(false);
    setActiveTab('email');
  };

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();

    // Validate all manual fields
    const pnrValid = pnrField.validateField();
    const tcnValid = tcnField.validateField();
    const trainValid = trainNumberField.validateField();
    const passengerValid = passengerNameField.validateField();
    setOriginTouched(true);
    setDestinationTouched(true);
    setDateTouched(true);

    if (!pnrValid || !tcnValid || !trainValid || !passengerValid || !origin || !destination || !journeyDate) {
      return;
    }

    setIsSubmitting(true);

    try {
      const booking = await createBooking.mutateAsync({
        pnr: pnrField.value,
        tcn: tcnField.value,
        trainNumber: trainNumberField.value,
        journeyDate: format(journeyDate, 'yyyy-MM-dd'),
        passengerName: passengerNameField.value,
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
            <Mail className="mr-2 h-4 w-4" />
            Add Booking
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[550px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add Booking</DialogTitle>
          <DialogDescription>
            Import from your confirmation email or enter details manually.
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'email' | 'manual')}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="email">Import from Email</TabsTrigger>
            <TabsTrigger value="manual">Manual Entry</TabsTrigger>
          </TabsList>

          <TabsContent value="email" className="mt-4 space-y-4">
            {!showPreview ? (
              <>
                <div className="space-y-2">
                  <Label htmlFor="emailBody">Paste Confirmation Email</Label>
                  <Textarea
                    id="emailBody"
                    placeholder="Paste your Eurostar confirmation email here..."
                    className="min-h-[200px] font-mono text-sm"
                    value={emailBody}
                    onChange={(e) => setEmailBody(e.target.value)}
                  />
                  <p className="text-sm text-muted-foreground">
                    We&apos;ll extract booking details automatically. You can review and edit before saving.
                  </p>
                </div>
                <Button onClick={handleParseEmail} disabled={!emailBody.trim()} className="w-full">
                  Parse Email
                </Button>
              </>
            ) : parsedPreview && (
              <div className="space-y-4">
                <div className="rounded-lg border bg-muted/50 p-4">
                  <h4 className="font-medium mb-3">Extracted Details</h4>
                  <div className="space-y-1">
                    <ParsedFieldDisplay label="PNR" field={parsedPreview.pnr} required />
                    <ParsedFieldDisplay label="TCN" field={parsedPreview.tcn} required />
                    <ParsedFieldDisplay label="Train Number" field={parsedPreview.trainNumber} required />
                    <ParsedFieldDisplay label="Journey Date" field={parsedPreview.journeyDate} required />
                    <ParsedFieldDisplay label="Passenger Name" field={parsedPreview.passengerName} />
                    <ParsedFieldDisplay label="Origin" field={parsedPreview.origin} required />
                    <ParsedFieldDisplay label="Destination" field={parsedPreview.destination} required />
                    <ParsedFieldDisplay label="Coach" field={parsedPreview.coach} />
                    <ParsedFieldDisplay label="Seat" field={parsedPreview.seat} />
                  </div>
                </div>

                {!canImport(parsedPreview) && (
                  <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-3">
                    <p className="text-sm text-destructive flex items-center gap-2">
                      <AlertCircle className="h-4 w-4" />
                      Some required fields could not be detected. Please fill them in manually.
                    </p>
                  </div>
                )}

                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => setShowPreview(false)} className="flex-1">
                    Back
                  </Button>
                  <Button onClick={populateFromPreview} className="flex-1">
                    {canImport(parsedPreview) ? 'Review & Confirm' : 'Fill Missing Fields'}
                  </Button>
                </div>
              </div>
            )}
          </TabsContent>

          <TabsContent value="manual" className="mt-4">
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

              {/* Passenger Name Field */}
              <FormField
                label="Passenger Name"
                required
                placeholder="John Smith"
                showSuccessState
                {...passengerNameField.fieldProps}
              />

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
                <Button type="submit" disabled={isSubmitting || !isManualFormValid}>
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
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
