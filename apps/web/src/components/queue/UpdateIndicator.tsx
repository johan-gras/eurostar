'use client';

import * as React from 'react';
import { RefreshCw, Wifi, WifiOff, AlertTriangle, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export type ConnectionStatus = 'connected' | 'disconnected' | 'stale' | 'timeout';

export interface UpdateIndicatorProps {
  /** Timestamp of the last successful data update */
  lastUpdatedAt: Date | null;
  /** Whether a refresh is currently in progress */
  isRefreshing?: boolean;
  /** Auto-refresh interval in milliseconds (default: 5 minutes) */
  refreshInterval?: number;
  /** Callback when manual refresh is triggered */
  onRefresh?: () => void;
  /** Connection status override (auto-calculated if not provided) */
  connectionStatus?: ConnectionStatus;
  /** Threshold in ms after which data is considered stale (default: 10 minutes) */
  staleThreshold?: number;
  /** Show compact version */
  compact?: boolean;
}

const REFRESH_INTERVAL_DEFAULT = 5 * 60 * 1000; // 5 minutes
const STALE_THRESHOLD_DEFAULT = 10 * 60 * 1000; // 10 minutes

function formatRelativeTime(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSeconds = Math.floor(diffMs / 1000);
  const diffMinutes = Math.floor(diffSeconds / 60);
  const diffHours = Math.floor(diffMinutes / 60);

  if (diffSeconds < 10) {
    return 'just now';
  }
  if (diffSeconds < 60) {
    return `${diffSeconds}s ago`;
  }
  if (diffMinutes < 60) {
    return `${diffMinutes}m ago`;
  }
  return `${diffHours}h ${diffMinutes % 60}m ago`;
}

function formatCountdown(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;

  if (minutes > 0) {
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  }
  return `${remainingSeconds}s`;
}

function PulsingDot({ status, className }: { status: ConnectionStatus; className?: string }) {
  const colorClasses = {
    connected: 'bg-green-500',
    disconnected: 'bg-red-500',
    stale: 'bg-amber-500',
    timeout: 'bg-orange-500',
  };

  return (
    <span className={cn('relative flex h-2.5 w-2.5', className)}>
      {status === 'connected' && (
        <span
          className={cn(
            'absolute inline-flex h-full w-full animate-ping rounded-full opacity-75',
            colorClasses[status]
          )}
        />
      )}
      <span
        className={cn(
          'relative inline-flex h-2.5 w-2.5 rounded-full',
          colorClasses[status]
        )}
      />
    </span>
  );
}

export function UpdateIndicator({
  lastUpdatedAt,
  isRefreshing = false,
  refreshInterval = REFRESH_INTERVAL_DEFAULT,
  onRefresh,
  connectionStatus: connectionStatusProp,
  staleThreshold = STALE_THRESHOLD_DEFAULT,
  compact = false,
}: UpdateIndicatorProps) {
  const [relativeTime, setRelativeTime] = React.useState<string>('');
  const [countdown, setCountdown] = React.useState<number>(refreshInterval);
  const [computedStatus, setComputedStatus] = React.useState<ConnectionStatus>('connected');

  // Update relative time display every second
  React.useEffect(() => {
    if (!lastUpdatedAt) {
      setRelativeTime('never');
      setComputedStatus('disconnected');
      return;
    }

    function updateTime() {
      if (!lastUpdatedAt) return;

      const now = new Date();
      const diffMs = now.getTime() - lastUpdatedAt.getTime();

      setRelativeTime(formatRelativeTime(lastUpdatedAt));

      // Auto-determine connection status based on data age
      if (diffMs > staleThreshold) {
        setComputedStatus('stale');
      } else {
        setComputedStatus('connected');
      }
    }

    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, [lastUpdatedAt, staleThreshold]);

  // Countdown timer for auto-refresh
  React.useEffect(() => {
    if (!lastUpdatedAt) {
      setCountdown(0);
      return;
    }

    function updateCountdown() {
      if (!lastUpdatedAt) return;

      const now = new Date();
      const timeSinceUpdate = now.getTime() - lastUpdatedAt.getTime();
      const remaining = Math.max(0, refreshInterval - timeSinceUpdate);
      setCountdown(remaining);
    }

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, [lastUpdatedAt, refreshInterval]);

  const status = connectionStatusProp ?? computedStatus;

  const statusConfig = {
    connected: {
      icon: Wifi,
      label: 'Live',
      description: 'Receiving updates',
      className: 'text-green-600 dark:text-green-400',
    },
    disconnected: {
      icon: WifiOff,
      label: 'Offline',
      description: 'Connection lost',
      className: 'text-red-600 dark:text-red-400',
    },
    stale: {
      icon: AlertTriangle,
      label: 'Stale',
      description: 'Data may be outdated',
      className: 'text-amber-600 dark:text-amber-400',
    },
    timeout: {
      icon: Clock,
      label: 'Slow',
      description: 'Connection timed out',
      className: 'text-orange-600 dark:text-orange-400',
    },
  };

  const config = statusConfig[status];
  const StatusIcon = config.icon;

  if (compact) {
    return (
      <div className="flex items-center gap-2">
        <PulsingDot status={status} />
        <span className="text-xs text-muted-foreground">{relativeTime}</span>
        {onRefresh && (
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={onRefresh}
            disabled={isRefreshing}
            title="Refresh now"
          >
            <RefreshCw
              className={cn('h-3 w-3', isRefreshing && 'animate-spin')}
            />
          </Button>
        )}
      </div>
    );
  }

  return (
    <div
      className={cn(
        'rounded-lg border p-3 transition-colors',
        status === 'connected' && 'border-green-200 bg-green-50/50 dark:border-green-800/50 dark:bg-green-950/20',
        status === 'disconnected' && 'border-red-200 bg-red-50/50 dark:border-red-800/50 dark:bg-red-950/20',
        status === 'stale' && 'border-amber-200 bg-amber-50/50 dark:border-amber-800/50 dark:bg-amber-950/20',
        status === 'timeout' && 'border-orange-200 bg-orange-50/50 dark:border-orange-800/50 dark:bg-orange-950/20'
      )}
    >
      <div className="flex items-center justify-between gap-4">
        {/* Status indicator */}
        <div className="flex items-center gap-3">
          <PulsingDot status={status} />
          <div className="flex flex-col">
            <div className="flex items-center gap-1.5">
              <StatusIcon className={cn('h-3.5 w-3.5', config.className)} />
              <span className={cn('text-sm font-medium', config.className)}>
                {config.label}
              </span>
            </div>
            <span className="text-xs text-muted-foreground">
              Updated {relativeTime}
            </span>
          </div>
        </div>

        {/* Countdown and refresh */}
        <div className="flex items-center gap-2">
          {status === 'connected' && countdown > 0 && (
            <span className="text-xs text-muted-foreground tabular-nums">
              Next: {formatCountdown(countdown)}
            </span>
          )}
          {onRefresh && (
            <Button
              variant="ghost"
              size="sm"
              className="h-8 gap-1.5 px-2"
              onClick={onRefresh}
              disabled={isRefreshing}
            >
              <RefreshCw
                className={cn('h-3.5 w-3.5', isRefreshing && 'animate-spin')}
              />
              <span className="hidden sm:inline">Refresh</span>
            </Button>
          )}
        </div>
      </div>

      {/* Stale data warning */}
      {status === 'stale' && (
        <div className="mt-2 flex items-center gap-2 rounded bg-amber-100 px-2 py-1.5 text-xs text-amber-800 dark:bg-amber-900/30 dark:text-amber-200">
          <AlertTriangle className="h-3.5 w-3.5 flex-shrink-0" />
          <span>Data is older than {Math.floor(staleThreshold / 60000)} minutes. Queue times may have changed.</span>
        </div>
      )}

      {/* Connection lost warning */}
      {status === 'disconnected' && (
        <div className="mt-2 flex items-center gap-2 rounded bg-red-100 px-2 py-1.5 text-xs text-red-800 dark:bg-red-900/30 dark:text-red-200">
          <WifiOff className="h-3.5 w-3.5 flex-shrink-0" />
          <span>Unable to fetch latest queue data. Showing last known values.</span>
        </div>
      )}

      {/* Timeout warning */}
      {status === 'timeout' && (
        <div className="mt-2 flex items-center gap-2 rounded bg-orange-100 px-2 py-1.5 text-xs text-orange-800 dark:bg-orange-900/30 dark:text-orange-200">
          <Clock className="h-3.5 w-3.5 flex-shrink-0" />
          <span>Request timed out. The server may be slow. Try refreshing.</span>
        </div>
      )}
    </div>
  );
}
