# url-to-markdown-mcp

<!-- mcp-name: io.github.kitedesk-erm/url-to-markdown-mcp -->

[![npm](https://img.shields.io/npm/v/@kitedesk-erm/url-to-markdown-mcp)](https://www.npmjs.com/package/@kitedesk-erm/url-to-markdown-mcp) [![MCP Registry](https://img.shields.io/badge/MCP%20Registry-io.github.kitedesk--erm%2Furl--to--markdown--mcp-blue)](https://registry.modelcontextprotocol.io/v0/servers?search=io.github.kitedesk-erm/url-to-markdown-mcp) [![License: MIT](https://img.shields.io/badge/license-MIT-green)](LICENSE)

**npm:** [`@kitedesk-erm/url-to-markdown-mcp`](https://www.npmjs.com/package/@kitedesk-erm/url-to-markdown-mcp) · **Official MCP Registry:** [`io.github.kitedesk-erm/url-to-markdown-mcp`](https://registry.modelcontextprotocol.io/v0/servers?search=io.github.kitedesk-erm/url-to-markdown-mcp)

**An MCP server that turns any URL into clean Markdown or plain text for your AI assistant.** It gives Claude, Cursor, Windsurf, Cline, VS Code Copilot and any other MCP client one tool, `extract_url`. The tool fetches a page and returns only the main content (no nav, ads, cookie banners, sidebars, footers or comments), plus the title, author, publish date, word count and reading time.

It's backed by the hosted [Article Extractor and URL to Markdown API on Zyla API Hub](https://zylalabs.com/api-marketplace/other/article+extractor+and+url+to+markdown+api/14315). **You'll need a Zyla API key, and you can [get one with a 7-day free trial](https://zylalabs.com/api-marketplace/other/article+extractor+and+url+to+markdown+api/14315).**

- Fast: p50 about 230 ms and p95 about 650 ms for extraction (20 real article URLs, measured 2026-10-22)
- LLM-ready Markdown with headings, lists, code blocks and absolute links; `max_chars` keeps you inside a token budget
- Read-only and SSRF-safe: localhost and private IPs are refused
- Small: one tool, stdio transport, and two runtime dependencies (`@modelcontextprotocol/sdk` and `zod`)

## Tool

### `extract_url`

| Argument | Type | Default | Description |
|---|---|---|---|
| `url` | string, required | | Public http(s) URL (the scheme is optional) |
| `format` | `markdown` \| `text` \| `both` | `markdown` | Output format |
| `max_chars` | integer | no limit | Truncate the content to N characters |
| `links` | boolean | `true` | Keep `[text](url)` links |
| `images` | boolean | `false` | Include `![alt](src)` images |

The tool returns a short metadata header followed by the content:

```
# How to Work Hard
Source: https://paulgraham.com/hwh.html
Words: 3313 (~14 min read) | truncated by max_chars

June 2021

It might not seem there's much to learn about how to work hard. Anyone who's been to school knows what it entails, ...
```

Errors come back as MCP tool errors (`isError: true`) with a readable message, so the model can recover. That covers a missing key, a private or localhost URL, a non-HTML target, an unreachable site, a Zyla quota or rate limit, and the API's `502` errors: `upstream_blocked` (the site returned 401/403/429/451 or a bot-challenge page) and `empty_content` (about 0 words, for example a page rendered client-side). Zyla only bills successful calls, so **blocked or empty pages aren't charged**.

## Install

You need Node.js 18 or later. Every client runs the same command, `npx -y @kitedesk-erm/url-to-markdown-mcp`, with your key in `ZYLA_API_KEY`.

### Claude Desktop

Edit `claude_desktop_config.json` (macOS: `~/Library/Application Support/Claude/`, Windows: `%APPDATA%\Claude\`):

```json
{
  "mcpServers": {
    "url-to-markdown": {
      "command": "npx",
      "args": ["-y", "@kitedesk-erm/url-to-markdown-mcp"],
      "env": { "ZYLA_API_KEY": "your-zyla-api-key" }
    }
  }
}
```

### Claude Code

```bash
claude mcp add url-to-markdown --env ZYLA_API_KEY=your-zyla-api-key -- npx -y @kitedesk-erm/url-to-markdown-mcp
```

### Cursor

Use `~/.cursor/mcp.json` for a global setup, or `.cursor/mcp.json` for a single project:

```json
{
  "mcpServers": {
    "url-to-markdown": {
      "command": "npx",
      "args": ["-y", "@kitedesk-erm/url-to-markdown-mcp"],
      "env": { "ZYLA_API_KEY": "your-zyla-api-key" }
    }
  }
}
```

### VS Code (GitHub Copilot agent mode)

Add this to `.vscode/mcp.json`. VS Code prompts for the key and stores it securely:

```json
{
  "inputs": [
    { "type": "promptString", "id": "zyla-key", "description": "Zyla API key", "password": true }
  ],
  "servers": {
    "url-to-markdown": {
      "type": "stdio",
      "command": "npx",
      "args": ["-y", "@kitedesk-erm/url-to-markdown-mcp"],
      "env": { "ZYLA_API_KEY": "${input:zyla-key}" }
    }
  }
}
```

### Windsurf, Cline, Continue, Zed and other clients

Most clients take the same `mcpServers` block shown for Claude Desktop and Cursor (Windsurf uses `~/.codeium/windsurf/mcp_config.json`; Cline uses its *MCP Servers → Configure* panel). The generic form is:

- **command:** `npx`
- **args:** `["-y", "@kitedesk-erm/url-to-markdown-mcp"]`
- **env:** `ZYLA_API_KEY=<your key>`
- **transport:** stdio

### Smithery / Docker

The repo includes `smithery.yaml` and a `Dockerfile`. You can also run it in Docker: `docker build -t url-to-markdown-mcp . && docker run -i --rm -e ZYLA_API_KEY url-to-markdown-mcp`.

### From source

If you're installing before the npm release, build from source:

```bash
git clone https://github.com/kitedesk-erm/url-to-markdown-mcp.git
cd url-to-markdown-mcp && npm install && npm run build
# then use "command": "node", "args": ["/absolute/path/to/url-to-markdown-mcp/dist/index.js"]
```

## Example prompts

- "Read https://go.dev/blog/go1.22 and summarize what changed in loops."
- "Pull the text of these three articles and compare their arguments" (with `max_chars: 6000` each).
- "Save this page as a Markdown note with title and author front matter."

## Limits

- No JavaScript rendering. Pages that build their content only in the browser (some SPAs) return little text.
- Paywalled or bot-protected sites return only what they serve publicly. Blocked or challenged requests return an `upstream_blocked` tool error and aren't billed.
- Your Zyla plan sets the quota and rate limit. Only successful (200) calls count against your plan.

## Development

```bash
npm install
npm test          # build, then the raw JSON-RPC handshake + tools/list, a tool call via a local mock Zyla gateway, and metadata checks
npm run test:live # same, but the mock gateway forwards to the live extraction backend
```

The tests use a fake key against a local mock, so no real key is needed or stored. The Zyla endpoint lives in one constant, [`src/config.ts`](src/config.ts). `ZYLA_ENDPOINT` overrides it, but only for testing.

**Changing the GitHub handle or namespace:** `package.json` → `mcpName` is the source of truth. Run `npm run set-github-handle -- <handle>` to rewrite `package.json`, `server.json`, `README.md` and `smithery.yaml`. `npm test` then checks that they all agree, which the MCP Registry also requires.

## Related

- [url-to-markdown-api](https://github.com/kitedesk-erm/url-to-markdown-api): zero-dependency JS/TS and Python clients, plus RAG, agent and read-later examples
- [Zyla listing: Article Extractor and URL to Markdown API](https://zylalabs.com/api-marketplace/other/article+extractor+and+url+to+markdown+api/14315)

## License

[MIT](LICENSE)
