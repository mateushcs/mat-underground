// Create the smallest .spz files we can from the local raw .ply captures.
//
// The generated files replace the public canonical paths:
// /subway.spz and /stations/*.spz. Every device uses these same tiny assets.

import { mkdir, readFile, readdir, rm, stat, writeFile } from "node:fs/promises";
import { basename, dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const PUBLIC = join(ROOT, "public");
const force = process.argv.includes("--force");

const OPTIONS = {
  maxSh: 0,
  fractionalBits: 4,
};

const LEGACY_MOBILE_DIRS = [join(PUBLIC, "mobile"), join(PUBLIC, "stations", "mobile")];

const mb = (n) => (n / 1024 / 1024).toFixed(2);

async function findPlys(dir) {
  const out = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...(await findPlys(full)));
    else if (entry.isFile() && entry.name.toLowerCase().endsWith(".ply")) out.push(full);
  }
  return out;
}

function outputPath(ply) {
  const rel = relative(PUBLIC, ply);
  const dir = dirname(rel);
  const file = basename(rel, ".ply") + ".spz";
  if (dir === ".") return join(PUBLIC, file);
  return join(PUBLIC, dir, file);
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

let totalIn = 0;
let totalOut = 0;
const plys = await findPlys(PUBLIC);
for (const ply of plys) {
  const spz = outputPath(ply);
  const rel = relative(PUBLIC, ply).replace(/\\/g, "/");
  const outRel = relative(PUBLIC, spz).replace(/\\/g, "/");

  if (!force && (await upToDate(ply, spz))) {
    const [inSize, outSize] = await Promise.all([stat(ply), stat(spz)]);
    totalIn += inSize.size;
    totalOut += outSize.size;
    console.log(`skip  ${outRel}  (${mb(outSize.size)}MB)`);
    continue;
  }

  const bytes = new Uint8Array(await readFile(ply));
  const { fileBytes } = await transcodeSpz({
    inputs: [{ fileBytes: bytes, pathOrUrl: ply }],
    maxSh: OPTIONS.maxSh,
    fractionalBits: OPTIONS.fractionalBits,
  });
  await mkdir(dirname(spz), { recursive: true });
  await writeFile(spz, Buffer.from(fileBytes.buffer, fileBytes.byteOffset, fileBytes.byteLength));

  totalIn += bytes.length;
  totalOut += fileBytes.length;
  console.log(`ok    ${rel} -> ${outRel}  ${mb(bytes.length)}MB -> ${mb(fileBytes.length)}MB`);
}

console.log(
  `\nSplats: ${plys.length} file(s): ${mb(totalIn)}MB -> ${mb(totalOut)}MB  (${(totalIn / totalOut).toFixed(2)}x smaller)`,
);

let removedLegacyDirs = 0;
for (const dir of LEGACY_MOBILE_DIRS) {
  try {
    await rm(dir, { recursive: true, force: true });
    removedLegacyDirs += 1;
  } catch {
    // Keep compression successful even if a legacy folder is already gone.
  }
}
if (removedLegacyDirs > 0) {
  console.log(`Removed ${removedLegacyDirs} legacy mobile splat folder(s).`);
}
