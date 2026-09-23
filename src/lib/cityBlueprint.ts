import { stations } from "@/data/transit";

/**
 * Organic City Blueprint Generator
 * 
 * Inspired directly by:
 * - Trama Urbana Sucre (radial curves, topography lines, angled street sectors)
 * - Santiago de Cali (flowing river, highway corridors, fine capillary road network)
 * - Kajetan Rzepecki CAD blueprints (clean double-line boulevards, bridges, zero rigid grid boxes)
 * 
 * Performance:
 * Consolidates all geometry into 5 ultra-lightweight SVG paths.
 * Zero square boxes, zero heavy masks, silky 60-120fps.
 */

type Pt = [number, number];

const f = (n: number) => n.toFixed(1);
const xy = (p: Pt) => `${f(p[0])},${f(p[1])}`;

const polyline = (pts: Pt[]) => `M${pts.map(xy).join("L")}`;
const polygon = (pts: Pt[]) => `M${pts.map(xy).join("L")}Z`;
const circlePath = (cx: number, cy: number, r: number) =>
  `M${f(cx - r)},${f(cy)}a${r},${r} 0 1,0 ${f(r * 2)},0a${r},${r} 0 1,0 ${f(-r * 2)},0Z`;

// ---------------------------------------------------------------------------
// 1. WATERWAY (The Meandering River & Embankments)
// ---------------------------------------------------------------------------
const RIVER_CENTER: Pt[] = [
  [-880, -290],
  [-760, -230],
  [-630, -170],
  [-510, -100],
  [-430, -20],
  [-370, 70],
  [-310, 160],
  [-230, 240],
  [-130, 290],
  [-20, 315],
  [110, 325],
  [250, 345],
  [380, 385],
  [510, 440],
  [650, 495],
  [790, 540],
  [900, 570],
];

const leftBank: Pt[] = [];
const rightBank: Pt[] = [];
const n = RIVER_CENTER.length;

for (let i = 0; i < n; i++) {
  const p = RIVER_CENTER[i];
  let dx = 0;
  let dy = 0;
  if (i === 0) {
    dx = RIVER_CENTER[1][0] - p[0];
    dy = RIVER_CENTER[1][1] - p[1];
  } else if (i === n - 1) {
    dx = p[0] - RIVER_CENTER[i - 1][0];
    dy = p[1] - RIVER_CENTER[i - 1][1];
  } else {
    dx = RIVER_CENTER[i + 1][0] - RIVER_CENTER[i - 1][0];
    dy = RIVER_CENTER[i + 1][1] - RIVER_CENTER[i - 1][1];
  }

  const len = Math.hypot(dx, dy) || 1;
  const nx = -dy / len;
  const ny = dx / len;
  const hw = 16 + (i / n) * 16; // width expands 32 to 64

  leftBank.push([p[0] + nx * hw, p[1] + ny * hw]);
  rightBank.push([p[0] - nx * hw, p[1] - ny * hw]);
}

const waterFill = polygon([...leftBank, ...rightBank.slice().reverse()]);

// River outer embankments / promenades
const embankmentL1: Pt[] = leftBank.map((p, i) => {
  const c = RIVER_CENTER[i];
  return [c[0] + (p[0] - c[0]) * 1.25, c[1] + (p[1] - c[1]) * 1.25];
});
const embankmentR1: Pt[] = rightBank.map((p, i) => {
  const c = RIVER_CENTER[i];
  return [c[0] + (p[0] - c[0]) * 1.25, c[1] + (p[1] - c[1]) * 1.25];
});

// Northern canal feeding into the river
const canalPts: Pt[] = [
  [-430, -20],
  [-370, -90],
  [-280, -170],
  [-170, -230],
  [-50, -260],
];

const waterContours = [
  polyline(leftBank),
  polyline(rightBank),
  polyline(embankmentL1),
  polyline(embankmentR1),
  polyline(canalPts),
  polyline(RIVER_CENTER),
].join(" ");

// ---------------------------------------------------------------------------
// 2. ARTERIAL BOULEVARDS & HIGHWAY CORRIDORS (Double-line avenues)
// ---------------------------------------------------------------------------
const arterialsList: string[] = [];

// Smooth Ring Parkway (radius ~360) wrapping around central district
const ringPts1: Pt[] = [];
const ringPts2: Pt[] = [];
const RING_SEGS = 36;
for (let i = 0; i <= RING_SEGS; i++) {
  const theta = (i / RING_SEGS) * Math.PI * 2;
  const r = 350 + Math.sin(theta * 4) * 20; // organic rounded contours
  ringPts1.push([r * Math.cos(theta), r * Math.sin(theta)]);
  ringPts2.push([(r + 7) * Math.cos(theta), (r + 7) * Math.sin(theta)]);
}
arterialsList.push(polyline(ringPts1), polyline(ringPts2));

