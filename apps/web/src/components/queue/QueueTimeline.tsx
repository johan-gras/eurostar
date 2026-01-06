'use client';

import * as React from 'react';
import { format, addDays, isSameDay, startOfDay } from 'date-fns';
import { CalendarIcon, Clock } from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  ReferenceArea,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import type { CrowdLevel } from './QueueStatus';

export interface HourlyPrediction {
  hour: number;
  waitTimeMinutes: number;
  crowdLevel: CrowdLevel;
}

interface QueueTimelineProps {
  predictions: HourlyPrediction[];
  isLoading?: boolean;
  selectedDate?: Date;
  onDateChange?: (date: Date) => void;
  terminalOperatingHours?: { open: number; close: number };
}

const PEAK_HOURS = [
  { start: 6, end: 9 },
  { start: 16, end: 19 },
];

const WAIT_TIME_THRESHOLDS = {
  low: 15,
  moderate: 30,
  high: 45,
};

function formatHour(hour: number): string {
  return `${hour.toString().padStart(2, '0')}:00`;
}

function getWaitTimeColor(waitTime: number): string {
  if (waitTime <= WAIT_TIME_THRESHOLDS.low) return '#22c55e';
  if (waitTime <= WAIT_TIME_THRESHOLDS.moderate) return '#eab308';
  if (waitTime <= WAIT_TIME_THRESHOLDS.high) return '#f97316';
  return '#ef4444';
}

interface TooltipPayloadItem {
  value: number;
  payload: {
    hour: number;
    waitTimeMinutes: number;
    crowdLevel: CrowdLevel;
  };
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: TooltipPayloadItem[];
  label?: string;
}

function CustomTooltip({ active, payload }: CustomTooltipProps) {
  if (active && payload && payload.length > 0) {
    const firstPayload = payload[0];
    if (!firstPayload) return null;
    const data = firstPayload.payload;
    const color = getWaitTimeColor(data.waitTimeMinutes);

    return (
      <div className="bg-popover border rounded-lg shadow-lg p-3 min-w-[140px]">
        <div className="flex items-center gap-2 mb-2">
          <Clock className="h-4 w-4 text-muted-foreground" />
          <span className="font-medium">{formatHour(data.hour)}</span>
        </div>
        <div className="flex items-center gap-2">
          <div
            className="w-3 h-3 rounded-full"
            style={{ backgroundColor: color }}
          />
          <span className="text-lg font-bold">{data.waitTimeMinutes} min</span>
        </div>
        <div className="text-xs text-muted-foreground mt-1 capitalize">
          {data.crowdLevel.replace('_', ' ')} crowd
        </div>
      </div>
    );
  }
  return null;
}

function generate24HourData(predictions: HourlyPrediction[]): HourlyPrediction[] {
  const predictionMap = new Map(predictions.map((p) => [p.hour, p]));
  return Array.from({ length: 24 }, (_, hour) => {
    const existing = predictionMap.get(hour);
    return (
      existing || {
        hour,
        waitTimeMinutes: 0,
        crowdLevel: 'low' as CrowdLevel,
      }
    );
  });
}

