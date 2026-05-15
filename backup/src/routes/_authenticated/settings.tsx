import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2, Pencil, Plug, Loader2, Sun, Moon } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { api, getAgentUrl, setAgentUrl, type Server } from "@/lib/agent-client";
import { toast } from "sonner";
import { accents, useTheme } from "@/lib/theme";

export const Route = createFileRoute("/_authenticated/settings")({
  component: SettingsPage,
});

const empty: Omit<Server, "id"> = {
  name: "", host: "", port: 22, username: "root",
  authType: "password", password: "", privateKey: "", passphrase: "",
};

function SettingsPage() {
  const qc = useQueryClient();
  const { mode, setMode, accentId, setAccent } = useTheme();
  const { data: servers = [] } = useQuery({ queryKey: ["servers"], queryFn: api.listServers });
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Server | null>(null);
  const [form, setForm] = useState<Omit<Server, "id">>(empty);
  const [agentUrl, setUrl] = useState(getAgentUrl());
  const [busy, setBusy] = useState(false);

  const openNew = () => { setEditing(null); setForm(empty); setOpen(true); };
  const openEdit = (s: Server) => { setEditing(s); setForm(s); setOpen(true); };

  const save = async () => {
    setBusy(true);
    try {
      if (editing) await api.updateServer(editing.id, form);
      else await api.createServer(form);
      qc.invalidateQueries({ queryKey: ["servers"] });
      toast.success("Saved");
      setOpen(false);
    } catch (e: any) { toast.error(e.message); }
    finally { setBusy(false); }
  };

  const del = async (s: Server) => {
    if (!confirm(`Delete ${s.name}?`)) return;
    try { await api.deleteServer(s.id); qc.invalidateQueries({ queryKey: ["servers"] }); }
    catch (e: any) { toast.error(e.message); }
  };

  const test = async (s: Server) => {
    try {
      const r = await api.testServer(s.id);
      r.ok ? toast.success(r.message || "Connected") : toast.error(r.message || "Failed");
    } catch (e: any) { toast.error(e.message); }
  };

  return (
    <div className="space-y-6 p-4 md:p-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
        <p className="text-sm text-muted-foreground">Manage servers, theme, and agent connection</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Appearance</CardTitle>
          <CardDescription>Theme mode and accent color</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-2">
            <Label className="w-20 text-sm">Mode</Label>
            <div className="flex gap-2">
              <Button size="sm" variant={mode === "light" ? "default" : "outline"} onClick={() => setMode("light")}>
                <Sun className="mr-1 h-4 w-4" /> Light
              </Button>
              <Button size="sm" variant={mode === "dark" ? "default" : "outline"} onClick={() => setMode("dark")}>
                <Moon className="mr-1 h-4 w-4" /> Dark
              </Button>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Label className="w-20 text-sm">Accent</Label>
            <div className="flex flex-wrap gap-2">
              {accents.map((a) => (
                <button
                  key={a.id}
                  onClick={() => setAccent(a.id)}
                  className={`flex items-center gap-2 rounded-md border px-3 py-1.5 text-xs transition-all hover:bg-accent ${accentId === a.id ? "border-primary ring-1 ring-primary" : ""}`}
                >
                  <span className="h-3 w-3 rounded-full" style={{ background: a.primary }} />
                  {a.label}
                </button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Agent</CardTitle>
          <CardDescription>URL of the self-hosted homelab-agent backend</CardDescription>
        </CardHeader>
        <CardContent className="flex gap-2">
          <Input value={agentUrl} onChange={(e) => setUrl(e.target.value)} placeholder="http://homelab.local:8788" />
          <Button onClick={() => { setAgentUrl(agentUrl); toast.success("Saved — refresh to apply"); }}>Save</Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <div>
            <CardTitle className="text-base">Servers</CardTitle>
            <CardDescription>SSH endpoints the agent will connect to</CardDescription>
          </div>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button onClick={openNew}><Plus className="mr-1 h-4 w-4" /> Add server</Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>{editing ? "Edit server" : "Add server"}</DialogTitle>
              </DialogHeader>
              <div className="grid gap-3">
                <Field label="Name"><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Field>
                <div className="grid grid-cols-3 gap-2">
                  <div className="col-span-2"><Field label="Host / IP"><Input value={form.host} onChange={(e) => setForm({ ...form, host: e.target.value })} /></Field></div>
                  <Field label="Port"><Input type="number" value={form.port} onChange={(e) => setForm({ ...form, port: +e.target.value })} /></Field>
                </div>
                <Field label="Username"><Input value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} /></Field>
                <Field label="Auth method">
                  <Select value={form.authType} onValueChange={(v: any) => setForm({ ...form, authType: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="password">Password</SelectItem>
                      <SelectItem value="key">Private key</SelectItem>
                    </SelectContent>
                  </Select>
                </Field>
                {form.authType === "password" ? (
                  <Field label="Password"><Input type="password" value={form.password || ""} onChange={(e) => setForm({ ...form, password: e.target.value })} /></Field>
                ) : (
                  <>
                    <Field label="Private key (paste)">
                      <Textarea rows={6} className="font-mono text-xs" value={form.privateKey || ""} onChange={(e) => setForm({ ...form, privateKey: e.target.value })} placeholder="-----BEGIN OPENSSH PRIVATE KEY-----" />
                    </Field>
                    <Field label="Passphrase (optional)"><Input type="password" value={form.passphrase || ""} onChange={(e) => setForm({ ...form, passphrase: e.target.value })} /></Field>
                  </>
                )}
              </div>
              <DialogFooter>
                <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
                <Button onClick={save} disabled={busy}>{busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Save</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {servers.map((s) => (
              <div key={s.id} className="flex items-center justify-between rounded-md border p-3">
                <div className="min-w-0">
                  <div className="font-medium">{s.name}</div>
                  <p className="text-xs text-muted-foreground">{s.username}@{s.host}:{s.port} ({s.authType})</p>
                </div>
                <div className="flex gap-1">
                  <Button size="sm" variant="ghost" onClick={() => test(s)}><Plug className="h-4 w-4" /></Button>
                  <Button size="sm" variant="ghost" onClick={() => openEdit(s)}><Pencil className="h-4 w-4" /></Button>
                  <Button size="sm" variant="ghost" onClick={() => del(s)}><Trash2 className="h-4 w-4" /></Button>
                </div>
              </div>
            ))}
            {servers.length === 0 && <p className="text-sm text-muted-foreground">No servers yet. Add one above.</p>}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      {children}
    </div>
  );
}
