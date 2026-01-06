'use client';

import { format } from 'date-fns';
import {
  ExternalLink,
  Copy,
  Check,
  Clock,
  ArrowRight,
  Train,
  AlertTriangle,
  Banknote,
  Gift,
  Calendar,
  FileSearch,
  CheckCircle2,
  Circle,
} from 'lucide-react';
import { useState } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { CopyButton } from '@/components/common/CopyButton';
import { useMarkClaimSubmitted } from '@/lib/queries';
import { showSuccess, showError } from '@/lib/notifications';
import { getStationName, type ClaimDetailResponse } from '@/lib/api';
import Link from 'next/link';
import { cn } from '@/lib/utils';

interface ClaimDetailProps {
  claim: ClaimDetailResponse;
}

const EUROSTAR_CLAIM_URL =
  'https://www.eurostar.com/uk-en/travel-info/contact-us/request-delay-repay';

type CompensationType = 'cash' | 'voucher';

export function ClaimDetail({ claim }: ClaimDetailProps) {
  const markSubmitted = useMarkClaimSubmitted();
  const [allCopied, setAllCopied] = useState(false);
  const [compensationType, setCompensationType] =
    useState<CompensationType>('cash');

  const formFields = [
    { label: 'PNR (Booking Reference)', value: claim.formData.pnr },
    { label: 'TCN (Ticket Control Number)', value: claim.formData.tcn },
    { label: 'First Name', value: claim.formData.firstName },
    { label: 'Last Name', value: claim.formData.lastName },
    { label: 'Email', value: claim.formData.email },
    { label: 'Train Number', value: claim.formData.trainNumber },
    { label: 'Journey Date', value: claim.formData.journeyDate },
    { label: 'Origin', value: getStationName(claim.formData.origin) },
    { label: 'Destination', value: getStationName(claim.formData.destination) },
  ];

  const handleCopyAll = async () => {
    const text = formFields
      .map(({ label, value }) => `${label}: ${value}`)
      .join('\n');

    try {
      await navigator.clipboard.writeText(text);
      setAllCopied(true);
      showSuccess('All fields copied!', 'Form data copied to clipboard');
      setTimeout(() => setAllCopied(false), 2000);
    } catch {
      showError('Failed to copy', 'Please try again');
    }
  };

  const handleMarkSubmitted = async () => {
    try {
      await markSubmitted.mutateAsync(claim.id);
      showSuccess('Marked as submitted', 'Your claim has been marked as submitted');
    } catch {
      showError('Failed to update', 'Please try again');
    }
  };

  // Calculate compensation percentage based on delay
  const getCompensationPercentage = (delayMinutes: number): number => {
    if (delayMinutes >= 180) return 50; // 3+ hours: 50% voucher, 25% cash
    if (delayMinutes >= 120) return 50; // 2-3 hours: 50% voucher, 25% cash
    if (delayMinutes >= 60) return 50; // 1-2 hours: 50% voucher, 25% cash
    return 0;
  };

  const compensationPercentage = getCompensationPercentage(claim.delayMinutes);
  const selectedAmount =
    compensationType === 'cash'
      ? claim.eligibleCashAmount
      : claim.eligibleVoucherAmount;

  // Timeline events
  const timelineEvents = [
    {
      label: 'Booking added',
      date: claim.booking.createdAt,
      completed: true,
      icon: Calendar,
    },
    {
      label: 'Delay detected',
      date: claim.createdAt,
      completed: true,
      icon: FileSearch,
    },
    {
      label: 'Claim eligible',
      date: claim.createdAt,
      completed: claim.status !== 'pending',
      icon: CheckCircle2,
    },
    {
      label: 'Claim submitted',
      date: claim.submittedAt,
      completed: !!claim.submittedAt,
      icon: claim.submittedAt ? CheckCircle2 : Circle,
    },
  ];

  return (
    <div className="space-y-6">
      {/* 1. Header Section */}
      <Card>
        <CardHeader className="pb-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <Badge
                  variant={
                    claim.status === 'eligible'
                      ? 'success'
                      : claim.status === 'submitted'
                        ? 'info'
                        : claim.status === 'approved'
                          ? 'success'
                          : claim.status === 'rejected'
                            ? 'destructive'
                            : 'secondary'
                  }
                  className="px-3 py-1 text-sm"
                >
                  {claim.status.charAt(0).toUpperCase() + claim.status.slice(1)}
                </Badge>
              </div>
              <CardTitle className="text-xl">
                Booking{' '}
                <span className="font-mono">{claim.booking.pnr}</span>
              </CardTitle>
              <CardDescription>
                Created {format(new Date(claim.createdAt), 'dd MMMM yyyy')} at{' '}
                {format(new Date(claim.createdAt), 'HH:mm')}
              </CardDescription>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* 2. Journey Details Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Train className="h-4 w-4" />
            Journey Details
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Route */}
          <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:gap-3 text-lg">
            <span className="font-medium">
              {getStationName(claim.booking.origin)}
            </span>
            <ArrowRight className="hidden sm:block h-5 w-5 text-muted-foreground" />
            <span className="sm:hidden text-sm text-muted-foreground">to</span>
            <span className="font-medium">
              {getStationName(claim.booking.destination)}
            </span>
          </div>

          {/* Train & Date */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex items-center gap-2">
              <Train className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Train</span>
              <span className="font-medium">{claim.booking.trainNumber}</span>
            </div>
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Date</span>
              <span className="font-medium">
                {format(new Date(claim.booking.journeyDate), 'dd MMMM yyyy')}
              </span>
            </div>
          </div>

          {/* Delay Highlight */}
          <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4">
            <div className="flex items-center gap-3">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              <div>
                <p className="font-semibold text-destructive">
                  {claim.delayMinutes} minute delay
                </p>
                <p className="text-sm text-muted-foreground">
                  {claim.delayMinutes >= 180
                    ? 'Severe delay (3+ hours)'
                    : claim.delayMinutes >= 120
                      ? 'Major delay (2-3 hours)'
                      : 'Significant delay (1-2 hours)'}
                </p>
              </div>
            </div>
          </div>

          {/* Link to booking */}
          <Link
            href={`/bookings/${claim.booking.id}`}
            className="text-sm text-primary hover:underline"
          >
            View full booking details
          </Link>
        </CardContent>
      </Card>

      {/* 3. Compensation Breakdown Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Banknote className="h-4 w-4" />
            Compensation Breakdown
          </CardTitle>
          <CardDescription>
            Choose between cash refund or Eurostar voucher
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Compensation calculation */}
          <div className="space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Delay duration</span>
              <span className="font-medium">{claim.delayMinutes} minutes</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">
                Compensation percentage
              </span>
              <span className="font-medium">
                {compensationType === 'voucher'
                  ? `${compensationPercentage}%`
                  : `${compensationPercentage / 2}%`}{' '}
                of ticket price
              </span>
            </div>
          </div>

          {/* Cash vs Voucher selector */}
          <div className="space-y-3">
            <label className="text-sm font-medium">Compensation type</label>
            <Select
              value={compensationType}
              onValueChange={(value: CompensationType) =>
                setCompensationType(value)
              }
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="cash">
                  <div className="flex items-center gap-2">
                    <Banknote className="h-4 w-4 text-green-600" />
                    <span>Cash refund</span>
                  </div>
                </SelectItem>
                <SelectItem value="voucher">
                  <div className="flex items-center gap-2">
                    <Gift className="h-4 w-4 text-blue-600" />
                    <span>Eurostar voucher (higher value)</span>
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Compensation amounts */}
          <div className="grid gap-3 sm:grid-cols-2">
            <div
              className={cn(
                'rounded-lg border p-4 transition-colors',
                compensationType === 'cash'
                  ? 'border-green-500 bg-green-50 dark:bg-green-950'
                  : 'border-muted'
              )}
            >
              <div className="flex items-center gap-2 mb-1">
                <Banknote className="h-4 w-4 text-green-600" />
                <span className="text-sm font-medium">Cash</span>
              </div>
              <p className="text-2xl font-bold text-green-700 dark:text-green-400">
                €{claim.eligibleCashAmount.toFixed(2)}
              </p>
            </div>
            <div
              className={cn(
                'rounded-lg border p-4 transition-colors',
                compensationType === 'voucher'
                  ? 'border-blue-500 bg-blue-50 dark:bg-blue-950'
                  : 'border-muted'
              )}
            >
              <div className="flex items-center gap-2 mb-1">
                <Gift className="h-4 w-4 text-blue-600" />
                <span className="text-sm font-medium">Voucher</span>
              </div>
              <p className="text-2xl font-bold text-blue-700 dark:text-blue-400">
                €{claim.eligibleVoucherAmount.toFixed(2)}
              </p>
            </div>
          </div>

          {/* Selected amount highlight */}
          <div className="rounded-lg bg-muted p-4 text-center">
            <p className="text-sm text-muted-foreground mb-1">
              Your selected compensation
            </p>
            <p className="text-3xl font-bold">€{selectedAmount.toFixed(2)}</p>
            <p className="text-sm text-muted-foreground mt-1">
              {compensationType === 'cash'
                ? 'Bank transfer or original payment method'
                : 'Valid for 12 months on Eurostar bookings'}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* 4. Pre-filled Form Preview Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base">Claim Form Data</CardTitle>
              <CardDescription>
                Copy these values to fill in the Eurostar claim form
              </CardDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => void handleCopyAll()}
            >
              {allCopied ? (
                <>
                  <Check className="h-4 w-4 mr-2" />
                  Copied!
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4 mr-2" />
                  Copy All
                </>
              )}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {formFields.map(({ label, value }) => (
              <div
                key={label}
                className="flex items-center justify-between py-2 border-b last:border-0"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-muted-foreground">{label}</p>
                  <p className="font-medium truncate">{value}</p>
                </div>
                <CopyButton value={value} label={label} />
              </div>
            ))}
          </div>

          {/* Actions */}
          <div className="mt-6 space-y-3">
            <a
              href={EUROSTAR_CLAIM_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="block"
            >
              <Button className="w-full" size="lg">
                <ExternalLink className="h-4 w-4 mr-2" />
                Open Eurostar Claim Form
              </Button>
            </a>

            {claim.status === 'eligible' && (
              <Button
                variant="outline"
                className="w-full"
                onClick={() => void handleMarkSubmitted()}
                disabled={markSubmitted.isPending}
              >
                {markSubmitted.isPending ? 'Updating...' : 'Mark as Submitted'}
              </Button>
            )}

            {claim.submittedAt && (
              <p className="text-sm text-center text-muted-foreground">
                Submitted on{' '}
                {format(new Date(claim.submittedAt), 'dd MMM yyyy')} at{' '}
                {format(new Date(claim.submittedAt), 'HH:mm')}
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* 5. Timeline/History Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Clock className="h-4 w-4" />
            Claim History
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="relative">
            {/* Timeline line */}
            <div className="absolute left-3 top-2 bottom-2 w-px bg-border" />

            <div className="space-y-6">
              {timelineEvents.map((event, index) => {
                const Icon = event.icon;
                return (
                  <div key={index} className="flex items-start gap-4">
                    <div
                      className={cn(
                        'relative z-10 flex h-6 w-6 items-center justify-center rounded-full',
                        event.completed
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted text-muted-foreground'
                      )}
                    >
                      <Icon className="h-3 w-3" />
                    </div>
                    <div className="flex-1 pt-0.5">
                      <p
                        className={cn(
                          'font-medium',
                          !event.completed && 'text-muted-foreground'
                        )}
                      >
                        {event.label}
                      </p>
                      {event.date && (
                        <p className="text-sm text-muted-foreground">
                          {format(
                            new Date(event.date),
                            'dd MMM yyyy'
                          )} at{' '}
                          {format(new Date(event.date), 'HH:mm')}
                        </p>
                      )}
                      {!event.date && !event.completed && (
                        <p className="text-sm text-muted-foreground">
                          Pending
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
