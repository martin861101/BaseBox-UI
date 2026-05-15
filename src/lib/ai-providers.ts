// AI Provider Configuration Store
// Manages cloud/local model providers, model settings, tools, skills, memory & embeddings.
// Everything persists to localStorage.

// ─── Provider Definitions ────────────────────────────────────────────────────

export type ProviderId =
  | "openai"
  | "gemini"
  | "claude"
  | "ollama"
  | "openrouter"
  | "mistral"
  | "huggingface";

export interface ProviderDef {
  id: ProviderId;
  label: string;
  icon: string; // emoji shorthand
  description: string;
  baseUrlEditable: boolean;
  defaultBaseUrl: string;
  authType: "apiKey" | "none";
  models: ModelDef[];
}

export interface ModelDef {
  id: string;
  label: string;
  contextWindow: number;
  supportsTools: boolean;
  supportsVision: boolean;
  local?: boolean;
}

export const PROVIDERS: ProviderDef[] = [
  {
    id: "openai",
    label: "OpenAI",
    icon: "🟢",
    description: "GPT-5.5, o4-mini, o3 & more",
    baseUrlEditable: true,
    defaultBaseUrl: "https://api.openai.com/v1",
    authType: "apiKey",
    models: [
      {
        id: "gpt-5.5",
        label: "GPT-5.5",
        contextWindow: 1048576,
        supportsTools: true,
        supportsVision: true,
      },
      {
        id: "o5-mini",
        label: "o5-mini",
        contextWindow: 200000,
        supportsTools: true,
        supportsVision: true,
      },
      { id: "o4", label: "o4", contextWindow: 200000, supportsTools: true, supportsVision: true },
      {
        id: "o3-mini",
        label: "o3-mini",
        contextWindow: 200000,
        supportsTools: true,
        supportsVision: true,
      },
    ],
  },
  {
    id: "gemini",
    label: "Google Gemini",
    icon: "💎",
    description: "Gemini 3.1 Pro, Flash & Live",
    baseUrlEditable: true,
    defaultBaseUrl: "https://generativelanguage.googleapis.com/v1beta",
    authType: "apiKey",
    models: [
      {
        id: "gemini-3.1-pro-preview",
        label: "Gemini 3.1 Pro",
        contextWindow: 2097152,
        supportsTools: true,
        supportsVision: true,
      },
      {
        id: "gemini-3-flash-preview",
        label: "Gemini 3 Flash",
        contextWindow: 1048576,
        supportsTools: true,
        supportsVision: true,
      },
      {
        id: "gemini-3.1-flash-lite",
        label: "Gemini 3.1 Flash Lite",
        contextWindow: 1048576,
        supportsTools: true,
        supportsVision: true,
      },
      {
        id: "gemini-3.1-flash-live",
        label: "Gemini 3.1 Live",
        contextWindow: 1048576,
        supportsTools: true,
        supportsVision: true,
      },
    ],
  },
  {
    id: "claude",
    label: "Anthropic Claude",
    icon: "🟠",
    description: "Claude Opus 4.7, Sonnet 4.6 & more",
    baseUrlEditable: true,
    defaultBaseUrl: "https://api.anthropic.com/v1",
    authType: "apiKey",
    models: [
      {
        id: "claude-opus-4-7",
        label: "Claude Opus 4.7",
        contextWindow: 200000,
        supportsTools: true,
        supportsVision: true,
      },
      {
        id: "claude-sonnet-4-6",
        label: "Claude Sonnet 4.6",
        contextWindow: 1000000,
        supportsTools: true,
        supportsVision: true,
      },
      {
        id: "claude-haiku-4-0",
        label: "Claude Haiku 4.0",
        contextWindow: 200000,
        supportsTools: true,
        supportsVision: false,
      },
    ],
  },
  {
    id: "ollama",
    label: "Ollama (Local)",
    icon: "🦙",
    description: "Local models — Llama, Mistral, Phi, Qwen, etc.",
    baseUrlEditable: true,
    defaultBaseUrl: "http://localhost:11434",
    authType: "none",
    models: [
      {
        id: "llama3.3",
        label: "Llama 3.3 70B",
        contextWindow: 131072,
        supportsTools: true,
        supportsVision: false,
        local: true,
      },
      {
        id: "llama3.2",
        label: "Llama 3.2 3B",
        contextWindow: 131072,
        supportsTools: true,
        supportsVision: false,
        local: true,
      },
      {
        id: "mistral",
        label: "Mistral 7B",
        contextWindow: 32768,
        supportsTools: false,
        supportsVision: false,
        local: true,
      },
      {
        id: "phi4",
        label: "Phi-4 14B",
        contextWindow: 16384,
        supportsTools: false,
        supportsVision: false,
        local: true,
      },
      {
        id: "qwen2.5-coder",
        label: "Qwen 2.5 Coder",
        contextWindow: 131072,
        supportsTools: true,
        supportsVision: false,
        local: true,
      },
      {
        id: "deepseek-r1",
        label: "DeepSeek R1",
        contextWindow: 131072,
        supportsTools: false,
        supportsVision: false,
        local: true,
      },
      {
        id: "gemma2",
        label: "Gemma 2 9B",
        contextWindow: 8192,
        supportsTools: false,
        supportsVision: false,
        local: true,
      },
      {
        id: "codellama",
        label: "CodeLlama 7B",
        contextWindow: 16384,
        supportsTools: false,
        supportsVision: false,
        local: true,
      },
    ],
  },
  {
    id: "openrouter",
    label: "OpenRouter",
    icon: "🔀",
    description: "Aggregate — route to any model",
    baseUrlEditable: true,
    defaultBaseUrl: "https://openrouter.ai/api/v1",
    authType: "apiKey",
    models: [
      {
        id: "openai/gpt-5.5-thinking",
        label: "GPT-5.5 Thinking (via OR)",
        contextWindow: 1000000,
        supportsTools: true,
        supportsVision: true,
      },
      {
        id: "anthropic/claude-4.7-opus",
        label: "Claude Opus 4.7 (via OR)",
        contextWindow: 200000,
        supportsTools: true,
        supportsVision: true,
      },
      {
        id: "google/gemini-3.1-pro",
        label: "Gemini 3.1 Pro (via OR)",
        contextWindow: 2000000,
        supportsTools: true,
        supportsVision: true,
      },
      {
        id: "meta-llama/llama-4-70b",
        label: "Llama 4 70B (via OR)",
        contextWindow: 131072,
        supportsTools: true,
        supportsVision: false,
      },
      {
        id: "deepseek/deepseek-v4",
        label: "DeepSeek V4 (via OR)",
        contextWindow: 128000,
        supportsTools: false,
        supportsVision: false,
      },
    ],
  },
  {
    id: "mistral",
    label: "Mistral AI",
    icon: "🌀",
    description: "Mistral Large, Medium, Codestral",
    baseUrlEditable: true,
    defaultBaseUrl: "https://api.mistral.ai/v1",
    authType: "apiKey",
    models: [
      {
        id: "mistral-large-3",
        label: "Mistral Large 3",
        contextWindow: 131072,
        supportsTools: true,
        supportsVision: true,
      },
      {
        id: "mistral-pixtral-2",
        label: "Pixtral 2",
        contextWindow: 131072,
        supportsTools: true,
        supportsVision: true,
      },
      {
        id: "codestral-2",
        label: "Codestral 2",
        contextWindow: 65536,
        supportsTools: true,
        supportsVision: false,
      },
      {
        id: "mistral-small-3",
        label: "Mistral Small 3",
        contextWindow: 32768,
        supportsTools: true,
        supportsVision: false,
      },
    ],
  },
  {
    id: "huggingface",
    label: "Hugging Face",
    icon: "🤗",
    description: "Inference API — any HF model",
    baseUrlEditable: true,
    defaultBaseUrl: "https://api-inference.huggingface.co",
    authType: "apiKey",
    models: [
      {
        id: "deepseek-ai/DeepSeek-V4",
        label: "DeepSeek V4",
        contextWindow: 131072,
        supportsTools: false,
        supportsVision: false,
      },
      {
        id: "meta-llama/Llama-4-70B-Instruct",
        label: "Llama 4 70B Instruct",
        contextWindow: 131072,
        supportsTools: false,
        supportsVision: false,
      },
      {
        id: "Qwen/Qwen-3-72B-Instruct",
        label: "Qwen 3 72B Instruct",
        contextWindow: 131072,
        supportsTools: false,
        supportsVision: false,
      },
    ],
  },
];

