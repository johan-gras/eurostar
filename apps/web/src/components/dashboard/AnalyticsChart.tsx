'use client';

import { useMemo } from 'react';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import type { ClaimResponse, BookingResponse } from '@/lib/api';

interface AnalyticsChartProps {
  claims: ClaimResponse[];
  bookings: BookingResponse[];
}

interface MonthlyData {
  month: string;
  claims: number;
  compensation: number;
}

interface DelayData {
  range: string;
  count: number;
}

function aggregateClaimsByMonth(claims: ClaimResponse[]): MonthlyData[] {
  const monthlyMap = new Map<string, { claims: number; compensation: number }>();

  claims.forEach((claim) => {
    const date = new Date(claim.createdAt);
    const monthKey = date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });

    const existing = monthlyMap.get(monthKey) ?? { claims: 0, compensation: 0 };
    monthlyMap.set(monthKey, {
      claims: existing.claims + 1,
      compensation: existing.compensation + claim.eligibleCashAmount,
    });
  });

  return Array.from(monthlyMap.entries())
    .map(([month, data]) => ({
      month,
      claims: data.claims,
      compensation: data.compensation,
    }))
    .slice(-6);
}

function aggregateDelayFrequency(bookings: BookingResponse[]): DelayData[] {
  const ranges = [
    { label: '0-30 min', min: 0, max: 30 },
    { label: '31-60 min', min: 31, max: 60 },
    { label: '61-120 min', min: 61, max: 120 },
    { label: '120+ min', min: 121, max: Infinity },
  ];

  const delayedBookings = bookings.filter((b) => b.finalDelayMinutes !== null && b.finalDelayMinutes > 0);

  return ranges.map((range) => ({
    range: range.label,
    count: delayedBookings.filter(
      (b) => b.finalDelayMinutes !== null && b.finalDelayMinutes >= range.min && b.finalDelayMinutes <= range.max
    ).length,
  }));
}

export function AnalyticsChart({ claims, bookings }: AnalyticsChartProps) {
  const monthlyData = useMemo(() => aggregateClaimsByMonth(claims), [claims]);
  const delayData = useMemo(() => aggregateDelayFrequency(bookings), [bookings]);

  const totalCompensation = useMemo(
    () => claims.reduce((sum, c) => sum + c.eligibleCashAmount, 0),
    [claims]
  );

  const hasData = claims.length > 0 || bookings.some((b) => b.finalDelayMinutes !== null && b.finalDelayMinutes > 0);

  if (!hasData) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Analytics</CardTitle>
          <CardDescription>Track your claims and delays over time</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-[200px] text-muted-foreground">
            No data available yet. Add bookings with delays to see analytics.
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Analytics</CardTitle>
        <CardDescription>
          Track your claims and compensation over time
          {totalCompensation > 0 && (
            <span className="ml-2 text-green-600 dark:text-green-400 font-medium">
              Total: €{totalCompensation.toFixed(2)}
            </span>
          )}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="claims" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="claims">Claims</TabsTrigger>
            <TabsTrigger value="compensation">Compensation</TabsTrigger>
            <TabsTrigger value="delays">Delays</TabsTrigger>
          </TabsList>

          <TabsContent value="claims" className="mt-4">
            <div className="h-[250px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={monthlyData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis
                    dataKey="month"
                    tick={{ fontSize: 12 }}
                    className="text-muted-foreground"
                  />
                  <YAxis
                    allowDecimals={false}
                    tick={{ fontSize: 12 }}
                    className="text-muted-foreground"
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '6px',
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="claims"
                    stroke="hsl(var(--primary))"
                    strokeWidth={2}
                    dot={{ fill: 'hsl(var(--primary))' }}
                    name="Claims"
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </TabsContent>

          <TabsContent value="compensation" className="mt-4">
            <div className="h-[250px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthlyData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis
                    dataKey="month"
                    tick={{ fontSize: 12 }}
                    className="text-muted-foreground"
                  />
                  <YAxis
                    tick={{ fontSize: 12 }}
                    tickFormatter={(value) => `€${value}`}
                    className="text-muted-foreground"
                  />
                  <Tooltip
                    formatter={(value) => [`€${Number(value).toFixed(2)}`, 'Compensation']}
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '6px',
                    }}
                  />
                  <Bar
                    dataKey="compensation"
                    fill="hsl(142 76% 36%)"
                    radius={[4, 4, 0, 0]}
                    name="Compensation"
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </TabsContent>

          <TabsContent value="delays" className="mt-4">
            <div className="h-[250px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={delayData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis
                    dataKey="range"
                    tick={{ fontSize: 12 }}
                    className="text-muted-foreground"
                  />
                  <YAxis
                    allowDecimals={false}
                    tick={{ fontSize: 12 }}
                    className="text-muted-foreground"
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '6px',
                    }}
                  />
                  <Legend />
                  <Bar
                    dataKey="count"
                    fill="hsl(24 95% 50%)"
                    radius={[4, 4, 0, 0]}
                    name="Delayed journeys"
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
