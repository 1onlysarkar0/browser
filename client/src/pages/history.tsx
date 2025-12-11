import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { useToast } from "@/hooks/use-toast";
import {
  History as HistoryIcon,
  CheckCircle2,
  XCircle,
  Clock,
  Activity,
  ChevronDown,
  Image,
  Trash2,
  RefreshCw,
} from "lucide-react";
import type { ExecutionWithUrl, ScreenshotWithUrl } from "@shared/schema";

export default function HistoryPage() {
  const { toast } = useToast();
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set());

  const { data: executions, isLoading } = useQuery<ExecutionWithUrl[]>({
    queryKey: ["/api/executions"],
    refetchInterval: 2000,
  });

  const { data: screenshots } = useQuery<ScreenshotWithUrl[]>({
    queryKey: ["/api/screenshots"],
    refetchInterval: 3000,
  });

  const clearHistoryMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("DELETE", "/api/executions");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/executions"] });
      toast({ title: "History cleared successfully" });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to clear history",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const filteredExecutions = executions?.filter((e) =>
    statusFilter === "all" ? true : e.status === statusFilter
  );

  const toggleRow = (id: number) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedRows(newExpanded);
  };

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

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleString();
  };

  const formatDuration = (start: string, end: string | null) => {
    if (!end) return "In progress...";
    const startDate = new Date(start);
    const endDate = new Date(end);
    const diffMs = endDate.getTime() - startDate.getTime();
    const diffSec = Math.floor(diffMs / 1000);
    if (diffSec < 60) return `${diffSec}s`;
    const diffMin = Math.floor(diffSec / 60);
    const remainingSec = diffSec % 60;
    return `${diffMin}m ${remainingSec}s`;
  };

  const getExecutionScreenshots = (executionId: number) => {
    return screenshots?.filter((s) => s.executionId === executionId) ?? [];
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold" data-testid="text-history-title">
            Execution History
          </h1>
          <p className="text-sm text-muted-foreground">
            View past automation runs and their results
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[150px]" data-testid="select-status-filter">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="success">Success</SelectItem>
              <SelectItem value="failed">Failed</SelectItem>
              <SelectItem value="running">Running</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
            </SelectContent>
          </Select>
          <Button
            variant="outline"
            onClick={() => queryClient.invalidateQueries({ queryKey: ["/api/executions"] })}
            data-testid="button-refresh-history"
          >
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
          {executions && executions.length > 0 && (
            <Button
              variant="destructive"
              onClick={() => clearHistoryMutation.mutate()}
              disabled={clearHistoryMutation.isPending}
              data-testid="button-clear-history"
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Clear All
            </Button>
          )}
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          {!filteredExecutions || filteredExecutions.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <HistoryIcon className="h-12 w-12 text-muted-foreground/50" />
              <h3 className="mt-4 text-lg font-medium">No execution history</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                {statusFilter !== "all"
                  ? `No ${statusFilter} executions found`
                  : "Automation runs will appear here"}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
            <ScrollArea className="h-[600px]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12"></TableHead>
                    <TableHead>URL</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Started</TableHead>
                    <TableHead>Duration</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredExecutions.map((execution) => (
                    <Collapsible
                      key={execution.id}
                      open={expandedRows.has(execution.id)}
                      onOpenChange={() => toggleRow(execution.id)}
                      asChild
                    >
                      <>
                        <CollapsibleTrigger asChild>
                          <TableRow
                            className="cursor-pointer"
                            data-testid={`row-execution-${execution.id}`}
                          >
                            <TableCell>
                              <ChevronDown
                                className={`h-4 w-4 transition-transform ${
                                  expandedRows.has(execution.id) ? "rotate-180" : ""
                                }`}
                              />
                            </TableCell>
                            <TableCell>
                              <div className="min-w-0">
                                <p className="font-medium truncate">
                                  {execution.urlName}
                                </p>
                                <p className="text-xs text-muted-foreground font-mono truncate max-w-[200px]">
                                  {execution.urlAddress}
                                </p>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                {getStatusIcon(execution.status)}
                                {getStatusBadge(execution.status)}
                              </div>
                            </TableCell>
                            <TableCell className="text-sm">
                              {formatDate(execution.startedAt)}
                            </TableCell>
                            <TableCell className="text-sm text-muted-foreground">
                              {formatDuration(execution.startedAt, execution.completedAt)}
                            </TableCell>
                            <TableCell className="text-sm text-muted-foreground">
                              {execution.actionsCompleted}/{execution.totalActions}
                            </TableCell>
                          </TableRow>
                        </CollapsibleTrigger>
                        <CollapsibleContent asChild>
                          <TableRow className="bg-muted/30">
                            <TableCell colSpan={6} className="p-4">
                              <div className="space-y-4">
                                {execution.errorMessage && (
                                  <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                                    <p className="font-medium">Error:</p>
                                    <p className="font-mono text-xs mt-1">
                                      {execution.errorMessage}
                                    </p>
                                  </div>
                                )}

                                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                                  <div>
                                    <p className="text-xs text-muted-foreground">
                                      Started At
                                    </p>
                                    <p className="text-sm font-mono">
                                      {formatDate(execution.startedAt)}
                                    </p>
                                  </div>
                                  <div>
                                    <p className="text-xs text-muted-foreground">
                                      Completed At
                                    </p>
                                    <p className="text-sm font-mono">
                                      {execution.completedAt
                                        ? formatDate(execution.completedAt)
                                        : "-"}
                                    </p>
                                  </div>
                                  <div>
                                    <p className="text-xs text-muted-foreground">
                                      Recording ID
                                    </p>
                                    <p className="text-sm font-mono">
                                      {execution.recordingId ?? "N/A"}
                                    </p>
                                  </div>
                                  <div>
                                    <p className="text-xs text-muted-foreground">
                                      Execution ID
                                    </p>
                                    <p className="text-sm font-mono">{execution.id}</p>
                                  </div>
                                </div>

                                {getExecutionScreenshots(execution.id).length > 0 && (
                                  <div>
                                    <p className="text-xs text-muted-foreground mb-2">
                                      Screenshots
                                    </p>
                                    <div className="flex flex-wrap gap-2">
                                      {getExecutionScreenshots(execution.id).map((ss) => (
                                        <div
                                          key={ss.id}
                                          className="relative w-24 h-16 rounded-md overflow-hidden border border-border bg-muted"
                                        >
                                          <img
                                            src={`/api/screenshots/${ss.id}/image`}
                                            alt={ss.filename}
                                            className="w-full h-full object-cover"
                                          />
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        </CollapsibleContent>
                      </>
                    </Collapsible>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 grid-cols-2 sm:grid-cols-4">
            <div>
              <p className="text-sm text-muted-foreground">Total Executions</p>
              <p className="text-2xl font-bold" data-testid="text-total-executions">
                {executions?.length ?? 0}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Successful</p>
              <p className="text-2xl font-bold text-chart-2" data-testid="text-successful">
                {executions?.filter((e) => e.status === "success").length ?? 0}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Failed</p>
              <p className="text-2xl font-bold text-destructive" data-testid="text-failed">
                {executions?.filter((e) => e.status === "failed").length ?? 0}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Running</p>
              <p className="text-2xl font-bold text-chart-1" data-testid="text-running">
                {executions?.filter((e) => e.status === "running").length ?? 0}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
