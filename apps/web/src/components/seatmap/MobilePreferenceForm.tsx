'use client';

import * as React from 'react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';
import {
  Briefcase,
  Users,
  Zap,
  Sun,
  VolumeX,
  LayoutGrid,
  Accessibility,
  Ban,
  EyeOff,
  Minus,
  Plus,
  ArrowUp,
  ArrowDown,
  Loader2,
  Sparkles,
  ChevronDown,
  ChevronUp,
  Settings2,
} from 'lucide-react';

type FacingPreference = 'forward' | 'backward' | 'any';
type CoachClass = 'standard' | 'standard-premier' | 'business-premier';

export interface SeatPreferences {
  preferWindow: boolean;
  preferQuiet: boolean;
  preferTable: boolean;
  avoidToilet: boolean;
  avoidNoWindow: boolean;
  needsAccessible: boolean;
  travelingTogether: number;
  facingPreference: FacingPreference;
  coachClass: CoachClass;
}

interface MobilePreferenceFormProps {
  onSubmit: (preferences: SeatPreferences) => void | Promise<void>;
  isLoading?: boolean;
  matchCount?: number;
}

interface ToggleOptionProps {
  id: string;
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  icon: React.ReactNode;
}

function ToggleOption({ id, label, checked, onChange, icon }: ToggleOptionProps) {
  return (
    <div className="flex items-center justify-between py-3">
      <label htmlFor={id} className="flex items-center gap-3 cursor-pointer">
        <span className="text-muted-foreground">{icon}</span>
        <span className="text-sm">{label}</span>
      </label>
      <Switch id={id} checked={checked} onCheckedChange={onChange} />
    </div>
  );
}

interface PresetButtonProps {
  label: string;
  icon: React.ReactNode;
  onClick: () => void;
  active?: boolean;
}

function PresetButton({ label, icon, onClick, active }: PresetButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex flex-col items-center gap-1 px-4 py-3 rounded-lg border transition-all',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        'min-w-[80px] flex-1',
        active
          ? 'border-primary bg-primary/10 text-primary'
          : 'border-input bg-background hover:bg-accent'
      )}
    >
      {icon}
      <span className="text-xs font-medium">{label}</span>
    </button>
  );
}

// Chair icons for facing direction
function ChairForward() {
  return (
    <div className="relative w-5 h-6">
      <div className="absolute bottom-0 w-5 h-4 bg-current rounded-t-sm" />
      <div className="absolute top-0 w-5 h-3 bg-current rounded-t-md opacity-70" />
      <ArrowUp className="absolute -top-0.5 left-1/2 -translate-x-1/2 w-2.5 h-2.5 text-primary" />
    </div>
  );
}

function ChairBackward() {
  return (
    <div className="relative w-5 h-6">
      <div className="absolute top-0 w-5 h-4 bg-current rounded-b-sm" />
      <div className="absolute bottom-0 w-5 h-3 bg-current rounded-b-md opacity-70" />
      <ArrowDown className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 w-2.5 h-2.5 text-primary" />
    </div>
  );
}

function ChairAny() {
  return (
    <div className="relative w-5 h-6 flex items-center justify-center">
      <div className="w-4 h-4 bg-current rounded-sm opacity-70" />
      <Sparkles className="absolute w-3 h-3 text-primary" />
    </div>
  );
}

