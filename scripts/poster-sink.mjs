// Local sink for the `?__poster` capture mode (see SplatBackground.tsx): the
// page bakes a still of the station splat and POSTs it here as a JPEG data URL.
// Run alongside the dev server, then visit /station/<slug>?__poster for each
// station; files land in public/stations/posters/<slug>.jpg.
//
//   node scripts/poster-sink.mjs
import { createServer } from "node:http";
import { mkdirSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const OUT_DIR = join(
  dirname(fileURLToPath(import.meta.url)),
  "..",
  "public",
  "stations",
  "posters",
);
mkdirSync(OUT_DIR, { recursive: true });

const server = createServer((req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  if (req.method === "OPTIONS") {
    res.writeHead(204).end();
    return;
  }
  const url = new URL(req.url, "http://localhost");
  if (req.method !== "POST" || url.pathname !== "/save") {
    res.writeHead(404).end();
    return;
  }
  const name = (url.searchParams.get("name") ?? "unknown").replace(/[^a-z0-9-]/gi, "");
  let body = "";
  req.on("data", (chunk) => (body += chunk));
  req.on("end", () => {
    const match = /^data:image\/jpeg;base64,(.+)$/.exec(body);
    if (!match) {
      console.error(`[poster-sink] ${name}: body is not a JPEG data URL`);
      res.writeHead(400).end();
      return;
    }
    const file = join(OUT_DIR, `${name}.jpg`);
    writeFileSync(file, Buffer.from(match[1], "base64"));
    console.log(`[poster-sink] saved ${file} (${match[1].length} b64 chars)`);
    res.writeHead(200).end("ok");
  });
});

server.listen(9099, () => console.log("[poster-sink] listening on http://localhost:9099"));
