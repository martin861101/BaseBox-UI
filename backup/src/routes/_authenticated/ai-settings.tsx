import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect, useCallback } from "react";
import {
  Brain, Wrench, Sparkles, Database, Cpu, Eye, EyeOff, Save, Loader2, RefreshCw,
  ChevronDown, ChevronRight, Shield, AlertTriangle,
  Zap, HardDrive, MemoryStick, BookOpen, Plus, Trash2, Pencil, Bot, Copy,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Collapsible, CollapsibleContent, CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { toast } from "sonner";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  PROVIDERS, loadProviderConfigs, saveProviderConfigs,
  loadModelSettings, saveModelSettings, DEFAULT_MODEL_SETTINGS,
  QUANTIZATION_OPTIONS, KEEP_ALIVE_OPTIONS,
  loadTools, saveTools, DEFAULT_TOOLS,
  loadSkills, saveSkills, DEFAULT_SKILLS,
  loadMemoryConfig, saveMemoryConfig,
  loadEmbeddingConfig, saveEmbeddingConfig,
  EMBEDDING_MODELS,
  loadAgents, saveAgents, AGENT_ICONS, fetchOllamaModels,
  type ProviderId, type ProviderConfig, type ModelSettings, type ModelDef,
  type ToolDef, type SkillDef, type MemoryConfig, type EmbeddingConfig, type EmbeddingProviderId,
  type AgentDef,
} from "@/lib/ai-providers";

export const Route = createFileRoute("/_authenticated/ai-settings")({
  component: AISettingsPage,
});

