import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "wouter";
import {
  Link2,
  Play,
  CheckCircle2,
  XCircle,
  Clock,
  Activity,
  HardDrive,
  Image,
  ArrowRight,
  Zap,
} from "lucide-react";
import type { Url, ExecutionWithUrl, SystemStatus } from "@shared/schema";

export default function Dashboard() {
  const { data: urls, isLoading: urlsLoading } = useQuery<Url[]>({
    queryKey: ["/api/urls"],
    refetchInterval: 3000,
  });

  const { data: executions, isLoading: executionsLoading } = useQuery<ExecutionWithUrl[]>({
    queryKey: ["/api/executions"],
    refetchInterval: 2000,
  });

  const { data: status, isLoading: statusLoading } = useQuery<SystemStatus>({
    queryKey: ["/api/status"],
    refetchInterval: 5000,
  });

  const activeUrls = urls?.filter((u) => u.isActive).length ?? 0;
  const totalUrls = urls?.length ?? 0;
  const recentExecutions = executions?.slice(0, 5) ?? [];
  const successRate = executions?.length
    ? Math.round(
        (executions.filter((e) => e.status === "success").length / executions.length) * 100
      )
    : 0;

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "success":
        return <CheckCircle2 className="h-4 w-4 text-chart-2" />;
      case "failed":
        return <XCircle className="h-4 w-4 text-destructive" />;
      case "running":
        return <Activity className="h-4 w-4 text-chart-1 animate-pulse" />;
      default:
        return <Clock className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      success: "default",
      failed: "destructive",
      running: "secondary",
      pending: "outline",
    };
    return (
      <Badge variant={variants[status] || "outline"} className="text-xs">
        {status}
      </Badge>
    );
  };

  const formatTimeAgo = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${diffDays}d ago`;
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold" data-testid="text-dashboard-title">Dashboard</h1>
        <p className="text-sm text-muted-foreground">
          Monitor your browser automation system and recent activity
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-4 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active URLs</CardTitle>
            <Link2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {urlsLoading ? (
              <Skeleton className="h-8 w-20" />
            ) : (
              <>
                <div className="text-2xl font-bold" data-testid="text-active-urls">{activeUrls}</div>
                <p className="text-xs text-muted-foreground">of {totalUrls} total</p>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-4 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {executionsLoading ? (
              <Skeleton className="h-8 w-20" />
            ) : (
              <>
                <div className="text-2xl font-bold" data-testid="text-success-rate">{successRate}%</div>
                <p className="text-xs text-muted-foreground">last 24 hours</p>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-4 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Memory Usage</CardTitle>
            <HardDrive className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {statusLoading ? (
              <Skeleton className="h-8 w-20" />
            ) : (
              <>
                <div className="text-2xl font-bold" data-testid="text-memory-usage">
                  {status?.memoryUsageMB ?? 0}MB
                </div>
                <p className="text-xs text-muted-foreground">
                  of {status?.memoryLimitMB ?? 512}MB limit
                </p>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-4 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Scheduled Tasks</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {statusLoading ? (
              <Skeleton className="h-8 w-20" />
            ) : (
              <>
                <div className="text-2xl font-bold" data-testid="text-scheduled-tasks">
                  {status?.scheduledTasks ?? 0}
                </div>
                <p className="text-xs text-muted-foreground">active schedules</p>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between gap-4">
              <div>
                <CardTitle className="text-lg">Recent Executions</CardTitle>
                <CardDescription>Latest automation runs</CardDescription>
              </div>
              <Link href="/history">
                <Button variant="ghost" size="sm" data-testid="button-view-history">
                  View all
                  <ArrowRight className="ml-1 h-4 w-4" />
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            {executionsLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : recentExecutions.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <Activity className="h-10 w-10 text-muted-foreground/50" />
                <p className="mt-2 text-sm text-muted-foreground">
                  No executions yet
                </p>
                <p className="text-xs text-muted-foreground">
                  Add a URL and start recording to begin
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {recentExecutions.map((execution) => (
                  <div
                    key={execution.id}
                    className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between rounded-md border border-border p-3"
                    data-testid={`card-execution-${execution.id}`}
                  >
                    <div className="flex items-center gap-3">
                      {getStatusIcon(execution.status)}
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">
                          {execution.urlName}
                        </p>
                        <p className="truncate text-xs text-muted-foreground font-mono">
                          {execution.urlAddress}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {getStatusBadge(execution.status)}
                      <span className="text-xs text-muted-foreground">
                        {formatTimeAgo(execution.startedAt)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between gap-4">
              <div>
                <CardTitle className="text-lg">Quick Actions</CardTitle>
                <CardDescription>Manage your automation</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3">
              <Link href="/urls">
                <Button variant="outline" className="w-full justify-start gap-3" data-testid="button-add-url">
                  <Link2 className="h-4 w-4" />
                  Add New URL
                </Button>
              </Link>
              <Link href="/urls">
                <Button variant="outline" className="w-full justify-start gap-3" data-testid="button-start-recording">
                  <Play className="h-4 w-4" />
                  Start Recording
                </Button>
              </Link>
              <Link href="/screenshots">
                <Button variant="outline" className="w-full justify-start gap-3" data-testid="button-view-screenshots">
                  <Image className="h-4 w-4" />
                  View Screenshots
                </Button>
              </Link>
              <Link href="/settings">
                <Button variant="outline" className="w-full justify-start gap-3" data-testid="button-configure-system">
                  <Zap className="h-4 w-4" />
                  Configure System
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>

      {status && !status.chromiumDetected && (
        <Card className="border-destructive/50 bg-destructive/5">
          <CardHeader className="pb-2">
            <CardTitle className="text-base text-destructive">Chromium Not Configured</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Chromium browser is required for playback automation. Please configure the Chromium path in Settings.
            </p>
            <Link href="/settings">
              <Button variant="destructive" size="sm" className="mt-3" data-testid="button-configure-chromium">
                Configure Chromium
              </Button>
            </Link>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
