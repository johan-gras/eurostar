'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Settings, Bell, CreditCard, Armchair, ChevronRight } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { usePreferences, useUpdatePreferences } from '@/lib/queries';
import {
  type SeatPosition,
  type SeatDirection,
  type CoachType,
  type Terminal,
  type CompensationType,
  type SeatPreferences,
  TERMINAL_NAMES,
} from '@/lib/api';

const SEAT_POSITIONS: { value: SeatPosition; label: string }[] = [
  { value: 'window', label: 'Window' },
  { value: 'aisle', label: 'Aisle' },
  { value: 'middle', label: 'Middle' },
];

const SEAT_DIRECTIONS: { value: SeatDirection; label: string }[] = [
  { value: 'forward', label: 'Forward facing' },
  { value: 'backward', label: 'Backward facing' },
  { value: 'any', label: 'No preference' },
];

const COACH_TYPES: { value: CoachType; label: string }[] = [
  { value: 'quiet', label: 'Quiet coach' },
  { value: 'standard', label: 'Standard coach' },
  { value: 'any', label: 'No preference' },
];

const TERMINALS: { value: Terminal; label: string }[] = [
  { value: 'st_pancras', label: TERMINAL_NAMES.st_pancras },
  { value: 'paris_nord', label: TERMINAL_NAMES.paris_nord },
  { value: 'brussels_midi', label: TERMINAL_NAMES.brussels_midi },
  { value: 'amsterdam_centraal', label: TERMINAL_NAMES.amsterdam_centraal },
];

const COMPENSATION_TYPES: { value: CompensationType; label: string }[] = [
  { value: 'cash', label: 'Cash refund' },
  { value: 'voucher', label: 'E-voucher (higher value)' },
];

