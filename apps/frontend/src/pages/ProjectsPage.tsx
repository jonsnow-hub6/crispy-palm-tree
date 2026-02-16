import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch, RootState } from '@/store';
import { 
  fetchProjects, 
  createProject, 
  updateProject, 
  deleteProject,
  updatePacketData,
  Project 
} from '@/store/slices/projectsSlice';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
// removed unused table import; using card layout instead
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Plus, Edit, Trash2 } from 'lucide-react';
import { pb } from '@/lib/pocketbase';

export function ProjectsPage() {
  const dispatch = useDispatch<AppDispatch>();
  const { projects, loading, error, tcpConnections } = useSelector((state: RootState) => state.projects);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [formData, setFormData] = useState({ id: '', name: '', host: '', port: 8080 });
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    dispatch(fetchProjects());
    
    // Poll for packet status updates
            const pollPacketStatus = async () => {
      const updatedProjects = await Promise.all(
        projects.map(async (project) => {
          try {
            try {
              const data: any = await pb.send(`/api/custom/projects/${project.id}/packet-status`, { method: 'GET' });
              if (data && data.hasData) {
                dispatch(updatePacketData({
                  projectId: project.id,
                  packet: data.packet,
                  timestamp: data.timestamp,
                  valid: data.valid,
                }));
              }
            } catch (err) {
              console.error(`Failed to fetch packet status for ${project.name}:`, err);
            }
          } catch (error) {
            console.error(`Failed to fetch packet status for ${project.name}:`, error);
          }
        })
      );
    };

    if (projects.length > 0) {
      pollPacketStatus();
      const interval = setInterval(pollPacketStatus, 5000);
      return () => clearInterval(interval);
    }
  }, [dispatch, projects.length]);

  const handleCreate = () => {
    setEditingProject(null);
    setFormData({ id: '', name: '', host: '', port: 8080 });
    setIsDialogOpen(true);
  };

  const handleEdit = (project: Project) => {
    setEditingProject(project);
    setFormData({ id: project.id, name: project.name, host: project.host, port: project.port });
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this project? This will stop TCP listening.')) {
      await dispatch(deleteProject(id));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);
    try {
      if (editingProject) {
        await dispatch(updateProject({ id: editingProject.id, data: formData })).unwrap();
      } else {
        await dispatch(createProject(formData)).unwrap();
      }
      // Refetch projects to ensure UI is updated
      await dispatch(fetchProjects());
      setIsDialogOpen(false);
      setEditingProject(null);
      setFormData({ id: '', name: '', host: '', port: 8080 });
    } catch (error: any) {
      console.error('Failed to save project:', error);
      const errorMessage = error?.message || error || 'Unknown error occurred';
      setSubmitError(errorMessage);
    }
  };

  const formatTimestamp = (timestamp?: string) => {
    if (!timestamp) return 'Never';
    return new Date(timestamp).toLocaleString();
  };

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-4xl font-bold">Projects Management</h1>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={handleCreate}>
                <Plus className="h-4 w-4 mr-2" />
                Add Project
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editingProject ? 'Edit Project' : 'Create Project'}</DialogTitle>
                <DialogDescription>
                  {editingProject ? 'Update project details' : 'Add a new project for TCP communication'}
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                {submitError && (
                  <div className="p-3 text-sm text-destructive bg-destructive/10 rounded-md border border-destructive/20">
                    {submitError}
                  </div>
                )}
                {!editingProject && (
                  <div className="space-y-2">
                    <Label htmlFor="id">Project ID (optional)</Label>
                    <Input
                      id="id"
                      value={formData.id}
                      onChange={(e) => {
                        // Only allow lowercase alphanumeric characters
                        const value = e.target.value.toLowerCase().replace(/[^a-z0-9]/g, '');
                        setFormData({ ...formData, id: value });
                      }}
                      placeholder="Auto-generated if left empty"
                      pattern="^[a-z0-9]+$"
                      maxLength={15}
                    />
                    <p className="text-xs text-muted-foreground">
                      Leave empty to auto-generate. Only lowercase letters and numbers allowed.
                    </p>
                  </div>
                )}
                <div className="space-y-2">
                  <Label htmlFor="name">Project Name</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="host">Host</Label>
                  <Input
                    id="host"
                    value={formData.host}
                    onChange={(e) => setFormData({ ...formData, host: e.target.value })}
                    placeholder="localhost"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="port">Port</Label>
                  <Input
                    id="port"
                    type="number"
                    value={formData.port}
                    onChange={(e) => setFormData({ ...formData, port: parseInt(e.target.value) || 0 })}
                    min="1"
                    max="65535"
                    required
                  />
                </div>
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => {
                    setIsDialogOpen(false);
                    setSubmitError(null);
                    setFormData({ id: '', name: '', host: '', port: 8080 });
                  }}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={loading}>
                    {loading ? 'Saving...' : 'Save'}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {error && (
          <Card className="border-destructive">
            <CardContent className="py-4">
              <p className="text-destructive">Error: {error}</p>
            </CardContent>
          </Card>
        )}
        {loading ? (
          <p>Loading projects...</p>
        ) : projects.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              No projects found. Create one to get started.
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {projects.map((project) => (
              <Card key={project.id}>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span className="font-semibold">{project.name}</span>
                    <Badge variant={tcpConnections[project.id] ? 'default' : 'secondary'}>
                      {tcpConnections[project.id] ? 'Connected' : 'Disconnected'}
                    </Badge>
                  </CardTitle>
                  <CardDescription className="text-sm">{project.host}:{project.port}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div>
                      <div className="text-sm">Last Packet: {formatTimestamp(project.lastPacketTimestamp)}</div>
                      {project.lastPacket && (
                        <div className="text-muted-foreground font-mono text-xs mt-1">
                          {project.lastPacket.substring(0, 40)}{project.lastPacket.length > 40 ? '...' : ''}
                        </div>
                      )}
                    </div>
                    <div>
                      {project.lastPacketValid !== undefined ? (
                        <Badge variant={project.lastPacketValid ? 'default' : 'destructive'}>
                          {project.lastPacketValid ? 'Valid' : 'Invalid'}
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground">No data</span>
                      )}
                    </div>
                    <div className="flex gap-2 pt-2">
                      <Button variant="outline" onClick={() => handleEdit(project)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button variant="destructive" onClick={() => handleDelete(project.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
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
