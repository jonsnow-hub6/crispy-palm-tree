import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch, RootState } from '@/store';
import { fetchPresets, setActivePreset } from '@/store/slices/presetsSlice';
import { fetchStations } from '@/store/slices/stationsSlice';
import { fetchProjects } from '@/store/slices/projectsSlice';
import { updateHealthStatus } from '@/store/slices/systemSlice';
import { Button } from '@/components/ui/button';
import { pb } from '@/lib/pocketbase';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useState } from 'react';

export function MainDashboard() {
  const dispatch = useDispatch<AppDispatch>();
  const { presets, activePresetId, loading: presetsLoading } = useSelector((state: RootState) => state.presets);
  const { stations, activeStationId } = useSelector((state: RootState) => state.stations);
  const { projects } = useSelector((state: RootState) => state.projects);
  const { healthStatus } = useSelector((state: RootState) => state.system);

  useEffect(() => {
    dispatch(fetchPresets());
    dispatch(fetchStations());
    dispatch(fetchProjects());
  }, [dispatch]);

  const [distributingPresetId, setDistributingPresetId] = useState<string | null>(null);
  const [distributionMessage, setDistributionMessage] = useState<string | null>(null);

  useEffect(() => {
    // Poll for system health status
        const fetchHealth = async () => {
          try {
            const data: any = await pb.send('/api/custom/system/health', { method: 'GET' });
            if (data) {
              dispatch(updateHealthStatus({ status: data.status, timestamp: Date.now() }));
            }
          } catch (error) {
            console.error('Failed to fetch health status:', error);
          }
        };

    fetchHealth();
    const interval = setInterval(fetchHealth, 5000); // Poll every 5 seconds

    return () => clearInterval(interval);
  }, [dispatch]);

  const handlePresetChange = async (presetId: string) => {
    dispatch(setActivePreset(presetId));
    // Trigger preset distribution with UX feedback
    setDistributingPresetId(presetId);
    setDistributionMessage('Starting distribution...');
    try {
      await pb.send(`/api/custom/presets/${presetId}/distribute`, { method: 'POST' });
      setDistributionMessage('Distribution started');
    } catch (error) {
      console.error('Failed to distribute preset:', error);
      setDistributionMessage('Failed to contact server');
    } finally {
      // clear distributing state after short delay so user sees status
      setTimeout(() => {
        setDistributingPresetId(null);
        setTimeout(() => setDistributionMessage(null), 1500);
      }, 1200);
    }
  };

  const activePreset = presets.find(p => p.id === activePresetId);
  const activeStation = stations.find(s => s.id === activeStationId);

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-4xl font-bold">System Dashboard</h1>
        </div>

        {/* System Health */}
        <Card>
          <CardHeader>
            <CardTitle>System Health</CardTitle>
            <CardDescription>Real-time packet validation status</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4">
              <div className={`h-4 w-4 rounded-full ${
                healthStatus === 'healthy' ? 'bg-green-500' : 
                healthStatus === 'unhealthy' ? 'bg-red-500' : 
                'bg-gray-500'
              }`} />
              <span className="text-lg font-semibold">
                {healthStatus === 'healthy' ? 'Healthy' : 
                 healthStatus === 'unhealthy' ? 'Unhealthy' : 
                 'Unknown'}
              </span>
              <Badge variant={healthStatus === 'healthy' ? 'default' : 'destructive'}>
                {projects.filter(p => p.lastPacketValid && p.lastPacketTimestamp).length} / {projects.length} projects valid
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* Active Station */}
        <Card>
          <CardHeader>
            <CardTitle>Active Station</CardTitle>
            <CardDescription>Currently active station and links</CardDescription>
          </CardHeader>
          <CardContent>
            {activeStation ? (
              <div className="space-y-2">
                <p className="font-semibold">{activeStation.name}</p>
                <div className="space-y-1">
                  {activeStation.stationLinks.map((link, idx) => (
                    <div key={idx} className="flex items-center gap-2 text-sm">
                      <Badge variant={link.active ? 'default' : 'secondary'}>
                        {link.active ? 'Active' : 'Inactive'}
                      </Badge>
                      <span>{link.host}:{link.port}</span>
                      <span className="text-muted-foreground">Counter: {link.counter}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <p className="text-muted-foreground">No active station</p>
            )}
          </CardContent>
        </Card>

        {/* Preset Selection */}
        <Card>
          <CardHeader>
            <CardTitle>Current Preset</CardTitle>
            <CardDescription>Select preset to distribute to all stations</CardDescription>
          </CardHeader>
          <CardContent>
                {presetsLoading ? (
              <p>Loading presets...</p>
            ) : presets.length === 0 ? (
              <p className="text-muted-foreground">No presets available</p>
            ) : (
              <div className="space-y-4">
                <div className="flex flex-wrap gap-2 items-center">
                  {presets.map((preset) => (
                    <Button
                      key={preset.id}
                      variant={activePresetId === preset.id ? 'default' : 'outline'}
                      onClick={() => handlePresetChange(preset.id)}
                      className="flex items-center gap-2"
                      disabled={distributingPresetId === preset.id}
                    >
                      <div
                        className="h-4 w-4 rounded-full"
                        style={{ backgroundColor: preset.color }}
                      />
                      {preset.name}
                      {distributingPresetId === preset.id && (
                        <span className="ml-2 text-xs text-muted-foreground">Distributing...</span>
                      )}
                    </Button>
                  ))}
                </div>

                {activePreset && (
                  <div className="mt-2 p-4 rounded-md border-2 flex items-center justify-between" style={{ borderColor: activePreset.color }}>
                    <div>
                      <p className="font-bold text-lg">Active Preset: {activePreset.name}</p>
                      {activePreset.expand?.actions && activePreset.expand.actions.length > 0 && (
                        <div className="text-sm text-muted-foreground">
                          {activePreset.expand.actions.length} action(s) configured
                        </div>
                      )}
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-sm" style={{ color: activePreset.color }}>{activePreset.color}</div>
                      {distributionMessage && (
                        <div className="text-xs text-muted-foreground">{distributionMessage}</div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
