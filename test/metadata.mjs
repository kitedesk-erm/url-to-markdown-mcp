// Consistency checks for publishing metadata (npm, MCP Registry, Smithery).
import assert from "node:assert/strict";
import { readFileSync, statSync } from "node:fs";

const pkg = JSON.parse(readFileSync("package.json", "utf8"));
const srv = JSON.parse(readFileSync("server.json", "utf8"));
assert.equal(srv.name, pkg.mcpName, "server.json name must equal package.json mcpName (MCP Registry ownership check)");
assert.equal(srv.version, pkg.version);
assert.equal(srv.packages[0].identifier, pkg.name);
assert.equal(srv.packages[0].version, pkg.version);
assert.ok(srv.description.length <= 100, `server.json description is ${srv.description.length} chars (registry max 100)`);
const handle = pkg.mcpName.split("/")[0].replace("io.github.", "");
assert.ok(srv.repository.url.includes(`github.com/${handle}/`), "server.json repository uses the same handle");
assert.ok(pkg.repository.url.includes(`github.com/${handle}/`), "package.json repository uses the same handle");
assert.ok(readFileSync("README.md", "utf8").includes(pkg.mcpName), "README mentions mcpName");
assert.equal(pkg.bin["url-to-markdown-mcp"], "dist/index.js");
assert.ok(readFileSync("dist/index.js", "utf8").startsWith("#!/usr/bin/env node"), "bin has a shebang");
assert.ok(statSync("dist/index.js").mode & 0o111, "bin is executable");
console.log(`metadata: PASS (mcpName ${pkg.mcpName}, npm ${pkg.name}@${pkg.version})`);
