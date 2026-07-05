import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch, RootState } from '@/store';
import {
  fetchStations,
  createStation,
  updateStation,
  deleteStation,
  activateStation,
  activateStationLink,
  deactivateStation,
  Station,
  StationLink,
} from '@/store/slices/stationsSlice';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
// removed unused table import; using card layout instead
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Plus, Edit, Trash2, Power, MoreVertical } from 'lucide-react';
import StationGraph from '@/components/StationGraph';

type StationFormLink = Omit<StationLink, 'port'> & { port: string | number };

type StationFormData = {
  name: string;
  stationLinks: StationFormLink[];
};

const normalizeStationFormData = (formData: StationFormData) => ({
  ...formData,
  stationLinks: formData.stationLinks.map((link) => ({
    ...link,
    port: Number(link.port),
  })),
});

export function StationsPage() {
  const dispatch = useDispatch<AppDispatch>();
  const { stations, loading } = useSelector(
    (state: RootState) => state.stations,
  );
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingStation, setEditingStation] = useState<Station | null>(null);
  const [formData, setFormData] = useState<StationFormData>({
    name: '',
    stationLinks: [],
  });
  const [menuOpenFor, setMenuOpenFor] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmStationId, setConfirmStationId] = useState<string | null>(null);
  const [confirmLinkHost, setConfirmLinkHost] = useState<string | null>(null);
  const [confirmLinkPort, setConfirmLinkPort] = useState<number | null>(null);

  useEffect(() => {
    dispatch(fetchStations());
  }, [dispatch]);

  // close menu when clicking outside
  useEffect(() => {
    if (!menuOpenFor) return;
    const handler = (e: PointerEvent) => {
      const target = e.target as HTMLElement | null;
      if (!target) return;
      if (!target.closest(`[data-menu-id="${menuOpenFor}"]`)) {
        setMenuOpenFor(null);
      }
    };
    document.addEventListener('pointerdown', handler);
    return () => document.removeEventListener('pointerdown', handler);
  }, [menuOpenFor]);

  const handleCreate = () => {
    setEditingStation(null);
    setFormData({
      name: '',
      stationLinks: [
        { host: '', port: '8080', active: false, counter: 0, reachable: false },
      ],
    });
    setIsDialogOpen(true);
  };

  const handleEdit = (station: Station) => {
    setEditingStation(station);
    setFormData({
      name: station.name,
      stationLinks: station.stationLinks.map((link) => ({
        ...link,
        port: String(link.port),
      })),
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this station?')) {
      await dispatch(deleteStation(id));
    }
  };

  const handleActivate = (
    stationId: string,
    linkHost?: string,
    linkPort?: number,
  ) => {
    setConfirmStationId(stationId);
    setConfirmLinkHost(linkHost || null);
    setConfirmLinkPort(linkPort || null);
    setConfirmOpen(true);
  };

  const handleDeactivate = async (stationId: string) => {
    await dispatch(deactivateStation({ stationId }));
  };

  const confirmActivate = async () => {
    if (!confirmStationId) return;
    setConfirmOpen(false);
    try {
      if (confirmLinkHost && confirmLinkPort) {
        await dispatch(
          activateStationLink({
            stationId: confirmStationId,
            host: confirmLinkHost,
            port: confirmLinkPort,
          }),
        );
      } else {
        await dispatch(activateStation({ stationId: confirmStationId }));
      }
    } finally {
      setConfirmStationId(null);
      setConfirmLinkHost(null);
      setConfirmLinkPort(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const normalizedFormData = normalizeStationFormData(formData);

    if (editingStation) {
      await dispatch(
        updateStation({ id: editingStation.id, data: normalizedFormData }),
      );
    } else {
      await dispatch(createStation(normalizedFormData));
    }
    setIsDialogOpen(false);
    setEditingStation(null);
  };

  const addLink = () => {
    setFormData((prev) => ({
      ...prev,
      stationLinks: [
        ...prev.stationLinks,
        { host: '', port: '8080', active: false, counter: 0, reachable: false },
      ],
    }));
  };

  const removeLink = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      stationLinks: prev.stationLinks.filter((_, i) => i !== index),
    }));
  };

  const updateLink = (
    index: number,
    field: keyof StationFormLink,
    value: any,
  ) => {
    setFormData((prev) => {
      const updated = [...prev.stationLinks];
      updated[index] = { ...updated[index], [field]: value };
      return { ...prev, stationLinks: updated };
    });
  };

  // display stations in stored order (do not reorder)

  return (
    <div className="min-h-screen bg-background p-8" data-cy="stations-page">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-end">
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={handleCreate} data-cy="add-station-button">
                <Plus className="h-4 w-4 mr-2" />
                Add Station
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>
                  {editingStation ? 'Edit Station' : 'Create Station'}
                </DialogTitle>
                <DialogDescription>
                  {editingStation
                    ? 'Update station details'
                    : 'Add a new station with links'}
                </DialogDescription>
              </DialogHeader>
              <form
                onSubmit={handleSubmit}
                className="space-y-4"
                data-cy="schema-form"
              >
                <div className="space-y-2">
                  <Label htmlFor="name">Station Name</Label>
                  <Input
                    id="name"
                    data-cy="schema-form-field-name"
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                    required
                    disabled={!!editingStation}
                  />
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <Label>Station Links</Label>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={addLink}
                    >
                      <Plus className="h-4 w-4 mr-1" />
                      Add Link
                    </Button>
                  </div>
                  {formData.stationLinks.map((link, idx) => (
                    <div
                      key={idx}
                      className="flex gap-2 items-end p-3 border rounded-md"
                    >
                      <div className="flex-1 space-y-2">
                        <Input
                          placeholder="Host"
                          data-cy={`schema-form-field-link-host-${idx}`}
                          value={link.host}
                          onChange={(e) =>
                            updateLink(idx, 'host', e.target.value)
                          }
                          required
                        />
                        <Input
                          type="number"
                          placeholder="Port"
                          data-cy={`schema-form-field-link-port-${idx}`}
                          value={link.port}
                          onChange={(e) =>
                            updateLink(idx, 'port', e.target.value)
                          }
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
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsDialogOpen(false)}
                    data-cy="schema-form-cancel"
                  >
                    Cancel
                  </Button>
                  <Button type="submit" data-cy="schema-form-submit">
                    Save
                  </Button>
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
          <div
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
            data-cy="stations-list"
          >
            {stations.map((station) => {
              const isActive = station.stationLinks.some((l) => l.active);
              const anyReachable = station.stationLinks.some(
                (l) => l.reachable !== false,
              );

              const activeLink = station.stationLinks.find((l) => l.active);
              const activeCounter = activeLink?.counter;
              return (
                <Card
                  key={station.id}
                  data-cy={'station-item-' + station.name}
                  className={`border-2 shadow-sm transition-all hover:shadow-md ${
                    isActive
                      ? activeLink?.reachable
                        ? 'border-[#06b6d4] animate-blinkCyan'
                        : 'border-[#0000ff] animate-blinkRed'
                      : 'border-border'
                  }`}
                >
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span
                          className={
                            isActive
                              ? 'font-semibold text-primary'
                              : 'font-normal text-muted-foreground'
                          }
                        >
                          {station.name}
                        </span>
                        {isActive && !activeLink?.reachable ? (
                          <Badge
                            variant="destructive"
                            data-cy={`station-${station.name}-unreachable-active`}
                          >
                            Unreachable Active
                          </Badge>
                        ) : isActive ? (
                          <Badge variant="default">Active</Badge>
                        ) : station.stationLinks.every(
                            (l) => l.reachable === false,
                          ) ? (
                          <Badge
                            variant="destructive"
                            data-cy={`station-${station.name}-unreachable`}
                          >
                            Unreachable
                          </Badge>
                        ) : (
                          <Badge
                            variant="outline"
                            data-cy={`station-${station.name}-inactive`}
                          >
                            Inactive
                          </Badge>
                        )}

                        {activeCounter !== undefined && (
                          <Badge variant="secondary" className="ml-1">
                            Counter: {activeCounter}
                          </Badge>
                        )}
                      </div>
                      <div className="relative" data-menu-id={station.id}>
                        <div style={{ position: 'absolute', right: 8, top: 8 }}>
                          <button
                            data-cy={`station-menu-button-${station.name}`}
                            aria-haspopup="menu"
                            aria-expanded={menuOpenFor === station.id}
                            onClick={() =>
                              setMenuOpenFor(
                                menuOpenFor === station.id ? null : station.id,
                              )
                            }
                            className="p-1 rounded-md hover:bg-accent"
                          >
                            <MoreVertical className="h-5 w-5" />
                          </button>
                        </div>

                        {menuOpenFor === station.id && (
                          <div
                            role="menu"
                            aria-label="Station actions"
                            className="absolute right-2 top-8 mt-2 w-44 bg-card border rounded-md shadow-md z-40"
                          >
                            <div className="py-1">
                              {/* Edit */}
                              <button
                                role="menuitem"
                                className="flex items-center gap-2 w-full px-3 py-2 text-sm hover:bg-accent/60"
                                onClick={() => {
                                  setMenuOpenFor(null);
                                  handleEdit(station);
                                }}
                              >
                                <Edit className="h-4 w-4 text-muted-foreground" />
                                <span>Edit</span>
                              </button>

                              {/* Activate */}
                              <button
                                data-cy={`station-menu-activate-button-${station.name}`}
                                role="menuitem"
                                aria-disabled={isActive || !anyReachable}
                                className={`flex items-center gap-2 w-full px-3 py-2 text-sm text-green-700 ${
                                  isActive || !anyReachable
                                    ? 'opacity-50 pointer-events-none'
                                    : 'hover:bg-accent/60'
                                }`}
                                onClick={() => {
                                  setMenuOpenFor(null);
                                  if (!isActive && anyReachable)
                                    handleActivate(station.id);
                                }}
                              >
                                <Power className="h-4 w-4 text-green-500" />
                                <span>Activate</span>
                              </button>

                              {/* Deactivate (only if active) */}
                              {isActive && (
                                <button
                                  data-cy={`station-menu-deactivate-button-${station.name}`}
                                  role="menuitem"
                                  className="flex items-center gap-2 w-full px-3 py-2 text-sm hover:bg-accent/60 text-yellow-600"
                                  onClick={() => {
                                    setMenuOpenFor(null);
                                    handleDeactivate(station.id);
                                  }}
                                >
                                  <Power className="h-4 w-4 rotate-180" />
                                  <span>Deactivate</span>
                                </button>
                              )}

                              <div className="border-t my-1" />

                              {/* Delete */}
                              <button
                                disabled={isActive}
                                role="menuitem"
                                className={`flex items-center gap-2 w-full px-3 py-2 text-sm hover:bg-accent/60 text-destructive ${isActive ? ' opacity-50 pointer-events-none' : ''}`}
                                onClick={() => {
                                  setMenuOpenFor(null);
                                  handleDelete(station.id);
                                }}
                              >
                                <Trash2 className="h-4 w-4" />
                                <span>Delete</span>
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    </CardTitle>
                    <CardDescription className="text-sm"></CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <StationGraph
                        station={station as any}
                        onActivate={handleActivate}
                      />
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Are you sure?</DialogTitle>
            <DialogDescription>
              {confirmLinkHost && confirmLinkPort
                ? `Activate specific link ${confirmLinkHost}:${confirmLinkPort}? This will attempt to switch active links and specifically target this instance.`
                : `Activate this station? This will attempt to switch active links.`}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmOpen(false)}>
              Cancel
            </Button>
            <Button
              data-cy="station-activation-confirm-button"
              onClick={confirmActivate}
              variant="default"
            >
              Confirm
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