// ─── Provider Config (persisted per-provider) ────────────────────────────────

export interface ProviderConfig {
  enabled: boolean;
  apiKey: string;
  baseUrl: string;
  selectedModel: string;
}

const CONFIG_KEY = "homelab.ai.providers";

export function loadProviderConfigs(): Record<ProviderId, ProviderConfig> {
  if (typeof window === "undefined") return getDefaults();
  try {
    const raw = localStorage.getItem(CONFIG_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      // Merge with defaults to pick up new providers
      const defaults = getDefaults();
      for (const key of Object.keys(defaults) as ProviderId[]) {
        if (!parsed[key]) parsed[key] = defaults[key];
      }
      return parsed;
    }
  } catch {}
  return getDefaults();
}

export function saveProviderConfigs(cfg: Record<ProviderId, ProviderConfig>) {
  localStorage.setItem(CONFIG_KEY, JSON.stringify(cfg));
}

function getDefaults(): Record<ProviderId, ProviderConfig> {
  const result: any = {};
  for (const p of PROVIDERS) {
    result[p.id] = {
      enabled: p.id === "ollama",
      apiKey: "",
      baseUrl: p.defaultBaseUrl,
      selectedModel: p.models[0]?.id || "",
    };
  }
  return result;
}

// ─── Model Settings (quantization, temperature, etc.) ────────────────────────

