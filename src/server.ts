import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { SERVER_NAME, SERVER_VERSION } from "./config.js";
import { callExtract, formatArticle, ExtractError } from "./extract.js";

export function createServer(opts: { endpoint?: string; fetchImpl?: typeof fetch } = {}) {
  const server = new McpServer({ name: SERVER_NAME, version: SERVER_VERSION });

  server.registerTool(
    "extract_url",
    {
      title: "Extract URL to Markdown",
      description:
        "Fetch a public web page (article, blog post, docs page, README, Wikipedia...) and return its main content " +
        "as clean Markdown and/or plain text, with nav, ads, footers and comments removed, plus title, author, " +
        "publish date, word count and reading time. Does not run JavaScript; paywalled pages return only public content.",
      inputSchema: {
        url: z.string().min(1).describe("Public http(s) URL to read (scheme optional)"),
        format: z.enum(["markdown", "text", "both"]).optional().describe("Output format (default: markdown)"),
        max_chars: z.number().int().min(0).optional().describe("Truncate the content to N characters to fit your context budget (0 = no limit)"),
        links: z.boolean().optional().describe("Keep [text](url) links in Markdown (default true)"),
        images: z.boolean().optional().describe("Include ![alt](src) images in Markdown (default false)"),
      },
      annotations: { readOnlyHint: true, openWorldHint: true, idempotentHint: true },
    },
    async ({ url, format, max_chars, links, images }) => {
      const fmt = format ?? "markdown";
      try {
        const a = await callExtract({ url, format: fmt, max_chars, links, images }, opts);
        return { content: [{ type: "text", text: formatArticle(a, fmt) }] };
      } catch (e) {
        const msg = e instanceof ExtractError ? e.message : `Extract failed: ${(e as Error).message}`;
        return { content: [{ type: "text", text: msg }], isError: true };
      }
    },
  );

  return server;
}
