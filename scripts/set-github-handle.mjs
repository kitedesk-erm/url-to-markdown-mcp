// The GitHub handle appears in: package.json (mcpName, homepage, repository, bugs), server.json (name, repository),
// README.md and smithery.yaml. package.json "mcpName" is the single source of truth: run
//   npm run set-github-handle -- <new-handle>
// to rewrite every occurrence, then `npm test` (which checks they all agree).
import { readFileSync, writeFileSync } from "node:fs";

const FILES = ["package.json", "server.json", "README.md", "smithery.yaml"];
const pkg = JSON.parse(readFileSync("package.json", "utf8"));
const m = /^io\.github\.([^/]+)\/(.+)$/.exec(pkg.mcpName || "");
if (!m) { console.error(`package.json mcpName must look like io.github.<handle>/<name>, got ${pkg.mcpName}`); process.exit(1); }
const [, oldHandle, serverName] = m;
const newHandle = process.argv[2];
if (!newHandle || !/^[A-Za-z0-9](?:[A-Za-z0-9-]{0,38})$/.test(newHandle)) {
  console.log(`current handle: ${oldHandle}  (mcpName io.github.${oldHandle}/${serverName})`);
  console.log("usage: npm run set-github-handle -- <github-handle>");
  process.exit(newHandle ? 1 : 0);
}
const esc = oldHandle.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const patterns = [
  [new RegExp(`io\\.github\\.${esc}/`, "g"), `io.github.${newHandle}/`],
  [new RegExp(`github\\.com/${esc}/`, "g"), `github.com/${newHandle}/`],
];
for (const f of FILES) {
  let s; try { s = readFileSync(f, "utf8"); } catch { continue; }
  let n = 0;
  for (const [re, rep] of patterns) s = s.replace(re, () => (n++, rep));
  writeFileSync(f, s);
  console.log(`${f}: ${n} replacement(s)`);
}
console.log(`handle ${oldHandle} -> ${newHandle}`);
