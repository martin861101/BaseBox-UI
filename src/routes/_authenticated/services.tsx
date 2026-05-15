import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import {
  Layers, FileText, ArrowRight, ShieldCheck, Cpu, ArrowLeft, FileEdit,
  Sparkles, Copy, Check, Download, Play, RefreshCw, Bot, FileDown,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { MarkdownMessage } from "@/components/markdown-message";
import { executeResumeClone, DEFAULT_RESUME_TEMPLATE } from "@/lib/resume-clone";
import { downloadResumePDF, downloadResumeDOCX } from "@/lib/resume-pdf";
import {
  loadAgents, getActiveAgentId, PROVIDERS, loadProviderConfigs,
} from "@/lib/ai-providers";

export const Route = createFileRoute("/_authenticated/services")({
  component: ServicesPage,
});

type ServiceView = "hub" | "documents" | "resume-clone";

function ServicesPage() {
  const [view, setView] = useState<ServiceView>("hub");

  switch (view) {
    case "hub":
      return <ServicesHub onNavigate={setView} />;
    case "documents":
      return <DocumentServices onNavigate={setView} />;
    case "resume-clone":
      return <ResumeCloneEngine onNavigate={setView} />;
    default:
      return <ServicesHub onNavigate={setView} />;
  }
}

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   Services Hub — Grid of available AI service categories
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */

function ServicesHub({ onNavigate }: { onNavigate: (v: ServiceView) => void }) {
  const services = [
    {
      id: "documents" as ServiceView,
      title: "Document Services",
      description: "Automate, optimize, and clone context-aware business and professional documents using your self-hosted LLM.",
      icon: FileText,
      gradient: "from-blue-500 to-indigo-600",
      badge: "Active",
      available: true,
    },
    {
      id: "hub" as ServiceView,
      title: "Agentic Workflows",
      description: "Deploy multi-agent autonomous teams for advanced data mining and automated lead execution.",
      icon: Cpu,
      gradient: "from-purple-500 to-pink-600",
      badge: "Coming Soon",
      available: false,
    },
    {
      id: "hub" as ServiceView,
      title: "Logic & Compliance Auditing",
      description: "Run real-time high-stakes business documentation through automated policy verification engines.",
      icon: ShieldCheck,
      gradient: "from-emerald-500 to-teal-600",
      badge: "Coming Soon",
      available: false,
    },
  ];

  return (
    <div className="space-y-8 p-4 md:p-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2">
          <Layers className="h-6 w-6 text-primary" /> AI Services Core
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Select an enterprise-grade AI execution layer to handle automated data mapping and generation.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {services.map((service, idx) => (
          <Card
            key={idx}
            className={`group relative transition-all duration-300 ${
              service.available
                ? "hover:shadow-lg hover:border-primary/40 cursor-pointer"
                : "opacity-60 cursor-default"
            }`}
            onClick={() => service.available && onNavigate(service.id)}
          >
            <CardContent className="flex flex-col justify-between p-6 h-full">
              <div>
                <div className={`inline-flex p-3 rounded-xl bg-gradient-to-br ${service.gradient} text-white shadow-sm`}>
                  <service.icon className="h-6 w-6" />
                </div>
                <div className="mt-4 flex items-center justify-between">
                  <h3 className="text-base font-semibold group-hover:text-primary transition-colors">
                    {service.title}
                  </h3>
                  <Badge variant={service.available ? "default" : "secondary"} className="text-[10px]">
                    {service.badge}
                  </Badge>
                </div>
                <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
                  {service.description}
                </p>
              </div>
              <div className="mt-6 flex items-center text-sm font-medium text-primary">
                {service.available ? (
                  <>
                    Initialize Workspace
                    <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
                  </>
                ) : (
                  <span className="text-muted-foreground">Feature Locked</span>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   Document Services — Sub-category picker
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */

function DocumentServices({ onNavigate }: { onNavigate: (v: ServiceView) => void }) {
  return (
    <div className="space-y-6 p-4 md:p-6">
      <div className="flex items-center gap-3">
        <Button variant="outline" size="icon" onClick={() => onNavigate("hub")}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Document Execution Engines</h1>
          <p className="text-sm text-muted-foreground">Fine-tune foundational copy and professional records dynamically.</p>
        </div>
      </div>

      <Separator />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card
          className="group cursor-pointer transition-all duration-200 hover:shadow-lg hover:border-primary/40"
          onClick={() => onNavigate("resume-clone")}
        >
          <CardContent className="flex flex-col justify-between p-6 h-full">
            <div className="space-y-4">
              <div className="p-3 bg-primary/10 text-primary rounded-xl w-fit">
                <FileEdit className="h-6 w-6" />
              </div>
              <div>
                <h2 className="text-lg font-semibold group-hover:text-primary transition-colors">
                  Resume Clone Engine
                </h2>
                <p className="mt-1 text-sm text-muted-foreground leading-relaxed">
                  Inject target job descriptions into your core background matrix. Generates highly aligned resumes 
                  tracking exact job titles, duties, and tooling constraints without introducing false history.
                </p>
              </div>
            </div>
            <div className="mt-6 flex items-center text-sm font-medium text-primary">
              Launch Engine <Sparkles className="ml-1.5 h-4 w-4 text-amber-500 animate-pulse" />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   Resume Clone Engine — The core workspace
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */

function ResumeCloneEngine({ onNavigate }: { onNavigate: (v: ServiceView) => void }) {
  const [baseTemplate, setBaseTemplate] = useState(DEFAULT_RESUME_TEMPLATE);
  const [jobSpec, setJobSpec] = useState("");
  const [output, setOutput] = useState("");
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [stopFn, setStopFn] = useState<(() => void) | null>(null);

  // Get active agent info for display
  const agents = loadAgents();
  const activeId = getActiveAgentId();
  const agent = agents.find((a) => a.id === activeId) || agents[0];
  const provConfigs = loadProviderConfigs();
  const provider = agent ? PROVIDERS.find((p) => p.id === agent.providerId) : null;

  const handleGenerate = () => {
    if (!jobSpec.trim()) return;
    if (!agent) {
      toast.error("No AI agent configured. Go to AI Settings → Agents first.");
      return;
    }

    setLoading(true);
    setOutput("");

    const abort = executeResumeClone(
      baseTemplate,
      jobSpec,
      (chunk) => {
        setOutput((prev) => prev + chunk);
      },
      (err) => {
        setLoading(false);
        setStopFn(null);
        if (err) {
          toast.error(err.message);
          if (!output) setOutput(`Error: ${err.message}`);
        } else {
          toast.success("Resume generated successfully");
        }
      },
    );

    setStopFn(() => abort);
  };

  const handleStop = () => {
    stopFn?.();
    setLoading(false);
    setStopFn(null);
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(output);
    setCopied(true);
    toast.success("Copied to clipboard");
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const blob = new Blob([output], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "Cloned_Resume.md";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success("Resume downloaded");
  };

  return (
    <div className="space-y-6 p-4 md:p-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-3">
          <Button variant="outline" size="icon" onClick={() => onNavigate("documents")}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Resume Clone Engine</h1>
            <p className="text-sm text-muted-foreground">
              Target exact technical specs while maintaining core experience integrity.
            </p>
          </div>
        </div>
        {agent && (
          <Badge variant="outline" className="text-xs gap-1.5 py-1">
            <Bot className="h-3 w-3" />
            {agent.icon} {agent.name} · {provider?.icon} {agent.modelId}
          </Badge>
        )}
      </div>

      <Separator />

      {/* Two-column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
        {/* ── Left: Input Panel ── */}
        <div className="flex flex-col gap-4">
          {/* Base Resume Template */}
          <Card className="flex-1 flex flex-col">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">1. Base Resume Template (Markdown)</CardTitle>
              <CardDescription className="text-xs">Your authentic career history — the engine will rephrase, not fabricate.</CardDescription>
            </CardHeader>
            <CardContent className="flex-1 pt-0">
              <Textarea
                className="h-full min-h-[250px] font-mono text-xs resize-y"
                value={baseTemplate}
                onChange={(e) => setBaseTemplate(e.target.value)}
                placeholder="Paste your base resume in Markdown format..."
              />
            </CardContent>
          </Card>

          {/* Job Specification */}
          <Card className="flex-1 flex flex-col">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">2. Target Job Specification</CardTitle>
              <CardDescription className="text-xs">Paste the full job title and requirements. The engine will align your resume to match.</CardDescription>
            </CardHeader>
            <CardContent className="flex-1 pt-0">
              <Textarea
                className="h-full min-h-[200px] text-sm resize-y"
                value={jobSpec}
                onChange={(e) => setJobSpec(e.target.value)}
                placeholder="Paste the full job title and specification detail block here..."
              />
            </CardContent>
          </Card>

          {/* Generate Button */}
          {loading ? (
            <Button
              variant="destructive"
              className="w-full py-6 text-base gap-2"
              onClick={handleStop}
            >
              <RefreshCw className="h-5 w-5 animate-spin" />
              Stop Generation
            </Button>
          ) : (
            <Button
              className="w-full py-6 text-base gap-2"
              disabled={!jobSpec.trim()}
              onClick={handleGenerate}
            >
              <Play className="h-5 w-5 fill-current" />
              Generate Cloned Resume
            </Button>
          )}
        </div>

        {/* ── Right: Output Panel ── */}
        <Card className="flex flex-col min-h-[600px]">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm">Engine Output Preview</CardTitle>
              {output && (
                <div className="flex items-center gap-1">
                  <Button size="icon" variant="ghost" className="h-7 w-7" onClick={handleCopy} title="Copy to Clipboard">
                    {copied ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
                  </Button>
                  <Button size="icon" variant="ghost" className="h-7 w-7" onClick={handleDownload} title="Download .md">
                    <Download className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 gap-1 px-2 text-xs"
                    onClick={() => downloadResumePDF(output)}
                    title="Download styled PDF"
                  >
                    <FileDown className="h-3.5 w-3.5" />
                    PDF
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 gap-1 px-2 text-xs"
                    onClick={() => downloadResumeDOCX(output)}
                    title="Download styled Word (.docx)"
                  >
                    <FileText className="h-3.5 w-3.5" />
                    Word
                  </Button>
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent className="flex-1 overflow-auto pt-0">
            {output ? (
              <div className="rounded-lg border bg-muted/30 p-4 text-sm leading-relaxed overflow-auto max-h-[calc(100vh-18rem)]">
                <MarkdownMessage content={output} onRun={() => {}} />
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground py-12">
                <FileEdit className="h-10 w-10 opacity-30 mb-3" />
                <p className="text-sm">No resume generated yet.</p>
                <p className="text-xs mt-1">
                  Configure your base template, add target job requirements, and run the execution loop.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
