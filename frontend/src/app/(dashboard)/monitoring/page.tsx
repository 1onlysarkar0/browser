'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { systemApi } from '@/lib/api';

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

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [metricsRes, statusRes] = await Promise.all([
          systemApi.getMetrics(),
          systemApi.getStatus(),
        ]);
        setMetrics(metricsRes.data);
        setStatus(statusRes.data);
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
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  const successRate = parseFloat(metrics?.successRate || '0');

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Monitoring</h1>
        <p className="text-muted-foreground">Real-time system monitoring and metrics</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Scheduler Status</CardTitle>
          </CardHeader>
          <CardContent>
            <Badge variant={status?.scheduler.isRunning ? 'default' : 'destructive'} className="text-lg">
              {status?.scheduler.isRunning ? 'Running' : 'Stopped'}
            </Badge>
            <p className="text-sm text-muted-foreground mt-2">
              {status?.scheduler.activeExecutions.length || 0} active executions
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Success Rate (24h)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{successRate.toFixed(1)}%</div>
            <Progress value={successRate} className="mt-2" />
            <p className="text-sm text-muted-foreground mt-2">
              {metrics?.totalExecutions24h || 0} executions in last 24 hours
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">URL Stats</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Total URLs</span>
                <span className="font-medium">{status?.stats.totalUrls || 0}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Active URLs</span>
                <span className="font-medium">{status?.stats.activeUrls || 0}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Recent Errors</span>
                <span className="font-medium text-destructive">{status?.stats.recentErrors || 0}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent Executions</CardTitle>
        </CardHeader>
        <CardContent>
          {metrics?.recentExecutions?.length ? (
            <div className="space-y-2">
              {metrics.recentExecutions.slice(0, 10).map((exec: any) => (
                <div
                  key={exec.id}
                  className="flex items-center justify-between p-2 rounded border"
                >
                  <div className="flex items-center gap-2">
                    <Badge variant={exec.status === 'success' ? 'default' : 'destructive'}>
                      {exec.status}
                    </Badge>
                    <span className="text-sm">URL #{exec.urlId.slice(0, 8)}</span>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {exec.duration}ms - {exec.actionsCompleted} actions
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground">No recent executions</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
