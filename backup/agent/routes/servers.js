import { Router } from "express";
import { db, encrypt, decrypt, newId } from "../lib/db.js";
import { connect, getServer } from "../lib/ssh.js";

export const serversRouter = Router();

function rowToDto(row) {
  return {
    id: row.id, name: row.name, host: row.host, port: row.port,
    username: row.username, authType: row.authType,
    // never return secrets; UI just needs presence
    password: row.authType === "password" && row.secret ? "********" : "",
    privateKey: row.authType === "key" && row.secret ? "********" : "",
    passphrase: row.passphrase ? "********" : "",
  };
}

serversRouter.get("/", (_req, res) => {
  const rows = db.prepare("SELECT * FROM servers ORDER BY name").all();
  res.json(rows.map(rowToDto));
});

serversRouter.post("/", (req, res) => {
  const s = req.body || {};
  if (!s.name || !s.host || !s.username || !s.authType)
    return res.status(400).json({ error: "Missing required fields" });
  const id = newId();
  const secret = s.authType === "password" ? s.password : s.privateKey;
  db.prepare(
    `INSERT INTO servers (id,name,host,port,username,authType,secret,passphrase)
     VALUES (?,?,?,?,?,?,?,?)`
  ).run(
    id, s.name, s.host, s.port || 22, s.username, s.authType,
    encrypt(secret), encrypt(s.passphrase),
  );
  res.json(rowToDto(getServer(id)));
});

serversRouter.put("/:id", (req, res) => {
  const id = req.params.id;
  const cur = getServer(id);
  const s = req.body || {};
  // Keep existing secret if placeholder ******** is sent
  const incomingSecret = s.authType === "password" ? s.password : s.privateKey;
  const keepSecret = !incomingSecret || incomingSecret === "********";
  const incomingPassphrase = s.passphrase;
  const keepPassphrase = !incomingPassphrase || incomingPassphrase === "********";

  db.prepare(
    `UPDATE servers SET name=?, host=?, port=?, username=?, authType=?, secret=?, passphrase=? WHERE id=?`
  ).run(
    s.name ?? cur.name,
    s.host ?? cur.host,
    s.port ?? cur.port,
    s.username ?? cur.username,
    s.authType ?? cur.authType,
    keepSecret ? cur.secret : encrypt(incomingSecret),
    keepPassphrase ? cur.passphrase : encrypt(incomingPassphrase),
    id,
  );
  res.json(rowToDto(getServer(id)));
});

serversRouter.delete("/:id", (req, res) => {
  db.prepare("DELETE FROM servers WHERE id = ?").run(req.params.id);
  res.json({ ok: true });
});

serversRouter.post("/:id/test", async (req, res) => {
  try {
    const row = getServer(req.params.id);
    const conn = await connect(row);
    conn.end();
    res.json({ ok: true, message: `Connected to ${row.host}` });
  } catch (e) {
    res.json({ ok: false, message: e.message });
  }
});
