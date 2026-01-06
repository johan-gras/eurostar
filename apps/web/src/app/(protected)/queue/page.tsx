'use client';

import * as React from 'react';
import { format } from 'date-fns';
import { QueueStatus, type QueueStatusData, type CrowdLevel } from '@/components/queue/QueueStatus';
import { QueueTimeline, type HourlyPrediction } from '@/components/queue/QueueTimeline';
import { TerminalSelector, TERMINALS, type TerminalQueuePreview } from '@/components/queue/TerminalSelector';
import { ArrivalPlanner } from '@/components/queue/ArrivalPlanner';
import { PeakHours } from '@/components/queue/PeakHours';
import { UpdateIndicator, type ConnectionStatus } from '@/components/queue/UpdateIndicator';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronDown, RefreshCw } from 'lucide-react';
import { apiClient } from '@/lib/api-client';
import { toast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

// Mock data generator for development
function generateMockPredictions(): HourlyPrediction[] {
  const predictions: HourlyPrediction[] = [];

  for (let hour = 5; hour <= 22; hour++) {
    // Simulate peak hours: 7-9am and 5-7pm
    let waitTime: number;
    let crowdLevel: CrowdLevel;

    if (hour >= 7 && hour <= 9) {
      waitTime = 25 + Math.floor(Math.random() * 20);
      crowdLevel = waitTime > 35 ? 'very_high' : 'high';
    } else if (hour >= 17 && hour <= 19) {
      waitTime = 20 + Math.floor(Math.random() * 25);
      crowdLevel = waitTime > 35 ? 'very_high' : waitTime > 25 ? 'high' : 'moderate';
    } else if (hour >= 10 && hour <= 16) {
      waitTime = 10 + Math.floor(Math.random() * 15);
      crowdLevel = waitTime > 20 ? 'moderate' : 'low';
    } else {
      waitTime = 5 + Math.floor(Math.random() * 10);
      crowdLevel = 'low';
    }

    predictions.push({ hour, waitTimeMinutes: waitTime, crowdLevel });
  }

  return predictions;
}

function generateMockStatus(terminalId: string): QueueStatusData {
  const currentHour = new Date().getHours();
  let waitTime: number;
  let crowdLevel: CrowdLevel;

  if (currentHour >= 7 && currentHour <= 9) {
    waitTime = 30 + Math.floor(Math.random() * 15);
    crowdLevel = 'high';
  } else if (currentHour >= 17 && currentHour <= 19) {
    waitTime = 25 + Math.floor(Math.random() * 20);
    crowdLevel = waitTime > 35 ? 'very_high' : 'high';
  } else {
    waitTime = 10 + Math.floor(Math.random() * 10);
    crowdLevel = waitTime > 15 ? 'moderate' : 'low';
  }

  return {
    terminalId,
    waitTimeMinutes: waitTime,
    crowdLevel,
    confidence: 0.7 + Math.random() * 0.25,
    updatedAt: new Date().toISOString(),
  };
}

function generateMockPreviews(): TerminalQueuePreview[] {
  return TERMINALS.map((terminal) => {
    const status = generateMockStatus(terminal.id);
    return {
      terminalId: terminal.id,
      waitTimeMinutes: status.waitTimeMinutes,
      crowdLevel: status.crowdLevel,
    };
  });
}

const REFRESH_INTERVAL = 5 * 60 * 1000; // 5 minutes
const STALE_THRESHOLD = 10 * 60 * 1000; // 10 minutes
const PULL_THRESHOLD = 80; // Pixels to pull before triggering refresh

// Check for significant changes in queue status
function hasSignificantChange(
  oldStatus: QueueStatusData | null,
  newStatus: QueueStatusData
): { changed: boolean; message: string | null } {
  if (!oldStatus) return { changed: false, message: null };

  const crowdLevelOrder: CrowdLevel[] = ['low', 'moderate', 'high', 'very_high'];
  const oldLevel = crowdLevelOrder.indexOf(oldStatus.crowdLevel);
  const newLevel = crowdLevelOrder.indexOf(newStatus.crowdLevel);

  // Significant change: crowd level changed by 2+ levels or wait time changed by 15+ minutes
  const levelDiff = Math.abs(newLevel - oldLevel);
  const timeDiff = Math.abs(newStatus.waitTimeMinutes - oldStatus.waitTimeMinutes);

  if (levelDiff >= 2 || timeDiff >= 15) {
    if (newLevel > oldLevel || newStatus.waitTimeMinutes > oldStatus.waitTimeMinutes) {
      return {
        changed: true,
        message: `Queue times increasing: now ${newStatus.waitTimeMinutes} min wait`,
      };
    } else {
      return {
        changed: true,
        message: `Queue times improving: now ${newStatus.waitTimeMinutes} min wait`,
      };
    }
  }

  return { changed: false, message: null };
}

export default function QueuePage() {
  const [selectedTerminal, setSelectedTerminal] = React.useState('st-pancras');
  const [selectedDate, setSelectedDate] = React.useState<Date>(new Date());
  const [status, setStatus] = React.useState<QueueStatusData | null>(null);
  const [predictions, setPredictions] = React.useState<HourlyPrediction[]>([]);
  const [queuePreviews, setQueuePreviews] = React.useState<TerminalQueuePreview[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isRefreshing, setIsRefreshing] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [lastUpdatedAt, setLastUpdatedAt] = React.useState<Date | null>(null);
  const [connectionStatus, setConnectionStatus] = React.useState<ConnectionStatus>('connected');
  const [dataAnimationKey, setDataAnimationKey] = React.useState(0);
  const [isPlannerOpen, setIsPlannerOpen] = React.useState(false);

  // Pull-to-refresh state
  const [pullDistance, setPullDistance] = React.useState(0);
  const [isPulling, setIsPulling] = React.useState(false);
  const touchStartY = React.useRef(0);
  const containerRef = React.useRef<HTMLDivElement>(null);

  const terminal = TERMINALS.find((t) => t.id === selectedTerminal);

  // Fetch queue previews for all terminals on mount
  React.useEffect(() => {
    async function fetchPreviews() {
      try {
        const response = await apiClient.get<TerminalQueuePreview[]>('/queue/previews');
        setQueuePreviews(response.data);
      } catch {
        // Fallback to mock data
        setQueuePreviews(generateMockPreviews());
      }
    }
    void fetchPreviews();
  }, []);

  // Fetch queue data - reusable function
  const fetchQueueData = React.useCallback(async (isInitialLoad = false, isManualRefresh = false) => {
    if (isInitialLoad) {
      setIsLoading(true);
    } else if (isManualRefresh) {
      setIsRefreshing(true);
    }
    setError(null);

    const dateParam = format(selectedDate, 'yyyy-MM-dd');

    try {
      // Try to fetch from API
      const [statusResponse, predictionsResponse] = await Promise.all([
        apiClient.get<QueueStatusData>(`/queue/${selectedTerminal}/current`),
        apiClient.get<HourlyPrediction[]>(`/queue/${selectedTerminal}/timeline`, { date: dateParam }),
      ]);

      const newStatus = statusResponse.data;
      const newPredictions = predictionsResponse.data;

      // Check for significant changes and notify user
      const change = hasSignificantChange(status, newStatus);
      if (change.changed && change.message) {
        const isWorsening = newStatus.waitTimeMinutes > (status?.waitTimeMinutes ?? 0);
        toast({
          title: isWorsening ? 'Queue Alert' : 'Queue Update',
          description: change.message,
          variant: isWorsening ? 'warning' : 'info',
        });
      }

      setStatus(newStatus);
      setPredictions(newPredictions);
      setLastUpdatedAt(new Date());
      setConnectionStatus('connected');
      setDataAnimationKey((prev) => prev + 1); // Trigger animation
    } catch {
      // Fallback to mock data for development
      console.warn('Queue API not available, using mock data');
      const newStatus = generateMockStatus(selectedTerminal);
      const newPredictions = generateMockPredictions();

      // Check for significant changes with mock data too
      const change = hasSignificantChange(status, newStatus);
      if (change.changed && change.message && !isInitialLoad) {
        const isWorsening = newStatus.waitTimeMinutes > (status?.waitTimeMinutes ?? 0);
        toast({
          title: isWorsening ? 'Queue Alert' : 'Queue Update',
          description: change.message,
          variant: isWorsening ? 'warning' : 'info',
        });
      }

      setStatus(newStatus);
      setPredictions(newPredictions);
      setLastUpdatedAt(new Date());
      setConnectionStatus('connected');
      setDataAnimationKey((prev) => prev + 1);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [selectedTerminal, selectedDate, status]);

  // Initial fetch when terminal or date changes
  React.useEffect(() => {
    void fetchQueueData(true);
    // Reset last updated when terminal/date changes
    setLastUpdatedAt(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedTerminal, selectedDate]);

  // Auto-refresh every 5 minutes
  React.useEffect(() => {
    const interval = setInterval(() => {
      void fetchQueueData(false, false);
    }, REFRESH_INTERVAL);

    return () => clearInterval(interval);
  }, [fetchQueueData]);

  // Handle manual refresh
  const handleRefresh = React.useCallback(() => {
    void fetchQueueData(false, true);
  }, [fetchQueueData]);

  // Pull-to-refresh handlers
  const handleTouchStart = React.useCallback((e: React.TouchEvent) => {
    if (containerRef.current?.scrollTop === 0) {
      touchStartY.current = e.touches[0]?.clientY ?? 0;
      setIsPulling(true);
    }
  }, []);

  const handleTouchMove = React.useCallback((e: React.TouchEvent) => {
    if (!isPulling || isRefreshing) return;
    const currentY = e.touches[0]?.clientY ?? 0;
    const diff = currentY - touchStartY.current;
    if (diff > 0) {
      // Dampen the pull effect
      setPullDistance(Math.min(diff * 0.5, PULL_THRESHOLD * 1.5));
    }
  }, [isPulling, isRefreshing]);

  const handleTouchEnd = React.useCallback(() => {
    if (pullDistance >= PULL_THRESHOLD && !isRefreshing) {
      handleRefresh();
    }
    setPullDistance(0);
    setIsPulling(false);
  }, [pullDistance, isRefreshing, handleRefresh]);

  // Handle terminal swipe navigation
  const handleTerminalSwipe = React.useCallback((direction: 'left' | 'right') => {
    const currentIndex = TERMINALS.findIndex((t) => t.id === selectedTerminal);
    if (direction === 'left' && currentIndex < TERMINALS.length - 1) {
      setSelectedTerminal(TERMINALS[currentIndex + 1]!.id);
    } else if (direction === 'right' && currentIndex > 0) {
      setSelectedTerminal(TERMINALS[currentIndex - 1]!.id);
    }
  }, [selectedTerminal]);

  return (
    <div
      ref={containerRef}
      className="container py-4 md:py-6 touch-pan-y"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Pull-to-refresh indicator (mobile only) */}
      <div
        className={cn(
          'md:hidden flex items-center justify-center overflow-hidden transition-all duration-200',
          pullDistance > 0 ? 'mb-2' : 'h-0'
        )}
        style={{ height: pullDistance > 0 ? pullDistance : 0 }}
      >
        <RefreshCw
          className={cn(
            'h-6 w-6 text-muted-foreground transition-transform',
            pullDistance >= PULL_THRESHOLD && 'text-primary',
            isRefreshing && 'animate-spin'
          )}
          style={{
            transform: `rotate(${Math.min(pullDistance * 2, 180)}deg)`,
          }}
        />
      </div>

      <div className="mb-4 md:mb-6 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-xl md:text-2xl font-bold">Queue Times</h1>
          <p className="text-sm md:text-base text-muted-foreground">
            Check security queue wait times
          </p>
        </div>
        {/* Update indicator in header on larger screens */}
        <div className="hidden sm:block sm:w-72">
          <UpdateIndicator
            lastUpdatedAt={lastUpdatedAt}
            isRefreshing={isRefreshing}
            refreshInterval={REFRESH_INTERVAL}
            staleThreshold={STALE_THRESHOLD}
            onRefresh={handleRefresh}
            connectionStatus={connectionStatus}
          />
        </div>
      </div>

      {error && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Terminal Selector - Horizontal scroll cards on mobile */}
      <div className="mb-4 md:mb-6">
        <TerminalSelector
          selectedTerminal={selectedTerminal}
          onSelect={setSelectedTerminal}
          queuePreviews={queuePreviews}
          onSwipe={handleTerminalSwipe}
        />
      </div>

      {/* Mobile Layout: Stack vertically with status as hero */}
      <div className="md:hidden space-y-4">
        {/* Compact update indicator on mobile */}
        <UpdateIndicator
          lastUpdatedAt={lastUpdatedAt}
          isRefreshing={isRefreshing}
          refreshInterval={REFRESH_INTERVAL}
          staleThreshold={STALE_THRESHOLD}
          onRefresh={handleRefresh}
          connectionStatus={connectionStatus}
          compact
        />

        {/* Hero: Current Queue Status (full-width on mobile) */}
        <div
          key={dataAnimationKey}
          className="animate-in fade-in slide-in-from-bottom-2 duration-300"
        >
          <QueueStatus data={status} isLoading={isLoading} />
        </div>

        {/* Timeline - Horizontally scrollable on mobile */}
        <div
          key={`timeline-${dataAnimationKey}`}
          className="animate-in fade-in duration-500"
        >
          <QueueTimeline predictions={predictions} isLoading={isLoading} selectedDate={selectedDate} onDateChange={setSelectedDate} />
        </div>

        {/* Arrival Planner - Expandable accordion on mobile */}
        <Collapsible open={isPlannerOpen} onOpenChange={setIsPlannerOpen}>
          <CollapsibleTrigger className="flex w-full items-center justify-between rounded-lg border bg-card p-4 text-left hover:bg-accent/50 transition-colors">
            <div>
              <h3 className="font-semibold">Arrival Planner</h3>
              <p className="text-sm text-muted-foreground">
                Calculate your best arrival time
              </p>
            </div>
            <ChevronDown
              className={cn(
                'h-5 w-5 text-muted-foreground transition-transform duration-200',
                isPlannerOpen && 'rotate-180'
              )}
            />
          </CollapsibleTrigger>
          <CollapsibleContent className="mt-2">
            <ArrivalPlanner
              predictions={predictions}
              timezone={terminal?.timezone ?? 'UTC'}
            />
          </CollapsibleContent>
        </Collapsible>

        {/* Peak Hours Guide - Already has its own accordion */}
        <PeakHours terminalId={selectedTerminal} />
      </div>

      {/* Desktop Layout: Two-column */}
      <div className="hidden md:flex md:flex-row gap-6">
        {/* Sidebar */}
        <div className="lg:w-80 shrink-0 space-y-4">
          {/* Animate QueueStatus on data update */}
          <div
            key={dataAnimationKey}
            className="animate-in fade-in slide-in-from-bottom-2 duration-300"
          >
            <QueueStatus data={status} isLoading={isLoading} />
          </div>

          <ArrivalPlanner
            predictions={predictions}
            timezone={terminal?.timezone ?? 'UTC'}
          />
        </div>

        {/* Main Content - Timeline */}
        <div className="flex-1 min-w-0 space-y-6">
          {/* Animate timeline on data update */}
          <div
            key={`timeline-${dataAnimationKey}`}
            className="animate-in fade-in duration-500"
          >
            <QueueTimeline predictions={predictions} isLoading={isLoading} selectedDate={selectedDate} onDateChange={setSelectedDate} />
          </div>

          {/* Peak Hours Guide - Expandable Section */}
          <PeakHours terminalId={selectedTerminal} />
        </div>
      </div>
    </div>
  );
}
