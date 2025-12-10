'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Download, ZoomIn, Camera, Search, Grid3X3, LayoutList, ImageOff, Trash2, RefreshCw } from 'lucide-react';
import { screenshotApi } from '@/lib/api';
import { formatDistanceToNow } from 'date-fns';
import { toast } from 'sonner';

interface Screenshot {
  id: string;
  urlId: string;
  fileName: string;
  width: number;
  height: number;
  fileSize: number;
  capturedAt: string;
  url?: {
    label: string;
    url: string;
  };
}

export default function ScreenshotsPage() {
  const [screenshots, setScreenshots] = useState<Screenshot[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedScreenshot, setSelectedScreenshot] = useState<Screenshot | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [deleteConfirm, setDeleteConfirm] = useState<Screenshot | null>(null);
  const [deleteAllConfirm, setDeleteAllConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    fetchScreenshots();
  }, []);

  const fetchScreenshots = async () => {
    try {
      setIsLoading(true);
      const response = await screenshotApi.getAll(50, 0);
      setScreenshots(response.data.screenshots);
    } catch (error) {
      console.error('Failed to fetch screenshots:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (screenshot: Screenshot) => {
    setIsDeleting(true);
    try {
      await screenshotApi.delete(screenshot.id);
      setScreenshots(screenshots.filter(s => s.id !== screenshot.id));
      toast.success('Screenshot deleted successfully');
      setDeleteConfirm(null);
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to delete screenshot');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleDeleteAll = async () => {
    setIsDeleting(true);
    try {
      await screenshotApi.deleteAll();
      setScreenshots([]);
      toast.success('All screenshots deleted successfully');
      setDeleteAllConfirm(false);
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to delete screenshots');
    } finally {
      setIsDeleting(false);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const filteredScreenshots = screenshots.filter((s) =>
    s.url?.label?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.url?.url?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex flex-col items-center gap-3">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          <p className="text-sm text-muted-foreground">Loading screenshots...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 md:space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Screenshots</h1>
          <p className="text-sm md:text-base text-muted-foreground mt-1">
            View captured screenshots from your automations ({screenshots.length} total)
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={fetchScreenshots} className="gap-1.5">
            <RefreshCw className="h-4 w-4" />
            <span className="hidden sm:inline">Refresh</span>
          </Button>
          {screenshots.length > 0 && (
            <Button 
              variant="destructive" 
              size="sm" 
              onClick={() => setDeleteAllConfirm(true)}
              className="gap-1.5"
            >
              <Trash2 className="h-4 w-4" />
              <span className="hidden sm:inline">Delete All</span>
            </Button>
          )}
        </div>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search screenshots..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex items-center gap-2">
          <div className="hidden md:flex border rounded-lg p-1">
            <Button
              variant={viewMode === 'grid' ? 'secondary' : 'ghost'}
              size="icon"
              className="h-8 w-8"
              onClick={() => setViewMode('grid')}
            >
              <Grid3X3 className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === 'list' ? 'secondary' : 'ghost'}
              size="icon"
              className="h-8 w-8"
              onClick={() => setViewMode('list')}
            >
              <LayoutList className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {filteredScreenshots.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12 px-4 text-center">
            <div className="rounded-full bg-muted p-4 mb-4">
              {searchQuery ? <ImageOff className="h-8 w-8 text-muted-foreground" /> : <Camera className="h-8 w-8 text-muted-foreground" />}
            </div>
            <h3 className="text-lg font-semibold mb-2">
              {searchQuery ? 'No screenshots found' : 'No screenshots captured yet'}
            </h3>
            <p className="text-muted-foreground mb-4 max-w-sm">
              {searchQuery 
                ? 'Try adjusting your search criteria'
                : 'Screenshots will appear here when captured during automation runs'}
            </p>
          </CardContent>
        </Card>
      ) : viewMode === 'grid' ? (
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filteredScreenshots.map((screenshot) => (
            <Card 
              key={screenshot.id} 
              className="overflow-hidden group cursor-pointer transition-all hover:shadow-md"
              onClick={() => setSelectedScreenshot(screenshot)}
            >
              <div className="aspect-video bg-muted relative overflow-hidden">
                <img
                  src={screenshotApi.getFileUrl(screenshot.id)}
                  alt={screenshot.fileName}
                  className="w-full h-full object-cover transition-transform group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <ZoomIn className="h-8 w-8 text-white" />
                </div>
              </div>
              <CardContent className="p-3 sm:p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-sm truncate">
                      {screenshot.url?.label || 'Unknown'}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {formatDistanceToNow(new Date(screenshot.capturedAt), { addSuffix: true })}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {screenshot.width}x{screenshot.height} - {formatFileSize(screenshot.fileSize)}
                    </p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <a 
                      href={screenshotApi.getFileUrl(screenshot.id)} 
                      download
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <Download className="h-4 w-4" />
                      </Button>
                    </a>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-8 w-8 text-destructive hover:text-destructive"
                      onClick={(e) => {
                        e.stopPropagation();
                        setDeleteConfirm(screenshot);
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="space-y-2">
          {filteredScreenshots.map((screenshot) => (
            <Card 
              key={screenshot.id}
              className="overflow-hidden cursor-pointer transition-all hover:shadow-md"
              onClick={() => setSelectedScreenshot(screenshot)}
            >
              <div className="flex items-center gap-4 p-3 sm:p-4">
                <div className="w-20 h-14 sm:w-24 sm:h-16 bg-muted rounded overflow-hidden shrink-0">
                  <img
                    src={screenshotApi.getFileUrl(screenshot.id)}
                    alt={screenshot.fileName}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-sm truncate">
                    {screenshot.url?.label || 'Unknown'}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">
                    {screenshot.url?.url}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {formatDistanceToNow(new Date(screenshot.capturedAt), { addSuffix: true })} - {screenshot.width}x{screenshot.height} - {formatFileSize(screenshot.fileSize)}
                  </p>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <a 
                    href={screenshotApi.getFileUrl(screenshot.id)} 
                    download
                    onClick={(e) => e.stopPropagation()}
                  >
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <Download className="h-4 w-4" />
                    </Button>
                  </a>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-8 w-8 text-destructive hover:text-destructive"
                    onClick={(e) => {
                      e.stopPropagation();
                      setDeleteConfirm(screenshot);
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={!!selectedScreenshot} onOpenChange={() => setSelectedScreenshot(null)}>
        <DialogContent className="max-w-[95vw] md:max-w-4xl">
          <DialogHeader>
            <DialogTitle>{selectedScreenshot?.url?.label || 'Screenshot'}</DialogTitle>
            <DialogDescription>
              {selectedScreenshot?.url?.url && (
                <span className="text-xs">{selectedScreenshot.url.url}</span>
              )}
            </DialogDescription>
          </DialogHeader>
          {selectedScreenshot && (
            <div className="overflow-auto max-h-[70vh]">
              <img
                src={screenshotApi.getFileUrl(selectedScreenshot.id)}
                alt={selectedScreenshot.fileName}
                className="w-full rounded-lg"
              />
            </div>
          )}
          <DialogFooter className="flex gap-2 sm:gap-0">
            <a 
              href={selectedScreenshot ? screenshotApi.getFileUrl(selectedScreenshot.id) : ''}
              download
            >
              <Button variant="outline" className="gap-1.5">
                <Download className="h-4 w-4" />
                Download
              </Button>
            </a>
            <Button 
              variant="destructive" 
              className="gap-1.5"
              onClick={() => {
                if (selectedScreenshot) {
                  setDeleteConfirm(selectedScreenshot);
                  setSelectedScreenshot(null);
                }
              }}
            >
              <Trash2 className="h-4 w-4" />
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Screenshot</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this screenshot? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirm(null)} disabled={isDeleting}>
              Cancel
            </Button>
            <Button 
              variant="destructive" 
              onClick={() => deleteConfirm && handleDelete(deleteConfirm)}
              disabled={isDeleting}
            >
              {isDeleting ? 'Deleting...' : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={deleteAllConfirm} onOpenChange={setDeleteAllConfirm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete All Screenshots</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete all {screenshots.length} screenshots? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteAllConfirm(false)} disabled={isDeleting}>
              Cancel
            </Button>
            <Button 
              variant="destructive" 
              onClick={handleDeleteAll}
              disabled={isDeleting}
            >
              {isDeleting ? 'Deleting...' : `Delete All (${screenshots.length})`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
