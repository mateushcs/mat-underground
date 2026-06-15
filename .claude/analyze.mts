import { stations, lines } from "../src/data/transit.ts";

const byId = new Map(stations.map((s) => [s.id, s]));
const kindOf = (id: string) => byId.get(id)?.kind ?? "regular";

// --- referenced / orphan / unknown ---
const referenced = new Set<string>();
const unknownRefs: string[] = [];
for (const l of lines)
  for (const sid of l.stations) {
    referenced.add(sid);
    if (!byId.has(sid)) unknownRefs.push(`${l.id} → ${sid}`);
  }
const orphans = stations.filter((s) => !referenced.has(s.id)).map((s) => s.id);

// --- degree (distinct lines per station) ---
const linesOf = new Map<string, string[]>();
for (const l of lines) {
  const seen = new Set<string>();
  for (const sid of l.stations) {
    if (seen.has(sid)) continue;
    seen.add(sid);
    (linesOf.get(sid) ?? linesOf.set(sid, []).get(sid)!).push(l.id);
  }
}
const deg = (id: string) => (linesOf.get(id) ?? []).length;

// --- endpoints ---
const endpointLines = new Map<string, string[]>();
const throughLines = new Map<string, string[]>(); // lines where station is NOT an endpoint
for (const l of lines) {
  const a = l.stations[0];
  const b = l.stations[l.stations.length - 1];
  for (let i = 0; i < l.stations.length; i++) {
    const sid = l.stations[i];
    const isEnd = i === 0 || i === l.stations.length - 1;
    if (isEnd) (endpointLines.get(sid) ?? endpointLines.set(sid, []).get(sid)!).push(l.id);
    else (throughLines.get(sid) ?? throughLines.set(sid, []).get(sid)!).push(l.id);
  }
  void a; void b;
}

console.log("=== 1. REFERÊNCIAS / ÓRFÃS ===");
console.log("Refs desconhecidas:", unknownRefs.length ? unknownRefs : "nenhuma");
console.log("Estações órfãs (em nenhuma linha):", orphans.length ? orphans : "nenhuma");

// Effective kind derived exactly like the app (degree + endpoint + explicit major).
const isEndpoint = (id: string) => (endpointLines.get(id)?.length ?? 0) > 0;
function derived(id: string): string {
  if (kindOf(id) === "major") return "major";
  if (deg(id) >= 2) return "interchange";
  if (isEndpoint(id)) return "terminal";
  return "regular";
}

console.log("\n=== 2. TIPO DERIVADO vs GRAU (deve ficar sem alertas) ===");
let kindIssues = 0;
const counts: Record<string, number> = { major: 0, interchange: 0, terminal: 0, regular: 0 };
for (const s of stations) {
  const d = deg(s.id);
  const k = derived(s.id);
  counts[k]++;
  const flags: string[] = [];
  if (k === "major" && d < 2) flags.push(`major mas grau=${d}`);
  if (k === "interchange" && d < 2) flags.push(`interchange mas grau=${d}`);
  if (k === "terminal" && (throughLines.get(s.id)?.length ?? 0) > 0 && !isEndpoint(s.id))
    flags.push(`terminal mas só passagem`);
  if (flags.length) { kindIssues++; console.log(`  ${s.id} (${s.name}) [${k}, grau ${d}]: ${flags.join(" | ")}`); }
}
if (!kindIssues) console.log("  ✔ nenhum (tipos consistentes com o grau)");
console.log("  contagem:", counts, "| majors:", stations.filter((s) => derived(s.id) === "major").map((s) => s.id));

console.log("\n=== 3. COORDENADAS DUPLICADAS ===");
const byCoord = new Map<string, string[]>();
for (const s of stations) {
  const key = `${s.x},${s.y}`;
  (byCoord.get(key) ?? byCoord.set(key, []).get(key)!).push(s.id);
}
let dupFound = false;
for (const [key, ids] of byCoord)
  if (ids.length > 1) { dupFound = true; console.log(`  ${key}: ${ids.join(", ")}`); }
if (!dupFound) console.log("  nenhuma");

console.log("\n=== 4. CORES REPETIDAS ===");
const byColor = new Map<string, string[]>();
for (const l of lines) (byColor.get(l.color) ?? byColor.set(l.color, []).get(l.color)!).push(l.id);
for (const [c, ls] of byColor) if (ls.length > 1) console.log(`  ${c}: ${ls.join(", ")}`);

console.log("\n=== 5. PARES DE LINHAS REDUNDANTES ===");
const setOf = new Map(lines.map((l) => [l.id, new Set(l.stations)]));
function longestSharedRun(a: string[], b: string[]): number {
  const bset = new Set(b);
  let best = 0, run = 0;
  for (const s of a) { if (bset.has(s)) { run++; best = Math.max(best, run); } else run = 0; }
  return best;
}
for (let i = 0; i < lines.length; i++)
  for (let j = i + 1; j < lines.length; j++) {
    const A = lines[i], B = lines[j];
    const sa = setOf.get(A.id)!, sb = setOf.get(B.id)!;
    let shared = 0;
    for (const s of sa) if (sb.has(s)) shared++;
    if (shared === 0) continue;
    const minLen = Math.min(sa.size, sb.size);
    const jac = shared / (sa.size + sb.size - shared);
    const run = longestSharedRun(A.stations, B.stations);
    const subset = shared === minLen;
    if (subset || jac >= 0.4 || run >= 4) {
      console.log(
        `  ${A.id}∩${B.id}: ${shared} comuns, run consec=${run}, Jaccard=${jac.toFixed(2)}${subset ? " ⚠ SUBSET" : ""}`,
      );
    }
  }

console.log("\n=== 6. GEOMETRIA DAS LINHAS (backtrack / segmentos nulos / revisita) ===");
for (const l of lines) {
  const pts = l.stations.map((id) => byId.get(id)!).filter(Boolean);
  const issues: string[] = [];
  // revisita (excluindo loop fechado intencional onde primeiro==último)
  const seen = new Map<string, number>();
  l.stations.forEach((id, i) => seen.set(id, (seen.get(id) ?? 0) + 1));
  for (const [id, c] of seen)
    if (c > 1 && !(l.stations[0] === id && l.stations[l.stations.length - 1] === id && c === 2))
      issues.push(`revisita ${id}×${c}`);
  for (let i = 1; i < pts.length; i++) {
    if (pts[i].x === pts[i - 1].x && pts[i].y === pts[i - 1].y)
      issues.push(`segmento nulo ${pts[i - 1].id}→${pts[i].id}`);
  }
  for (let i = 1; i < pts.length - 1; i++) {
    const ax = pts[i].x - pts[i - 1].x, ay = pts[i].y - pts[i - 1].y;
    const bx = pts[i + 1].x - pts[i].x, by = pts[i + 1].y - pts[i].y;
    const la = Math.hypot(ax, ay), lb = Math.hypot(bx, by);
    if (la === 0 || lb === 0) continue;
    const cos = (ax * bx + ay * by) / (la * lb);
    if (cos < -0.7) issues.push(`backtrack em ${pts[i].id} (ângulo ~${Math.round((Math.acos(Math.max(-1, Math.min(1, cos))) * 180) / Math.PI)}°)`);
  }
  if (issues.length) console.log(`  ${l.id} (${l.name}): ${issues.join(" | ")}`);
}

console.log("\n=== RESUMO ===");
console.log(`${stations.length} estações, ${lines.length} linhas.`);
