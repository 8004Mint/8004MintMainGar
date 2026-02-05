# Story Score MCP

[Model Context Protocol](https://modelcontextprotocol.io) service that exposes the `score_story` tool and calls this project's backend `POST /score` (same scoring logic as the Story flow; backend accepts `story` or `essay`).

## Tools

| Tool | Parameter | Description |
|------|-----------|-------------|
| `score_story` | `story: string` | Score user story text (0–100); returns score, rationale, flags, breakdown. |

## Requirements

- Node.js ≥ 18
- Backend running. On server, `deploy/ecosystem.config.cjs` sets `BACKEND_URL=https://8004mint.com`; local dev: `BACKEND_URL=http://localhost:3001`.

## Install and run

From repo root (run `npm install` in `mcp/` once):

```bash
npm run mcp        # dev (stdio)
npm run mcp:build  # build only
```

Or from `mcp/`:

```bash
cd mcp
npm install
npm run dev        # stdio for Cursor etc.
# or
npm run build && npm start
```

## Environment

| Variable | Default | Description |
|----------|---------|-------------|
| `BACKEND_URL` | On server: `https://8004mint.com`; local: `http://localhost:3001` | Backend API base (includes `/score`). |
| `MCP_HTTP_PORT` | `3002` | HTTP port for `start:http` / `dev:http`. |
| `MCP_HTTP_HOST` | `0.0.0.0` | HTTP bind address. |
| `MCP_ALLOWED_HOSTS` | (none) | Comma-separated allowed Host headers (DNS rebinding). |

## HTTP deploy (Agent Service URL)

With a server and domain, run MCP in **Streamable HTTP** and set the Agent Step 2 **Service URL** to the public URL.

1. **On server** (same host or same network as backend, must reach `BACKEND_URL`):
   ```bash
   cd mcp
   npm install
   npm run build
   BACKEND_URL=https://your-backend npm run start:http
   ```
   Listens on `0.0.0.0:3002`, path `/mcp`.

2. **Expose** (pick one):
   - **Recommended**: Nginx/Caddy reverse proxy: `https://your-domain/mcp` → `http://127.0.0.1:3002/mcp` with HTTPS.
   - Or expose port 3002 (firewall/security group); Service URL = `https://your-domain:3002/mcp`.

3. **Step 2**: **Service URL** = `https://your-domain/mcp` (or `:3002/mcp` if direct); **Tools** = `score_story`; Prompts/Resources empty.

Local HTTP test: `cd mcp && npm run dev:http`, then `http://localhost:3002/mcp` (connectivity only; Agent registration usually needs HTTPS public URL).

## Enable in Cursor

1. **Settings → MCP → Edit config** (or edit `~/.cursor/mcp.json`).
2. Add a server using either method below.

### Form (Add Server)

| Field | Value |
|-------|--------|
| **Name** | `story-score` (or any name) |
| **Command** | `node` (or `npx` for TS) |
| **Args** | One line: `your-project-path/mcp/dist/index.js`. Or: first line `tsx`, second `your-project-path/mcp/src/index.ts`. |
| **Env** | Optional: `BACKEND_URL` = `http://localhost:3001` if backend runs locally on 3001. |

Replace path with your machine's 8004 project path.

### JSON config

Add to `mcpServers` (use your project path):

**Built** (run `npm run mcp:build` first):

```json
{
  "mcpServers": {
    "story-score": {
      "command": "node",
      "args": ["/Users/howe/Desktop/8004/mcp/dist/index.js"],
      "env": {
        "BACKEND_URL": "http://localhost:3001"
      }
    }
  }
}
```

**Unbuilt (TS)** (requires `tsx`):

```json
{
  "mcpServers": {
    "story-score": {
      "command": "npx",
      "args": ["tsx", "/Users/howe/Desktop/8004/mcp/src/index.ts"],
      "env": {
        "BACKEND_URL": "http://localhost:3001"
      }
    }
  }
}
```

3. Restart Cursor or reload MCP; then use the story score tool in chat (e.g. "Score this story with score_story").

## Agent Step 2: Communication Services

When creating/editing an Agent and Step 2 is **Communication Services** with **MCP**:

| Field | Value |
|-------|--------|
| **Service URL** | Public MCP HTTP URL: `https://your-domain/mcp` (or `:3002/mcp`). See "HTTP deploy" above. |
| **Tools (comma-separated)** | `score_story` |
| **Prompts** | (empty) |
| **Resources** | (empty) |

If you don't have a server/domain yet, skip and fill Service URL after deploying MCP HTTP.

## Relation to backend

- MCP is a thin tool layer: it receives `story`, calls backend `POST /score` (backend accepts `story` or `essay`), and returns score, rationale, flags, breakdown as text.
- Scoring logic, OpenAI config, and pass threshold live in the **backend** (`backend/src/scoring/score.ts`, `backend/src/server.ts`); MCP does not duplicate them.