export interface ModelSettings {
  provider: string; // Add this
  model: string; // Add this
  temperature: number;
  topP: number;
  topK: number;
  maxTokens: number;
  repeatPenalty: number;
  systemPrompt: string;
  // Local model settings (Ollama)
  quantization: string; // "Q4_0" | "Q4_K_M" | "Q5_K_M" | "Q8_0" | "FP16" | "FP32"
  numGpu: number;
  numThreads: number;
  contextLength: number;
  batchSize: number;
  seed: number;
  mirostat: number; // 0 | 1 | 2
  mirostatTau: number;
  mirostatEta: number;
  keepAlive: string; // "5m" | "30m" | "1h" | "forever"
}

const SETTINGS_KEY = "homelab.ai.modelSettings";

export const DEFAULT_MODEL_SETTINGS: ModelSettings = {
  provider: "ollama",
  model: "llama3.3",
  temperature: 0.7,
  topP: 0.9,
  topK: 40,
  maxTokens: 4096,
  repeatPenalty: 1.1,
  systemPrompt:
    "You are a helpful homelab sysadmin assistant. Give concise, command-oriented answers. When suggesting shell commands, put them in fenced ```bash code blocks so the user can run them with one click.",
  quantization: "Q4_K_M",
  numGpu: -1,
  numThreads: 0,
  contextLength: 4096,
  batchSize: 512,
  seed: -1,
  mirostat: 0,
  mirostatTau: 5.0,
  mirostatEta: 0.1,
  keepAlive: "5m",
};

export function loadModelSettings(): ModelSettings {
  if (typeof window === "undefined") return { ...DEFAULT_MODEL_SETTINGS };
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (raw) return { ...DEFAULT_MODEL_SETTINGS, ...JSON.parse(raw) };
  } catch {}
  return { ...DEFAULT_MODEL_SETTINGS };
}

export function saveModelSettings(s: ModelSettings) {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(s));
}

export const QUANTIZATION_OPTIONS = [
  { value: "Q4_0", label: "Q4_0 — Smallest, fastest" },
  { value: "Q4_K_M", label: "Q4_K_M — Good balance (recommended)" },
  { value: "Q5_K_M", label: "Q5_K_M — Higher quality" },
  { value: "Q6_K", label: "Q6_K — Near full precision" },
  { value: "Q8_0", label: "Q8_0 — High quality" },
  { value: "FP16", label: "FP16 — Half precision" },
  { value: "FP32", label: "FP32 — Full precision (slowest)" },
];

