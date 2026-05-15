import { createFileRoute, Link } from "@tanstack/react-router";
import { useQueries } from "@tanstack/react-query";
import { Activity, Cpu, MemoryStick, HardDrive, Wifi, WifiOff, ArrowUpRight, Container as ContainerIcon } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useServers } from "@/components/server-picker";
import { api } from "@/lib/agent-client";
import { NoServersState } from "@/components/empty-state";

export const Route = createFileRoute("/_authenticated/dashboard")({
  component: DashboardPage,
});

function fmtBytes(n: number) {
  if (!n) return "0 B";
  const u = ["B", "KB", "MB", "GB", "TB"]; let i = 0;
  while (n >= 1024 && i < u.length - 1) { n /= 1024; i++; }
  return `${n.toFixed(1)} ${u[i]}`;
}

function DashboardPage() {
  const { data: servers = [], isLoading } = useServers();

  const results = useQueries({
    queries: servers.map((s) => ({
      queryKey: ["overview", s.id],
      queryFn: () => api.monitor(s.id),
      refetchInterval: 10_000,
    })),
  });

  const total = servers.length;
  const online = results.filter((r) => r.data?.ok).length;
  const containers = results.reduce((n, r) => n + (r.data?.containers?.length ?? 0), 0);
  const runningContainers = results.reduce(
    (n, r) => n + (r.data?.containers?.filter((c) => c.state === "running").length ?? 0), 0,
  );

  return (
    <div className="space-y-6 p-4 md:p-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
        <p className="text-sm text-muted-foreground">All servers at a glance — refreshes every 10s</p>
      </div>

      {!isLoading && servers.length === 0 && <NoServersState />}

      {servers.length > 0 && (
        <>
          <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
            <Stat label="Servers online" value={`${online} / ${total}`} icon={Wifi} />
            <Stat label="Containers" value={`${runningContainers} / ${containers}`} icon={ContainerIcon} />
            <Stat
              label="Avg CPU"
              value={
                online === 0 ? "—" :
                `${Math.round(results.reduce((s, r) => s + (r.data?.hardware?.cpuPct || 0), 0) / Math.max(online, 1))}%`
              }
              icon={Cpu}
            />
            <Stat
              label="Total memory used"
              value={fmtBytes(results.reduce((s, r) => s + (r.data?.hardware?.memUsed || 0), 0))}
              icon={MemoryStick}
            />
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {servers.map((s, i) => {
              const r = results[i];
              const snap = r.data;
              const ok = !!snap?.ok;
              return (
                <Card key={s.id} className="group transition-colors hover:border-primary/50">
                  <CardHeader className="flex-row items-start justify-between space-y-0 pb-3">
                    <div className="min-w-0">
                      <CardTitle className="flex items-center gap-2 text-base">
                        <span className={`h-2 w-2 rounded-full ${ok ? "bg-success" : "bg-destructive"} ${ok ? "animate-pulse" : ""}`} />
                        <span className="truncate">{s.name}</span>
                      </CardTitle>
                      <p className="mt-0.5 truncate text-xs text-muted-foreground">{s.username}@{s.host}</p>
                    </div>
                    <Link to="/monitoring" className="text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100">
                      <ArrowUpRight className="h-4 w-4" />
                    </Link>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {!ok && (
                      <div className="flex items-center gap-2 text-xs text-destructive">
                        <WifiOff className="h-3 w-3" />
                        {r.isLoading ? "Connecting..." : (snap?.error || "Unreachable")}
                      </div>
                    )}
                    {ok && snap?.hardware && (
                      <>
                        <Bar label="CPU" value={snap.hardware.cpuPct} suffix="%" />
                        <Bar
                          label="Memory"
                          value={(snap.hardware.memUsed / snap.hardware.memTotal) * 100}
                          subtitle={`${fmtBytes(snap.hardware.memUsed)} / ${fmtBytes(snap.hardware.memTotal)}`}
                        />
                        <Bar
                          label="Disk"
                          value={(snap.hardware.diskUsed / snap.hardware.diskTotal) * 100}
                          subtitle={`${fmtBytes(snap.hardware.diskUsed)} / ${fmtBytes(snap.hardware.diskTotal)}`}
                        />
                        <div className="flex items-center justify-between border-t pt-2 text-xs text-muted-foreground">
                          <span>{snap.containers?.filter((c) => c.state === "running").length ?? 0} containers</span>
                          <span>{snap.pm2?.length ?? 0} pm2</span>
                          <Badge variant="outline" className="font-mono">load {snap.hardware.loadAvg[0].toFixed(2)}</Badge>
                        </div>
                      </>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

function Stat({ label, value, icon: Icon }: { label: string; value: string; icon: any }) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <span className="text-xs uppercase tracking-wide text-muted-foreground">{label}</span>
          <Icon className="h-4 w-4 text-muted-foreground" />
        </div>
        <div className="mt-2 text-2xl font-semibold tracking-tight">{value}</div>
      </CardContent>
    </Card>
  );
}

function Bar({ label, value, suffix, subtitle }: { label: string; value: number; suffix?: string; subtitle?: string }) {
  const pct = Math.min(100, Math.max(0, value || 0));
  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-xs">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-mono">{subtitle || `${pct.toFixed(0)}${suffix || ""}`}</span>
      </div>
      <Progress value={pct} className="h-1.5" />
    </div>
  );
}
