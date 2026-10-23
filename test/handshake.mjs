// Raw JSON-RPC over stdio: initialize -> notifications/initialized -> tools/list.
// No SDK client on purpose, to check exactly what an MCP host sees on the wire.
import { spawn } from "node:child_process";
import assert from "node:assert/strict";

const env = { PATH: process.env.PATH }; // deliberately no ZYLA_API_KEY: handshake must work without it
const child = spawn(process.execPath, ["dist/index.js"], { env, stdio: ["pipe", "pipe", "pipe"] });
let buf = "", stderr = "";
const pending = new Map();
child.stderr.on("data", (d) => (stderr += d));
child.stdout.on("data", (d) => {
  buf += d;
  let i;
  while ((i = buf.indexOf("\n")) >= 0) {
    const line = buf.slice(0, i).trim(); buf = buf.slice(i + 1);
    if (!line) continue;
    const msg = JSON.parse(line); // any non-JSON on stdout would break MCP hosts
    pending.get(msg.id)?.(msg); pending.delete(msg.id);
  }
});
const rpc = (id, method, params) => new Promise((res, rej) => {
  const t = setTimeout(() => rej(new Error(`timeout waiting for ${method}`)), 10000);
  pending.set(id, (m) => { clearTimeout(t); res(m); });
  child.stdin.write(JSON.stringify({ jsonrpc: "2.0", id, method, params }) + "\n");
});

try {
  const init = await rpc(1, "initialize", {
    protocolVersion: "2025-06-18", capabilities: {}, clientInfo: { name: "handshake-test", version: "0.0.0" },
  });
  assert.ok(init.result, "initialize returned an error: " + JSON.stringify(init.error));
  assert.equal(init.result.serverInfo.name, "url-to-markdown-mcp");
  assert.ok(init.result.capabilities.tools, "server advertises tools capability");
  console.log(`ok initialize: protocol ${init.result.protocolVersion}, server ${init.result.serverInfo.name}@${init.result.serverInfo.version}`);

  child.stdin.write(JSON.stringify({ jsonrpc: "2.0", method: "notifications/initialized" }) + "\n");

  const list = await rpc(2, "tools/list", {});
  const tools = list.result.tools;
  assert.equal(tools.length, 1);
  const t = tools[0];
  assert.equal(t.name, "extract_url");
  assert.deepEqual(t.inputSchema.required, ["url"]);
  for (const p of ["url", "format", "max_chars", "links", "images"]) assert.ok(t.inputSchema.properties[p], `param ${p}`);
  assert.deepEqual(t.inputSchema.properties.format.enum, ["markdown", "text", "both"]);
  assert.equal(t.annotations.readOnlyHint, true);
  console.log(`ok tools/list: ${t.name}(${Object.keys(t.inputSchema.properties).join(", ")})`);

  const call = await rpc(3, "tools/call", { name: "extract_url", arguments: { url: "https://example.com" } });
  assert.equal(call.result.isError, true);
  assert.match(call.result.content[0].text, /ZYLA_API_KEY is not set/);
  console.log("ok tools/call without key -> isError with setup hint");
  assert.match(stderr, /ZYLA_API_KEY is not set/);
  console.log("ok stderr warning when key missing (stdout stays clean JSON-RPC)");
  console.log("handshake: PASS");
} catch (e) {
  console.error("handshake: FAIL", e, "\nstderr:", stderr);
  process.exitCode = 1;
} finally {
  child.kill();
}
