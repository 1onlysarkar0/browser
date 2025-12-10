'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/checkbox';
import { useAuthStore } from '@/store/auth';
import { authApi } from '@/lib/api';
import { toast } from 'sonner';
import { Shield, Key, Copy } from 'lucide-react';

export default function SettingsPage() {
  const { user, checkAuth } = useAuthStore();
  const [is2FAEnabled, setIs2FAEnabled] = useState(false);
  const [setupData, setSetupData] = useState<{ qrCode: string; secret: string; backupCodes: string[] } | null>(null);
  const [verificationCode, setVerificationCode] = useState('');
  const [disableCode, setDisableCode] = useState('');
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (user) {
      setIs2FAEnabled(user.twoFactorEnabled || false);
    }
  }, [user]);

  const handleSetup2FA = async () => {
    setIsLoading(true);
    try {
      const response = await authApi.setup2FA();
      setSetupData(response.data);
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to setup 2FA');
    } finally {
      setIsLoading(false);
    }
  };

  const handleEnable2FA = async () => {
    setIsLoading(true);
    try {
      await authApi.enable2FA(verificationCode);
      toast.success('2FA enabled successfully');
      setIs2FAEnabled(true);
      setSetupData(null);
      setVerificationCode('');
      checkAuth();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to enable 2FA');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDisable2FA = async () => {
    setIsLoading(true);
    try {
      await authApi.disable2FA(disableCode);
      toast.success('2FA disabled successfully');
      setIs2FAEnabled(false);
      setDisableCode('');
      checkAuth();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to disable 2FA');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGetBackupCodes = async () => {
    try {
      const response = await authApi.getBackupCodes();
      setBackupCodes(response.data.backupCodes);
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to get backup codes');
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard');
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Settings</h1>
        <p className="text-muted-foreground">Manage your account and security settings</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Two-Factor Authentication
          </CardTitle>
          <CardDescription>
            Add an extra layer of security to your account
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {is2FAEnabled ? (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-green-500"></div>
                <span className="text-green-600 font-medium">2FA is enabled</span>
              </div>
              
              <div className="space-y-2">
                <Label>Enter verification code to disable 2FA</Label>
                <div className="flex gap-2">
                  <Input
                    value={disableCode}
                    onChange={(e) => setDisableCode(e.target.value)}
                    placeholder="000000"
                    maxLength={6}
                  />
                  <Button onClick={handleDisable2FA} variant="destructive" disabled={isLoading}>
                    Disable 2FA
                  </Button>
                </div>
              </div>

              <div className="pt-4 border-t">
                <Button variant="outline" onClick={handleGetBackupCodes}>
                  <Key className="h-4 w-4 mr-2" />
                  View Backup Codes
                </Button>
                {backupCodes.length > 0 && (
                  <div className="mt-4 p-4 bg-muted rounded-lg">
                    <p className="text-sm font-medium mb-2">Backup Codes (save these securely)</p>
                    <div className="grid grid-cols-2 gap-2">
                      {backupCodes.map((code, i) => (
                        <div key={i} className="flex items-center justify-between p-2 bg-background rounded">
                          <code>{code}</code>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => copyToClipboard(code)}
                          >
                            <Copy className="h-3 w-3" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : setupData ? (
            <div className="space-y-4">
              <div className="flex justify-center">
                <img src={setupData.qrCode} alt="QR Code" className="w-48 h-48" />
              </div>
              <div className="text-center">
                <p className="text-sm text-muted-foreground mb-2">Or enter this code manually:</p>
                <code className="bg-muted px-3 py-1 rounded">{setupData.secret}</code>
              </div>
              <div className="space-y-2">
                <Label>Enter verification code from your authenticator app</Label>
                <div className="flex gap-2">
                  <Input
                    value={verificationCode}
                    onChange={(e) => setVerificationCode(e.target.value)}
                    placeholder="000000"
                    maxLength={6}
                  />
                  <Button onClick={handleEnable2FA} disabled={isLoading}>
                    Verify & Enable
                  </Button>
                </div>
              </div>
              <div className="p-4 bg-muted rounded-lg">
                <p className="text-sm font-medium mb-2">Save these backup codes:</p>
                <div className="grid grid-cols-2 gap-2">
                  {setupData.backupCodes.map((code, i) => (
                    <code key={i} className="bg-background p-2 rounded text-center">{code}</code>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <Button onClick={handleSetup2FA} disabled={isLoading}>
              <Shield className="h-4 w-4 mr-2" />
              Setup 2FA
            </Button>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Account Information</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Email</span>
              <span className="font-medium">{user?.email}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Account ID</span>
              <span className="font-mono text-sm">{user?.id}</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