export default function SettingsPage() {
  const { data: preferences, isLoading } = usePreferences();
  const updatePreferences = useUpdatePreferences();

  // Local state for form
  const [seatPosition, setSeatPosition] = useState<SeatPosition | ''>('');
  const [seatDirection, setSeatDirection] = useState<SeatDirection | ''>('');
  const [coachType, setCoachType] = useState<CoachType | ''>('');
  const [wantsTable, setWantsTable] = useState(false);
  const [wantsPowerSocket, setWantsPowerSocket] = useState(false);
  const [queueNotifications, setQueueNotifications] = useState(true);
  const [defaultTerminal, setDefaultTerminal] = useState<Terminal | ''>('');
  const [compensationType, setCompensationType] = useState<CompensationType | ''>('');

  // Sync state when preferences load
  useEffect(() => {
    if (preferences) {
      setSeatPosition(preferences.seatPreferences?.position ?? '');
      setSeatDirection(preferences.seatPreferences?.direction ?? '');
      setCoachType(preferences.seatPreferences?.coach ?? '');
      setWantsTable(preferences.seatPreferences?.table ?? false);
      setWantsPowerSocket(preferences.seatPreferences?.powerSocket ?? false);
      setQueueNotifications(preferences.queueNotifications);
      setDefaultTerminal(preferences.defaultTerminal ?? '');
      setCompensationType(preferences.preferredCompensationType ?? '');
    }
  }, [preferences]);

  const handleSave = async () => {
    const seatPreferences: Record<string, unknown> = {};
    if (seatPosition) seatPreferences['position'] = seatPosition;
    if (seatDirection) seatPreferences['direction'] = seatDirection;
    if (coachType) seatPreferences['coach'] = coachType;
    if (wantsTable) seatPreferences['table'] = wantsTable;
    if (wantsPowerSocket) seatPreferences['powerSocket'] = wantsPowerSocket;

    const hasAnySeatPref = Object.keys(seatPreferences).length > 0;

    await updatePreferences.mutateAsync({
      seatPreferences: hasAnySeatPref ? seatPreferences as SeatPreferences : null,
      queueNotifications,
      defaultTerminal: defaultTerminal || null,
      preferredCompensationType: compensationType || null,
    });
  };

  if (isLoading) {
    return (
      <div className="container py-6">
        <div className="animate-pulse space-y-6">
          <div className="h-8 w-48 bg-muted rounded" />
          <div className="h-64 bg-muted rounded" />
          <div className="h-64 bg-muted rounded" />
        </div>
      </div>
    );
  }

  return (
    <div className="container py-6 space-y-6">
      <div className="flex items-center gap-2">
        <Settings className="h-6 w-6" />
        <h1 className="text-2xl font-bold">Settings</h1>
      </div>

      {/* Seat Preferences */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Armchair className="h-5 w-5" />
            Seat Preferences
          </CardTitle>
          <CardDescription>
            Your preferred seat settings for RailSeatMap recommendations
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm font-medium">Seat Position</label>
              <Select
                value={seatPosition}
                onValueChange={(v) => setSeatPosition(v as SeatPosition)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="No preference" />
                </SelectTrigger>
                <SelectContent>
                  {SEAT_POSITIONS.map((pos) => (
                    <SelectItem key={pos.value} value={pos.value}>
                      {pos.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Travel Direction</label>
              <Select
                value={seatDirection}
                onValueChange={(v) => setSeatDirection(v as SeatDirection)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="No preference" />
                </SelectTrigger>
                <SelectContent>
                  {SEAT_DIRECTIONS.map((dir) => (
                    <SelectItem key={dir.value} value={dir.value}>
                      {dir.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Coach Type</label>
              <Select
                value={coachType}
                onValueChange={(v) => setCoachType(v as CoachType)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="No preference" />
                </SelectTrigger>
                <SelectContent>
                  {COACH_TYPES.map((coach) => (
                    <SelectItem key={coach.value} value={coach.value}>
                      {coach.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium">Table seat</div>
                <div className="text-sm text-muted-foreground">
                  Prefer seats with a table
                </div>
              </div>
              <Switch checked={wantsTable} onCheckedChange={setWantsTable} />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium">Power socket</div>
                <div className="text-sm text-muted-foreground">
                  Prefer seats near power sockets
                </div>
              </div>
              <Switch checked={wantsPowerSocket} onCheckedChange={setWantsPowerSocket} />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Notifications Link */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Notifications
          </CardTitle>
          <CardDescription>
            Configure delay alerts, email preferences, and notification thresholds
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Link href="/settings/notifications">
            <Button variant="outline" className="w-full justify-between">
              Manage notification settings
              <ChevronRight className="h-4 w-4" />
            </Button>
          </Link>
        </CardContent>
      </Card>

      {/* Queue Preferences */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Queue Notifications
          </CardTitle>
          <CardDescription>
            Notification settings for EuroQueue predictions
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="font-medium">Queue alerts</div>
              <div className="text-sm text-muted-foreground">
                Receive notifications about queue times at your default terminal
              </div>
            </div>
            <Switch
              checked={queueNotifications}
              onCheckedChange={setQueueNotifications}
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Default Terminal</label>
            <Select
              value={defaultTerminal}
              onValueChange={(v) => setDefaultTerminal(v as Terminal)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select your usual departure station" />
              </SelectTrigger>
              <SelectContent>
                {TERMINALS.map((terminal) => (
                  <SelectItem key={terminal.value} value={terminal.value}>
                    {terminal.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Compensation Preferences */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Compensation Preferences
          </CardTitle>
          <CardDescription>
            Default settings for AutoClaim compensation
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <label className="text-sm font-medium">Preferred Compensation Type</label>
            <Select
              value={compensationType}
              onValueChange={(v) => setCompensationType(v as CompensationType)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Choose your preferred compensation" />
              </SelectTrigger>
              <SelectContent>
                {COMPENSATION_TYPES.map((comp) => (
                  <SelectItem key={comp.value} value={comp.value}>
                    {comp.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              E-vouchers typically offer 50% more value than cash refunds
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button
          onClick={() => void handleSave()}
          disabled={updatePreferences.isPending}
        >
          {updatePreferences.isPending ? 'Saving...' : 'Save Preferences'}
        </Button>
      </div>
    </div>
  );
}
