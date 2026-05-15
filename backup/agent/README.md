# Homelab Agent

The backend service that powers the Homelab Control Center dashboard. It runs on a
machine in your homelab, holds your SSH credentials, and exposes a small HTTPS API
that the dashboard calls.

> Why is this separate from the dashboard? The dashboard UI is hosted on Cloudflare
> Workers, which can't open SSH connections, run shell commands, or stream large
> file uploads. This Node service does all of that on your own hardware.

## Quick start (Docker)

```bash
cd homelab-agent
cp .env.example .env  # edit DASHBOARD_PASSWORD + JWT_SECRET
docker compose up -d
```

The agent listens on port `8788`. Open the dashboard, click **Settings**, and set
the **Agent URL** to e.g. `http://homelab.local:8788` (or the LAN IP of this box).

## Quick start (bare Node)

```bash
cd homelab-agent
npm install
DASHBOARD_PASSWORD=mysecret JWT_SECRET=$(openssl rand -hex 32) node server.js
```

## Environment variables

| Variable | Default | Notes |
|---|---|---|
| `PORT` | `8788` | HTTP port |
| `DATA_DIR` | `./data` | Where SQLite + encryption key live |
| `DASHBOARD_PASSWORD` | `changeme` | Single dashboard password |
| `JWT_SECRET` | `dev-jwt-secret-change-me` | Sign auth tokens — set to a long random string |
| `OLLAMA_URL` | `http://localhost:11434` | Local Ollama endpoint for AI Assistant |

Server credentials (SSH passwords / private keys) are AES-256-GCM encrypted at
rest with a key stored in `DATA_DIR/secret.key` (chmod 600). Back up `DATA_DIR/`
to keep your servers list and credentials.

## HTTPS / exposing to the published dashboard

If you publish the dashboard on `*.lovable.app`, browsers will block plain HTTP
calls to your agent. Pick one:

1. **Cloudflare Tunnel** — `cloudflared tunnel --url http://localhost:8788`
2. **Tailscale Funnel** — expose `:8788` to the public internet over HTTPS
3. **Caddy reverse proxy** — `homelab.example.com { reverse_proxy localhost:8788 }`

Then set Agent URL in Settings to the resulting `https://...` URL.

## API surface (for reference)

```
POST /api/auth/login           { password } → { token }
GET  /api/auth/me              (verifies token)

GET    /api/servers
POST   /api/servers            { name, host, port, username, authType, password|privateKey, passphrase? }
PUT    /api/servers/:id
DELETE /api/servers/:id
POST   /api/servers/:id/test

GET    /api/monitor/:id        → { hardware, containers[], pm2[] }
POST   /api/monitor/:id/docker/:name/:action   (start|stop|restart)
POST   /api/monitor/:id/pm2/:name/:action

POST   /api/actions/exec       { serverId, command }   (SSE stream)

GET    /api/files/:id/list?path=/...
GET    /api/files/:id/download?path=/...
POST   /api/files/:id/upload    multipart: file + path field
POST   /api/files/:id/mkdir     { path }
POST   /api/files/:id/rm        { path }

GET    /api/ai/models          → { models: [...] }
POST   /api/ai/chat            { model, messages[] }   (SSE stream, Ollama-compatible)
```

All routes except `/api/auth/*` and `/health` require `Authorization: Bearer <token>`
(or `?token=...` for download links).
