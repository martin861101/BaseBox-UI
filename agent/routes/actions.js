import { Router } from "express";
import { connect, getServer } from "../lib/ssh.js";

export const actionsRouter = Router();

// SSE-style streaming: client POSTs { serverId, command }, we stream chunks
actionsRouter.post("/exec", async (req, res) => {
  const { serverId, command } = req.body || {};
  if (!serverId || !command) return res.status(400).json({ error: "Missing serverId/command" });

  res.set({
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    Connection: "keep-alive",
    "X-Accel-Buffering": "no",
  });
  const send = (obj) => res.write(`data: ${JSON.stringify(obj)}\n\n`);

  let conn;
  try {
    conn = await connect(getServer(serverId));
    conn.exec(command, (err, stream) => {
      if (err) { send({ data: `error: ${err.message}\n` }); send({ exit: 1 }); return res.end(); }
      stream.on("data", (d) => send({ data: d.toString() }));
      stream.stderr.on("data", (d) => send({ data: d.toString() }));
      stream.on("close", (code) => { send({ exit: code ?? 0 }); conn.end(); res.end(); });
    });
    req.on("close", () => { try { conn.end(); } catch {} });
  } catch (e) {
    send({ data: `connection error: ${e.message}\n` });
    send({ exit: 1 });
    res.end();
  }
});

import { exec } from "child_process";
import fs from "fs/promises";
import path from "path";

actionsRouter.post("/playwright", async (req, res) => {
  const { script } = req.body || {};
  if (!script) return res.status(400).json({ error: "Missing script" });

  res.set({
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    Connection: "keep-alive",
    "X-Accel-Buffering": "no",
  });
  const send = (obj) => res.write(`data: ${JSON.stringify(obj)}\n\n`);

  try {
    const tmp = path.join(process.cwd(), `pw-${Date.now()}.mjs`);
    await fs.writeFile(tmp, `import { chromium, firefox, webkit } from 'playwright';\n${script}`);
    
    const child = exec(`node ${tmp}`);
    child.stdout.on("data", (d) => send({ data: d.toString() }));
    child.stderr.on("data", (d) => send({ data: d.toString() }));
    child.on("close", (code) => {
      fs.unlink(tmp).catch(() => {});
      send({ exit: code ?? 0 });
      res.end();
    });
    
    req.on("close", () => {
      try { child.kill(); fs.unlink(tmp).catch(() => {}); } catch {}
    });
  } catch (e) {
    send({ data: `error: ${e.message}\n` });
    send({ exit: 1 });
    res.end();
  }
});
