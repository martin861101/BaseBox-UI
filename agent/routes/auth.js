import { Router } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

export const authRouter = Router();

const PASSWORD = process.env.DASHBOARD_PASSWORD || "changeme";
const SECRET = process.env.JWT_SECRET || "dev-jwt-secret-change-me";
const PASSWORD_HASH = bcrypt.hashSync(PASSWORD, 10);

authRouter.post("/login", (req, res) => {
  const { password } = req.body || {};
  if (!password || !bcrypt.compareSync(password, PASSWORD_HASH))
    return res.status(401).json({ error: "Invalid password" });
  const token = jwt.sign({ sub: "user" }, SECRET, { expiresIn: "30d" });
  res.json({ token });
});

authRouter.get("/me", (req, res) => {
  const t = (req.headers.authorization || "").replace(/^Bearer\s+/i, "");
  try { jwt.verify(t, SECRET); res.json({ ok: true }); }
  catch { res.status(401).json({ error: "Unauthorized" }); }
});

export function requireAuth(req, res, next) {
  // Allow token via query param for download links
  const t =
    (req.headers.authorization || "").replace(/^Bearer\s+/i, "") ||
    req.query.token;
  if (!t) return res.status(401).json({ error: "Unauthorized" });
  try {
    jwt.verify(t, SECRET);
    next();
  } catch {
    res.status(401).json({ error: "Unauthorized" });
  }
}
