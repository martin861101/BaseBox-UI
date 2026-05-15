import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Activity, Terminal, FolderOpen, Bot, Settings, LayoutDashboard, Server as ServerIcon, Play } from "lucide-react";
import {
  CommandDialog, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList, CommandSeparator,
} from "@/components/ui/command";
import { useServers } from "@/components/server-picker";
import { setLastServer, setLastOutput } from "@/lib/chat-context";
import { streamSSE } from "@/lib/agent-client";
import { toast } from "sonner";

const navItems = [
  { label: "Dashboard", to: "/dashboard", icon: LayoutDashboard },
  { label: "Monitoring", to: "/monitoring", icon: Activity },
  { label: "Actions", to: "/actions", icon: Terminal },
  { label: "Files", to: "/files", icon: FolderOpen },
  { label: "AI Assistant", to: "/assistant", icon: Bot },
  { label: "Settings", to: "/settings", icon: Settings },
] as const;

const quickCommands = [
  { label: "Uptime", cmd: "uptime" },
  { label: "Disk usage", cmd: "df -h" },
  { label: "Memory", cmd: "free -h" },
  { label: "Top processes", cmd: "ps aux --sort=-%cpu | head -20" },
  { label: "Docker ps", cmd: "docker ps" },
  { label: "PM2 list", cmd: "pm2 list" },
  { label: "Listening ports", cmd: "ss -tulpn" },
  { label: "Failed services", cmd: "systemctl --failed" },
];

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const { data: servers = [] } = useServers();

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if ((e.key === "k" || e.key === "K") && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((o) => !o);
      }
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, []);

  const go = (to: string) => { setOpen(false); navigate({ to }); };

  const runOn = (serverId: string, label: string, cmd: string) => {
    setOpen(false);
    setLastServer(serverId);
    let output = "";
    toast.loading(`Running: ${label}`, { id: "cmd-" + cmd });
    streamSSE(
      "/api/actions/exec",
      { serverId, command: cmd },
      (chunk) => {
        try {
          const j = JSON.parse(chunk);
          if (j.data) output += j.data;
          if (j.exit !== undefined) output += `\n[exit ${j.exit}]\n`;
        } catch { output += chunk; }
      },
      (err) => {
        if (err) toast.error(err.message, { id: "cmd-" + cmd });
        else toast.success(`Done: ${label}`, { id: "cmd-" + cmd, description: "Output saved for AI context" });
        setLastOutput(cmd, output);
      },
    );
  };

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput placeholder="Search nav, servers, or commands..." />
      <CommandList>
        <CommandEmpty>No results.</CommandEmpty>

        <CommandGroup heading="Navigation">
          {navItems.map((n) => (
            <CommandItem key={n.to} onSelect={() => go(n.to)}>
              <n.icon className="mr-2 h-4 w-4" />
              {n.label}
            </CommandItem>
          ))}
        </CommandGroup>

        {servers.length > 0 && (
          <>
            <CommandSeparator />
            <CommandGroup heading="Servers">
              {servers.map((s) => (
                <CommandItem
                  key={s.id}
                  onSelect={() => { setLastServer(s.id); go("/monitoring"); }}
                  value={`server ${s.name} ${s.host}`}
                >
                  <ServerIcon className="mr-2 h-4 w-4" />
                  {s.name}
                  <span className="ml-2 text-xs text-muted-foreground">{s.username}@{s.host}</span>
                </CommandItem>
              ))}
            </CommandGroup>

            <CommandSeparator />
            <CommandGroup heading={`Run on ${servers[0].name}`}>
              {quickCommands.map((c) => (
                <CommandItem
                  key={c.cmd}
                  onSelect={() => runOn(servers[0].id, c.label, c.cmd)}
                  value={`run ${c.label} ${c.cmd}`}
                >
                  <Play className="mr-2 h-4 w-4 text-primary" />
                  {c.label}
                  <code className="ml-2 text-xs text-muted-foreground">{c.cmd}</code>
                </CommandItem>
              ))}
            </CommandGroup>
          </>
        )}
      </CommandList>
    </CommandDialog>
  );
}