export const KEEP_ALIVE_OPTIONS = [
  { value: "0", label: "Unload immediately" },
  { value: "5m", label: "5 minutes" },
  { value: "30m", label: "30 minutes" },
  { value: "1h", label: "1 hour" },
  { value: "-1", label: "Keep forever" },
];

// ─── Tools Configuration ─────────────────────────────────────────────────────

export interface ToolDef {
  id: string;
  label: string;
  description: string;
  icon: string;
  category: "filesystem" | "execution" | "network" | "system";
  enabled: boolean;
  dangerLevel: "safe" | "moderate" | "dangerous";
  requiresConfirmation: boolean;
}

const TOOLS_KEY = "homelab.ai.tools";

export const DEFAULT_TOOLS: ToolDef[] = [
  {
    id: "file_read",
    label: "File Read",
    description: "Read contents of files on the connected server",
    icon: "📄",
    category: "filesystem",
    enabled: true,
    dangerLevel: "safe",
    requiresConfirmation: false,
  },
  {
    id: "file_write",
    label: "File Write",
    description: "Create or overwrite files on the server",
    icon: "✏️",
    category: "filesystem",
    enabled: true,
    dangerLevel: "moderate",
    requiresConfirmation: true,
  },
  {
    id: "file_delete",
    label: "File Delete",
    description: "Delete files and directories",
    icon: "🗑️",
    category: "filesystem",
    enabled: false,
    dangerLevel: "dangerous",
    requiresConfirmation: true,
  },
  {
    id: "file_list",
    label: "File List",
    description: "List directory contents with metadata",
    icon: "📁",
    category: "filesystem",
    enabled: true,
    dangerLevel: "safe",
    requiresConfirmation: false,
  },
  {
    id: "file_search",
    label: "File Search",
    description: "Search for files by name or content (grep/find)",
    icon: "🔍",
    category: "filesystem",
    enabled: true,
    dangerLevel: "safe",
    requiresConfirmation: false,
  },
  {
    id: "shell_exec",
    label: "Shell Execute",
    description: "Execute shell commands on the server",
    icon: "⚡",
    category: "execution",
    enabled: true,
    dangerLevel: "dangerous",
    requiresConfirmation: true,
  },
  {
    id: "script_run",
    label: "Script Run",
    description: "Execute multi-line scripts (bash, python, etc.)",
    icon: "📜",
    category: "execution",
    enabled: true,
    dangerLevel: "dangerous",
    requiresConfirmation: true,
  },
  {
    id: "process_list",
    label: "Process List",
    description: "List running processes and system info",
    icon: "📊",
    category: "system",
    enabled: true,
    dangerLevel: "safe",
    requiresConfirmation: false,
  },
  {
    id: "docker_manage",
    label: "Docker Manage",
    description: "List, start, stop, inspect containers",
    icon: "🐳",
    category: "system",
    enabled: true,
    dangerLevel: "moderate",
    requiresConfirmation: true,
  },
  {
    id: "http_fetch",
    label: "HTTP Fetch",
    description: "Make HTTP requests from the server (curl)",
    icon: "🌐",
    category: "network",
    enabled: true,
    dangerLevel: "safe",
    requiresConfirmation: false,
  },
  {
    id: "websearch",
    label: "Web Search (Tavily)",
    description: "Search the web for up-to-date information",
    icon: "🌐",
    category: "network",
    enabled: true,
    dangerLevel: "safe",
    requiresConfirmation: false,
  },
  {
    id: "playwright",
    label: "Browser Automation",
    description: "Write and execute Playwright scripts for web scraping",
    icon: "🎭",
    category: "execution",
    enabled: true,
    dangerLevel: "moderate",
    requiresConfirmation: true,
  },
];

