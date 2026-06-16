import { readdir, rm } from "node:fs/promises";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const OUTPUT_DIRS = [".vercel/output/static", "dist/client"];

const PRUNED_EXTENSIONS = new Set([".ply", ".spz"]);

async function removeUnservedSplats(dir) {
  let removed = 0;
  let entries;
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch {
    return 0;
  }

  for (const entry of entries) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      removed += await removeUnservedSplats(full);
    } else if (
      entry.isFile() &&
      [...PRUNED_EXTENSIONS].some((extension) => entry.name.toLowerCase().endsWith(extension))
    ) {
      await rm(full);
      removed += 1;
    }
  }
  return removed;
}

let removed = 0;
for (const dir of OUTPUT_DIRS) {
  const absolute = resolve(ROOT, dir);
  if (!absolute.startsWith(resolve(ROOT))) {
    throw new Error(`Refusing to prune outside project root: ${absolute}`);
  }
  removed += await removeUnservedSplats(absolute);
}

if (removed > 0) {
  console.log(`Pruned ${removed} unserved splat asset(s) from build output.`);
}
