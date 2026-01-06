'use client';

import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Ticket,
  FileText,
  AlertCircle,
  ArrowRight,
  Plus,
  TrendingUp,
  TrendingDown,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { SkeletonStat } from '@/components/ui/skeleton-card';
import { Skeleton } from '@/components/ui/skeleton';
import { Tooltip } from '@/components/ui/tooltip';
import { BookingList } from '@/components/booking/BookingList';
import { ClaimList } from '@/components/claim/ClaimList';
import { useBookings, useClaims } from '@/lib/queries';
import { cn } from '@/lib/utils';

// Dynamic import for heavy recharts component
const AnalyticsChart = dynamic(
  () => import('@/components/dashboard/AnalyticsChart').then((mod) => mod.AnalyticsChart),
  {
    loading: () => (
      <Card>
        <CardHeader>
          <Skeleton className="h-5 w-24" />
          <Skeleton className="h-4 w-48 mt-1" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[250px] w-full" />
        </CardContent>
      </Card>
    ),
    ssr: false,
  }
);

interface StatCardProps {
  title: string;
  value: number;
  icon: React.ReactNode;
  iconBgClass: string;
  iconColorClass: string;
  href: string;
  tooltip: string;
  trend?: { value: number; isPositive: boolean };
  variant?: 'default' | 'amber' | 'success';
  subtitle?: string | undefined;
}

function StatCard({
  title,
  value,
  icon,
  iconBgClass,
  iconColorClass,
  href,
  tooltip,
  trend,
  variant = 'default',
  subtitle,
}: StatCardProps) {
  const router = useRouter();

  const variantClasses = {
    default: '',
    amber: 'border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/30',
    success: 'border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950/30',
  };

  const valueColorClasses = {
    default: '',
    amber: 'text-amber-700 dark:text-amber-400',
    success: 'text-green-700 dark:text-green-400',
  };

  return (
    <Tooltip content={tooltip} side="bottom">
      <Card
        className={cn(
          'cursor-pointer transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 relative overflow-hidden',
          variantClasses[variant]
        )}
        onClick={() => router.push(href)}
      >
        {/* Subtle icon background */}
        <div
          className={cn(
            'absolute -right-4 -top-4 h-24 w-24 rounded-full opacity-10',
            iconBgClass
          )}
        />
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">{title}</CardTitle>
          <div className={cn('h-4 w-4', iconColorClass)}>{icon}</div>
        </CardHeader>
        <CardContent>
          <div className="flex items-baseline gap-2">
            <span className={cn('text-2xl font-bold', valueColorClasses[variant])}>
              {value}
            </span>
            {trend && (
              <span
                className={cn(
                  'flex items-center text-xs font-medium',
                  trend.isPositive ? 'text-green-600' : 'text-red-600'
                )}
              >
                {trend.isPositive ? (
                  <TrendingUp className="h-3 w-3 mr-0.5" />
                ) : (
                  <TrendingDown className="h-3 w-3 mr-0.5" />
                )}
                {trend.value}%
              </span>
            )}
          </div>
          {subtitle && (
            <p
              className={cn(
                'text-xs mt-1',
                variant === 'amber'
                  ? 'text-amber-600 dark:text-amber-400'
                  : variant === 'success'
                    ? 'text-green-600 dark:text-green-400'
                    : 'text-muted-foreground'
              )}
            >
              {subtitle}
            </p>
          )}
        </CardContent>
      </Card>
    </Tooltip>
  );
}

export default function DashboardPage() {
  const { data: bookingsData, isLoading: bookingsLoading } = useBookings({ limit: 6 });
  const { data: claimsData, isLoading: claimsLoading } = useClaims({ limit: 6 });
  const { data: allBookingsData } = useBookings({ limit: 100 });
  const { data: allClaimsData } = useClaims({ limit: 100 });

  const bookings = bookingsData?.data ?? [];
  const claims = claimsData?.data ?? [];
  const allBookings = allBookingsData?.data ?? [];
  const allClaims = allClaimsData?.data ?? [];
  const pendingClaims = claims.filter(
    (c) => c.status === 'eligible' || c.status === 'pending'
  );

  const isStatsLoading = bookingsLoading || claimsLoading;

  return (
    <div className="container py-6 space-y-8">
      {/* Stats Overview */}
      <div className="grid gap-4 md:grid-cols-3">
        {isStatsLoading ? (
          <>
            <SkeletonStat />
            <SkeletonStat />
            <SkeletonStat />
          </>
        ) : (
          <>
            <StatCard
              title="Total Bookings"
              value={bookingsData?.meta?.total ?? bookings.length}
              icon={<Ticket className="h-4 w-4" />}
              iconBgClass="bg-blue-500"
              iconColorClass="text-muted-foreground"
              href="/bookings"
              tooltip="All your tracked Eurostar journeys. Click to view and manage bookings."
            />

            <StatCard
              title="Total Claims"
              value={claimsData?.meta?.total ?? claims.length}
              icon={<FileText className="h-4 w-4" />}
              iconBgClass="bg-purple-500"
              iconColorClass="text-muted-foreground"
              href="/claims"
              tooltip="Total compensation claims created from delayed journeys."
            />

            <StatCard
              title="Pending Claims"
              value={pendingClaims.length}
              icon={<AlertCircle className="h-4 w-4" />}
              iconBgClass={pendingClaims.length > 0 ? 'bg-amber-500' : 'bg-gray-500'}
              iconColorClass={
                pendingClaims.length > 0
                  ? 'text-amber-600 dark:text-amber-400'
                  : 'text-muted-foreground'
              }
              href="/claims?status=pending"
              tooltip="Claims awaiting submission. These are ready to be filed with Eurostar."
              variant={pendingClaims.length > 0 ? 'amber' : 'default'}
              subtitle={pendingClaims.length > 0 ? 'Ready to submit!' : undefined}
            />
          </>
        )}
      </div>

      {/* Quick Action */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div>
              <h3 className="font-semibold">Track a new journey</h3>
              <p className="text-sm text-muted-foreground">
                Add your booking to monitor delays and claim compensation automatically.
              </p>
            </div>
            <Link href="/bookings/new">
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Add Booking
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>

      {/* Recent Bookings */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-semibold">Recent Bookings</h2>
            <p className="text-sm text-muted-foreground">Your latest Eurostar journeys</p>
          </div>
          <Link href="/bookings">
            <Button variant="ghost" size="sm">
              View all
              <ArrowRight className="h-4 w-4 ml-1" />
            </Button>
          </Link>
        </div>
        <BookingList bookings={bookings} isLoading={bookingsLoading} />
      </div>

      {/* Recent Claims */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-semibold">Recent Claims</h2>
            <p className="text-sm text-muted-foreground">Compensation claims for delayed journeys</p>
          </div>
          <Link href="/claims">
            <Button variant="ghost" size="sm">
              View all
              <ArrowRight className="h-4 w-4 ml-1" />
            </Button>
          </Link>
        </div>
        <ClaimList claims={claims} isLoading={claimsLoading} />
      </div>

      {/* Analytics Charts */}
      <div>
        <div className="mb-4">
          <h2 className="text-lg font-semibold">Analytics</h2>
          <p className="text-sm text-muted-foreground">Your claims and delays at a glance</p>
        </div>
        <AnalyticsChart claims={allClaims} bookings={allBookings} />
      </div>
    </div>
  );
}
