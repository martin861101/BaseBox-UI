import { Router } from "express";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export const aiRouter = Router();

const OLLAMA = process.env.OLLAMA_URL || "http://localhost:11434";

// Robust path resolution: Env Var > Agent Root > Project Root fallback
const resolvePath = (envVar, agentRelative, projectRelative) => {
  if (process.env[envVar]) return process.env[envVar];
  const agentPath = path.resolve(__dirname, agentRelative);
  const projectPath = path.resolve(__dirname, projectRelative);
  if (fs.existsSync(agentPath)) return agentPath;
  if (fs.existsSync(projectPath)) return projectPath;
  return agentPath;
};

const DOCS_DIR = resolvePath("DOCS_DIR", "../docs", "../../docs");
const DATA_DIR = resolvePath("DATA_DIR", "../data", "../../data");
const SETTINGS_PATH = path.join(DATA_DIR, "ai-settings.json");

// Ensure directories exist
[DOCS_DIR, DATA_DIR].forEach((dir) => {
  try {
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  } catch (e) {
    console.error(`Failed to create directory ${dir}:`, e.message);
  }
});

// ── Settings ──────────────────────────────────────────────────────────────────

aiRouter.get("/settings", (_req, res) => {
  console.log(`[AI] GET settings from ${SETTINGS_PATH}`);
  try {
    if (!fs.existsSync(SETTINGS_PATH)) return res.json({});
    const raw = fs.readFileSync(SETTINGS_PATH, "utf-8");
    res.json(JSON.parse(raw));
  } catch (e) {
    console.error("[AI] Get settings error:", e.message);
    res.status(500).json({ error: e.message });
  }
});

aiRouter.post("/settings", (req, res) => {
  console.log("I AM HERE!");
  console.log(`[AI] POST settings to ${SETTINGS_PATH}`);
  try {
    const payload = req.body;
    if (!payload || typeof payload !== "object")
      return res.status(400).json({ error: "Invalid settings payload" });

    // Ensure the data directory exists before writing
    fs.mkdirSync(path.dirname(SETTINGS_PATH), { recursive: true });
    fs.writeFileSync(SETTINGS_PATH, JSON.stringify(payload, null, 2), "utf-8");
    res.json({ ok: true });
  } catch (e) {
    console.error("[AI] Save settings error:", e.message);
    res.status(500).json({ error: e.message });
  }
});

// ── Models ────────────────────────────────────────────────────────────────────

aiRouter.get("/models", async (_req, res) => {
  try {
    const r = await fetch(`${OLLAMA}/api/tags`);
    if (!r.ok) throw new Error(`Ollama responded ${r.status}`);
    const j = await r.json();
    res.json({ models: (j.models || []).map((m) => m.name) });
  } catch (e) {
    res.status(500).json({ error: `Cannot reach Ollama at ${OLLAMA}: ${e.message}` });
  }
});

// ── Skill Scanner ─────────────────────────────────────────────────────────────

aiRouter.get("/scan-skills", (_req, res) => {
  if (!fs.existsSync(DOCS_DIR)) return res.json({ skills: [] });
  try {
    const files = fs.readdirSync(DOCS_DIR).filter((f) => f.endsWith(".md"));
    const skills = [];

    for (const file of files) {
      const content = fs.readFileSync(path.join(DOCS_DIR, file), "utf-8");
      const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
      if (match) {
        const yaml = match[1];
        const skill = { id: file.replace(".md", "").toLowerCase() };
        const nameMatch = yaml.match(/name:\s*(.*)/);
        const descMatch = yaml.match(/description:\s*(?:"([\s\S]*?)"|(.*))/);
        const iconMatch = yaml.match(/icon:\s*(.*)/);
        if (nameMatch) {
          skill.label = nameMatch[1].trim();
          skill.description = (descMatch ? descMatch[1] || descMatch[2] : "").trim();
          skill.icon = iconMatch ? iconMatch[1].trim() : "📜";
          skill.enabled = false;
          skill.systemPromptAddition = content.replace(match[0], "").trim();
          skills.push(skill);
        }
      }
    }
    res.json({ skills });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ── Chat (SSE streaming) ──────────────────────────────────────────────────────

aiRouter.post("/chat", async (req, res) => {
  const { provider, baseUrl, apiKey, model, messages, temperature, maxTokens } = req.body || {};
  if (!model || !messages) return res.status(400).json({ error: "model and messages required" });

  res.set({
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    Connection: "keep-alive",
    "X-Accel-Buffering": "no",
  });

  let url = "";
  let headers = { "Content-Type": "application/json" };
  let body = {};

  try {
    if (provider === "ollama") {
      url = `${OLLAMA}/api/chat`;
      body = { model, messages, stream: true, options: { temperature, num_predict: maxTokens } };
    } else if (provider === "anthropic") {
      url = `${(baseUrl || "").replace(/\/+$/, "")}/messages`;
      headers["x-api-key"] = apiKey;
      headers["anthropic-version"] = "2023-06-01";
      const sys = messages.find((m) => m.role === "system")?.content || "";
      const msgs = messages.filter((m) => m.role !== "system");
      body = {
        model,
        system: sys,
        messages: msgs,
        stream: true,
        max_tokens: maxTokens || 4096,
        temperature,
      };
    } else if (provider === "gemini") {
      url = `${(baseUrl || "").replace(/\/+$/, "")}/models/${model}:streamGenerateContent?key=${apiKey}&alt=sse`;
      const sys = messages.find((m) => m.role === "system")?.content;
      const contents = messages
        .filter((m) => m.role !== "system")
        .map((m) => ({ role: m.role === "user" ? "user" : "model", parts: [{ text: m.content }] }));
      body = { contents, generationConfig: { temperature, maxOutputTokens: maxTokens } };
      if (sys) body.systemInstruction = { parts: [{ text: sys }] };
    } else {
      // OpenAI-compatible (OpenAI, OpenRouter, Mistral, HuggingFace, etc.)
      url = `${(baseUrl || "").replace(/\/+$/, "")}/chat/completions`;
      headers["Authorization"] = `Bearer ${apiKey}`;
      body = { model, messages, stream: true, temperature, max_tokens: maxTokens };
    }

    const upstream = await fetch(url, { method: "POST", headers, body: JSON.stringify(body) });

    if (!upstream.ok || !upstream.body) {
      const errText = await upstream.text().catch(() => "");
      res.write(
        `data: ${JSON.stringify({ error: `Provider error ${upstream.status}: ${errText}` })}\n\n`,
      );
      return res.end();
    }

    const reader = upstream.body.getReader();
    const dec = new TextDecoder();
    let buf = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buf += dec.decode(value, { stream: true });
      const lines = buf.split("\n");
      buf = lines.pop() || "";
      for (const line of lines) {
        const t = line.trim();
        if (!t) continue;
        if (t.startsWith("data:")) {
          res.write(`${t}\n\n`);
        } else if (t.startsWith("{") && provider === "ollama") {
          res.write(`data: ${t}\n\n`);
        }
      }
    }
    res.end();
  } catch (e) {
    res.write(`data: ${JSON.stringify({ error: `Error: ${e.message}` })}\n\n`);
    res.end();
  }
});