// Outer Peripheral Beltway (radius ~680)
const outerRingPts1: Pt[] = [];
const outerRingPts2: Pt[] = [];
for (let i = 0; i <= 40; i++) {
  const theta = (i / 40) * Math.PI * 2;
  const r = 670 + Math.sin(theta * 3) * 40;
  outerRingPts1.push([r * Math.cos(theta), r * Math.sin(theta)]);
  outerRingPts2.push([(r + 8) * Math.cos(theta), (r + 8) * Math.sin(theta)]);
}
arterialsList.push(polyline(outerRingPts1), polyline(outerRingPts2));

// Major Arterial Corridors connecting stations and districts
const mainCorridors: Pt[][] = [
  // North-East Highway: Center -> Uptime Center (L2 axis)
  [[200, -200], [350, -280], [520, -360], [750, -450]],
  // North Boulevard: Center -> Solv (L3 axis)
  [[0, -240], [-60, -340], [-100, -440], [-120, -560]],
  // North-West Parkway: Center -> West Gateway (L8 axis)
  [[-220, -180], [-360, -260], [-520, -340], [-720, -420]],
  // South-West Boulevard: Center -> Terapio (L4 axis)
  [[-200, 180], [-340, 260], [-500, 320], [-680, 380]],
  // South Parkway: Center -> L7/Músicas (L5 axis)
  [[0, 240], [40, 360], [80, 480], [120, 580]],
  // South-East Expressway
  [[220, 180], [380, 260], [540, 340], [720, 420]],
  // East Boulevard: Center -> Tour House (L9 axis)
  [[240, 0], [380, -20], [540, -40], [720, -50]],
  // West Avenue: Along riverfront
  [[-240, 0], [-380, -10], [-540, -30], [-720, -40]],
];

for (const pts of mainCorridors) {
  // Generate double lines for each corridor
  const l1: Pt[] = [];
  const l2: Pt[] = [];
  for (let i = 0; i < pts.length; i++) {
    const p = pts[i];
    let dx = 1, dy = 0;
    if (i < pts.length - 1) {
      dx = pts[i + 1][0] - p[0];
      dy = pts[i + 1][1] - p[1];
    } else {
      dx = p[0] - pts[i - 1][0];
      dy = p[1] - pts[i - 1][1];
    }
    const len = Math.hypot(dx, dy) || 1;
    const nx = (-dy / len) * 3.5;
    const ny = (dx / len) * 3.5;
    l1.push([p[0] + nx, p[1] + ny]);
    l2.push([p[0] - nx, p[1] - ny]);
  }
  arterialsList.push(polyline(l1), polyline(l2));
}

const arterials = arterialsList.join(" ");

// ---------------------------------------------------------------------------
// 3. ORGANIC STREET NETWORK (Radial curves, topography threads, capillary web)
// NO SQUARES: Continuous realistic streets with curves, forks, and cul-de-sacs
// ---------------------------------------------------------------------------
const streetsList: string[] = [];

// A. Radial streets expanding from city center (like in Sucre & Cali)
const RADIAL_RAYS = 28;
for (let r = 0; r < RADIAL_RAYS; r++) {
  const baseAngle = (r / RADIAL_RAYS) * Math.PI * 2;
  const rayPts: Pt[] = [];
  const startDist = 60;
  const endDist = 620;
  const steps = 14;

  for (let s = 0; s <= steps; s++) {
    const t = s / steps;
    const dist = startDist + t * (endDist - startDist);
    // Add organic wave / topographical curve to each street
    const angleWiggle = Math.sin(t * 5 + r * 2.1) * 0.08 + Math.cos(t * 3 + r) * 0.04;
    const angle = baseAngle + angleWiggle;
    const x = dist * Math.cos(angle);
    const y = dist * Math.sin(angle);
    rayPts.push([x, y]);
  }
  streetsList.push(polyline(rayPts));
}

// B. Concentric organic orbital streets (connecting the radial streets like webs)
const ORBIT_RADII = [110, 160, 210, 270, 420, 490, 560, 630];
for (let o = 0; o < ORBIT_RADII.length; o++) {
  const baseR = ORBIT_RADII[o];
  const arcPts: Pt[] = [];
  const segments = 48;

  for (let s = 0; s <= segments; s++) {
    const theta = (s / segments) * Math.PI * 2;
    // Organic topographic variations along the contour
    const r = baseR + Math.sin(theta * 6 + o * 1.5) * 14 + Math.cos(theta * 4) * 8;
    arcPts.push([r * Math.cos(theta), r * Math.sin(theta)]);
  }
  streetsList.push(polyline(arcPts));
}

