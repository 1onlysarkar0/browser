'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useUrlStore } from '@/store/urls';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Plus, 
  Play, 
  Pause, 
  Trash2, 
  ExternalLink, 
  Settings, 
  LayoutGrid,
  List,
  Search,
  MoreVertical,
  RefreshCw,
  Clock,
  CheckCircle2,
  XCircle,
  Globe,
  Zap
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';

export default function UrlsPage() {
  const { urls, isLoading, fetchUrls, createUrl, deleteUrl, toggleUrlStatus, runUrl } = useUrlStore();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newUrl, setNewUrl] = useState({ url: '', label: '', description: '', runIntervalSeconds: 1800 });
  const [viewMode, setViewMode] = useState<'table' | 'cards'>('cards');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUrls, setSelectedUrls] = useState<string[]>([]);
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'inactive'>('all');

  useEffect(() => {
    fetchUrls();
  }, [fetchUrls]);

  const filteredUrls = urls.filter((url) => {
    const matchesSearch = url.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
      url.url.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = filterStatus === 'all' || 
      (filterStatus === 'active' && url.enabled) ||
      (filterStatus === 'inactive' && !url.enabled);
    return matchesSearch && matchesStatus;
  });

  const handleCreate = async () => {
    try {
      await createUrl(newUrl);
      toast.success('URL created successfully');
      setIsCreateOpen(false);
      setNewUrl({ url: '', label: '', description: '', runIntervalSeconds: 1800 });
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

  const handleBulkToggle = async (enable: boolean) => {
    for (const id of selectedUrls) {
      const url = urls.find(u => u.id === id);
      if (url && url.enabled !== enable) {
        await toggleUrlStatus(id);
      }
    }
    setSelectedUrls([]);
    toast.success(`${selectedUrls.length} URLs ${enable ? 'enabled' : 'disabled'}`);
  };

  const handleBulkDelete = async () => {
    if (confirm(`Delete ${selectedUrls.length} URLs?`)) {
      for (const id of selectedUrls) {
        await deleteUrl(id);
      }
      setSelectedUrls([]);
      toast.success('URLs deleted');
    }
  };

  const toggleSelectAll = () => {
    if (selectedUrls.length === filteredUrls.length) {
      setSelectedUrls([]);
    } else {
      setSelectedUrls(filteredUrls.map(u => u.id));
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedUrls(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex flex-col items-center gap-3">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          <p className="text-sm text-muted-foreground">Loading URLs...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 md:space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">URL Management</h1>
          <p className="text-sm md:text-base text-muted-foreground mt-1">
            Manage and monitor your automated URLs
          </p>
        </div>
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="md:size-default gap-2 w-full md:w-auto">
              <Plus className="h-4 w-4" />
              <span>Add URL</span>
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg mx-4 md:mx-auto">
            <DialogHeader>
              <DialogTitle>Add New URL</DialogTitle>
              <DialogDescription>
                Configure a new URL for automated browser interactions
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
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
                <Label htmlFor="interval">Run Interval</Label>
                <Select
                  value={String(newUrl.runIntervalSeconds)}
                  onValueChange={(value) => {
                    if (value === 'custom') return;
                    setNewUrl({ ...newUrl, runIntervalSeconds: Number(value) });
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select interval" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="60">Every 1 minute</SelectItem>
                    <SelectItem value="120">Every 2 minutes</SelectItem>
                    <SelectItem value="180">Every 3 minutes</SelectItem>
                    <SelectItem value="300">Every 5 minutes</SelectItem>
                    <SelectItem value="600">Every 10 minutes</SelectItem>
                    <SelectItem value="900">Every 15 minutes</SelectItem>
                    <SelectItem value="1800">Every 30 minutes</SelectItem>
                    <SelectItem value="3600">Every hour</SelectItem>
                    <SelectItem value="7200">Every 2 hours</SelectItem>
                    <SelectItem value="21600">Every 6 hours</SelectItem>
                    <SelectItem value="43200">Every 12 hours</SelectItem>
                    <SelectItem value="86400">Every 24 hours</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description (optional)</Label>
                <Textarea
                  id="description"
                  placeholder="What this automation does..."
                  value={newUrl.description}
                  onChange={(e) => setNewUrl({ ...newUrl, description: e.target.value })}
                  rows={3}
                />
              </div>
            </div>
            <DialogFooter className="flex-col sm:flex-row gap-2">
              <Button variant="outline" onClick={() => setIsCreateOpen(false)} className="w-full sm:w-auto">
                Cancel
              </Button>
              <Button onClick={handleCreate} className="w-full sm:w-auto">Create URL</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center flex-1">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search URLs..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={filterStatus} onValueChange={(v: any) => setFilterStatus(v)}>
            <SelectTrigger className="w-full sm:w-[140px]">
              <SelectValue placeholder="Filter status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All URLs</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="inactive">Inactive</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-2">
          {selectedUrls.length > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">{selectedUrls.length} selected</span>
              <Button size="sm" variant="outline" onClick={() => handleBulkToggle(true)}>
                Enable
              </Button>
              <Button size="sm" variant="outline" onClick={() => handleBulkToggle(false)}>
                Disable
              </Button>
              <Button size="sm" variant="destructive" onClick={handleBulkDelete}>
                Delete
              </Button>
            </div>
          )}
          <div className="hidden md:flex border rounded-lg p-1">
            <Button
              variant={viewMode === 'cards' ? 'secondary' : 'ghost'}
              size="icon"
              className="h-8 w-8"
              onClick={() => setViewMode('cards')}
            >
              <LayoutGrid className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === 'table' ? 'secondary' : 'ghost'}
              size="icon"
              className="h-8 w-8"
              onClick={() => setViewMode('table')}
            >
              <List className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {filteredUrls.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12 px-4 text-center">
            <div className="rounded-full bg-muted p-4 mb-4">
              <Globe className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold mb-2">No URLs found</h3>
            <p className="text-muted-foreground mb-4 max-w-sm">
              {searchQuery || filterStatus !== 'all' 
                ? 'Try adjusting your search or filter criteria'
                : 'Get started by adding your first URL to automate'}
            </p>
            {!searchQuery && filterStatus === 'all' && (
              <Button onClick={() => setIsCreateOpen(true)} className="gap-2">
                <Plus className="h-4 w-4" />
                Add your first URL
              </Button>
            )}
          </CardContent>
        </Card>
      ) : viewMode === 'cards' ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredUrls.map((url) => (
            <Card key={url.id} className="group relative overflow-hidden transition-all hover:shadow-md">
              <div className="absolute top-3 right-3 flex items-center gap-1">
                <Checkbox
                  checked={selectedUrls.includes(url.id)}
                  onCheckedChange={() => toggleSelect(url.id)}
                  className="opacity-0 group-hover:opacity-100 transition-opacity"
                />
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => handleRun(url.id)}>
                      <Play className="h-4 w-4 mr-2" />
                      Run Now
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleToggle(url.id)}>
                      {url.enabled ? (
                        <>
                          <Pause className="h-4 w-4 mr-2" />
                          Disable
                        </>
                      ) : (
                        <>
                          <Play className="h-4 w-4 mr-2" />
                          Enable
                        </>
                      )}
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <Link href={`/urls/${url.id}`}>
                      <DropdownMenuItem>
                        <Settings className="h-4 w-4 mr-2" />
                        Configure
                      </DropdownMenuItem>
                    </Link>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem 
                      onClick={() => handleDelete(url.id)}
                      className="text-destructive focus:text-destructive"
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
              
              <CardHeader className="pb-2">
                <div className="flex items-start gap-3">
                  <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${url.enabled ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'}`}>
                    <Globe className="h-5 w-5" />
                  </div>
                  <div className="min-w-0 flex-1 pr-8">
                    <CardTitle className="text-base font-semibold truncate">{url.label}</CardTitle>
                    <a
                      href={url.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-muted-foreground hover:underline truncate block mt-0.5"
                    >
                      {url.url}
                    </a>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="pt-2">
                <div className="flex items-center justify-between mb-3">
                  <Badge 
                    variant={url.enabled ? 'default' : 'secondary'}
                    className={url.enabled ? 'bg-green-500/10 text-green-600 border-green-200' : 'bg-gray-100 text-gray-600 border-gray-200'}
                  >
                    <div className={`h-1.5 w-1.5 rounded-full mr-1.5 ${url.enabled ? 'bg-green-500 animate-pulse' : 'bg-gray-400'}`} />
                    {url.enabled ? 'Running' : 'Stopped'}
                  </Badge>
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {url.lastRunAt
                      ? formatDistanceToNow(new Date(url.lastRunAt), { addSuffix: true })
                      : 'Never run'}
                  </span>
                </div>

                <div className="flex items-center gap-4 text-sm">
                  <div className="flex items-center gap-1.5">
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                    <span className="font-medium">{url.successCount}</span>
                    <span className="text-muted-foreground text-xs">success</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <XCircle className="h-4 w-4 text-red-500" />
                    <span className="font-medium">{url.errorCount}</span>
                    <span className="text-muted-foreground text-xs">errors</span>
                  </div>
                </div>

                <div className="flex items-center gap-2 mt-4 pt-3 border-t">
                  <Button 
                    size="sm" 
                    variant="outline" 
                    className="flex-1 h-8"
                    onClick={() => handleRun(url.id)}
                  >
                    <Play className="h-3.5 w-3.5 mr-1.5" />
                    Run
                  </Button>
                  <Link href={`/urls/${url.id}`} className="flex-1">
                    <Button size="sm" variant="outline" className="w-full h-8">
                      <Settings className="h-3.5 w-3.5 mr-1.5" />
                      Configure
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <ScrollArea className="w-full">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10">
                    <Checkbox
                      checked={selectedUrls.length === filteredUrls.length && filteredUrls.length > 0}
                      onCheckedChange={toggleSelectAll}
                    />
                  </TableHead>
                  <TableHead>Label</TableHead>
                  <TableHead className="hidden md:table-cell">URL</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="hidden sm:table-cell">Last Run</TableHead>
                  <TableHead className="hidden lg:table-cell">Stats</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUrls.map((url) => (
                  <TableRow key={url.id}>
                    <TableCell>
                      <Checkbox
                        checked={selectedUrls.includes(url.id)}
                        onCheckedChange={() => toggleSelect(url.id)}
                      />
                    </TableCell>
                    <TableCell className="font-medium">{url.label}</TableCell>
                    <TableCell className="max-w-[200px] truncate hidden md:table-cell">
                      <a
                        href={url.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 hover:underline text-muted-foreground"
                      >
                        {url.url}
                        <ExternalLink className="h-3 w-3 shrink-0" />
                      </a>
                    </TableCell>
                    <TableCell>
                      <Badge 
                        variant={url.enabled ? 'default' : 'secondary'}
                        className={url.enabled ? 'bg-green-500/10 text-green-600 border-green-200' : 'bg-gray-100 text-gray-600 border-gray-200'}
                      >
                        <div className={`h-1.5 w-1.5 rounded-full mr-1.5 ${url.enabled ? 'bg-green-500 animate-pulse' : 'bg-gray-400'}`} />
                        {url.enabled ? 'Running' : 'Stopped'}
                      </Badge>
                    </TableCell>
                    <TableCell className="hidden sm:table-cell text-muted-foreground">
                      {url.lastRunAt
                        ? formatDistanceToNow(new Date(url.lastRunAt), { addSuffix: true })
                        : 'Never'}
                    </TableCell>
                    <TableCell className="hidden lg:table-cell">
                      <span className="text-green-600">{url.successCount} ok</span>
                      {' / '}
                      <span className="text-red-600">{url.errorCount} err</span>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => handleRun(url.id)}
                          title="Run now"
                        >
                          <Play className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => handleToggle(url.id)}
                          title={url.enabled ? 'Disable' : 'Enable'}
                        >
                          {url.enabled ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                        </Button>
                        <Link href={`/urls/${url.id}`}>
                          <Button variant="ghost" size="icon" className="h-8 w-8" title="Configure">
                            <Settings className="h-4 w-4" />
                          </Button>
                        </Link>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
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
          </ScrollArea>
        </Card>
      )}
    </div>
  );
}
