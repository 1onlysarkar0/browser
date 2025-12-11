import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import {
  Image as ImageIcon,
  Trash2,
  Calendar,
  Link2,
  Download,
  ZoomIn,
  Settings as SettingsIcon,
} from "lucide-react";
import type { ScreenshotWithUrl, Settings } from "@shared/schema";

export default function ScreenshotsPage() {
  const { toast } = useToast();
  const [selectedScreenshot, setSelectedScreenshot] = useState<ScreenshotWithUrl | null>(null);

  const { data: screenshots, isLoading } = useQuery<ScreenshotWithUrl[]>({
    queryKey: ["/api/screenshots"],
  });

  const { data: settings } = useQuery<Settings>({
    queryKey: ["/api/settings"],
  });

  const updateSettingsMutation = useMutation({
    mutationFn: async (data: Partial<Settings>) => {
      return apiRequest("PATCH", "/api/settings", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/settings"] });
      toast({ title: "Settings updated" });
    },
  });

  const deleteAllMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("DELETE", "/api/screenshots");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/screenshots"] });
      toast({ title: "All screenshots deleted" });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to delete screenshots",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest("DELETE", `/api/screenshots/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/screenshots"] });
      setSelectedScreenshot(null);
      toast({ title: "Screenshot deleted" });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to delete screenshot",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleString();
  };

  const handleDownload = (screenshot: ScreenshotWithUrl) => {
    const link = document.createElement("a");
    link.href = `/api/screenshots/${screenshot.id}/image`;
    link.download = screenshot.filename;
    link.click();
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-48" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Skeleton key={i} className="aspect-video" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold" data-testid="text-screenshots-title">
            Screenshots
          </h1>
          <p className="text-sm text-muted-foreground">
            View and manage captured screenshots
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {screenshots && screenshots.length > 0 && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" data-testid="button-delete-all">
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete All
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete All Screenshots?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will permanently delete all {screenshots.length} screenshots.
                    This action cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel data-testid="button-cancel-delete-all">
                    Cancel
                  </AlertDialogCancel>
                  <AlertDialogAction
                    onClick={() => deleteAllMutation.mutate()}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    data-testid="button-confirm-delete-all"
                  >
                    Delete All
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </div>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-3">
            <SettingsIcon className="h-5 w-5 text-muted-foreground" />
            <div className="flex-1">
              <CardTitle className="text-base">Auto Cleanup</CardTitle>
              <CardDescription>
                Automatically remove screenshots older than retention period
              </CardDescription>
            </div>
            <Switch
              checked={settings?.autoCleanupScreenshots ?? false}
              onCheckedChange={(checked) =>
                updateSettingsMutation.mutate({ autoCleanupScreenshots: checked })
              }
              data-testid="switch-auto-cleanup"
            />
          </div>
        </CardHeader>
        {settings?.autoCleanupScreenshots && (
          <CardContent className="pt-0">
            <p className="text-sm text-muted-foreground">
              Screenshots older than {settings.screenshotRetentionDays} days will be
              automatically deleted.
            </p>
          </CardContent>
        )}
      </Card>

      {!screenshots || screenshots.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <ImageIcon className="h-12 w-12 text-muted-foreground/50" />
            <h3 className="mt-4 text-lg font-medium">No screenshots yet</h3>
            <p className="mt-1 text-sm text-muted-foreground text-center max-w-sm">
              Screenshots will be captured during automation executions when enabled.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {screenshots.map((screenshot) => (
            <Card
              key={screenshot.id}
              className="overflow-hidden cursor-pointer hover-elevate"
              onClick={() => setSelectedScreenshot(screenshot)}
              data-testid={`card-screenshot-${screenshot.id}`}
            >
              <div className="relative aspect-video bg-muted">
                <img
                  src={`/api/screenshots/${screenshot.id}/image`}
                  alt={screenshot.filename}
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 hover:opacity-100 transition-opacity flex items-end justify-center pb-3">
                  <Button variant="secondary" size="sm">
                    <ZoomIn className="mr-1 h-4 w-4" />
                    View
                  </Button>
                </div>
              </div>
              <CardContent className="p-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate">{screenshot.urlName}</p>
                    <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                      <Calendar className="h-3 w-3" />
                      {formatDate(screenshot.createdAt)}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog
        open={!!selectedScreenshot}
        onOpenChange={(open) => !open && setSelectedScreenshot(null)}
      >
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>{selectedScreenshot?.urlName}</DialogTitle>
            <DialogDescription>
              Captured on {selectedScreenshot && formatDate(selectedScreenshot.createdAt)}
            </DialogDescription>
          </DialogHeader>
          {selectedScreenshot && (
            <div className="space-y-4">
              <div className="relative aspect-video w-full overflow-hidden rounded-md border border-border bg-muted">
                <img
                  src={`/api/screenshots/${selectedScreenshot.id}/image`}
                  alt={selectedScreenshot.filename}
                  className="w-full h-full object-contain"
                />
              </div>
              <div className="flex flex-wrap gap-2 justify-end">
                <Button
                  variant="outline"
                  onClick={() => handleDownload(selectedScreenshot)}
                  data-testid="button-download-screenshot"
                >
                  <Download className="mr-2 h-4 w-4" />
                  Download
                </Button>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      variant="destructive"
                      data-testid="button-delete-screenshot"
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      Delete
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Delete Screenshot?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This will permanently delete this screenshot. This action
                        cannot be undone.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() => deleteMutation.mutate(selectedScreenshot.id)}
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      >
                        Delete
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 grid-cols-2 sm:grid-cols-3">
            <div>
              <p className="text-sm text-muted-foreground">Total Screenshots</p>
              <p className="text-2xl font-bold" data-testid="text-total-screenshots">
                {screenshots?.length ?? 0}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Auto Cleanup</p>
              <p className="text-2xl font-bold">
                {settings?.autoCleanupScreenshots ? "On" : "Off"}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Retention</p>
              <p className="text-2xl font-bold">
                {settings?.screenshotRetentionDays ?? 7} days
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
