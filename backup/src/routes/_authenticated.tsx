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
