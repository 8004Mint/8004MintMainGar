/**
 * Shared MCP server setup: registers score_story tool.
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

const BACKEND_URL = process.env.BACKEND_URL || "http://localhost:3001";

export async function callScoreApi(
  story: string
): Promise<{ score: number; rationale: string; flags: string[]; breakdown?: unknown[] }> {
  const res = await fetch(`${BACKEND_URL.replace(/\/$/, "")}/score`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ story }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Backend returned ${res.status}: ${text || res.statusText}`);
  }
  const data = (await res.json()) as {
    score?: number;
    rationale?: string;
    flags?: string[];
    breakdown?: unknown[];
  };
  if (typeof data?.score !== "number") {
    throw new Error("Invalid response: missing or invalid score");
  }
  return {
    score: data.score,
    rationale: typeof data.rationale === "string" ? data.rationale : "",
    flags: Array.isArray(data.flags) ? data.flags : [],
    breakdown: data.breakdown,
  };
}

/** Create McpServer instance with score_story tool registered */
export function createStoryScoreServer(): McpServer {
  const server = new McpServer({
    name: "story-score-mcp",
    version: "1.0.0",
  });

  server.registerTool(
    "score_story",
    {
      title: "Score Story",
      description:
        "Score a user story (0-100). Uses the same backend as the Story flow (relevance, logic, originality, verifiable commitment).",
      inputSchema: { story: z.string().describe("The story text to score.") },
    },
    async ({ story }) => {
      try {
        const result = await callScoreApi(story);
        const text = [
          `Score: ${result.score}/100`,
          result.rationale ? `Rationale: ${result.rationale}` : "",
          result.flags?.length ? `Flags: ${result.flags.join(", ")}` : "",
          result.breakdown?.length
            ? `Breakdown: ${JSON.stringify(result.breakdown)}`
            : "",
        ]
          .filter(Boolean)
          .join("\n");
        return { content: [{ type: "text" as const, text }] };
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        return {
          content: [{ type: "text" as const, text: `Error: ${message}` }],
          isError: true,
        };
      }
    }
  );

  return server;
}
