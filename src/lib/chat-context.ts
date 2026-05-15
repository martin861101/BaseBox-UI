// Tracks "context" the assistant can inject: last server selected and
// last command output from the Actions tab.

const SERVER_KEY = "homelab.lastServer";
const OUTPUT_KEY = "homelab.lastOutput";
const HISTORY_PREFIX = "homelab.chat.";

export function setLastServer(id: string) { localStorage.setItem(SERVER_KEY, id); }
export function getLastServer(): string | null { return typeof window === "undefined" ? null : localStorage.getItem(SERVER_KEY); }

export function setLastOutput(cmd: string, output: string) {
  try {
    localStorage.setItem(OUTPUT_KEY, JSON.stringify({ cmd, output: output.slice(-4000), at: Date.now() }));
  } catch {}
}
export function getLastOutput(): { cmd: string; output: string; at: number } | null {
  if (typeof window === "undefined") return null;
  try { const v = localStorage.getItem(OUTPUT_KEY); return v ? JSON.parse(v) : null; } catch { return null; }
}

export function loadChat(serverKey: string): any[] | null {
  if (typeof window === "undefined") return null;
  try { const v = localStorage.getItem(HISTORY_PREFIX + serverKey); return v ? JSON.parse(v) : null; } catch { return null; }
}
export function saveChat(serverKey: string, msgs: any[]) {
  try { localStorage.setItem(HISTORY_PREFIX + serverKey, JSON.stringify(msgs.slice(-50))); } catch {}
}
export function clearChat(serverKey: string) {
  try { localStorage.removeItem(HISTORY_PREFIX + serverKey); } catch {}
}
