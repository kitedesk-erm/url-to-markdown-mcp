#!/usr/bin/env node
// url-to-markdown-mcp: stdio MCP server exposing one tool, extract_url,
// backed by the Article Extractor & URL to Markdown API on Zyla API Hub (#14315).
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { createServer } from "./server.js";
import { SERVER_NAME, SERVER_VERSION, ZYLA_LISTING_URL } from "./config.js";

async function main() {
  if (!process.env.ZYLA_API_KEY) {
    // stdout is the MCP channel; diagnostics go to stderr only.
    console.error(`[${SERVER_NAME}] warning: ZYLA_API_KEY is not set; extract_url calls will fail. Get a key: ${ZYLA_LISTING_URL}`);
  }
  const server = createServer();
  await server.connect(new StdioServerTransport());
  console.error(`[${SERVER_NAME}] v${SERVER_VERSION} running on stdio`);
}

main().catch((err) => {
  console.error(`[${SERVER_NAME}] fatal:`, err);
  process.exit(1);
});
