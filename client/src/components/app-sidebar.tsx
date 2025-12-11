import { Link, useLocation } from "wouter";
import {
  LayoutDashboard,
  Link2,
  History,
  Settings,
  Image,
  Activity,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
} from "@/components/ui/sidebar";
import { Progress } from "@/components/ui/progress";
import { useQuery } from "@tanstack/react-query";
import type { SystemStatus } from "@shared/schema";

const navItems = [
  {
    title: "Dashboard",
    url: "/",
    icon: LayoutDashboard,
  },
  {
    title: "URLs",
    url: "/urls",
    icon: Link2,
  },
  {
    title: "History",
    url: "/history",
    icon: History,
  },
  {
    title: "Screenshots",
    url: "/screenshots",
    icon: Image,
  },
  {
    title: "Settings",
    url: "/settings",
    icon: Settings,
  },
];

export function AppSidebar() {
  const [location] = useLocation();

  const { data: status } = useQuery<SystemStatus>({
    queryKey: ["/api/status"],
    refetchInterval: 5000,
  });

  const memoryPercent = status
    ? Math.round((status.memoryUsageMB / status.memoryLimitMB) * 100)
    : 0;

  const getMemoryColor = (percent: number) => {
    if (percent < 60) return "bg-chart-2";
    if (percent < 80) return "bg-chart-4";
    return "bg-destructive";
  };

  return (
    <Sidebar>
      <SidebarHeader className="border-b border-sidebar-border px-4 py-4">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-md bg-primary">
            <Activity className="h-5 w-5 text-primary-foreground" />
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-semibold">AutoBrowser</span>
            <span className="text-xs text-muted-foreground">Automation System</span>
          </div>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    isActive={location === item.url}
                  >
                    <Link href={item.url} data-testid={`nav-${item.title.toLowerCase()}`}>
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="border-t border-sidebar-border px-4 py-4">
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">Memory</span>
            <span className="font-mono text-muted-foreground">
              {status ? `${status.memoryUsageMB}/${status.memoryLimitMB}MB` : "---"}
            </span>
          </div>
          <Progress
            value={memoryPercent}
            className="h-2"
            indicatorClassName={getMemoryColor(memoryPercent)}
          />
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Browsers: {status?.activeBrowsers ?? 0}</span>
            <span>Tasks: {status?.scheduledTasks ?? 0}</span>
          </div>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
