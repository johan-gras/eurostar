'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Search,
  SlidersHorizontal,
  Sun,
  VolumeX,
  LayoutGrid,
  Ban,
  RefreshCw,
} from 'lucide-react';

interface QuickFilterAdjustment {
  label: string;
  icon: React.ReactNode;
  action: () => void;
}

interface NoMatchesStateProps {
  onAdjustFilters?: () => void;
  onClearPreferences?: () => void;
  quickAdjustments?: QuickFilterAdjustment[];
}

export function NoMatchesState({
  onAdjustFilters,
  onClearPreferences,
  quickAdjustments,
}: NoMatchesStateProps) {
  return (
    <Card className="border-amber-200 bg-amber-50/50">
      <CardContent className="py-8">
        <div className="flex flex-col items-center text-center space-y-4">
          {/* Icon */}
          <div className="w-16 h-16 rounded-full bg-amber-100 flex items-center justify-center">
            <Search className="w-8 h-8 text-amber-600" />
          </div>

          {/* Message */}
          <div className="space-y-2">
            <h3 className="text-lg font-semibold text-amber-900">
              No seats match your preferences
            </h3>
            <p className="text-sm text-amber-700 max-w-md">
              Try relaxing some of your preferences to see more options.
              You can toggle off specific requirements or try a different coach class.
            </p>
          </div>

          {/* Quick adjustment buttons */}
          {quickAdjustments && quickAdjustments.length > 0 && (
            <div className="space-y-2 w-full max-w-sm">
              <p className="text-xs text-amber-600 font-medium">
                Quick adjustments:
              </p>
              <div className="flex flex-wrap gap-2 justify-center">
                {quickAdjustments.map((adjustment, index) => (
                  <Button
                    key={index}
                    variant="outline"
                    size="sm"
                    onClick={adjustment.action}
                    className="border-amber-300 bg-white hover:bg-amber-100 text-amber-800"
                  >
                    {adjustment.icon}
                    <span className="ml-1.5">{adjustment.label}</span>
                  </Button>
                ))}
              </div>
            </div>
          )}

          {/* Action buttons */}
          <div className="flex gap-3 pt-2">
            {onAdjustFilters && (
              <Button
                variant="outline"
                onClick={onAdjustFilters}
                className="border-amber-400 text-amber-700 hover:bg-amber-100"
              >
                <SlidersHorizontal className="w-4 h-4 mr-2" />
                Adjust Filters
              </Button>
            )}
            {onClearPreferences && (
              <Button
                variant="default"
                onClick={onClearPreferences}
                className="bg-amber-600 hover:bg-amber-700 text-white"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Reset Preferences
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Helper to create common quick adjustments
export function createQuickAdjustments(
  currentPreferences: {
    preferWindow: boolean;
    preferQuiet: boolean;
    preferTable: boolean;
    avoidToilet: boolean;
    avoidNoWindow: boolean;
  },
  updatePreference: (key: string, value: boolean) => void
): QuickFilterAdjustment[] {
  const adjustments: QuickFilterAdjustment[] = [];

  if (currentPreferences.preferWindow) {
    adjustments.push({
      label: 'Allow non-window',
      icon: <Sun className="w-4 h-4" />,
      action: () => updatePreference('preferWindow', false),
    });
  }

  if (currentPreferences.preferQuiet) {
    adjustments.push({
      label: 'Allow any zone',
      icon: <VolumeX className="w-4 h-4" />,
      action: () => updatePreference('preferQuiet', false),
    });
  }

  if (currentPreferences.preferTable) {
    adjustments.push({
      label: 'Allow non-table',
      icon: <LayoutGrid className="w-4 h-4" />,
      action: () => updatePreference('preferTable', false),
    });
  }

  if (currentPreferences.avoidToilet) {
    adjustments.push({
      label: 'Allow near toilet',
      icon: <Ban className="w-4 h-4" />,
      action: () => updatePreference('avoidToilet', false),
    });
  }

  return adjustments.slice(0, 3); // Max 3 quick adjustments
}