export function loadTools(): ToolDef[] {
  if (typeof window === "undefined") return [...DEFAULT_TOOLS];
  try {
    const raw = localStorage.getItem(TOOLS_KEY);
    if (raw) {
      const saved = JSON.parse(raw) as ToolDef[];
      const savedMap = new Map(saved.map((t) => [t.id, t]));

      const merged = DEFAULT_TOOLS.map((t) => ({
        ...t,
        enabled: savedMap.get(t.id)?.enabled ?? t.enabled,
        requiresConfirmation: savedMap.get(t.id)?.requiresConfirmation ?? t.requiresConfirmation,
      }));

      // Add custom tools created by the user
      for (const t of saved) {
        if (!DEFAULT_TOOLS.find((dt) => dt.id === t.id)) {
          merged.push(t);
        }
      }
      return merged;
    }
  } catch {}
  return [...DEFAULT_TOOLS];
}

export function saveTools(tools: ToolDef[]) {
  localStorage.setItem(TOOLS_KEY, JSON.stringify(tools));
}

// ─── Skills Configuration ────────────────────────────────────────────────────

export interface SkillDef {
  id: string;
  label: string;
  description: string;
  icon: string;
  enabled: boolean;
  systemPromptAddition: string;
}

const SKILLS_KEY = "homelab.ai.skills";

export const DEFAULT_SKILLS: SkillDef[] = [
  {
    id: "sysadmin",
    label: "Sysadmin",
    description: "Linux server administration, package management, service configuration",
    icon: "🖥️",
    enabled: true,
    systemPromptAddition:
      "You are an expert Linux sysadmin. Help with package management, service configuration, user management, and system hardening.",
  },
  {
    id: "docker",
    label: "Docker & Containers",
    description: "Docker, Podman, Docker Compose, container orchestration",
    icon: "🐳",
    enabled: true,
    systemPromptAddition:
      "You are a Docker and containerization expert. Help with Dockerfiles, docker-compose, container networking, volumes, and troubleshooting.",
  },
  {
    id: "networking",
    label: "Networking",
    description: "DNS, firewalls, VPNs, reverse proxies, load balancing",
    icon: "🌐",
    enabled: true,
    systemPromptAddition:
      "You are a networking expert. Help with DNS, iptables/nftables, VPNs (WireGuard/OpenVPN), Nginx/Traefik/Caddy reverse proxy, and network troubleshooting.",
  },
  {
    id: "scripting",
    label: "Scripting & Automation",
    description: "Bash, Python, cron, systemd, CI/CD pipelines",
    icon: "📜",
    enabled: true,
    systemPromptAddition:
      "You are a scripting and automation expert. Help write bash scripts, Python scripts, cron jobs, systemd units, and CI/CD pipeline configurations.",
  },
  {
    id: "security",
    label: "Security & Hardening",
    description: "SSH hardening, firewall rules, fail2ban, SSL/TLS, security auditing",
    icon: "🔒",
    enabled: false,
    systemPromptAddition:
      "You are a security expert. Help with SSH hardening, firewall configuration, fail2ban, SSL/TLS certificates, and security auditing.",
  },
  {
    id: "monitoring",
    label: "Monitoring & Logging",
    description: "Prometheus, Grafana, log aggregation, alerting",
    icon: "📈",
    enabled: false,
    systemPromptAddition:
      "You are a monitoring expert. Help set up Prometheus, Grafana, log aggregation (Loki, ELK), and alerting systems.",
  },
  {
    id: "database",
    label: "Database Management",
    description: "PostgreSQL, MySQL, Redis, MongoDB, backups",
    icon: "🗄️",
    enabled: false,
    systemPromptAddition:
      "You are a database expert. Help with PostgreSQL, MySQL, Redis, MongoDB administration, query optimization, and backup strategies.",
  },
  {
    id: "code_review",
    label: "Code Review",
    description: "Review code, suggest improvements, find bugs",
    icon: "🔎",
    enabled: false,
    systemPromptAddition:
      "You are a code review expert. Analyze code for bugs, security issues, performance problems, and suggest improvements.",
  },
  {
    id: "docx",
    label: "Word Documents (DOCX)",
    description:
      "Create, read, edit, or manipulate Word documents (.docx files) using docx-js or XML manipulation.",
    icon: "📝",
    enabled: true,
    systemPromptAddition:
      "You are a Word document expert. Use docx-js for creating new documents and XML manipulation for editing existing ones. Always set page size explicitly to US Letter (12240x15840 DXA) unless asked otherwise. Use Arial as default font. Never use unicode bullets; use numbering config with LevelFormat.BULLET. For tables, always specify dual widths (table width and column widths in DXA).",
  },
];

