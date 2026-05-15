// thin re-export so files page can import a download URL helper alongside api
export { api } from "./agent-client";
import { api } from "./agent-client";
export function downloadUrlOrNull(serverId: string, path: string) {
  try { return api.downloadUrl ? api.downloadUrl(serverId, path) : null; } catch { return null; }
}
