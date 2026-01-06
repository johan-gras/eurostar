'use client';

import * as React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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

interface PreferenceFormProps {
  onSubmit: (preferences: SeatPreferences) => void | Promise<void>;
  isLoading?: boolean | undefined;
  matchCount?: number | undefined;
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
    <div className="flex items-center justify-between py-2">
      <label htmlFor={id} className="flex items-center gap-3 cursor-pointer">
        <span className="text-muted-foreground">{icon}</span>
        <span className="text-sm">{label}</span>
      </label>
      <Switch id={id} checked={checked} onCheckedChange={onChange} />
    </div>
  );
}

interface FacingButtonProps {
  selected: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}

function FacingButton({ selected, onClick, icon, label }: FacingButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex flex-col items-center gap-1 p-3 rounded-lg border-2 transition-colors flex-1',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
        selected
          ? 'border-primary bg-primary/10 text-primary'
          : 'border-input bg-background hover:bg-accent hover:text-accent-foreground'
      )}
    >
      {icon}
      <span className="text-xs font-medium">{label}</span>
    </button>
  );
}

interface PresetButtonProps {
  label: string;
  icon: React.ReactNode;
  onClick: () => void;
  description: string;
}

function PresetButton({ label, icon, onClick, description }: PresetButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex items-center gap-2 px-3 py-2 rounded-lg border border-input',
        'bg-background hover:bg-accent hover:text-accent-foreground transition-colors',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
        'text-left'
      )}
    >
      <span className="text-primary">{icon}</span>
      <div className="flex flex-col">
        <span className="text-sm font-medium">{label}</span>
        <span className="text-xs text-muted-foreground">{description}</span>
      </div>
    </button>
  );
}

// Chair icons for facing direction
function ChairForward() {
  return (
    <div className="relative w-6 h-8">
      <div className="absolute bottom-0 w-6 h-5 bg-current rounded-t-sm" />
      <div className="absolute top-0 w-6 h-4 bg-current rounded-t-md opacity-70" />
      <ArrowUp className="absolute -top-1 left-1/2 -translate-x-1/2 w-3 h-3 text-primary" />
    </div>
  );
}

function ChairBackward() {
  return (
    <div className="relative w-6 h-8">
      <div className="absolute top-0 w-6 h-5 bg-current rounded-b-sm" />
      <div className="absolute bottom-0 w-6 h-4 bg-current rounded-b-md opacity-70" />
      <ArrowDown className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-3 h-3 text-primary" />
    </div>
  );
}

function ChairAny() {
  return (
    <div className="relative w-6 h-8 flex items-center justify-center">
      <div className="w-5 h-5 bg-current rounded-sm opacity-70" />
      <Sparkles className="absolute w-4 h-4 text-primary" />
    </div>
  );
}

