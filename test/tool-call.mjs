// tools/call through the official SDK client against a local mock of the Zyla gateway.
// Default: fixture mode (offline). With UPSTREAM=<worker URL> the mock forwards to the live worker.
// Uses a fake key: the mock only checks that a Bearer header is present. No real key is ever needed here.
import assert from "node:assert/strict";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { startMockGateway } from "./mock-gateway.mjs";

const FAKE_KEY = "fake-key-for-tests";
const live = !!process.env.UPSTREAM;
const g = await startMockGateway();
const transport = new StdioClientTransport({
  command: process.execPath,
  args: ["dist/index.js"],
  env: { PATH: process.env.PATH, ZYLA_API_KEY: FAKE_KEY, ZYLA_ENDPOINT: g.url },
  stderr: "pipe",
});
const client = new Client({ name: "tool-call-test", version: "0.0.0" });
try {
  await client.connect(transport);
  const target = live ? "https://paulgraham.com/hwh.html" : "https://example.com/post";
  const t0 = Date.now();
  const r = await client.callTool({ name: "extract_url", arguments: { url: target, max_chars: 600, links: false } });
  const ms = Date.now() - t0;
  assert.notEqual(r.isError, true, JSON.stringify(r.content));
  const text = r.content[0].text;
  const req = g.seen[0];
  assert.equal(req.auth, `Bearer ${FAKE_KEY}`);
  assert.equal(req.path, "/api/14315/article+extractor+and+url+to+markdown+api/35883/extract+article");
  assert.deepEqual(req.query, { url: target, format: "markdown", links: "false", max_chars: "600" });
  assert.match(text, live ? /^# How to Work Hard/ : /^# Example Post/);
  if (live) assert.match(text, /truncated by max_chars/);
  console.log(`ok tools/call extract_url (${live ? "live worker via mock gateway" : "fixture"}) in ${ms} ms; gateway saw path+Bearer+params`);
  console.log("---- tool result (first 400 chars) ----\n" + text.slice(0, 400) + "\n----");

  const bad = await client.callTool({ name: "extract_url", arguments: { url: "http://localhost/secret" } });
  if (live) {
    assert.equal(bad.isError, true);
    assert.match(bad.content[0].text, /url not allowed/);
    console.log("ok SSRF-blocked URL -> isError: " + bad.content[0].text);
  }
  const txt = await client.callTool({ name: "extract_url", arguments: { url: target, format: "text", max_chars: 100 } });
  assert.equal(g.seen.at(-1).query.format, "text");
  assert.notEqual(txt.isError, true);
  console.log("ok format=text passes through");
  console.log("tool-call: PASS");
} catch (e) {
  console.error("tool-call: FAIL", e);
  process.exitCode = 1;
} finally {
  await client.close().catch(() => {});
  g.close();
}