export function loadSkills(): SkillDef[] {
  if (typeof window === "undefined") return [...DEFAULT_SKILLS];
  try {
    const raw = localStorage.getItem(SKILLS_KEY);
    if (raw) {
      const saved = JSON.parse(raw) as SkillDef[];
      const savedMap = new Map(saved.map((s) => [s.id, s]));

      const merged = DEFAULT_SKILLS.map((s) => ({
        ...s,
        enabled: savedMap.get(s.id)?.enabled ?? s.enabled,
      }));

      for (const s of saved) {
        if (!DEFAULT_SKILLS.find((ds) => ds.id === s.id)) {
          merged.push(s);
        }
      }
      return merged;
    }
  } catch {}
  return [...DEFAULT_SKILLS];
}

export function saveSkills(skills: SkillDef[]) {
  localStorage.setItem(SKILLS_KEY, JSON.stringify(skills));
}

// ─── Memory Configuration ────────────────────────────────────────────────────

export interface MemoryConfig {
  enabled: boolean;
  maxConversationHistory: number; // Number of messages to retain in context
  persistAcrossSessions: boolean;
  summarizeOldMessages: boolean;
  summaryThreshold: number; // Summarize when messages exceed this count
}

const MEMORY_KEY = "homelab.ai.memory";

export const DEFAULT_MEMORY: MemoryConfig = {
  enabled: true,
  maxConversationHistory: 50,
  persistAcrossSessions: true,
  summarizeOldMessages: false,
  summaryThreshold: 30,
};

export function loadMemoryConfig(): MemoryConfig {
  if (typeof window === "undefined") return { ...DEFAULT_MEMORY };
  try {
    const raw = localStorage.getItem(MEMORY_KEY);
    if (raw) return { ...DEFAULT_MEMORY, ...JSON.parse(raw) };
  } catch {}
  return { ...DEFAULT_MEMORY };
}

export function saveMemoryConfig(cfg: MemoryConfig) {
  localStorage.setItem(MEMORY_KEY, JSON.stringify(cfg));
}

// ─── Embedding Configuration ─────────────────────────────────────────────────

export type EmbeddingProviderId = "openai" | "ollama" | "huggingface" | "local";

export interface EmbeddingConfig {
  provider: EmbeddingProviderId;
  model: string;
  dimensions: number;
  chunkSize: number;
  chunkOverlap: number;
  enabled: boolean;
}

const EMBEDDING_KEY = "homelab.ai.embedding";

export const EMBEDDING_MODELS: Record<
  EmbeddingProviderId,
  { id: string; label: string; dimensions: number }[]
> = {
  openai: [
    { id: "text-embedding-3-large", label: "text-embedding-3-large", dimensions: 3072 },
    { id: "text-embedding-3-small", label: "text-embedding-3-small", dimensions: 1536 },
    { id: "text-embedding-ada-002", label: "text-embedding-ada-002", dimensions: 1536 },
  ],
  ollama: [
    { id: "nomic-embed-text", label: "nomic-embed-text", dimensions: 768 },
    { id: "mxbai-embed-large", label: "mxbai-embed-large", dimensions: 1024 },
    { id: "all-minilm", label: "all-minilm", dimensions: 384 },
    { id: "snowflake-arctic-embed", label: "snowflake-arctic-embed", dimensions: 1024 },
  ],
  huggingface: [
    { id: "BAAI/bge-large-en-v1.5", label: "BGE Large EN", dimensions: 1024 },
    { id: "sentence-transformers/all-MiniLM-L6-v2", label: "all-MiniLM-L6-v2", dimensions: 384 },
  ],
  local: [{ id: "all-MiniLM-L6-v2", label: "all-MiniLM-L6-v2 (local)", dimensions: 384 }],
};

