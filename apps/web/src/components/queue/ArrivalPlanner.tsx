'use client';

import * as React from 'react';
import { format, addMinutes, setHours, setMinutes, isBefore, startOfDay } from 'date-fns';
import { CalendarIcon, Clock, Loader2, CalendarPlus, Download } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Slider } from '@/components/ui/slider';
import { cn } from '@/lib/utils';
import type { HourlyPrediction } from './QueueTimeline';
import type { CrowdLevel } from './QueueStatus';

interface ArrivalPlannerProps {
  predictions: HourlyPrediction[];
  timezone: string;
  stationName?: string;
}

interface RecommendedArrival {
  arrivalTime: Date;
  expectedWaitMinutes: number;
  crowdLevel: CrowdLevel;
}

interface AlternativeTime {
  arrivalTime: Date;
  expectedWaitMinutes: number;
  crowdLevel: CrowdLevel;
  label: string;
}

const crowdLevelColors: Record<CrowdLevel, { bg: string; text: string; badge: 'success' | 'warning' | 'destructive' }> = {
  low: { bg: 'bg-green-50', text: 'text-green-700', badge: 'success' },
  moderate: { bg: 'bg-yellow-50', text: 'text-yellow-700', badge: 'warning' },
  high: { bg: 'bg-orange-50', text: 'text-orange-700', badge: 'destructive' },
  very_high: { bg: 'bg-red-50', text: 'text-red-700', badge: 'destructive' },
};

const CHECK_IN_CLOSE_MINUTES = 30; // Check-in closes 30 min before departure

function generateGoogleCalendarUrl(
  title: string,
  startTime: Date,
  endTime: Date,
  description: string,
  location?: string
): string {
  const formatForGoogle = (date: Date) => format(date, "yyyyMMdd'T'HHmmss");
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: title,
    dates: `${formatForGoogle(startTime)}/${formatForGoogle(endTime)}`,
    details: description,
    ...(location && { location }),
  });
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

function generateIcsContent(
  title: string,
  startTime: Date,
  endTime: Date,
  description: string,
  location?: string
): string {
  const formatForIcs = (date: Date) => format(date, "yyyyMMdd'T'HHmmss");
  const uid = `${Date.now()}-arrival-planner@eurostar-tools`;

  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Eurostar Tools//Arrival Planner//EN',
    'BEGIN:VEVENT',
    `UID:${uid}`,
    `DTSTAMP:${formatForIcs(new Date())}`,
    `DTSTART:${formatForIcs(startTime)}`,
    `DTEND:${formatForIcs(endTime)}`,
    `SUMMARY:${title}`,
    `DESCRIPTION:${description.replace(/\n/g, '\\n')}`,
    ...(location ? [`LOCATION:${location}`] : []),
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\r\n');
}

