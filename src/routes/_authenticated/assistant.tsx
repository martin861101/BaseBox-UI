import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Send, Bot, User, Loader2, Trash2, Sparkles, AlertTriangle, Play } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { api, streamSSE } from "@/lib/agent-client";
import { useServers, ServerPicker } from "@/components/server-picker";
import { getLastOutput, loadChat, saveChat, clearChat, getLastServer, setLastServer } from "@/lib/chat-context";
import { MarkdownMessage } from "@/components/markdown-message";
import { toast } from "sonner";
import {
  loadAgents, getActiveAgentId, setActiveAgentId,
  PROVIDERS, loadProviderConfigs, buildSystemPrompt,
  type AgentDef,
} from "@/lib/ai-providers";

export const Route = createFileRoute("/_authenticated/assistant")({
  component: AssistantPage,
});

interface Msg { role: "user" | "assistant" | "system"; content: string }

const DESTRUCTIVE_PATTERNS = [
  /\brm\s+-rf?\b/, /\bmkfs/, /\bdd\s+if=/, /:\(\)\s*\{/, /\bshutdown\b/, /\breboot\b/,
  /\bdrop\s+(database|table)/i, /\b(docker|podman)\s+system\s+prune/, /\bchmod\s+-R\s+[0-7]{3}\s+\//,
];
function isDestructive(cmd: string) { return DESTRUCTIVE_PATTERNS.some((r) => r.test(cmd)); }

const DEFAULT_SYSTEM = "You are a helpful homelab sysadmin assistant. Give concise, command-oriented answers. When suggesting shell commands, put them in fenced ```bash code blocks so the user can run them with one click.";

function AssistantPage() {
  const { data: servers = [] } = useServers();
  const [serverId, setServerId] = useState<string | undefined>(() => getLastServer() || undefined);
  const active = serverId ?? servers[0]?.id;
  const activeServer = servers.find((s) => s.id === active);
  const chatKey = active || "_global";

  const agents = loadAgents();
  const [activeAgentId, setActiveAgent] = useState<string>(() => getActiveAgentId() || agents[0]?.id || "");
  const activeAgent = agents.find((a) => a.id === activeAgentId) || agents[0];

  const provConfigs = loadProviderConfigs();
  const activeProvider = activeAgent ? PROVIDERS.find((p) => p.id === activeAgent.providerId) : null;
  const activeProvCfg = activeAgent ? provConfigs[activeAgent.providerId] : null;
  const activeModel = activeAgent ? (activeProvider?.models.find((m) => m.id === activeAgent.modelId) || activeProvider?.models[0]) : null;

  // Also fetch Ollama models for backward compat
  const { data: modelsData } = useQuery({
    queryKey: ["ai-models"],
    queryFn: api.aiModels,
    retry: false,
  });

  const effectiveModel = activeAgent?.modelId || "";
  const effectiveSystemPrompt = activeAgent ? buildSystemPrompt(activeAgent.systemPrompt) : DEFAULT_SYSTEM;

  const [messages, setMessages] = useState<Msg[]>([{ role: "system", content: DEFAULT_SYSTEM }]);
  const [includeContext, setIncludeContext] = useState(true);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [pendingRun, setPendingRun] = useState<string | null>(null);
  const stopRef = useRef<(() => void) | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Load history when server changes
  useEffect(() => {
    const stored = loadChat(chatKey);
    setMessages(stored && stored.length ? stored : [{ role: "system", content: DEFAULT_SYSTEM }]);
  }, [chatKey]);

  // Persist on change
  useEffect(() => { saveChat(chatKey, messages); }, [chatKey, messages]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, streaming]);

  useEffect(() => { if (activeAgentId) setActiveAgentId(activeAgentId); }, [activeAgentId]);
  useEffect(() => { if (active) setLastServer(active); }, [active]);

  const contextBlock = useMemo(() => {
    if (!includeContext) return null;
    const last = getLastOutput();
    const parts: string[] = [];
    if (activeServer) parts.push(`Active server: ${activeServer.name} (${activeServer.username}@${activeServer.host})`);
    if (last) parts.push(`Last command run: \`${last.cmd}\`\nOutput (tail):\n\`\`\`\n${last.output.slice(-1500)}\n\`\`\``);
    return parts.length ? parts.join("\n\n") : null;
  }, [includeContext, activeServer]);

  const send = () => {
    if (!input.trim() || !effectiveModel || streaming) return;
    const userMsg: Msg = { role: "user", content: input };
    const sys: Msg = {
      role: "system",
      content: effectiveSystemPrompt + (contextBlock ? `\n\nContext:\n${contextBlock}` : ""),
    };
    const next: Msg[] = [...messages.filter((m) => m.role !== "system"), userMsg, { role: "assistant", content: "" }];
    const sendable = [sys, ...next.filter((m) => m.role !== "assistant" || m.content)];
    setMessages([sys, ...next]);
    setInput("");
    setStreaming(true);

    stopRef.current = streamSSE(
      "/api/ai/chat",
      { 
        provider: activeAgent?.providerId || "ollama",
        baseUrl: activeProvCfg?.baseUrl || "",
        apiKey: activeProvCfg?.apiKey || "",
        model: effectiveModel, 
        messages: sendable,
        temperature: activeAgent?.temperature,
        maxTokens: activeAgent?.maxTokens
      },
      (chunk) => {
        try {
          const j = JSON.parse(chunk);
          if (j.error) throw new Error(j.error);
          
          const delta = 
            j.message?.content ?? 
            j.choices?.[0]?.delta?.content ?? 
            j.delta?.text ?? 
            j.candidates?.[0]?.content?.parts?.[0]?.text ?? 
            "";
          if (delta) {
            setMessages((prev) => {
              const copy = [...prev];
              copy[copy.length - 1] = { ...copy[copy.length - 1], content: copy[copy.length - 1].content + delta };
              return copy;
            });
          }
        } catch (e: any) {
          if (e.message) {
            toast.error(e.message);
            stopRef.current?.();
            setStreaming(false);
          }
        }
      },
      (err) => {
        setStreaming(false);
        if (err) toast.error(err.message);
      },
    );
  };

  const clear = () => {
    stopRef.current?.();
    setMessages([{ role: "system", content: DEFAULT_SYSTEM }]);
    clearChat(chatKey);
    setStreaming(false);
  };

  const requestRun = (cmd: string, lang?: string) => {
    if (lang === "tavily") {
      runTavily(cmd);
      return;
    }
    if (lang === "playwright") {
      runPlaywright(cmd);
      return;
    }
    if (!active) { toast.error("Select a server first"); return; }
    if (isDestructive(cmd)) { setPendingRun(cmd); return; }
    runOnServer(cmd);
  };

  const runTavily = async (query: string) => {
    const key = localStorage.getItem("homelab.tavily.key");
    if (!key) return toast.error("Tavily API key not configured in AI Settings");
    
    toast.loading(`Searching Web: ${query}…`, { id: "ai-run" });
    try {
      const res = await fetch("https://api.tavily.com/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ api_key: key, query, search_depth: "basic" })
      });
      if (!res.ok) throw new Error("Search failed: " + res.statusText);
      const data = await res.json();
      const output = data.results.map((r: any) => `[${r.title}](${r.url})\n${r.content}`).join("\n\n");
      
      toast.success("Search complete", { id: "ai-run" });
      setMessages((prev) => [...prev, {
        role: "user",
        content: `Web Search Results for "${query}":\n\n${output}`,
      }]);
    } catch (e: any) {
      toast.error(e.message, { id: "ai-run" });
    }
  };

  const runPlaywright = (script: string) => {
    let buf = "";
    toast.loading(`Running Browser Automation…`, { id: "ai-run" });
    streamSSE(
      "/api/actions/playwright",
      { script },
      (chunk) => { try { const j = JSON.parse(chunk); if (j.data) buf += j.data; } catch { buf += chunk; } },
      (err) => {
        if (err) toast.error(err.message, { id: "ai-run" });
        else toast.success("Browser automation done", { id: "ai-run" });
        setMessages((prev) => [...prev, {
          role: "user",
          content: `Browser Output:\n\n\`\`\`\n${buf.slice(-2000) || "(no output)"}\n\`\`\``,
        }]);
      },
    );
  };

  const runOnServer = (cmd: string) => {
    let buf = "";
    toast.loading(`Running on ${activeServer?.name || "server"}…`, { id: "ai-run" });
    streamSSE(
      "/api/actions/exec",
      { serverId: active, command: cmd },
      (chunk) => { try { const j = JSON.parse(chunk); if (j.data) buf += j.data; } catch { buf += chunk; } },
      (err) => {
        if (err) toast.error(err.message, { id: "ai-run" });
        else toast.success("Done — output appended to chat", { id: "ai-run" });
        setMessages((prev) => [...prev, {
          role: "user",
          content: `Ran on ${activeServer?.name}:\n\n\`\`\`\n$ ${cmd}\n${buf.slice(-2000) || "(no output)"}\n\`\`\``,
        }]);
      },
    );
  };

  const visible = messages.filter((m) => m.role !== "system");

  return (
    <div className="flex h-[calc(100vh-3.5rem)] flex-col">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b p-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">AI Assistant</h1>
          <p className="text-sm text-muted-foreground">
            {activeAgent ? `${activeAgent.icon} ${activeAgent.name}` : "No agent selected"}
            {activeProvider && activeModel ? ` · ${activeProvider.icon} ${activeModel.label}` : ""}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <ServerPicker value={active} onChange={(id) => setServerId(id)} />
          <Select value={activeAgentId} onValueChange={setActiveAgent}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Select agent" />
            </SelectTrigger>
            <SelectContent>
              {agents.map((a) => (
                <SelectItem key={a.id} value={a.id}>
                  <span className="flex items-center gap-2">
                    <span>{a.icon}</span> {a.name}
                    <Badge variant="outline" className="text-[9px] ml-1">{PROVIDERS.find((p) => p.id === a.providerId)?.icon}</Badge>
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="ghost" size="icon" onClick={clear} title="Clear chat"><Trash2 className="h-4 w-4" /></Button>
        </div>
      </div>

      <div className="flex items-center gap-3 border-b bg-muted/20 px-4 py-2 text-xs">
        <Switch id="ctx" checked={includeContext} onCheckedChange={setIncludeContext} />
        <Label htmlFor="ctx" className="cursor-pointer">
          Include server context
          <span className="ml-1 text-muted-foreground">— sends active server info + last command output</span>
        </Label>
        {includeContext && contextBlock && <Sparkles className="ml-auto h-3 w-3 text-primary" />}
      </div>

      <div ref={scrollRef} className="flex-1 overflow-auto p-4">
        <div className="mx-auto max-w-3xl space-y-4">
          {visible.map((m, i) => (
            <Card key={i} className={m.role === "user" ? "bg-accent/40" : ""}>
              <CardContent className="flex gap-3 p-4">
                <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-muted">
                  {m.role === "user" ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4 text-primary" />}
                </div>
                <div className="min-w-0 flex-1 text-sm leading-relaxed">
                  {m.content
                    ? <MarkdownMessage content={m.content} onRun={requestRun} />
                    : (streaming && i === visible.length - 1
                        ? <Loader2 className="h-4 w-4 animate-spin" />
                        : null)}
                </div>
              </CardContent>
            </Card>
          ))}
          {visible.length === 0 && (
            <div className="py-12 text-center text-sm text-muted-foreground">
              <Bot className="mx-auto mb-3 h-8 w-8 opacity-40" />
              <p>Ask anything — debug docker, write a systemd unit, draft a bash one-liner.</p>
              <p className="mt-1 text-xs">Code blocks the model returns will have a <Play className="inline h-3 w-3 text-primary" /> Run button.</p>
            </div>
          )}
        </div>
      </div>

      <div className="border-t p-4">
        <div className="mx-auto flex max-w-3xl gap-2">
          <Textarea
            rows={2}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); }
            }}
            placeholder={effectiveModel ? `Ask ${activeAgent?.name || "the assistant"}...` : "Configure an agent in AI Settings first"}
            className="resize-none"
          />
          <Button onClick={send} disabled={streaming || !input.trim() || !effectiveModel}>
            {streaming ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </Button>
        </div>
      </div>

      <AlertDialog open={!!pendingRun} onOpenChange={(o) => !o && setPendingRun(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Confirm destructive command
            </AlertDialogTitle>
            <AlertDialogDescription>
              This command looks destructive. Run on <strong>{activeServer?.name}</strong>?
              <pre className="mt-3 overflow-auto rounded-md bg-muted p-3 font-mono text-xs">{pendingRun}</pre>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => { const c = pendingRun!; setPendingRun(null); runOnServer(c); }}
            >
              Run anyway
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
