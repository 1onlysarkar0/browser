'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useAuthStore } from '@/store/auth';
import { authApi } from '@/lib/api';
import { toast } from 'sonner';
import { Shield, Key, Copy, User, Mail, CheckCircle2, AlertCircle } from 'lucide-react';

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
    <div className="space-y-4 md:space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Settings</h1>
        <p className="text-sm md:text-base text-muted-foreground mt-1">
          Manage your account and security settings
        </p>
      </div>

      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <User className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-lg">Account Information</CardTitle>
              <CardDescription>Your account details</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 p-3 rounded-lg bg-muted/50">
              <div className="flex items-center gap-3">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Email</span>
              </div>
              <span className="font-medium text-sm sm:text-base">{user?.email}</span>
            </div>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 p-3 rounded-lg bg-muted/50">
              <div className="flex items-center gap-3">
                <Key className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Account ID</span>
              </div>
              <span className="font-mono text-xs sm:text-sm truncate max-w-[200px]">{user?.id}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-start gap-3">
            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
              <Shield className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <div>
                  <CardTitle className="text-lg">Two-Factor Authentication</CardTitle>
                  <CardDescription>Add an extra layer of security</CardDescription>
                </div>
                <Badge 
                  variant={is2FAEnabled ? 'default' : 'secondary'}
                  className={is2FAEnabled ? 'bg-green-500/10 text-green-600 border-green-200' : ''}
                >
                  {is2FAEnabled ? (
                    <><CheckCircle2 className="h-3 w-3 mr-1" /> Enabled</>
                  ) : (
                    <><AlertCircle className="h-3 w-3 mr-1" /> Disabled</>
                  )}
                </Badge>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {is2FAEnabled ? (
            <div className="space-y-4">
              <div className="p-4 rounded-lg bg-green-500/5 border border-green-200">
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="h-5 w-5 text-green-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium text-green-800">2FA is enabled</p>
                    <p className="text-sm text-green-700 mt-1">
                      Your account has an extra layer of protection
                    </p>
                  </div>
                </div>
              </div>
              
              <Separator />
              
              <div className="space-y-3">
                <Label className="text-sm">Disable Two-Factor Authentication</Label>
                <p className="text-xs text-muted-foreground">
                  Enter your verification code to disable 2FA
                </p>
                <div className="flex flex-col sm:flex-row gap-2">
                  <Input
                    value={disableCode}
                    onChange={(e) => setDisableCode(e.target.value)}
                    placeholder="000000"
                    maxLength={6}
                    className="flex-1"
                  />
                  <Button onClick={handleDisable2FA} variant="destructive" disabled={isLoading} className="sm:w-auto">
                    Disable 2FA
                  </Button>
                </div>
              </div>

              <Separator />

              <div>
                <Button variant="outline" onClick={handleGetBackupCodes} className="w-full sm:w-auto">
                  <Key className="h-4 w-4 mr-2" />
                  View Backup Codes
                </Button>
                {backupCodes.length > 0 && (
                  <div className="mt-4 p-4 bg-muted rounded-lg">
                    <p className="text-sm font-medium mb-3">Backup Codes (save these securely)</p>
                    <div className="grid grid-cols-2 gap-2">
                      {backupCodes.map((code, i) => (
                        <div key={i} className="flex items-center justify-between p-2 bg-background rounded border">
                          <code className="text-xs sm:text-sm">{code}</code>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
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
              <div className="flex justify-center p-4 bg-white rounded-lg">
                <img src={setupData.qrCode} alt="QR Code" className="w-40 h-40 sm:w-48 sm:h-48" />
              </div>
              <div className="text-center">
                <p className="text-sm text-muted-foreground mb-2">Or enter this code manually:</p>
                <code className="bg-muted px-3 py-2 rounded text-xs sm:text-sm break-all">{setupData.secret}</code>
              </div>
              <Separator />
              <div className="space-y-3">
                <Label>Enter verification code from your authenticator app</Label>
                <div className="flex flex-col sm:flex-row gap-2">
                  <Input
                    value={verificationCode}
                    onChange={(e) => setVerificationCode(e.target.value)}
                    placeholder="000000"
                    maxLength={6}
                    className="flex-1"
                  />
                  <Button onClick={handleEnable2FA} disabled={isLoading} className="sm:w-auto">
                    Verify & Enable
                  </Button>
                </div>
              </div>
              <div className="p-4 bg-muted rounded-lg">
                <p className="text-sm font-medium mb-3">Save these backup codes:</p>
                <div className="grid grid-cols-2 gap-2">
                  {setupData.backupCodes.map((code, i) => (
                    <code key={i} className="bg-background p-2 rounded text-center text-xs sm:text-sm border">{code}</code>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Two-factor authentication adds an extra layer of security to your account by requiring a verification code in addition to your password.
              </p>
              <Button onClick={handleSetup2FA} disabled={isLoading} className="w-full sm:w-auto">
                <Shield className="h-4 w-4 mr-2" />
                Setup 2FA
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
