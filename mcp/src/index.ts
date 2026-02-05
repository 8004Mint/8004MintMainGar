/**
 * Story score MCP service (stdio, for Cursor and other local clients).
 */

import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { createStoryScoreServer } from "./server.js";

async function main() {
  const server = createStoryScoreServer();
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
