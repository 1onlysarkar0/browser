'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { systemApi } from '@/lib/api';
import { formatDistanceToNow, format } from 'date-fns';

interface ExecutionLog {
  id: string;
  status: string;
  errorMessage?: string;
  duration: number;
  actionsCompleted: number;
  screenshotsTaken: number;
  startedAt: string;
  completedAt?: string;
  url: {
    label: string;
    url: string;
  };
}

export default function HistoryPage() {
  const [logs, setLogs] = useState<ExecutionLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    fetchHistory();
  }, []);

  const fetchHistory = async () => {
    try {
      const response = await systemApi.getHistory(100, 0);
      setLogs(response.data.logs);
      setTotal(response.data.total);
    } catch (error) {
      console.error('Failed to fetch history:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const formatDuration = (ms: number) => {
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
    return `${Math.floor(ms / 60000)}m ${Math.round((ms % 60000) / 1000)}s`;
  };

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
        <h1 className="text-3xl font-bold">Execution History</h1>
        <p className="text-muted-foreground">View past automation executions ({total} total)</p>
      </div>

      {logs.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <p className="text-muted-foreground">No execution history yet</p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>URL</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Started</TableHead>
                <TableHead>Duration</TableHead>
                <TableHead>Actions</TableHead>
                <TableHead>Screenshots</TableHead>
                <TableHead>Error</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {logs.map((log) => (
                <TableRow key={log.id}>
                  <TableCell className="font-medium">{log.url.label}</TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        log.status === 'success'
                          ? 'default'
                          : log.status === 'error'
                          ? 'destructive'
                          : 'secondary'
                      }
                    >
                      {log.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">
                      {format(new Date(log.startedAt), 'MMM d, HH:mm:ss')}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(log.startedAt), { addSuffix: true })}
                    </div>
                  </TableCell>
                  <TableCell>{formatDuration(log.duration)}</TableCell>
                  <TableCell>{log.actionsCompleted}</TableCell>
                  <TableCell>{log.screenshotsTaken}</TableCell>
                  <TableCell className="max-w-xs truncate">
                    {log.errorMessage && (
                      <span className="text-destructive text-sm">{log.errorMessage}</span>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}
    </div>
  );
}
