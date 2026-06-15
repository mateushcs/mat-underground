// Ordered list of the stops on a line, for the in-station "plan de ligne".
// The schematic geometry lives in transit.ts as `lineSegments` (emitted in
// vertex order per line) and `stations` (with `lines[]` membership). Here we
// chain a line's segments into one polyline, then project every station that
// serves the line onto it and sort by arc-length — giving the real stop order.

import { lineSegments, stations, type Station } from "@/data/transit";

export interface LineStop {
  id: string;
  name: string;
  /** 0..1 position along the line */
  t: number;
  kind: Station["kind"];
  /** does this stop serve more than one line */
  interchange: boolean;
}

interface Vec {
  x: number;
  y: number;
}

/** Build the ordered vertex polyline for a line from its segments. */
function linePolyline(lineId: string): Vec[] {
  const segs = lineSegments.filter((s) => s.lineId === lineId);
  if (!segs.length) return [];
  const pts: Vec[] = [{ x: segs[0].x1, y: segs[0].y1 }];
  for (const s of segs) pts.push({ x: s.x2, y: s.y2 });
  return pts;
}

function cumulativeLengths(pts: Vec[]) {
  const cum = [0];
  for (let i = 1; i < pts.length; i++) {
    cum.push(cum[i - 1] + Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y));
  }
  return cum;
}

/** Nearest arc-length position of a point projected onto the polyline. */
function projectPos(pts: Vec[], cum: number[], p: Vec): { pos: number; off: number } | null {
  let best: { pos: number; off: number } | null = null;
  for (let i = 0; i < pts.length - 1; i++) {
    const a = pts[i];
    const b = pts[i + 1];
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const len2 = dx * dx + dy * dy;
    if (len2 < 1e-4) continue;
    const t = Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / len2));
    const x = a.x + dx * t;
    const y = a.y + dy * t;
    const off = Math.hypot(p.x - x, p.y - y);
    const pos = cum[i] + Math.sqrt(len2) * t;
    if (!best || off < best.off) best = { pos, off };
  }
  return best;
}

/** Ordered stops along `lineId`, normalised to t∈[0,1]. */
export function orderedStopsForLine(lineId: string): LineStop[] {
  const pts = linePolyline(lineId);
  if (pts.length < 2) return [];
  const cum = cumulativeLengths(pts);
  const total = cum[cum.length - 1] || 1;

  const stops = stations
    .filter((s) => (s.lines ?? []).includes(lineId))
    .map((s) => {
      const pr = projectPos(pts, cum, { x: s.x, y: s.y });
      return pr ? { s, pos: pr.pos } : null;
    })
    .filter((v): v is { s: Station; pos: number } => !!v)
    .sort((a, b) => a.pos - b.pos)
    .map(({ s, pos }) => ({
      id: s.id,
      name: s.name,
      t: pos / total,
      kind: s.kind,
      interchange: (s.lines ?? []).length > 1,
    }));

  // de-dupe stops that collapse onto the same point (rounded corners etc.)
  const out: LineStop[] = [];
  for (const stop of stops) {
    if (!out.length || stop.t - out[out.length - 1].t > 0.012) out.push(stop);
    else if (stop.interchange) out[out.length - 1] = stop; // prefer interchange label
  }
  return out;
}
