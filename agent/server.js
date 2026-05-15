import express from "express";
import cors from "cors";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

// Simple manual .env loader
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const envPath = path.join(__dirname, ".env");
if (fs.existsSync(envPath)) {
  const env = fs.readFileSync(envPath, "utf-8");
  env.split("\n").forEach((line) => {
    const [key, ...val] = line.split("=");
    if (key && val.length) process.env[key.trim()] = val.join("=").trim();
  });
}

import { authRouter, requireAuth } from "./routes/auth.js";
import { serversRouter } from "./routes/servers.js";
import { monitorRouter } from "./routes/monitor.js";
import { actionsRouter } from "./routes/actions.js";
import { filesRouter } from "./routes/files.js";
import { aiRouter } from "./routes/ai.js";
import { initWhatsApp } from "./whatsapp.js";
import { db, encrypt } from "./lib/db.js";

const app = express();

app.use((req, res, next) => {
  console.log(`[REQ] ${req.method} ${req.url}`);
  next();
});

// Handle Private Network Access preflights
app.use((req, res, next) => {
  if (req.headers["access-control-request-private-network"]) {
    res.setHeader("Access-Control-Allow-Private-Network", "true");
  }
  next();
});

app.use(
  cors({
    origin: true,
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: [
      "Content-Type",
      "Authorization",
      "X-Requested-With",
      "Access-Control-Allow-Private-Network",
    ],
    exposedHeaders: ["Content-Disposition"],
  }),
);
app.use(express.json({ limit: "10mb" }));

app.get("/health", (_, res) => res.json({ ok: true }));

// WhatsApp Config Route
app.post("/api/whatsapp/config", requireAuth, (req, res) => {
  try {
    const config = req.body;
    const enc = encrypt(JSON.stringify(config)).toString("hex");
    db.prepare(
      "INSERT INTO kv (key, value) VALUES ('whatsapp_config', ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value",
    ).run(enc);
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.get("/api/whatsapp/config", requireAuth, (req, res) => {
  try {
    const row = db.prepare("SELECT value FROM kv WHERE key = 'whatsapp_config'").get();
    if (!row) return res.json({ configured: false });
    const config = JSON.parse(decrypt(Buffer.from(row.value, "hex")));
    // Return only non-sensitive fields
    res.json({
      configured: true,
      respondToAll: config.respondToAll || false,
      provider: config.provider,
      model: config.model,
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.use("/api/auth", authRouter);
app.use(requireAuth);
app.use("/api/servers", serversRouter);
app.use("/api/monitor", monitorRouter);
app.use("/api/actions", actionsRouter);
app.use("/api/files", filesRouter);
app.use("/api/ai", aiRouter);

app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(err.status || 500).json({ error: err.message || "Server error" });
});

const port = process.env.PORT || 8787;
app.listen(port, () => {
  console.log(`homelab-agent listening on :${port}`);
  initWhatsApp();
});
