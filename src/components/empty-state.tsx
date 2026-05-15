import { Link } from "@tanstack/react-router";
import { ServerCog, Plus, Sparkles } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export function EmptyState({
  title,
  description,
  icon: Icon = ServerCog,
  action,
  variant = "default",
}: {
  title: string;
  description?: string;
  icon?: any;
  action?: { label: string; to?: string; onClick?: () => void };
  variant?: "default" | "error";
}) {
  return (
    <Card className={variant === "error" ? "border-destructive/40" : ""}>
      <CardContent className="flex flex-col items-center gap-4 p-10 text-center">
        <div className={`flex h-12 w-12 items-center justify-center rounded-full ${variant === "error" ? "bg-destructive/10 text-destructive" : "bg-primary/10 text-primary"}`}>
          <Icon className="h-6 w-6" />
        </div>
        <div className="space-y-1">
          <h3 className="text-base font-semibold">{title}</h3>
          {description && <p className="mx-auto max-w-md text-sm text-muted-foreground">{description}</p>}
        </div>
        {action && (
          action.to
            ? <Button asChild><Link to={action.to}><Plus className="mr-1 h-4 w-4" />{action.label}</Link></Button>
            : <Button onClick={action.onClick}>{action.label}</Button>
        )}
      </CardContent>
    </Card>
  );
}

export function NoServersState() {
  return (
    <EmptyState
      icon={Sparkles}
      title="No servers configured yet"
      description="Add your first homelab server in Settings to start monitoring containers, services, and hardware. Make sure the homelab-agent is running and reachable."
      action={{ label: "Add a server", to: "/settings" }}
    />
  );
}