// C. Organic riverfront contour drives along both river banks
const riverDriveLeft1: Pt[] = leftBank.map((p, i) => {
  const c = RIVER_CENTER[i];
  const factor = 1.45 + Math.sin(i * 0.7) * 0.15;
  return [c[0] + (p[0] - c[0]) * factor, c[1] + (p[1] - c[1]) * factor];
});
const riverDriveLeft2: Pt[] = leftBank.map((p, i) => {
  const c = RIVER_CENTER[i];
  const factor = 1.75 + Math.cos(i * 0.6) * 0.18;
  return [c[0] + (p[0] - c[0]) * factor, c[1] + (p[1] - c[1]) * factor];
});
const riverDriveRight1: Pt[] = rightBank.map((p, i) => {
  const c = RIVER_CENTER[i];
  const factor = 1.45 + Math.sin(i * 0.8) * 0.15;
  return [c[0] + (p[0] - c[0]) * factor, c[1] + (p[1] - c[1]) * factor];
});
const riverDriveRight2: Pt[] = rightBank.map((p, i) => {
  const c = RIVER_CENTER[i];
  const factor = 1.75 + Math.cos(i * 0.5) * 0.18;
  return [c[0] + (p[0] - c[0]) * factor, c[1] + (p[1] - c[1]) * factor];
});

streetsList.push(
  polyline(riverDriveLeft1),
  polyline(riverDriveLeft2),
  polyline(riverDriveRight1),
  polyline(riverDriveRight2)
);

// D. Organic secondary road spurs, winding alleys and neighborhood loops
// Seeded deterministic generation for authentic urban texture without rigid squares
const NEIGHBORHOOD_CENTERS: Pt[] = [
  [-280, -220],
  [260, -240],
  [-280, 220],
  [280, 240],
  [450, -120],
  [-460, 120],
  [380, -320],
  [-120, -380],
  [140, 420],
];

for (let nc = 0; nc < NEIGHBORHOOD_CENTERS.length; nc++) {
  const [cx, cy] = NEIGHBORHOOD_CENTERS[nc];
  // 5 curved winding streets radiating through each district
  for (let branch = 0; branch < 5; branch++) {
    const angle = (branch / 5) * Math.PI * 2 + nc * 0.4;
    const branchPts: Pt[] = [[cx, cy]];
    let curX = cx;
    let curY = cy;
    let curAngle = angle;

    for (let step = 0; step < 6; step++) {
      const len = 16 + (step % 3) * 6;
      curAngle += Math.sin(step * 1.8 + branch + nc) * 0.35;
      curX += Math.cos(curAngle) * len;
      curY += Math.sin(curAngle) * len;
      branchPts.push([curX, curY]);
    }
    streetsList.push(polyline(branchPts));
  }
}

const streets = streetsList.join(" ");

// ---------------------------------------------------------------------------
// 4. STATION PLAZAS, ROUNDABOUTS & CIVIC ESPLANADES
// Circular nodes anchoring transit hubs into the street fabric
// ---------------------------------------------------------------------------
const plazasList: string[] = [];

// Central Marco Zero / Civic Hub (0, 0)
plazasList.push(
  circlePath(0, 0, 32),
  circlePath(0, 0, 20),
  circlePath(0, 0, 8),
  polyline([[-32, 0], [32, 0]]),
  polyline([[0, -32], [0, 32]])
);

// Interchange and terminal station plazas
const keyStations = stations.filter(
  (s) => s.kind === "interchange" || s.kind === "terminal" || s.kind === "major"
);

for (const st of keyStations) {
  const r = st.kind === "terminal" ? 18 : st.kind === "interchange" ? 15 : 12;
  plazasList.push(circlePath(st.x, st.y, r));
  plazasList.push(circlePath(st.x, st.y, r + 3.5));

  // Radiating pedestrian walkway spokes
  for (let a = 0; a < 6; a++) {
    const angle = (a / 6) * Math.PI * 2;
    const x1 = st.x + Math.cos(angle) * (r + 3.5);
    const y1 = st.y + Math.sin(angle) * (r + 3.5);
    const x2 = st.x + Math.cos(angle) * (r + 20);
    const y2 = st.y + Math.sin(angle) * (r + 20);
    plazasList.push(polyline([[x1, y1], [x2, y2]]));
  }
}

const plazas = plazasList.join(" ");

// ---------------------------------------------------------------------------
// 5. BRIDGES (Over River Crossings)
// ---------------------------------------------------------------------------
const bridgeLocations: Pt[] = [
  [-430, -20],
  [-310, 160],
  [-130, 290],
  [110, 325],
  [380, 385],
  [650, 495],
];

const bridgesList: string[] = [];
for (const [bx, by] of bridgeLocations) {
  const bw = 14;
  const bl = 40;
  bridgesList.push(
    `M${f(bx - bw / 2)},${f(by - bl / 2)}h${bw}v${bl}h${-bw}Z`,
    polyline([[bx - bw / 2 - 3, by - bl / 2], [bx + bw / 2 + 3, by - bl / 2]]),
    polyline([[bx - bw / 2 - 3, by + bl / 2], [bx + bw / 2 + 3, by + bl / 2]])
  );
}
const bridges = bridgesList.join(" ");

export const cityBlueprint = {
  waterFill,
  waterContours,
  arterials,
  streets,
  plazas,
  bridges,
};
