import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useLocation, useSearch } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import {
  Circle,
  Square,
  Save,
  Trash2,
  MousePointer,
  Keyboard,
  ArrowDown,
  Navigation,
  Clock,
  Eye,
  ArrowLeft,
  Plus,
  RefreshCw,
  Loader2,
  Play,
  Pencil,
  ArrowUp,
  ArrowDownIcon,
} from "lucide-react";

import type { Url, Action, ActionType, InsertAction, Recording } from "@shared/schema";

type RecordedAction = Omit<InsertAction, "recordingId" | "id"> & { tempId: string };

export default function RecorderPage() {
  const { id } = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const searchParams = useSearch();
  const { toast } = useToast();
  const urlId = parseInt(id || "0");

  const editRecordingId = new URLSearchParams(searchParams).get("edit");

  const [isRecording, setIsRecording] = useState(false);
  const [sessionActive, setSessionActive] = useState(false);
  const [sessionLoading, setSessionLoading] = useState(false);
  const [recordedActions, setRecordedActions] = useState<RecordedAction[]>([]);
  const [recordingName, setRecordingName] = useState("");
  const [selectedActionType, setSelectedActionType] = useState<ActionType>("click");
  const [actionSelector, setActionSelector] = useState("");
  const [actionValue, setActionValue] = useState("");
  const startTimeRef = useRef<number>(0);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [actionExecuting, setActionExecuting] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);

  const { data: url, isLoading } = useQuery<Url>({
    queryKey: ["/api/urls", urlId],
    enabled: urlId > 0,
  });

  const { data: existingRecordingData } = useQuery<Recording & { actions: Action[] }>({
    queryKey: [`/api/recordings/${editRecordingId}`],
    enabled: !!editRecordingId,
  });

  const [hasLoadedRecording, setHasLoadedRecording] = useState(false);

  useEffect(() => {
    if (existingRecordingData && !hasLoadedRecording) {
      setRecordingName(existingRecordingData.name);
      const actions = existingRecordingData.actions || [];
      setRecordedActions(
        actions.map((a) => ({
          tempId: crypto.randomUUID(),
          type: a.type,
          selector: a.selector,
          value: a.value,
          x: a.x,
          y: a.y,
          scrollX: a.scrollX,
          scrollY: a.scrollY,
          timestamp: a.timestamp,
          order: a.order,
        }))
      );
      setHasLoadedRecording(true);
    }
  }, [existingRecordingData, hasLoadedRecording]);

  const fetchPreview = useCallback(async () => {
    if (!url?.url) return;
    
    setPreviewLoading(true);
    setPreviewError(null);
    
    try {
      const response = await fetch(`/api/preview?url=${encodeURIComponent(url.url)}`);
      const data = await response.json();
      
      if (data.success && data.image) {
        setPreviewImage(data.image);
      } else {
        setPreviewError(data.error || "Failed to load preview");
      }
    } catch (err: any) {
      setPreviewError(err.message || "Failed to load preview");
    } finally {
      setPreviewLoading(false);
    }
  }, [url?.url]);

  useEffect(() => {
    if (url?.url && !sessionActive) {
      fetchPreview();
    }
  }, [url?.url, fetchPreview, sessionActive]);

  useEffect(() => {
    return () => {
      if (sessionActive) {
        fetch(`/api/session/${urlId}/close`, { method: "POST" }).catch(() => {});
      }
    };
  }, [sessionActive, urlId]);

  const startSession = async () => {
    setSessionLoading(true);
    setPreviewError(null);
    try {
      const response = await fetch(`/api/session/${urlId}/start`, { method: "POST" });
      const data = await response.json();
      if (data.success) {
        setSessionActive(true);
        setPreviewImage(`data:image/png;base64,${data.screenshot}`);
        toast({ title: "Live browser session started" });
      } else {
        setPreviewError(data.error || "Failed to start session");
        toast({ title: "Failed to start session", description: data.error, variant: "destructive" });
      }
    } catch (err: any) {
      setPreviewError(err.message);
      toast({ title: "Failed to start session", description: err.message, variant: "destructive" });
    } finally {
      setSessionLoading(false);
    }
  };

  const closeSession = async () => {
    try {
      await fetch(`/api/session/${urlId}/close`, { method: "POST" });
      setSessionActive(false);
      toast({ title: "Live session closed" });
    } catch (err: any) {
      toast({ title: "Failed to close session", description: err.message, variant: "destructive" });
    }
  };

  const executeAction = async (action: RecordedAction) => {
    if (!sessionActive) return;
    
    setActionExecuting(true);
    try {
      const response = await fetch(`/api/session/${urlId}/execute`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: action.type,
          selector: action.selector,
          value: action.value,
          scrollX: action.scrollX,
          scrollY: action.scrollY,
        }),
      });
      const data = await response.json();
      if (data.success && data.screenshot) {
        setPreviewImage(`data:image/png;base64,${data.screenshot}`);
      } else if (data.error) {
        toast({ title: "Action failed", description: data.error, variant: "destructive" });
      }
    } catch (err: any) {
      toast({ title: "Action failed", description: err.message, variant: "destructive" });
    } finally {
      setActionExecuting(false);
    }
  };

  const saveMutation = useMutation({
    mutationFn: async (data: { urlId: number; name: string; actions: RecordedAction[] }) => {
      if (editRecordingId) {
        return apiRequest("PUT", `/api/recordings/${editRecordingId}`, {
          name: data.name,
          actions: data.actions,
        });
      }
      return apiRequest("POST", "/api/recordings", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/recordings"] });
      toast({ title: editRecordingId ? "Recording updated" : "Recording saved successfully" });
      navigate(`/urls`);
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to save recording",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleStartRecording = async () => {
    setIsRecording(true);
    if (!editRecordingId) {
      setRecordedActions([]);
    }
    startTimeRef.current = Date.now();
    
    if (!sessionActive) {
      await startSession();
    }
    
    toast({ title: "Recording started", description: "Add actions - they will execute live in the browser" });
  };

  const handleStopRecording = async () => {
    setIsRecording(false);
    if (sessionActive) {
      await closeSession();
    }
    toast({ title: "Recording stopped" });
  };

  const handleAddAction = async () => {
    if (!actionSelector && selectedActionType !== "wait" && selectedActionType !== "navigate") {
      toast({ title: "Please enter a CSS selector", variant: "destructive" });
      return;
    }

    const timestamp = Date.now() - startTimeRef.current;
    const action: RecordedAction = {
      tempId: crypto.randomUUID(),
      type: selectedActionType,
      selector: selectedActionType === "wait" || selectedActionType === "navigate" ? null : actionSelector,
      value: actionValue || null,
      x: null,
      y: null,
      scrollX: null,
      scrollY: selectedActionType === "scroll" ? parseInt(actionValue) || 0 : null,
      timestamp,
      order: editingIndex !== null ? editingIndex : recordedActions.length,
    };

    if (editingIndex !== null) {
      const newActions = [...recordedActions];
      newActions[editingIndex] = action;
      setRecordedActions(newActions);
      setEditingIndex(null);
    } else {
      setRecordedActions([...recordedActions, action]);
    }

    if (sessionActive) {
      await executeAction(action);
    }

    setActionSelector("");
    setActionValue("");
  };

  const handleEditAction = (index: number) => {
    const action = recordedActions[index];
    setSelectedActionType(action.type);
    setActionSelector(action.selector || "");
    setActionValue(action.value || (action.scrollY?.toString() || ""));
    setEditingIndex(index);
  };

  const handleCancelEdit = () => {
    setEditingIndex(null);
    setActionSelector("");
    setActionValue("");
    setSelectedActionType("click");
  };

  const handleRemoveAction = (tempId: string) => {
    setRecordedActions(recordedActions.filter((a) => a.tempId !== tempId));
  };

  const handleMoveAction = (index: number, direction: "up" | "down") => {
    const newActions = [...recordedActions];
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= newActions.length) return;
    [newActions[index], newActions[targetIndex]] = [newActions[targetIndex], newActions[index]];
    newActions.forEach((a, i) => (a.order = i));
    setRecordedActions(newActions);
  };

  const handleReplayAction = async (action: RecordedAction) => {
    if (!sessionActive) {
      toast({ title: "Start a recording session first", variant: "destructive" });
      return;
    }
    await executeAction(action);
  };

  const handleSaveRecording = () => {
    if (!recordingName.trim()) {
      toast({ title: "Please enter a recording name", variant: "destructive" });
      return;
    }
    if (recordedActions.length === 0) {
      toast({ title: "Please add at least one action", variant: "destructive" });
      return;
    }
    saveMutation.mutate({
      urlId,
      name: recordingName,
      actions: recordedActions,
    });
  };

  const getActionIcon = (type: ActionType) => {
    switch (type) {
      case "click":
        return <MousePointer className="h-4 w-4" />;
      case "type":
        return <Keyboard className="h-4 w-4" />;
      case "scroll":
        return <ArrowDown className="h-4 w-4" />;
      case "navigate":
        return <Navigation className="h-4 w-4" />;
      case "wait":
        return <Clock className="h-4 w-4" />;
      case "hover":
        return <Eye className="h-4 w-4" />;
      default:
        return <MousePointer className="h-4 w-4" />;
    }
  };

  const formatTimestamp = (ms: number) => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  if (!url) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <p className="text-lg text-muted-foreground">URL not found</p>
        <Button variant="outline" className="mt-4" onClick={() => navigate("/urls")}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to URLs
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/urls")}
            data-testid="button-back"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-2xl font-semibold" data-testid="text-recorder-title">
            {editRecordingId ? "Edit Recording" : "Action Recorder"}
          </h1>
        </div>
        <p className="text-sm text-muted-foreground ml-10">
          {editRecordingId ? "Editing" : "Record actions for"}: <span className="font-medium">{url.name}</span>
        </p>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div>
              <CardTitle className="text-base">Live Browser Preview</CardTitle>
              <CardDescription>
                {sessionActive ? (
                  <span className="text-green-600 dark:text-green-400">Live session active - actions execute in real-time</span>
                ) : (
                  "Start recording to enable live preview"
                )}
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              {sessionActive && (
                <Badge variant="default" className="bg-green-600">
                  Live
                </Badge>
              )}
              {!sessionActive && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={fetchPreview}
                  disabled={previewLoading}
                  data-testid="button-refresh-preview"
                >
                  {previewLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <RefreshCw className="h-4 w-4" />
                  )}
                  <span className="ml-2">Refresh</span>
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="relative aspect-video w-full overflow-hidden rounded-md border border-border bg-muted">
            {(previewLoading || sessionLoading) && !previewImage ? (
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-4">
                <Loader2 className="h-10 w-10 text-muted-foreground animate-spin" />
                <p className="mt-4 text-sm text-muted-foreground">
                  {sessionLoading ? "Starting live browser session..." : "Loading preview..."}
                </p>
              </div>
            ) : previewImage ? (
              <>
                <img
                  src={previewImage}
                  alt="Page preview"
                  className="w-full h-full object-contain"
                  data-testid="img-preview"
                />
                {actionExecuting && (
                  <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                    <Loader2 className="h-8 w-8 text-white animate-spin" />
                  </div>
                )}
              </>
            ) : previewError ? (
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-4">
                <Navigation className="h-10 w-10 text-muted-foreground/50" />
                <p className="mt-4 text-sm font-medium">Preview Error</p>
                <p className="text-xs text-muted-foreground max-w-md mt-1">{previewError}</p>
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-4"
                  onClick={fetchPreview}
                  data-testid="button-retry-preview"
                >
                  Retry
                </Button>
              </div>
            ) : (
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-4">
                <Navigation className="h-10 w-10 text-muted-foreground/50" />
                <p className="mt-4 text-sm font-medium">No Preview Available</p>
                <p className="text-xs text-muted-foreground max-w-md mt-1">
                  Start recording to launch a live browser session.
                </p>
              </div>
            )}
          </div>
          <div className="mt-2 flex items-center justify-between">
            <p className="text-xs text-muted-foreground font-mono truncate max-w-[70%]">{url.url}</p>
            <a
              href={url.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-primary hover:underline"
              data-testid="link-open-url"
            >
              Open in new tab
            </a>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Recording Controls</CardTitle>
              <CardDescription>Start a live session to record browser actions</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="recording-name">Recording Name</Label>
                <Input
                  id="recording-name"
                  placeholder="My Recording"
                  value={recordingName}
                  onChange={(e) => setRecordingName(e.target.value)}
                  data-testid="input-recording-name"
                />
              </div>

              <div className="flex flex-wrap gap-2">
                {!isRecording ? (
                  <Button 
                    onClick={handleStartRecording} 
                    disabled={sessionLoading}
                    data-testid="button-start-record"
                  >
                    {sessionLoading ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Circle className="mr-2 h-4 w-4 fill-current text-destructive" />
                    )}
                    Start Recording
                  </Button>
                ) : (
                  <Button
                    variant="destructive"
                    onClick={handleStopRecording}
                    data-testid="button-stop-record"
                  >
                    <Square className="mr-2 h-4 w-4 fill-current" />
                    Stop Recording
                  </Button>
                )}
                <Button
                  variant="outline"
                  onClick={handleSaveRecording}
                  disabled={saveMutation.isPending || recordedActions.length === 0}
                  data-testid="button-save-recording"
                >
                  <Save className="mr-2 h-4 w-4" />
                  {saveMutation.isPending ? "Saving..." : editRecordingId ? "Update Recording" : "Save Recording"}
                </Button>
              </div>

              {isRecording && (
                <Badge variant="destructive" className="animate-pulse">
                  Recording in progress...
                </Badge>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">
                {editingIndex !== null ? "Edit Action" : "Add Action"}
              </CardTitle>
              <CardDescription>
                {editingIndex !== null ? "Modify the selected action" : "Add actions that will execute live"}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Action Type</Label>
                <Select
                  value={selectedActionType}
                  onValueChange={(v) => setSelectedActionType(v as ActionType)}
                >
                  <SelectTrigger data-testid="select-action-type">
                    <SelectValue placeholder="Select action type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="click">Click</SelectItem>
                    <SelectItem value="type">Type Text</SelectItem>
                    <SelectItem value="scroll">Scroll</SelectItem>
                    <SelectItem value="hover">Hover</SelectItem>
                    <SelectItem value="wait">Wait</SelectItem>
                    <SelectItem value="navigate">Navigate</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {selectedActionType !== "wait" && selectedActionType !== "navigate" && (
                <div className="space-y-2">
                  <Label htmlFor="selector">CSS Selector</Label>
                  <Input
                    id="selector"
                    placeholder="#button, .class, [data-testid='x']"
                    value={actionSelector}
                    onChange={(e) => setActionSelector(e.target.value)}
                    className="font-mono text-sm"
                    data-testid="input-selector"
                  />
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="value">
                  {selectedActionType === "type"
                    ? "Text to Type"
                    : selectedActionType === "scroll"
                    ? "Scroll Amount (pixels)"
                    : selectedActionType === "wait"
                    ? "Wait Time (ms)"
                    : selectedActionType === "navigate"
                    ? "URL"
                    : "Value (optional)"}
                </Label>
                <Input
                  id="value"
                  placeholder={
                    selectedActionType === "type"
                      ? "Hello World"
                      : selectedActionType === "scroll"
                      ? "500"
                      : selectedActionType === "wait"
                      ? "1000"
                      : selectedActionType === "navigate"
                      ? "https://example.com"
                      : ""
                  }
                  value={actionValue}
                  onChange={(e) => setActionValue(e.target.value)}
                  data-testid="input-value"
                />
              </div>

              <div className="flex gap-2">
                <Button
                  onClick={handleAddAction}
                  className="flex-1"
                  disabled={!isRecording || actionExecuting}
                  data-testid="button-add-action"
                >
                  {actionExecuting ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Plus className="mr-2 h-4 w-4" />
                  )}
                  {editingIndex !== null ? "Update Action" : "Add & Execute"}
                </Button>
                {editingIndex !== null && (
                  <Button variant="outline" onClick={handleCancelEdit} data-testid="button-cancel-edit">
                    Cancel
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        <Card className="lg:row-span-2">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <div>
                <CardTitle className="text-base">Recorded Actions</CardTitle>
                <CardDescription>
                  {recordedActions.length} action{recordedActions.length !== 1 ? "s" : ""} recorded
                </CardDescription>
              </div>
              {recordedActions.length > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setRecordedActions([])}
                  data-testid="button-clear-actions"
                >
                  <Trash2 className="mr-1 h-4 w-4" />
                  Clear
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {recordedActions.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <MousePointer className="h-10 w-10 text-muted-foreground/50" />
                <p className="mt-4 text-sm text-muted-foreground">No actions recorded yet</p>
                <p className="text-xs text-muted-foreground">
                  Start recording and add actions using the controls
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <ScrollArea className="h-[400px]">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-12">#</TableHead>
                        <TableHead>Action</TableHead>
                        <TableHead>Target</TableHead>
                        <TableHead className="w-24">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {recordedActions.map((action, index) => (
                        <TableRow key={action.tempId} data-testid={`row-action-${index}`}>
                          <TableCell className="text-muted-foreground">{index + 1}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              {getActionIcon(action.type)}
                              <span className="capitalize">{action.type}</span>
                            </div>
                          </TableCell>
                          <TableCell className="font-mono text-xs max-w-[120px] truncate">
                            {action.selector || action.value || "-"}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleMoveAction(index, "up")}
                                disabled={index === 0}
                                data-testid={`button-move-up-${index}`}
                              >
                                <ArrowUp className="h-3 w-3" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleMoveAction(index, "down")}
                                disabled={index === recordedActions.length - 1}
                                data-testid={`button-move-down-${index}`}
                              >
                                <ArrowDownIcon className="h-3 w-3" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleEditAction(index)}
                                data-testid={`button-edit-action-${index}`}
                              >
                                <Pencil className="h-3 w-3" />
                              </Button>
                              {sessionActive && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleReplayAction(action)}
                                  disabled={actionExecuting}
                                  data-testid={`button-replay-action-${index}`}
                                >
                                  <Play className="h-3 w-3" />
                                </Button>
                              )}
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleRemoveAction(action.tempId)}
                                data-testid={`button-remove-action-${index}`}
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </ScrollArea>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
