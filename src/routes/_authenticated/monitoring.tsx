import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Cpu, MemoryStick, HardDrive, Clock, Container as ContainerIcon,
  PlayCircle, StopCircle, RefreshCw, Loader2,
} from "lucide-react";
import { ServerPicker, useServers } from "@/components/server-picker";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { api } from "@/lib/agent-client";
import { toast } from "sonner";
import { NoServersState, EmptyState as RichEmpty } from "@/components/empty-state";
import { WifiOff } from "lucide-react";
import { setLastServer } from "@/lib/chat-context";

export const Route = createFileRoute("/_authenticated/monitoring")({
  component: MonitoringPage,
});

function fmtBytes(n: number) {
  if (!n) return "0 B";
  const u = ["B", "KB", "MB", "GB", "TB"];
  let i = 0;
  while (n >= 1024 && i < u.length - 1) { n /= 1024; i++; }
  return `${n.toFixed(1)} ${u[i]}`;
}
function fmtUptime(sec: number) {
  const d = Math.floor(sec / 86400);
  const h = Math.floor((sec % 86400) / 3600);
  const m = Math.floor((sec % 3600) / 60);
  return [d && `${d}d`, h && `${h}h`, `${m}m`].filter(Boolean).join(" ");
}

function MonitoringPage() {
  const { data: servers = [] } = useServers();
  const [serverId, setServerId] = useState<string | undefined>();
  const active = serverId ?? servers[0]?.id;
  useEffect(() => { if (active) setLastServer(active); }, [active]);

  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ["monitor", active],
    queryFn: () => api.monitor(active!),
    enabled: !!active,
    refetchInterval: 5000,
  });

  const containerAct = async (name: string, action: "start" | "stop" | "restart") => {
    try {
      await api.containerAction(active!, name, action);
      toast.success(`${action}: ${name}`);
      refetch();
    } catch (e: any) { toast.error(e.message); }
  };
  const pm2Act = async (name: string, action: "start" | "stop" | "restart") => {
    try {
      await api.pm2Action(active!, name, action);
      toast.success(`${action}: ${name}`);
      refetch();
    } catch (e: any) { toast.error(e.message); }
  };

  return (
    <div className="space-y-6 p-4 md:p-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Monitoring</h1>
          <p className="text-sm text-muted-foreground">Live hardware, containers, and PM2 services</p>
        </div>
        <div className="flex items-center gap-2">
          <ServerPicker value={active} onChange={(id) => setServerId(id)} />
          <Button variant="outline" size="icon" onClick={() => refetch()} disabled={!active || isFetching}>
            {isFetching ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
          </Button>
        </div>
      </div>

      {!active && servers.length === 0 && <NoServersState />}
      {active && isLoading && <EmptyState text="Loading metrics..." />}
      {active && data && !data.ok && (
        <RichEmpty
          icon={WifiOff}
          variant="error"
          title="Couldn't reach this server"
          description={data.error || "The agent reported a connection error. Check the host, credentials, and that the agent can SSH to this server."}
          action={{ label: "Retry", onClick: () => refetch() }}
        />
      )}

      {data?.ok && data.hardware && (
        <>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Metric icon={Cpu} label="CPU" value={`${data.hardware.cpuPct.toFixed(0)}%`} pct={data.hardware.cpuPct} />
            <Metric icon={MemoryStick} label="Memory"
              value={`${fmtBytes(data.hardware.memUsed)} / ${fmtBytes(data.hardware.memTotal)}`}
              pct={(data.hardware.memUsed / data.hardware.memTotal) * 100} />
            <Metric icon={HardDrive} label="Disk"
              value={`${fmtBytes(data.hardware.diskUsed)} / ${fmtBytes(data.hardware.diskTotal)}`}
              pct={(data.hardware.diskUsed / data.hardware.diskTotal) * 100} />
            <Metric icon={Clock} label="Uptime" value={fmtUptime(data.hardware.uptimeSec)}
              sub={`load ${data.hardware.loadAvg.map((n) => n.toFixed(2)).join(" / ")}`} />
          </div>

          <Card>
            <CardHeader className="flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <ContainerIcon className="h-5 w-5" />Docker containers
              </CardTitle>
              <span className="text-xs text-muted-foreground">{data.containers?.length ?? 0} total</span>
            </CardHeader>
            <CardContent>
              {!data.containers?.length && <p className="text-sm text-muted-foreground">No containers reported (is docker installed?)</p>}
              <div className="space-y-2">
                {data.containers?.map((c) => (
                  <div key={c.id} className="flex items-center justify-between rounded-md border p-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="truncate font-medium">{c.name}</span>
                        <Badge variant={c.state === "running" ? "default" : "secondary"}>{c.state}</Badge>
                      </div>
                      <p className="truncate text-xs text-muted-foreground">{c.image} — {c.status}</p>
                    </div>
                    <div className="flex gap-1">
                      <Button size="icon" variant="ghost" onClick={() => containerAct(c.name, "start")}><PlayCircle className="h-4 w-4" /></Button>
                      <Button size="icon" variant="ghost" onClick={() => containerAct(c.name, "restart")}><RefreshCw className="h-4 w-4" /></Button>
                      <Button size="icon" variant="ghost" onClick={() => containerAct(c.name, "stop")}><StopCircle className="h-4 w-4" /></Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex-row items-center justify-between">
              <CardTitle>PM2 services</CardTitle>
              <span className="text-xs text-muted-foreground">{data.pm2?.length ?? 0} total</span>
            </CardHeader>
            <CardContent>
              {!data.pm2?.length && <p className="text-sm text-muted-foreground">No PM2 processes reported (is pm2 installed?)</p>}
              <div className="space-y-2">
                {data.pm2?.map((p) => (
                  <div key={p.name} className="flex items-center justify-between rounded-md border p-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="truncate font-medium">{p.name}</span>
                        <Badge variant={p.status === "online" ? "default" : "secondary"}>{p.status}</Badge>
                      </div>
                      <p className="truncate text-xs text-muted-foreground">
                        cpu {p.cpu}% • mem {fmtBytes(p.memory)} • restarts {p.restarts} • {fmtUptime((p.uptime || 0) / 1000)}
                      </p>
                    </div>
                    <div className="flex gap-1">
                      <Button size="icon" variant="ghost" onClick={() => pm2Act(p.name, "start")}><PlayCircle className="h-4 w-4" /></Button>
                      <Button size="icon" variant="ghost" onClick={() => pm2Act(p.name, "restart")}><RefreshCw className="h-4 w-4" /></Button>
                      <Button size="icon" variant="ghost" onClick={() => pm2Act(p.name, "stop")}><StopCircle className="h-4 w-4" /></Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}

function Metric({ icon: Icon, label, value, sub, pct }: { icon: any; label: string; value: string; sub?: string; pct?: number }) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <span className="text-xs uppercase tracking-wide text-muted-foreground">{label}</span>
          <Icon className="h-4 w-4 text-muted-foreground" />
        </div>
        <div className="mt-2 text-2xl font-semibold">{value}</div>
        {pct !== undefined && <Progress value={Math.min(100, pct)} className="mt-3 h-1.5" />}
        {sub && <p className="mt-2 text-xs text-muted-foreground">{sub}</p>}
      </CardContent>
    </Card>
  );
}

function EmptyState({ text, error }: { text: string; error?: boolean }) {
  return (
    <Card>
      <CardContent className="p-10 text-center">
        <p className={error ? "text-destructive" : "text-muted-foreground"}>{text}</p>
      </CardContent>
    </Card>
  );
}
