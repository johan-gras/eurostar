'use client';

import * as React from 'react';
import dynamic from 'next/dynamic';
import { PreferenceForm, type SeatPreferences } from '@/components/seatmap/PreferenceForm';
import { MobilePreferenceForm } from '@/components/seatmap/MobilePreferenceForm';
import { TrainOverview, type CoachInfo } from '@/components/seatmap/TrainOverview';
import { SeatDetails } from '@/components/seatmap/SeatDetails';
import { RecommendationResults } from '@/components/seatmap/RecommendationResults';
import { NoMatchesState, createQuickAdjustments } from '@/components/seatmap/NoMatchesState';
import type { SeatInfo } from '@/components/seatmap/Seat';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { apiClient } from '@/lib/api-client';
import { useIsMobile } from '@/hooks/use-mobile';

// Dynamic imports for heavy seat map components
const SeatMap = dynamic(
  () => import('@/components/seatmap/SeatMap').then((mod) => mod.SeatMap),
  {
    loading: () => (
      <Card>
        <CardContent className="py-8">
          <div className="space-y-4">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-[400px] w-full" />
          </div>
        </CardContent>
      </Card>
    ),
    ssr: false,
  }
);

const MobileSeatMap = dynamic(
  () => import('@/components/seatmap/MobileSeatMap').then((mod) => mod.MobileSeatMap),
  {
    loading: () => (
      <Card>
        <CardContent className="py-8">
          <Skeleton className="h-[300px] w-full" />
        </CardContent>
      </Card>
    ),
    ssr: false,
  }
);

type TrainType = 'e320' | 'e300' | 'classic' | 'ruby';

const trainTypes: { value: TrainType; label: string; available: boolean }[] = [
  { value: 'e320', label: 'e320 (Siemens Velaro)', available: true },
  { value: 'e300', label: 'e300 (Alstom)', available: true },
  { value: 'classic', label: 'Classic', available: false },
  { value: 'ruby', label: 'Ruby', available: false },
];

interface RecommendationGroup {
  seats: SeatInfo[];
  totalScore: number;
  averageScore: number;
}

