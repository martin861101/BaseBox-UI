import { createFileRoute, Outlet, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { Loader2, Command as CommandIcon } from "lucide-react";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { useAuth } from "@/lib/auth-context";
import { CommandPalette } from "@/components/command-palette";
import { Button } from "@/components/ui/button";
import { useIsMobile } from "@/hooks/use-mobile";

export const Route = createFileRoute("/_authenticated")({
  component: AuthenticatedLayout,
});

function AuthenticatedLayout() {
  const { isAuthenticated, loading } = useAuth();
  const nav = useNavigate();
  const isMobile = useIsMobile();

  useEffect(() => {
    if (!loading && !isAuthenticated) nav({ to: "/login" });
    
    // Auto-pull AI settings from cloud if this is a fresh browser session
    if (!loading && isAuthenticated && !localStorage.getItem("homelab.ai.agents")) {
      import("@/lib/agent-client").then(({ api }) => {
        api.getAISettings().then(remote => {
          if (remote && Object.keys(remote).length > 0) {
            if (remote.configs) localStorage.setItem("homelab.ai.providers", JSON.stringify(remote.configs));
            if (remote.settings) localStorage.setItem("homelab.ai.modelSettings", JSON.stringify(remote.settings));
            if (remote.tools) localStorage.setItem("homelab.ai.tools", JSON.stringify(remote.tools));
            if (remote.skills) localStorage.setItem("homelab.ai.skills", JSON.stringify(remote.skills));
            if (remote.memory) localStorage.setItem("homelab.ai.memory", JSON.stringify(remote.memory));
            if (remote.embedding) localStorage.setItem("homelab.ai.embedding", JSON.stringify(remote.embedding));
            if (remote.agents) localStorage.setItem("homelab.ai.agents", JSON.stringify(remote.agents));
            if (remote.tavily) localStorage.setItem("homelab.tavily.key", remote.tavily);
          }
        }).catch(err => console.warn("Auto-sync failed:", err));
      });
    }
  }, [isAuthenticated, loading, nav]);

  if (loading || !isAuthenticated) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <SidebarProvider defaultOpen={!isMobile}>
      <div className="flex min-h-screen w-full">
        <AppSidebar />
        <div className="flex flex-1 flex-col">
          <header className="sticky top-0 z-10 flex h-14 items-center gap-2 border-b px-4 shadow-sm bg-[var(--sidebar-primary)] text-white">
            <SidebarTrigger className="text-white hover:bg-white/10" />
            <div className="ml-auto flex items-center gap-2">
              <Button
                variant="secondary"
                size="sm"
                className="hidden h-8 gap-2 px-2 text-xs sm:flex bg-background text-foreground hover:bg-muted"
                onClick={() => window.dispatchEvent(new KeyboardEvent("keydown", { key: "k", metaKey: true }))}
              >
                <CommandIcon className="h-3 w-3" />
                Search
                <kbd className="rounded bg-muted px-1.5 font-mono text-[10px]">⌘K</kbd>
              </Button>
            </div>
          </header>
          <main className="flex-1 overflow-auto">
            <Outlet />
          </main>
        </div>
      </div>
      <CommandPalette />
    </SidebarProvider>
  );
}
