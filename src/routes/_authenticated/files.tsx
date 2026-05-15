import { createFileRoute } from "@tanstack/react-router";
import { useState, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Folder, File as FileIcon, ChevronRight, Upload, Download, Trash2, FolderPlus, RefreshCw, Home,
} from "lucide-react";
import { ServerPicker, useServers } from "@/components/server-picker";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { api, downloadUrlOrNull } from "@/lib/files-helpers";
import { toast } from "sonner";
import { NoServersState } from "@/components/empty-state";

export const Route = createFileRoute("/_authenticated/files")({
  component: FilesPage,
});

function fmt(n: number) {
  if (!n) return "-";
  const u = ["B", "KB", "MB", "GB"]; let i = 0;
  while (n >= 1024 && i < u.length - 1) { n /= 1024; i++; }
  return `${n.toFixed(1)} ${u[i]}`;
}

function FilesPage() {
  const { data: servers = [] } = useServers();
  const [serverId, setServerId] = useState<string | undefined>();
  const active = serverId ?? servers[0]?.id;
  const [path, setPath] = useState("/");
  const fileInput = useRef<HTMLInputElement>(null);

  const { data: entries = [], refetch, isFetching } = useQuery({
    queryKey: ["files", active, path],
    queryFn: () => api.listFiles(active!, path),
    enabled: !!active,
  });

  const segments = path.split("/").filter(Boolean);
  const join = (...p: string[]) => "/" + p.filter(Boolean).join("/");

  const upload = async (files: FileList | null) => {
    if (!files || !active) return;
    for (const f of Array.from(files)) {
      try { await api.uploadFile(active, path, f); toast.success(`Uploaded ${f.name}`); }
      catch (e: any) { toast.error(`${f.name}: ${e.message}`); }
    }
    refetch();
  };

  const mkdir = async () => {
    const name = prompt("New folder name");
    if (!name || !active) return;
    try { await api.mkdir(active, join(path, name)); refetch(); }
    catch (e: any) { toast.error(e.message); }
  };

  const rm = async (e: { name: string; path: string; type: string }) => {
    if (!active) return;
    if (!confirm(`Delete ${e.name}?`)) return;
    try { await api.rm(active, e.path); toast.success(`Deleted ${e.name}`); refetch(); }
    catch (err: any) { toast.error(err.message); }
  };

  return (
    <div className="space-y-6 p-4 md:p-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Files</h1>
          <p className="text-sm text-muted-foreground">Browse and transfer files over SFTP</p>
        </div>
        <ServerPicker value={active} onChange={(id) => setServerId(id)} />
      </div>

      {servers.length === 0 && <NoServersState />}

      {servers.length > 0 && (
      <Card>
        <CardContent className="p-0">
          <div className="flex flex-wrap items-center gap-2 border-b p-3">
            <Button size="icon" variant="ghost" onClick={() => setPath("/")}><Home className="h-4 w-4" /></Button>
            <div className="flex flex-1 flex-wrap items-center gap-1 text-sm">
              <button onClick={() => setPath("/")} className="hover:text-primary">/</button>
              {segments.map((s, i) => (
                <span key={i} className="flex items-center gap-1">
                  <ChevronRight className="h-3 w-3 text-muted-foreground" />
                  <button onClick={() => setPath("/" + segments.slice(0, i + 1).join("/"))} className="hover:text-primary">{s}</button>
                </span>
              ))}
            </div>
            <Input value={path} onChange={(e) => setPath(e.target.value)} className="w-64 font-mono text-xs" />
            <Button size="icon" variant="outline" onClick={() => refetch()} disabled={isFetching}>
              <RefreshCw className={`h-4 w-4 ${isFetching ? "animate-spin" : ""}`} />
            </Button>
            <Button size="sm" variant="outline" onClick={mkdir} disabled={!active}>
              <FolderPlus className="h-4 w-4 mr-1" /> New folder
            </Button>
            <Button size="sm" onClick={() => fileInput.current?.click()} disabled={!active}>
              <Upload className="h-4 w-4 mr-1" /> Upload
            </Button>
            <input ref={fileInput} type="file" multiple hidden onChange={(e) => upload(e.target.files)} />
          </div>

          <div className="divide-y">
            {path !== "/" && (
              <button
                onClick={() => setPath("/" + segments.slice(0, -1).join("/"))}
                className="flex w-full items-center gap-3 px-4 py-2 text-left hover:bg-accent"
              >
                <Folder className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">..</span>
              </button>
            )}
            {entries.map((e) => (
              <div key={e.path} className="flex items-center gap-3 px-4 py-2 hover:bg-accent/50 group">
                <button
                  className="flex flex-1 items-center gap-3 text-left"
                  onClick={() => e.type === "dir" && setPath(e.path)}
                >
                  {e.type === "dir"
                    ? <Folder className="h-4 w-4 text-primary" />
                    : <FileIcon className="h-4 w-4 text-muted-foreground" />}
                  <span className="flex-1 truncate text-sm">{e.name}</span>
                  <span className="hidden sm:inline text-xs text-muted-foreground w-20 text-right">{e.type === "file" ? fmt(e.size) : ""}</span>
                </button>
                {e.type === "file" && (
                  <a href={downloadUrlOrNull(active!, e.path) || "#"} target="_blank" rel="noreferrer">
                    <Button size="icon" variant="ghost"><Download className="h-4 w-4" /></Button>
                  </a>
                )}
                <Button size="icon" variant="ghost" onClick={() => rm(e)}><Trash2 className="h-4 w-4" /></Button>
              </div>
            ))}
            {entries.length === 0 && active && !isFetching && (
              <div className="p-8 text-center text-sm text-muted-foreground">Empty directory</div>
            )}
            {!active && (
              <div className="p-8 text-center text-sm text-muted-foreground">Select a server</div>
            )}
          </div>
        </CardContent>
      </Card>
      )}
    </div>
  );
}
