import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch, RootState } from '@/store';
import { fetchPresets, setActivePreset } from '@/store/slices/presetsSlice';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { fetchStations } from '@/store/slices/stationsSlice';
import StationGraph from '@/components/StationGraph';
import { AlertOctagon } from 'lucide-react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { pb } from '@/lib/pocketbase';

export function MainDashboard() {
  const dispatch = useDispatch<AppDispatch>();
  const {
    presets,
    activePresetId,
    loading: presetsLoading,
  } = useSelector((state: RootState) => state.presets);

  const [selectedPresetId, setSelectedPresetId] = useState<string | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [loadingApply, setLoadingApply] = useState(false);
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  const { stations } = useSelector((state: RootState) => state.stations);

  useEffect(() => {
    dispatch(fetchStations());
  }, [dispatch]);

  const activeStations = stations.filter((s) =>
    s.stationLinks.some((l) => l.active),
  );
  useEffect(() => {
    dispatch(fetchPresets());
  }, [dispatch]);

  const openConfirm = (presetId: string) => {
    setSelectedPresetId(presetId);
    setIsDialogOpen(true);
    setMessage(null);
    setPassword('');
  };

  const handleConfirmApply = async () => {
    if (!selectedPresetId) return;
    setLoadingApply(true);
    setMessage(null);
    try {
      // Call backend preset set endpoint
      await pb.send(`/api/presets/${selectedPresetId}/set`, { method: 'POST' });
      dispatch(setActivePreset(selectedPresetId));
    } catch (err: any) {
      console.error('Failed to apply preset:', err);
      const text = err?.message || 'Failed to apply preset to stations';
      setMessage({ type: 'error', text });
    } finally {
      setLoadingApply(false);
      // keep dialog open briefly to show result, then close
      setTimeout(() => {
        setIsDialogOpen(false);
      }, 800);
    }
  };

  const selectedPreset = presets.find((p) => p.id === selectedPresetId) || null;

  return (
    <div
      className="flex-1 overflow-y-auto bg-background p-8 min-h-0 scrollbar"
      data-cy="dashboard-widget"
    >
      <div className="max-w-7xl mx-auto">
        <div className="max-w-3xl mx-auto">
          {activePresetId && (
            <div className="mb-4">
              <Card>
                <CardHeader>
                  <CardTitle>Active Preset</CardTitle>
                  <CardDescription>
                    Currently applied configuration
                  </CardDescription>
                </CardHeader>

                <CardContent>
                  {(() => {
                    const ap = presets.find((p) => p.id === activePresetId);
                    if (!ap) return null;
                    return (
                      <div className="flex items-center justify-between gap-4">
                        <div className="flex items-center gap-4">
                          <div
                            className="h-12 w-12 rounded-md shadow-md"
                            style={{ backgroundColor: ap.color }}
                          />
                          <div>
                            <div
                              className="text-xl font-bold"
                              data-cy="active-preset"
                              data-active-preset={ap.name}
                            >
                              {ap.name}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              Active preset • {ap.expand?.actions?.length || 0}{' '}
                              action(s)
                            </div>
                          </div>
                        </div>
                        <div>
                          <Button
                            variant="ghost"
                            onClick={() => openConfirm(ap.id)}
                            style={{ borderColor: ap.color, color: ap.color }}
                          >
                            Re-apply
                          </Button>
                        </div>
                      </div>
                    );
                  })()}
                </CardContent>
              </Card>
            </div>
          )}

          <Card>
            <CardHeader>
              <CardTitle>Presets</CardTitle>
              <CardDescription>
                Choose a preset and confirm to apply it to all stations
              </CardDescription>
            </CardHeader>
            <CardContent>
              {presetsLoading ? (
                <p>Loading presets...</p>
              ) : presets.length === 0 ? (
                <p className="text-muted-foreground">No presets available</p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {presets.map((preset) => (
                    <div
                      data-cy={`preset-item-${preset.name}`}
                      key={preset.id}
                      className="flex items-center justify-between p-3 border rounded-md"
                      style={{ borderColor: preset.color }}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className="h-6 w-6 rounded-full shadow-sm"
                          style={{ backgroundColor: preset.color }}
                        />
                        <div>
                          <div className="font-semibold">{preset.name}</div>
                          <div className="text-sm text-muted-foreground">
                            {preset.expand?.actions?.length || 0} action(s)
                          </div>
                        </div>
                      </div>
                      <div>
                        <Button
                          data-cy={`preset-change-button-${preset.name}`}
                          variant={
                            activePresetId === preset.id
                              ? 'secondary'
                              : 'outline'
                          }
                          disabled={activePresetId === preset.id}
                          onClick={() => openConfirm(preset.id)}
                        >
                          Change
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {message && (
            <div
              className={`mt-4 p-3 rounded-md ${message.type === 'success' ? 'bg-green-50 text-green-800 border border-green-100' : 'bg-destructive/10 text-destructive border border-destructive/20'}`}
            >
              {message.text}
            </div>
          )}

          <Dialog
            open={isDialogOpen}
            onOpenChange={(v) => {
              setIsDialogOpen(v);
              if (!v) {
                setSelectedPresetId(null);
                setMessage(null);
                setPassword('');
              }
            }}
          >
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Confirm apply preset</DialogTitle>
                <DialogDescription>
                  This will send the preset to all configured station links.
                  Stations may take a few seconds to apply the new preset.
                </DialogDescription>
              </DialogHeader>

              <div className="mt-4 space-y-4">
                {selectedPreset ? (
                  <div className="flex items-center gap-4">
                    <div
                      className="h-10 w-10 rounded-md shadow-sm"
                      style={{ backgroundColor: selectedPreset.color }}
                    />
                    <div>
                      <div className="font-semibold text-lg">
                        {selectedPreset.name}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {selectedPreset.expand?.actions?.length || 0} action(s)
                      </div>
                    </div>
                  </div>
                ) : (
                  <div>Loading preset...</div>
                )}
                {selectedPreset?.passwordRequired && (
                  <div className="space-y-2">
                    <label className="text-sm font-medium">
                      Password required
                    </label>

                    <Input
                      data-cy={`preset-change-password`}
                      type="password"
                      value={password}
                      onChange={(e) => {
                        setPassword(e.target.value);

                        if (message?.type === 'error') {
                          setMessage(null);
                        }
                      }}
                      placeholder="Enter password"
                    />
                  </div>
                )}
                {message && (
                  <div
                    className={`p-2 rounded-md ${message.type === 'success' ? 'bg-green-50 text-green-800' : 'bg-destructive/10 text-destructive'}`}
                  >
                    {message.text}
                  </div>
                )}
              </div>

              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => {
                    setIsDialogOpen(false);
                    setSelectedPresetId(null);
                    setMessage(null);
                    setPassword('');
                  }}
                  disabled={loadingApply}
                >
                  Cancel
                </Button>
                <Button
                  data-cy="submit-apply-preset"
                  onClick={() => {
                    if (selectedPreset?.passwordRequired) {
                      if (password !== 'Preset1!') {
                        setMessage({
                          type: 'error',
                          text: 'Incorrect password',
                        });
                        return;
                      }
                    }
                    handleConfirmApply();
                  }}
                  style={
                    selectedPreset
                      ? {
                          backgroundColor: selectedPreset.color,
                          borderColor: selectedPreset.color,
                        }
                      : undefined
                  }
                  disabled={loadingApply || !selectedPreset}
                >
                  {loadingApply ? 'Applying...' : 'Apply preset'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
        <div className="mt-8">
          {activeStations.length > 0 ? (
            <div className="flex flex-wrap justify-center gap-6 w-full">
              {activeStations.map((activeStation) => {
                const activeLink = activeStation.stationLinks.find(
                  (l) => l.active,
                );
                const isReachable = activeLink?.reachable !== false;

                return (
                  <Card
                    key={activeStation.id}
                    className={`
    w-full md:w-[calc(50%-0.75rem)] lg:w-[calc(33.333%-1rem)]
    relative overflow-hidden border-2
    ${
      isReachable
        ? 'border-cyan-400 shadow-[0_0_25px_rgba(34,211,238,0.7)]'
        : 'border-red-600 shadow-[0_0_25px_rgba(220,38,38,0.7)]'
    }
    animate-softPulse
  `}
                  >
                    {/* animated glow ring */}
                    <div
                      className={`
      pointer-events-none absolute inset-0 rounded-xl ring-2
      ${isReachable ? 'ring-cyan-400/70' : 'ring-red-600/70'}
      ring-offset-2 ring-offset-background
      animate-pulse
    `}
                    />{' '}
                    <CardHeader>
                      <CardTitle className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <span className="font-semibold text-primary">
                            {activeStation.name}
                          </span>

                          {isReachable ? (
                            <Badge variant="default">Active</Badge>
                          ) : (
                            <Badge variant="destructive">
                              Unreachable Active
                            </Badge>
                          )}
                          {activeLink?.counter !== undefined && (
                            <Badge variant="secondary">
                              Counter: {activeLink.counter}
                            </Badge>
                          )}
                        </div>
                      </CardTitle>

                      <CardDescription>
                        Currently active station
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <StationGraph
                        station={activeStation}
                        onActivate={() => {}}
                      />
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          ) : (
            <Card
              className="
        border-2 border-red-900/60
        bg-destructive text-destructive-foreground
        shadow-[0_0_25px_rgba(220,38,38,0.35)]
        animate-softPulse
      "
            >
              <CardContent className="py-8 flex flex-col items-center justify-center gap-3">
                <AlertOctagon className="h-10 w-10 animate-pulse" />

                <div className="text-lg font-semibold">No Active Station</div>

                <div className="text-sm opacity-90 text-center max-w-xs">
                  No station is currently active. Activate a station to start
                  streaming.
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

export default MainDashboard;
