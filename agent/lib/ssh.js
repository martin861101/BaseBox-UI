import { Client } from "ssh2";
import { db, decrypt } from "./db.js";

export function getServer(id) {
  const row = db.prepare("SELECT * FROM servers WHERE id = ?").get(id);
  if (!row) {
    const e = new Error("Server not found");
    e.status = 404;
    throw e;
  }
  return row;
}

export function buildSshConfig(row) {
  const cfg = {
    host: row.host,
    port: row.port || 22,
    username: row.username,
    readyTimeout: 15000,
  };
  const secret = decrypt(row.secret);
  if (row.authType === "password") cfg.password = secret;
  else {
    cfg.privateKey = secret;
    const pp = decrypt(row.passphrase);
    if (pp) cfg.passphrase = pp;
  }
  return cfg;
}

export function connect(row) {
  return new Promise((resolve, reject) => {
    const conn = new Client();
    conn
      .on("ready", () => resolve(conn))
      .on("error", reject)
      .connect(buildSshConfig(row));
  });
}

export function exec(conn, cmd) {
  return new Promise((resolve, reject) => {
    conn.exec(cmd, (err, stream) => {
      if (err) return reject(err);
      let stdout = "", stderr = "";
      let code = 0;
      stream
        .on("close", (c) => resolve({ stdout, stderr, code: c ?? code }))
        .on("data", (d) => (stdout += d.toString()))
        .stderr.on("data", (d) => (stderr += d.toString()));
      stream.on("exit", (c) => (code = c));
    });
  });
}

export async function withConnection(id, fn) {
  const row = getServer(id);
  const conn = await connect(row);
  try {
    return await fn(conn, row);
  } finally {
    conn.end();
  }
}
