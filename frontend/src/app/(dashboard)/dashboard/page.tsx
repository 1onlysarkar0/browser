'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Link2, CheckCircle, AlertCircle, Clock, Activity } from 'lucide-react';
import { systemApi } from '@/lib/api';

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

  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const response = await systemApi.getStatus();
        setStatus(response.data);
      } catch (error) {
        console.error('Failed to fetch status:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchStatus();
    const interval = setInterval(fetchStatus, 10000);
    return () => clearInterval(interval);
  }, []);

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
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground">Overview of your browser automation system</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total URLs</CardTitle>
            <Link2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{status?.stats.totalUrls || 0}</div>
            <p className="text-xs text-muted-foreground">
              {status?.stats.activeUrls || 0} active
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Executions</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{status?.stats.totalExecutions || 0}</div>
            <p className="text-xs text-muted-foreground">All time</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Recent Errors</CardTitle>
            <AlertCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{status?.stats.recentErrors || 0}</div>
            <p className="text-xs text-muted-foreground">Last 24 hours</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Scheduler Status</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <Badge variant={status?.scheduler.isRunning ? 'default' : 'destructive'}>
              {status?.scheduler.isRunning ? 'Running' : 'Stopped'}
            </Badge>
            <p className="text-xs text-muted-foreground mt-1">
              {status?.scheduler.activeExecutions.length || 0} active jobs
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Quick Start</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
              <span className="text-sm font-medium">1</span>
            </div>
            <div>
              <p className="font-medium">Add a URL</p>
              <p className="text-sm text-muted-foreground">
                Go to URLs and add a new URL to automate
              </p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
              <span className="text-sm font-medium">2</span>
            </div>
            <div>
              <p className="font-medium">Configure interactions</p>
              <p className="text-sm text-muted-foreground">
                Set up clicks, scrolls, and form fills
              </p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
              <span className="text-sm font-medium">3</span>
            </div>
            <div>
              <p className="font-medium">Set a schedule</p>
              <p className="text-sm text-muted-foreground">
                Configure when and how often to run
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
