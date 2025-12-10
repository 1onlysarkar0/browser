'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Trash2, Download, ZoomIn } from 'lucide-react';
import { screenshotApi } from '@/lib/api';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';

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

  useEffect(() => {
    fetchScreenshots();
  }, []);

  const fetchScreenshots = async () => {
    try {
      const response = await screenshotApi.getAll(50, 0);
      setScreenshots(response.data.screenshots);
    } catch (error) {
      console.error('Failed to fetch screenshots:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this screenshot?')) {
      try {
        await screenshotApi.delete(id);
        setScreenshots(screenshots.filter(s => s.id !== id));
        toast.success('Screenshot deleted');
      } catch (error: any) {
        toast.error('Failed to delete screenshot');
      }
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
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
      <div>
        <h1 className="text-3xl font-bold">Screenshots</h1>
        <p className="text-muted-foreground">View captured screenshots from your automations</p>
      </div>

      {screenshots.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <p className="text-muted-foreground">No screenshots captured yet</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {screenshots.map((screenshot) => (
            <Card key={screenshot.id} className="overflow-hidden">
              <div
                className="aspect-video bg-muted cursor-pointer relative group"
                onClick={() => setSelectedScreenshot(screenshot)}
              >
                <img
                  src={screenshotApi.getFileUrl(screenshot.id)}
                  alt={screenshot.fileName}
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <ZoomIn className="h-8 w-8 text-white" />
                </div>
              </div>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-sm truncate">
                      {screenshot.url?.label || 'Unknown'}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(screenshot.capturedAt), { addSuffix: true })}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {screenshot.width}x{screenshot.height} - {formatFileSize(screenshot.fileSize)}
                    </p>
                  </div>
                  <div className="flex items-center gap-1">
                    <a href={screenshotApi.getFileUrl(screenshot.id)} download>
                      <Button variant="ghost" size="icon">
                        <Download className="h-4 w-4" />
                      </Button>
                    </a>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDelete(screenshot.id)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={!!selectedScreenshot} onOpenChange={() => setSelectedScreenshot(null)}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>{selectedScreenshot?.url?.label || 'Screenshot'}</DialogTitle>
          </DialogHeader>
          {selectedScreenshot && (
            <img
              src={screenshotApi.getFileUrl(selectedScreenshot.id)}
              alt={selectedScreenshot.fileName}
              className="w-full"
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
