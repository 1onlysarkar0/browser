'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { 
  Link2, 
  CheckCircle, 
  AlertCircle, 
  Clock, 
  Activity,
  Play,
  ArrowRight,
  Zap,
  Globe,
  TrendingUp,
  Bot
} from 'lucide-react';
import { systemApi } from '@/lib/api';
import { useUrlStore } from '@/store/urls';
import { formatDistanceToNow } from 'date-fns';

interface SystemStatus {
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

export default function DashboardPage() {
  const [status, setStatus] = useState<SystemStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { urls, fetchUrls } = useUrlStore();

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [statusResponse] = await Promise.all([
          systemApi.getStatus(),
          fetchUrls()
        ]);
        setStatus(statusResponse.data);
      } catch (error) {
        console.error('Failed to fetch data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
    const interval = setInterval(async () => {
      try {
        const response = await systemApi.getStatus();
        setStatus(response.data);
      } catch (error) {
        console.error('Failed to refresh status:', error);
      }
    }, 10000);
    return () => clearInterval(interval);
  }, [fetchUrls]);

  const recentUrls = urls.slice(0, 5);
  const successRate = status?.stats.totalExecutions 
    ? Math.round(((status.stats.totalExecutions - status.stats.recentErrors) / status.stats.totalExecutions) * 100)
    : 100;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex flex-col items-center gap-3">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          <p className="text-sm text-muted-foreground">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 md:space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-sm md:text-base text-muted-foreground mt-1">
            Overview of your browser automation system
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge 
            variant={status?.scheduler.isRunning ? 'default' : 'destructive'}
            className={`gap-1.5 ${status?.scheduler.isRunning ? 'bg-green-500/10 text-green-600 border-green-200' : ''}`}
          >
            <div className={`h-2 w-2 rounded-full ${status?.scheduler.isRunning ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
            {status?.scheduler.isRunning ? 'System Active' : 'System Stopped'}
          </Badge>
        </div>
      </div>

      <div className="grid gap-3 md:gap-4 grid-cols-2 lg:grid-cols-4">
        <Card className="relative overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs md:text-sm font-medium">Total URLs</CardTitle>
            <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <Link2 className="h-4 w-4 text-primary" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl md:text-3xl font-bold">{status?.stats.totalUrls || 0}</div>
            <p className="text-xs text-muted-foreground mt-1">
              <span className="text-green-600 font-medium">{status?.stats.activeUrls || 0}</span> active
            </p>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs md:text-sm font-medium">Executions</CardTitle>
            <div className="h-8 w-8 rounded-lg bg-green-500/10 flex items-center justify-center">
              <CheckCircle className="h-4 w-4 text-green-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl md:text-3xl font-bold">{status?.stats.totalExecutions || 0}</div>
            <p className="text-xs text-muted-foreground mt-1">All time runs</p>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs md:text-sm font-medium">Success Rate</CardTitle>
            <div className="h-8 w-8 rounded-lg bg-blue-500/10 flex items-center justify-center">
              <TrendingUp className="h-4 w-4 text-blue-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl md:text-3xl font-bold">{successRate}%</div>
            <Progress value={successRate} className="mt-2 h-1.5" />
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs md:text-sm font-medium">Recent Errors</CardTitle>
            <div className="h-8 w-8 rounded-lg bg-red-500/10 flex items-center justify-center">
              <AlertCircle className="h-4 w-4 text-red-600" />
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
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg">Recent URLs</CardTitle>
                <CardDescription>Your latest automated URLs</CardDescription>
              </div>
              <Link href="/urls">
                <Button variant="ghost" size="sm" className="gap-1">
                  View all
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            {recentUrls.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <div className="rounded-full bg-muted p-3 mb-3">
                  <Globe className="h-6 w-6 text-muted-foreground" />
                </div>
                <p className="text-sm text-muted-foreground mb-3">No URLs configured yet</p>
                <Link href="/urls">
                  <Button size="sm" className="gap-1.5">
                    <Play className="h-4 w-4" />
                    Add your first URL
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                {recentUrls.map((url) => (
                  <Link key={url.id} href={`/urls/${url.id}`}>
                    <div className="flex items-center gap-3 p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors cursor-pointer">
                      <div className={`h-2 w-2 rounded-full shrink-0 ${url.enabled ? 'bg-green-500' : 'bg-muted-foreground'}`} />
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-sm truncate">{url.label}</p>
                        <p className="text-xs text-muted-foreground truncate">{url.url}</p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-xs text-muted-foreground">
                          {url.lastRunAt 
                            ? formatDistanceToNow(new Date(url.lastRunAt), { addSuffix: true })
                            : 'Never run'}
                        </p>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Quick Start Guide</CardTitle>
            <CardDescription>Get started with browser automation</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-start gap-4 p-3 rounded-lg bg-accent/30">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-medium">
                1
              </div>
              <div>
                <p className="font-medium text-sm">Add a URL</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Navigate to URLs and add a new URL to automate
                </p>
              </div>
            </div>
            <div className="flex items-start gap-4 p-3 rounded-lg bg-accent/30">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-medium">
                2
              </div>
              <div>
                <p className="font-medium text-sm">Configure interactions</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Set up clicks, scrolls, form fills, and navigation
                </p>
              </div>
            </div>
            <div className="flex items-start gap-4 p-3 rounded-lg bg-accent/30">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-medium">
                3
              </div>
              <div>
                <p className="font-medium text-sm">Set a schedule</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Configure when and how often to run automatically
                </p>
              </div>
            </div>
            <div className="flex items-start gap-4 p-3 rounded-lg border-2 border-dashed border-primary/20 bg-primary/5">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                <Zap className="h-4 w-4" />
              </div>
              <div>
                <p className="font-medium text-sm">Always-On System</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Once enabled, URLs run automatically even when browser is closed
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {(status?.scheduler.activeExecutions.length ?? 0) > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Activity className="h-5 w-5 text-green-500 animate-pulse" />
              Active Executions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {status?.scheduler.activeExecutions.map((execId) => (
                <Badge key={execId} variant="outline" className="gap-1.5">
                  <div className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse" />
                  {execId.substring(0, 8)}...
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
