'use client';

import { Toaster } from '@/components/ui/sonner';
import { Bot } from 'lucide-react';

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background p-4">
      <div className="flex items-center gap-3 mb-8">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-primary-foreground">
          <Bot className="h-6 w-6" />
        </div>
        <div>
          <h1 className="text-xl font-bold">AutoBrowser</h1>
          <p className="text-xs text-muted-foreground">Always-On Automation</p>
        </div>
      </div>
      {children}
      <Toaster />
    </div>
  );
}