export const DEFAULT_EMBEDDING: EmbeddingConfig = {
  provider: "ollama",
  model: "nomic-embed-text",
  dimensions: 768,
  chunkSize: 512,
  chunkOverlap: 50,
  enabled: false,
};

export function loadEmbeddingConfig(): EmbeddingConfig {
  if (typeof window === "undefined") return { ...DEFAULT_EMBEDDING };
  try {
    const raw = localStorage.getItem(EMBEDDING_KEY);
    if (raw) return { ...DEFAULT_EMBEDDING, ...JSON.parse(raw) };
  } catch {}
  return { ...DEFAULT_EMBEDDING };
}

export function saveEmbeddingConfig(cfg: EmbeddingConfig) {
  localStorage.setItem(EMBEDDING_KEY, JSON.stringify(cfg));
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Get the currently-active provider + model for quick access */
export function getActiveProviderAndModel(): {
  provider: ProviderDef;
  model: ModelDef;
  config: ProviderConfig;
} | null {
  const configs = loadProviderConfigs();
  for (const p of PROVIDERS) {
    const cfg = configs[p.id];
    if (cfg?.enabled) {
      const model = p.models.find((m) => m.id === cfg.selectedModel) || p.models[0];
      if (model) return { provider: p, model, config: cfg };
    }
  }
  return null;
}

/** Build the system prompt from base + enabled skills and tools */
export function buildSystemPrompt(basePrompt: string): string {
  let prompt = basePrompt;

  const enabledTools = getEnabledToolDefs();
  if (enabledTools.find((t) => t.id === "websearch")) {
    prompt += `\n\n[TOOL: WEB SEARCH] You have access to a web search tool (Tavily). To search the web, output exactly this format:\n\`\`\`tavily\nyour search query here\n\`\`\`\nDo not include any other text inside the block.`;
  }
  if (enabledTools.find((t) => t.id === "playwright")) {
    prompt += `\n\n[TOOL: PLAYWRIGHT] You have access to browser automation via Playwright. To scrape a website or perform an action, output a Node.js script like this:\n\`\`\`playwright\n// The script runs with top-level await. 'chromium', 'firefox', and 'webkit' are globally available.\nconst browser = await chromium.launch();\nconst page = await browser.newPage();\nawait page.goto('https://example.com');\nconst title = await page.title();\nconsole.log(title);\nawait browser.close();\n\`\`\`\nThe script will be executed and the console output returned to you.`;
  }

  const skills = loadSkills().filter((s) => s.enabled);
  if (skills.length > 0) {
    const additions = skills.map((s) => s.systemPromptAddition).join("\n\n");
    prompt += `\n\n--- Active Skills ---\n${additions}`;
  }

  return prompt;
}

/** Build the tool definitions for injection into chat messages */
export function getEnabledToolDefs(): ToolDef[] {
  return loadTools().filter((t) => t.enabled);
}

// ─── Ollama Auto-Detection ───────────────────────────────────────────────────

import { api } from "./agent-client";

export interface OllamaModelInfo {
  name: string;
  model: string;
  size: number;
  digest: string;
  modified_at: string;
  details?: {
    format?: string;
    family?: string;
    parameter_size?: string;
    quantization_level?: string;
  };
}

/** Fetch installed models from a running Ollama instance via backend proxy */
export async function fetchOllamaModels(_baseUrl?: string): Promise<ModelDef[]> {
  try {
    const res = await api.aiModels();
    if (!res.models?.length) return [];
    return res.models.map((name) => {
      return {
        id: name,
        label: name,
        contextWindow: 131072, // default
        supportsTools: false,
        supportsVision: false,
        local: true,
      } as ModelDef;
    });
  } catch {
    return [];
  }
}

// ─── Agent Definitions ───────────────────────────────────────────────────────

export interface AgentDef {
  id: string;
  name: string;
  description: string;
  icon: string;
  providerId: ProviderId;
  modelId: string;
  systemPrompt: string;
  enabledToolIds: string[];
  enabledSkillIds: string[];
  temperature: number;
  maxTokens: number;
  createdAt: number;
  updatedAt: number;
}

const AGENTS_KEY = "homelab.ai.agents";
const ACTIVE_AGENT_KEY = "homelab.ai.activeAgent";

const DEFAULT_AGENTS: AgentDef[] = [
  {
    id: "default-sysadmin",
    name: "Sysadmin",
    description: "General-purpose homelab assistant",
    icon: "🖥️",
    providerId: "ollama",
    modelId: "llama3.3",
    systemPrompt:
      "You are a helpful homelab sysadmin assistant. Give concise, command-oriented answers. When suggesting shell commands, put them in fenced ```bash code blocks.",
    enabledToolIds: ["file_read", "file_list", "file_search", "shell_exec", "process_list"],
    enabledSkillIds: ["sysadmin", "docker", "networking", "scripting"],
    temperature: 0.7,
    maxTokens: 4096,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  },
  {
    id: "default-docker",
    name: "Docker Expert",
    description: "Container management specialist",
    icon: "🐳",
    providerId: "ollama",
    modelId: "llama3.3",
    systemPrompt:
      "You are a Docker and container orchestration expert. Help manage containers, compose files, networking, and troubleshoot container issues.",
    enabledToolIds: ["file_read", "file_write", "shell_exec", "docker_manage", "process_list"],
    enabledSkillIds: ["docker", "networking"],
    temperature: 0.5,
    maxTokens: 4096,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  },
  {
    id: "default-coder",
    name: "Code Assistant",
    description: "Coding, scripts, and automation",
    icon: "💻",
    providerId: "ollama",
    modelId: "qwen2.5-coder",
    systemPrompt:
      "You are an expert programmer. Help write, review, and debug code. Focus on clean, well-documented solutions.",
    enabledToolIds: ["file_read", "file_write", "file_search", "script_run"],
    enabledSkillIds: ["scripting", "code_review"],
    temperature: 0.3,
    maxTokens: 8192,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  },
];

export function loadAgents(): AgentDef[] {
  if (typeof window === "undefined") return [...DEFAULT_AGENTS];
  try {
    const raw = localStorage.getItem(AGENTS_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return [...DEFAULT_AGENTS];
}

export function saveAgents(agents: AgentDef[]) {
  localStorage.setItem(AGENTS_KEY, JSON.stringify(agents));
}

export function createAgent(agent: Omit<AgentDef, "id" | "createdAt" | "updatedAt">): AgentDef {
  const agents = loadAgents();
  const newAgent: AgentDef = {
    ...agent,
    id: `agent-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
  agents.push(newAgent);
  saveAgents(agents);
  return newAgent;
}

export function updateAgent(id: string, patch: Partial<AgentDef>) {
  const agents = loadAgents().map((a) =>
    a.id === id ? { ...a, ...patch, updatedAt: Date.now() } : a,
  );
  saveAgents(agents);
}

export function deleteAgent(id: string) {
  saveAgents(loadAgents().filter((a) => a.id !== id));
  if (getActiveAgentId() === id) setActiveAgentId(null);
}

export function getActiveAgentId(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(ACTIVE_AGENT_KEY);
}

export function setActiveAgentId(id: string | null) {
  if (id) localStorage.setItem(ACTIVE_AGENT_KEY, id);
  else localStorage.removeItem(ACTIVE_AGENT_KEY);
}

export function getActiveAgent(): AgentDef | null {
  const id = getActiveAgentId();
  if (!id) return null;
  return loadAgents().find((a) => a.id === id) || null;
}

export const AGENT_ICONS = [
  "🖥️",
  "🐳",
  "💻",
  "🤖",
  "🧠",
  "🔒",
  "📈",
  "🗄️",
  "🌐",
  "📜",
  "⚡",
  "🔧",
  "🎯",
  "🧪",
  "🔬",
  "🛡️",
  "📡",
  "🏗️",
  "🧰",
  "🚀",
];
