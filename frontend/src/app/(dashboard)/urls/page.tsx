'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useUrlStore } from '@/store/urls';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Play, Pause, Trash2, ExternalLink, Settings } from 'lucide-react';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';

export default function UrlsPage() {
  const { urls, isLoading, fetchUrls, createUrl, deleteUrl, toggleUrlStatus, runUrl } = useUrlStore();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newUrl, setNewUrl] = useState({ url: '', label: '', description: '' });

  useEffect(() => {
    fetchUrls();
  }, [fetchUrls]);

  const handleCreate = async () => {
    try {
      await createUrl(newUrl);
      toast.success('URL created successfully');
      setIsCreateOpen(false);
      setNewUrl({ url: '', label: '', description: '' });
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to create URL');
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this URL?')) {
      try {
        await deleteUrl(id);
        toast.success('URL deleted successfully');
      } catch (error: any) {
        toast.error(error.response?.data?.error || 'Failed to delete URL');
      }
    }
  };

  const handleToggle = async (id: string) => {
    try {
      await toggleUrlStatus(id);
      toast.success('URL status updated');
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to update status');
    }
  };

  const handleRun = async (id: string) => {
    try {
      await runUrl(id);
      toast.success('Execution started');
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to start execution');
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">URLs</h1>
          <p className="text-muted-foreground">Manage your automated URLs</p>
        </div>
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add URL
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New URL</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="url">URL</Label>
                <Input
                  id="url"
                  placeholder="https://example.com"
                  value={newUrl.url}
                  onChange={(e) => setNewUrl({ ...newUrl, url: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="label">Label</Label>
                <Input
                  id="label"
                  placeholder="My Website"
                  value={newUrl.label}
                  onChange={(e) => setNewUrl({ ...newUrl, label: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description (optional)</Label>
                <Textarea
                  id="description"
                  placeholder="What this automation does..."
                  value={newUrl.description}
                  onChange={(e) => setNewUrl({ ...newUrl, description: e.target.value })}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsCreateOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreate}>Create</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {urls.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <p className="text-muted-foreground mb-4">No URLs configured yet</p>
            <Button onClick={() => setIsCreateOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add your first URL
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Label</TableHead>
                <TableHead>URL</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Last Run</TableHead>
                <TableHead>Stats</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {urls.map((url) => (
                <TableRow key={url.id}>
                  <TableCell className="font-medium">{url.label}</TableCell>
                  <TableCell className="max-w-xs truncate">
                    <a
                      href={url.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 hover:underline"
                    >
                      {url.url}
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  </TableCell>
                  <TableCell>
                    <Badge variant={url.enabled ? 'default' : 'secondary'}>
                      {url.enabled ? 'Active' : 'Inactive'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {url.lastRunAt
                      ? formatDistanceToNow(new Date(url.lastRunAt), { addSuffix: true })
                      : 'Never'}
                  </TableCell>
                  <TableCell>
                    <span className="text-green-600">{url.successCount} ok</span>
                    {' / '}
                    <span className="text-red-600">{url.errorCount} err</span>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleRun(url.id)}
                        title="Run now"
                      >
                        <Play className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleToggle(url.id)}
                        title={url.enabled ? 'Disable' : 'Enable'}
                      >
                        {url.enabled ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                      </Button>
                      <Link href={`/urls/${url.id}`}>
                        <Button variant="ghost" size="icon" title="Configure">
                          <Settings className="h-4 w-4" />
                        </Button>
                      </Link>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(url.id)}
                        title="Delete"
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}
    </div>
  );
}
