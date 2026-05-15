import { Router } from "express";
import multer from "multer";
import path from "node:path";
import { connect, getServer } from "../lib/ssh.js";

export const filesRouter = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 2 * 1024 * 1024 * 1024 } });

function withSftp(serverId, fn) {
  return new Promise(async (resolve, reject) => {
    let conn;
    try {
      conn = await connect(getServer(serverId));
      conn.sftp((err, sftp) => {
        if (err) { conn.end(); return reject(err); }
        Promise.resolve(fn(sftp))
          .then((r) => { conn.end(); resolve(r); })
          .catch((e) => { conn.end(); reject(e); });
      });
    } catch (e) { reject(e); }
  });
}

filesRouter.get("/:id/list", async (req, res) => {
  const dir = req.query.path || "/";
  try {
    const list = await withSftp(req.params.id, (sftp) =>
      new Promise((resolve, reject) =>
        sftp.readdir(dir, (err, items) => err ? reject(err) : resolve(items))
      )
    );
    const out = list.map((it) => {
      const isDir = (it.attrs.mode & 0o170000) === 0o040000;
      const isLink = (it.attrs.mode & 0o170000) === 0o120000;
      return {
        name: it.filename,
        path: path.posix.join(dir, it.filename),
        type: isDir ? "dir" : isLink ? "link" : "file",
        size: it.attrs.size,
        modified: it.attrs.mtime * 1000,
      };
    }).sort((a, b) => (a.type === b.type ? a.name.localeCompare(b.name) : a.type === "dir" ? -1 : 1));
    res.json(out);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

filesRouter.get("/:id/download", async (req, res) => {
  const filePath = req.query.path;
  if (!filePath) return res.status(400).json({ error: "path required" });
  try {
    let conn;
    conn = await connect(getServer(req.params.id));
    conn.sftp((err, sftp) => {
      if (err) { conn.end(); return res.status(500).json({ error: err.message }); }
      const filename = path.posix.basename(filePath);
      res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
      const rs = sftp.createReadStream(filePath);
      rs.on("error", (e) => { try { res.status(500).end(e.message); } catch {} conn.end(); });
      rs.on("end", () => conn.end());
      rs.pipe(res);
    });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

filesRouter.post("/:id/upload", upload.single("file"), async (req, res) => {
  const dir = req.body.path || "/";
  if (!req.file) return res.status(400).json({ error: "file required" });
  try {
    await withSftp(req.params.id, (sftp) =>
      new Promise((resolve, reject) => {
        const full = path.posix.join(dir, req.file.originalname);
        const ws = sftp.createWriteStream(full);
        ws.on("error", reject).on("close", resolve);
        ws.end(req.file.buffer);
      })
    );
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

filesRouter.post("/:id/mkdir", async (req, res) => {
  const { path: p } = req.body || {};
  if (!p) return res.status(400).json({ error: "path required" });
  try {
    await withSftp(req.params.id, (sftp) =>
      new Promise((resolve, reject) => sftp.mkdir(p, (e) => e ? reject(e) : resolve()))
    );
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

filesRouter.post("/:id/rm", async (req, res) => {
  const { path: p } = req.body || {};
  if (!p) return res.status(400).json({ error: "path required" });
  try {
    await withSftp(req.params.id, (sftp) =>
      new Promise((resolve, reject) =>
        sftp.stat(p, (err, st) => {
          if (err) return reject(err);
          const isDir = (st.mode & 0o170000) === 0o040000;
          (isDir ? sftp.rmdir : sftp.unlink).call(sftp, p, (e) => e ? reject(e) : resolve());
        })
      )
    );
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});