export function QueueTimeline({
  predictions,
  isLoading,
  selectedDate,
  onDateChange,
  terminalOperatingHours = { open: 5, close: 22 },
}: QueueTimelineProps) {
  const [date, setDate] = React.useState<Date>(selectedDate || new Date());
  const [currentHour, setCurrentHour] = React.useState(new Date().getHours());

  React.useEffect(() => {
    const interval = setInterval(() => {
      setCurrentHour(new Date().getHours());
    }, 60000);
    return () => clearInterval(interval);
  }, []);

  const handleDateChange = (newDate: Date) => {
    setDate(newDate);
    onDateChange?.(newDate);
  };

  const isToday = isSameDay(date, new Date());
  const isTomorrow = isSameDay(date, addDays(new Date(), 1));

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Queue Predictions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-80 flex items-center justify-center text-muted-foreground">
            <div className="animate-pulse flex flex-col items-center gap-2">
              <div className="h-4 w-32 bg-muted rounded" />
              <div className="h-48 w-full bg-muted rounded" />
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const fullDayData = generate24HourData(predictions);
  const maxWaitTime = Math.max(
    ...fullDayData.map((p) => p.waitTimeMinutes),
    60
  );

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <CardTitle className="text-lg">Queue Predictions</CardTitle>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant={isToday ? 'default' : 'outline'}
              size="sm"
              onClick={() => handleDateChange(new Date())}
            >
              Today
            </Button>
            <Button
              variant={isTomorrow ? 'default' : 'outline'}
              size="sm"
              onClick={() => handleDateChange(addDays(new Date(), 1))}
            >
              Tomorrow
            </Button>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant={!isToday && !isTomorrow ? 'default' : 'outline'}
                  size="sm"
                  className="gap-2"
                >
                  <CalendarIcon className="h-4 w-4" />
                  <span className="hidden sm:inline">
                    {!isToday && !isTomorrow
                      ? format(date, 'MMM d')
                      : 'Pick date'}
                  </span>
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="end">
                <Calendar
                  mode="single"
                  selected={date}
                  onSelect={(d) => d && handleDateChange(d)}
                  disabled={(d) => d < startOfDay(new Date())}
                />
              </PopoverContent>
            </Popover>
          </div>
        </div>
        <div className="text-sm text-muted-foreground mt-1">
          {format(date, 'EEEE, MMMM d, yyyy')}
          {isToday && (
            <span className="ml-2 text-primary font-medium">
              (Current time: {formatHour(currentHour)})
            </span>
          )}
        </div>
      </CardHeader>
      <CardContent className="pt-4">
        {predictions.length === 0 ? (
          <div className="h-64 flex items-center justify-center text-muted-foreground">
            No predictions available for this date
          </div>
        ) : (
          <>
            <div className="h-64 sm:h-72 md:h-80 touch-pan-x md:touch-pan-y overflow-x-auto md:overflow-visible">
              <div className="min-w-[500px] md:min-w-0 h-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={fullDayData}
                  margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
                >
                  <defs>
                    <linearGradient
                      id="waitTimeGradient"
                      x1="0"
                      y1="0"
                      x2="0"
                      y2="1"
                    >
                      <stop offset="0%" stopColor="#ef4444" stopOpacity={0.8} />
                      <stop
                        offset="25%"
                        stopColor="#f97316"
                        stopOpacity={0.6}
                      />
                      <stop
                        offset="50%"
                        stopColor="#eab308"
                        stopOpacity={0.4}
                      />
                      <stop
                        offset="100%"
                        stopColor="#22c55e"
                        stopOpacity={0.2}
                      />
                    </linearGradient>
                    <linearGradient
                      id="lineGradient"
                      x1="0"
                      y1="0"
                      x2="1"
                      y2="0"
                    >
                      {fullDayData.map((d, i) => (
                        <stop
                          key={d.hour}
                          offset={`${(i / 23) * 100}%`}
                          stopColor={getWaitTimeColor(d.waitTimeMinutes)}
                        />
                      ))}
                    </linearGradient>
                  </defs>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    vertical={false}
                    stroke="hsl(var(--border))"
                  />

                  {PEAK_HOURS.map((peak, i) => (
                    <ReferenceArea
                      key={i}
                      x1={peak.start}
                      x2={peak.end}
                      fill="hsl(var(--muted))"
                      fillOpacity={0.5}
                      label={{
                        value: 'Peak',
                        position: 'insideTop',
                        fill: 'hsl(var(--muted-foreground))',
                        fontSize: 10,
                      }}
                    />
                  ))}

                  <ReferenceArea
                    x1={0}
                    x2={terminalOperatingHours.open}
                    fill="hsl(var(--muted))"
                    fillOpacity={0.3}
                  />
                  <ReferenceArea
                    x1={terminalOperatingHours.close}
                    x2={23}
                    fill="hsl(var(--muted))"
                    fillOpacity={0.3}
                  />

                  <XAxis
                    dataKey="hour"
                    tickFormatter={(h) => `${h}:00`}
                    tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                    tickLine={false}
                    axisLine={{ stroke: 'hsl(var(--border))' }}
                    interval={2}
                    domain={[0, 23]}
                  />
                  <YAxis
                    domain={[0, maxWaitTime]}
                    ticks={[0, 15, 30, 45, 60].filter((t) => t <= maxWaitTime)}
                    tickFormatter={(v) => `${v}m`}
                    tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                    tickLine={false}
                    axisLine={false}
                    width={40}
                  />

                  <ReferenceArea
                    y1={0}
                    y2={WAIT_TIME_THRESHOLDS.low}
                    fill="#22c55e"
                    fillOpacity={0.05}
                  />
                  <ReferenceArea
                    y1={WAIT_TIME_THRESHOLDS.low}
                    y2={WAIT_TIME_THRESHOLDS.moderate}
                    fill="#eab308"
                    fillOpacity={0.05}
                  />
                  <ReferenceArea
                    y1={WAIT_TIME_THRESHOLDS.moderate}
                    y2={WAIT_TIME_THRESHOLDS.high}
                    fill="#f97316"
                    fillOpacity={0.05}
                  />
                  <ReferenceArea
                    y1={WAIT_TIME_THRESHOLDS.high}
                    y2={maxWaitTime}
                    fill="#ef4444"
                    fillOpacity={0.05}
                  />

                  {isToday && (
                    <ReferenceLine
                      x={currentHour}
                      stroke="hsl(var(--primary))"
                      strokeWidth={2}
                      strokeDasharray="4 4"
                      label={{
                        value: 'Now',
                        position: 'top',
                        fill: 'hsl(var(--primary))',
                        fontSize: 12,
                        fontWeight: 600,
                      }}
                    />
                  )}

                  <Tooltip
                    content={<CustomTooltip />}
                    cursor={{
                      stroke: 'hsl(var(--muted-foreground))',
                      strokeWidth: 1,
                      strokeDasharray: '4 4',
                    }}
                  />

                  <Area
                    type="monotone"
                    dataKey="waitTimeMinutes"
                    stroke="url(#lineGradient)"
                    strokeWidth={2}
                    fill="url(#waitTimeGradient)"
                    animationDuration={500}
                  />
                </AreaChart>
              </ResponsiveContainer>
              </div>
            </div>

            {/* Mobile scroll hint */}
            <p className="text-xs text-muted-foreground text-center mt-2 md:hidden">
              Swipe to see full timeline • Tap for details
            </p>

            <div className="mt-3 md:mt-4 flex flex-wrap items-center justify-between gap-2 md:gap-4">
              <div className="flex flex-wrap gap-3 text-xs sm:text-sm">
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-green-500" />
                  <span>&lt;15m</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-yellow-500" />
                  <span>15-30m</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-orange-500" />
                  <span>30-45m</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-red-500" />
                  <span>&gt;45m</span>
                </div>
              </div>
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <div className="w-4 h-3 bg-muted rounded" />
                <span>Peak hours / Closed</span>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
