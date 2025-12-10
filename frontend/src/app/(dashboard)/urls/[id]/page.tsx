'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useUrlStore } from '@/store/urls';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  ArrowLeft, 
  Save, 
  Play, 
  Camera, 
  Settings2, 
  Clock, 
  MousePointer, 
  Code2,
  Globe,
  Zap,
  RefreshCw,
  ArrowLeftRight,
  Type,
  Move,
  Keyboard,
  Timer,
  Bot,
  Scan,
  Navigation,
  Eye
} from 'lucide-react';
import { toast } from 'sonner';
import Link from 'next/link';

const interactionTypes = [
  { type: 'click', icon: MousePointer, label: 'Click Element' },
  { type: 'doubleClick', icon: MousePointer, label: 'Double Click' },
  { type: 'fill', icon: Type, label: 'Fill Input' },
  { type: 'type', icon: Keyboard, label: 'Type Text' },
  { type: 'scroll', icon: Move, label: 'Scroll Page' },
  { type: 'scrollToElement', icon: Move, label: 'Scroll to Element' },
  { type: 'navigate', icon: Globe, label: 'Navigate to URL' },
  { type: 'goBack', icon: ArrowLeft, label: 'Go Back' },
  { type: 'goForward', icon: ArrowLeftRight, label: 'Go Forward' },
  { type: 'reload', icon: RefreshCw, label: 'Reload Page' },
  { type: 'waitForTime', icon: Timer, label: 'Wait (ms)' },
  { type: 'waitForSelector', icon: Timer, label: 'Wait for Element' },
  { type: 'screenshot', icon: Camera, label: 'Take Screenshot' },
  { type: 'evaluateJs', icon: Code2, label: 'Execute JavaScript' },
];

