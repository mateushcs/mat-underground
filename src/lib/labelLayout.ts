// Greedy label placement with collision avoidance. Every label tries candidate
// positions around its anchor (perpendicular to the line first) and takes the
// first that is clear; otherwise the least-overlapping spot. Line strokes are a
// HARD penalty (weighted), so a name never sits on top of a line — it will move
// far, or overlap another label, before it crosses a line.

export interface Box {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface LabelItem {
  id: string;
  sx: number; // anchor x
  sy: number; // anchor y
  markerHalf: number; // half-size of the marker, for the launch gap
  bw: number; // label block width
  bh: number; // label block height
  perpX: number; // preferred launch direction (perpendicular to the line · side)
  perpY: number;
  priority: number; // lower placed first (route labels < interchange < terminal < major < regular)
  obstacle: Box; // the anchor's own marker AABB
  angles?: readonly number[]; // allowed text rotations, ordered by preference
}

export interface Placement {
  cx: number; // block centre
  cy: number;
  angle: number;
}

// 8 launch directions (axis + diagonal).
const DIRS: ReadonlyArray<readonly [number, number]> = [
  [0, 1],
  [0, -1],
  [1, 0],
  [-1, 0],
  [0.7071, 0.7071],
  [0.7071, -0.7071],
  [-0.7071, 0.7071],
  [-0.7071, -0.7071],
];

const DISTS = [0, 3, 7, 12, 20, 32, 48, 66, 88, 112]; // extra launch distance when nearer spots are taken
const LINE_WEIGHT = 28; // overlapping a line stroke costs this much more than overlapping a label

function overlapArea(a: Box, b: Box, pad: number): number {
  const ox = Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x) + pad;
  const oy = Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y) + pad;
  if (ox <= 0 || oy <= 0) return 0;
  return ox * oy;
}

export function rotatedBounds(width: number, height: number, angle: number) {
  const radians = (angle * Math.PI) / 180;
  const cos = Math.abs(Math.cos(radians));
  const sin = Math.abs(Math.sin(radians));
  return {
    w: width * cos + height * sin,
    h: width * sin + height * cos,
  };
}

export function secondaryLabelAngles(segmentAngle: number) {
  const normalized = (((Math.round(segmentAngle / 45) * 45) % 180) + 180) % 180;
  if (normalized === 45) return [45, -45, 90, -90] as const;
  if (normalized === 135) return [-45, 45, -90, 90] as const;
  if (normalized === 90) return [45, -45, 90, -90] as const;
  return [-45, 45, -90, 90] as const;
}

export function layoutLabels(
  items: LabelItem[],
  softObstacles: Box[], // station markers — avoided, but cheaper than lines
  lineObstacles: Box[], // line strokes — hard penalty, never crossed if avoidable
  pad = 0.8,
): Map<string, Placement> {
  const soft: Box[] = [...softObstacles];
  const out = new Map<string, Placement>();

  // Route labels + important + denser-first get the best spots.
  const order = [...items].sort((a, b) => a.priority - b.priority || a.sy - b.sy || a.sx - b.sx);

  for (const it of order) {
    const dirs = [...DIRS].sort(
      (A, B) => B[0] * it.perpX + B[1] * it.perpY - (A[0] * it.perpX + A[1] * it.perpY),
    );

    let bestBox: Box | null = null;
    let bestCenter: Placement | null = null;
    let bestCost = Infinity;
    let done = false;

    const angles = it.angles?.length ? it.angles : [0];

    for (const extra of DISTS) {
      for (const [ux, uy] of dirs) {
        for (const angle of angles) {
          const bounds = rotatedBounds(it.bw, it.bh, angle);
          const off =
            it.markerHalf + 1.8 + extra + (Math.abs(ux) * bounds.w + Math.abs(uy) * bounds.h) / 2;
          const cx = it.sx + ux * off;
          const cy = it.sy + uy * off;
          const box: Box = {
            x: cx - bounds.w / 2,
            y: cy - bounds.h / 2,
            w: bounds.w,
            h: bounds.h,
          };

          let cost = 0;
          for (const p of soft) {
            cost += overlapArea(box, p, pad);
            if (cost >= bestCost) break;
          }
          if (cost < bestCost) {
            for (const p of lineObstacles) {
              const o = overlapArea(box, p, pad);
              if (o > 0) cost += o * LINE_WEIGHT;
              if (cost >= bestCost) break;
            }
          }

          if (cost === 0) {
            out.set(it.id, { cx, cy, angle });
            soft.push(box);
            done = true;
            break;
          }
          if (cost < bestCost) {
            bestCost = cost;
            bestBox = box;
            bestCenter = { cx, cy, angle };
          }
        }
        if (done) break;
      }
      if (done) break;
    }

    if (!done && bestBox && bestCenter) {
      out.set(it.id, bestCenter);
      soft.push(bestBox);
    }
  }

  return out;
}
