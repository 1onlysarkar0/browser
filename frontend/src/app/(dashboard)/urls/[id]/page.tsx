'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useUrlStore } from '@/store/urls';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, Save, Play, Camera } from 'lucide-react';
import { toast } from 'sonner';
import Link from 'next/link';

export default function UrlDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { currentUrl, fetchUrl, updateUrl, runUrl, captureScreenshot, isLoading } = useUrlStore();
  const [formData, setFormData] = useState<any>(null);
  const [isSaving, setIsSaving] = useState(false);

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
        delayBetweenActions: currentUrl.delayBetweenActions,
        randomBehaviorVariation: currentUrl.randomBehaviorVariation,
        customUserAgent: currentUrl.customUserAgent || '',
        javascriptCode: currentUrl.javascriptCode || '',
        screenshotInterval: currentUrl.screenshotInterval || '',
        interactions: JSON.stringify(currentUrl.interactions || [], null, 2),
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
      toast.success('URL configuration saved');
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
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/urls">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold">{formData.label}</h1>
            <p className="text-muted-foreground">{formData.url}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={handleCaptureScreenshot}>
            <Camera className="h-4 w-4 mr-2" />
            Screenshot
          </Button>
          <Button variant="outline" onClick={handleRun}>
            <Play className="h-4 w-4 mr-2" />
            Run Now
          </Button>
          <Button onClick={handleSave} disabled={isSaving}>
            <Save className="h-4 w-4 mr-2" />
            {isSaving ? 'Saving...' : 'Save'}
          </Button>
        </div>
      </div>

      <Tabs defaultValue="basic">
        <TabsList>
          <TabsTrigger value="basic">Basic</TabsTrigger>
          <TabsTrigger value="schedule">Schedule</TabsTrigger>
          <TabsTrigger value="behavior">Behavior</TabsTrigger>
          <TabsTrigger value="advanced">Advanced</TabsTrigger>
        </TabsList>

        <TabsContent value="basic" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Basic Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="url">URL</Label>
                <Input
                  id="url"
                  value={formData.url}
                  onChange={(e) => setFormData({ ...formData, url: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="label">Label</Label>
                <Input
                  id="label"
                  value={formData.label}
                  onChange={(e) => setFormData({ ...formData, label: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                />
              </div>
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="enabled"
                  checked={formData.enabled}
                  onChange={(e) => setFormData({ ...formData, enabled: e.target.checked })}
                  className="h-4 w-4"
                />
                <Label htmlFor="enabled">Enabled</Label>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="schedule" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Schedule Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="interval">Run Interval (seconds)</Label>
                <Input
                  id="interval"
                  type="number"
                  value={formData.runIntervalSeconds}
                  onChange={(e) => setFormData({ ...formData, runIntervalSeconds: parseInt(e.target.value) })}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="startTime">Start Time (HH:mm)</Label>
                  <Input
                    id="startTime"
                    type="time"
                    value={formData.scheduleStartTime}
                    onChange={(e) => setFormData({ ...formData, scheduleStartTime: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="endTime">End Time (HH:mm)</Label>
                  <Input
                    id="endTime"
                    type="time"
                    value={formData.scheduleEndTime}
                    onChange={(e) => setFormData({ ...formData, scheduleEndTime: e.target.value })}
                  />
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
                    <SelectItem value="America/New_York">Eastern Time</SelectItem>
                    <SelectItem value="America/Los_Angeles">Pacific Time</SelectItem>
                    <SelectItem value="Europe/London">London</SelectItem>
                    <SelectItem value="Asia/Tokyo">Tokyo</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="behavior" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Interaction Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="delay">Delay Between Actions (ms)</Label>
                <Input
                  id="delay"
                  type="number"
                  value={formData.delayBetweenActions}
                  onChange={(e) => setFormData({ ...formData, delayBetweenActions: parseInt(e.target.value) })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="variation">Random Behavior Variation (%)</Label>
                <Input
                  id="variation"
                  type="number"
                  min="0"
                  max="100"
                  value={formData.randomBehaviorVariation}
                  onChange={(e) => setFormData({ ...formData, randomBehaviorVariation: parseInt(e.target.value) })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="interactions">Interactions (JSON)</Label>
                <Textarea
                  id="interactions"
                  className="font-mono h-64"
                  value={formData.interactions}
                  onChange={(e) => setFormData({ ...formData, interactions: e.target.value })}
                  placeholder={`[
  { "type": "click", "selector": "#button" },
  { "type": "scroll", "yOffset": 500 },
  { "type": "fill", "selector": "#input", "value": "text" }
]`}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="advanced" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Advanced Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="userAgent">Custom User Agent</Label>
                <Input
                  id="userAgent"
                  value={formData.customUserAgent}
                  onChange={(e) => setFormData({ ...formData, customUserAgent: e.target.value })}
                  placeholder="Mozilla/5.0 ..."
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="screenshotInterval">Screenshot Interval (seconds)</Label>
                <Input
                  id="screenshotInterval"
                  type="number"
                  value={formData.screenshotInterval}
                  onChange={(e) => setFormData({ ...formData, screenshotInterval: e.target.value })}
                  placeholder="Leave empty to disable"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="javascript">Custom JavaScript</Label>
                <Textarea
                  id="javascript"
                  className="font-mono h-32"
                  value={formData.javascriptCode}
                  onChange={(e) => setFormData({ ...formData, javascriptCode: e.target.value })}
                  placeholder="// JavaScript to execute on page load"
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
