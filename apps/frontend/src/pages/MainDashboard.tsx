import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch, RootState } from '@/store';
import { fetchPresets, setActivePreset } from '@/store/slices/presetsSlice';
import { Button } from '@/components/ui/button';
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
  DialogTrigger,
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
  const [message, setMessage] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  useEffect(() => {
    dispatch(fetchPresets());
  }, [dispatch]);

  const openConfirm = (presetId: string) => {
    setSelectedPresetId(presetId);
    setIsDialogOpen(true);
    setMessage(null);
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
    <div className="min-h-screen bg-background p-8">
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
                          <div className="text-xl font-bold">{ap.name}</div>
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
                        variant={
                          activePresetId === preset.id ? 'secondary' : 'outline'
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
                }}
                disabled={loadingApply}
              >
                Cancel
              </Button>
              <Button
                onClick={handleConfirmApply}
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
    </div>
  );
}

export default MainDashboard;
