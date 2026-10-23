// Local stand-in for the Zyla gateway, for tests without a real key.
// - Rejects requests without "Authorization: Bearer <something>" (401), like Zyla does.
// - UPSTREAM=<worker base URL> forwards the query to the real worker (end-to-end test);
//   otherwise it returns a canned fixture (fully offline).
import { createServer } from "node:http";

const FIXTURE = {
  url: "https://example.com/post", title: "Example Post", byline: "Jane Doe",
  published_time: "2026-01-01T00:00:00.000Z", site_name: "Example", lang: "en",
  description: "An example.", image: null, excerpt: "Hello world.", word_count: 2,
  reading_time_min: 1, truncated: false, markdown: "## Hello\n\nHello world.", text: "Hello\n\nHello world.",
  status: 200, content_type: "text/html",
};

export function startMockGateway({ upstream = process.env.UPSTREAM, port = 0 } = {}) {
  const seen = [];
  const server = createServer(async (req, res) => {
    const u = new URL(req.url, "http://localhost");
    seen.push({ path: u.pathname, query: Object.fromEntries(u.searchParams), auth: req.headers.authorization });
    const send = (code, obj) => { res.writeHead(code, { "content-type": "application/json" }); res.end(JSON.stringify(obj)); };
    if (!/^Bearer \S+/.test(req.headers.authorization || "")) return send(401, { message: "Unauthenticated." });
    if (!u.searchParams.get("url")) return send(400, { error: "invalid or missing 'url'" });
    if (!upstream) {
      const f = { ...FIXTURE, url: u.searchParams.get("url") };
      const fmt = u.searchParams.get("format");
      if (fmt === "markdown") delete f.text;
      if (fmt === "text") delete f.markdown;
      return send(200, f);
    }
    try {
      const r = await fetch(`${upstream.replace(/\/$/, "")}/v1/extract${u.search}`);
      res.writeHead(r.status, { "content-type": "application/json" });
      res.end(await r.text());
    } catch (e) { send(502, { error: "mock upstream failed", detail: String(e) }); }
  });
  return new Promise((resolve) => server.listen(port, "127.0.0.1", () => {
    const { port } = server.address();
    resolve({ url: `http://127.0.0.1:${port}/api/14315/article+extractor+and+url+to+markdown+api/35883/extract+article`, seen, close: () => { server.closeAllConnections?.(); server.close(); } });
  }));
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const g = await startMockGateway({ port: Number(process.env.PORT || 8787) });
  console.log(`mock gateway on ${g.url}${process.env.UPSTREAM ? " -> " + process.env.UPSTREAM : " (fixture mode)"}`);
}
