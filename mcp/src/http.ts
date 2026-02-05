/**
 * Story score MCP service (Streamable HTTP for deployed Service URL).
 * Listens on MCP_HTTP_PORT at /mcp; Service URL = https://your-domain/mcp (reverse proxy) or https://your-domain:port/mcp
 */

import { createMcpExpressApp } from "@modelcontextprotocol/sdk/server/express.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { createStoryScoreServer } from "./server.js";

const PORT = Number(process.env.MCP_HTTP_PORT) || 3002;
const HOST = process.env.MCP_HTTP_HOST || "0.0.0.0";

const app = createMcpExpressApp({
  host: HOST,
  allowedHosts: process.env.MCP_ALLOWED_HOSTS
    ? process.env.MCP_ALLOWED_HOSTS.split(",").map((h) => h.trim())
    : undefined,
});

app.post("/mcp", async (req, res) => {
  const server = createStoryScoreServer();
  try {
    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: undefined, // stateless, single-tool multi-request
    });
    await server.connect(transport);
    await transport.handleRequest(req, res, req.body);
    res.on("close", () => {
      transport.close().catch(() => {});
      server.close().catch(() => {});
    });
  } catch (err) {
    console.error("MCP request error:", err);
    if (!res.headersSent) {
      res.status(500).json({
        jsonrpc: "2.0",
        error: { code: -32603, message: "Internal server error" },
        id: null,
      });
    }
  }
});

app.get("/mcp", (_req, res) => {
  res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
  res.end(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Story Scoring MCP Service</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); min-height: 100vh; display: flex; align-items: center; justify-content: center; padding: 20px; }
    .card { background: white; border-radius: 16px; padding: 40px; max-width: 500px; box-shadow: 0 20px 60px rgba(0,0,0,0.2); }
    h1 { color: #333; font-size: 24px; margin-bottom: 16px; }
    .badge { display: inline-block; background: #10b981; color: white; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: 600; margin-bottom: 20px; }
    p { color: #666; line-height: 1.6; margin-bottom: 16px; }
    .info { background: #f3f4f6; border-radius: 8px; padding: 16px; margin-top: 20px; }
    .info-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #e5e7eb; }
    .info-row:last-child { border-bottom: none; }
    .info-label { color: #888; font-size: 14px; }
    .info-value { color: #333; font-size: 14px; font-weight: 500; }
    code { background: #e5e7eb; padding: 2px 6px; border-radius: 4px; font-size: 13px; }
    a { color: #667eea; text-decoration: none; }
    a:hover { text-decoration: underline; }
  </style>
</head>
<body>
  <div class="card">
    <span class="badge">✓ Online</span>
    <h1>🤖 Story Scoring MCP Service</h1>
    <p>This is the <strong>Model Context Protocol (MCP)</strong> endpoint for the Story Scoring Agent. It's designed for AI clients, not web browsers.</p>
    <p>To use this service, connect via an MCP-compatible client (Claude, Cursor, etc.) using <code>POST</code> requests.</p>
    <div class="info">
      <div class="info-row">
        <span class="info-label">Service</span>
        <span class="info-value">Story Score MCP</span>
      </div>
      <div class="info-row">
        <span class="info-label">Version</span>
        <span class="info-value">v1.2</span>
      </div>
      <div class="info-row">
        <span class="info-label">Protocol</span>
        <span class="info-value">MCP 2024-11-05</span>
      </div>
      <div class="info-row">
        <span class="info-label">Agent ID</span>
        <span class="info-value">#14645</span>
      </div>
      <div class="info-row">
        <span class="info-label">Website</span>
        <span class="info-value"><a href="https://8004mint.com">8004mint.com</a></span>
      </div>
    </div>
  </div>
</body>
</html>`);
});

app.delete("/mcp", (_req, res) => {
  res.writeHead(405, { "Content-Type": "application/json" });
  res.end(
    JSON.stringify({
      jsonrpc: "2.0",
      error: { code: -32000, message: "Method not allowed." },
      id: null,
    })
  );
});

app.listen(PORT, HOST, () => {
  console.log(`MCP HTTP server: http://${HOST}:${PORT}/mcp`);
});
