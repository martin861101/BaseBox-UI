import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/agent-client";

export interface ServerHealth {
  ok: boolean;
  latencyMs: number | null;
  cpu?: number;
  error?: string;
}

/**
 * Polls /api/monitor/:id every 15s for a tiny health probe + latency.
 * Returns a ServerHealth keyed by server id.
 */
export function useServerHealth(serverIds: string[]) {
  const queries = serverIds.map((id) => ({ id }));
  // Single combined query so all servers refresh on the same tick.
  return useQuery<Record<string, ServerHealth>>({
    queryKey: ["server-health", queries.map((q) => q.id).join(",")],
    enabled: serverIds.length > 0,
    refetchInterval: 15_000,
    staleTime: 10_000,
    queryFn: async () => {
      const out: Record<string, ServerHealth> = {};
      await Promise.all(
        serverIds.map(async (id) => {
          const t0 = performance.now();
          try {
            const snap = await api.monitor(id);
            const latency = Math.round(performance.now() - t0);
            out[id] = {
              ok: !!snap.ok,
              latencyMs: latency,
              cpu: snap.hardware?.cpuPct,
              error: snap.error,
            };
          } catch (e: any) {
            out[id] = { ok: false, latencyMs: null, error: e?.message };
          }
        }),
      );
      return out;
    },
  });
}
