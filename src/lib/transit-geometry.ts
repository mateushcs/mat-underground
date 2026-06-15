export interface Point {
  x: number;
  y: number;
}

const f2 = (n: number) => n.toFixed(2);

interface Arc {
  p1x: number;
  p1y: number;
  p2x: number;
  p2y: number;
  R: number;
  sweep: 0 | 1;
}

// Circular fillet at an interior vertex. Returns null when the three points are
// (near) collinear, i.e. no corner to round.
function cornerArc(prev: Point, curr: Point, next: Point, radius: number): Arc | null {
  const d1x = curr.x - prev.x,
    d1y = curr.y - prev.y; // incoming direction
  const d2x = next.x - curr.x,
    d2y = next.y - curr.y; // outgoing direction
  const len1 = Math.hypot(d1x, d1y);
  const len2 = Math.hypot(d2x, d2y);
  if (len1 < 0.01 || len2 < 0.01) return null;

  const u1x = -d1x / len1,
    u1y = -d1y / len1; // ray toward prev
  const u2x = d2x / len2,
    u2y = d2y / len2; // ray toward next
  let dot = u1x * u2x + u1y * u2y;
  dot = Math.max(-1, Math.min(1, dot));
  const ang = Math.acos(dot);
  if (ang > Math.PI - 0.02) return null; // collinear

  const half = ang / 2;
  let t = radius / Math.tan(half);
  const maxT = Math.min(len1, len2) / 2;
  let R = radius;
  if (t > maxT) {
    t = maxT;
    R = t * Math.tan(half);
  }
  const cross = d1x * d2y - d1y * d2x; // SVG y-down → sweep flag
  return {
    p1x: curr.x + u1x * t,
    p1y: curr.y + u1y * t, // arc start (toward prev)
    p2x: curr.x + u2x * t,
    p2y: curr.y + u2y * t, // arc end (toward next)
    R,
    sweep: cross > 0 ? 1 : 0,
  };
}

// Build an SVG path of straight `L` segments joined by true circular `A` arcs of
// constant radius at every vertex. When `closed`, the wrap-around corner is
// rounded too and the path is closed with `Z` (used by the ring line).
export function roundedPath(points: Point[], radius = 12, closed = false): string {
  const n = points.length;
  if (n === 0) return "";
  if (n === 1) return `M ${f2(points[0].x)} ${f2(points[0].y)}`;
  if (n === 2 && !closed)
    return `M ${f2(points[0].x)} ${f2(points[0].y)} L ${f2(points[1].x)} ${f2(points[1].y)}`;

  if (closed) {
    let d = "";
    let started = false;
    for (let i = 0; i < n; i++) {
      const arc = cornerArc(points[(i - 1 + n) % n], points[i], points[(i + 1) % n], radius);
      if (!arc) {
        d += started
          ? ` L ${f2(points[i].x)} ${f2(points[i].y)}`
          : `M ${f2(points[i].x)} ${f2(points[i].y)}`;
        started = true;
        continue;
      }
      d += started ? ` L ${f2(arc.p1x)} ${f2(arc.p1y)}` : `M ${f2(arc.p1x)} ${f2(arc.p1y)}`;
      d += ` A ${f2(arc.R)} ${f2(arc.R)} 0 0 ${arc.sweep} ${f2(arc.p2x)} ${f2(arc.p2y)}`;
      started = true;
    }
    return d + " Z";
  }

  let d = `M ${f2(points[0].x)} ${f2(points[0].y)}`;
  for (let i = 1; i < n - 1; i++) {
    const arc = cornerArc(points[i - 1], points[i], points[i + 1], radius);
    if (!arc) {
      d += ` L ${f2(points[i].x)} ${f2(points[i].y)}`;
      continue;
    }
    d += ` L ${f2(arc.p1x)} ${f2(arc.p1y)} A ${f2(arc.R)} ${f2(arc.R)} 0 0 ${arc.sweep} ${f2(arc.p2x)} ${f2(arc.p2y)}`;
  }
  const last = points[n - 1];
  d += ` L ${f2(last.x)} ${f2(last.y)}`;
  return d;
}
