'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Activity, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  Zap,
  TrendingUp,
  Server,
  Wifi,
  RefreshCw
} from 'lucide-react';
import { systemApi } from '@/lib/api';
import { formatDistanceToNow } from 'date-fns';

interface Metrics {
  recentExecutions: any[];
  successRate: string;
  totalExecutions24h: number;
}

interface Status {
  scheduler: {
    isRunning: boolean;
    activeExecutions: string[];
  };
  stats: {
    totalUrls: number;
    activeUrls: number;
    totalExecutions: number;
    recentErrors: number;
  };
}

export default function MonitoringPage() {
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [status, setStatus] = useState<Status | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [metricsRes, statusRes] = await Promise.all([
          systemApi.getMetrics(),
          systemApi.getStatus(),
        ]);
        setMetrics(metricsRes.data);
        setStatus(statusRes.data);
        setLastUpdated(new Date());
      } catch (error) {
        console.error('Failed to fetch monitoring data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
    const interval = setInterval(fetchData, 10000);
    return () => clearInterval(interval);
  }, []);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex flex-col items-center gap-3">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          <p className="text-sm text-muted-foreground">Loading monitoring data...</p>
        </div>
      </div>
    );
  }

  const successRate = parseFloat(metrics?.successRate || '0');

  return (
    <div className="space-y-4 md:space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Monitoring</h1>
          <p className="text-sm md:text-base text-muted-foreground mt-1">
            Real-time system monitoring and metrics
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <RefreshCw className="h-3 w-3" />
          <span>Updated {formatDistanceToNow(lastUpdated, { addSuffix: true })}</span>
        </div>
      </div>

      <div className="grid gap-3 md:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="relative overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs md:text-sm font-medium">System Status</CardTitle>
            <div className={`h-8 w-8 rounded-lg flex items-center justify-center ${status?.scheduler.isRunning ? 'bg-green-500/10' : 'bg-red-500/10'}`}>
              <Server className={`h-4 w-4 ${status?.scheduler.isRunning ? 'text-green-600' : 'text-red-600'}`} />
            </div>
          </CardHeader>
          <CardContent>
            <Badge 
              variant={status?.scheduler.isRunning ? 'default' : 'destructive'}
              className={`text-sm ${status?.scheduler.isRunning ? 'bg-green-500/10 text-green-600 border-green-200' : ''}`}
            >
              <div className={`h-2 w-2 rounded-full mr-1.5 ${status?.scheduler.isRunning ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
              {status?.scheduler.isRunning ? 'Running' : 'Stopped'}
            </Badge>
            <p className="text-xs text-muted-foreground mt-2">
              {status?.scheduler.activeExecutions.length || 0} active executions
            </p>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs md:text-sm font-medium">Success Rate (24h)</CardTitle>
            <div className="h-8 w-8 rounded-lg bg-blue-500/10 flex items-center justify-center">
              <TrendingUp className="h-4 w-4 text-blue-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl md:text-3xl font-bold">{successRate.toFixed(1)}%</div>
            <Progress value={successRate} className="mt-2 h-1.5" />
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs md:text-sm font-medium">Executions (24h)</CardTitle>
            <div className="h-8 w-8 rounded-lg bg-purple-500/10 flex items-center justify-center">
              <Zap className="h-4 w-4 text-purple-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl md:text-3xl font-bold">{metrics?.totalExecutions24h || 0}</div>
            <p className="text-xs text-muted-foreground mt-1">Last 24 hours</p>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs md:text-sm font-medium">Recent Errors</CardTitle>
            <div className="h-8 w-8 rounded-lg bg-red-500/10 flex items-center justify-center">
              <XCircle className="h-4 w-4 text-red-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl md:text-3xl font-bold">{status?.stats.recentErrors || 0}</div>
            <p className="text-xs text-muted-foreground mt-1">Last 24 hours</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">URL Statistics</CardTitle>
            <CardDescription>Overview of your URL configurations</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Wifi className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium">Total URLs</p>
                    <p className="text-xs text-muted-foreground">Configured automations</p>
                  </div>
                </div>
                <span className="text-2xl font-bold">{status?.stats.totalUrls || 0}</span>
              </div>
              
              <div className="flex items-center justify-between p-3 rounded-lg bg-green-500/5 border border-green-200">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-green-500/10 flex items-center justify-center">
                    <CheckCircle2 className="h-5 w-5 text-green-600" />
                  </div>
                  <div>
                    <p className="font-medium">Active URLs</p>
                    <p className="text-xs text-muted-foreground">Currently running</p>
                  </div>
                </div>
                <span className="text-2xl font-bold text-green-600">{status?.stats.activeUrls || 0}</span>
              </div>
              
              <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Activity className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium">Total Executions</p>
                    <p className="text-xs text-muted-foreground">All time</p>
                  </div>
                </div>
                <span className="text-2xl font-bold">{status?.stats.totalExecutions || 0}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Recent Executions</CardTitle>
            <CardDescription>Latest automation runs</CardDescription>
          </CardHeader>
          <CardContent>
            {metrics?.recentExecutions?.length ? (
              <ScrollArea className="h-[280px] pr-4">
                <div className="space-y-2">
                  {metrics.recentExecutions.slice(0, 10).map((exec: any) => (
                    <div
                      key={exec.id}
                      className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <Badge 
                          variant={exec.status === 'success' ? 'default' : 'destructive'}
                          className={`shrink-0 ${exec.status === 'success' ? 'bg-green-500/10 text-green-600 border-green-200' : ''}`}
                        >
                          {exec.status === 'success' ? (
                            <CheckCircle2 className="h-3 w-3 mr-1" />
                          ) : (
                            <XCircle className="h-3 w-3 mr-1" />
                          )}
                          {exec.status}
                        </Badge>
                        <span className="text-sm truncate">URL #{exec.urlId.slice(0, 8)}...</span>
                      </div>
                      <div className="text-xs text-muted-foreground text-right shrink-0 ml-2">
                        <div className="font-mono">{exec.duration}ms</div>
                        <div>{exec.actionsCompleted} actions</div>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            ) : (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <div className="rounded-full bg-muted p-3 mb-3">
                  <Activity className="h-6 w-6 text-muted-foreground" />
                </div>
                <p className="text-sm text-muted-foreground">No recent executions</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {(status?.scheduler.activeExecutions.length ?? 0) > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Activity className="h-5 w-5 text-green-500 animate-pulse" />
              Currently Running
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {status?.scheduler.activeExecutions.map((execId) => (
                <Badge key={execId} variant="outline" className="gap-1.5 py-1.5 px-3">
                  <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                  <span className="font-mono text-xs">{execId.substring(0, 12)}...</span>
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
