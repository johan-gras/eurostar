'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Bell, Mail, Clock, ArrowLeft } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { usePreferences, useUpdatePreferences } from '@/lib/queries';

const DELAY_THRESHOLDS = [
  { value: 15, label: '15 minutes' },
  { value: 30, label: '30 minutes' },
  { value: 60, label: '1 hour' },
  { value: 120, label: '2 hours' },
];

export default function NotificationSettingsPage() {
  const { data: preferences, isLoading } = usePreferences();
  const updatePreferences = useUpdatePreferences();

  // Local state for form
  const [delayAlertsEnabled, setDelayAlertsEnabled] = useState(true);
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [pushNotifications, setPushNotifications] = useState(false);
  const [delayThreshold, setDelayThreshold] = useState(30);
  const [queueNotifications, setQueueNotifications] = useState(true);
  const [claimDeadlineReminders, setClaimDeadlineReminders] = useState(true);
  const [trainDepartureReminders, setTrainDepartureReminders] = useState(false);

  // Sync state when preferences load
  useEffect(() => {
    if (preferences) {
      setQueueNotifications(preferences.queueNotifications);
      // Other notification settings would come from preferences when the API supports them
    }
  }, [preferences]);

  const handleSave = async () => {
    await updatePreferences.mutateAsync({
      queueNotifications,
      // Future: add other notification settings when API supports them
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
      <div className="flex items-center gap-4">
        <Link href="/settings">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div className="flex items-center gap-2">
          <Bell className="h-6 w-6" />
          <h1 className="text-2xl font-bold">Notification Settings</h1>
        </div>
      </div>

      {/* Delay Alerts */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Delay Alerts
          </CardTitle>
          <CardDescription>
            Get notified when your trains are delayed
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <div className="font-medium">Enable delay alerts</div>
              <div className="text-sm text-muted-foreground">
                Receive notifications when your booked trains experience delays
              </div>
            </div>
            <Switch
              checked={delayAlertsEnabled}
              onCheckedChange={setDelayAlertsEnabled}
            />
          </div>

          {delayAlertsEnabled && (
            <>
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium">Notification threshold</label>
                  <p className="text-sm text-muted-foreground mb-4">
                    Only notify when delay exceeds this duration
                  </p>
                  <Select
                    value={delayThreshold.toString()}
                    onValueChange={(v) => setDelayThreshold(parseInt(v, 10))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {DELAY_THRESHOLDS.map((threshold) => (
                        <SelectItem key={threshold.value} value={threshold.value.toString()}>
                          {threshold.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Or set a custom threshold</label>
                  <div className="flex items-center gap-4">
                    <Slider
                      value={[delayThreshold]}
                      onValueChange={(v) => setDelayThreshold(v[0] ?? delayThreshold)}
                      min={5}
                      max={180}
                      step={5}
                      className="flex-1"
                    />
                    <span className="text-sm font-medium w-20 text-right">
                      {delayThreshold} min
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium">Claim deadline reminders</div>
                  <div className="text-sm text-muted-foreground">
                    Get reminded before compensation claim deadlines expire
                  </div>
                </div>
                <Switch
                  checked={claimDeadlineReminders}
                  onCheckedChange={setClaimDeadlineReminders}
                />
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Email Preferences */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Email Notifications
          </CardTitle>
          <CardDescription>
            Configure how you receive email notifications
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="font-medium">Email notifications</div>
              <div className="text-sm text-muted-foreground">
                Receive notifications via email
              </div>
            </div>
            <Switch
              checked={emailNotifications}
              onCheckedChange={setEmailNotifications}
            />
          </div>

          {emailNotifications && (
            <>
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium">Delay alerts</div>
                  <div className="text-sm text-muted-foreground">
                    Email me when my train is delayed
                  </div>
                </div>
                <Switch
                  checked={delayAlertsEnabled}
                  onCheckedChange={setDelayAlertsEnabled}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium">Claim status updates</div>
                  <div className="text-sm text-muted-foreground">
                    Email me when my compensation claim status changes
                  </div>
                </div>
                <Switch
                  checked={claimDeadlineReminders}
                  onCheckedChange={setClaimDeadlineReminders}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium">Train departure reminders</div>
                  <div className="text-sm text-muted-foreground">
                    Email me 24 hours before my train departs
                  </div>
                </div>
                <Switch
                  checked={trainDepartureReminders}
                  onCheckedChange={setTrainDepartureReminders}
                />
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Queue Notifications */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Queue Notifications
          </CardTitle>
          <CardDescription>
            EuroQueue terminal wait time alerts
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
        </CardContent>
      </Card>

      {/* Push Notifications */}
      <Card>
        <CardHeader>
          <CardTitle>Push Notifications</CardTitle>
          <CardDescription>
            Browser and mobile push notifications
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="font-medium">Enable push notifications</div>
              <div className="text-sm text-muted-foreground">
                Receive real-time notifications in your browser
              </div>
            </div>
            <Switch
              checked={pushNotifications}
              onCheckedChange={setPushNotifications}
            />
          </div>
          {!pushNotifications && (
            <p className="text-sm text-muted-foreground">
              Push notifications require browser permission. Enable to receive instant delay alerts.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button
          onClick={() => void handleSave()}
          disabled={updatePreferences.isPending}
        >
          {updatePreferences.isPending ? 'Saving...' : 'Save Notification Settings'}
        </Button>
      </div>
    </div>
  );
}
