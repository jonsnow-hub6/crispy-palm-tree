import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch, RootState } from '@/store';
import { 
  fetchStations, 
  createStation, 
  updateStation, 
  deleteStation, 
  activateStation,
  Station,
  StationLink 
} from '@/store/slices/stationsSlice';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
// removed unused table import; using card layout instead
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Plus, Edit, Trash2, Power } from 'lucide-react';
import StationGraph from '@/components/StationGraph';

export function StationsPage() {
  const dispatch = useDispatch<AppDispatch>();
  const { stations, loading, activeStationId } = useSelector((state: RootState) => state.stations);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingStation, setEditingStation] = useState<Station | null>(null);
  const [formData, setFormData] = useState({ name: '', stationLinks: [] as StationLink[] });

  useEffect(() => {
    dispatch(fetchStations());
  }, [dispatch]);

  const handleCreate = () => {
    setEditingStation(null);
    setFormData({ name: '', stationLinks: [{ host: '', port: 8080, active: false, counter: 0 }] });
    setIsDialogOpen(true);
  };

  const handleEdit = (station: Station) => {
    setEditingStation(station);
    setFormData({ name: station.name, stationLinks: station.stationLinks });
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this station?')) {
      await dispatch(deleteStation(id));
    }
  };

  const handleActivate = async (stationId: string) => {
    await dispatch(activateStation({ stationId }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editingStation) {
      await dispatch(updateStation({ id: editingStation.id, data: formData }));
    } else {
      await dispatch(createStation(formData));
    }
    setIsDialogOpen(false);
    setEditingStation(null);
  };

  const addLink = () => {
    setFormData({
      ...formData,
      stationLinks: [...formData.stationLinks, { host: '', port: 8080, active: false, counter: 0 }],
    });
  };

  const removeLink = (index: number) => {
    setFormData({
      ...formData,
      stationLinks: formData.stationLinks.filter((_, i) => i !== index),
    });
  };

  const updateLink = (index: number, field: keyof StationLink, value: any) => {
    const updated = [...formData.stationLinks];
    updated[index] = { ...updated[index], [field]: value };
    setFormData({ ...formData, stationLinks: updated });
  };

  // display stations in stored order (do not reorder)

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-4xl font-bold">Stations Management</h1>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={handleCreate}>
                <Plus className="h-4 w-4 mr-2" />
                Add Station
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{editingStation ? 'Edit Station' : 'Create Station'}</DialogTitle>
                <DialogDescription>
                  {editingStation ? 'Update station details' : 'Add a new station with links'}
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Station Name</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <Label>Station Links</Label>
                    <Button type="button" variant="outline" size="sm" onClick={addLink}>
                      <Plus className="h-4 w-4 mr-1" />
                      Add Link
                    </Button>
                  </div>
                  {formData.stationLinks.map((link, idx) => (
                    <div key={idx} className="flex gap-2 items-end p-3 border rounded-md">
                      <div className="flex-1 space-y-2">
                        <Input
                          placeholder="Host"
                          value={link.host}
                          onChange={(e) => updateLink(idx, 'host', e.target.value)}
                          required
                        />
                        <Input
                          type="number"
                          placeholder="Port"
                          value={link.port}
                          onChange={(e) => updateLink(idx, 'port', parseInt(e.target.value) || 0)}
                          required
                        />
                      </div>
                      <Button
                        type="button"
                        variant="destructive"
                        size="icon"
                        onClick={() => removeLink(idx)}
                        disabled={formData.stationLinks.length === 1}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit">Save</Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {loading ? (
          <p>Loading stations...</p>
        ) : stations.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              No stations found. Create one to get started.
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {stations.map((station) => {
              const isActive = station.stationLinks.some(l => l.active);
              return (
                <Card key={station.id}>
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      <span className={isActive ? 'font-semibold text-primary' : 'font-normal text-muted-foreground'}>{station.name}</span>
                      <span className="text-sm text-muted-foreground">{isActive ? 'Active' : 'Inactive'}</span>
                    </CardTitle>
                    <CardDescription className="text-sm">
                      {station.stationLinks.length} link(s)
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <StationGraph station={station as any} onActivate={handleActivate} />
                      <div className="flex gap-2 pt-2">
                        <Button variant="outline" onClick={() => handleEdit(station)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button variant="outline" onClick={() => handleActivate(station.id)} disabled={isActive}>
                          <Power className="h-4 w-4" />
                        </Button>
                        <Button variant="destructive" onClick={() => handleDelete(station.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
