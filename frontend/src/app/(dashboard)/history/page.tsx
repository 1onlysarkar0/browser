'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { 
  Search, 
  History, 
  CheckCircle2, 
  XCircle, 
  Clock,
  ChevronRight,
  ChevronDown,
  Filter,
  Globe,
  Camera,
  Zap,
  RefreshCw,
  ExternalLink,
  Navigation,
  Database,
  Eye,
  FileText
} from 'lucide-react';
import { systemApi, urlApi } from '@/lib/api';
import { formatDistanceToNow, format } from 'date-fns';

interface ExecutionLog {
  id: string;
  status: string;
  errorMessage?: string;
  duration: number;
  actionsCompleted: number;
  screenshotsTaken: number;
  pagesVisited: number;
  dataScraped: number;
  changesDetected: number;
  startedAt: string;
  completedAt?: string;
  url: {
    id: string;
    label: string;
    url: string;
  };
}

interface UrlGroup {
  urlId: string;
  urlLabel: string;
  urlAddress: string;
  logs: ExecutionLog[];
  totalSuccess: number;
  totalError: number;
  lastRun?: string;
}

export default function HistoryPage() {
  const [logs, setLogs] = useState<ExecutionLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'success' | 'error'>('all');
  const [expandedUrls, setExpandedUrls] = useState<Set<string>>(new Set());
  const [viewMode, setViewMode] = useState<'grouped' | 'flat'>('grouped');
  const [selectedLog, setSelectedLog] = useState<ExecutionLog | null>(null);

  useEffect(() => {
    fetchHistory();
  }, []);

  const fetchHistory = async () => {
    try {
      const response = await systemApi.getHistory(200, 0);
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

  const filteredLogs = logs.filter((log) => {
    const matchesSearch = log.url.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.url.url.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || log.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const groupedByUrl = filteredLogs.reduce<Record<string, UrlGroup>>((acc, log) => {
    const urlId = log.url.id;
    if (!acc[urlId]) {
      acc[urlId] = {
        urlId,
        urlLabel: log.url.label,
        urlAddress: log.url.url,
        logs: [],
        totalSuccess: 0,
        totalError: 0,
        lastRun: undefined
      };
    }
    acc[urlId].logs.push(log);
    if (log.status === 'success') acc[urlId].totalSuccess++;
    else acc[urlId].totalError++;
    if (!acc[urlId].lastRun || new Date(log.startedAt) > new Date(acc[urlId].lastRun!)) {
      acc[urlId].lastRun = log.startedAt;
    }
    return acc;
  }, {});

  const urlGroups = Object.values(groupedByUrl).sort((a, b) => 
    new Date(b.lastRun || 0).getTime() - new Date(a.lastRun || 0).getTime()
  );

  const toggleUrlExpansion = (urlId: string) => {
    const newExpanded = new Set(expandedUrls);
    if (newExpanded.has(urlId)) {
      newExpanded.delete(urlId);
    } else {
      newExpanded.add(urlId);
    }
    setExpandedUrls(newExpanded);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex flex-col items-center gap-3">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          <p className="text-sm text-muted-foreground">Loading history...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 md:space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Automation History</h1>
          <p className="text-sm md:text-base text-muted-foreground mt-1">
            View past automation executions ({total} total runs)
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchHistory} className="gap-2 w-full sm:w-auto">
          <RefreshCw className="h-4 w-4" />
          Refresh
        </Button>
      </div>

      <div className="grid gap-3 grid-cols-2 sm:grid-cols-4">
        <Card className="p-3">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <History className="h-4 w-4 text-primary" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Total Runs</p>
              <p className="text-lg font-bold">{total}</p>
            </div>
          </div>
        </Card>
        <Card className="p-3">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-green-500/10 flex items-center justify-center">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Successful</p>
              <p className="text-lg font-bold text-green-600">{logs.filter(l => l.status === 'success').length}</p>
            </div>
          </div>
        </Card>
        <Card className="p-3">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-red-500/10 flex items-center justify-center">
              <XCircle className="h-4 w-4 text-red-600" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Failed</p>
              <p className="text-lg font-bold text-red-600">{logs.filter(l => l.status === 'error').length}</p>
            </div>
          </div>
        </Card>
        <Card className="p-3">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-blue-500/10 flex items-center justify-center">
              <Globe className="h-4 w-4 text-blue-600" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">URLs</p>
              <p className="text-lg font-bold">{urlGroups.length}</p>
            </div>
          </div>
        </Card>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center flex-1">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search executions..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={statusFilter} onValueChange={(v: any) => setStatusFilter(v)}>
            <SelectTrigger className="w-full sm:w-[140px]">
              <SelectValue placeholder="Filter status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="success">Success</SelectItem>
              <SelectItem value="error">Error</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="hidden md:flex border rounded-lg p-1">
          <Button
            variant={viewMode === 'grouped' ? 'secondary' : 'ghost'}
            size="sm"
            className="h-8 px-3 text-xs"
            onClick={() => setViewMode('grouped')}
          >
            Grouped
          </Button>
          <Button
            variant={viewMode === 'flat' ? 'secondary' : 'ghost'}
            size="sm"
            className="h-8 px-3 text-xs"
            onClick={() => setViewMode('flat')}
          >
            Timeline
          </Button>
        </div>
      </div>

      {filteredLogs.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12 px-4 text-center">
            <div className="rounded-full bg-muted p-4 mb-4">
              <History className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold mb-2">
              {searchQuery || statusFilter !== 'all' ? 'No executions found' : 'No execution history yet'}
            </h3>
            <p className="text-muted-foreground mb-4 max-w-sm">
              {searchQuery || statusFilter !== 'all'
                ? 'Try adjusting your search or filter criteria'
                : 'Execution history will appear here after running automations'}
            </p>
          </CardContent>
        </Card>
      ) : viewMode === 'grouped' ? (
        <div className="space-y-3">
          {urlGroups.map((group) => (
            <Card key={group.urlId} className="overflow-hidden">
              <div 
                className="p-4 cursor-pointer hover:bg-accent/50 transition-colors"
                onClick={() => toggleUrlExpansion(group.urlId)}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                      <Globe className="h-5 w-5 text-primary" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-semibold truncate">{group.urlLabel}</p>
                        <Badge variant="outline" className="text-xs shrink-0">
                          {group.logs.length} runs
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground truncate">{group.urlAddress}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 shrink-0">
                    <div className="hidden sm:flex items-center gap-3">
                      <div className="flex items-center gap-1 text-sm">
                        <CheckCircle2 className="h-4 w-4 text-green-500" />
                        <span className="font-medium text-green-600">{group.totalSuccess}</span>
                      </div>
                      <div className="flex items-center gap-1 text-sm">
                        <XCircle className="h-4 w-4 text-red-500" />
                        <span className="font-medium text-red-600">{group.totalError}</span>
                      </div>
                    </div>
                    <div className="hidden md:block text-xs text-muted-foreground text-right">
                      {group.lastRun && formatDistanceToNow(new Date(group.lastRun), { addSuffix: true })}
                    </div>
                    {expandedUrls.has(group.urlId) ? (
                      <ChevronDown className="h-5 w-5 text-muted-foreground" />
                    ) : (
                      <ChevronRight className="h-5 w-5 text-muted-foreground" />
                    )}
                  </div>
                </div>
              </div>
              
              {expandedUrls.has(group.urlId) && (
                <div className="border-t bg-muted/30">
                  <div className="divide-y">
                    {group.logs.slice(0, 10).map((log) => (
                      <div 
                        key={log.id} 
                        className="p-3 sm:p-4 hover:bg-accent/30 cursor-pointer transition-colors"
                        onClick={() => setSelectedLog(log)}
                      >
                        <div className="flex items-center justify-between gap-3 mb-2">
                          <div className="flex items-center gap-3 min-w-0">
                            <Badge
                              variant={log.status === 'success' ? 'default' : 'destructive'}
                              className={`shrink-0 ${log.status === 'success' ? 'bg-green-500/10 text-green-600 border-green-200' : ''}`}
                            >
                              {log.status === 'success' ? (
                                <CheckCircle2 className="h-3 w-3 mr-1" />
                              ) : (
                                <XCircle className="h-3 w-3 mr-1" />
                              )}
                              {log.status}
                            </Badge>
                            <div className="text-xs text-muted-foreground">
                              {format(new Date(log.startedAt), 'MMM d, HH:mm:ss')}
                            </div>
                          </div>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground shrink-0">
                            <Clock className="h-3 w-3" />
                            <span className="font-mono">{formatDuration(log.duration)}</span>
                          </div>
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-xs">
                          <div className="flex items-center gap-1 text-muted-foreground">
                            <Zap className="h-3 w-3" />
                            <span>{log.actionsCompleted} actions</span>
                          </div>
                          <div className="flex items-center gap-1 text-muted-foreground">
                            <Camera className="h-3 w-3" />
                            <span>{log.screenshotsTaken} screenshots</span>
                          </div>
                          <div className="flex items-center gap-1 text-muted-foreground">
                            <Navigation className="h-3 w-3" />
                            <span>{log.pagesVisited || 0} pages</span>
                          </div>
                          <div className="flex items-center gap-1 text-muted-foreground">
                            <Database className="h-3 w-3" />
                            <span>{log.dataScraped || 0} scraped</span>
                          </div>
                          <div className="flex items-center gap-1 text-muted-foreground">
                            <Eye className="h-3 w-3" />
                            <span>{log.changesDetected || 0} changes</span>
                          </div>
                        </div>
                        {log.errorMessage && (
                          <div className="mt-2 text-xs text-red-500 truncate">
                            {log.errorMessage}
                          </div>
                        )}
                      </div>
                    ))}
                    {group.logs.length > 10 && (
                      <div className="p-3 text-center text-xs text-muted-foreground">
                        + {group.logs.length - 10} more executions
                      </div>
                    )}
                  </div>
                </div>
              )}
            </Card>
          ))}
        </div>
      ) : (
        <>
          <div className="hidden md:block">
            <Card>
              <ScrollArea className="w-full">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>URL</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Started</TableHead>
                      <TableHead>Duration</TableHead>
                      <TableHead>Actions</TableHead>
                      <TableHead>Screenshots</TableHead>
                      <TableHead>Pages</TableHead>
                      <TableHead>Scraped</TableHead>
                      <TableHead>Changes</TableHead>
                      <TableHead>Error</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredLogs.map((log) => (
                      <TableRow 
                        key={log.id} 
                        className="cursor-pointer hover:bg-accent/50"
                        onClick={() => setSelectedLog(log)}
                      >
                        <TableCell>
                          <div className="min-w-0">
                            <p className="font-medium truncate max-w-[200px]">{log.url.label}</p>
                            <p className="text-xs text-muted-foreground truncate max-w-[200px]">{log.url.url}</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={log.status === 'success' ? 'default' : 'destructive'}
                            className={log.status === 'success' ? 'bg-green-500/10 text-green-600 border-green-200' : ''}
                          >
                            {log.status === 'success' ? (
                              <CheckCircle2 className="h-3 w-3 mr-1" />
                            ) : (
                              <XCircle className="h-3 w-3 mr-1" />
                            )}
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
                        <TableCell className="font-mono text-sm">{formatDuration(log.duration)}</TableCell>
                        <TableCell>{log.actionsCompleted}</TableCell>
                        <TableCell>{log.screenshotsTaken}</TableCell>
                        <TableCell>{log.pagesVisited || 0}</TableCell>
                        <TableCell>{log.dataScraped || 0}</TableCell>
                        <TableCell>{log.changesDetected || 0}</TableCell>
                        <TableCell className="max-w-[200px]">
                          {log.errorMessage && (
                            <span className="text-destructive text-xs truncate block">{log.errorMessage}</span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </ScrollArea>
            </Card>
          </div>

          <div className="md:hidden space-y-3">
            {filteredLogs.map((log) => (
              <Card 
                key={log.id} 
                className="overflow-hidden cursor-pointer"
                onClick={() => setSelectedLog(log)}
              >
                <div className="p-4">
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-sm truncate">{log.url.label}</p>
                      <p className="text-xs text-muted-foreground truncate">{log.url.url}</p>
                    </div>
                    <Badge
                      variant={log.status === 'success' ? 'default' : 'destructive'}
                      className={`shrink-0 ${log.status === 'success' ? 'bg-green-500/10 text-green-600 border-green-200' : ''}`}
                    >
                      {log.status === 'success' ? (
                        <CheckCircle2 className="h-3 w-3 mr-1" />
                      ) : (
                        <XCircle className="h-3 w-3 mr-1" />
                      )}
                      {log.status}
                    </Badge>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-xs">
                    <div className="flex items-center gap-1 text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      <span>{formatDistanceToNow(new Date(log.startedAt), { addSuffix: true })}</span>
                    </div>
                    <div className="flex items-center gap-1 text-muted-foreground">
                      <Zap className="h-3 w-3" />
                      <span>{log.actionsCompleted} actions</span>
                    </div>
                    <div className="flex items-center gap-1 text-muted-foreground">
                      <Camera className="h-3 w-3" />
                      <span>{log.screenshotsTaken} shots</span>
                    </div>
                    <div className="flex items-center gap-1 text-muted-foreground">
                      <Navigation className="h-3 w-3" />
                      <span>{log.pagesVisited || 0} pages</span>
                    </div>
                    <div className="flex items-center gap-1 text-muted-foreground">
                      <Database className="h-3 w-3" />
                      <span>{log.dataScraped || 0} scraped</span>
                    </div>
                    <div className="flex items-center gap-1 text-muted-foreground font-mono">
                      {formatDuration(log.duration)}
                    </div>
                  </div>
                  {log.errorMessage && (
                    <div className="mt-3 pt-3 border-t">
                      <p className="text-xs text-destructive">{log.errorMessage}</p>
                    </div>
                  )}
                </div>
              </Card>
            ))}
          </div>
        </>
      )}

      <Dialog open={!!selectedLog} onOpenChange={() => setSelectedLog(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Execution Details
            </DialogTitle>
            <DialogDescription>
              {selectedLog?.url.label} - {selectedLog && format(new Date(selectedLog.startedAt), 'MMM d, yyyy HH:mm:ss')}
            </DialogDescription>
          </DialogHeader>
          {selectedLog && (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Badge
                  variant={selectedLog.status === 'success' ? 'default' : 'destructive'}
                  className={selectedLog.status === 'success' ? 'bg-green-500/10 text-green-600 border-green-200' : ''}
                >
                  {selectedLog.status === 'success' ? (
                    <CheckCircle2 className="h-3 w-3 mr-1" />
                  ) : (
                    <XCircle className="h-3 w-3 mr-1" />
                  )}
                  {selectedLog.status}
                </Badge>
                <span className="text-sm text-muted-foreground">
                  Duration: {formatDuration(selectedLog.duration)}
                </span>
              </div>

              <div className="space-y-2">
                <h4 className="text-sm font-medium">URL</h4>
                <div className="bg-muted rounded-lg p-3">
                  <p className="font-medium text-sm">{selectedLog.url.label}</p>
                  <p className="text-xs text-muted-foreground break-all">{selectedLog.url.url}</p>
                </div>
              </div>

              <div className="space-y-2">
                <h4 className="text-sm font-medium">Execution Statistics</h4>
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-muted rounded-lg p-3">
                    <div className="flex items-center gap-2 mb-1">
                      <Zap className="h-4 w-4 text-primary" />
                      <span className="text-xs text-muted-foreground">Actions</span>
                    </div>
                    <p className="text-lg font-bold">{selectedLog.actionsCompleted}</p>
                  </div>
                  <div className="bg-muted rounded-lg p-3">
                    <div className="flex items-center gap-2 mb-1">
                      <Camera className="h-4 w-4 text-primary" />
                      <span className="text-xs text-muted-foreground">Screenshots</span>
                    </div>
                    <p className="text-lg font-bold">{selectedLog.screenshotsTaken}</p>
                  </div>
                  <div className="bg-muted rounded-lg p-3">
                    <div className="flex items-center gap-2 mb-1">
                      <Navigation className="h-4 w-4 text-primary" />
                      <span className="text-xs text-muted-foreground">Pages Visited</span>
                    </div>
                    <p className="text-lg font-bold">{selectedLog.pagesVisited || 0}</p>
                  </div>
                  <div className="bg-muted rounded-lg p-3">
                    <div className="flex items-center gap-2 mb-1">
                      <Database className="h-4 w-4 text-primary" />
                      <span className="text-xs text-muted-foreground">Data Scraped</span>
                    </div>
                    <p className="text-lg font-bold">{selectedLog.dataScraped || 0}</p>
                  </div>
                  <div className="bg-muted rounded-lg p-3">
                    <div className="flex items-center gap-2 mb-1">
                      <Eye className="h-4 w-4 text-primary" />
                      <span className="text-xs text-muted-foreground">Changes Detected</span>
                    </div>
                    <p className="text-lg font-bold">{selectedLog.changesDetected || 0}</p>
                  </div>
                  <div className="bg-muted rounded-lg p-3">
                    <div className="flex items-center gap-2 mb-1">
                      <Clock className="h-4 w-4 text-primary" />
                      <span className="text-xs text-muted-foreground">Duration</span>
                    </div>
                    <p className="text-lg font-bold">{formatDuration(selectedLog.duration)}</p>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <h4 className="text-sm font-medium">Timing</h4>
                <div className="bg-muted rounded-lg p-3 space-y-1">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Started:</span>
                    <span>{format(new Date(selectedLog.startedAt), 'MMM d, yyyy HH:mm:ss')}</span>
                  </div>
                  {selectedLog.completedAt && (
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Completed:</span>
                      <span>{format(new Date(selectedLog.completedAt), 'MMM d, yyyy HH:mm:ss')}</span>
                    </div>
                  )}
                </div>
              </div>

              {selectedLog.errorMessage && (
                <div className="space-y-2">
                  <h4 className="text-sm font-medium text-destructive">Error</h4>
                  <div className="bg-destructive/10 rounded-lg p-3">
                    <p className="text-sm text-destructive">{selectedLog.errorMessage}</p>
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