function AISettingsPage() {
  const [tab, setTab] = useState("agents");
  const [configs, setConfigs] = useState(() => loadProviderConfigs());
  const [settings, setSettings] = useState(() => loadModelSettings());
  const [tools, setTools] = useState(() => loadTools());
  const [skills, setSkills] = useState(() => loadSkills());
  const [memory, setMemory] = useState(() => loadMemoryConfig());
  const [embedding, setEmbedding] = useState(() => loadEmbeddingConfig());
  const [agents, setAgents] = useState(() => loadAgents());
  const [editingAgent, setEditingAgent] = useState<AgentDef | null>(null);
  const [agentDialogOpen, setAgentDialogOpen] = useState(false);
  const [visibleKeys, setVisibleKeys] = useState<Set<string>>(new Set());
  const [openProviders, setOpenProviders] = useState<Set<string>>(new Set());
  const [ollamaModels, setOllamaModels] = useState<ModelDef[]>([]);
  const [ollamaLoading, setOllamaLoading] = useState(false);
  const [ollamaError, setOllamaError] = useState<string | null>(null);

  const detectOllamaModels = useCallback(async () => {
    setOllamaLoading(true);
    setOllamaError(null);
    try {
      const models = await fetchOllamaModels();
      setOllamaModels(models);
      if (models.length === 0) setOllamaError("No models found — is Ollama running?");
    } catch {
      setOllamaError("Could not reach Ollama");
    }
    setOllamaLoading(false);
  }, [configs.ollama.baseUrl]);

  // Auto-detect Ollama models on mount
  useEffect(() => { detectOllamaModels(); }, [detectOllamaModels]);

  /** Get models for a provider — for Ollama, use detected models */
  const getModelsForProvider = (providerId: ProviderId) => {
    if (providerId === "ollama" && ollamaModels.length > 0) return ollamaModels;
    return PROVIDERS.find((p) => p.id === providerId)?.models || [];
  };

  const toggleKey = (id: string) => {
    const next = new Set(visibleKeys);
    next.has(id) ? next.delete(id) : next.add(id);
    setVisibleKeys(next);
  };

  const toggleProvider = (id: string) => {
    const next = new Set(openProviders);
    next.has(id) ? next.delete(id) : next.add(id);
    setOpenProviders(next);
  };

  const updateProvider = (id: ProviderId, patch: Partial<ProviderConfig>) => {
    setConfigs((prev) => ({ ...prev, [id]: { ...prev[id], ...patch } }));
  };

  const saveAll = () => {
    saveProviderConfigs(configs);
    saveModelSettings(settings);
    saveTools(tools);
    saveSkills(skills);
    saveMemoryConfig(memory);
    saveEmbeddingConfig(embedding);
    saveAgents(agents);
    toast.success("AI settings saved");
  };

  const newAgent = (): AgentDef => ({
    id: `agent-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    name: "", description: "", icon: "🤖",
    providerId: "ollama", modelId: "llama3.3",
    systemPrompt: "",
    enabledToolIds: ["file_read", "file_list", "shell_exec"],
    enabledSkillIds: ["sysadmin"],
    temperature: 0.7, maxTokens: 4096,
    createdAt: Date.now(), updatedAt: Date.now(),
  });

  const openNewAgent = () => { setEditingAgent(newAgent()); setAgentDialogOpen(true); };
  const openEditAgent = (a: AgentDef) => { setEditingAgent({ ...a }); setAgentDialogOpen(true); };
  const saveAgent = () => {
    if (!editingAgent?.name.trim()) { toast.error("Agent name is required"); return; }
    const exists = agents.find((a) => a.id === editingAgent.id);
    if (exists) setAgents(agents.map((a) => a.id === editingAgent.id ? { ...editingAgent, updatedAt: Date.now() } : a));
    else setAgents([...agents, { ...editingAgent, createdAt: Date.now(), updatedAt: Date.now() }]);
    setAgentDialogOpen(false);
  };
  const deleteAgentById = (id: string) => { setAgents(agents.filter((a) => a.id !== id)); };
  const duplicateAgent = (a: AgentDef) => {
    const dup = { ...a, id: `agent-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, name: `${a.name} (copy)`, createdAt: Date.now(), updatedAt: Date.now() };
    setAgents([...agents, dup]);
  };

  return (
    <div className="space-y-6 p-4 md:p-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2">
            <Brain className="h-6 w-6 text-primary" /> AI Configuration
          </h1>
          <p className="text-sm text-muted-foreground">Providers, model tuning, tools, skills, memory & embeddings</p>
        </div>
        <Button onClick={saveAll}><Save className="mr-2 h-4 w-4" /> Save All</Button>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="grid w-full grid-cols-7">
          <TabsTrigger value="agents" className="gap-1"><Bot className="h-3.5 w-3.5" /><span className="hidden sm:inline">Agents</span></TabsTrigger>
          <TabsTrigger value="providers" className="gap-1"><Cpu className="h-3.5 w-3.5" /><span className="hidden sm:inline">Providers</span></TabsTrigger>
          <TabsTrigger value="model" className="gap-1"><Zap className="h-3.5 w-3.5" /><span className="hidden sm:inline">Model</span></TabsTrigger>
          <TabsTrigger value="tools" className="gap-1"><Wrench className="h-3.5 w-3.5" /><span className="hidden sm:inline">Tools</span></TabsTrigger>
          <TabsTrigger value="skills" className="gap-1"><Sparkles className="h-3.5 w-3.5" /><span className="hidden sm:inline">Skills</span></TabsTrigger>
          <TabsTrigger value="memory" className="gap-1"><Database className="h-3.5 w-3.5" /><span className="hidden sm:inline">Memory</span></TabsTrigger>
          <TabsTrigger value="embeddings" className="gap-1"><BookOpen className="h-3.5 w-3.5" /><span className="hidden sm:inline">Embed</span></TabsTrigger>
        </TabsList>

        {/* ── Providers ── */}
        <TabsContent value="providers" className="space-y-3 mt-4">
          {PROVIDERS.map((p) => {
            const cfg = configs[p.id];
            const isOpen = openProviders.has(p.id);
            return (
              <Collapsible key={p.id} open={isOpen} onOpenChange={() => toggleProvider(p.id)}>
                <Card className={cfg.enabled ? "border-primary/40" : ""}>
                  <CardHeader className="py-3">
                    <div className="flex items-center justify-between">
                      <CollapsibleTrigger asChild>
                        <button className="flex items-center gap-3 text-left">
                          {isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                          <span className="text-lg">{p.icon}</span>
                          <div>
                            <CardTitle className="text-sm">{p.label}</CardTitle>
                            <CardDescription className="text-xs">{p.description}</CardDescription>
                          </div>
                        </button>
                      </CollapsibleTrigger>
                      <div className="flex items-center gap-2">
                        <Badge variant={cfg.enabled ? "default" : "secondary"} className="text-[10px]">
                          {cfg.enabled ? "Active" : "Off"}
                        </Badge>
                        <Switch checked={cfg.enabled} onCheckedChange={(v) => updateProvider(p.id, { enabled: v })} />
                      </div>
                    </div>
                  </CardHeader>
                  <CollapsibleContent>
                    <CardContent className="space-y-3 pt-0 pb-4">
                      {p.authType === "apiKey" && (
                        <div className="space-y-1.5">
                          <Label className="text-xs">API Key</Label>
                          <div className="flex gap-2">
                            <Input
                              type={visibleKeys.has(p.id) ? "text" : "password"}
                              value={cfg.apiKey}
                              onChange={(e) => updateProvider(p.id, { apiKey: e.target.value })}
                              placeholder={`Enter ${p.label} API key`}
                              className="font-mono text-xs"
                            />
                            <Button size="icon" variant="ghost" onClick={() => toggleKey(p.id)}>
                              {visibleKeys.has(p.id) ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                            </Button>
                          </div>
                        </div>
                      )}
                      {p.baseUrlEditable && (
                        <div className="space-y-1.5">
                          <Label className="text-xs">Base URL</Label>
                          <Input
                            value={cfg.baseUrl}
                            onChange={(e) => updateProvider(p.id, { baseUrl: e.target.value })}
                            placeholder={p.defaultBaseUrl}
                            className="font-mono text-xs"
                          />
                        </div>
                      )}
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between">
                          <Label className="text-xs">Model</Label>
                          {p.id === "ollama" && (
                            <Button size="sm" variant="ghost" className="h-6 text-[10px] gap-1" onClick={detectOllamaModels} disabled={ollamaLoading}>
                              {ollamaLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />}
                              {ollamaLoading ? "Scanning..." : "Detect models"}
                            </Button>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                            <Select value={cfg.selectedModel} onValueChange={(v) => updateProvider(p.id, { selectedModel: v })}>
                                <SelectTrigger className="w-[200px]"><SelectValue placeholder="Select model" /></SelectTrigger>
                                <SelectContent>
                                {p.id === "ollama" ? ollamaModels.map((m: any) => (
                                    <SelectItem key={m.id} value={m.id}>{m.label}</SelectItem>
                                )) : p.models.map((m) => (
                                    <SelectItem key={m.id} value={m.id}>{m.label}</SelectItem>
                                ))}
                                </SelectContent>
                            </Select>
                            <Input
                                value={cfg.selectedModel}
                                onChange={(e) => updateProvider(p.id, { selectedModel: e.target.value })}
                                placeholder="Or type ID..."
                                className="font-mono text-xs max-w-[150px]"
                            />
                        </div>
                        {p.id === "ollama" && ollamaError && (
                            <p className="text-[10px] text-destructive">{ollamaError}</p>
                        )}
                      </div>
                    </CardContent>
                  </CollapsibleContent>
                </Card>
              </Collapsible>
            );
          })}
        </TabsContent>

        {/* ── Model Settings ── */}
        <TabsContent value="model" className="mt-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader><CardTitle className="text-sm">Generation Parameters</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <SliderField label="Temperature" value={settings.temperature} min={0} max={2} step={0.05}
                  onChange={(v) => setSettings({ ...settings, temperature: v })} hint="Higher = more creative" />
                <SliderField label="Top P" value={settings.topP} min={0} max={1} step={0.05}
                  onChange={(v) => setSettings({ ...settings, topP: v })} hint="Nucleus sampling" />
                <SliderField label="Top K" value={settings.topK} min={1} max={100} step={1}
                  onChange={(v) => setSettings({ ...settings, topK: v })} hint="Token candidates" />
                <SliderField label="Max Tokens" value={settings.maxTokens} min={256} max={32768} step={256}
                  onChange={(v) => setSettings({ ...settings, maxTokens: v })} hint="Max output length" />
                <SliderField label="Repeat Penalty" value={settings.repeatPenalty} min={1} max={2} step={0.05}
                  onChange={(v) => setSettings({ ...settings, repeatPenalty: v })} hint="Reduce repetition" />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm flex items-center gap-2"><HardDrive className="h-4 w-4" /> Local Model Settings</CardTitle>
                <CardDescription className="text-xs">Ollama-specific parameters</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-1.5">
                  <Label className="text-xs">Quantization</Label>
                  <Select value={settings.quantization} onValueChange={(v) => setSettings({ ...settings, quantization: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {QUANTIZATION_OPTIONS.map((q) => <SelectItem key={q.value} value={q.value}>{q.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Keep Alive</Label>
                  <Select value={settings.keepAlive} onValueChange={(v) => setSettings({ ...settings, keepAlive: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {KEEP_ALIVE_OPTIONS.map((k) => <SelectItem key={k.value} value={k.value}>{k.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <SliderField label="GPU Layers" value={settings.numGpu} min={-1} max={100} step={1}
                  onChange={(v) => setSettings({ ...settings, numGpu: v })} hint="-1 = auto" />
                <SliderField label="Context Length" value={settings.contextLength} min={512} max={131072} step={512}
                  onChange={(v) => setSettings({ ...settings, contextLength: v })} hint="Context window" />
                <SliderField label="Batch Size" value={settings.batchSize} min={64} max={4096} step={64}
                  onChange={(v) => setSettings({ ...settings, batchSize: v })} hint="Eval batch" />
                <div className="space-y-1.5">
                  <Label className="text-xs">Mirostat</Label>
                  <Select value={String(settings.mirostat)} onValueChange={(v) => setSettings({ ...settings, mirostat: Number(v) })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="0">Disabled</SelectItem>
                      <SelectItem value="1">Mirostat 1</SelectItem>
                      <SelectItem value="2">Mirostat 2</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            <Card className="md:col-span-2">
              <CardHeader><CardTitle className="text-sm">System Prompt</CardTitle></CardHeader>
              <CardContent className="space-y-2">
                <Textarea rows={4} value={settings.systemPrompt}
                  onChange={(e) => setSettings({ ...settings, systemPrompt: e.target.value })}
                  placeholder="Enter system prompt..." className="font-mono text-xs" />
                <Button variant="ghost" size="sm" onClick={() => setSettings({ ...settings, systemPrompt: DEFAULT_MODEL_SETTINGS.systemPrompt })}>
                  Reset to default
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ── Tools ── */}
        <TabsContent value="tools" className="mt-4 space-y-3">
          {(["filesystem", "execution", "system", "network"] as const).map((cat) => {
            const catTools = tools.filter((t) => t.category === cat);
            if (!catTools.length) return null;
            return (
              <Card key={cat}>
                <CardHeader className="py-3">
                  <CardTitle className="text-sm capitalize">{cat}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {catTools.map((t) => (
                    <div key={t.id} className="flex items-center justify-between rounded-md border p-3">
                      <div className="flex items-center gap-3">
                        <span className="text-lg">{t.icon}</span>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium">{t.label}</span>
                            <DangerBadge level={t.dangerLevel} />
                          </div>
                          <p className="text-xs text-muted-foreground">{t.description}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        {t.dangerLevel !== "safe" && (
                          <div className="flex items-center gap-1.5">
                            <Label className="text-[10px] text-muted-foreground">Confirm</Label>
                            <Switch checked={t.requiresConfirmation} onCheckedChange={(v) => {
                              setTools(tools.map((x) => x.id === t.id ? { ...x, requiresConfirmation: v } : x));
                            }} />
                          </div>
                        )}
                        <Switch checked={t.enabled} onCheckedChange={(v) => {
                          setTools(tools.map((x) => x.id === t.id ? { ...x, enabled: v } : x));
                        }} />
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            );
          })}
        </TabsContent>

        {/* ── Skills ── */}
        <TabsContent value="skills" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Assistant Skills</CardTitle>
              <CardDescription className="text-xs">Enable domain knowledge to inject into the system prompt</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {skills.map((s) => (
                <div key={s.id} className="flex items-center justify-between rounded-md border p-3">
                  <div className="flex items-center gap-3">
                    <span className="text-lg">{s.icon}</span>
                    <div>
                      <span className="text-sm font-medium">{s.label}</span>
                      <p className="text-xs text-muted-foreground">{s.description}</p>
                    </div>
                  </div>
                  <Switch checked={s.enabled} onCheckedChange={(v) => {
                    setSkills(skills.map((x) => x.id === s.id ? { ...x, enabled: v } : x));
                  }} />
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Memory ── */}
        <TabsContent value="memory" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-2"><MemoryStick className="h-4 w-4" /> Conversation Memory</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <Label>Enable Memory</Label>
                <Switch checked={memory.enabled} onCheckedChange={(v) => setMemory({ ...memory, enabled: v })} />
              </div>
              <div className="flex items-center justify-between">
                <Label>Persist Across Sessions</Label>
                <Switch checked={memory.persistAcrossSessions} onCheckedChange={(v) => setMemory({ ...memory, persistAcrossSessions: v })} />
              </div>
              <div className="flex items-center justify-between">
                <Label>Auto-Summarize Old Messages</Label>
                <Switch checked={memory.summarizeOldMessages} onCheckedChange={(v) => setMemory({ ...memory, summarizeOldMessages: v })} />
              </div>
              <SliderField label="Max History" value={memory.maxConversationHistory} min={10} max={200} step={5}
                onChange={(v) => setMemory({ ...memory, maxConversationHistory: v })} hint="messages retained" />
              {memory.summarizeOldMessages && (
                <SliderField label="Summary Threshold" value={memory.summaryThreshold} min={10} max={100} step={5}
                  onChange={(v) => setMemory({ ...memory, summaryThreshold: v })} hint="trigger at N messages" />
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Embeddings ── */}
        <TabsContent value="embeddings" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-2"><BookOpen className="h-4 w-4" /> Embeddings & RAG</CardTitle>
              <CardDescription className="text-xs">Configure vector embeddings for retrieval-augmented generation</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <Label>Enable Embeddings</Label>
                <Switch checked={embedding.enabled} onCheckedChange={(v) => setEmbedding({ ...embedding, enabled: v })} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Embedding Provider</Label>
                <Select value={embedding.provider} onValueChange={(v: EmbeddingProviderId) => {
                  const models = EMBEDDING_MODELS[v];
                  setEmbedding({ ...embedding, provider: v, model: models[0]?.id || "", dimensions: models[0]?.dimensions || 768 });
                }}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="openai">OpenAI</SelectItem>
                    <SelectItem value="ollama">Ollama (Local)</SelectItem>
                    <SelectItem value="huggingface">Hugging Face</SelectItem>
                    <SelectItem value="local">Local (built-in)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Embedding Model</Label>
                <Select value={embedding.model} onValueChange={(v) => {
                  const m = EMBEDDING_MODELS[embedding.provider].find((x) => x.id === v);
                  setEmbedding({ ...embedding, model: v, dimensions: m?.dimensions || embedding.dimensions });
                }}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {EMBEDDING_MODELS[embedding.provider]?.map((m) => (
                      <SelectItem key={m.id} value={m.id}>{m.label} ({m.dimensions}d)</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <SliderField label="Chunk Size" value={embedding.chunkSize} min={128} max={2048} step={64}
                onChange={(v) => setEmbedding({ ...embedding, chunkSize: v })} hint="tokens per chunk" />
              <SliderField label="Chunk Overlap" value={embedding.chunkOverlap} min={0} max={256} step={16}
                onChange={(v) => setEmbedding({ ...embedding, chunkOverlap: v })} hint="overlap between chunks" />
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Agents ── */}
        <TabsContent value="agents" className="mt-4 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">Create custom agents with specific models, tools & skills</p>
            <Button size="sm" onClick={openNewAgent}><Plus className="mr-1 h-4 w-4" /> New Agent</Button>
          </div>
          {agents.map((a) => {
            const prov = PROVIDERS.find((p) => p.id === a.providerId);
            const model = prov?.models.find((m) => m.id === a.modelId);
            return (
              <Card key={a.id}>
                <CardContent className="flex items-center justify-between p-4">
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="text-2xl">{a.icon}</span>
                    <div className="min-w-0">
                      <div className="font-medium text-sm">{a.name}</div>
                      <p className="text-xs text-muted-foreground truncate">{a.description || "No description"}</p>
                      <div className="flex flex-wrap gap-1 mt-1">
                        <Badge variant="outline" className="text-[10px]">{prov?.icon} {model?.label || a.modelId}</Badge>
                        <Badge variant="secondary" className="text-[10px]">{a.enabledToolIds.length} tools</Badge>
                        <Badge variant="secondary" className="text-[10px]">{a.enabledSkillIds.length} skills</Badge>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <Button size="icon" variant="ghost" onClick={() => duplicateAgent(a)} title="Duplicate"><Copy className="h-4 w-4" /></Button>
                    <Button size="icon" variant="ghost" onClick={() => openEditAgent(a)}><Pencil className="h-4 w-4" /></Button>
                    <Button size="icon" variant="ghost" onClick={() => deleteAgentById(a.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
          {agents.length === 0 && <p className="text-sm text-muted-foreground text-center py-8">No agents yet. Create one above.</p>}
        </TabsContent>
      </Tabs>

      {/* ── Agent Dialog ── */}
      <Dialog open={agentDialogOpen} onOpenChange={setAgentDialogOpen}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editingAgent && agents.find((a) => a.id === editingAgent.id) ? "Edit Agent" : "New Agent"}</DialogTitle></DialogHeader>
          {editingAgent && (
            <div className="grid gap-3">
              <div className="flex gap-2">
                <div className="space-y-1.5 flex-1">
                  <Label className="text-xs">Name</Label>
                  <Input value={editingAgent.name} onChange={(e) => setEditingAgent({ ...editingAgent, name: e.target.value })} placeholder="My Agent" />
                </div>
                <div className="space-y-1.5 w-20">
                  <Label className="text-xs">Icon</Label>
                  <Select value={editingAgent.icon} onValueChange={(v) => setEditingAgent({ ...editingAgent, icon: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{AGENT_ICONS.map((i) => <SelectItem key={i} value={i}>{i}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Description</Label>
                <Input value={editingAgent.description} onChange={(e) => setEditingAgent({ ...editingAgent, description: e.target.value })} placeholder="What does this agent do?" />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1.5">
                  <Label className="text-xs">Provider</Label>
                  <Select value={editingAgent.providerId} onValueChange={(v: ProviderId) => {
                    const p = PROVIDERS.find((x) => x.id === v);
                    setEditingAgent({ ...editingAgent, providerId: v, modelId: p?.models[0]?.id || "" });
                  }}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{PROVIDERS.map((p) => <SelectItem key={p.id} value={p.id}>{p.icon} {p.label}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5 flex-1">
                  <Label className="text-xs">Model</Label>
                  <div className="flex gap-2">
                    <Select value={editingAgent.modelId} onValueChange={(v) => setEditingAgent({ ...editingAgent, modelId: v })}>
                      <SelectTrigger className="w-[200px]"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {getModelsForProvider(editingAgent.providerId).map((m) => (
                          <SelectItem key={m.id} value={m.id}>{m.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Input
                      value={editingAgent.modelId}
                      onChange={(e) => setEditingAgent({ ...editingAgent, modelId: e.target.value })}
                      placeholder="Or type ID..."
                      className="font-mono text-xs max-w-[150px]"
                    />
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <SliderField label="Temperature" value={editingAgent.temperature} min={0} max={2} step={0.05} onChange={(v) => setEditingAgent({ ...editingAgent, temperature: v })} />
                <SliderField label="Max Tokens" value={editingAgent.maxTokens} min={256} max={32768} step={256} onChange={(v) => setEditingAgent({ ...editingAgent, maxTokens: v })} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">System Prompt</Label>
                <Textarea rows={3} value={editingAgent.systemPrompt} onChange={(e) => setEditingAgent({ ...editingAgent, systemPrompt: e.target.value })} className="font-mono text-xs" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Tools</Label>
                <div className="flex flex-wrap gap-1.5">
                  {DEFAULT_TOOLS.map((t) => {
                    const on = editingAgent.enabledToolIds.includes(t.id);
                    return (
                      <button key={t.id} onClick={() => {
                        const ids = on ? editingAgent.enabledToolIds.filter((x) => x !== t.id) : [...editingAgent.enabledToolIds, t.id];
                        setEditingAgent({ ...editingAgent, enabledToolIds: ids });
                      }} className={`rounded-md border px-2 py-1 text-xs transition-all ${on ? "border-primary bg-primary/10 text-primary" : "text-muted-foreground"}`}>
                        {t.icon} {t.label}
                      </button>
                    );
                  })}
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Skills</Label>
                <div className="flex flex-wrap gap-1.5">
                  {DEFAULT_SKILLS.map((s) => {
                    const on = editingAgent.enabledSkillIds.includes(s.id);
                    return (
                      <button key={s.id} onClick={() => {
                        const ids = on ? editingAgent.enabledSkillIds.filter((x) => x !== s.id) : [...editingAgent.enabledSkillIds, s.id];
                        setEditingAgent({ ...editingAgent, enabledSkillIds: ids });
                      }} className={`rounded-md border px-2 py-1 text-xs transition-all ${on ? "border-primary bg-primary/10 text-primary" : "text-muted-foreground"}`}>
                        {s.icon} {s.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="ghost" onClick={() => setAgentDialogOpen(false)}>Cancel</Button>
            <Button onClick={saveAgent}>Save Agent</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* ── Reusable slider with label ── */
function SliderField({ label, value, min, max, step, onChange, hint }: {
  label: string; value: number; min: number; max: number; step: number;
  onChange: (v: number) => void; hint?: string;
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <Label className="text-xs">{label}</Label>
        <span className="font-mono text-xs text-muted-foreground">{value}</span>
      </div>
      <Slider value={[value]} min={min} max={max} step={step} onValueChange={([v]) => onChange(v)} />
      {hint && <p className="text-[10px] text-muted-foreground">{hint}</p>}
    </div>
  );
}

/* ── Danger badge ── */
function DangerBadge({ level }: { level: string }) {
  if (level === "safe") return <Badge variant="outline" className="text-[9px] text-green-600 border-green-600/30"><Shield className="mr-0.5 h-2.5 w-2.5" />Safe</Badge>;
  if (level === "moderate") return <Badge variant="outline" className="text-[9px] text-yellow-600 border-yellow-600/30"><AlertTriangle className="mr-0.5 h-2.5 w-2.5" />Moderate</Badge>;
  return <Badge variant="outline" className="text-[9px] text-red-600 border-red-600/30"><Zap className="mr-0.5 h-2.5 w-2.5" />Dangerous</Badge>;
}
