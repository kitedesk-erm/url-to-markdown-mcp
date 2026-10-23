import { ZYLA_ENDPOINT } from "./config.js";

export interface ExtractArgs {
  url: string;
  format?: "both" | "markdown" | "text";
  max_chars?: number;
  links?: boolean;
  images?: boolean;
}

export interface Article {
  url: string;
  title: string | null;
  byline: string | null;
  published_time: string | null;
  site_name: string | null;
  lang: string | null;
  description: string | null;
  image: string | null;
  excerpt: string | null;
  word_count: number;
  reading_time_min: number;
  truncated: boolean;
  markdown?: string;
  text?: string;
  status: number;
  content_type: string;
  [k: string]: unknown;
}

export class ExtractError extends Error {
  constructor(message: string, public status = 0, public body: unknown = undefined) {
    super(message);
    this.name = "ExtractError";
  }
}

export async function callExtract(
  args: ExtractArgs,
  opts: { apiKey?: string; endpoint?: string; fetchImpl?: typeof fetch; timeoutMs?: number } = {},
): Promise<Article> {
  const apiKey = opts.apiKey ?? process.env.ZYLA_API_KEY;
  if (!apiKey) {
    throw new ExtractError(
      "ZYLA_API_KEY is not set. Add your Zyla API key to this MCP server's env config " +
        "(get one with a 7-day free trial at https://zylalabs.com/api-marketplace/other/article+extractor+and+url+to+markdown+api/14315).",
    );
  }
  const q = new URLSearchParams({ url: args.url });
  if (args.format) q.set("format", args.format);
  if (args.links !== undefined) q.set("links", String(args.links));
  if (args.images !== undefined) q.set("images", String(args.images));
  if (args.max_chars) q.set("max_chars", String(args.max_chars));
  const endpoint = opts.endpoint ?? process.env.ZYLA_ENDPOINT ?? ZYLA_ENDPOINT;
  const res = await (opts.fetchImpl ?? fetch)(`${endpoint}?${q}`, {
    headers: { Authorization: `Bearer ${apiKey}`, Accept: "application/json", "User-Agent": "url-to-markdown-mcp/1.0" },
    signal: AbortSignal.timeout(opts.timeoutMs ?? 30000),
  });
  const raw = await res.text();
  let body: any;
  try { body = JSON.parse(raw); } catch { body = raw; }
  if (!res.ok) {
    const msg = (body && typeof body === "object" && (body.error || body.message)) || `HTTP ${res.status}`;
    const hint = res.status === 401 || res.status === 403 ? " (check ZYLA_API_KEY and that your Zyla subscription/trial is active)"
      : res.status === 429 ? " (Zyla rate limit or monthly quota reached)" : "";
    throw new ExtractError(`Extract failed: ${msg}${hint}`, res.status, body);
  }
  return body as Article;
}

/** Render an Article as an LLM-friendly text block: a short metadata header followed by the content. */
export function formatArticle(a: Article, format: ExtractArgs["format"] = "markdown"): string {
  const meta = [
    `# ${a.title ?? a.url}`,
    a.byline ? `Author: ${a.byline}` : null,
    a.published_time ? `Published: ${a.published_time}` : null,
    a.site_name ? `Site: ${a.site_name}` : null,
    `Source: ${a.url}`,
    `Words: ${a.word_count} (~${a.reading_time_min} min read)${a.truncated ? " | truncated by max_chars" : ""}`,
    a.status && a.status !== 200 ? `Warning: the target site returned HTTP ${a.status}; content may be a block/challenge page.` : null,
  ].filter(Boolean).join("\n");
  const parts: string[] = [meta];
  if (format !== "text" && a.markdown !== undefined) parts.push(a.markdown);
  if (format === "text" && a.text !== undefined) parts.push(a.text);
  if (format === "both" && a.text !== undefined) parts.push("---- plain text ----\n" + a.text);
  return parts.join("\n\n");
}