export default function UrlDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { currentUrl, fetchUrl, updateUrl, runUrl, captureScreenshot, isLoading } = useUrlStore();
  const [formData, setFormData] = useState<any>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('basic');

  useEffect(() => {
    if (params.id) {
      fetchUrl(params.id as string);
    }
  }, [params.id, fetchUrl]);

  useEffect(() => {
    if (currentUrl) {
      setFormData({
        url: currentUrl.url,
        label: currentUrl.label,
        description: currentUrl.description || '',
        enabled: currentUrl.enabled,
        runIntervalSeconds: currentUrl.runIntervalSeconds,
        scheduleStartTime: currentUrl.scheduleStartTime || '',
        scheduleEndTime: currentUrl.scheduleEndTime || '',
        timezone: currentUrl.timezone || 'UTC',
        delayBetweenActions: currentUrl.delayBetweenActions || 1000,
        randomBehaviorVariation: currentUrl.randomBehaviorVariation || 10,
        customUserAgent: currentUrl.customUserAgent || '',
        javascriptCode: currentUrl.javascriptCode || '',
        screenshotInterval: currentUrl.screenshotInterval || '',
        interactions: JSON.stringify(currentUrl.interactions || [], null, 2),
        autoNavigate: currentUrl.autoNavigate !== false,
        autoCrawlDepth: currentUrl.autoCrawlDepth || 3,
        autoScreenshot: currentUrl.autoScreenshot !== false,
        screenshotPages: currentUrl.screenshotPages || 10,
        autoScrape: currentUrl.autoScrape || false,
        maxPagesToVisit: currentUrl.maxPagesToVisit || 50,
        changeDetection: currentUrl.changeDetection !== false,
        changeThreshold: currentUrl.changeThreshold || 10,
        paginationSelector: currentUrl.paginationSelector || '',
      });
    }
  }, [currentUrl]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const dataToSave = {
        ...formData,
        interactions: JSON.parse(formData.interactions || '[]'),
        screenshotInterval: formData.screenshotInterval ? parseInt(formData.screenshotInterval) : null,
      };
      await updateUrl(params.id as string, dataToSave);
      toast.success('Configuration saved successfully');
    } catch (error: any) {
      toast.error(error.message || 'Failed to save configuration');
    } finally {
      setIsSaving(false);
    }
  };

  const handleRun = async () => {
    try {
      await runUrl(params.id as string);
      toast.success('Execution started');
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to start execution');
    }
  };

  const handleCaptureScreenshot = async () => {
    try {
      await captureScreenshot(params.id as string);
      toast.success('Screenshot captured');
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to capture screenshot');
    }
  };

  if (isLoading || !formData) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex flex-col items-center gap-3">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          <p className="text-sm text-muted-foreground">Loading configuration...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 md:space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3 sm:items-center">
          <Link href="/urls">
            <Button variant="ghost" size="icon" className="shrink-0 h-9 w-9">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl md:text-2xl font-bold truncate">{formData.label}</h1>
              <Badge variant={formData.enabled ? 'default' : 'secondary'} className="shrink-0">
                {formData.enabled ? 'Active' : 'Inactive'}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground truncate">{formData.url}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Button variant="outline" size="sm" onClick={handleCaptureScreenshot} className="gap-1.5">
            <Camera className="h-4 w-4" />
            <span className="hidden sm:inline">Screenshot</span>
          </Button>
          <Button variant="outline" size="sm" onClick={handleRun} className="gap-1.5">
            <Play className="h-4 w-4" />
            <span className="hidden sm:inline">Run Now</span>
          </Button>
          <Button size="sm" onClick={handleSave} disabled={isSaving} className="gap-1.5">
            <Save className="h-4 w-4" />
            {isSaving ? 'Saving...' : 'Save'}
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <ScrollArea className="w-full">
          <TabsList className="w-full justify-start h-auto p-1 flex-wrap">
            <TabsTrigger value="basic" className="gap-1.5 text-xs sm:text-sm">
              <Settings2 className="h-3.5 w-3.5" />
              <span>Basic</span>
            </TabsTrigger>
            <TabsTrigger value="schedule" className="gap-1.5 text-xs sm:text-sm">
              <Clock className="h-3.5 w-3.5" />
              <span>Schedule</span>
            </TabsTrigger>
            <TabsTrigger value="behavior" className="gap-1.5 text-xs sm:text-sm">
              <MousePointer className="h-3.5 w-3.5" />
              <span>Behavior</span>
            </TabsTrigger>
            <TabsTrigger value="automation" className="gap-1.5 text-xs sm:text-sm">
              <Bot className="h-3.5 w-3.5" />
              <span>Auto</span>
            </TabsTrigger>
            <TabsTrigger value="interactions" className="gap-1.5 text-xs sm:text-sm">
              <Zap className="h-3.5 w-3.5" />
              <span>Interactions</span>
            </TabsTrigger>
            <TabsTrigger value="advanced" className="gap-1.5 text-xs sm:text-sm">
              <Code2 className="h-3.5 w-3.5" />
              <span>Advanced</span>
            </TabsTrigger>
          </TabsList>
        </ScrollArea>

        <TabsContent value="basic" className="space-y-4 mt-4">
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="text-lg">Basic Settings</CardTitle>
              <CardDescription>Configure the basic properties of this automation</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="url">URL</Label>
                  <Input
                    id="url"
                    value={formData.url}
                    onChange={(e) => setFormData({ ...formData, url: e.target.value })}
                    placeholder="https://example.com"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="label">Label</Label>
                  <Input
                    id="label"
                    value={formData.label}
                    onChange={(e) => setFormData({ ...formData, label: e.target.value })}
                    placeholder="My Website"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Describe what this automation does..."
                  rows={3}
                />
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="enabled" className="font-medium">Enable Automation</Label>
                  <p className="text-sm text-muted-foreground">
                    When enabled, this URL will be processed on schedule
                  </p>
                </div>
                <input
                  type="checkbox"
                  id="enabled"
                  checked={formData.enabled}
                  onChange={(e) => setFormData({ ...formData, enabled: e.target.checked })}
                  className="h-5 w-5 rounded border-input"
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="schedule" className="space-y-4 mt-4">
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="text-lg">Schedule Settings</CardTitle>
              <CardDescription>Configure when and how often the automation runs</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="interval">Run Interval</Label>
                <Select
                  value={String(formData.runIntervalSeconds)}
                  onValueChange={(value) => setFormData({ ...formData, runIntervalSeconds: parseInt(value) })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select interval" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="30">Every 30 seconds</SelectItem>
                    <SelectItem value="60">Every 1 minute</SelectItem>
                    <SelectItem value="90">Every 90 seconds</SelectItem>
                    <SelectItem value="120">Every 2 minutes</SelectItem>
                    <SelectItem value="180">Every 3 minutes</SelectItem>
                    <SelectItem value="300">Every 5 minutes</SelectItem>
                    <SelectItem value="600">Every 10 minutes</SelectItem>
                    <SelectItem value="900">Every 15 minutes</SelectItem>
                    <SelectItem value="1200">Every 20 minutes</SelectItem>
                    <SelectItem value="1800">Every 30 minutes</SelectItem>
                    <SelectItem value="2700">Every 45 minutes</SelectItem>
                    <SelectItem value="3600">Every hour</SelectItem>
                    <SelectItem value="5400">Every 90 minutes</SelectItem>
                    <SelectItem value="7200">Every 2 hours</SelectItem>
                    <SelectItem value="10800">Every 3 hours</SelectItem>
                    <SelectItem value="14400">Every 4 hours</SelectItem>
                    <SelectItem value="21600">Every 6 hours</SelectItem>
                    <SelectItem value="28800">Every 8 hours</SelectItem>
                    <SelectItem value="43200">Every 12 hours</SelectItem>
                    <SelectItem value="86400">Every 24 hours</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <Separator />
              
              <div className="space-y-2">
                <Label className="text-sm font-medium">Active Hours (Optional)</Label>
                <p className="text-xs text-muted-foreground mb-3">
                  Only run automations during these hours
                </p>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="startTime" className="text-xs">Start Time</Label>
                    <Input
                      id="startTime"
                      type="time"
                      value={formData.scheduleStartTime}
                      onChange={(e) => setFormData({ ...formData, scheduleStartTime: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="endTime" className="text-xs">End Time</Label>
                    <Input
                      id="endTime"
                      type="time"
                      value={formData.scheduleEndTime}
                      onChange={(e) => setFormData({ ...formData, scheduleEndTime: e.target.value })}
                    />
                  </div>
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="timezone">Timezone</Label>
                <Select
                  value={formData.timezone}
                  onValueChange={(value) => setFormData({ ...formData, timezone: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="UTC">UTC</SelectItem>
                    <SelectItem value="America/New_York">Eastern Time (US)</SelectItem>
                    <SelectItem value="America/Chicago">Central Time (US)</SelectItem>
                    <SelectItem value="America/Denver">Mountain Time (US)</SelectItem>
                    <SelectItem value="America/Los_Angeles">Pacific Time (US)</SelectItem>
                    <SelectItem value="Europe/London">London (GMT)</SelectItem>
                    <SelectItem value="Europe/Paris">Paris (CET)</SelectItem>
                    <SelectItem value="Asia/Tokyo">Tokyo (JST)</SelectItem>
                    <SelectItem value="Asia/Shanghai">Shanghai (CST)</SelectItem>
                    <SelectItem value="Asia/Kolkata">India (IST)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="behavior" className="space-y-4 mt-4">
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="text-lg">Human-Like Behavior</CardTitle>
              <CardDescription>Configure delays and randomization for realistic automation</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="delay">Delay Between Actions</Label>
                    <span className="text-sm text-muted-foreground">{formData.delayBetweenActions}ms</span>
                  </div>
                  <Input
                    id="delay"
                    type="range"
                    min="100"
                    max="5000"
                    step="100"
                    value={formData.delayBetweenActions}
                    onChange={(e) => setFormData({ ...formData, delayBetweenActions: parseInt(e.target.value) })}
                    className="cursor-pointer"
                  />
                  <p className="text-xs text-muted-foreground">
                    Time to wait between each action (click, scroll, type)
                  </p>
                </div>
                
                <Separator />
                
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="variation">Random Variation</Label>
                    <span className="text-sm text-muted-foreground">{formData.randomBehaviorVariation}%</span>
                  </div>
                  <Input
                    id="variation"
                    type="range"
                    min="0"
                    max="50"
                    step="5"
                    value={formData.randomBehaviorVariation}
                    onChange={(e) => setFormData({ ...formData, randomBehaviorVariation: parseInt(e.target.value) })}
                    className="cursor-pointer"
                  />
                  <p className="text-xs text-muted-foreground">
                    Adds random variation to timing for more human-like behavior
                  </p>
                </div>
              </div>
              
              <Separator />
              
              <div className="rounded-lg bg-muted/50 p-4">
                <h4 className="text-sm font-medium mb-2">Preview</h4>
                <p className="text-xs text-muted-foreground">
                  With current settings, actions will have a delay of {formData.delayBetweenActions}ms 
                  ± {Math.round(formData.delayBetweenActions * formData.randomBehaviorVariation / 100)}ms
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="automation" className="space-y-4 mt-4">
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="text-lg flex items-center gap-2">
                <Bot className="h-5 w-5" />
                Automatic Features
              </CardTitle>
              <CardDescription>
                Enable automatic page navigation, screenshots, and data scraping
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between p-4 rounded-lg border bg-muted/30">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <Navigation className="h-4 w-4 text-primary" />
                    <Label className="font-medium">Auto Page Navigation</Label>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Automatically discover and visit pages linked from the main URL
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={formData.autoNavigate}
                  onChange={(e) => setFormData({ ...formData, autoNavigate: e.target.checked })}
                  className="h-5 w-5 rounded border-input"
                />
              </div>

              {formData.autoNavigate && (
                <div className="pl-4 border-l-2 border-primary/20 space-y-4">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label>Crawl Depth</Label>
                      <Select
                        value={String(formData.autoCrawlDepth)}
                        onValueChange={(value) => setFormData({ ...formData, autoCrawlDepth: parseInt(value) })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="1">1 level deep</SelectItem>
                          <SelectItem value="2">2 levels deep</SelectItem>
                          <SelectItem value="3">3 levels deep</SelectItem>
                          <SelectItem value="5">5 levels deep</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Max Pages to Visit</Label>
                      <Select
                        value={String(formData.maxPagesToVisit)}
                        onValueChange={(value) => setFormData({ ...formData, maxPagesToVisit: parseInt(value) })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="10">10 pages</SelectItem>
                          <SelectItem value="25">25 pages</SelectItem>
                          <SelectItem value="50">50 pages</SelectItem>
                          <SelectItem value="100">100 pages</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Pagination Selector (Optional)</Label>
                    <Input
                      value={formData.paginationSelector}
                      onChange={(e) => setFormData({ ...formData, paginationSelector: e.target.value })}
                      placeholder=".next-page, [aria-label='Next']"
                    />
                    <p className="text-xs text-muted-foreground">
                      CSS selector for next page button (for paginated content)
                    </p>
                  </div>
                </div>
              )}

              <Separator />

              <div className="flex items-center justify-between p-4 rounded-lg border bg-muted/30">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <Camera className="h-4 w-4 text-primary" />
                    <Label className="font-medium">Auto Screenshots</Label>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Automatically capture screenshots of visited pages
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={formData.autoScreenshot}
                  onChange={(e) => setFormData({ ...formData, autoScreenshot: e.target.checked })}
                  className="h-5 w-5 rounded border-input"
                />
              </div>

              {formData.autoScreenshot && (
                <div className="pl-4 border-l-2 border-primary/20 space-y-2">
                  <Label>Max Screenshots per Run</Label>
                  <Select
                    value={String(formData.screenshotPages)}
                    onValueChange={(value) => setFormData({ ...formData, screenshotPages: parseInt(value) })}
                  >
                    <SelectTrigger className="w-full sm:w-48">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="5">5 screenshots</SelectItem>
                      <SelectItem value="10">10 screenshots</SelectItem>
                      <SelectItem value="20">20 screenshots</SelectItem>
                      <SelectItem value="50">50 screenshots</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}

              <Separator />

              <div className="flex items-center justify-between p-4 rounded-lg border bg-muted/30">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <Scan className="h-4 w-4 text-primary" />
                    <Label className="font-medium">Auto Data Scraping</Label>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Automatically extract text, links, images from pages
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={formData.autoScrape}
                  onChange={(e) => setFormData({ ...formData, autoScrape: e.target.checked })}
                  className="h-5 w-5 rounded border-input"
                />
              </div>

              <Separator />

              <div className="flex items-center justify-between p-4 rounded-lg border bg-muted/30">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <Eye className="h-4 w-4 text-primary" />
                    <Label className="font-medium">Change Detection</Label>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Detect when page content changes between runs
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={formData.changeDetection}
                  onChange={(e) => setFormData({ ...formData, changeDetection: e.target.checked })}
                  className="h-5 w-5 rounded border-input"
                />
              </div>

              {formData.changeDetection && (
                <div className="pl-4 border-l-2 border-primary/20 space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>Change Threshold</Label>
                    <span className="text-sm text-muted-foreground">{formData.changeThreshold}%</span>
                  </div>
                  <Input
                    type="range"
                    min="1"
                    max="50"
                    value={formData.changeThreshold}
                    onChange={(e) => setFormData({ ...formData, changeThreshold: parseInt(e.target.value) })}
                    className="cursor-pointer"
                  />
                  <p className="text-xs text-muted-foreground">
                    Minimum change percentage to trigger a detection alert
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="interactions" className="space-y-4 mt-4">
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="text-lg">Interaction Steps</CardTitle>
              <CardDescription>Define the sequence of actions to perform on the page</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-lg border bg-muted/30 p-4">
                <h4 className="text-sm font-medium mb-3">Available Interaction Types</h4>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                  {interactionTypes.map(({ type, icon: Icon, label }) => (
                    <div key={type} className="flex items-center gap-2 text-xs p-2 rounded bg-background border">
                      <Icon className="h-3.5 w-3.5 text-muted-foreground" />
                      <span className="truncate">{label}</span>
                    </div>
                  ))}
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="interactions">Interactions (JSON)</Label>
                <Textarea
                  id="interactions"
                  className="font-mono text-sm min-h-[300px]"
                  value={formData.interactions}
                  onChange={(e) => setFormData({ ...formData, interactions: e.target.value })}
                  placeholder={`[
  { "type": "waitForSelector", "selector": "#main-content", "timeout": 5000 },
  { "type": "scroll", "yOffset": 500, "delay": 500 },
  { "type": "click", "selector": "#submit-btn" },
  { "type": "fill", "selector": "#email", "value": "test@example.com" },
  { "type": "type", "selector": "#message", "value": "Hello world", "delay": 100 },
  { "type": "goBack" },
  { "type": "reload" },
  { "type": "screenshot" }
]`}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="advanced" className="space-y-4 mt-4">
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="text-lg">Advanced Settings</CardTitle>
              <CardDescription>Configure browser settings and custom scripts</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="userAgent">Custom User Agent</Label>
                <Input
                  id="userAgent"
                  value={formData.customUserAgent}
                  onChange={(e) => setFormData({ ...formData, customUserAgent: e.target.value })}
                  placeholder="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36..."
                />
                <p className="text-xs text-muted-foreground">
                  Leave empty to use default browser user agent
                </p>
              </div>
              
              <Separator />
              
              <div className="space-y-2">
                <Label htmlFor="screenshotInterval">Auto Screenshot Interval (seconds)</Label>
                <Input
                  id="screenshotInterval"
                  type="number"
                  value={formData.screenshotInterval}
                  onChange={(e) => setFormData({ ...formData, screenshotInterval: e.target.value })}
                  placeholder="Leave empty to disable"
                />
                <p className="text-xs text-muted-foreground">
                  Automatically take screenshots at this interval during execution
                </p>
              </div>
              
              <Separator />
              
              <div className="space-y-2">
                <Label htmlFor="javascript">Custom JavaScript</Label>
                <Textarea
                  id="javascript"
                  className="font-mono text-sm min-h-[150px]"
                  value={formData.javascriptCode}
                  onChange={(e) => setFormData({ ...formData, javascriptCode: e.target.value })}
                  placeholder={`// JavaScript to execute on page load
// Example: Dismiss cookie banners
document.querySelector('.cookie-banner')?.remove();

// Example: Scroll to bottom
window.scrollTo(0, document.body.scrollHeight);`}
                />
                <p className="text-xs text-muted-foreground">
                  JavaScript code executed after page load, before interactions
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
