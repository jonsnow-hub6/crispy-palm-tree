import React, { useEffect, useState, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch, RootState } from '@/store';
import {
  fetchPresets,
  createPreset,
  updatePreset,
  deletePreset,
  importPresetFromJson,
  Preset,
} from '@/store/slices/presetsSlice';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
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
import { Edit, Trash2, Upload, MoreVertical, Download } from 'lucide-react';

export function PresetsPage() {
  const dispatch = useDispatch<AppDispatch>();
  const { presets, loading } = useSelector((state: RootState) => state.presets);
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

  const handleDownload = (preset: Preset) => {
    const actions = preset.expand?.actions || [];
    const json = {
      presetName: preset.name,
      commands: actions.map((a) => ({ id: a.project, payload: a.payload })),
    };
    const blob = new Blob([JSON.stringify(json, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${preset.name.replace(/\s+/g, '_')}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);
    try {
      if (editingPreset) {
        await dispatch(
          updatePreset({ id: editingPreset.id, data: formData }),
        ).unwrap();
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
      if (
        !jsonData.presetName ||
        typeof jsonData.presetName !== 'string' ||
        !jsonData.commands
      ) {
        setImportError(
          'Invalid JSON format. Expected { presetName: string, commands: [...] }',
        );
        return;
      }
      if (!Array.isArray(jsonData.commands)) {
        setImportError(
          'Commands must be an array of objects with id and payload',
        );
        return;
      }
      for (const cmd of jsonData.commands) {
        if (!cmd.id || !cmd.payload) {
          setImportError('Each command must have both id and payload fields');
          return;
        }
        if (typeof cmd.id !== 'string') {
          setImportError('Command id must be a string');
          return;
        }
        if (typeof cmd.payload !== 'string') {
          setImportError('Command payload must be a string');
          return;
        }
        if (!/^0x[0-9a-fA-F]{14}$/.test(cmd.payload)) {
          setImportError(
            'Command payload must be a 7-byte hex string starting with 0x (e.g. "0x00000000000001")',
          );
          return;
        }
      }

      await dispatch(
        importPresetFromJson({
          presetName: jsonData.presetName,
          commands: jsonData.commands,
          color: importColor,
        }),
      ).unwrap();

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
    <div className="min-h-screen bg-background p-8" data-cy="presets-page">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-end">
          <div className="flex gap-2">
            <Dialog
              open={isImportDialogOpen}
              onOpenChange={(v) => {
                setIsImportDialogOpen(v);
                if (!v) {
                  setSelectedFile(null);
                  setSelectedFileName(null);
                  setImportError('');
                  setImportColor('#3b82f6');
                  if (fileInputRef.current) fileInputRef.current.value = '';
                }
              }}
            >
              <DialogTrigger asChild>
                <Button data-cy="import-json-btn">
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
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ')
                          fileInputRef.current?.click();
                      }}
                      className="border rounded-md p-4 cursor-pointer hover:bg-accent/40 flex items-center justify-between"
                    >
                      <div className="text-sm text-muted-foreground">
                        {selectedFileName || 'Click to choose a .json file'}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {selectedFileName
                          ? `${((selectedFile?.size ?? 0) / 1024) | 0} KB`
                          : 'No file'}
                      </div>
                      <input
                        data-cy="open-preset-import-input"
                        ref={fileInputRef}
                        type="file"
                        accept=".json"
                        onChange={handleFileUpload}
                        className="hidden"
                      />
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Format:{' '}
                      {
                        '{ presetName: string, commands: [{ id: string, payload: string }] }'
                      }
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
                  <Button
                    variant="outline"
                    onClick={() => {
                      setIsImportDialogOpen(false);
                    }}
                  >
                    Cancel
                  </Button>
                  <Button
                    data-cy="submit-json-import"
                    onClick={handleImportConfirm}
                    disabled={!selectedFile}
                  >
                    Import
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            {/* Edit dialog is available only for editing existing presets; Add UI removed */}
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>
                    {editingPreset ? 'Edit Preset' : 'Preset'}
                  </DialogTitle>
                  <DialogDescription>
                    {editingPreset
                      ? 'Update preset details'
                      : 'No creation via UI. Use Import JSON.'}
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
                      onChange={(e) =>
                        setFormData({ ...formData, name: e.target.value })
                      }
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
                        onChange={(e) =>
                          setFormData({ ...formData, color: e.target.value })
                        }
                        className="w-20 h-10"
                      />
                      <Input
                        value={formData.color}
                        onChange={(e) =>
                          setFormData({ ...formData, color: e.target.value })
                        }
                        placeholder="#3b82f6"
                        pattern="^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$"
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setIsDialogOpen(false);
                        setSubmitError(null);
                        setFormData({ name: '', color: '#3b82f6' });
                      }}
                    >
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
          <div
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
            data-cy="presets-list"
          >
            {presets.map((preset: Preset) => (
              <Card
                key={preset.id}
                data-cy={`preset-item-${preset.name}`}
                className="group flex flex-col h-full transition-all duration-300 hover:shadow-lg"
                style={{ borderLeft: `4px solid ${preset.color}` }}
              >
                <CardHeader>
                  <div className="flex items-center justify-between">
                    {/* Left: Name */}
                    <h3 className="font-semibold text-lg truncate">
                      {preset.name}
                    </h3>

                    {/* Right: Color + Menu */}
                    <div className="flex items-center gap-2">
                      {/* Color */}
                      <div
                        className="h-5 w-5 rounded-full shadow-md"
                        style={{ backgroundColor: preset.color }}
                      />

                      {/* Menu */}
                      <div className="relative" data-menu-id={preset.id}>
                        <button
                          aria-haspopup="menu"
                          aria-expanded={menuOpenFor === preset.id}
                          onClick={() =>
                            setMenuOpenFor(
                              menuOpenFor === preset.id ? null : preset.id,
                            )
                          }
                          className="p-1 rounded-md hover:bg-accent"
                        >
                          <MoreVertical className="h-5 w-5" />
                        </button>

                        {menuOpenFor === preset.id && (
                          <div
                            role="menu"
                            className="absolute right-0 top-7 w-40 bg-card border rounded-md shadow-md z-40"
                          >
                            <div className="py-1">
                              <button
                                role="menuitem"
                                className="flex items-center gap-2 w-full px-3 py-2 text-sm hover:bg-accent/60"
                                onClick={() => {
                                  setMenuOpenFor(null);
                                  handleEdit(preset);
                                }}
                              >
                                <Edit className="h-4 w-4" />
                                Edit
                              </button>

                              <button
                                role="menuitem"
                                className="flex items-center gap-2 w-full px-3 py-2 text-sm hover:bg-accent/60"
                                onClick={() => {
                                  setMenuOpenFor(null);
                                  handleDownload(preset);
                                }}
                              >
                                <Download className="h-4 w-4" />
                                Download JSON
                              </button>

                              <div className="border-t my-1" />

                              <button
                                disabled={preset.active}
                                role="menuitem"
                                className={`flex items-center gap-2 w-full px-3 py-2 text-sm hover:bg-accent/60 text-destructive ${preset.active ? 'pointer-events-none' : ''}`}
                                onClick={() => {
                                  setMenuOpenFor(null);
                                  handleDelete(preset.id);
                                }}
                              >
                                <Trash2 className="h-4 w-4" />
                                <span>Delete</span>
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="flex flex-col h-full">
                  {(() => {
                    const actions = preset.expand?.actions || [];
                    const visible = actions.slice(0, 3);
                    const remaining = actions.slice(3);

                    return actions.length > 0 ? (
                      <div className="space-y-2">
                        {/* VISIBLE ACTIONS */}
                        {visible.map((a) => (
                          <div
                            key={a.id}
                            className="flex items-start gap-3 text-sm"
                          >
                            <Badge
                              variant="secondary"
                              className="font-mono text-[11px] px-2 py-0.5 shrink-0"
                            >
                              {a.project}
                            </Badge>

                            <span title={a.payload} className="truncate">
                              {a.payload}
                            </span>
                          </div>
                        ))}

                        {/* +X MORE */}
                        {remaining.length > 0 && (
                          <div className="relative w-fit group/more">
                            <div className="text-xs text-primary cursor-default">
                              +{remaining.length} more action
                              {remaining.length > 1 ? 's' : ''}
                            </div>

                            {/* HOVER POPOVER */}
                            <div
                              className="
                pointer-events-none
                absolute left-0 bottom-full mb-2
                w-72 rounded-md border bg-card shadow-lg p-3
                opacity-0 translate-y-1
                transition-all duration-200
                group-hover/more:opacity-100
                group-hover/more:translate-y-0
              "
                            >
                              <div className="space-y-2 max-h-60 overflow-auto">
                                {actions.map((a) => (
                                  <div
                                    key={a.id}
                                    className="flex gap-2 text-xs"
                                  >
                                    <Badge
                                      variant="secondary"
                                      className="font-mono text-[10px]"
                                    >
                                      {a.project}
                                    </Badge>
                                    <span className="break-words">
                                      {a.payload}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    ) : (
                      <span className="text-sm text-muted-foreground">
                        No actions
                      </span>
                    );
                  })()}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
