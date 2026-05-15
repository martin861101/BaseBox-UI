import { Link, useRouterState } from "@tanstack/react-router";
import {
  Activity, Terminal, FolderOpen, Settings, Bot, LogOut, Server, LayoutDashboard, Command, Brain,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth-context";
import { useServers } from "@/components/server-picker";
import { useServerHealth } from "@/lib/use-server-health";
import { accents, useTheme } from "@/lib/theme";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

const items = [
  { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard },
  { title: "Monitoring", url: "/monitoring", icon: Activity },
  { title: "Actions", url: "/actions", icon: Terminal },
  { title: "Files", url: "/files", icon: FolderOpen },
  { title: "Assistant", url: "/assistant", icon: Bot },
  { title: "AI Settings", url: "/ai-settings", icon: Brain },
  { title: "Settings", url: "/settings", icon: Settings },
];

export function AppSidebar() {
  const { logout } = useAuth();
  const { accentId } = useTheme();
  const logo = accents.find((a) => a.id === accentId)?.logo || "/img/mad_logo_purple.png";
  const path = useRouterState({ select: (s) => s.location.pathname });
  const { data: servers = [] } = useServers();
  const { data: health = {} } = useServerHealth(servers.map((s) => s.id));

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="py-4">
        <div className="flex items-center gap-3 px-2">
          <div className="flex h-20 w-20 items-center justify-center shrink-0">
            <img src={logo} alt="Mad Scientist" className="h-20 w-20 object-contain" />
          </div>
          <div className="flex flex-col leading-tight group-data-[collapsible=icon]:hidden">
            <span className="text-base font-bold">BaseBox UI</span>
            <span className="text-xs text-muted-foreground font-medium">Home Base</span>
          </div>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Workspace</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((it) => {
                const active = path.startsWith(it.url);
                return (
                  <SidebarMenuItem key={it.url}>
                    <SidebarMenuButton asChild isActive={active}>
                      <Link to={it.url}>
                        <it.icon className="h-4 w-4" />
                        <span>{it.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {servers.length > 0 && (
          <SidebarGroup>
            <SidebarGroupLabel>Servers</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                <TooltipProvider delayDuration={300}>
                  {servers.map((s) => {
                    const h = health[s.id];
                    const ok = h?.ok;
                    const dot = h == null ? "bg-muted-foreground/40" : ok ? "bg-success" : "bg-destructive";
                    return (
                      <SidebarMenuItem key={s.id}>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <SidebarMenuButton asChild>
                              <Link to="/monitoring">
                                <span className={`h-2 w-2 shrink-0 rounded-full ${dot} ${ok ? "animate-pulse" : ""}`} />
                                <span className="truncate">{s.name}</span>
                                {h?.latencyMs != null && (
                                  <span className="ml-auto font-mono text-[10px] text-muted-foreground group-data-[collapsible=icon]:hidden">
                                    {h.latencyMs}ms
                                  </span>
                                )}
                              </Link>
                            </SidebarMenuButton>
                          </TooltipTrigger>
                          <TooltipContent side="right">
                            <div className="text-xs">
                              <div className="font-medium">{s.name}</div>
                              <div className="text-muted-foreground">{s.username}@{s.host}</div>
                              <div className="mt-1">
                                {ok ? <>Online · {h?.latencyMs}ms · CPU {h?.cpu?.toFixed(0) ?? "?"}%</> :
                                  <span className="text-destructive">{h?.error || "Unreachable"}</span>}
                              </div>
                            </div>
                          </TooltipContent>
                        </Tooltip>
                      </SidebarMenuItem>
                    );
                  })}
                </TooltipProvider>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>
      <SidebarFooter>
        <div className="flex items-center justify-between px-2 py-1 text-xs text-muted-foreground group-data-[collapsible=icon]:hidden">
          <span className="flex items-center gap-1">
            <Command className="h-3 w-3" />K to search
          </span>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-start gap-2"
          onClick={logout}
        >
          <LogOut className="h-4 w-4" />
          <span className="group-data-[collapsible=icon]:hidden">Sign out</span>
        </Button>
      </SidebarFooter>
    </Sidebar>
  );
}
