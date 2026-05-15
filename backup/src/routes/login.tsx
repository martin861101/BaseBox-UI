import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Server, Loader2 } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getAgentUrl, setAgentUrl } from "@/lib/agent-client";
import { accents, useTheme } from "@/lib/theme";

export const Route = createFileRoute("/login")({
  component: LoginPage,
});

function LoginPage() {
  const { login, isAuthenticated, loading } = useAuth();
  const nav = useNavigate();
  const [agent, setAgent] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setAgent(getAgentUrl());
  }, []);

  useEffect(() => {
    if (!loading && isAuthenticated) nav({ to: "/monitoring" });
  }, [isAuthenticated, loading, nav]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);
    setBusy(true);
    try {
      if (agent) setAgentUrl(agent);
      await login(password);
      nav({ to: "/monitoring" });
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  };

  const { mode, accentId } = useTheme();
  const logo = accents.find((a) => a.id === accentId)?.logo || "/img/mad_logo.png";

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md border-border/60">
        <CardHeader className="space-y-4 text-center">
          <div className="mx-auto flex h-40 w-40 items-center justify-center">
            <img src={logo} alt="Mad Scientist" className="h-36 w-36" />
          </div>
          <CardTitle className="text-2xl">BaseBox UI</CardTitle>
          <CardDescription>Sign in to manage your servers</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={submit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="agent">Agent URL</Label>
              <Input
                id="agent"
                placeholder="http://homelab.local:8788"
                value={agent}
                onChange={(e) => setAgent(e.target.value)}
                autoComplete="url"
              />
              <p className="text-xs text-muted-foreground">
                URL of your self-hosted homelab-agent service.
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="pw">Password</Label>
              <Input
                id="pw"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                required
              />
            </div>
            {err && <p className="text-sm text-destructive">{err}</p>}
            <p className="rounded-md border border-border/60 bg-muted/40 p-2 text-xs text-muted-foreground">
              Demo preview: leave Agent URL blank and use password{" "}
              <code className="font-mono text-foreground">admin</code> to explore the UI without the agent.
            </p>
            <Button type="submit" className="w-full" disabled={busy}>
              {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Sign in
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
