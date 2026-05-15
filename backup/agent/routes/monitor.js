import { Router } from "express";
import { withConnection, exec } from "../lib/ssh.js";

export const monitorRouter = Router();

const SCRIPT = `
echo "==HW=="
hostname
uname -r
cat /proc/uptime
cat /proc/loadavg
free -b | awk '/Mem:/ {print $2, $3}'
df -B1 --output=size,used / | tail -1
top -bn1 | grep "Cpu(s)" | awk '{print 100 - $8}'
echo "==DOCKER=="
docker ps -a --format '{{.ID}}|{{.Names}}|{{.Image}}|{{.Status}}|{{.State}}' 2>/dev/null || true
echo "==PM2=="
pm2 jlist 2>/dev/null || echo "[]"
`;

monitorRouter.get("/:id", async (req, res) => {
  try {
    const out = await withConnection(req.params.id, (c) => exec(c, SCRIPT));
    const text = out.stdout;
    const sections = text.split(/==(HW|DOCKER|PM2)==/);
    // sections: ["", "HW", hwBody, "DOCKER", dockerBody, "PM2", pm2Body]
    const hw = sections[2]?.trim().split("\n") || [];
    const hostname = hw[0] || "";
    const kernel = hw[1] || "";
    const uptimeSec = parseFloat((hw[2] || "0").split(" ")[0]);
    const loadAvg = (hw[3] || "0 0 0").split(" ").slice(0, 3).map(Number);
    const [memTotal, memUsed] = (hw[4] || "0 0").split(" ").map(Number);
    const [diskTotal, diskUsed] = (hw[5] || "0 0").split(/\s+/).map(Number);
    const cpuPct = parseFloat(hw[6] || "0");

    const containers = (sections[4] || "")
      .split("\n").filter(Boolean)
      .map((line) => {
        const [id, name, image, status, state] = line.split("|");
        return { id, name, image, status, state };
      });

    let pm2 = [];
    try {
      const arr = JSON.parse((sections[6] || "[]").trim());
      pm2 = arr.map((p) => ({
        name: p.name,
        status: p.pm2_env?.status,
        cpu: p.monit?.cpu ?? 0,
        memory: p.monit?.memory ?? 0,
        uptime: Date.now() - (p.pm2_env?.pm_uptime || Date.now()),
        restarts: p.pm2_env?.restart_time ?? 0,
      }));
    } catch {}

    res.json({
      ok: true,
      hardware: { cpuPct, memUsed, memTotal, diskUsed, diskTotal, loadAvg, uptimeSec, hostname, kernel },
      containers,
      pm2,
    });
  } catch (e) {
    res.json({ ok: false, error: e.message });
  }
});

monitorRouter.post("/:id/docker/:name/:action", async (req, res) => {
  const { name, action } = req.params;
  if (!["start", "stop", "restart"].includes(action))
    return res.status(400).json({ error: "Bad action" });
  // shell-escape name
  const safe = name.replace(/[^a-zA-Z0-9_.-]/g, "");
  if (!safe) return res.status(400).json({ error: "Bad container name" });
  try {
    await withConnection(req.params.id, (c) => exec(c, `docker ${action} ${safe}`));
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

monitorRouter.post("/:id/pm2/:name/:action", async (req, res) => {
  const { action } = req.params;
  const name = decodeURIComponent(req.params.name);
  if (!["start", "stop", "restart"].includes(action))
    return res.status(400).json({ error: "Bad action" });
  const safe = name.replace(/[^a-zA-Z0-9_.-]/g, "");
  if (!safe) return res.status(400).json({ error: "Bad pm2 name" });
  try {
    await withConnection(req.params.id, (c) => exec(c, `pm2 ${action} ${safe}`));
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});
