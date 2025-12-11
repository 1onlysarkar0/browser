import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/theme-provider";
import { ThemeToggle } from "@/components/theme-toggle";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { useWebSocket } from "@/hooks/use-websocket";
import NotFound from "@/pages/not-found";
import Dashboard from "@/pages/dashboard";
import UrlsPage from "@/pages/urls";
import RecorderPage from "@/pages/recorder";
import SettingsPage from "@/pages/settings";
import HistoryPage from "@/pages/history";
import ScreenshotsPage from "@/pages/screenshots";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Dashboard} />
      <Route path="/urls" component={UrlsPage} />
      <Route path="/recorder/:id" component={RecorderPage} />
      <Route path="/settings" component={SettingsPage} />
      <Route path="/history" component={HistoryPage} />
      <Route path="/screenshots" component={ScreenshotsPage} />
      <Route component={NotFound} />
    </Switch>
  );
}

function WebSocketProvider({ children }: { children: React.ReactNode }) {
  useWebSocket();
  return <>{children}</>;
}

function App() {
  const style = {
    "--sidebar-width": "16rem",
    "--sidebar-width-icon": "3rem",
  };

  return (
    <ThemeProvider defaultTheme="system" storageKey="autobrowser-theme">
      <QueryClientProvider client={queryClient}>
        <WebSocketProvider>
          <TooltipProvider>
            <SidebarProvider style={style as React.CSSProperties}>
              <div className="flex h-screen w-full">
                <AppSidebar />
                <div className="flex flex-col flex-1 min-w-0">
                  <header className="flex items-center justify-between gap-4 border-b border-border px-4 py-3 shrink-0">
                    <SidebarTrigger data-testid="button-sidebar-toggle" />
                    <ThemeToggle />
                  </header>
                  <main className="flex-1 overflow-auto p-4 md:p-6">
                    <Router />
                  </main>
                </div>
              </div>
            </SidebarProvider>
            <Toaster />
          </TooltipProvider>
        </WebSocketProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
}

export default App;
