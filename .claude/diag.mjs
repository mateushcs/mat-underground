import { createRequire } from "node:module";
import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";
const require = createRequire(import.meta.url);
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const esbuild = require("esbuild");
function resolveLocalImport(spec) {
  const base = path.join(root, "src", spec.slice(2));
  for (const c of [base, base + ".ts", base + ".tsx", path.join(base, "index.ts")])
    if (fs.existsSync(c)) return c;
  return base;
}
const r = await esbuild.build({
  entryPoints: [path.join(root, "src/data/transit.ts")],
  bundle: true,
  platform: "node",
  format: "cjs",
  write: false,
  plugins: [
    {
      name: "a",
      setup(b) {
        b.onResolve({ filter: /^@\// }, (a) => ({ path: resolveLocalImport(a.path) }));
      },
    },
  ],
});
const m = { exports: {} };
new Function("module", "exports", "require", r.outputFiles[0].text)(m, m.exports, require);
const { stations, lines } = m.exports;
const byId = new Map(lines.map((l) => [l.id, l]));
const inter = stations.filter((s) => s.kind === "interchange");
console.log("Total interchange nodes:", inter.length);
const single = inter.filter((s) => (s.lines ?? []).length < 2);
console.log("\nSINGLE-LINE interchanges (lines<2):", single.length);
for (const s of single)
  console.log(`  ${s.id} @${s.x.toFixed(0)},${s.y.toFixed(0)} lines=[${s.lines}]`);
console.log("\nALL interchanges:");
for (const s of inter) {
  const cols = (s.lines ?? []).map((id) => byId.get(id)?.color);
  console.log(`  ${s.id} @${s.x.toFixed(0)},${s.y.toFixed(0)} lines=[${s.lines}] colors=[${cols}]`);
}