export function PreferenceForm({ onSubmit, isLoading, matchCount }: PreferenceFormProps) {
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
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Seat Preferences</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Quick Presets */}
          <div className="space-y-3">
            <h4 className="text-sm font-medium text-muted-foreground">Quick Presets</h4>
            <div className="grid grid-cols-1 gap-2">
              <PresetButton
                label="Business Traveler"
                icon={<Briefcase className="w-4 h-4" />}
                onClick={() => applyPreset('business')}
                description="Window, quiet zone"
              />
              <PresetButton
                label="Family"
                icon={<Users className="w-4 h-4" />}
                onClick={() => applyPreset('family')}
                description="Table seating, together"
              />
              <PresetButton
                label="Quick Trip"
                icon={<Zap className="w-4 h-4" />}
                onClick={() => applyPreset('quick')}
                description="Aisle seat, near exit"
              />
            </div>
          </div>

          {/* Divider */}
          <div className="border-t" />

          {/* Coach Class Select */}
          <div className="space-y-2">
            <label htmlFor="coachClass" className="text-sm font-medium">
              Coach Class
            </label>
            <select
              id="coachClass"
              value={preferences.coachClass}
              onChange={(e) => updatePreference('coachClass', e.target.value as CoachClass)}
              className={cn(
                'flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm',
                'ring-offset-background focus-visible:outline-none focus-visible:ring-2',
                'focus-visible:ring-ring focus-visible:ring-offset-2'
              )}
            >
              <option value="standard">Standard</option>
              <option value="standard-premier">Standard Premier</option>
              <option value="business-premier">Business Premier</option>
            </select>
          </div>

          {/* Preferences Group */}
          <div className="space-y-1">
            <h4 className="text-sm font-medium mb-3">Preferences</h4>
            <div className="divide-y">
              <ToggleOption
                id="preferWindow"
                label="Window seat"
                checked={preferences.preferWindow}
                onChange={(checked) => updatePreference('preferWindow', checked)}
                icon={<Sun className="w-4 h-4" />}
              />
              <ToggleOption
                id="preferQuiet"
                label="Quiet zone"
                checked={preferences.preferQuiet}
                onChange={(checked) => updatePreference('preferQuiet', checked)}
                icon={<VolumeX className="w-4 h-4" />}
              />
              <ToggleOption
                id="preferTable"
                label="Table seat"
                checked={preferences.preferTable}
                onChange={(checked) => updatePreference('preferTable', checked)}
                icon={<LayoutGrid className="w-4 h-4" />}
              />
              <ToggleOption
                id="needsAccessible"
                label="Accessible seat"
                checked={preferences.needsAccessible}
                onChange={(checked) => updatePreference('needsAccessible', checked)}
                icon={<Accessibility className="w-4 h-4" />}
              />
            </div>
          </div>

          {/* Avoid Group */}
          <div className="space-y-1">
            <h4 className="text-sm font-medium mb-3">Avoid</h4>
            <div className="divide-y">
              <ToggleOption
                id="avoidToilet"
                label="Near toilet"
                checked={preferences.avoidToilet}
                onChange={(checked) => updatePreference('avoidToilet', checked)}
                icon={<Ban className="w-4 h-4" />}
              />
              <ToggleOption
                id="avoidNoWindow"
                label="No window"
                checked={preferences.avoidNoWindow}
                onChange={(checked) => updatePreference('avoidNoWindow', checked)}
                icon={<EyeOff className="w-4 h-4" />}
              />
            </div>
          </div>

          {/* Travel Party Group */}
          <div className="space-y-3">
            <h4 className="text-sm font-medium">Travel Party</h4>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Users className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm">Party size</span>
              </div>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={decrementPartySize}
                  disabled={preferences.travelingTogether <= 1}
                  className={cn(
                    'flex items-center justify-center w-8 h-8 rounded-md border border-input',
                    'bg-background hover:bg-accent hover:text-accent-foreground transition-colors',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                    'disabled:opacity-50 disabled:cursor-not-allowed'
                  )}
                >
                  <Minus className="w-4 h-4" />
                </button>
                <span className="w-10 text-center text-lg font-medium">
                  {preferences.travelingTogether}
                </span>
                <button
                  type="button"
                  onClick={incrementPartySize}
                  disabled={preferences.travelingTogether >= 4}
                  className={cn(
                    'flex items-center justify-center w-8 h-8 rounded-md border border-input',
                    'bg-background hover:bg-accent hover:text-accent-foreground transition-colors',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                    'disabled:opacity-50 disabled:cursor-not-allowed'
                  )}
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          {/* Facing Direction */}
          <div className="space-y-3">
            <h4 className="text-sm font-medium">Facing Direction</h4>
            <div className="flex gap-2">
              <FacingButton
                selected={preferences.facingPreference === 'forward'}
                onClick={() => updatePreference('facingPreference', 'forward')}
                icon={<ChairForward />}
                label="Forward"
              />
              <FacingButton
                selected={preferences.facingPreference === 'any'}
                onClick={() => updatePreference('facingPreference', 'any')}
                icon={<ChairAny />}
                label="Any"
              />
              <FacingButton
                selected={preferences.facingPreference === 'backward'}
                onClick={() => updatePreference('facingPreference', 'backward')}
                icon={<ChairBackward />}
                label="Backward"
              />
            </div>
          </div>

          {/* Submit Button */}
          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Finding seats...
              </>
            ) : matchCount !== undefined ? (
              `Find Best Seats (${matchCount} matches)`
            ) : (
              'Find Best Seats'
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
