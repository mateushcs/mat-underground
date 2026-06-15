// Compress every Gaussian-splat .ply under /public into a Spark-native .spz
// (16-bit quantized + gzip). Spark loads .spz directly, so this is a drop-in
// swap that cuts each station from ~63MB to ~15MB (≈4.3x) — far less bandwidth
// and a much faster first frame, with no visible quality loss.
//
//   node scripts/compress-splats.mjs            # convert all, skip up-to-date
//   node scripts/compress-splats.mjs --force    # reconvert everything
//
// The original .ply files are left untouched; delete them once you've verified
// the .spz versions look right in the app.

import { readFile, writeFile, stat, readdir } from "node:fs/promises";
import { join, dirname, basename } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const PUBLIC = join(ROOT, "public");
const force = process.argv.includes("--force");

// Tuning. These splats are SH0 (no view-dependent harmonics), so maxSh is moot;
// the defaults below are a safe, lossless-ish quantization.
const OPTIONS = {
  maxSh: 0, // drop spherical harmonics if present (background look doesn't need them)
  fractionalBits: 12, // position precision (1/4096) — SPZ default
};

const mb = (n) => (n / 1024 / 1024).toFixed(1);

/** Recursively collect every *.ply under /public. */
async function findPlys(dir) {
  const out = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...(await findPlys(full)));
    else if (entry.isFile() && entry.name.toLowerCase().endsWith(".ply")) out.push(full);
  }
  return out;
}

async function upToDate(plyPath, spzPath) {
  try {
    const [p, s] = await Promise.all([stat(plyPath), stat(spzPath)]);
    return s.mtimeMs >= p.mtimeMs;
  } catch {
    return false;
  }
}

const { transcodeSpz } = await import("@sparkjsdev/spark");

const plys = await findPlys(PUBLIC);
if (plys.length === 0) {
  console.log("No .ply files found under /public.");
  process.exit(0);
}

let totalIn = 0;
let totalOut = 0;
for (const ply of plys) {
  const spz = join(dirname(ply), basename(ply, ".ply") + ".spz");
  const rel = ply.slice(PUBLIC.length + 1).replace(/\\/g, "/");
  if (!force && (await upToDate(ply, spz))) {
    const outSize = (await stat(spz)).size;
    totalIn += (await stat(ply)).size;
    totalOut += outSize;
    console.log(`skip  ${rel}  (${mb(outSize)}MB .spz already current)`);
    continue;
  }
  const bytes = new Uint8Array(await readFile(ply));
  const { fileBytes } = await transcodeSpz({
    inputs: [{ fileBytes: bytes, pathOrUrl: ply }],
    maxSh: OPTIONS.maxSh,
    fractionalBits: OPTIONS.fractionalBits,
  });
  await writeFile(spz, Buffer.from(fileBytes.buffer, fileBytes.byteOffset, fileBytes.byteLength));
  const inSize = bytes.length;
  const outSize = (await stat(spz)).size;
  totalIn += inSize;
  totalOut += outSize;
  console.log(
    `ok    ${rel}  ${mb(inSize)}MB -> ${mb(outSize)}MB  (${(inSize / outSize).toFixed(1)}x)`,
  );
}

console.log(
  `\nDone. ${plys.length} file(s): ${mb(totalIn)}MB -> ${mb(totalOut)}MB  (${(totalIn / totalOut).toFixed(1)}x smaller)`,
);
