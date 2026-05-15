import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Play, Square, Trash2 } from "lucide-react";
import { ServerPicker, useServers } from "@/components/server-picker";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { streamSSE } from "@/lib/agent-client";
import { setLastOutput, setLastServer } from "@/lib/chat-context";
import { NoServersState } from "@/components/empty-state";

export const Route = createFileRoute("/_authenticated/actions")({
  component: ActionsPage,
});

interface Cmd { label: string; cmd: string; danger?: boolean }
const groups: Record<string, Cmd[]> = {
  System: [
    { label: "Uptime", cmd: "uptime" },
    { label: "Disk usage", cmd: "df -h" },
    { label: "Memory", cmd: "free -h" },
    { label: "Top processes", cmd: "ps aux --sort=-%cpu | head -20" },
    { label: "Kernel info", cmd: "uname -a" },
    { label: "Reboot", cmd: "sudo reboot", danger: true },
  ],
  "APT (Debian/Ubuntu)": [
    { label: "Update lists", cmd: "sudo apt-get update" },
    { label: "Upgrade", cmd: "sudo apt-get -y upgrade" },
    { label: "Autoremove", cmd: "sudo apt-get -y autoremove" },
    { label: "List upgradable", cmd: "apt list --upgradable" },
  ],
  "DNF (RHEL/Fedora)": [
    { label: "Check updates", cmd: "sudo dnf check-update" },
    { label: "Upgrade", cmd: "sudo dnf -y upgrade" },
  ],
  Docker: [
    { label: "ps", cmd: "docker ps" },
    { label: "ps -a", cmd: "docker ps -a" },
    { label: "images", cmd: "docker images" },
    { label: "system df", cmd: "docker system df" },
    { label: "Prune (containers, images, vols)", cmd: "docker system prune -af --volumes", danger: true },
  ],
  PM2: [
    { label: "list", cmd: "pm2 list" },
    { label: "save", cmd: "pm2 save" },
    { label: "restart all", cmd: "pm2 restart all" },
    { label: "logs (50 lines)", cmd: "pm2 logs --lines 50 --nostream" },
  ],
  systemd: [
    { label: "Failed units", cmd: "systemctl --failed" },
    { label: "List timers", cmd: "systemctl list-timers --all" },
    { label: "Journal (200 lines)", cmd: "journalctl -n 200 --no-pager" },
  ],
  Network: [
    { label: "IP addresses", cmd: "ip -br addr" },
    { label: "Listening ports", cmd: "ss -tulpn" },
    { label: "Routes", cmd: "ip route" },
  ],
  Git: [
    { label: "git status (cwd)", cmd: "git status" },
    { label: "git pull (cwd)", cmd: "git pull" },
  ],
};

function ActionsPage() {
  const { data: servers = [] } = useServers();
  const [serverId, setServerId] = useState<string | undefined>();
  const active = serverId ?? servers[0]?.id;
  const [output, setOutput] = useState("");
  const [running, setRunning] = useState(false);
  const [custom, setCustom] = useState("");
  const lastCmdRef = useRef("");
  const stopRef = useRef<(() => void) | null>(null);
  const preRef = useRef<HTMLPreElement>(null);

  useEffect(() => () => { stopRef.current?.(); }, []);
  useEffect(() => { if (preRef.current) preRef.current.scrollTop = preRef.current.scrollHeight; }, [output]);
  useEffect(() => { if (active) setLastServer(active); }, [active]);

  const run = (cmd: string) => {
    if (!active) return;
    stopRef.current?.();
    lastCmdRef.current = cmd;
    let cmdBuffer = "";
    setOutput((o) => o + `\n$ ${cmd}\n`);
    setRunning(true);
    stopRef.current = streamSSE(
      "/api/actions/exec",
      { serverId: active, command: cmd },
      (chunk) => {
        try {
          const j = JSON.parse(chunk);
          if (j.data) { setOutput((o) => o + j.data); cmdBuffer += j.data; }
          if (j.exit !== undefined) setOutput((o) => o + `\n[exit ${j.exit}]\n`);
        } catch {
          setOutput((o) => o + chunk);
          cmdBuffer += chunk;
        }
      },
      (err) => {
        setRunning(false);
        if (err) setOutput((o) => o + `\n[error: ${err.message}]\n`);
        setLastOutput(cmd, cmdBuffer);
      }
    );
  };

  const stop = () => { stopRef.current?.(); stopRef.current = null; setRunning(false); };

  return (
    <div className="space-y-6 p-4 md:p-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Actions</h1>
          <p className="text-sm text-muted-foreground">Run common admin commands over SSH</p>
        </div>
        <ServerPicker value={active} onChange={(id) => setServerId(id)} />
      </div>

      {servers.length === 0 && <NoServersState />}

      {servers.length > 0 && (
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle className="text-base">Command palette <span className="ml-1 text-xs font-normal text-muted-foreground">— or press ⌘K</span></CardTitle></CardHeader>
          <CardContent>
            <Tabs defaultValue={Object.keys(groups)[0]}>
              <TabsList className="flex flex-wrap h-auto">
                {Object.keys(groups).map((g) => <TabsTrigger key={g} value={g}>{g}</TabsTrigger>)}
              </TabsList>
              {Object.entries(groups).map(([g, cmds]) => (
                <TabsContent key={g} value={g} className="mt-3 space-y-2">
                  {cmds.map((c) => (
                    <button
                      key={c.cmd}
                      onClick={() => run(c.cmd)}
                      disabled={!active || running}
                      className={`w-full rounded-md border p-3 text-left transition-colors hover:bg-accent disabled:opacity-50 ${
                        c.danger ? "border-destructive/40" : ""
                      }`}
                    >
                      <div className="font-medium text-sm">{c.label}</div>
                      <code className="text-xs text-muted-foreground">{c.cmd}</code>
                    </button>
                  ))}
                </TabsContent>
              ))}
            </Tabs>
            <div className="mt-4 flex gap-2">
              <Input
                placeholder="Custom command..."
                value={custom}
                onChange={(e) => setCustom(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && custom && run(custom)}
                className="font-mono"
              />
              <Button onClick={() => custom && run(custom)} disabled={!active || running || !custom}>
                <Play className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle className="text-base">Output</CardTitle>
            <div className="flex gap-1">
              <Button size="sm" variant="ghost" onClick={() => setOutput("")}><Trash2 className="h-4 w-4" /></Button>
              <Button size="sm" variant="ghost" onClick={stop} disabled={!running}><Square className="h-4 w-4" /></Button>
            </div>
          </CardHeader>
          <CardContent>
            <pre
              ref={preRef}
              className="h-[480px] overflow-auto whitespace-pre-wrap rounded-md bg-black/40 p-4 font-mono text-xs leading-relaxed text-emerald-100"
            >
              {output || "// terminal output will appear here"}
            </pre>
          </CardContent>
        </Card>
      </div>
      )}
    </div>
  );
}