export default function SeatMapPage() {
  const isMobile = useIsMobile();
  const [trainType, setTrainType] = React.useState<TrainType>('e320');
  const [selectedCoach, setSelectedCoach] = React.useState<number | undefined>();
  const [seats, setSeats] = React.useState<SeatInfo[]>([]);
  const [recommendedSeats, setRecommendedSeats] = React.useState<SeatInfo[]>([]);
  const [recommendations, setRecommendations] = React.useState<RecommendationGroup[]>([]);
  const [recommendedSeatRanks, setRecommendedSeatRanks] = React.useState<Map<string, number>>(new Map());
  const [selectedSeat, setSelectedSeat] = React.useState<SeatInfo | null>(null);
  const [detailsSeat, setDetailsSeat] = React.useState<SeatInfo | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = React.useState(false);
  const [isLoading, setIsLoading] = React.useState(false);
  const [isLoadingSeats, setIsLoadingSeats] = React.useState(true);
  const [hasSearched, setHasSearched] = React.useState(false);
  const [currentPreferences, setCurrentPreferences] = React.useState<SeatPreferences | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const seatMapRef = React.useRef<HTMLDivElement>(null);

  // Fetch seats data when train type changes
  React.useEffect(() => {
    async function fetchSeats() {
      setIsLoadingSeats(true);
      setError(null);
      setRecommendedSeats([]);
      setRecommendations([]);
      setRecommendedSeatRanks(new Map());
      setSelectedSeat(null);
      setHasSearched(false);

      try {
        const response = await apiClient.get<SeatInfo[]>(
          `/seats/${trainType}/all`
        );
        setSeats(response.data);
      } catch (err) {
        console.error('Failed to fetch seats:', err);
        setError('Failed to load seat data. Please try again.');
        setSeats([]);
      } finally {
        setIsLoadingSeats(false);
      }
    }

    void fetchSeats();
  }, [trainType]);

  const handlePreferenceSubmit = async (preferences: SeatPreferences) => {
    setIsLoading(true);
    setError(null);
    setCurrentPreferences(preferences);
    setHasSearched(true);

    try {
      const response = await apiClient.post<
        Array<{ seats: SeatInfo[]; totalScore: number; averageScore: number }>
      >(`/seats/${trainType}/recommend`, {
        coachClass: preferences.coachClass,
        count: preferences.travelingTogether > 1 ? 3 : 5,
        preferences: {
          preferWindow: preferences.preferWindow,
          preferQuiet: preferences.preferQuiet,
          preferTable: preferences.preferTable,
          avoidToilet: preferences.avoidToilet,
          avoidNoWindow: preferences.avoidNoWindow,
          needsAccessible: preferences.needsAccessible,
          travelingTogether: preferences.travelingTogether,
          facingPreference: preferences.facingPreference,
        },
      });

      const recGroups = response.data;
      setRecommendations(recGroups);

      // Flatten all recommended seats from all recommendation groups
      const allRecommended = recGroups.flatMap((r) => r.seats);
      setRecommendedSeats(allRecommended);

      // Build seat ranks map - seats in first group get rank 0, second group rank 1, etc.
      const ranksMap = new Map<string, number>();
      recGroups.forEach((group, groupIndex) => {
        group.seats.forEach((seat) => {
          const key = `${seat.coach}-${seat.seatNumber}`;
          // Only set rank if not already set (first occurrence wins)
          if (!ranksMap.has(key)) {
            ranksMap.set(key, groupIndex);
          }
        });
      });
      setRecommendedSeatRanks(ranksMap);

      // If we have recommendations, scroll to the first one's coach
      const firstRecommended = allRecommended[0];
      if (firstRecommended) {
        setSelectedCoach(firstRecommended.coach);
        // Smooth scroll to seat map after a brief delay
        setTimeout(() => {
          seatMapRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 100);
      }
    } catch (err) {
      console.error('Failed to get recommendations:', err);
      setError('Failed to get seat recommendations. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSeatClick = (seat: SeatInfo) => {
    // Open details panel for the clicked seat
    setDetailsSeat(seat);
    setIsDetailsOpen(true);
  };

  const handleDetailsClose = () => {
    setIsDetailsOpen(false);
  };

  const handleSeatSelect = (seat: SeatInfo) => {
    setSelectedSeat(seat);
    setIsDetailsOpen(false);
  };

  const handleSeatCompare = (seat: SeatInfo) => {
    // For now, just select the seat - comparison feature can be added later
    console.log('Compare seat:', seat.seatNumber);
  };

  const handleScrollToSeat = (seat: SeatInfo) => {
    setSelectedCoach(seat.coach);
    setTimeout(() => {
      seatMapRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);
  };

  const handleClearPreferences = () => {
    setRecommendedSeats([]);
    setRecommendations([]);
    setRecommendedSeatRanks(new Map());
    setHasSearched(false);
    setCurrentPreferences(null);
  };

  // Quick adjustments for NoMatchesState
  const quickAdjustments = React.useMemo(() => {
    if (!currentPreferences) return [];
    return createQuickAdjustments(
      currentPreferences,
      (key, value) => {
        if (currentPreferences) {
          const newPrefs = { ...currentPreferences, [key]: value };
          setCurrentPreferences(newPrefs);
          void handlePreferenceSubmit(newPrefs);
        }
      }
    );
  }, [currentPreferences]);

  const coachNumbers = React.useMemo(() => {
    const coaches = new Set(seats.map((s) => s.coach));
    return Array.from(coaches).sort((a, b) => a - b);
  }, [seats]);

  // Build coach info for TrainOverview
  const coachInfoList = React.useMemo((): CoachInfo[] => {
    const coachMap = new Map<number, { class: SeatInfo['class']; seatCount: number }>();

    for (const seat of seats) {
      const existing = coachMap.get(seat.coach);
      if (existing) {
        existing.seatCount++;
      } else {
        coachMap.set(seat.coach, { class: seat.class, seatCount: 1 });
      }
    }

    return Array.from(coachMap.entries())
      .map(([coachNumber, data]) => ({
        coachNumber,
        class: data.class,
        seatCount: data.seatCount,
      }))
      .sort((a, b) => a.coachNumber - b.coachNumber);
  }, [seats]);

  const handleCoachSelect = (coachNumber: number) => {
    // Toggle coach selection - if clicking on already selected coach, deselect it
    setSelectedCoach(selectedCoach === coachNumber ? undefined : coachNumber);
  };

  // Mobile layout
  if (isMobile) {
    return (
      <div className="container py-4 space-y-4">
        <div>
          <h1 className="text-xl font-bold">Seat Map</h1>
          <p className="text-sm text-muted-foreground">
            Find the best seats for your journey
          </p>
        </div>

        {/* Train Type Selector - Compact */}
        <select
          value={trainType}
          onChange={(e) => setTrainType(e.target.value as TrainType)}
          className={cn(
            'flex h-12 w-full rounded-md border border-input bg-background px-3 py-2 text-base',
            'ring-offset-background focus-visible:outline-none focus-visible:ring-2',
            'focus-visible:ring-ring focus-visible:ring-offset-2'
          )}
        >
          {trainTypes.map((t) => (
            <option key={t.value} value={t.value} disabled={!t.available}>
              {t.label}
              {!t.available && ' (Coming soon)'}
            </option>
          ))}
        </select>

        {/* Mobile Preference Form - Collapsible Accordion */}
        <MobilePreferenceForm onSubmit={handlePreferenceSubmit} isLoading={isLoading} />

        {/* Recommendation Results */}
        {hasSearched && recommendations.length > 0 && (
          <RecommendationResults
            recommendations={recommendations}
            onSeatClick={handleSeatClick}
            onScrollToSeat={handleScrollToSeat}
          />
        )}

        {/* No Matches State */}
        {hasSearched && !isLoading && recommendations.length === 0 && (
          <NoMatchesState
            onClearPreferences={handleClearPreferences}
            quickAdjustments={quickAdjustments}
          />
        )}

        {error && (
          <Card className="border-red-200 bg-red-50">
            <CardContent className="py-4 text-red-700">{error}</CardContent>
          </Card>
        )}

        {/* Mobile Seat Map - Single coach view with gestures */}
        <div ref={seatMapRef}>
          {isLoadingSeats ? (
            <Card>
              <CardContent className="py-16 text-center text-muted-foreground">
                Loading seat data...
              </CardContent>
            </Card>
          ) : (
            <MobileSeatMap
              trainType={trainType}
              coach={selectedCoach}
              seats={seats}
              selectedSeat={selectedSeat}
              recommendedSeats={recommendedSeats}
              recommendedSeatRanks={recommendedSeatRanks}
              onSeatClick={handleSeatClick}
              onCoachChange={setSelectedCoach}
            />
          )}
        </div>

        {/* Seat Details - Bottom Sheet on mobile */}
        <SeatDetails
          seat={detailsSeat}
          isOpen={isDetailsOpen}
          onClose={handleDetailsClose}
          onSelect={handleSeatSelect}
          onCompare={handleSeatCompare}
        />
      </div>
    );
  }

  // Desktop layout
  return (
    <div className="container py-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Seat Map</h1>
        <p className="text-muted-foreground">
          Explore Eurostar seat layouts and find the best seats for your journey
        </p>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Sidebar */}
        <div className="lg:w-80 shrink-0 space-y-4">
          {/* Train Type Selector */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Train Type</CardTitle>
            </CardHeader>
            <CardContent>
              <select
                value={trainType}
                onChange={(e) => setTrainType(e.target.value as TrainType)}
                className={cn(
                  'flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm',
                  'ring-offset-background focus-visible:outline-none focus-visible:ring-2',
                  'focus-visible:ring-ring focus-visible:ring-offset-2'
                )}
              >
                {trainTypes.map((t) => (
                  <option key={t.value} value={t.value} disabled={!t.available}>
                    {t.label}
                    {!t.available && ' (Coming soon)'}
                  </option>
                ))}
              </select>
            </CardContent>
          </Card>

          {/* Coach Selector */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Coach Filter</CardTitle>
            </CardHeader>
            <CardContent>
              <select
                value={selectedCoach ?? ''}
                onChange={(e) =>
                  setSelectedCoach(e.target.value ? Number(e.target.value) : undefined)
                }
                className={cn(
                  'flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm',
                  'ring-offset-background focus-visible:outline-none focus-visible:ring-2',
                  'focus-visible:ring-ring focus-visible:ring-offset-2'
                )}
              >
                <option value="">All coaches</option>
                {coachNumbers.map((num) => (
                  <option key={num} value={num}>
                    Coach {num}
                  </option>
                ))}
              </select>
            </CardContent>
          </Card>

          {/* Preference Form */}
          <PreferenceForm onSubmit={handlePreferenceSubmit} isLoading={isLoading} />

          {/* Selected Seat Info */}
          {selectedSeat && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">Selected Seat</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="text-lg font-semibold">
                  Coach {selectedSeat.coach}, Seat {selectedSeat.seatNumber}
                </div>
                <div className="text-sm text-muted-foreground capitalize">
                  {selectedSeat.class.replace('-', ' ')}
                </div>
                {selectedSeat.features.length > 0 && (
                  <div className="text-sm">
                    <span className="font-medium">Features: </span>
                    {selectedSeat.features.join(', ')}
                  </div>
                )}
                {selectedSeat.warnings.length > 0 && (
                  <div className="text-sm text-yellow-600">
                    <span className="font-medium">Warnings: </span>
                    {selectedSeat.warnings.join(', ')}
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>

        {/* Main Content - Seat Map */}
        <div className="flex-1 min-w-0 space-y-4" ref={seatMapRef}>
          {/* Train Overview */}
          {!isLoadingSeats && coachInfoList.length > 0 && (
            <TrainOverview
              coaches={coachInfoList}
              currentCoach={selectedCoach}
              onCoachClick={handleCoachSelect}
            />
          )}

          {/* Recommendation Results */}
          {hasSearched && recommendations.length > 0 && (
            <RecommendationResults
              recommendations={recommendations}
              onSeatClick={handleSeatClick}
              onScrollToSeat={handleScrollToSeat}
            />
          )}

          {/* No Matches State */}
          {hasSearched && !isLoading && recommendations.length === 0 && (
            <NoMatchesState
              onClearPreferences={handleClearPreferences}
              quickAdjustments={quickAdjustments}
            />
          )}

          {error && (
            <Card className="border-red-200 bg-red-50">
              <CardContent className="py-4 text-red-700">{error}</CardContent>
            </Card>
          )}

          {isLoadingSeats ? (
            <Card>
              <CardContent className="py-16 text-center text-muted-foreground">
                Loading seat data...
              </CardContent>
            </Card>
          ) : (
            <SeatMap
              trainType={trainType}
              coach={selectedCoach}
              seats={seats}
              selectedSeat={selectedSeat}
              recommendedSeats={recommendedSeats}
              recommendedSeatRanks={recommendedSeatRanks}
              onSeatClick={handleSeatClick}
            />
          )}
        </div>
      </div>

      {/* Seat Details Panel */}
      <SeatDetails
        seat={detailsSeat}
        isOpen={isDetailsOpen}
        onClose={handleDetailsClose}
        onSelect={handleSeatSelect}
        onCompare={handleSeatCompare}
      />
    </div>
  );
}