function downloadIcsFile(content: string, filename: string) {
  const blob = new Blob([content], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function ArrivalPlanner({ predictions, timezone, stationName }: ArrivalPlannerProps) {
  const [travelDate, setTravelDate] = React.useState<Date | undefined>(undefined);
  const [departureTime, setDepartureTime] = React.useState('');
  const [maxWait, setMaxWait] = React.useState(30);
  const [isCalculating, setIsCalculating] = React.useState(false);
  const [recommendation, setRecommendation] = React.useState<RecommendedArrival | null>(null);
  const [alternatives, setAlternatives] = React.useState<AlternativeTime[]>([]);

  const getDepartureDateTime = React.useCallback((): Date | null => {
    if (!travelDate || !departureTime) return null;
    const [hours, minutes] = departureTime.split(':').map(Number);
    if (hours === undefined || minutes === undefined) return null;
    return setMinutes(setHours(travelDate, hours), minutes);
  }, [travelDate, departureTime]);

  const calculateRecommendation = React.useCallback(() => {
    const departureDateTime = getDepartureDateTime();
    if (!departureDateTime || predictions.length === 0) return;

    setIsCalculating(true);

    // Simulate calculation delay for UX
    setTimeout(() => {
      performCalculation(departureDateTime);
    }, 500);
  }, [getDepartureDateTime, predictions.length]);

  const performCalculation = React.useCallback((departureDateTime: Date) => {
    const departureHour = departureDateTime.getHours();
    const departureMinute = departureDateTime.getMinutes();

    // Find predictions 1-3 hours before departure
    const relevantPredictions = predictions.filter((p) => {
      const hoursBeforeDeparture = departureHour - p.hour;
      return hoursBeforeDeparture >= 1 && hoursBeforeDeparture <= 3;
    });

    let bestPrediction: HourlyPrediction | undefined;
    const alternativesList: AlternativeTime[] = [];

    if (relevantPredictions.length === 0) {
      // Fallback: suggest arriving 90 min before
      const arrivalHour = departureHour - 2;
      const prediction = predictions.find((p) => p.hour === arrivalHour);

      if (prediction) {
        bestPrediction = prediction;
      }
    } else {
      // Find prediction with wait time <= maxWait, preferring closer to departure
      bestPrediction = relevantPredictions[relevantPredictions.length - 1];

      for (const prediction of relevantPredictions) {
        if (prediction.waitTimeMinutes <= maxWait) {
          bestPrediction = prediction;
          break;
        }
      }

      if (!bestPrediction) {
        bestPrediction = relevantPredictions[0];
      }

      // Generate alternatives
      for (const pred of relevantPredictions) {
        if (pred !== bestPrediction) {
          const hoursBeforeDeparture = departureHour - pred.hour;
          alternativesList.push({
            arrivalTime: setMinutes(setHours(travelDate!, pred.hour), departureMinute),
            expectedWaitMinutes: pred.waitTimeMinutes,
            crowdLevel: pred.crowdLevel,
            label: hoursBeforeDeparture === 1 ? '1 hour before' : `${hoursBeforeDeparture} hours before`,
          });
        }
      }
    }

    if (bestPrediction) {
      setRecommendation({
        arrivalTime: setMinutes(setHours(travelDate!, bestPrediction.hour), departureMinute),
        expectedWaitMinutes: bestPrediction.waitTimeMinutes,
        crowdLevel: bestPrediction.crowdLevel,
      });
      setAlternatives(alternativesList.slice(0, 2));
    }

    setIsCalculating(false);
  }, [predictions, maxWait, travelDate]);

  const departureDateTime = getDepartureDateTime();
  const checkInCloseTime = departureDateTime
    ? addMinutes(departureDateTime, -CHECK_IN_CLOSE_MINUTES)
    : null;

  const colors = recommendation ? crowdLevelColors[recommendation.crowdLevel] : null;

  const calendarTitle = `Arrive at ${stationName || 'Eurostar station'}`;
  const calendarDescription = recommendation
    ? `Recommended arrival for your Eurostar departure at ${departureTime}.\nExpected queue wait: ~${recommendation.expectedWaitMinutes} minutes.`
    : '';

  const handleAddToGoogleCalendar = () => {
    if (!recommendation) return;
    const endTime = addMinutes(recommendation.arrivalTime, 15);
    const url = generateGoogleCalendarUrl(
      calendarTitle,
      recommendation.arrivalTime,
      endTime,
      calendarDescription,
      stationName
    );
    window.open(url, '_blank');
  };

  const handleDownloadIcs = () => {
    if (!recommendation) return;
    const endTime = addMinutes(recommendation.arrivalTime, 15);
    const icsContent = generateIcsContent(
      calendarTitle,
      recommendation.arrivalTime,
      endTime,
      calendarDescription,
      stationName
    );
    downloadIcsFile(icsContent, `eurostar-arrival-${format(recommendation.arrivalTime, 'yyyy-MM-dd')}.ics`);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Arrival Planner</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Form Section */}
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            {/* Date Picker */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Travel Date</label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      'w-full justify-start text-left font-normal',
                      !travelDate && 'text-muted-foreground'
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {travelDate ? format(travelDate, 'PPP') : 'Select date'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={travelDate}
                    onSelect={setTravelDate}
                    disabled={(date) => isBefore(date, startOfDay(new Date()))}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            {/* Time Picker */}
            <div className="space-y-2">
              <label htmlFor="departure-time" className="text-sm font-medium">
                Departure Time
              </label>
              <div className="relative">
                <Clock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="departure-time"
                  type="time"
                  value={departureTime}
                  onChange={(e) => setDepartureTime(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
          </div>

          {/* Max Wait Slider */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium">Max Acceptable Wait</label>
              <span className="text-sm font-semibold text-primary">{maxWait} min</span>
            </div>
            <Slider
              value={[maxWait]}
              onValueChange={([value]) => value !== undefined && setMaxWait(value)}
              min={5}
              max={60}
              step={5}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>5 min</span>
              <span>60 min</span>
            </div>
          </div>

          {/* Calculate Button */}
          <Button
            onClick={calculateRecommendation}
            disabled={!travelDate || !departureTime || predictions.length === 0 || isCalculating}
            className="w-full"
          >
            {isCalculating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Calculating...
              </>
            ) : (
              'Calculate Arrival Time'
            )}
          </Button>
        </div>

        {/* Results Section */}
        {recommendation && colors && departureDateTime && checkInCloseTime && (
          <div className="space-y-4">
            {/* Main Recommendation */}
            <div className={cn('rounded-lg p-6', colors.bg)}>
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-medium">Recommended Arrival</span>
                <Badge variant={colors.badge}>
                  {recommendation.crowdLevel.replace('_', ' ')}
                </Badge>
              </div>
              <div className={cn('text-5xl font-bold tracking-tight', colors.text)}>
                {format(recommendation.arrivalTime, 'HH:mm')}
              </div>
              <p className="mt-3 text-sm text-muted-foreground">
                Expected wait: ~{recommendation.expectedWaitMinutes} minutes
              </p>
            </div>

            {/* Visual Timeline */}
            <div className="rounded-lg border p-4">
              <h4 className="text-sm font-medium mb-4">Journey Timeline</h4>
              <div className="relative">
                {/* Timeline bar */}
                <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-border" />

                {/* Timeline items */}
                <div className="space-y-4 relative">
                  {/* Recommended Arrival */}
                  <div className="flex items-start gap-4 pl-0">
                    <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center z-10">
                      <div className="w-3 h-3 rounded-full bg-white" />
                    </div>
                    <div className="flex-1 pt-1">
                      <div className="flex items-center justify-between">
                        <span className="font-medium">Arrive at station</span>
                        <span className="text-sm font-semibold">{format(recommendation.arrivalTime, 'HH:mm')}</span>
                      </div>
                      <p className="text-xs text-muted-foreground">Recommended arrival time</p>
                    </div>
                  </div>

                  {/* Expected Queue Time */}
                  <div className="flex items-start gap-4 pl-0">
                    <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center z-10">
                      <div className="w-2 h-2 rounded-full bg-muted-foreground" />
                    </div>
                    <div className="flex-1 pt-1">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Queue & security</span>
                        <span className="text-sm text-muted-foreground">~{recommendation.expectedWaitMinutes} min</span>
                      </div>
                    </div>
                  </div>

                  {/* Check-in Close */}
                  <div className="flex items-start gap-4 pl-0">
                    <div className="w-8 h-8 rounded-full bg-orange-100 flex items-center justify-center z-10">
                      <div className="w-2 h-2 rounded-full bg-orange-500" />
                    </div>
                    <div className="flex-1 pt-1">
                      <div className="flex items-center justify-between">
                        <span className="text-sm">Check-in closes</span>
                        <span className="text-sm font-medium">{format(checkInCloseTime, 'HH:mm')}</span>
                      </div>
                      <p className="text-xs text-muted-foreground">30 min before departure</p>
                    </div>
                  </div>

                  {/* Departure */}
                  <div className="flex items-start gap-4 pl-0">
                    <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center z-10">
                      <div className="w-3 h-3 rounded-full bg-white" />
                    </div>
                    <div className="flex-1 pt-1">
                      <div className="flex items-center justify-between">
                        <span className="font-medium">Train departs</span>
                        <span className="text-sm font-semibold">{format(departureDateTime, 'HH:mm')}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Alternative Times */}
            {alternatives.length > 0 && (
              <div className="rounded-lg border p-4">
                <h4 className="text-sm font-medium mb-3">Alternative Arrival Times</h4>
                <div className="grid gap-2">
                  {alternatives.map((alt, idx) => {
                    const altColors = crowdLevelColors[alt.crowdLevel];
                    return (
                      <div
                        key={idx}
                        className={cn(
                          'flex items-center justify-between rounded-md p-3',
                          altColors.bg
                        )}
                      >
                        <div>
                          <span className="font-medium">{format(alt.arrivalTime, 'HH:mm')}</span>
                          <span className="text-sm text-muted-foreground ml-2">
                            ({alt.label})
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-muted-foreground">
                            ~{alt.expectedWaitMinutes} min wait
                          </span>
                          <Badge variant={altColors.badge} className="text-xs">
                            {alt.crowdLevel.replace('_', ' ')}
                          </Badge>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Calendar Buttons */}
            <div className="flex flex-col sm:flex-row gap-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={handleAddToGoogleCalendar}
              >
                <CalendarPlus className="mr-2 h-4 w-4" />
                Add to Google Calendar
              </Button>
              <Button
                variant="outline"
                className="flex-1"
                onClick={handleDownloadIcs}
              >
                <Download className="mr-2 h-4 w-4" />
                Download .ics (Apple)
              </Button>
            </div>

            {/* Timezone note */}
            <p className="text-xs text-muted-foreground text-center">
              All times shown in {timezone}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
