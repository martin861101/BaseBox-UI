## Important constraint up front

Lovable's runtime is Cloudflare Workers — it **cannot open SSH connections, run shell commands, or stream large file uploads to remote machines**. Since you picked "SSH from the dashboard backend" + "self-hosted", the architecture has to be split:

- **This Lovable project** → the dashboard UI (React + TanStack Start), single-password login, talks to your backend over HTTPS.
- **A separate Node.js backend** I'll generate as a `homelab-agent/` folder in the repo → you run this on one box in your homelab (`docker compose up -d` or `node server.js`). It holds your SSH keys, runs commands, streams files, and proxies Ollama.

You'll get both in this repo. The Node backend is what makes SSH/SFTP/shell exec actually work.

---

## Architecture

```text
Browser ──HTTPS──▶ Lovable UI (this project)
                          │
                          │  fetch(VITE_AGENT_URL, Bearer token)
                          ▼
                  homelab-agent (Node, runs on YOUR box)
                          │
            ┌─────────────┼──────────────┬─────────────┐
            ▼             ▼              ▼             ▼
          SSH2          SFTP        local shell    Ollama HTTP
         (remote)     (remote)     (docker/pm2/    (localhost:
                                    apt on agent     11434)
                                    host itself)
```

The agent stores server definitions + encrypted SSH keys in a local SQLite file. UI never sees keys.

## Tabs (UI in this project)

1. **Monitoring** — per-server cards showing:
   - Docker containers (`docker ps --format json`) with start/stop/restart
   - PM2 services (`pm2 jlist`) with restart/stop
   - Hardware: CPU %, mem, disk, load avg, uptime, network (parsed from `top`/`free`/`df`/`uptime`)
   - Auto-refresh every 5s
2. **Actions** — palette of common commands grouped by category (apt/dnf, systemctl, docker, pm2, git, networking, disk). Click → run on selected server → stream stdout/stderr to a terminal pane. Plus a free-form command input.
3. **Files** — SFTP browser: list dir, breadcrumbs, upload (drag-drop, multipart streaming), download (single file or zipped folder), rename, delete, mkdir.
4. **Settings** — add/edit/remove servers (name, host/IP, port, user, auth method: password or private key paste/upload, optional sudo password). Test-connection button. Also: change dashboard password, set agent URL + token.
5. **AI Assistant** — chat UI streaming from Ollama via the agent. Model picker (lists `/api/tags`). Optional toggle "include current server context" (sends recent metrics/last command output as system context).

## Auth

- Single password set on first run of the agent (env `DASHBOARD_PASSWORD`).
- Login screen → agent issues a JWT → stored in `httpOnly` cookie via the agent (UI also holds in memory for dev).
- All agent endpoints require the token.

## File layout

```text
src/                          # Lovable UI
  routes/
    login.tsx
    _authenticated.tsx        # guard
    _authenticated/
      index.tsx               # redirects to /monitoring
      monitoring.tsx
      actions.tsx
      files.tsx
      settings.tsx
      assistant.tsx
  components/
    app-sidebar.tsx
    server-picker.tsx
    terminal-pane.tsx
    metric-card.tsx
    file-browser.tsx
    chat.tsx
  lib/
    agent-client.ts           # fetch wrapper, auth, SSE helpers
    auth-context.tsx
homelab-agent/                # the Node backend you self-host
  server.js                   # express + ws
  routes/
    auth.js  servers.js  monitor.js  actions.js  files.js  ai.js
  lib/
    ssh.js   sftp.js  db.js (sqlite)  crypto.js  ollama.js
  Dockerfile
  docker-compose.yml
  README.md                   # install + run instructions
.env.example                  # VITE_AGENT_URL=http://homelab.local:8788
```

## Tech choices

- UI: TanStack Start, shadcn sidebar layout, TanStack Query for polling, `xterm.js` for terminal pane, `react-markdown` for assistant
- Agent: Node 20, Express, `ssh2` (SSH+SFTP), `better-sqlite3`, `jsonwebtoken`, `bcrypt`, `multer` for uploads, `archiver` for folder downloads, native `fetch` to Ollama
- Streaming: Server-Sent Events for command output and AI chat (simpler than WS, plays nicely through reverse proxies)

## Build order

1. Design system + sidebar shell + login route + auth context (UI only, mocked)
2. Settings tab with server CRUD against agent API contract
3. `homelab-agent/` skeleton: auth, servers CRUD, SQLite, Dockerfile, README
4. Monitoring tab + agent monitor endpoints (docker/pm2/system)
5. Actions tab + agent exec endpoint with SSE streaming
6. Files tab + agent SFTP endpoints (list/upload/download/mkdir/delete)
7. AI Assistant tab + agent Ollama proxy with streaming
8. Polish, error states, README with full setup instructions

## What you'll need to do

- Run the agent on a box that can reach your other servers (`cd homelab-agent && docker compose up -d`)
- Set `VITE_AGENT_URL` to that box's URL (publish-time env in Lovable, or via the Settings tab which stores it in localStorage)
- For HTTPS from the published Lovable site → put the agent behind Caddy/Traefik with a real cert, or use a Tailscale Funnel / Cloudflare Tunnel. The README will spell this out.

## Out of scope for v1

- Multi-user, RBAC
- Historical metric storage / graphs over time (only live values)
- Alerting/notifications
- Auto-discovery of servers

---

This is a sizeable build (~25–35 files). Want me to proceed with the full build, or start with just the UI shell + Settings tab + agent skeleton so you can test the wiring first?