export function MobilePreferenceForm({ onSubmit, isLoading, matchCount }: MobilePreferenceFormProps) {
  const [isExpanded, setIsExpanded] = React.useState(false);
  const [preferences, setPreferences] = React.useState<SeatPreferences>({
    preferWindow: true,
    preferQuiet: false,
    preferTable: false,
    avoidToilet: true,
    avoidNoWindow: true,
    needsAccessible: false,
    travelingTogether: 1,
    facingPreference: 'any',
    coachClass: 'standard',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    void onSubmit(preferences);
  };

  const updatePreference = <K extends keyof SeatPreferences>(
    key: K,
    value: SeatPreferences[K]
  ) => {
    setPreferences((prev) => ({ ...prev, [key]: value }));
  };

  const applyPreset = (preset: 'business' | 'family' | 'quick') => {
    switch (preset) {
      case 'business':
        setPreferences((prev) => ({
          ...prev,
          preferWindow: true,
          preferQuiet: true,
          preferTable: false,
          needsAccessible: false,
        }));
        break;
      case 'family':
        setPreferences((prev) => ({
          ...prev,
          preferWindow: false,
          preferQuiet: false,
          preferTable: true,
          travelingTogether: Math.max(2, prev.travelingTogether),
        }));
        break;
      case 'quick':
        setPreferences((prev) => ({
          ...prev,
          preferWindow: false,
          preferQuiet: false,
          preferTable: false,
          needsAccessible: false,
        }));
        break;
    }
  };

  const decrementPartySize = () => {
    updatePreference('travelingTogether', Math.max(1, preferences.travelingTogether - 1));
  };

  const incrementPartySize = () => {
    updatePreference('travelingTogether', Math.min(4, preferences.travelingTogether + 1));
  };

  return (
    <div className="bg-background border rounded-lg overflow-hidden">
      {/* Collapsible Header */}
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        className={cn(
          'w-full flex items-center justify-between p-4',
          'hover:bg-accent/50 transition-colors',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset'
        )}
      >
        <div className="flex items-center gap-3">
          <Settings2 className="w-5 h-5 text-muted-foreground" />
          <span className="font-medium">Seat Preferences</span>
        </div>
        {isExpanded ? (
          <ChevronUp className="w-5 h-5 text-muted-foreground" />
        ) : (
          <ChevronDown className="w-5 h-5 text-muted-foreground" />
        )}
      </button>

      {/* Collapsible Content */}
      <div
        className={cn(
          'overflow-hidden transition-all duration-300 ease-in-out',
          isExpanded ? 'max-h-[2000px] opacity-100' : 'max-h-0 opacity-0'
        )}
      >
        <form onSubmit={handleSubmit} className="p-4 pt-0 space-y-5">
          {/* Quick Presets - Horizontal scrollable */}
          <div className="space-y-2">
            <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Quick Presets
            </h4>
            <div className="flex gap-2">
              <PresetButton
                label="Business"
                icon={<Briefcase className="w-5 h-5" />}
                onClick={() => applyPreset('business')}
              />
              <PresetButton
                label="Family"
                icon={<Users className="w-5 h-5" />}
                onClick={() => applyPreset('family')}
              />
              <PresetButton
                label="Quick"
                icon={<Zap className="w-5 h-5" />}
                onClick={() => applyPreset('quick')}
              />
            </div>
          </div>

          {/* Coach Class */}
          <div className="space-y-2">
            <label htmlFor="coachClass" className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Coach Class
            </label>
            <select
              id="coachClass"
              value={preferences.coachClass}
              onChange={(e) => updatePreference('coachClass', e.target.value as CoachClass)}
              className={cn(
                'flex h-12 w-full rounded-md border border-input bg-background px-3 py-2 text-base',
                'ring-offset-background focus-visible:outline-none focus-visible:ring-2',
                'focus-visible:ring-ring focus-visible:ring-offset-2'
              )}
            >
              <option value="standard">Standard</option>
              <option value="standard-premier">Standard Premier</option>
              <option value="business-premier">Business Premier</option>
            </select>
          </div>

          {/* Preferences */}
          <div className="space-y-1">
            <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
              Preferences
            </h4>
            <div className="divide-y">
              <ToggleOption
                id="preferWindow"
                label="Window seat"
                checked={preferences.preferWindow}
                onChange={(checked) => updatePreference('preferWindow', checked)}
                icon={<Sun className="w-5 h-5" />}
              />
              <ToggleOption
                id="preferQuiet"
                label="Quiet zone"
                checked={preferences.preferQuiet}
                onChange={(checked) => updatePreference('preferQuiet', checked)}
                icon={<VolumeX className="w-5 h-5" />}
              />
              <ToggleOption
                id="preferTable"
                label="Table seat"
                checked={preferences.preferTable}
                onChange={(checked) => updatePreference('preferTable', checked)}
                icon={<LayoutGrid className="w-5 h-5" />}
              />
              <ToggleOption
                id="needsAccessible"
                label="Accessible"
                checked={preferences.needsAccessible}
                onChange={(checked) => updatePreference('needsAccessible', checked)}
                icon={<Accessibility className="w-5 h-5" />}
              />
            </div>
          </div>

          {/* Avoid */}
          <div className="space-y-1">
            <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
              Avoid
            </h4>
            <div className="divide-y">
              <ToggleOption
                id="avoidToilet"
                label="Near toilet"
                checked={preferences.avoidToilet}
                onChange={(checked) => updatePreference('avoidToilet', checked)}
                icon={<Ban className="w-5 h-5" />}
              />
              <ToggleOption
                id="avoidNoWindow"
                label="No window"
                checked={preferences.avoidNoWindow}
                onChange={(checked) => updatePreference('avoidNoWindow', checked)}
                icon={<EyeOff className="w-5 h-5" />}
              />
            </div>
          </div>

          {/* Travel Party */}
          <div className="space-y-2">
            <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Travel Party
            </h4>
            <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
              <div className="flex items-center gap-3">
                <Users className="w-5 h-5 text-muted-foreground" />
                <span className="text-sm font-medium">Party size</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={decrementPartySize}
                  disabled={preferences.travelingTogether <= 1}
                  className={cn(
                    'flex items-center justify-center w-10 h-10 rounded-full border border-input',
                    'bg-background hover:bg-accent transition-colors',
                    'disabled:opacity-50 disabled:cursor-not-allowed'
                  )}
                >
                  <Minus className="w-4 h-4" />
                </button>
                <span className="w-8 text-center text-lg font-bold tabular-nums">
                  {preferences.travelingTogether}
                </span>
                <button
                  type="button"
                  onClick={incrementPartySize}
                  disabled={preferences.travelingTogether >= 4}
                  className={cn(
                    'flex items-center justify-center w-10 h-10 rounded-full border border-input',
                    'bg-background hover:bg-accent transition-colors',
                    'disabled:opacity-50 disabled:cursor-not-allowed'
                  )}
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          {/* Facing Direction */}
          <div className="space-y-2">
            <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Facing Direction
            </h4>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => updatePreference('facingPreference', 'forward')}
                className={cn(
                  'flex flex-col items-center gap-1 p-3 rounded-lg border-2 flex-1 transition-all',
                  preferences.facingPreference === 'forward'
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-input bg-background hover:bg-accent'
                )}
              >
                <ChairForward />
                <span className="text-xs font-medium">Forward</span>
              </button>
              <button
                type="button"
                onClick={() => updatePreference('facingPreference', 'any')}
                className={cn(
                  'flex flex-col items-center gap-1 p-3 rounded-lg border-2 flex-1 transition-all',
                  preferences.facingPreference === 'any'
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-input bg-background hover:bg-accent'
                )}
              >
                <ChairAny />
                <span className="text-xs font-medium">Any</span>
              </button>
              <button
                type="button"
                onClick={() => updatePreference('facingPreference', 'backward')}
                className={cn(
                  'flex flex-col items-center gap-1 p-3 rounded-lg border-2 flex-1 transition-all',
                  preferences.facingPreference === 'backward'
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-input bg-background hover:bg-accent'
                )}
              >
                <ChairBackward />
                <span className="text-xs font-medium">Backward</span>
              </button>
            </div>
          </div>

          {/* Submit Button - Large touch target */}
          <Button type="submit" className="w-full h-12 text-base" disabled={isLoading}>
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                Finding seats...
              </>
            ) : matchCount !== undefined ? (
              `Find Best Seats (${matchCount} matches)`
            ) : (
              'Find Best Seats'
            )}
          </Button>
        </form>
      </div>
    </div>
  );
}
