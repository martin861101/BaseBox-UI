// Client for talking to the self-hosted homelab-agent backend.
// The agent URL + auth token live in localStorage so the user can change them
// from the Settings tab without rebuilding.

const URL_KEY = "homelab.agentUrl";
const TOKEN_KEY = "homelab.token";

export function getAgentUrl(): string {
  if (typeof window === "undefined") return "";
  return (
    localStorage.getItem(URL_KEY) ||
    (import.meta.env.VITE_AGENT_URL as string | undefined) ||
    ""
  );
}

export function setAgentUrl(url: string) {
  localStorage.setItem(URL_KEY, url.replace(/\/+$/, ""));
}

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(t: string | null) {
  if (t) localStorage.setItem(TOKEN_KEY, t);
  else localStorage.removeItem(TOKEN_KEY);
}

export class AgentError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const base = getAgentUrl();
  if (!base) throw new AgentError(0, "Agent URL is not configured. Open Settings to set it.");
  const headers = new Headers(init.headers);
  const token = getToken();
  if (token) headers.set("Authorization", `Bearer ${token}`);
  if (init.body && !headers.has("Content-Type") && !(init.body instanceof FormData))
    headers.set("Content-Type", "application/json");
  let res: Response;
  try {
    res = await fetch(`${base}${path}`, { ...init, headers });
  } catch (e: any) {
    throw new AgentError(0, `Cannot reach agent at ${base}: ${e.message}`);
  }
  if (!res.ok) {
    let msg = res.statusText;
    try {
      const j = await res.json();
      msg = j.error || j.message || msg;
    } catch {}
    throw new AgentError(res.status, msg);
  }
  const ct = res.headers.get("content-type") || "";
  return ct.includes("application/json") ? ((await res.json()) as T) : ((await res.text()) as unknown as T);
}

export const api = {
  // auth
  login: (password: string) =>
    request<{ token: string }>("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ password }),
    }),
  me: () => request<{ ok: true }>("/api/auth/me"),
  // servers
  listServers: () => request<Server[]>("/api/servers"),
  createServer: (s: Omit<Server, "id">) =>
    request<Server>("/api/servers", { method: "POST", body: JSON.stringify(s) }),
  updateServer: (id: string, s: Partial<Server>) =>
    request<Server>(`/api/servers/${id}`, { method: "PUT", body: JSON.stringify(s) }),
  deleteServer: (id: string) => request<{ ok: true }>(`/api/servers/${id}`, { method: "DELETE" }),
  testServer: (id: string) => request<{ ok: boolean; message?: string }>(`/api/servers/${id}/test`, { method: "POST" }),
  // monitor
  monitor: (id: string) => request<MonitorSnapshot>(`/api/monitor/${id}`),
  containerAction: (id: string, container: string, action: "start" | "stop" | "restart") =>
    request(`/api/monitor/${id}/docker/${container}/${action}`, { method: "POST" }),
  pm2Action: (id: string, name: string, action: "start" | "stop" | "restart") =>
    request(`/api/monitor/${id}/pm2/${encodeURIComponent(name)}/${action}`, { method: "POST" }),
  // files
  listFiles: (id: string, path: string) =>
    request<FileEntry[]>(`/api/files/${id}/list?path=${encodeURIComponent(path)}`),
  downloadUrl: (id: string, path: string) =>
    `${getAgentUrl()}/api/files/${id}/download?path=${encodeURIComponent(path)}&token=${encodeURIComponent(getToken() || "")}`,
  uploadFile: (id: string, path: string, file: File) => {
    const fd = new FormData();
    fd.append("file", file);
    fd.append("path", path);
    return request(`/api/files/${id}/upload`, { method: "POST", body: fd });
  },
  mkdir: (id: string, path: string) =>
    request(`/api/files/${id}/mkdir`, { method: "POST", body: JSON.stringify({ path }) }),
  rm: (id: string, path: string) =>
    request(`/api/files/${id}/rm`, { method: "POST", body: JSON.stringify({ path }) }),
  // ai
  aiModels: () => request<{ models: string[] }>("/api/ai/models"),
  scanSkills: () => request<{ skills: any[] }>("/api/ai/scan-skills"),
  getAISettings: () => request<any>("/api/ai/settings"),
  saveAISettings: (settings: any) => request("/api/ai/settings", { method: "POST", body: JSON.stringify(settings) }),
  syncWhatsappConfig: (config: any) =>
    request("/api/whatsapp/config", { method: "POST", body: JSON.stringify(config) }),
  getWhatsappConfig: () =>
    request<{ configured: boolean; respondToAll?: boolean; provider?: string; model?: string }>("/api/whatsapp/config"),
};

// Streams stdout/stderr lines for an exec or chat completion via SSE.
export function streamSSE(
  path: string,
  body: any,
  onChunk: (data: string) => void,
  onDone?: (err?: Error) => void,
): () => void {
  const ctrl = new AbortController();
  const url = `${getAgentUrl()}${path}`;
  fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${getToken() || ""}`,
    },
    body: JSON.stringify(body),
    signal: ctrl.signal,
  })
    .then(async (res) => {
      if (!res.ok || !res.body) {
        onDone?.(new Error(`HTTP ${res.status}`));
        return;
      }
      const reader = res.body.getReader();
      const dec = new TextDecoder();
      let buf = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += dec.decode(value, { stream: true });
        const parts = buf.split("\n\n");
        buf = parts.pop() || "";
        for (const p of parts) {
          const line = p.split("\n").find((l) => l.startsWith("data:"));
          if (line) onChunk(line.slice(5).trimStart());
        }
      }
      onDone?.();
    })
    .catch((e) => onDone?.(e));
  return () => ctrl.abort();
}

export interface Server {
  id: string;
  name: string;
  host: string;
  port: number;
  username: string;
  authType: "password" | "key";
  password?: string;
  privateKey?: string;
  passphrase?: string;
}

export interface MonitorSnapshot {
  ok: boolean;
  error?: string;
  hardware?: {
    cpuPct: number;
    memUsed: number;
    memTotal: number;
    diskUsed: number;
    diskTotal: number;
    loadAvg: [number, number, number];
    uptimeSec: number;
    hostname: string;
    kernel: string;
  };
  containers?: { id: string; name: string; image: string; status: string; state: string }[];
  pm2?: { name: string; status: string; cpu: number; memory: number; uptime: number; restarts: number }[];
}

export interface FileEntry {
  name: string;
  path: string;
  type: "file" | "dir" | "link";
  size: number;
  modified: number;
}
