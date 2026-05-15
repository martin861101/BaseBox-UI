import { useQuery } from "@tanstack/react-query";
import { api, type Server } from "@/lib/agent-client";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export function useServers() {
  return useQuery({ queryKey: ["servers"], queryFn: api.listServers });
}

export function ServerPicker({
  value,
  onChange,
}: {
  value: string | undefined;
  onChange: (id: string, server: Server) => void;
}) {
  const { data: servers = [], isLoading } = useServers();
  return (
    <Select
      value={value}
      onValueChange={(v) => {
        const s = servers.find((x) => x.id === v);
        if (s) onChange(v, s);
      }}
    >
      <SelectTrigger className="w-[260px]">
        <SelectValue placeholder={isLoading ? "Loading..." : "Select server"} />
      </SelectTrigger>
      <SelectContent>
        {servers.map((s) => (
          <SelectItem key={s.id} value={s.id}>
            <span className="font-medium">{s.name}</span>
            <span className="ml-2 text-xs text-muted-foreground">
              {s.username}@{s.host}
            </span>
          </SelectItem>
        ))}
        {servers.length === 0 && !isLoading && (
          <div className="px-2 py-1.5 text-xs text-muted-foreground">
            No servers — add one in Settings
          </div>
        )}
      </SelectContent>
    </Select>
  );
}
