import express from "express";
import cors from "cors";
import { authRouter, requireAuth } from "./routes/auth.js";
import { serversRouter } from "./routes/servers.js";
import { monitorRouter } from "./routes/monitor.js";
import { actionsRouter } from "./routes/actions.js";
import { filesRouter } from "./routes/files.js";
import { aiRouter } from "./routes/ai.js";

const app = express();

// Handle Private Network Access preflights
app.use((req, res, next) => {
  if (req.headers["access-control-request-private-network"]) {
    res.setHeader("Access-Control-Allow-Private-Network", "true");
  }
  next();
});

app.use(cors({ 
  origin: true, 
  credentials: true, 
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With", "Access-Control-Allow-Private-Network"],
  exposedHeaders: ["Content-Disposition"] 
}));
app.use(express.json({ limit: "10mb" }));

app.get("/health", (_, res) => res.json({ ok: true }));

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

const port = process.env.PORT || 8788;
app.listen(port, () => console.log(`homelab-agent listening on :${port}`));
