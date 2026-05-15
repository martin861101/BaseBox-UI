import { Router } from "express";

export const aiRouter = Router();

const OLLAMA = process.env.OLLAMA_URL || "http://localhost:11434";

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
      body = { model, system: sys, messages: msgs, stream: true, max_tokens: maxTokens || 4096, temperature };
    } else if (provider === "gemini") {
      url = `${(baseUrl || "").replace(/\/+$/, "")}/models/${model}:streamGenerateContent?key=${apiKey}&alt=sse`;
      const sys = messages.find((m) => m.role === "system")?.content;
      const contents = messages.filter((m) => m.role !== "system").map((m) => ({
        role: m.role === "user" ? "user" : "model",
        parts: [{ text: m.content }],
      }));
      body = { contents, generationConfig: { temperature, maxOutputTokens: maxTokens } };
      if (sys) body.systemInstruction = { parts: [{ text: sys }] };
    } else {
      // OpenAI compatible (OpenAI, OpenRouter, Mistral, HuggingFace)
      url = `${(baseUrl || "").replace(/\/+$/, "")}/chat/completions`;
      headers["Authorization"] = `Bearer ${apiKey}`;
      body = { model, messages, stream: true, temperature, max_tokens: maxTokens };
    }

    const upstream = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
    });

    if (!upstream.ok || !upstream.body) {
      const errText = await upstream.text().catch(() => "");
      res.write(`data: ${JSON.stringify({ error: `Provider error ${upstream.status}: ${errText}` })}\n\n`);
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
          // Standard SSE
          res.write(`${t}\n\n`);
        } else if (t.startsWith("{") && provider === "ollama") {
          // Ollama JSONL to SSE
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
