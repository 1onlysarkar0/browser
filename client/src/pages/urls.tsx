import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
import { Link } from "wouter";
import {
  Plus,
  Play,
  Pause,
  Settings,
  Trash2,
  Edit,
  ExternalLink,
  Clock,
  Camera,
  Link2,
  FileText,
  ChevronDown,
  ChevronRight,
  Pencil,
} from "lucide-react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import type { Url, InsertUrl, Recording } from "@shared/schema";

export default function UrlsPage() {
  const { toast } = useToast();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingUrl, setEditingUrl] = useState<Url | null>(null);
  const [expandedUrls, setExpandedUrls] = useState<Set<number>>(new Set());
  const [newUrl, setNewUrl] = useState<Partial<InsertUrl>>({
    name: "",
    url: "",
    isActive: true,
    intervalSeconds: 300,
    speedMultiplier: 1,
    captureScreenshots: true,
  });

  const { data: urls, isLoading } = useQuery<Url[]>({
    queryKey: ["/api/urls"],
  });

  const { data: allRecordings } = useQuery<Recording[]>({
    queryKey: ["/api/recordings"],
  });

  const getRecordingsForUrl = (urlId: number) => {
    return allRecordings?.filter(r => r.urlId === urlId) || [];
  };

  const toggleUrlExpanded = (urlId: number) => {
    setExpandedUrls(prev => {
      const newSet = new Set(prev);
      if (newSet.has(urlId)) {
        newSet.delete(urlId);
      } else {
        newSet.add(urlId);
      }
      return newSet;
    });
  };

  const deleteRecordingMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest("DELETE", `/api/recordings/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/recordings"] });
      toast({ title: "Recording deleted" });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to delete recording", description: error.message, variant: "destructive" });
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: InsertUrl) => {
      return apiRequest("POST", "/api/urls", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/urls"] });
      setIsAddDialogOpen(false);
      setNewUrl({
        name: "",
        url: "",
        isActive: true,
        intervalSeconds: 300,
        speedMultiplier: 1,
        captureScreenshots: true,
      });
      toast({ title: "URL added successfully" });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to add URL", description: error.message, variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<InsertUrl> }) => {
      return apiRequest("PATCH", `/api/urls/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/urls"] });
      setEditingUrl(null);
      toast({ title: "URL updated successfully" });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to update URL", description: error.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest("DELETE", `/api/urls/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/urls"] });
      toast({ title: "URL deleted successfully" });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to delete URL", description: error.message, variant: "destructive" });
    },
  });

  const toggleActiveMutation = useMutation({
    mutationFn: async ({ id, isActive }: { id: number; isActive: boolean }) => {
      return apiRequest("PATCH", `/api/urls/${id}`, { isActive });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/urls"] });
    },
  });

  const handleAddUrl = () => {
    if (!newUrl.name || !newUrl.url) {
      toast({ title: "Please fill in all required fields", variant: "destructive" });
      return;
    }
    createMutation.mutate(newUrl as InsertUrl);
  };

  const handleUpdateUrl = () => {
    if (!editingUrl) return;
    updateMutation.mutate({
      id: editingUrl.id,
      data: {
        name: editingUrl.name,
        url: editingUrl.url,
        intervalSeconds: editingUrl.intervalSeconds,
        speedMultiplier: editingUrl.speedMultiplier,
        captureScreenshots: editingUrl.captureScreenshots,
      },
    });
  };

  const formatInterval = (seconds: number) => {
    if (seconds < 60) return `${seconds}s`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
    return `${Math.floor(seconds / 3600)}h`;
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold" data-testid="text-urls-title">URLs</h1>
          <p className="text-sm text-muted-foreground">
            Manage URLs for browser automation
          </p>
        </div>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button data-testid="button-add-url">
              <Plus className="mr-2 h-4 w-4" />
              Add URL
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New URL</DialogTitle>
              <DialogDescription>
                Add a URL to automate. You can record actions after adding.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  placeholder="My Website"
                  value={newUrl.name}
                  onChange={(e) => setNewUrl({ ...newUrl, name: e.target.value })}
                  data-testid="input-url-name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="url">URL</Label>
                <Input
                  id="url"
                  placeholder="https://example.com"
                  value={newUrl.url}
                  onChange={(e) => setNewUrl({ ...newUrl, url: e.target.value })}
                  data-testid="input-url-address"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="interval">Interval (seconds)</Label>
                <Input
                  id="interval"
                  type="number"
                  min={30}
                  value={newUrl.intervalSeconds}
                  onChange={(e) =>
                    setNewUrl({ ...newUrl, intervalSeconds: parseInt(e.target.value) || 300 })
                  }
                  data-testid="input-interval"
                />
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="screenshots">Capture Screenshots</Label>
                <Switch
                  id="screenshots"
                  checked={newUrl.captureScreenshots}
                  onCheckedChange={(checked) =>
                    setNewUrl({ ...newUrl, captureScreenshots: checked })
                  }
                  data-testid="switch-screenshots"
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setIsAddDialogOpen(false)}
                data-testid="button-cancel-add"
              >
                Cancel
              </Button>
              <Button
                onClick={handleAddUrl}
                disabled={createMutation.isPending}
                data-testid="button-save-url"
              >
                {createMutation.isPending ? "Adding..." : "Add URL"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardContent className="p-4">
                <Skeleton className="h-20 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : urls?.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Link2 className="h-12 w-12 text-muted-foreground/50" />
            <h3 className="mt-4 text-lg font-medium">No URLs added yet</h3>
            <p className="mt-1 text-sm text-muted-foreground text-center max-w-sm">
              Add your first URL to start recording browser actions for automation.
            </p>
            <Button
              className="mt-4"
              onClick={() => setIsAddDialogOpen(true)}
              data-testid="button-add-first-url"
            >
              <Plus className="mr-2 h-4 w-4" />
              Add Your First URL
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {urls?.map((url) => (
            <Card key={url.id} data-testid={`card-url-${url.id}`}>
              <CardContent className="p-4">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-start gap-4 min-w-0 flex-1">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-muted">
                      <Link2 className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-medium truncate" data-testid={`text-url-name-${url.id}`}>
                          {url.name}
                        </h3>
                        <Badge
                          variant={url.isActive ? "default" : "secondary"}
                          className="text-xs"
                        >
                          {url.isActive ? "Active" : "Paused"}
                        </Badge>
                      </div>
                      <p className="truncate text-sm text-muted-foreground font-mono mt-1">
                        {url.url}
                      </p>
                      <div className="flex flex-wrap items-center gap-3 mt-2 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          Every {formatInterval(url.intervalSeconds)}
                        </span>
                        {url.captureScreenshots && (
                          <span className="flex items-center gap-1">
                            <Camera className="h-3 w-3" />
                            Screenshots
                          </span>
                        )}
                        {url.lastExecutedAt && (
                          <span>
                            Last run:{" "}
                            {new Date(url.lastExecutedAt).toLocaleString()}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Switch
                      checked={url.isActive}
                      onCheckedChange={(checked) =>
                        toggleActiveMutation.mutate({ id: url.id, isActive: checked })
                      }
                      data-testid={`switch-active-${url.id}`}
                    />
                    <Link href={`/recorder/${url.id}`}>
                      <Button variant="outline" size="icon" data-testid={`button-record-${url.id}`}>
                        <Play className="h-4 w-4" />
                      </Button>
                    </Link>
                    <Dialog
                      open={editingUrl?.id === url.id}
                      onOpenChange={(open) => !open && setEditingUrl(null)}
                    >
                      <DialogTrigger asChild>
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => setEditingUrl(url)}
                          data-testid={`button-edit-${url.id}`}
                        >
                          <Settings className="h-4 w-4" />
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>URL Settings</DialogTitle>
                          <DialogDescription>
                            Configure automation settings for this URL
                          </DialogDescription>
                        </DialogHeader>
                        {editingUrl && (
                          <div className="space-y-4 py-4">
                            <div className="space-y-2">
                              <Label htmlFor="edit-name">Name</Label>
                              <Input
                                id="edit-name"
                                value={editingUrl.name}
                                onChange={(e) =>
                                  setEditingUrl({ ...editingUrl, name: e.target.value })
                                }
                                data-testid="input-edit-name"
                              />
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="edit-url">URL</Label>
                              <Input
                                id="edit-url"
                                value={editingUrl.url}
                                onChange={(e) =>
                                  setEditingUrl({ ...editingUrl, url: e.target.value })
                                }
                                data-testid="input-edit-url"
                              />
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="edit-interval">Interval (seconds)</Label>
                              <Input
                                id="edit-interval"
                                type="number"
                                min={30}
                                value={editingUrl.intervalSeconds}
                                onChange={(e) =>
                                  setEditingUrl({
                                    ...editingUrl,
                                    intervalSeconds: parseInt(e.target.value) || 300,
                                  })
                                }
                                data-testid="input-edit-interval"
                              />
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="edit-speed">Speed Multiplier</Label>
                              <Input
                                id="edit-speed"
                                type="number"
                                min={0.1}
                                max={10}
                                step={0.1}
                                value={editingUrl.speedMultiplier}
                                onChange={(e) =>
                                  setEditingUrl({
                                    ...editingUrl,
                                    speedMultiplier: parseFloat(e.target.value) || 1,
                                  })
                                }
                                data-testid="input-edit-speed"
                              />
                            </div>
                            <div className="flex items-center justify-between">
                              <Label htmlFor="edit-screenshots">Capture Screenshots</Label>
                              <Switch
                                id="edit-screenshots"
                                checked={editingUrl.captureScreenshots}
                                onCheckedChange={(checked) =>
                                  setEditingUrl({ ...editingUrl, captureScreenshots: checked })
                                }
                                data-testid="switch-edit-screenshots"
                              />
                            </div>
                          </div>
                        )}
                        <DialogFooter>
                          <Button
                            variant="outline"
                            onClick={() => setEditingUrl(null)}
                            data-testid="button-cancel-edit"
                          >
                            Cancel
                          </Button>
                          <Button
                            onClick={handleUpdateUrl}
                            disabled={updateMutation.isPending}
                            data-testid="button-save-edit"
                          >
                            {updateMutation.isPending ? "Saving..." : "Save Changes"}
                          </Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          variant="outline"
                          size="icon"
                          data-testid={`button-delete-${url.id}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete URL?</AlertDialogTitle>
                          <AlertDialogDescription>
                            This will permanently delete "{url.name}" and all associated
                            recordings and executions. This action cannot be undone.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel data-testid="button-cancel-delete">
                            Cancel
                          </AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => deleteMutation.mutate(url.id)}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            data-testid="button-confirm-delete"
                          >
                            Delete
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>

                {/* Recordings Section */}
                {getRecordingsForUrl(url.id).length > 0 && (
                  <Collapsible
                    open={expandedUrls.has(url.id)}
                    onOpenChange={() => toggleUrlExpanded(url.id)}
                  >
                    <CollapsibleTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="mt-3 w-full justify-start gap-2"
                        data-testid={`button-toggle-recordings-${url.id}`}
                      >
                        {expandedUrls.has(url.id) ? (
                          <ChevronDown className="h-4 w-4" />
                        ) : (
                          <ChevronRight className="h-4 w-4" />
                        )}
                        <FileText className="h-4 w-4" />
                        <span>
                          {getRecordingsForUrl(url.id).length} Recording
                          {getRecordingsForUrl(url.id).length !== 1 ? "s" : ""}
                        </span>
                      </Button>
                    </CollapsibleTrigger>
                    <CollapsibleContent className="mt-2">
                      <div className="space-y-2 pl-6">
                        {getRecordingsForUrl(url.id).map((recording) => (
                          <div
                            key={recording.id}
                            className="flex items-center justify-between rounded-md border border-border p-2"
                            data-testid={`recording-${recording.id}`}
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
                              <span className="text-sm truncate">{recording.name}</span>
                              <Badge variant="outline" className="text-xs shrink-0">
                                {recording.actions?.length ?? 0} actions
                              </Badge>
                            </div>
                            <div className="flex items-center gap-1">
                              <Link href={`/recorder/${url.id}?edit=${recording.id}`}>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  data-testid={`button-edit-recording-${recording.id}`}
                                >
                                  <Pencil className="h-4 w-4" />
                                </Button>
                              </Link>
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    data-testid={`button-delete-recording-${recording.id}`}
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Delete Recording?</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      This will permanently delete "{recording.name}".
                                      This action cannot be undone.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                    <AlertDialogAction
                                      onClick={() => deleteRecordingMutation.mutate(recording.id)}
                                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                    >
                                      Delete
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CollapsibleContent>
                  </Collapsible>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Edit URL Dialog is handled inline above */}
    </div>
  );
}
