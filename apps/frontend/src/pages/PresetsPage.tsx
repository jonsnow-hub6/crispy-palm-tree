import { useEffect, useState, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch, RootState } from '@/store';
import { 
  fetchPresets, 
  createPreset, 
  updatePreset, 
  deletePreset,
  importPresetFromJson,
  Preset 
} from '@/store/slices/presetsSlice';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
// removed unused table import; using card layout instead
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Plus, Edit, Trash2, Upload, MoreVertical } from 'lucide-react';

export function PresetsPage() {
  const dispatch = useDispatch<AppDispatch>();
  const { presets, loading, error } = useSelector((state: RootState) => state.presets);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);
  const [editingPreset, setEditingPreset] = useState<Preset | null>(null);
  const [formData, setFormData] = useState({ name: '', color: '#3b82f6' });
  const [importColor, setImportColor] = useState('#3b82f6');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedFileName, setSelectedFileName] = useState<string | null>(null);
  const [importError, setImportError] = useState('');
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [menuOpenFor, setMenuOpenFor] = useState<string | null>(null);
  const [showTopError, setShowTopError] = useState(true);

  useEffect(() => {
    dispatch(fetchPresets());
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
    setEditingPreset(null);
    setFormData({ name: '', color: '#3b82f6' });
    setIsDialogOpen(true);
  };

  const handleEdit = (preset: Preset) => {
    setEditingPreset(preset);
    setFormData({ name: preset.name, color: preset.color });
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this preset?')) {
      await dispatch(deletePreset(id));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);
    try {
      if (editingPreset) {
        await dispatch(updatePreset({ id: editingPreset.id, data: formData })).unwrap();
      } else {
        await dispatch(createPreset(formData)).unwrap();
      }
      // Refetch presets to ensure UI is updated
      await dispatch(fetchPresets());
      setIsDialogOpen(false);
      setEditingPreset(null);
      setFormData({ name: '', color: '#3b82f6' });
    } catch (error: any) {
      console.error('Failed to save preset:', error);
      const errorMessage = error?.message || error || 'Unknown error occurred';
      setSubmitError(errorMessage);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    // store selected file, do not auto-import
    const file = e.target.files?.[0] ?? null;
    setSelectedFile(file);
    setSelectedFileName(file ? file.name : null);
    setImportError('');
  };

  const handleImportConfirm = async () => {
    if (!selectedFile) {
      setImportError('Please choose a JSON file to import');
      return;
    }

    try {
      const text = await selectedFile.text();
      const jsonData = JSON.parse(text);

      // Validate new format
      if (!jsonData.presetName || !jsonData.commands) {
        setImportError('Invalid JSON format. Expected { presetName: string, commands: [...] }');
        return;
      }
      if (!Array.isArray(jsonData.commands)) {
        setImportError('Commands must be an array of objects with id and payload');
        return;
      }
      for (const cmd of jsonData.commands) {
        if (!cmd.id || !cmd.payload) {
          setImportError('Each command must have both id and payload fields');
          return;
        }
      }

      await dispatch(importPresetFromJson({
        presetName: jsonData.presetName,
        commands: jsonData.commands,
        color: importColor,
      })).unwrap();

      await dispatch(fetchPresets());
      setIsImportDialogOpen(false);
      setImportError('');
      setImportColor('#3b82f6');
      setSelectedFile(null);
      setSelectedFileName(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
    } catch (err: any) {
      console.error('Import error:', err);
      setImportError(err?.message || 'Failed to import preset');
    }
  };

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-4xl font-bold">Presets Management</h1>
          <div className="flex gap-2">
            <Dialog open={isImportDialogOpen} onOpenChange={(v) => { setIsImportDialogOpen(v); if (!v) { setSelectedFile(null); setSelectedFileName(null); setImportError(''); setImportColor('#3b82f6'); if (fileInputRef.current) fileInputRef.current.value = ''; } }}>
              <DialogTrigger asChild>
                <Button variant="outline">
                  <Upload className="h-4 w-4 mr-2" />
                  Import JSON
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Import Preset from JSON</DialogTitle>
                  <DialogDescription>
                    Choose a JSON file and adjust the color before importing
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>JSON File</Label>
                    <div
                      role="button"
                      tabIndex={0}
                      onClick={() => fileInputRef.current?.click()}
                      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') fileInputRef.current?.click(); }}
                      className="border rounded-md p-4 cursor-pointer hover:bg-accent/40 flex items-center justify-between"
                    >
                      <div className="text-sm text-muted-foreground">{selectedFileName || 'Click to choose a .json file'}</div>
                      <div className="text-xs text-muted-foreground">{selectedFileName ? `${(selectedFile?.size ?? 0) / 1024 | 0} KB` : 'No file'}</div>
                      <input ref={fileInputRef} type="file" accept=".json" onChange={handleFileUpload} className="hidden" />
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Format: {"{ presetName: string, commands: [{ id: string, payload: string }] }"}
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="import-color">Preset Color</Label>
                    <div className="flex gap-2">
                      <Input
                        id="import-color"
                        type="color"
                        value={importColor}
                        onChange={(e) => setImportColor(e.target.value)}
                        className="w-20 h-10"
                      />
                      <Input
                        value={importColor}
                        onChange={(e) => setImportColor(e.target.value)}
                        placeholder="#3b82f6"
                        pattern="^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$"
                      />
                    </div>
                  </div>
                  {importError && (
                    <div className="p-3 text-sm text-destructive bg-destructive/10 rounded-md border border-destructive/20">
                      {importError}
                    </div>
                  )}
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => { setIsImportDialogOpen(false); }}>
                    Cancel
                  </Button>
                  <Button onClick={handleImportConfirm} disabled={!selectedFile}>Import</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            {/* Edit dialog is available only for editing existing presets; Add UI removed */}
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>{editingPreset ? 'Edit Preset' : 'Preset'}</DialogTitle>
                  <DialogDescription>
                    {editingPreset ? 'Update preset details' : 'No creation via UI. Use Import JSON.'}
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                  {submitError && (
                    <div className="p-3 text-sm text-destructive bg-destructive/10 rounded-md border border-destructive/20">
                      {submitError}
                    </div>
                  )}
                  <div className="space-y-2">
                    <Label htmlFor="name">Preset Name</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="color">Color</Label>
                    <div className="flex gap-2">
                      <Input
                        id="color"
                        type="color"
                        value={formData.color}
                        onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                        className="w-20 h-10"
                      />
                      <Input
                        value={formData.color}
                        onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                        placeholder="#3b82f6"
                        pattern="^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$"
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button type="button" variant="outline" onClick={() => {
                      setIsDialogOpen(false);
                      setSubmitError(null);
                      setFormData({ name: '', color: '#3b82f6' });
                    }}>
                      Cancel
                    </Button>
                    <Button type="submit" disabled={loading || !editingPreset}>
                      {loading ? 'Saving...' : 'Save'}
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </div>


        {loading ? (
          <p>Loading presets...</p>
        ) : presets.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              No presets found. Create one or import from JSON to get started.
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {presets.map((preset) => (
              <Card key={preset.id} style={{ borderLeft: `4px solid ${preset.color}` }}>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span className="font-semibold text-lg">{preset.name}</span>
                    <div className="flex items-center gap-2">
                      <div className="h-6 w-6 rounded-full shadow-md" style={{ backgroundColor: preset.color }} />
                    </div>
                  </CardTitle>
                  <CardDescription className="text-sm text-muted-foreground">
                    {preset.expand?.actions?.length || 0} action(s)
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex justify-between items-start gap-4">
                    <div className="text-sm text-muted-foreground w-full">
                      {preset.expand?.actions && preset.expand.actions.length > 0 ? (
                        <ul className="space-y-2">
                          {preset.expand.actions.slice(0, 4).map((a) => (
                            <li key={a.id} className="flex items-start gap-3 text-sm">
                              <Badge variant="secondary" className="font-mono text-[11px] px-2 py-0.5">{a.project}</Badge>
                              <span className="text-sm text-foreground truncate">{a.payload}</span>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <span>No actions</span>
                      )}
                    </div>
                            <div className="relative" data-menu-id={preset.id}>
                              <div style={{ position: 'absolute', right: 8, top: 8 }}>
                                <button
                                  aria-haspopup="menu"
                                  aria-expanded={menuOpenFor === preset.id}
                                  onClick={() => setMenuOpenFor(menuOpenFor === preset.id ? null : preset.id)}
                                  className="p-1 rounded-md hover:bg-accent"
                                >
                                  <MoreVertical className="h-5 w-5" />
                                </button>
                              </div>

                              {menuOpenFor === preset.id && (
                                <div role="menu" aria-label="Preset actions" className="absolute right-2 top-8 mt-2 w-40 bg-card border rounded-md shadow-md z-40">
                                  <div className="py-1">
                                    <button role="menuitem" className="flex items-center gap-2 w-full px-3 py-2 text-sm hover:bg-accent/60" onClick={() => { setMenuOpenFor(null); handleEdit(preset); }}>
                                      <Edit className="h-4 w-4 text-muted-foreground" />
                                      <span>Edit</span>
                                    </button>
                                    <div className="border-t my-1" />
                                    <button role="menuitem" className="flex items-center gap-2 w-full px-3 py-2 text-sm hover:bg-accent/60 text-destructive" onClick={() => { setMenuOpenFor(null); handleDelete(preset.id); }}>
                                      <Trash2 className="h-4 w-4" />
                                      <span>Delete</span>
                                    </button>
                                  </div>
                                </div>
                              )}
                            </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
