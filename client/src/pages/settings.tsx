import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import {
  Settings as SettingsIcon,
  Chrome,
  CheckCircle2,
  XCircle,
  Loader2,
  HardDrive,
  Clock,
  Image,
  RefreshCw,
} from "lucide-react";
import type { Settings, SystemStatus } from "@shared/schema";

export default function SettingsPage() {
  const { toast } = useToast();
  const [chromiumPath, setChromiumPath] = useState("");
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [isTesting, setIsTesting] = useState(false);

  const { data: settings, isLoading } = useQuery<Settings>({
    queryKey: ["/api/settings"],
  });

  const { data: status } = useQuery<SystemStatus>({
    queryKey: ["/api/status"],
    refetchInterval: 5000,
  });

  const updateMutation = useMutation({
    mutationFn: async (data: Partial<Settings>) => {
      return apiRequest("PATCH", "/api/settings", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/settings"] });
      queryClient.invalidateQueries({ queryKey: ["/api/status"] });
      toast({ title: "Settings saved successfully" });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to save settings",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const testChromiumMutation = useMutation({
    mutationFn: async (path: string) => {
      return apiRequest("POST", "/api/settings/test-chromium", { path });
    },
    onSuccess: (data: any) => {
      setTestResult({ success: true, message: data.message || "Chromium is working correctly" });
    },
    onError: (error: Error) => {
      setTestResult({ success: false, message: error.message });
    },
  });

  const detectChromiumMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("POST", "/api/settings/detect-chromium");
    },
    onSuccess: (data: any) => {
      if (data.path) {
        setChromiumPath(data.path);
        toast({ title: "Chromium detected", description: data.path });
      } else {
        toast({ title: "Chromium not found", description: "Please install or configure manually", variant: "destructive" });
      }
    },
    onError: (error: Error) => {
      toast({ title: "Detection failed", description: error.message, variant: "destructive" });
    },
  });

  useEffect(() => {
    if (settings?.chromiumPath) {
      setChromiumPath(settings.chromiumPath);
    }
  }, [settings]);

  const handleTestChromium = async () => {
    setIsTesting(true);
    setTestResult(null);
    try {
      await testChromiumMutation.mutateAsync(chromiumPath);
    } finally {
      setIsTesting(false);
    }
  };

  const handleSaveChromiumPath = () => {
    updateMutation.mutate({ chromiumPath });
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-64 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold" data-testid="text-settings-title">Settings</h1>
        <p className="text-sm text-muted-foreground">
          Configure your browser automation system
        </p>
      </div>

      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <Chrome className="h-5 w-5 text-muted-foreground" />
              <div>
                <CardTitle className="text-lg">Chromium Configuration</CardTitle>
                <CardDescription>
                  Set the path to Chromium browser for headless automation
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="chromium-path">Chromium Executable Path</Label>
              <div className="flex gap-2">
                <Input
                  id="chromium-path"
                  placeholder="/path/to/chromium or auto-detected"
                  value={chromiumPath}
                  onChange={(e) => setChromiumPath(e.target.value)}
                  className="flex-1 font-mono text-sm"
                  data-testid="input-chromium-path"
                />
                <Button
                  variant="outline"
                  onClick={() => detectChromiumMutation.mutate()}
                  disabled={detectChromiumMutation.isPending}
                  data-testid="button-detect-chromium"
                >
                  {detectChromiumMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <RefreshCw className="h-4 w-4" />
                  )}
                </Button>
              </div>
              {status?.chromiumPath && (
                <p className="text-xs text-muted-foreground font-mono">
                  Detected: {status.chromiumPath}
                </p>
              )}
            </div>

            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                onClick={handleTestChromium}
                disabled={isTesting || !chromiumPath}
                data-testid="button-test-chromium"
              >
                {isTesting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Testing...
                  </>
                ) : (
                  "Test Chromium"
                )}
              </Button>
              <Button
                onClick={handleSaveChromiumPath}
                disabled={updateMutation.isPending || !chromiumPath}
                data-testid="button-save-chromium"
              >
                {updateMutation.isPending ? "Saving..." : "Save Path"}
              </Button>
            </div>

            {testResult && (
              <Alert variant={testResult.success ? "default" : "destructive"}>
                {testResult.success ? (
                  <CheckCircle2 className="h-4 w-4" />
                ) : (
                  <XCircle className="h-4 w-4" />
                )}
                <AlertTitle>{testResult.success ? "Success" : "Failed"}</AlertTitle>
                <AlertDescription>{testResult.message}</AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <HardDrive className="h-5 w-5 text-muted-foreground" />
              <div>
                <CardTitle className="text-lg">Performance Settings</CardTitle>
                <CardDescription>
                  Optimize for Render's 512MB free tier
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label htmlFor="max-browsers">Maximum Concurrent Browsers</Label>
                <span className="text-sm font-mono text-muted-foreground">
                  {settings?.maxConcurrentBrowsers ?? 2}
                </span>
              </div>
              <Slider
                id="max-browsers"
                min={1}
                max={3}
                step={1}
                value={[settings?.maxConcurrentBrowsers ?? 2]}
                onValueChange={(value) =>
                  updateMutation.mutate({ maxConcurrentBrowsers: value[0] })
                }
                className="w-full"
                data-testid="slider-max-browsers"
              />
              <p className="text-xs text-muted-foreground">
                More browsers = higher memory usage. Recommended: 2 for 512MB RAM
              </p>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label htmlFor="default-interval">Default Interval (seconds)</Label>
                <span className="text-sm font-mono text-muted-foreground">
                  {settings?.defaultInterval ?? 300}s
                </span>
              </div>
              <Slider
                id="default-interval"
                min={30}
                max={3600}
                step={30}
                value={[settings?.defaultInterval ?? 300]}
                onValueChange={(value) =>
                  updateMutation.mutate({ defaultInterval: value[0] })
                }
                className="w-full"
                data-testid="slider-default-interval"
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <Image className="h-5 w-5 text-muted-foreground" />
              <div>
                <CardTitle className="text-lg">Screenshot Settings</CardTitle>
                <CardDescription>
                  Configure screenshot capture and cleanup
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Auto Cleanup Screenshots</Label>
                <p className="text-xs text-muted-foreground">
                  Automatically delete old screenshots to save storage
                </p>
              </div>
              <Switch
                checked={settings?.autoCleanupScreenshots ?? false}
                onCheckedChange={(checked) =>
                  updateMutation.mutate({ autoCleanupScreenshots: checked })
                }
                data-testid="switch-auto-cleanup"
              />
            </div>

            {settings?.autoCleanupScreenshots && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label htmlFor="retention-days">Retention Period (days)</Label>
                  <span className="text-sm font-mono text-muted-foreground">
                    {settings?.screenshotRetentionDays ?? 7} days
                  </span>
                </div>
                <Slider
                  id="retention-days"
                  min={1}
                  max={30}
                  step={1}
                  value={[settings?.screenshotRetentionDays ?? 7]}
                  onValueChange={(value) =>
                    updateMutation.mutate({ screenshotRetentionDays: value[0] })
                  }
                  className="w-full"
                  data-testid="slider-retention-days"
                />
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <SettingsIcon className="h-5 w-5 text-muted-foreground" />
              <div>
                <CardTitle className="text-lg">System Status</CardTitle>
                <CardDescription>
                  Current system information
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Memory Usage</p>
                <p className="text-lg font-mono" data-testid="text-status-memory">
                  {status?.memoryUsageMB ?? 0} / {status?.memoryLimitMB ?? 512} MB
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Active Browsers</p>
                <p className="text-lg font-mono" data-testid="text-status-browsers">
                  {status?.activeBrowsers ?? 0}
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Scheduled Tasks</p>
                <p className="text-lg font-mono" data-testid="text-status-tasks">
                  {status?.scheduledTasks ?? 0}
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Uptime</p>
                <p className="text-lg font-mono" data-testid="text-status-uptime">
                  {status?.uptime ? `${Math.floor(status.uptime / 3600)}h ${Math.floor((status.uptime % 3600) / 60)}m` : "0h 0m"}
                </p>
              </div>
              <div className="space-y-1 sm:col-span-2">
                <p className="text-sm text-muted-foreground">Chromium Status</p>
                <div className="flex items-center gap-2">
                  {status?.chromiumDetected ? (
                    <>
                      <CheckCircle2 className="h-4 w-4 text-chart-2" />
                      <span className="text-sm">Configured</span>
                    </>
                  ) : (
                    <>
                      <XCircle className="h-4 w-4 text-destructive" />
                      <span className="text-sm">Not configured</span>
                    </>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
